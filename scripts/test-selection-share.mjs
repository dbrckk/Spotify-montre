import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{
  window.__watchShare=null;
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__watchShare=data}});
});
try{
  const url=new URL('/affiliation.html',base);
  url.searchParams.set('tier','prestige');
  url.searchParams.set('brand','Tissot');
  url.searchParams.set('movement','automatic');
  url.searchParams.set('diameter','medium');
  url.searchParams.set('q','PRX');
  url.searchParams.set('sort','name');
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#affBrand')?.options.length>1,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#affGrid .aff-card')?.textContent.includes('PRX'),{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#affBrand')?.value==='Tissot',{timeout:10000});
  assert.equal(await page.locator('#affGrid .aff-card').count(),1,'One Tissot PRX automatic model');
  assert.equal(await page.locator('#affBrand').inputValue(),'Tissot');
  assert.equal(await page.locator('#affReset').isVisible(),true,'Clear-all button should remain visible with active filters and matching results');
  assert.match(await page.locator('#affBrand option[value="Tissot"]').textContent(),/Tissot \(2\)/,'Brand filter shows accurate catalogue counts');
  assert.equal(await page.locator('#affMovement').inputValue(),'automatic');
  assert.equal(await page.locator('#affDiameter').inputValue(),'medium','Manufacturer-sourced diameter filter must be restored');
  assert.equal(await page.locator('#affSearch').inputValue(),'PRX');
  assert.equal(await page.locator('#affSort').inputValue(),'name');
  assert.equal(await page.locator('[data-tier="prestige"]').getAttribute('aria-pressed'),'true');
  await page.locator('.am-share-selection button').click();
  const shared=await page.evaluate(()=>window.__watchShare);
  assert.ok(shared?.url,'Native share must receive a URL');
  const returned=new URL(shared.url);
  for(const [key,val] of [['tier','prestige'],['brand','Tissot'],['movement','automatic'],['diameter','medium'],['q','PRX'],['sort','name']])assert.equal(returned.searchParams.get(key),val);
  assert.equal(returned.hash,'#montres');
  await page.goto(shared.url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#affGrid .aff-card')?.textContent.includes('PRX'),{timeout:20000});
  assert.equal(await page.locator('#affGrid .aff-card').count(),1,'Shared link restores a filtered collection');
  assert.equal(await page.locator('#affDiameter').inputValue(),'medium','Shared diameter filter must survive reload');
  // Navigate from search results to one watch and then to a related watch.
  // All public filters are carried in an allowlisted relative return context.
  const watchLink=page.locator('#affGrid .aff-card .aff-card-actions a[href^="./montre.html?id="]');
  const detailUrl=new URL(await watchLink.getAttribute('href'),page.url());
  const from=new URLSearchParams(detailUrl.searchParams.get('from'));
  for(const [key,value] of [['tier','prestige'],['brand','Tissot'],['movement','automatic'],['diameter','medium'],['q','PRX'],['sort','name']])
    assert.equal(from.get(key),value,'Product link must retain the '+key+' selection criterion');
  await watchLink.click();
  await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  const back=page.locator('#detailBackToResults');
  assert.match(await back.innerText(),/Retour à ma sélection/,'Product must offer an explicit return link');
  const backTarget=new URL(await back.getAttribute('href'),page.url());
  for(const [key,value] of from)
    assert.equal(backTarget.searchParams.get(key),value,'Return URL must preserve '+key);
  assert.equal(backTarget.hash,'#montres');
  const comparison=new URL(await page.locator('#detailCompare').getAttribute('href'),page.url());
  assert.ok(comparison.searchParams.get('compare')?.includes('tissot-prx-auto'),'Compare action keeps current model');
  assert.equal(comparison.searchParams.get('diameter'),'medium','Comparing must not discard the size filter');
  await page.locator('#detailShare').click();
  const sharedProduct=await page.evaluate(()=>window.__watchShare);
  assert.equal(new URL(sharedProduct.url).searchParams.has('from'),false,'A product shared outside the session must have a clean, canonical URL');
  assert.equal(new URL(sharedProduct.url).searchParams.get('id'),'tissot-prx-auto');
  const related=page.locator('#detailRelatedGrid .detail-related-card').first();
  await related.click();
  await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  assert.match(await page.locator('#detailBackToResults').innerText(),/Retour à ma sélection/,'Related model still remembers original catalogue filters');
  await page.locator('#detailBackToResults').click();
  await page.waitForFunction(()=>document.querySelector('#affBrand')?.value==='Tissot',{timeout:20000});
  assert.equal(await page.locator('#affGrid .aff-card').count(),1,'Returning from related product must recover original result');
  assert.equal(await page.locator('#affSearch').inputValue(),'PRX');
  assert.equal(await page.locator('#affDiameter').inputValue(),'medium');
  assert.equal(await page.locator('#affSort').inputValue(),'name');
  await page.locator('.am-filter-chip[aria-label="Supprimer le filtre Tissot"]').click();
  assert.equal(await page.locator('#affBrand').inputValue(),'all','One filter chip clears just that brand');
  assert.equal(await page.locator('#affMovement').inputValue(),'automatic','Other filters survive chip reset');
  await page.locator('#affReset').click();
  assert.equal(await page.locator('#affGrid .aff-card').count(),15,'Reset restores all 15 watches');
  assert.equal(await page.locator('#affReset').isVisible(),false,'Reset button hides only after all filters are cleared');
  assert.deepEqual(errors,[],'No browser runtime exceptions');
  console.log('PASS SELECTION JOURNEY: Android restores six URL criteria through exact product, related model, comparison link and canonical sharing');

  // A legacy concept-gallery bookmark must visibly lead to the 52 real
  // products, not to a hidden newsletter or a fake sale. Test on Android
  // with scripts disabled so navigation never depends on enhancement.
  for(const width of [320,393]){
    const staticPage=await browser.newPage({
      viewport:{width,height:812},isMobile:true,hasTouch:true,
      javaScriptEnabled:false,locale:'fr-FR'
    });
    try{
      const response=await staticPage.goto(new URL('/selection.html',base).href,
        {waitUntil:'load',timeout:30000});
      assert.ok(response?.ok(),'Concept landing page must be reachable');
      assert.match(await staticPage.locator('h1').innerText(),/Choisissez/i);
      assert.match(await staticPage.locator('noscript').innerText(),
        /52 références publiées/i,'No-JS visitors need a working route');
      assert.equal(await staticPage.locator('a[href="./index.html#newsletter"]').count(),0);
      const geometry=await staticPage.evaluate(()=>{
        const nav=document.querySelector('.navigation');
        return {
          width:document.documentElement.clientWidth,
          scroll:document.documentElement.scrollWidth,
          navOverflow:getComputedStyle(nav).overflowX,
          heights:[...nav.querySelectorAll('a')].map(x=>Math.round(x.getBoundingClientRect().height))
        };
      });
      assert.ok(geometry.scroll<=geometry.width+2,
        'Concept landing overflow at '+width+': '+JSON.stringify(geometry));
      assert.equal(geometry.navOverflow,'auto');
      assert.ok(geometry.heights.every(h=>h>=44),'Navigation targets must reach 44px');
      await staticPage.locator('.selector-hero-actions a.button').click();
      await staticPage.waitForURL(/\/montres\/toutes-les-montres\.html$/,{timeout:20000});
      assert.equal(await staticPage.locator('#udGrid .ud-card').count(),52,
        'The actual indexed catalogue needs all 52 prerendered watch cards');
    }finally{await staticPage.close()}
  }
  // The six clearly marked CSS concepts remain interactive with JavaScript.
  const concepts=await browser.newPage({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await concepts.goto(new URL('/selection.html',base).href,
      {waitUntil:'domcontentloaded',timeout:30000});
    await concepts.locator('.sel-card').first().waitFor({state:'visible',timeout:10000});
    assert.equal(await concepts.locator('.sel-card').count(),6);
    assert.equal(await concepts.locator('.sel-card .sel-tag').count(),6);
    assert.match(await concepts.locator('.sel-card .sel-tag').first().innerText(),
      /CONCEPT NON COMMERCIALISÉ/);
    await concepts.locator('.sel-card .sel-save').first().click();
    assert.equal(await concepts.locator('#favCount').innerText(),'1');
  }finally{await concepts.close()}
  console.log('PASS CONCEPT SHOWROOM: 320/393px, no JavaScript, 52 real references, six clearly labeled concepts');
}finally{await browser.close()}
