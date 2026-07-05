import { Env, getAuthorizedUser } from './auth_helper';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const secret = env.JWT_SECRET || 'fallback-secret-key-12345';
  
  // Verify user session
  const user = await getAuthorizedUser(request, secret);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Please log in.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { method } = request;
  const url = new URL(request.url);
  const designId = url.searchParams.get('id');

  try {
    // ----------------------------------------------------
    // GET: List all designs or fetch a single design
    // ----------------------------------------------------
    if (method === 'GET') {
      if (designId) {
        // Fetch specific design
        const key = `design:${user.email}:${designId}`;
        const designJson = await env.AUTO_LABELS_KV.get(key);
        if (!designJson) {
          return new Response(
            JSON.stringify({ error: 'Design not found.' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(designJson, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // List all designs for user
        const prefix = `design:${user.email}:`;
        const listResult = await env.AUTO_LABELS_KV.list({ prefix });
        
        // We can fetch the contents of all matching keys. 
        // Since it's personal use, the count will be low.
        const fetchPromises = listResult.keys.map(async (k: { name: string }) => {
          const val = await env.AUTO_LABELS_KV.get(k.name);
          return val ? JSON.parse(val) : null;
        });
        
        const designs = (await Promise.all(fetchPromises)).filter(d => d !== null);
        return new Response(JSON.stringify(designs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ----------------------------------------------------
    // POST: Create a new design
    // ----------------------------------------------------
    if (method === 'POST') {
      const body = await request.json() as {
        name: string;
        isTemplateBase: boolean;
        templateId: string;
        state: any;
      };

      if (!body.name || !body.templateId || !body.state) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields (name, templateId, state).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const id = Date.now().toString();
      const key = `design:${user.email}:${id}`;
      const now = new Date().toISOString();

      const newDesign = {
        id,
        name: body.name,
        isTemplateBase: !!body.isTemplateBase,
        templateId: body.templateId,
        state: body.state,
        createdAt: now,
        updatedAt: now
      };

      await env.AUTO_LABELS_KV.put(key, JSON.stringify(newDesign));

      return new Response(JSON.stringify(newDesign), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ----------------------------------------------------
    // PUT: Update an existing design
    // ----------------------------------------------------
    if (method === 'PUT') {
      const body = await request.json() as {
        id: string;
        name: string;
        isTemplateBase: boolean;
        templateId: string;
        state: any;
      };

      if (!body.id || !body.name || !body.templateId || !body.state) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields (id, name, templateId, state).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const key = `design:${user.email}:${body.id}`;
      const existingJson = await env.AUTO_LABELS_KV.get(key);
      if (!existingJson) {
        return new Response(
          JSON.stringify({ error: 'Design to update does not exist.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const existing = JSON.parse(existingJson);
      const now = new Date().toISOString();

      const updatedDesign = {
        ...existing,
        name: body.name,
        isTemplateBase: !!body.isTemplateBase,
        templateId: body.templateId,
        state: body.state,
        updatedAt: now
      };

      await env.AUTO_LABELS_KV.put(key, JSON.stringify(updatedDesign));

      return new Response(JSON.stringify(updatedDesign), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ----------------------------------------------------
    // DELETE: Delete a design
    // ----------------------------------------------------
    if (method === 'DELETE') {
      if (!designId) {
        return new Response(
          JSON.stringify({ error: 'Query parameter "id" is required for deletion.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const key = `design:${user.email}:${designId}`;
      const existing = await env.AUTO_LABELS_KV.get(key);
      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Design not found.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await env.AUTO_LABELS_KV.delete(key);

      return new Response(
        JSON.stringify({ success: true, message: 'Design deleted successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fallback for unsupported methods
    return new Response(
      JSON.stringify({ error: `Method ${method} not allowed.` }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
