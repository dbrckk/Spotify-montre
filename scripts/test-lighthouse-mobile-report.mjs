import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Offline contract: verify all Lighthouse routes and guards without Chrome.
const script=resolve('scripts/report-lighthouse-mobile.mjs');
const dir=mkdtempSync(join(tmpdir(),'watch-lighthouse-'));
const folder=join(dir,'artifacts');mkdirSync(folder);
const host='https://atelier-montres-selection-fr.onrender.com';
const fixture=(path,photo=false)=>{
  const url=host+path;
  const requests=[{url,resourceType:'Document',transferSize:2500}];
  if(photo)requests.push({url:host+'/assets/popular-responsive/skmei-1251-480.webp',
    resourceType:'Image',transferSize:14000});
  return {requestedUrl:url,finalDisplayedUrl:url,lighthouseVersion:'12-fixture',
    categories:{performance:{score:0.95}},audits:{
      'first-contentful-paint':{numericValue:900},
      'largest-contentful-paint':{numericValue:1300},
      'speed-index':{numericValue:1100},
      'total-blocking-time':{numericValue:0},
      'cumulative-layout-shift':{numericValue:0},
      'resource-summary':{details:{items:[{resourceType:'image',transferSize:photo?14000:0}]}},
      'network-requests':{details:{items:requests}}
    }};
};
const cases=[
  ...[1,2,3].map(n=>['lighthouse-mobile-home-'+n+'.json',fixture('/')]),
  ['lighthouse-mobile-catalogue.json',fixture('/montres/toutes-les-montres.html')],
  ['lighthouse-mobile-product.json',fixture('/montres/casio-mtp-1302.html')],
  ['lighthouse-mobile-studio-photo.json',fixture('/montres/skmei-1251.html',true)],
  ['lighthouse-mobile-no-photo.json',fixture('/montres/casio-f91w-1.html')],
  ['lighthouse-mobile-curated-femme.json',fixture('/montres/montres-femme-accessibles.html',true)]
];
const write=(name,report)=>writeFileSync(join(folder,name),JSON.stringify(report));
const run=()=>spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
try{
  for(const args of cases)write(...args);
  let result=run();
  assert.equal(result.status,0,result.stderr||result.stdout);
  let summary=JSON.parse(readFileSync(join(folder,'lighthouse-mobile-summary.json'),'utf8'));
  assert.deepEqual(summary.reports.map(x=>x.name),[
    'Accueil','Catalogue 52 montres','Fiche Casio','Fiche SKMEI avec photo',
    'Fiche Casio sans photo','Sélection femme — photos responsives']);
  assert.equal(summary.reports[3].responsiveCount,1);
  assert.equal(summary.reports[4].imagesTransferred,0);
  assert.equal(summary.reports[5].imagesTransferred,14000);
  // The new curated page must be measured at its real URL, not another
  // collection or a stale redirect. Test its independent image-byte ceiling.
  const otherPage=structuredClone(cases[7][1]);
  otherPage.finalDisplayedUrl=host+'/montres/montres-homme-style-accessible.html';
  write(cases[7][0],otherPage);
  assert.notEqual(run().status,0,'A different curated route must not pass the mobile audit');
  write(...cases[7]);
  const bloated=structuredClone(cases[7][1]);
  bloated.audits['resource-summary'].details.items[0].transferSize=350000;
  write(cases[7][0],bloated);
  const huge=run();
  assert.notEqual(huge.status,0,'A 350 KB editorial image transfer must breach the photo budget');
  assert.match(huge.stderr,/image bytes/);
  write(...cases[7]);

  // A high-DPI browser legitimately selects the original verified WebP.
  const hdpi=structuredClone(cases[5][1]);
  hdpi.audits['network-requests'].details.items=
    hdpi.audits['network-requests'].details.items.map(item=>
      item.resourceType==='Image'?{
        ...item,url:host+'/assets/watches-popular/skmei-1251.webp'
      }:item);
  write(cases[5][0],hdpi);
  assert.equal(run().status,0,'Verified full-resolution image must pass on high-DPI screens');
  write(...cases[5]);
  const mismatched=structuredClone(cases[5][1]);
  mismatched.audits['network-requests'].details.items=
    mismatched.audits['network-requests'].details.items.map(item=>
      item.resourceType==='Image'?{
        ...item,url:host+'/assets/watches-popular/skmei-1257.webp'
      }:item);
  write(cases[5][0],mismatched);
  assert.notEqual(run().status,0,'Another watch model must never pass as the verified photo');
  write(...cases[5]);

  let missing=structuredClone(cases[5][1]);
  missing.audits['network-requests'].details.items=
    missing.audits['network-requests'].details.items.filter(x=>x.resourceType!=='Image');
  write(cases[5][0],missing);
  assert.notEqual(run().status,0,'Missing real photo must fail');
  write(...cases[5]);
  // True photos on related-product cards are allowed on a no-photo page,
  // but fabricating an image of the unphotographed main model is prohibited.
  let related=structuredClone(cases[6][1]);
  related.audits['network-requests'].details.items.push({
    url:host+'/assets/popular-responsive/skmei-1251-240.webp',resourceType:'Image',transferSize:2000});
  write(cases[6][0],related);
  assert.equal(run().status,0,'Approved related-model image should be allowed');
  write(...cases[6]);
  let wrong=structuredClone(cases[6][1]);
  wrong.audits['network-requests'].details.items.push({
    url:host+'/assets/popular-responsive/casio-f91w-1-240.webp',resourceType:'Image',transferSize:2000});
  write(cases[6][0],wrong);
  assert.notEqual(run().status,0,'Invented F-91W photo on no-photo page must fail');
  write(...cases[6]);
  let shift=structuredClone(cases[5][1]);
  shift.audits['cumulative-layout-shift'].numericValue=0.45;
  write(cases[5][0],shift);
  result=run();
  assert.notEqual(result.status,0,'CLS regression must fail');
  assert.match(result.stderr,/CLS/);
  console.log('PASS: 6 Lighthouse pages, curated source photo budget, wrong route, no-photo and CLS guards');
}finally{rmSync(dir,{recursive:true,force:true});}
