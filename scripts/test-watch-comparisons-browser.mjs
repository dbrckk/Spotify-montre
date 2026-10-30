import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const catalogue=JSON.parse(readFileSync('site/selection-affiliation.json','utf8')).products;
const pairs=JSON.parse(readFileSync('site/comparaisons-montres.json','utf8')).comparisons;
assert.equal(pairs.length,4);
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const checkWidth=async(page,name)=>{
  const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.client+2,name+' horizontal overflow '+JSON.stringify(size));
};
try{
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  page.on('pageerror',e=>errors.push('mobile: '+e.message));
  const home=await page.goto(new URL('/',origin).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(home?.ok(),'Built homepage should be available');
  await page.locator('#comparaisons').waitFor({state:'visible'});
  assert.equal(await page.locator('#comparaisons .seo-guide-grid article').count(),4,'Four comparison choices');
  await checkWidth(page,'Homepage');
  for(const pair of pairs){
    const url=new URL('/montres/comparer-'+pair.slug+'.html',origin);
    const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response?.status(),200,'Direct comparison URL '+pair.slug);
    await page.locator('.headtohead-watch').first().waitFor({state:'visible'});
    assert.equal(await page.locator('.headtohead-watch').count(),2);
    const left=catalogue.find(p=>p.id===pair.left),right=catalogue.find(p=>p.id===pair.right);
    assert.ok((await page.locator('h1').innerText()).includes(pair.title));
    assert.equal(await page.locator('.headtohead-watch svg.am-watch-svg').count(),2,'Original SVG art, not unlicensed photos');
    assert.equal(await page.locator('img[src*="assets/watches/"]').count(),0,'No manufacturer images');
    assert.equal(await page.locator('.headtohead-watch .primary').count(),2,'Two official product destinations');
    assert.equal(await page.locator('.headtohead-watch .secondary').count(),[pair.left,pair.right].filter(id=>!['citizen-eco','tissot-prx-auto'].includes(id)).length,'Only matched Amazon links');
    for(const [i,p] of [left,right].entries()){
      assert.ok(await page.locator('.headtohead-watch').nth(i).locator('h2').innerText().then(t=>t.includes(p.model)));
      const link=page.locator('.headtohead-watch').nth(i).locator('.primary');
      assert.equal(await link.getAttribute('href'),p.officialUrl,'Exact official manufacturer destination');
    }
    const table=page.locator('.headtohead-evidence .spec-matrix');
    assert.equal(await table.locator('tbody tr').count(),4,'Four true catalogue attributes');
    const canonical=new URL(await page.locator('link[rel="canonical"]').getAttribute('href'));
    assert.equal(canonical.pathname,url.pathname,'Each comparison canonical must reference the same static path');
    assert.equal(canonical.origin,'https://atelier-montres-selection-fr.onrender.com','SEO canonical targets the public HTTPS domain, not the local test server');
    await checkWidth(page,pair.slug);
    if(pair.slug==='tissot-prx-quartz-vs-powermatic-80')
      await page.screenshot({path:'artifacts/mobile-watch-pair-prx.png',fullPage:true});
    const linkToProduct=page.locator('.headtohead-watch').first().locator('.headtohead-watch-evidence a');
    assert.ok((await linkToProduct.getAttribute('href')).endsWith('/'+left.id+'.html'));
    await linkToProduct.click();
    assert.equal(await page.locator('h1').count(),1);
    assert.ok(await page.locator('a[href="./comparer-'+pair.slug+'.html"]').count()>=1,'Product page cross-links to its comparison');
  }
  await page.close();
  const desktop=await browser.newPage({viewport:{width:1366,height:900},locale:'fr-FR'});
  desktop.on('pageerror',e=>errors.push('desktop: '+e.message));
  const response=await desktop.goto(new URL('/montres/comparer-orient-bambino-38-vs-hamilton-khaki-field.html',origin).href,{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  assert.equal(await desktop.locator('.headtohead-watch').count(),2);
  await checkWidth(desktop,'Desktop comparison');
  await desktop.screenshot({path:'artifacts/desktop-watch-pair-orient-hamilton.png',fullPage:true});
  await desktop.close();
  assert.deepEqual(errors,[],'No unhandled browser errors');
  console.log('PASS: 4 actual mobile head-to-head pages, verified links, vector images, SEO deep links and desktop layout');
}finally{
  await browser.close();
}
