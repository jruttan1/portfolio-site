import { useCallback, useEffect, useRef, useState } from 'react';
import { Puck, type Data } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import '../../styles/case-study.css';
import './editor.css';
import { config, type Blocks } from './config';
import { MediaContext, request } from './MediaField';
import { documentSchema, type CaseDocument, type CaseRoot } from '../../lib/admin/content';
type EditorData = Data<Blocks, CaseRoot>;
type Loaded = { document: CaseDocument; sha: string; data: EditorData; conflict: boolean; key: number };
const projects = ['primate', 'whim', 'optimate', 'doppels'];
const draftKey = (slug: string) => `portfolio-case-draft-v1:${slug}`;
export default function CaseStudyEditor({ csrf, login }: { csrf: string; login: string }) {
  const [slug, setSlug] = useState('primate');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState('Loading…');
  const [error, setError] = useState('');
  const [assets, setAssets] = useState<{ url: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [commit, setCommit] = useState('');
  const active = useRef('primate');
  const publishing = useRef(false);
  const latest = useRef<EditorData | null>(null);
  const load = useCallback(async (selected: string, discard = false) => {
    active.current = selected; setLoaded(null); latest.current = null; setError(''); setCommit(''); setStatus('Loading…');
    try {
      const remote = await request(`/api/admin/cases/${selected}`);
      const document = documentSchema.parse(remote.document);
      let data: EditorData = { root: document.root, content: document.content };
      let conflict = false; let restored = false;
      try {
        if (discard) localStorage.removeItem(draftKey(selected));
        const saved = localStorage.getItem(draftKey(selected));
        if (saved) {
          const draft = JSON.parse(saved);
          if (!draft.data?.root?.props || !Array.isArray(draft.data.content) || typeof draft.sha !== 'string') throw new Error('Invalid draft');
          data = draft.data;
          conflict = draft.sha !== remote.sha; restored = true;
        }
      } catch { /* A bad or unavailable local draft must not stop the remote document loading. */ }
      if (active.current !== selected) return;
      latest.current = data;
      setLoaded({ document, sha: remote.sha, data, conflict, key: Date.now() });
      setStatus(conflict ? 'GitHub changed since this draft. Download your draft, then load the latest version before publishing.' : restored ? 'Restored your draft from this browser.' : 'Up to date with GitHub.');
    } catch (error) { if (active.current === selected) { setError((error as Error).message); setStatus(''); } }
  }, []);
  useEffect(() => { void load(slug); }, [slug,load]);
  useEffect(() => { request('/api/admin/media').then(result => setAssets(result.assets)).catch(() => {}); }, []);
  function change(data: EditorData) {
    if (!loaded) return;
    latest.current = data;
    try {
      // Keep the original base SHA on a stale draft so it can never silently overwrite newer work.
      const prior = loaded.conflict ? JSON.parse(localStorage.getItem(draftKey(slug)) || '{}').sha : loaded.sha;
      localStorage.setItem(draftKey(slug), JSON.stringify({ sha: prior, data }));
      if (!publishing.current && !loaded.conflict) setStatus('Draft saved in this browser.');
    } catch { setError('This browser could not save the draft. Download a copy before leaving.'); }
  }
  async function publish(data: EditorData) {
    if (!loaded || publishing.current) return;
    if (loaded.conflict) { setError('Load the latest version before publishing. Download your draft first to keep a copy.'); return; }
    publishing.current = true; setBusy(true); setError(''); setStatus('Publishing…');
    try {
      const document = documentSchema.parse({ schemaVersion: 1, slug, root: data.root, content: data.content });
      const result = await request(`/api/admin/cases/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-CSRF': csrf }, body: JSON.stringify({ sha: loaded.sha, document }) });
      setLoaded(previous => previous ? { ...previous, document, sha: result.sha } : null);
      setCommit(result.commit);
      const editedDuringSave = JSON.stringify(latest.current) !== JSON.stringify(data);
      try {
        if (editedDuringSave) localStorage.setItem(draftKey(slug), JSON.stringify({ sha: result.sha, data: latest.current }));
        else localStorage.removeItem(draftKey(slug));
      } catch { /* Publishing succeeded even if local storage is unavailable. */ }
      setStatus(editedDuringSave ? 'Published. Your newer edits remain a local draft.' : 'Saved to GitHub. Vercel is rebuilding the live site.');
    } catch (error) { setError((error as Error).message); setStatus('Not published. Your draft is still here.'); }
    finally { publishing.current = false; setBusy(false); }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, slug, ...latest.current }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${slug}-draft.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function logout() {
    try { await request('/api/admin/auth/logout', { method: 'POST', headers: { 'X-Admin-CSRF': csrf } }); window.location.href = '/admin'; }
    catch (error) { setError((error as Error).message); }
  }
  return <MediaContext.Provider value={{ csrf, assets, uploaded: url => setAssets(previous => previous.some(item => item.url === url) ? previous : [...previous, { url, name: url.slice(1) }]) }}>
    <div className="editor-bar"><a href="/">Portfolio</a><label>Case study <select value={slug} disabled={busy} onChange={event => setSlug(event.target.value)}>{projects.map(project => <option key={project} value={project}>{project[0].toUpperCase() + project.slice(1)}</option>)}</select></label><a href={`/projects/${slug}`} target="_blank" rel="noreferrer">View live</a><span className="editor-account">{login}</span><button onClick={logout} disabled={busy}>Sign out</button></div>
    <div className="editor-status"><span role="status">{status}</span>{commit && <a href={commit} target="_blank" rel="noreferrer">View saved change</a>}{loaded && <><button onClick={download}>Download draft</button><button disabled={busy} onClick={() => { if (window.confirm('Discard the draft in this browser and load the latest version from GitHub?')) void load(slug, true); }}>Load latest</button></>}</div>
    {error && <div className="editor-error" role="alert">{error} <a href="/api/admin/auth/login">Sign in again</a></div>}
    {loaded ? <Puck<typeof config> key={`${slug}-${loaded.key}`} config={config} data={loaded.data} onChange={change} onPublish={publish} headerTitle={loaded.document.root.props.name} headerPath="" permissions={{ publish: !loaded.conflict && !busy }} /> : !error ? <p className="editor-loading">Loading case study…</p> : <button className="editor-retry" onClick={() => void load(slug)}>Try again</button>}
  </MediaContext.Provider>;
}
