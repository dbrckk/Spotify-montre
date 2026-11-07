import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
const sites=[
 {name:'Accueil',files:[1,2,3].map(n=>'artifacts/lighthouse-mobile-home-'+n+'.json')},
 {name:'Catalogue 52 montres',files:['artifacts/lighthouse-mobile-catalogue.json']},
 {name:'Fiche Casio',files:['artifacts/lighthouse-mobile-product.json']},
 {name:'Fiche SKMEI avec photo',files:['artifacts/lighthouse-mobile-studio-photo.json'],
  expectedPath:'/montres/skmei-1251.html',photoId:'skmei-1251'},
 {name:'Fiche Casio sans photo',files:['artifacts/lighthouse-mobile-no-photo.json'],
  expectedPath:'/montres/casio-f91w-1.html',forbidWatchImage:true}
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
  const imageAssetPaths=requests.map(x=>{
   try{return new URL(x.url).pathname;}catch{return null;}
  }).filter(x=>typeof x==='string');
  // Browsers on dense screens may choose the original exact-model image
  // rather than 240/480px derivatives. All three variants are trusted,
  // and the image-byte limit below still prevents heavy regressions.
  const exactPhotoFiles=site.photoId?[
   '/assets/watches-popular/'+site.photoId+'.webp',
   '/assets/popular-responsive/'+site.photoId+'-240.webp',
   '/assets/popular-responsive/'+site.photoId+'-480.webp'
  ]:[];
  const loadedPhotoPaths=imageAssetPaths.filter(x=>exactPhotoFiles.includes(x));
  if(site.expectedPath){
   const finalUrl=new URL(data.finalDisplayedUrl||data.finalUrl||data.requestedUrl);
   if(finalUrl.pathname!==site.expectedPath)
    throw Error(site.name+': Lighthouse measured the wrong route: '+finalUrl.pathname);
   if(site.photoId&&!loadedPhotoPaths.length)
    throw Error(site.name+': no verified model-exact image variant was fetched');
   if(site.forbidWatchImage&&imageAssetPaths.some(x=>x.startsWith('/assets/watches-popular/')||
      x.startsWith('/assets/popular-responsive/')))
    throw Error(site.name+': unsupported exact-model photograph was fetched');
  }
  const thumbRequests=requests.filter(x=>x.url?.includes('/assets/watch-thumbs/'));
  const responsiveRequests=requests.filter(x=>x.url?.includes('/assets/watch-responsive/')||x.url?.includes('/assets/popular-responsive/'));
  const firstParty=requests.filter(x=>{try{return new URL(x.url).origin===new URL(data.finalDisplayedUrl||data.finalUrl||data.requestedUrl).origin;}catch{return false;}});
  const transferredByType=Object.fromEntries(['Stylesheet','Script','Image','Document','Font'].map(type=>[type,firstParty.filter(x=>x.resourceType===type).reduce((sum,x)=>sum+(Number(x.transferSize)||0),0)]));
  const suggestion=audits['uses-responsive-images'];
  return {score:(data.categories?.performance?.score||0)*100,
   measurements:numbers,imagesTransferred:summary?.transferSize??null,
   thumbCount:thumbRequests.length,responsiveCount:responsiveRequests.length,
   requestCount:firstParty.length,transferredByType,
   responsiveImageWaste:suggestion?.details?.overallSavingsBytes??null,
   verifiedPhotoVariants:loadedPhotoPaths,
   url:data.finalDisplayedUrl||data.finalUrl||data.requestedUrl,
   // Raw run data is saved as an artifact for independent inspection.
   lighthouseVersion:data.lighthouseVersion
  };
 });
 const measurements=Object.fromEntries(Object.values(keys).map(label=>[label,round(median(runs.map(r=>r.measurements[label])),label==='CLS'?3:0)]));
 reports.push({name:site.name,runCount:runs.length,score:round(median(runs.map(r=>r.score)),0),
   measurements,imagesTransferred:round(median(runs.map(r=>r.imagesTransferred)),0),
   responsiveImageWaste:round(median(runs.map(r=>r.responsiveImageWaste)),0),
   thumbCount:median(runs.map(r=>r.thumbCount)),
   responsiveCount:median(runs.map(r=>r.responsiveCount)),
   requestCount:median(runs.map(r=>r.requestCount)),
   transferredByType:Object.fromEntries(['Stylesheet','Script','Image','Document','Font'].map(type=>[type,round(median(runs.map(r=>r.transferredByType[type])),0)])),runs});
}
// Guard against substantial regressions without pretending lab results are
// real-user Core Web Vitals. Home uses three-run medians; product is a smoke
// sample and remains informational until repeated measurements are available.
const budgets={
  // After budget-card mobile sizing: 56,633 image bytes (2026-11-07),
  // down from 101,302. 90 KB allows measurement noise but blocks regression.
  'Accueil':{scoreMin:85,lcpMax:3000,tbtMax:300,clsMax:0.15,imageBytesMax:90000},
  // Production baseline: 66,944 image bytes (2026-11-07). Allow headroom
  // for network variability while catching a return to 338 KB originals.
  'Catalogue 52 montres':{imageBytesMax:180000},
  // These are single-run guardrails, deliberately generous for lab noise.
  // The small verified WebP must stay inexpensive; a Casio with no photo
  // must not download an invented model image.
  'Fiche SKMEI avec photo':{scoreMin:75,lcpMax:4500,clsMax:0.2,imageBytesMax:160000},
  'Fiche Casio sans photo':{scoreMin:75,lcpMax:4500,clsMax:0.2,imageBytesMax:160000}
};
const violations=[];
for(const r of reports){
  const budget=budgets[r.name];
  if(!budget)continue;
  const checks=[
    ['score',r.score,budget.scoreMin,'min'],
    ['LCP',r.measurements.LCP,budget.lcpMax,'max'],
    ['TBT',r.measurements.TBT,budget.tbtMax,'max'],
    ['CLS',r.measurements.CLS,budget.clsMax,'max'],
    ['image bytes',r.imagesTransferred,budget.imageBytesMax,'max']
  ].filter(([, ,limit])=>Number.isFinite(limit));
  for(const [name,value,limit,direction] of checks){
    if(!Number.isFinite(value)){violations.push(r.name+': '+name+' measurement missing');continue;}
    if(direction==='min'?value<limit:value>limit)
      violations.push(r.name+': '+name+' '+value+' violates '+direction+' '+limit);
  }
}
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/lighthouse-mobile-summary.json',JSON.stringify({createdAt:new Date().toISOString(),method:'Median for repeated mobile home runs; simulated Lighthouse laboratory, not field Core Web Vitals',reports},null,2)+'\n');
const lines=['### Lighthouse mobile — production (médianes)','',
 '| Page | Passages | Score /100 | FCP (ms) | LCP (ms) | TBT (ms) | CLS | Images (octets) |',
 '|---|---:|---:|---:|---:|---:|---:|---:|'];
for(const r of reports)lines.push('| '+r.name+' | '+r.runCount+' | '+r.score+' | '+r.measurements.FCP+' | '+r.measurements.LCP+' | '+r.measurements.TBT+' | '+r.measurements.CLS+' | '+r.imagesTransferred+' |');
lines.push('');
for(const r of reports){
 lines.push('**'+r.name+'** : '+r.requestCount+' requêtes première partie ; transferts CSS '+r.transferredByType.Stylesheet+' o, JS '+r.transferredByType.Script+' o, images '+r.transferredByType.Image+' o.','');
 lines.push('Miniatures WebP téléchargées : '+r.thumbCount+' ; images adaptatives : '+r.responsiveCount+' ; octets d’images redimensionnables encore estimés : '+r.responsiveImageWaste+'.','');
 lines.push('Scores par passage : '+r.runs.map(run=>round(run.score,0)).join(', ')+'.','');
 if(r.runs.some(run=>run.verifiedPhotoVariants?.length))
  lines.push('Variantes photographiques exactes téléchargées : '+r.runs.flatMap(run=>run.verifiedPhotoVariants).join(', ')+'.','');
}
lines.push('Garde-fous accueil (médiane) : score ≥85, LCP ≤3000 ms, TBT ≤300 ms, CLS ≤0,15, images ≤90 Ko. Catalogue (un passage) : images ≤180 Ko. Fiches photo/sans photo (un passage) : score ≥75, LCP ≤4500 ms, CLS ≤0,2, images ≤160 Ko ; mesures laboratoire indicatives.','');
lines.push(violations.length?'Régressions détectées : '+violations.join(' ; '):'Aucune régression majeure détectée par les seuils Lighthouse.','');
lines.push('La médiane réduit la variabilité sans constituer une mesure terrain. L’INP réel et les métriques Core Web Vitals proviennent de CrUX/Search Console, pas du TBT Lighthouse.','');
const summary=lines.join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
console.log(summary);
if(violations.length){console.error('Lighthouse performance regression: '+violations.join(' | '));process.exitCode=1;}
