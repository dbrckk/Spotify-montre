import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const sites=[
 {name:'Accueil',files:[1,2,3].map(n=>'artifacts/lighthouse-mobile-home-'+n+'.json')},
 {name:'Fiche Casio',files:['artifacts/lighthouse-mobile-product.json']}
];
const keys={'first-contentful-paint':'FCP','largest-contentful-paint':'LCP','speed-index':'Speed Index','total-blocking-time':'TBT','cumulative-layout-shift':'CLS'};
const median=(numbers)=>{const sorted=numbers.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:null;};
const round=(value,digits)=>Number.isFinite(value)?Number(value.toFixed(digits)):'n/d';
const reports=[];
for(const site of sites){
 const runs=site.files.map(path=>{
  const data=JSON.parse(readFileSync(path,'utf8')),audits=data.audits||{};
  const numbers=Object.fromEntries(Object.entries(keys).map(([id,label])=>[label,audits[id]?.numericValue]));
  const summary=(audits['resource-summary']?.details?.items||[]).find(x=>x.resourceType==='image');
  const requests=audits['network-requests']?.details?.items||[];
  const thumbRequests=requests.filter(x=>x.url?.includes('/assets/watch-thumbs/'));
  const suggestion=audits['uses-responsive-images'];
  return {score:(data.categories?.performance?.score||0)*100,
   measurements:numbers,imagesTransferred:summary?.transferSize??null,
   thumbCount:thumbRequests.length,
   responsiveImageWaste:suggestion?.details?.overallSavingsBytes??null,
   url:data.finalDisplayedUrl||data.finalUrl||data.requestedUrl,
   // Raw run data is saved as an artifact for independent inspection.
   lighthouseVersion:data.lighthouseVersion
  };
 });
 const measurements=Object.fromEntries(Object.values(keys).map(label=>[label,round(median(runs.map(r=>r.measurements[label])),label==='CLS'?3:0)]));
 reports.push({name:site.name,runCount:runs.length,score:round(median(runs.map(r=>r.score)),0),
   measurements,imagesTransferred:round(median(runs.map(r=>r.imagesTransferred)),0),
   responsiveImageWaste:round(median(runs.map(r=>r.responsiveImageWaste)),0),
   thumbCount:median(runs.map(r=>r.thumbCount)),runs});
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/lighthouse-mobile-summary.json',JSON.stringify({createdAt:new Date().toISOString(),method:'Median for repeated mobile home runs; simulated Lighthouse laboratory, not field Core Web Vitals',reports},null,2)+'\n');
const lines=['### Lighthouse mobile — production (médianes)','',
 '| Page | Passages | Score /100 | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Images (octets) |',
 '|---|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of reports)lines.push('| '+r.name+' | '+r.runCount+' | '+r.score+' | '+r.measurements.FCP+' | '+r.measurements.LCP+' | '+r.measurements.TBT+' | '+r.measurements.CLS+' | '+r.imagesTransferred+' |');
lines.push('');
for(const r of reports){
 lines.push('**'+r.name+'** : téléchargements de miniatures WebP vus par Lighthouse : '+r.thumbCount+' ; octets d’images redimensionnables encore estimés : '+r.responsiveImageWaste+'.','');
 lines.push('Scores par passage : '+r.runs.map(run=>round(run.score,0)).join(', ')+'.','');
}
lines.push('La médiane réduit la variabilité sans constituer une mesure terrain. L’INP réel et les métriques Core Web Vitals proviennent de CrUX/Search Console, pas du TBT Lighthouse.','');
const summary=lines.join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
console.log(summary);
