#!/usr/bin/env node
/**
 * Read-only, exact-URL post-publication verifier for withdrawn watch media.
 * A successful local deletion is NOT evidence of a CDN purge.
 * Only the one configured Render host is contacted, never URLs from a registry.
 */
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const liveOrigin='https://atelier-montres-selection-fr.onrender.com/';
const idPattern=/^[a-z0-9-]{4,64}$/;
const hashPattern=/^[a-f0-9]{64}$/i;
const folders={
  core:['watches','watch-responsive','watch-thumbs'],
  supplemental:['watches-popular','popular-responsive']
};

export function plannedLiveUrls(record){
  if(!record||!idPattern.test(record.id||'')||
    !['core','supplemental'].includes(record.kind)||
    !hashPattern.test(record.sourceSha256||'')||
    !Array.isArray(record.media)||record.media.length<1||record.media.length>20||
    new Set(record.media).size!==record.media.length)
    throw Error('Malformed retired-photo evidence row');
  const allowed=folders[record.kind];
  const prefix='site/assets/';
  const original=prefix+(record.kind==='core'?'watches':'watches-popular')+'/'+record.id+'.webp';
  if(!record.media.includes(original))throw Error('Missing original in retirement record: '+record.id);
  for(const path of record.media){
    if(typeof path!=='string'||!path.startsWith(prefix))throw Error('Unexpected retirement path');
    const sub=path.slice(prefix.length);
    const slash=sub.indexOf('/');
    if(slash<0||!allowed.includes(sub.slice(0,slash)))throw Error('Unexpected media folder: '+path);
    const basename=sub.slice(slash+1);
    if(basename!==record.id+'.webp'&&
       !new RegExp('^'+record.id+'-(?:240|360|480|720|800|960)\\.webp$').test(basename))
      throw Error('Wrong model or unexpected derivative: '+path);
  }
  const version=record.sourceSha256.toLowerCase().slice(0,12);
  return record.media.flatMap(path=>{
    const file=path.slice('site/'.length);
    return [new URL(file,liveOrigin).href,new URL(file+'?v='+version,liveOrigin).href];
  });
}

function imageSignature(bytes){
  const first=bytes.subarray(0,32);
  return (first.length>=12&&first.toString('ascii',0,4)==='RIFF'&&
    first.toString('ascii',8,12)==='WEBP')||
    (first.length>=4&&first.toString('hex',0,4)==='89504e47')||
    (first.length>=3&&first.toString('hex',0,3)==='ffd8ff')||
    (first.length>=6&&['GIF87a','GIF89a'].includes(first.toString('ascii',0,6)))||
    (first.length>=12&&first.toString('ascii',4,12)==='ftypavif');
}
export async function inspectRemoteMedia(url,fetcher=fetch){
  // Verify host independently of any external response or ledger data.
  const parsed=new URL(url);
  if(parsed.origin!==new URL(liveOrigin).origin||parsed.protocol!=='https:'||
    parsed.username||parsed.password)throw Error('Unsafe URL origin');
  let response;
  try{
    response=await fetcher(url,{
      redirect:'manual',cache:'no-store',
      headers:{'cache-control':'no-cache','accept':'image/webp,image/*;q=0.9,*/*;q=0.5'},
      signal:AbortSignal.timeout(15000)
    });
  }catch(error){
    return {url,ok:false,reason:'network_error',details:String(error).slice(0,120)};
  }
  if(response.status===404||response.status===410)
    return {url,ok:true,reason:'absent_http_'+response.status,httpStatus:response.status};
  if(response.status!==200)
    return {url,ok:false,reason:'unexpected_http_status',httpStatus:response.status};
  const type=(response.headers.get('content-type')||'').split(';')[0].toLowerCase().trim();
  let bytes;
  try{bytes=Buffer.from(await response.arrayBuffer());}
  catch(error){return {url,ok:false,reason:'response_read_error',details:String(error).slice(0,120)};}
  if(type.startsWith('image/')||imageSignature(bytes))
    return {url,ok:false,reason:'withdrawn_image_still_public',httpStatus:200,contentType:type,bytes:bytes.length};
  const preview=bytes.toString('utf8',0,Math.min(bytes.length,1024));
  if(type==='text/html'&&/<!doctype\s+html|<html[\s>]/i.test(preview))
    return {url,ok:true,reason:'non_image_html_fallback',httpStatus:200,contentType:type};
  return {url,ok:false,reason:'unverified_non_image_response',httpStatus:200,contentType:type};
}

export async function verifyRetiredPhotoUrls(records,fetcher=fetch){
  if(!Array.isArray(records))throw Error('Retirement records must be an array');
  if(!records.length)return {status:'not_applicable',verified:false,checked:0,failures:0,results:[]};
  const ids=new Set(),tasks=[],results=[];
  for(const record of records){
    if(ids.has(record.id))throw Error('Duplicate retired watch ID');
    ids.add(record.id);
    for(const url of plannedLiveUrls(record))tasks.push({id:record.id,url});
  }
  // Bound network concurrency: responsive CDN checks should remain cheap.
  for(let offset=0;offset<tasks.length;offset+=4){
    const batch=await Promise.all(tasks.slice(offset,offset+4).map(async task=>({
      ...await inspectRemoteMedia(task.url,fetcher),id:task.id
    })));
    results.push(...batch);
  }
  const failures=results.filter(x=>!x.ok).length;
  return {status:failures?'failed':'passed',verified:!failures,
    checked:results.length,failures,results};
}

function loadVerifiedSource(){
  const root=resolve(import.meta.dirname,'..');
  const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
  const ledger=read('site/photo-takedowns.json');
  const core=read('site/selection-affiliation.json').products;
  const extras=read('site/selection-populaires.json').products;
  const rights=read('site/popular-photo-rights.json').photos;
  if(ledger.version!==1||!Array.isArray(ledger.retired))
    throw Error('Invalid local permanent retirement ledger');
  for(const row of ledger.retired){
    plannedLiveUrls(row);
    const product=(row.kind==='core'?core:extras).find(p=>p.id===row.id);
    if(!product)throw Error('Missing retired catalogue entry: '+row.id);
    if(row.kind==='core'&&product.photoReview?.publicUsageApproved!==false)
      throw Error('A retired core photo is still approved: '+row.id);
    if(row.kind==='supplemental'&&(!product.photoPublicationBlocked||rights[row.id]))
      throw Error('Supplemental retired photo re-approved or not blocked: '+row.id);
    for(const file of row.media)
      if(existsSync(join(root,file)))throw Error('Retired image still present in local source: '+file);
  }
  return ledger.retired;
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length>1||args.some(x=>x!=='--json'))throw Error('Usage: [--json]');
  const records=loadVerifiedSource();
  const report=await verifyRetiredPhotoUrls(records);
  if(args.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
    console.log('Retired-photo live verification: '+report.status+' ('+
      report.checked+' URLs checked, '+report.failures+' failures)');
    for(const row of report.results.filter(x=>!x.ok))
      console.error('STILL AVAILABLE / UNVERIFIED: '+row.url+' — '+row.reason);
  }
  if(report.failures)process.exitCode=1;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main();
