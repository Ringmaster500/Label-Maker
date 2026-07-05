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

  try {
    // ----------------------------------------------------
    // GET: List gallery images OR proxy a single R2 image
    // ----------------------------------------------------
    if (method === 'GET') {
      const userPrefix = `assets/${user.email}/`;

      // --- List all images in gallery ---
      if (url.searchParams.get('list') === 'true') {
        const listed = await env.AUTO_LABELS_R2.list({ prefix: userPrefix });
        const items = (listed.objects || []).map((obj: any) => ({
          key: obj.key,
          url: `/api/assets?key=${encodeURIComponent(obj.key)}`,
          name: obj.key.replace(userPrefix, ''),
          uploadedAt: obj.uploaded ? new Date(obj.uploaded).toISOString() : null,
          size: obj.size,
        }));
        // Newest first
        items.sort((a: any, b: any) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
        return new Response(JSON.stringify(items), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // --- Proxy / fetch a single image by key ---
      const key = url.searchParams.get('key');
      if (!key) {
        return new Response(
          JSON.stringify({ error: 'Query parameter "key" is required.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Security Check: Verify the key belongs to the current user
      if (!key.startsWith(userPrefix)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to this asset.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch from R2
      const object = await env.AUTO_LABELS_R2.get(key);
      if (!object) {
        return new Response(
          JSON.stringify({ error: 'Asset not found in storage.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days

      return new Response(object.body, {
        headers
      });
    }


    // ----------------------------------------------------
    // POST: Upload Image to R2
    // ----------------------------------------------------
    if (method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file uploaded. Please specify a "file" field.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (typeof file === 'string') {
        return new Response(
          JSON.stringify({ error: 'Uploaded item is not a file.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const fileType = file.type || '';
      const fileName = file.name || '';
      const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

      if (!isImage) {
        return new Response(
          JSON.stringify({ error: 'Invalid file type. Only image files are allowed.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const buffer = await file.arrayBuffer();
      const ext = fileName.split('.').pop() || 'png';
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const key = `assets/${user.email}/${fileId}.${ext}`;

      // Upload to R2
      await env.AUTO_LABELS_R2.put(key, buffer, {
        httpMetadata: {
          contentType: file.type || 'image/png',
          cacheControl: 'public, max-age=604800'
        }
      });

      // Return the proxy URL
      const proxyUrl = `/api/assets?key=${encodeURIComponent(key)}`;

      return new Response(
        JSON.stringify({ key, url: proxyUrl }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fallback
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
