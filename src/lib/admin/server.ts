import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { APIContext } from "astro";
import { z } from "zod";

export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const SESSION_COOKIE = "portfolio_admin";
export const STATE_COOKIE = "portfolio_oauth";
export const allowedUserId = 187563495;
export const repository = "jruttan1/portfolio-site";
export const branch = "main";
export const contentPath = (slug: string) => `src/content/case-studies/${slug}.json`;
export function settings() {
  const env = import.meta.env ?? {};
  const clientId = process.env.GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET;
  const secret = process.env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET;
  const site = process.env.ADMIN_SITE_URL || env.ADMIN_SITE_URL;
  if (!clientId || !clientSecret || !secret || Buffer.byteLength(secret) < 32 || !site) throw new AdminError(503, "The editor needs its GitHub login settings configured in Vercel.");
  let origin: string;
  try {
    const url = new URL(site);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && !process.env.VERCEL))) throw new Error();
    origin = url.origin;
  } catch { throw new AdminError(503, "ADMIN_SITE_URL must be the site's canonical HTTPS origin."); }
  return { clientId, clientSecret, secret, origin, callback: `${origin}/api/admin/auth/callback` };
}
export const opaque = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('base64url');
export function equals(a: string, b: string) {
  const aa = Buffer.from(a), bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function seal(payload: object, purpose: string, secret = settings().secret) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), nonce);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal(value: string, purpose: string, secret = settings().secret): unknown {
  try {
    const data = Buffer.from(value, 'base64url');
    if (data.length < 29 || data.length > 8192) return null;
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), data.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
  } catch { return null; }
}
const sessionSchema = z.object({ token: z.string().min(1).max(2000), userId: z.literal(allowedUserId), login: z.string(), csrf: z.string().min(32), exp: z.number() });
export type Session = z.infer<typeof sessionSchema>;
export function session(context: Pick<APIContext, 'cookies'>): Session | null {
  const cookie = context.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const result = sessionSchema.safeParse(unseal(cookie, 'session'));
  return result.success && result.data.exp > Date.now() ? result.data : null;
}
export function cookieOptions(maxAge: number) {
  return { path: '/', httpOnly: true, secure: settings().origin.startsWith('https:'), sameSite: 'lax' as const, maxAge };
}
export const privateHeaders = {
  'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
};
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...privateHeaders, 'Content-Type': 'application/json' } });
export async function github<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options, signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    if (response.status === 401) throw new AdminError(401, 'Your GitHub login expired. Sign in again; your draft is saved in this browser.');
    if ([409, 422].includes(response.status)) throw new AdminError(409, 'The repository changed or GitHub rejected the update. Reload the latest version before publishing again. Your draft is still saved.');
    if (response.status === 404) throw new AdminError(404, 'This file is not in the GitHub repository yet. Deploy the editor changes first.');
    throw new AdminError(502, 'GitHub could not complete this request. Check repository permissions or try again shortly.');
  }
  return response.json() as Promise<T>;
}
export async function requireSession(context: APIContext, write = false) {
  const current = session(context);
  if (!current) throw new AdminError(401, 'Sign in with GitHub to use the editor.');
  if (write && (context.request.headers.get('origin') !== settings().origin || !equals(context.request.headers.get('x-admin-csrf') ?? '', current.csrf))) throw new AdminError(403, 'This request did not come from your editor. Reload and try again.');
  // Verify the token's account again, so a revoked token never keeps write access.
  const user = await github<{ id: number }>(current.token, '/user');
  if (user.id !== allowedUserId) throw new AdminError(403, 'This editor is only available to its owner.');
  return current;
}
export async function readJSON(request: Request, limit = 800000): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AdminError(415, 'Expected JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, 'Missing request body.');
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new AdminError(413, 'This request is too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AdminError(400, 'Invalid JSON.'); }
}
export function failure(error: unknown) {
  if (error instanceof AdminError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') }, 400);
  return json({ error: 'The request failed. Your draft has not been discarded; try again shortly.' }, 500);
}
