import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { documentSchema } from '../src/lib/admin/content.ts';
import { seal, unseal, session, settings, SESSION_COOKIE, STATE_COOKIE, allowedUserId, readJSON, repository } from '../src/lib/admin/server.ts';
import { GET, PUT } from '../src/pages/api/admin/cases/[slug].ts';
import { GET as login } from '../src/pages/api/admin/auth/login.ts';
import { GET as callback } from '../src/pages/api/admin/auth/callback.ts';
import { POST as logout } from '../src/pages/api/admin/auth/logout.ts';
import { POST as upload, mediaExtension } from '../src/pages/api/admin/media.ts';
Object.assign(process.env, { GITHUB_CLIENT_ID:'test-client', GITHUB_CLIENT_SECRET:'test-secret', ADMIN_SESSION_SECRET:'test-secret-that-is-at-least-32-bytes-long', ADMIN_SITE_URL:'https://portfolio.example' });
const csrf = 'a'.repeat(43);
const auth = () => seal({ token:'test-token', userId:allowedUserId, login:'jruttan1', csrf, exp:Date.now()+60000 }, 'session');
const study = () => JSON.parse(readFileSync(new URL('../src/content/case-studies/primate.json', import.meta.url)));
function context(method='GET', body, { cookie=auth(), origin='https://portfolio.example', nonce=csrf, slug='primate', url='https://portfolio.example/api/admin/cases/primate' }={}) {
  const jar = new Map(cookie ? [[SESSION_COOKIE, cookie]] : []);
  const options = new Map();
  return { params:{slug}, url:new URL(url), request:new Request(url,{method,headers:{'Content-Type':'application/json', Origin:origin, 'X-Admin-CSRF':nonce}, ...(body === undefined ? {} : {body:JSON.stringify(body)})}), cookies:{get:name=>jar.has(name)?{value:jar.get(name)}:undefined, set:(name,value,opts)=>{jar.set(name,value);options.set(name,opts);},delete:name=>jar.delete(name)}, jar, options };
}
async function mocked(handler, run) { const original=globalThis.fetch; const calls=[]; globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),...options}); return handler(String(url),options);}; try {return await run(calls);} finally {globalThis.fetch=original;} }
const response = (body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const userOr = (url, handler) => url.endsWith('/user') ? response({id:allowedUserId,login:'jruttan1'}) : handler();

test('all migrated case studies validate, keep media and readable content',()=>{
 for(const slug of ['primate','whim','optimate','doppels']) { const doc=documentSchema.parse(JSON.parse(readFileSync(new URL(`../src/content/case-studies/${slug}.json`,import.meta.url)))); assert.equal(doc.slug,slug); assert.ok(doc.root.props.media); assert.ok(doc.content.some(x=>x.type==='Text')); assert.ok(doc.content.some(x=>x.type==='Outcomes')); }
});
test('schema rejects executable URLs, duplicate IDs, oversized text and invalid ratios',()=>{
 for(const bad of ['javascript:alert(1)','//evil.example/x','/\\evil.example/x','http://evil.example/x']) { const doc=study(); doc.root.props.externalUrl=bad; assert.equal(documentSchema.safeParse(doc).success,false); }
 let doc=study(); doc.content.push(doc.content[0]); assert.equal(documentSchema.safeParse(doc).success,false);
 doc=study();doc.root.props.overview='x'.repeat(20001);assert.equal(documentSchema.safeParse(doc).success,false);
 doc=study();doc.root.props.mediaAspectRatio='16 / 0';assert.equal(documentSchema.safeParse(doc).success,false);
});
test('encrypted sessions reject tampering, wrong purpose, expired and wrong-owner cookies',()=>{
 const encoded=auth();assert.equal(unseal(encoded,'session').token,'test-token');assert.equal(unseal(encoded,'oauth'),null);
 const bytes=Buffer.from(encoded,'base64url');bytes[30]^=1;assert.equal(unseal(bytes.toString('base64url'),'session'),null);
 assert.equal(session(context('GET',undefined,{cookie:seal({token:'x',userId:allowedUserId,login:'x',csrf,exp:0},'session')})),null);
 assert.equal(session(context('GET',undefined,{cookie:seal({token:'x',userId:1,login:'x',csrf,exp:Date.now()+60000},'session')})),null);
});
test('unauthenticated APIs and CSRF failures cannot reach GitHub',async()=>{
 await mocked(()=>{throw Error('Must not call GitHub');},async()=>{
  assert.equal((await GET(context('GET',undefined,{cookie:null}))).status,401);
  assert.equal((await PUT(context('PUT',{}, {origin:'https://evil.example'}))).status,403);
  assert.equal((await PUT(context('PUT',{}, {nonce:'wrong'}))).status,403);
  assert.equal((await upload(context('POST',{}, {cookie:null}))).status,401);
 });
});
test('OAuth login creates expiring HTTP-only state and PKCE challenge',async()=>{
 const ctx=context();const result=await login(ctx);assert.equal(result.status,302);const location=new URL(result.headers.get('location'));assert.equal(location.hostname,'github.com');assert.equal(location.searchParams.get('code_challenge_method'),'S256');assert.equal(location.searchParams.get('scope'),'public_repo');
 assert.ok(location.searchParams.get('code_challenge'));const cookie=ctx.options.get(STATE_COOKIE);assert.equal(cookie.httpOnly,true);assert.equal(cookie.secure,true);assert.equal(cookie.sameSite,'lax');assert.equal(cookie.maxAge,600);
});
test('OAuth callback rejects mismatched state without exchanging a token',async()=>{
 const ctx=context('GET',undefined,{url:'https://portfolio.example/api/admin/auth/callback?code=x&state=wrong'});ctx.jar.set(STATE_COOKIE,seal({state:'expected',verifier:'v',exp:Date.now()+60000},'oauth'));
 await mocked(()=>{throw Error('Must not exchange token');},async()=>{assert.equal((await callback(ctx)).headers.get('location'),'/admin?error=login');assert.equal(ctx.jar.has(STATE_COOKIE),false);});
});
test('OAuth callback allows only owner and never exposes token in redirect',async()=>{
 for (const id of [123,allowedUserId]) {
  const ctx=context('GET',undefined,{cookie:null,url:'https://portfolio.example/api/admin/auth/callback?code=x&state=expected'});ctx.jar.set(STATE_COOKIE,seal({state:'expected',verifier:'verifier',exp:Date.now()+60000},'oauth'));
  await mocked((url,options)=>url.includes('access_token')?(assert.equal(JSON.parse(options.body).code_verifier,'verifier'),response({access_token:'private-token'})):response({id,login:'jruttan1'}),async()=>{
   const result=await callback(ctx);assert.equal(result.headers.get('location'),id===allowedUserId?'/admin':'/admin?error=access');assert.equal(ctx.jar.has(SESSION_COOKIE),id===allowedUserId);if(id===allowedUserId){assert.equal(session(ctx).token,'private-token');assert.ok(!ctx.jar.get(SESSION_COOKIE).includes('private-token'));}
  });
 }
});
test('revoked token or wrong GitHub identity cannot read or publish',async()=>{
 await mocked(()=>response({id:999}),async()=>{assert.equal((await GET(context())).status,403);});
 await mocked(()=>response({},401),async()=>{assert.equal((await PUT(context('PUT',{document:study(),sha:'a'.repeat(40)}))).status,401);});
});
test('read returns latest GitHub file and SHA with no-store',async()=>{
 await mocked(url=>userOr(url,()=>response({sha:'b'.repeat(40),encoding:'base64',content:Buffer.from(JSON.stringify(study())).toString('base64')})),async()=>{const result=await GET(context());assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);const body=await result.json();assert.equal(body.sha,'b'.repeat(40));assert.equal(body.document.slug,'primate');});
});
test('publish confines writes to fixed file and branch and sends expected SHA',async()=>{
 await mocked((url,options)=>userOr(url,()=>{assert.equal(url,`https://api.github.com/repos/${repository}/contents/src/content/case-studies/primate.json`);const payload=JSON.parse(options.body);assert.equal(payload.sha,'a'.repeat(40));assert.equal(payload.branch,'main');assert.equal(JSON.parse(Buffer.from(payload.content,'base64')).slug,'primate');return response({content:{sha:'b'.repeat(40)},commit:{html_url:'https://github.com/example/commit'}});}),async calls=>{assert.equal((await PUT(context('PUT',{document:study(),sha:'a'.repeat(40)}))).status,200);assert.equal(calls.length,2);});
});
test('stale SHA returns conflict and does not retry or overwrite',async()=>{
 await mocked(url=>userOr(url,()=>response({},409)),async calls=>{const result=await PUT(context('PUT',{document:study(),sha:'a'.repeat(40)}));assert.equal(result.status,409);assert.equal(calls.filter(x=>x.method==='PUT').length,1);});
});
test('invalid document or path cannot write',async()=>{
 await mocked((url)=>{assert.ok(url.endsWith('/user'));return response({id:allowedUserId});},async()=>{
  const doc=study();doc.slug='whim';assert.equal((await PUT(context('PUT',{document:doc,sha:'a'.repeat(40)}))).status,400);
  assert.equal((await PUT(context('PUT',{}, {slug:'../../anything'}))).status,400);
 });
});
test('request parsing rejects oversized bodies and wrong content types',async()=>{
 await assert.rejects(readJSON(new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:'a'.repeat(1000)})}),100),error=>error.status===413);
 await assert.rejects(readJSON(new Request('https://example.com',{method:'POST',body:'x'})),error=>error.status===415);
});
test('media signatures reject SVG and accept supported binary formats',()=>{
 assert.equal(mediaExtension(Buffer.from('<svg onload="alert(1)">')),null);assert.equal(mediaExtension(Buffer.from([255,216,255,0])),'jpg');assert.equal(mediaExtension(Buffer.from('0000ftypisom0000')),'mp4');assert.equal(mediaExtension(Buffer.from('0000ftypqt  0000')),null);
});
test('upload receipts cannot be forged and unsupported complete files never commit',async()=>{
 await mocked(url=>userOr(url,()=>{throw Error('No upload should happen');}),async()=>{assert.equal((await upload(context('POST',{action:'complete',tickets:['forged']}))).status,400);});
 const bytes=Buffer.from('<svg>bad</svg>');const ticket=seal({sha:'c'.repeat(40),size:bytes.length,exp:Date.now()+60000},'upload');
 await mocked(url=>userOr(url,()=>{assert.ok(url.includes('/git/blobs/'));return response({encoding:'base64',size:bytes.length,content:bytes.toString('base64')});}),async calls=>{assert.equal((await upload(context('POST',{action:'complete',tickets:[ticket]}))).status,400);assert.equal(calls.some(x=>x.method==='PUT'),false);});
});
test('chunk upload and completion commit only a content-addressed public asset',async()=>{
 const bytes=Buffer.from([255,216,255,0,1,2]);let ticket;
 await mocked(url=>userOr(url,()=>response({sha:'c'.repeat(40)})),async()=>{const result=await upload(context('POST',{action:'chunk',content:bytes.toString('base64')}));assert.equal(result.status,200);ticket=(await result.json()).ticket;});
 await mocked((url,options)=>userOr(url,()=>{
  if(url.includes('/git/blobs/'))return response({encoding:'base64',size:bytes.length,content:bytes.toString('base64')});
  assert.match(url,/\/contents\/public\/uploads\/[a-f0-9]{64}\.jpg/);
  if(options.method==='PUT'){const data=JSON.parse(options.body);assert.equal(data.branch,'main');assert.equal(data.content,bytes.toString('base64'));return response({});}return response({},404);
 }),async()=>{const result=await upload(context('POST',{action:'complete',tickets:[ticket]}));assert.equal(result.status,200);assert.match((await result.json()).url,/^\/uploads\/[a-f0-9]{64}\.jpg$/);});
});
test('logout clears session even if GitHub token has been revoked',async()=>{
 await mocked(()=>{throw Error('Logout must not require GitHub');},async()=>{const ctx=context('POST');assert.equal((await logout(ctx)).status,200);assert.equal(ctx.jar.has(SESSION_COOKIE),false);});
});
test('configuration rejects non-HTTPS external origins',()=>{
 const original=process.env.ADMIN_SITE_URL;try{process.env.ADMIN_SITE_URL='http://evil.example';assert.throws(settings);process.env.ADMIN_SITE_URL='https://example.com/path';assert.throws(settings);}finally{process.env.ADMIN_SITE_URL=original;}
});
