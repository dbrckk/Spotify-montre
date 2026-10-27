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
  url.searchParams.set('q','PRX');
  url.searchParams.set('sort','name');
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#affBrand')?.options.length>1,{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#affGrid .aff-card')?.textContent.includes('PRX'),{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('#affBrand')?.value==='Tissot',{timeout:10000});
  assert.equal(await page.locator('#affGrid .aff-card').count(),1,'One Tissot PRX automatic model');
  assert.equal(await page.locator('#affBrand').inputValue(),'Tissot');
  assert.equal(await page.locator('#affMovement').inputValue(),'automatic');
  assert.equal(await page.locator('#affSearch').inputValue(),'PRX');
  assert.equal(await page.locator('#affSort').inputValue(),'name');
  assert.equal(await page.locator('[data-tier="prestige"]').getAttribute('aria-pressed'),'true');
  await page.locator('.am-share-selection button').click();
  const shared=await page.evaluate(()=>window.__watchShare);
  assert.ok(shared?.url,'Native share must receive a URL');
  const returned=new URL(shared.url);
  for(const [key,val] of [['tier','prestige'],['brand','Tissot'],['movement','automatic'],['q','PRX'],['sort','name']])assert.equal(returned.searchParams.get(key),val);
  assert.equal(returned.hash,'#montres');
  await page.goto(shared.url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#affGrid .aff-card')?.textContent.includes('PRX'),{timeout:20000});
  assert.equal(await page.locator('#affGrid .aff-card').count(),1,'Shared link restores a filtered collection');
  await page.locator('.am-filter-chip[aria-label="Supprimer le filtre Tissot"]').click();
  assert.equal(await page.locator('#affBrand').inputValue(),'all','One filter chip clears just that brand');
  assert.equal(await page.locator('#affMovement').inputValue(),'automatic','Other filters survive chip reset');
  assert.deepEqual(errors,[],'No browser runtime exceptions');
  console.log('PASS SHARE: Android viewport, 5 restored URL filters, native share link, single filter reset');
}finally{await browser.close()}
