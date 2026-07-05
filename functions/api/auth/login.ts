import { Env, hashPassword, generateJWT } from '../auth_helper';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { email, password } = await context.request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanedEmail = email.toLowerCase().trim();
    
    // Retrieve user
    const userJson = await context.env.AUTO_LABELS_KV.get(`user:${cleanedEmail}`);
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = JSON.parse(userJson);
    
    // Hash password with stored salt and verify
    const testHash = await hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return new Response(
        JSON.stringify({ error: 'Invalid username or password.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT
    const payload = { email: cleanedEmail, exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) }; // 30 days
    const secret = context.env.JWT_SECRET || 'fallback-secret-key-12345';
    const token = await generateJWT(payload, secret);

    // Set cookie header
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    // Using SameSite=Lax (instead of Strict) is generally better for cross-site navigation, but Strict is great here.
    // Secure is omitted for localhost development unless using HTTPS, but let's include Path=/
    headers.append(
      'Set-Cookie',
      `token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; ${context.request.url.startsWith('https') ? 'Secure;' : ''}`
    );

    return new Response(
      JSON.stringify({ success: true, user: { email: cleanedEmail }, token }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
