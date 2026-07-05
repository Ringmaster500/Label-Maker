import { Env, generateSalt, hashPassword } from '../auth_helper';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { email, password } = await context.request.json() as { email?: string; password?: string };

    if (!email || !password || email.trim() === '' || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Valid username and password (minimum 6 characters) are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanedEmail = email.toLowerCase().trim();
    
    // Check if user already exists
    const existing = await context.env.AUTO_LABELS_KV.get(`user:${cleanedEmail}`);
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'An account with this username already exists.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password and store
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const userData = {
      email: cleanedEmail,
      passwordHash,
      salt,
      createdAt: new Date().toISOString()
    };

    await context.env.AUTO_LABELS_KV.put(`user:${cleanedEmail}`, JSON.stringify(userData));

    return new Response(
      JSON.stringify({ success: true, message: 'Account created successfully.' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
