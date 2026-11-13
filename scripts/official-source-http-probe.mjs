/**
 * Advisory, limited online health check for priority official product source URLs.
 *
 * A response code never proves that a manufacturer shows the exact variant,
 * or that any watch is in stock, for sale, shipped to France or remunerated.
 * External sites often block bots. Such responses are UNKNOWN, never broken.
 * No registries, product cards, evidence dates or checkout state are changed.
 */
import {isIP} from 'node:net';

export function safeOfficialUrl(value){
  if(typeof value!=='string'||value.length>2048)return null;
  try{
    const url=new URL(value);
    const host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password||url.port||
       url.hash||!host.includes('.')||isIP(host.replace(/^\[|\]$/g,''))||
       /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)||
       /[^a-z0-9.-]/.test(host))
      return null;
    return url;
  }catch{return null}
}
const outcomeForStatus=status=>{
  if(status===404||status===410)return 'source_http_not_found';
  if(status>=200&&status<300)return 'reachable_http';
  if(status===401||status===403||status===429)return 'restricted_or_rate_limited';
  if(status>=500)return 'temporary_http_error';
  return 'unverified_http';
};
async function checkOne(row,{fetchImpl,timeoutMs}){
  const initial=safeOfficialUrl(row.officialUrl);
  const basic={id:row.id,brand:row.brand,model:row.model,
    merchantPriority:row.merchantPriority,originalUrl:row.officialUrl,
    checkedUrl:null,httpStatus:null,redirects:0,outcome:'unverified_http'};
  if(!initial)return {...basic,outcome:'invalid_source_url'};
  let current=initial;
  for(let hop=0;hop<=2;hop++){
    let response;
    try{
      response=await fetchImpl(current.href,{
        method:'GET',redirect:'manual',
        signal:AbortSignal.timeout(timeoutMs),
        headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2'}
      });
      const status=response.status;
      const location=response.headers?.get?.('location');
      await response.body?.cancel?.().catch?.(()=>{});
      if([301,302,303,307,308].includes(status)){
        if(!location)return {...basic,checkedUrl:current.href,httpStatus:status,
          redirects:hop,outcome:'redirect_without_location'};
        let target;
        try{target=safeOfficialUrl(new URL(location,current.href).href)}catch{}
        // Do not follow arbitrary cross-host redirects into unknown networks.
        if(!target||target.hostname!==initial.hostname)
          return {...basic,checkedUrl:current.href,httpStatus:status,
            redirects:hop,outcome:'redirect_requires_manual_review'};
        if(hop===2)return {...basic,checkedUrl:current.href,httpStatus:status,
          redirects:hop,outcome:'redirect_limit'};
        current=target;
        continue;
      }
      return {...basic,checkedUrl:current.href,httpStatus:status,
        redirects:hop,outcome:outcomeForStatus(status)};
    }catch(error){
      return {...basic,checkedUrl:current.href,redirects:hop,
        outcome:error?.name==='TimeoutError'||error?.name==='AbortError'
          ?'network_timeout':'network_unknown'};
    }
  }
  return {...basic,outcome:'redirect_limit'};
}
/**
 * Priority-only sample of public manufacturer sources, not Amazon inventory.
 * Caller may inject a mock fetch for offline deterministic regression tests.
 */
export async function probeOfficialSources({rows,fetchImpl=fetch,
  maxRecords=10,concurrency=3,timeoutMs=6500}){
  if(!Array.isArray(rows)||rows.length===0||
     rows.some(p=>typeof p?.id!=='string'||!Number.isSafeInteger(p.merchantPriority)||
       typeof p.officialUrl!=='string')||
     !Number.isSafeInteger(maxRecords)||maxRecords<1||maxRecords>52||
     !Number.isSafeInteger(concurrency)||concurrency<1||concurrency>5||
     !Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000||
     typeof fetchImpl!=='function')
    throw Error('Invalid official source probe configuration');
  const selected=[...rows].sort((a,b)=>a.merchantPriority-b.merchantPriority||
    a.id.localeCompare(b.id,'fr')).slice(0,maxRecords);
  const results=new Array(selected.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,selected.length)},async()=>{
    while(next<selected.length){
      const i=next++;
      results[i]=await checkOne(selected[i],{fetchImpl,timeoutMs});
    }
  }));
  const counts={};
  for(const entry of results)counts[entry.outcome]=(counts[entry.outcome]||0)+1;
  return {schemaVersion:1,kind:'official-source-http-probe-not-stock-proof',
    checkedAt:new Date().toISOString(),sampleSize:results.length,
    totalCatalogRows:rows.length,counts,results,
    caveats:[
      'HTTP 2xx verifies only that an official page returned a successful HTTP response; it does not verify the watch model, price, seller, stock or delivery.',
      'HTTP 404/410 requires manual source-link review; it is not evidence of an unavailable product.',
      'Bot protection, timeouts, redirections and server failures are unknown or temporary, never automatic product removals.',
      'No Amazon ASIN links are probed and no research date, public listing, image or checkout setting is modified.'
    ]};
}
