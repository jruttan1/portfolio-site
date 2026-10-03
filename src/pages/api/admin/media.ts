import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { requireSession, repository, branch, github, json, readJSON, failure, AdminError, seal, unseal } from '../../../lib/admin/server';
export const prerender = false;
const base = `/repos/${repository}`;
const ticketSchema = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/), size: z.number().int().min(1).max(2 * 1024 * 1024), exp: z.number() });
export const GET: APIRoute = async context => {
  try {
    const current = await requireSession(context);
    const result = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(current.token, `${base}/git/trees/${branch}?recursive=1`);
    return json({ assets: result.tree.filter(item => item.type === 'blob' && /^public\/.*\.(png|jpe?g|webp|gif|mp4)$/i.test(item.path)).map(item => ({ url: '/' + item.path.slice(7), name: item.path.slice(7) })), truncated: result.truncated });
  } catch (error) { return failure(error); }
};
export function mediaExtension(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (bytes.toString('ascii', 4, 8) === 'ftyp' && ['isom','iso2','mp41','mp42','avc1','M4V '].includes(bytes.toString('ascii', 8, 12))) return 'mp4';
  return null;
}
export const POST: APIRoute = async context => {
  try {
    const current = await requireSession(context, true);
    const payload = z.discriminatedUnion('action', [
      z.object({ action: z.literal('chunk'), content: z.string().min(4).max(2800000).regex(/^[A-Za-z0-9+/]+={0,2}$/) }),
      z.object({ action: z.literal('complete'), tickets: z.array(z.string().max(2048)).min(1).max(13) }),
    ]).parse(await readJSON(context.request, 2900000));
    if (payload.action === 'chunk') {
      const bytes = Buffer.from(payload.content, 'base64');
      if (bytes.length > 2 * 1024 * 1024 || bytes.toString('base64') !== payload.content) throw new AdminError(400, 'Invalid upload chunk.');
      const blob = await github<{ sha: string }>(current.token, `${base}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: payload.content, encoding: 'base64' }) });
      return json({ ticket: seal({ sha: blob.sha, size: bytes.length, exp: Date.now() + 30 * 60 * 1000 }, 'upload') });
    }
    const tickets = payload.tickets.map(value => ticketSchema.parse(unseal(value, 'upload')));
    if (tickets.some(t => t.exp < Date.now()) || tickets.reduce((sum, t) => sum + t.size, 0) > 25 * 1024 * 1024) throw new AdminError(400, 'Upload expired or exceeds 25 MB. Try a smaller file.');
    const chunks: Buffer[] = [];
    for (const ticket of tickets) {
      const blob = await github<{ content: string; encoding: string; size: number }>(current.token, `${base}/git/blobs/${ticket.sha}`);
      if (blob.encoding !== 'base64' || blob.size !== ticket.size) throw new AdminError(400, 'Invalid upload.');
      const bytes = Buffer.from(blob.content, 'base64');
      if (bytes.length !== ticket.size) throw new AdminError(400, 'Incomplete upload.');
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    const extension = mediaExtension(bytes);
    if (!extension) throw new AdminError(400, 'Use a PNG, JPEG, WebP, GIF, or MP4 file.');
    const path = `public/uploads/${createHash('sha256').update(bytes).digest('hex')}.${extension}`;
    let exists = false;
    try { await github(current.token, `${base}/contents/${path}?ref=${branch}`); exists = true; }
    catch (error) { if (!(error instanceof AdminError && error.status === 404)) throw error; }
    if (!exists) await github(current.token, `${base}/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: 'Add case-study media', branch, content: bytes.toString('base64') }) });
    return json({ url: '/' + path.slice(7) });
  } catch (error) { return failure(error); }
};
