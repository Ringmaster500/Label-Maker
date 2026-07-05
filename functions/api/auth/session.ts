import { Env, getAuthorizedUser } from '../auth_helper';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const secret = context.env.JWT_SECRET || 'fallback-secret-key-12345';
  const user = await getAuthorizedUser(context.request, secret);

  if (!user) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ authenticated: true, user: { email: user.email } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
