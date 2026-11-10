import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {inspectRemoteMedia,plannedLiveUrls,verifyRetiredPhotoUrls,liveOrigin}
  from './check-retired-photo-live.mjs';

const id='citizen-tsuyosa';
const row={id,kind:'core',sourceSha256:'a'.repeat(64),
  media:['site/assets/watches/'+id+'.webp','site/assets/watch-responsive/'+id+'-480.webp']};
const urls=plannedLiveUrls(row);
assert.equal(urls.length,4,'Original and derivative each need normal and versioned URL checks');
assert.equal(urls[0],liveOrigin+'assets/watches/'+id+'.webp');
assert.equal(urls[1],urls[0]+'?v='+row.sourceSha256.slice(0,12));
assert.equal(new Set(urls).size,urls.length);
assert.deepEqual((await verifyRetiredPhotoUrls([])),{
  status:'not_applicable',verified:false,checked:0,failures:0,results:[]
});
for(const change of [
  {id:'../../secret'},
  {kind:'other'},
  {sourceSha256:'not-a-hash'},
  {media:[]},
  {media:['site/assets/watches/other-model.webp']},
  {media:[...row.media,row.media[0]]},
  {media:['site/assets/watches/'+id+'.webp','site/assets/watches-popular/'+id+'.webp']},
  {media:['https://evil.invalid/file.webp']}
]){
  assert.throws(()=>plannedLiveUrls({...row,...change}),
    'Malformed media evidence must fail closed: '+Object.keys(change).join(','));
}
await assert.rejects(()=>inspectRemoteMedia('https://evil.invalid/watch.webp',async()=>new Response(null,{status:404})));

const fake=makeResponse=>async url=>makeResponse(url);
const gone=await verifyRetiredPhotoUrls([row],fake(()=>new Response(null,{status:404})));
assert.equal(gone.status,'passed');
assert.equal(gone.verified,true);
assert.equal(gone.checked,4);
assert.equal(gone.failures,0);
const html=await verifyRetiredPhotoUrls([row],
  fake(()=>new Response('<!doctype html><html><body>Absent</body></html>',
    {status:200,headers:{'content-type':'text/html; charset=utf-8'}})));
assert.equal(html.status,'passed');
assert.ok(html.results.every(x=>x.reason==='non_image_html_fallback'));
const webp=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.from('data')]);
for(const contentType of ['image/webp','text/html','application/octet-stream']){
  const result=await verifyRetiredPhotoUrls([row],fake(()=>new Response(webp,{
    status:200,headers:{'content-type':contentType}
  })));
  assert.equal(result.status,'failed','A public WEBP cannot pass with content-type '+contentType);
  assert.equal(result.failures,4);
  assert.ok(result.results.every(x=>x.reason==='withdrawn_image_still_public'));
}
for(const code of [302,403,500]){
  const result=await verifyRetiredPhotoUrls([row],
    fake(()=>new Response(null,{status:code,headers:code===302?{location:'/watch.webp'}:{}})));
  assert.equal(result.status,'failed','Unverified status '+code+' must be rejected');
}
const unavailable=await inspectRemoteMedia(urls[0],async()=>{throw Error('timeout')});
assert.equal(unavailable.ok,false);
assert.equal(unavailable.reason,'network_error');
await assert.rejects(()=>verifyRetiredPhotoUrls([row,row],fake(()=>new Response(null,{status:404}))));

// No real network call is made when the active registry contains no retirements.
const root=resolve(import.meta.dirname,'..');
const command=spawnSync(process.execPath,['scripts/check-retired-photo-live.mjs','--json'],
  {cwd:root,encoding:'utf8',timeout:10000});
assert.equal(command.status,0,command.stderr);
const report=JSON.parse(command.stdout);
assert.equal(report.status,'not_applicable');
assert.equal(report.verified,false);
console.log('R1 live retirement verification: exact trusted origin, HTML fallback, old WEBP bytes and bad CDN responses validated offline');
