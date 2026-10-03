import { z } from "zod";

const text = z.string().max(20000);
const short = z.string().max(240);
const required = short.trim().min(1);
const url = z.string().max(2048).refine(value => {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return !/[\\\x00-\x20]/.test(value);
  try { const parsed = new URL(value); return parsed.protocol === "https:" && !parsed.username && !parsed.password; } catch { return false; }
}, "Use a /local-path or an https:// URL.");
const ratio = z.string().regex(/^\d{1,5}\s*\/\s*\d{1,5}$/).refine(v => v.split('/').every(n => Number(n) > 0));
export const rootSchema = z.object({
  name: required, eyebrow: short, title: required, overview: text,
  role: short, timeline: short, team: z.string().max(1000), skills: z.string().max(2000),
  media: url, poster: url, mediaAspectRatio: ratio, demoNote: text,
  externalUrl: url, externalLabel: short,
});
const id = z.string().min(1).max(160).regex(/^[\w-]+$/);
const paragraph = z.object({ type: z.literal("Text"), props: z.object({ id, title: short, body: text }) });
const contributions = z.object({ type: z.literal("Contributions"), props: z.object({ id, title: short, items: z.array(z.object({ title: short, body: text })).max(30) }) });
const image = z.object({ type: z.literal("Image"), props: z.object({ id, src: url, title: short, caption: text }) });
const video = z.object({ src: url, poster: url, title: short, caption: text, aspectRatio: ratio });
const videos = z.object({ type: z.literal("Videos"), props: z.object({ id, items: z.array(video).max(10) }) });
const outcomes = z.object({ type: z.literal("Outcomes"), props: z.object({ id, title: short, body: text, items: z.array(z.object({ text })).max(40) }) });
export const blockSchema = z.discriminatedUnion("type", [paragraph, contributions, image, videos, outcomes]);
export const documentSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  root: z.object({ props: rootSchema }),
  content: z.array(blockSchema).max(80),
}).superRefine((document, context) => {
  const ids = document.content.map(block => block.props.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', message: 'Each section must have a unique ID.' });
});
export type CaseDocument = z.infer<typeof documentSchema>;
export type CaseBlock = CaseDocument["content"][number];
export type CaseRoot = z.infer<typeof rootSchema>;
