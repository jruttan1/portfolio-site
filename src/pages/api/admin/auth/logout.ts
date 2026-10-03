import type { APIRoute } from 'astro';
import { session, settings, equals, AdminError, SESSION_COOKIE, STATE_COOKIE, json, failure } from '../../../../lib/admin/server';
export const prerender = false;
export const POST: APIRoute = async context => {
  try {
    const current = session(context);
    if (context.request.headers.get('origin') !== settings().origin || (current && !equals(context.request.headers.get('x-admin-csrf') ?? '', current.csrf))) throw new AdminError(403, 'Reload the editor and try again.');
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    context.cookies.delete(STATE_COOKIE, { path: '/' });
    return json({ ok: true });
  } catch (error) { return failure(error); }
};
