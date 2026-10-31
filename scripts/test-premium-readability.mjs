import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const url=new URL(base);
assert.ok(url.protocol==='https:'||(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)));
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts',{recursive:true});
try{
  for(const width of [360,393,430,768]){
    const page=await browser.newPage({viewport:{width,height:852},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,locale:'fr-FR'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('/',base).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('#affGrid .aff-card',{timeout:25000});
    await page.locator('#affViewGallery').click();
    await page.waitForFunction(()=>document.querySelector('#affGrid')?.dataset.view==='gallery');
    const measured=await page.evaluate(()=>{
      const css=s=>getComputedStyle(document.querySelector(s));
      const size=s=>parseFloat(css(s).fontSize);
      const bounds=s=>Math.round(document.querySelector(s).getBoundingClientRect().height);
      const body=document.documentElement;
      return {
        scroll:body.scrollWidth,client:body.clientWidth,
        galleryColumns:css('#affGrid').gridTemplateColumns.split(' ').filter(Boolean).length,
        brand:size('#affGrid .aff-card-brand'),
        title:size('#affGrid .aff-card h3'),
        facts:size('#affGrid .am-gallery-facts span'),
        cta:size('#affGrid .aff-card-actions a'),
        affiliateNote:size('#affGrid .am-affiliate-note'),
        productLink:size('#affGrid .am-card-seo-link'),
        filter:size('#affTabs button'),
        filterHeight:bounds('#affTabs button'),
        searchHeight:bounds('#affSearch'),
        linkInHead:!!document.querySelector('link[href="./premium-system.css"]'),
        allPhotos:document.querySelectorAll('#affGrid .aff-product-photo').length
      };
    });
    assert.ok(measured.linkInHead,'CSS absent at '+width);
    assert.ok(measured.scroll<=measured.client+2,'Horizontal overflow '+width+': '+JSON.stringify(measured));
    assert.ok(measured.brand>=13&&measured.title>=18&&measured.facts>=13&&measured.cta>=14&&measured.affiliateNote>=13&&measured.productLink>=13,'Unreadable product text '+width+': '+JSON.stringify(measured));
    assert.ok(measured.filter>=13&&measured.filterHeight>=44&&measured.searchHeight>=44,'Undersized touch control '+width+': '+JSON.stringify(measured));
    if(width>=360&&width<=430)assert.equal(measured.galleryColumns,2,'Keep two columns on phone '+width);
    assert.ok(measured.allPhotos>=10,'Real photos remain visible '+width);
    await page.locator('#montres').scrollIntoViewIfNeeded();
    await page.screenshot({path:'artifacts/premium-readability-'+width+'.png',fullPage:true});
    assert.deepEqual(errors,[],'JS errors at '+width);
    console.log('Premium catalogue OK '+width+'px '+JSON.stringify(measured));
    await page.close();
  }
  for(const path of ['/montres/citizen-tsuyosa.html','/conseiller.html','/montre.html?id=citizen-tsuyosa']){
    const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
    await page.goto(new URL(path,base).href,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('link[href$="premium-system.css"]',{state:'attached'});
    const state=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,loaded:[...document.styleSheets].some(sheet=>sheet.href?.includes('/premium-system.css'))}));
    assert.ok(state.loaded,'Shared stylesheet missing from '+path);
    assert.ok(state.scroll<=state.client+2,'Overflow on '+path);
    await page.screenshot({path:'artifacts/premium-page-'+path.replace(/[^a-z0-9]+/gi,'-')+'.png',fullPage:true});
    await page.close();
  }
  console.log('Premium responsive design checks OK');
} finally {await browser.close()}
