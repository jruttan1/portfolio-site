import type { APIRoute } from 'astro';
import { z } from 'zod';
import { settings, seal, unseal, opaque, equals, cookieOptions, STATE_COOKIE, SESSION_COOKIE, privateHeaders, github, allowedUserId } from '../../../../lib/admin/server';
export const prerender = false;
export const GET: APIRoute = async context => {
  const redirect = (path: string) => new Response(null, { status: 302, headers: { ...privateHeaders, Location: path } });
  try {
    const config = settings();
    const raw = context.cookies.get(STATE_COOKIE)?.value;
    context.cookies.delete(STATE_COOKIE, { path: '/' });
    const saved = z.object({ state: z.string(), verifier: z.string(), exp: z.number() }).safeParse(raw ? unseal(raw, 'oauth') : null);
    const state = context.url.searchParams.get('state') ?? '';
    const code = context.url.searchParams.get('code');
    if (!saved.success || saved.data.exp <= Date.now() || !equals(saved.data.state, state) || !code || code.length > 512) return redirect('/admin?error=login');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.callback, code_verifier: saved.data.verifier }),
    });
    if (!response.ok) return redirect('/admin?error=login');
    const result = z.object({ access_token: z.string().min(1).max(2000), expires_in: z.number().optional() }).safeParse(await response.json());
    if (!result.success) return redirect('/admin?error=login');
    const user = await github<{ id: number; login: string }>(result.data.access_token, '/user');
    if (user.id !== allowedUserId) return redirect('/admin?error=access');
    const lifetime = Math.min(8 * 3600, result.data.expires_in ?? 8 * 3600);
    context.cookies.set(SESSION_COOKIE, seal({ token: result.data.access_token, userId: user.id, login: user.login, csrf: opaque(), exp: Date.now() + lifetime * 1000 }, 'session'), cookieOptions(lifetime));
    return redirect('/admin');
  } catch { return redirect('/admin?error=login'); }
};
