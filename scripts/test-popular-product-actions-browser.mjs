import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Local-only verification. Do not follow merchant links or invoke payments.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Supplemental product browser tests must run on localhost');
const picks=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
assert.equal(picks.length,37);
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.match(html,/src="\.\.\/extra-product-actions\.js"/);
  assert.ok(html.includes('data-extra-favorite="'+p.id+'"'));
  assert.ok(html.includes('data-extra-share="'+p.id+'"'));
  assert.ok(html.includes('href="./toutes-les-montres.html?saved=1"'));
}
const browser=await chromium.launch({headless:true});
try{
  for(const width of [360,393,1366]){
    const context=await browser.newContext({viewport:{width,height:870},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    await context.addInitScript(()=>{
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
        window.__lastSharedProduct=data;
      }});
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    const actions=page.locator('.am-extra-local-tools');
    await actions.waitFor({state:'visible'});
    const favorite=actions.locator('[data-extra-favorite]');
    const share=actions.locator('[data-extra-share]');
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.ok(await favorite.isVisible());
    assert.ok(await share.isVisible());
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),
      ['skmei-1251']);
    assert.match(await actions.locator('[data-extra-action-status]').innerText(),/enregistrée/);
    await share.click();
    const shared=await page.evaluate(()=>window.__lastSharedProduct);
    assert.equal(shared.url,new URL('/montres/skmei-1251.html',base).href);
    assert.match(shared.title,/SKMEI 1251/);
    assert.equal(new URL(shared.url).search,'');
    await actions.locator('.am-extra-saved-link').click();
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('#udSavedCount').innerText(),'1');
    assert.equal(await page.locator('.ud-card:visible').count(),1);
    assert.ok(await page.locator('#modele-skmei-1251').isVisible());
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    await actions.waitFor({state:'visible'});
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),[]);

    const dimension=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      width:document.documentElement.clientWidth
    }));
    assert.ok(dimension.scroll<=dimension.width+2,
      'Supplemental product action overflow: '+JSON.stringify(dimension));
    assert.deepEqual(errors,[]);
    await context.close();
  }

  const noScript=await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(new URL('/montres/skmei-1251.html',base).href);
  assert.equal(await noScript.locator('.am-extra-local-tools').isVisible(),false);
  assert.ok(await noScript.locator('.am-extra-actions a').count()>=1,
    'Manufacturer/merchant links remain available without JavaScript');
  await noScript.close();

  // Browser clipboard/share may both be unavailable or blocked. Users must
  // still be able to manually copy the full, model-specific URL.
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw Error('Clipboard permission denied')}
    }});
  });
  await fallback.goto(new URL('/montres/skmei-1251.html',base).href);
  await fallback.locator('[data-extra-share]').click();
  const field=fallback.locator('[data-extra-copy-link]');
  assert.ok(await field.isVisible());
  assert.equal(await field.inputValue(),new URL('/montres/skmei-1251.html',base).href);
  await fallback.close();
  console.log('PASS: 37 exact product pages have safe save/share, Android favorites sync, canonical sharing and no-JS merchant links');
}finally{
  await browser.close();
}
