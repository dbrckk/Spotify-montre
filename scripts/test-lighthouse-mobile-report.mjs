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
  ['lighthouse-mobile-no-photo.json',fixture('/montres/casio-f91w-1.html')]
];
const write=(name,report)=>writeFileSync(join(folder,name),JSON.stringify(report));
const run=()=>spawnSync(process.execPath,[script],{cwd:dir,encoding:'utf8'});
try{
  for(const args of cases)write(...args);
  let result=run();
  assert.equal(result.status,0,result.stderr||result.stdout);
  let summary=JSON.parse(readFileSync(join(folder,'lighthouse-mobile-summary.json'),'utf8'));
  assert.deepEqual(summary.reports.map(x=>x.name),[
    'Accueil','Catalogue 52 montres','Fiche Casio','Fiche SKMEI avec photo','Fiche Casio sans photo']);
  assert.equal(summary.reports[3].responsiveCount,1);
  assert.equal(summary.reports[4].imagesTransferred,0);

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
  let wrong=structuredClone(cases[6][1]);
  wrong.audits['network-requests'].details.items.push({
    url:host+'/assets/popular-responsive/skmei-1251-240.webp',resourceType:'Image',transferSize:2000});
  write(cases[6][0],wrong);
  assert.notEqual(run().status,0,'Invented photo on no-photo page must fail');
  write(...cases[6]);
  let shift=structuredClone(cases[5][1]);
  shift.audits['cumulative-layout-shift'].numericValue=0.45;
  write(cases[5][0],shift);
  result=run();
  assert.notEqual(result.status,0,'CLS regression must fail');
  assert.match(result.stderr,/CLS/);
  console.log('PASS: 5 Lighthouse pages, photographic evidence, no-photo route, CLS guard');
}finally{rmSync(dir,{recursive:true,force:true});}
