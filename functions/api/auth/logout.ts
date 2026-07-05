import { Env } from '../auth_helper';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  // Clear the cookie by setting it to empty and Max-Age=0
  headers.append(
    'Set-Cookie',
    `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; ${context.request.url.startsWith('https') ? 'Secure;' : ''}`
  );

  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully.' }),
    { status: 200, headers }
  );
};
export const onRequestGet: PagesFunction<Env> = onRequestPost; // Support GET too for simple redirects
