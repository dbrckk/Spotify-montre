import assert from 'node:assert/strict';
import {probeOfficialSources,safeOfficialUrl} from './official-source-http-probe.mjs';

const rows=[
 {id:'model-404',brand:'Demo',model:'404',merchantPriority:1,officialUrl:'https://source.example/watch/404'},
 {id:'model-ok',brand:'Demo',model:'OK',merchantPriority:1,officialUrl:'https://source.example/watch/ok'},
 {id:'model-blocked',brand:'Demo',model:'Blocked',merchantPriority:2,officialUrl:'https://source.example/watch/blocked'},
 {id:'model-redirect',brand:'Demo',model:'Redirect',merchantPriority:2,officialUrl:'https://source.example/watch/redirect'},
 {id:'model-crosshost',brand:'Demo',model:'Cross',merchantPriority:2,officialUrl:'https://source.example/watch/cross'},
 {id:'model-timeout',brand:'Demo',model:'Timeout',merchantPriority:3,officialUrl:'https://source.example/watch/timeout'},
 {id:'model-extra',brand:'Demo',model:'Extra',merchantPriority:5,officialUrl:'https://source.example/watch/extra'}
];
let urls=[];
const mockFetch=async url=>{
  urls.push(url);
  const path=new URL(url).pathname;
  const response=(status,location)=>({status,headers:{
    get(name){return name==='location'?location||null:null}
  },body:{cancel:async()=>{}}});
  if(path.endsWith('/404'))return response(404);
  if(path.endsWith('/ok'))return response(200);
  if(path.endsWith('/blocked'))return response(403);
  if(path.endsWith('/redirect'))return response(301,'/watch/ok');
  if(path.endsWith('/cross'))return response(302,'https://evil.example/redirect');
  if(path.endsWith('/timeout')){const error=new Error('timed out');error.name='TimeoutError';throw error;}
  return response(500);
};
const result=await probeOfficialSources({rows:rows.reverse(),fetchImpl:mockFetch,
  maxRecords:6,concurrency:3,timeoutMs:1000});
assert.equal(result.sampleSize,6);
assert.equal(result.totalCatalogRows,7);
const lookup=id=>result.results.find(x=>x.id===id);
assert.equal(lookup('model-404').outcome,'source_http_not_found');
assert.equal(lookup('model-ok').outcome,'reachable_http');
assert.equal(lookup('model-blocked').outcome,'restricted_or_rate_limited');
assert.equal(lookup('model-redirect').outcome,'reachable_http');
assert.equal(lookup('model-redirect').redirects,1);
assert.equal(lookup('model-crosshost').outcome,'redirect_requires_manual_review');
assert.equal(lookup('model-timeout').outcome,'network_timeout');
assert.equal(lookup('model-extra'),undefined);
assert.equal(result.results.length,6);
assert.equal(urls.some(x=>x.includes('evil.example')),false,
  'Never follow an unverified cross-host redirect');
assert.ok(result.caveats.some(s=>s.includes('No Amazon ASIN links')));
assert.equal(safeOfficialUrl('http://source.example/a'),null);
assert.equal(safeOfficialUrl('https://127.0.0.1/a'),null);
assert.equal(safeOfficialUrl('https://localhost/a'),null);
assert.equal(safeOfficialUrl('https://source.example@127.0.0.1/a'),null);
assert.equal(safeOfficialUrl('https://source.example:444/a'),null);
assert.equal(safeOfficialUrl('https://source.example/a#token'),null);
assert.equal(safeOfficialUrl('https://source.example/a')?.hostname,'source.example');
await assert.rejects(()=>probeOfficialSources({rows:[],fetchImpl:mockFetch}),/configuration/);
console.log('PASS: priority-only official source HTTP probe, redirect isolation and truthful unknown statuses.');
