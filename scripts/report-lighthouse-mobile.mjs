import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const cases=[{name:'Accueil',path:'artifacts/lighthouse-mobile-home.json'},{name:'Fiche Casio',path:'artifacts/lighthouse-mobile-product.json'}];
const keys={'first-contentful-paint':'FCP','largest-contentful-paint':'LCP','speed-index':'Speed Index','total-blocking-time':'TBT','cumulative-layout-shift':'CLS'};
const round=(value,digits)=>Number.isFinite(value)?Number(value.toFixed(digits)):'n/d';
const reports=[];
for(const entry of cases){
 const data=JSON.parse(readFileSync(entry.path,'utf8')),audits=data.audits||{};
 const measurements=Object.fromEntries(Object.entries(keys).map(([key,label])=>[label,round(audits[key]?.numericValue,key==='cumulative-layout-shift'?3:0)]));
 const suggestions=['render-blocking-resources','unused-css-rules','unused-javascript','uses-responsive-images','modern-image-formats','offscreen-images','unminified-css','unminified-javascript','font-display'].map(key=>({id:key,savingsMs:round(audits[key]?.details?.overallSavingsMs,0),savingsBytes:round(audits[key]?.details?.overallSavingsBytes,0),score:audits[key]?.score})).filter(x=>x.score!==undefined&&x.score!==null&&x.score<0.9);
 reports.push({name:entry.name,url:data.finalDisplayedUrl||data.finalUrl||data.requestedUrl,score:round((data.categories?.performance?.score||0)*100,0),measurements,suggestions,lcpElement:audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet||null});
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/lighthouse-mobile-summary.json',JSON.stringify({createdAt:new Date().toISOString(),reports},null,2)+'\n');
const lines=['### Lighthouse mobile — production','', '| Page | Score /100 | FCP (ms) | LCP (ms) | TBT (ms) | CLS |','|---|---:|---:|---:|---:|---:|'];
for(const r of reports)lines.push('| '+r.name+' | '+r.score+' | '+r.measurements.FCP+' | '+r.measurements.LCP+' | '+r.measurements.TBT+' | '+r.measurements.CLS+' |');
lines.push('');
for(const r of reports){lines.push('**'+r.name+' : pistes techniques**');for(const s of r.suggestions)lines.push('- '+s.id+' : gains potentiels '+s.savingsMs+' ms, '+s.savingsBytes+' octets');if(!r.suggestions.length)lines.push('- Aucune opportunité dans les catégories ciblées.');lines.push('');}
lines.push('Mesures de laboratoire seulement : TBT est un proxy de réactivité, pas l’INP réel des visiteurs. Pour l’INP de terrain, utiliser CrUX/Search Console.');
const summary=lines.join('\n')+'\n';
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
console.log(summary);
