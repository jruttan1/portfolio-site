import type { APIRoute } from 'astro';
import { settings, opaque, digest, seal, cookieOptions, STATE_COOKIE, privateHeaders, failure } from '../../../../lib/admin/server';
export const prerender = false;
export const GET: APIRoute = context => {
  try {
    const config = settings();
    const state = opaque(), verifier = opaque();
    context.cookies.set(STATE_COOKIE, seal({ state, verifier, exp: Date.now() + 600000 }, 'oauth'), cookieOptions(600));
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback, scope: 'public_repo', state, code_challenge: digest(verifier), code_challenge_method: 'S256', login: 'jruttan1', allow_signup: 'false' }).toString();
    return new Response(null, { status: 302, headers: { ...privateHeaders, Location: url.toString() } });
  } catch (error) { return failure(error); }
};
