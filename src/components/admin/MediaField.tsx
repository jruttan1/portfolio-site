import { createContext, useContext, useState } from 'react';
export const MediaContext = createContext({ csrf: '', assets: [] as { url: string; name: string }[], uploaded: (_url: string) => {} });
export async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, credentials: 'same-origin' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed. Try again.');
  return result;
}
export default function MediaField({ value, onChange, label, video = false }: { value: string; onChange: (value: string) => void; label: string; video?: boolean }) {
  const { csrf, assets, uploaded } = useContext(MediaContext);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    if (file.size > 25 * 1024 * 1024) { setStatus('Use a file smaller than 25 MB.'); return; }
    setBusy(true);
    try {
      const tickets: string[] = [];
      const chunkSize = 2 * 1024 * 1024;
      for (let offset = 0; offset < file.size; offset += chunkSize) {
        setStatus(`Uploading ${Math.round(offset / file.size * 100)}%…`);
        const blob = file.slice(offset, offset + chunkSize);
        const content = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read file.')); reader.readAsDataURL(blob); });
        const result = await request('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-CSRF': csrf }, body: JSON.stringify({ action: 'chunk', content }) });
        tickets.push(result.ticket);
      }
      setStatus('Saving to GitHub…');
      const result = await request('/api/admin/media', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-CSRF': csrf }, body: JSON.stringify({ action: 'complete', tickets }) });
      uploaded(result.url); onChange(result.url);
      setStatus('Uploaded. Preview appears after Vercel finishes deploying the file.');
    } catch (error) { setStatus((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="media-field"><label>{label}<input value={value || ''} onChange={event => onChange(event.target.value)} placeholder="/uploads/image.jpg or https://…" /></label>
    <select aria-label={`Choose ${label}`} value="" onChange={event => { if (event.target.value) onChange(event.target.value); }}><option value="">Choose existing media…</option>{assets.filter(asset => video ? /\.mp4$/i.test(asset.url) : !/\.mp4$/i.test(asset.url)).map(asset => <option key={asset.url} value={asset.url}>{asset.name}</option>)}</select>
    <label className="upload-label">{busy ? 'Uploading…' : 'Upload a file'}<input type="file" disabled={busy} accept={video ? 'video/mp4' : 'image/png,image/jpeg,image/webp,image/gif'} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /></label>
    <small>Up to 25 MB. Uploads are saved to the public repository immediately.</small>{status && <small role="status">{status}</small>}
  </div>;
}
