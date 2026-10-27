import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const url=(path)=>new URL(path,base).href;
try{
  await page.goto(url('/affiliation.html'),{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#affGrid .aff-card').first().waitFor({state:'visible',timeout:25000});
  assert.equal(await page.locator('#affRecentlyViewed').isVisible(),false,'History starts private and empty');

  for(const model of ['citizen-tsuyosa','tissot-prx-auto','seiko-5']){
    await page.goto(url('/montre.html?id='+model),{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#detailShell').waitFor({state:'visible',timeout:25000});
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('atelier-montres-recent-v1'))),['seiko-5','tissot-prx-auto','citizen-tsuyosa']);
  await page.goto(url('/affiliation.html'),{waitUntil:'domcontentloaded',timeout:30000});
  const rail=page.locator('#affRecentlyViewed');
  await rail.waitFor({state:'visible',timeout:25000});
  const items=rail.locator('.am-recent-card');
  assert.equal(await items.count(),3,'Three recently opened models are shown');
  assert.ok((await items.first().getAttribute('href')).includes('seiko-5'),'Most recent comes first');
  const thumbnail=items.first().locator('img');
  await thumbnail.evaluate(img=>img.decode());
  assert.ok((await thumbnail.evaluate(img=>img.naturalWidth))>=240,'History shows genuine local watch image');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  assert.equal(overflow,false,'History rail does not introduce mobile horizontal overflow');

  await rail.locator('#affRecentlyClear').click();
  assert.equal(await rail.isVisible(),false,'History can be cleared without reloading');
  assert.equal(await page.evaluate(()=>localStorage.getItem('atelier-montres-recent-v1')),null,'Clear removes browser storage');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#affGrid .aff-card').first().waitFor({state:'visible',timeout:25000});
  assert.equal(await rail.isVisible(),false,'Cleared history stays empty after reload');
  assert.deepEqual(errors,[],'No uncaught browser JavaScript errors');
  console.log('PASS RECENT: real local photos, recency order, private persistence, mobile width and one-tap clear');
}finally{await browser.close()}
