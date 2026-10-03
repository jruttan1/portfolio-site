import type { Config, Field } from '@puckeditor/core';
import type { CaseBlock, CaseRoot } from '../../lib/admin/content';
import MediaField from './MediaField';
type Blocks = { [K in CaseBlock['type']]: Omit<Extract<CaseBlock, { type: K }>['props'], 'id'> };
export type { Blocks };
const text = (label: string): Field => ({ type: 'text', label });
const body = (label: string): Field => ({ type: 'textarea', label });
const media = (label: string, video = false): Field => ({ type: 'custom', label, render: ({ value, onChange }) => <MediaField label={label} value={value} onChange={onChange} video={video} /> });
export const config: Config<Blocks, CaseRoot> = {
  root: {
    fields: {
      name: text('Project name'), eyebrow: text('Project / year'), title: text('Headline'), overview: body('Introduction'),
      role: text('My role'), timeline: text('When'), team: body('Team'), skills: text('Built with (comma separated)'),
      media: media('Main demo', true), poster: media('Demo cover image'), mediaAspectRatio: text('Demo aspect ratio (16 / 9)'), demoNote: body('Demo caption (optional)'),
      externalUrl: text('Project link'), externalLabel: text('Link label'),
    },
    render: ({ children, ...props }) => <main className="case-study editor-preview">
      <header><p className="project-context">{props.eyebrow}</p><h1>{props.name}</h1><p className="subtitle">{props.title}</p><p className="intro">{props.overview}</p></header>
      <figure className="cover">{props.media ? <video src={props.media} poster={props.poster} controls preload="none" style={{ width: '100%', aspectRatio: props.mediaAspectRatio }} /> : props.poster ? <img src={props.poster} alt="Demo cover" /> : null}</figure>
      {props.demoNote && <p className="demo-note prose">{props.demoNote}</p>}
      <dl className="project-facts" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>{[['My role',props.role],['When',props.timeline],['Team',props.team],['Built with',props.skills]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {children}
    </main>,
  },
  components: {
    Text: { label: 'Text section', fields: { title: text('Heading'), body: body('Text') }, defaultProps: { title: 'Section heading', body: 'Write your story here.' }, render: ({ title, body }) => <section className="prose"><h2>{title}</h2><p>{body}</p></section> },
    Contributions: { label: 'Work / contributions', fields: { title: text('Heading'), items: { type: 'array', label: 'Items', arrayFields: { title: text('Heading'), body: body('Text') }, getItemSummary: item => item.title || 'Contribution', defaultItemProps: { title: '', body: '' } } }, defaultProps: { title: 'What I worked on', items: [] }, render: ({ title, items }) => <section className="prose"><h2>{title}</h2>{items.map((item,i) => <div key={i}><h3>{item.title}</h3><p>{item.body}</p></div>)}</section> },
    Image: { label: 'Screenshot', fields: { title: text('Heading'), caption: body('Caption / image description'), src: media('Image') }, defaultProps: { title: '', caption: '', src: '' }, render: ({ title, caption, src }) => <figure className="product-screen"><div className="prose"><h3>{title}</h3>{caption && <p>{caption}</p>}</div>{src ? <img src={src} alt={caption || title} /> : <div className="media-placeholder">Choose an image in the sidebar</div>}</figure> },
    Videos: { label: 'Feature demos', fields: { items: { type: 'array', label: 'Videos', arrayFields: { title: text('Heading'), caption: body('Caption'), src: media('Video',true), poster: media('Cover image'), aspectRatio: text('Aspect ratio (16 / 9)') }, defaultItemProps: { title: '', caption: '', src: '', poster: '', aspectRatio: '16 / 9' }, getItemSummary: item => item.title || 'Video' } }, defaultProps: { items: [{ title: '', caption: '', src: '', poster: '', aspectRatio: '16 / 9' }] }, render: ({ items }) => <div className="feature-demos">{items.map((item,i) => <figure className="feature-demo" key={i}><h3>{item.title}</h3><p>{item.caption}</p>{item.src ? <video src={item.src} poster={item.poster} controls preload="none" style={{ aspectRatio: item.aspectRatio }} /> : <div className="media-placeholder">Choose a video in the sidebar</div>}</figure>)}</div> },
    Outcomes: { label: 'Text with bullets', fields: { title: text('Heading'), body: body('Text (optional)'), items: { type: 'array', label: 'Bullet points', arrayFields: { text: body('Text') }, defaultItemProps: { text: '' }, getItemSummary: item => item.text.slice(0,60) || 'Bullet point' } }, defaultProps: { title: 'What I learned', body: '', items: [] }, render: ({ title, body, items }) => <section className="prose outcomes"><h2>{title}</h2>{body && <p>{body}</p>}{items.length > 0 && <ul>{items.map((item,i) => <li key={i}>{item.text}</li>)}</ul>}</section> },
  },
};
