import type { APIRoute } from 'astro';
import { z } from 'zod';
import { documentSchema } from '../../../../lib/admin/content';
import { requireSession, contentPath, repository, branch, github, json, readJSON, failure, AdminError } from '../../../../lib/admin/server';
export const prerender = false;
const slugSchema = z.enum(['primate', 'whim', 'optimate', 'doppels']);
const fileURL = (slug: string) => `/repos/${repository}/contents/${contentPath(slug)}`;
export const GET: APIRoute = async context => {
  try {
    const current = await requireSession(context);
    const slug = slugSchema.parse(context.params.slug);
    const file = await github<{ sha: string; content: string; encoding: string }>(current.token, `${fileURL(slug)}?ref=${branch}`);
    if (file.encoding !== 'base64') throw new AdminError(502, 'Unexpected content format from GitHub.');
    const document = documentSchema.parse(JSON.parse(Buffer.from(file.content, 'base64').toString()));
    return json({ document, sha: file.sha });
  } catch (error) { return failure(error); }
};
export const PUT: APIRoute = async context => {
  try {
    const current = await requireSession(context, true);
    const slug = slugSchema.parse(context.params.slug);
    const payload = z.object({ document: documentSchema, sha: z.string().regex(/^[a-f0-9]{40}$/) }).parse(await readJSON(context.request));
    if (payload.document.slug !== slug) throw new AdminError(400, 'The case-study URL cannot be changed here.');
    const result = await github<{ content: { sha: string }; commit: { sha: string; html_url: string } }>(current.token, fileURL(slug), {
      method: 'PUT', body: JSON.stringify({ message: `Update ${payload.document.root.props.name} case study`, branch, sha: payload.sha, content: Buffer.from(JSON.stringify(payload.document, null, 2) + '\n').toString('base64') }),
    });
    return json({ sha: result.content.sha, commit: result.commit.html_url });
  } catch (error) { return failure(error); }
};
