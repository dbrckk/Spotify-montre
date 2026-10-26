import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../site/selection-affiliation.json',import.meta.url),'utf8'));
const timeout=ms=>AbortSignal.timeout(ms);
const test=async p=>{
 const u=p.photoReview.url;
 try{
  const res=await fetch(u,{signal:timeout(12000),headers:{'user-agent':'Mozilla/5.0 (compatible; AtelierMontresImageCheck/1.0)','accept':'image/avif,image/webp,image/png,image/jpeg,*/*'}});
  const ct=res.headers.get('content-type')||'';
  const bytes=Number(res.headers.get('content-length')||0);
  const valid=res.ok&&ct.startsWith('image/');
  return {id:p.id,status:res.status,contentType:ct,bytes,valid};
 }catch(e){return {id:p.id,valid:false,error:String(e.message).slice(0,160)}}
};
const results=await Promise.all(data.products.map(test));
for(const x of results)console.log(JSON.stringify(x));
console.log('IMAGE_AUDIT_SUMMARY '+JSON.stringify({total:results.length,valid:results.filter(x=>x.valid).length,invalid:results.filter(x=>!x.valid).map(x=>x.id)}));
