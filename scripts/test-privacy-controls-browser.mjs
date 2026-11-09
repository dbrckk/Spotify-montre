import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Only local browser storage is tested. Never follow partner links, send
// requests to external services or contact the commerce API.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Privacy-controls browser QA is restricted to localhost');
const localKeys=[
  'atelier-montres-multibrand-favorites-v1',
  'atelier-montres-catalogue-view-v1',
  'atelier-montres-recent-v1',
  'atelier-montres-unified-recent-v1',
  'atelier-style-favs-v1',
  'atelier-custom-concepts-v1',
  'atelier-sourcing-shortlist-v1'
];
const sessionKeys=[
  'atelier-montres-comparison-v1',
  'atelier-montres-catalogue-return-v1'
];
const browser=await chromium.launch({headless:true});
try{
  for(const width of [320,393,1366]){
    const page=await browser.newPage({viewport:{width,height:852},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('/confidentialite.html',base).href,{waitUntil:'domcontentloaded'});
    await page.evaluate(({localKeys,sessionKeys})=>{
      for(const key of localKeys)localStorage.setItem(key,JSON.stringify(['test']));
      for(const key of sessionKeys)sessionStorage.setItem(key,JSON.stringify(['test']));
      // Never delete payments, an active order's follow-up token,
      // site-unrelated application data or unknown keys.
      localStorage.setItem('am_checkout_pending_v1_skmei-1251','c'.repeat(32));
      sessionStorage.setItem('am_checkout_key_skmei-1251','c'.repeat(32));
      sessionStorage.setItem('am_order_ord_'+'a'.repeat(40),'s'.repeat(40));
      localStorage.setItem('foreign-app-value','unrelated');
    },{localKeys,sessionKeys});
    await page.reload({waitUntil:'domcontentloaded'});
    const panel=page.locator('#amPrivacyControls');
    await panel.waitFor({state:'visible'});
    const count=page.locator('#amPrivacyCount');
    assert.match(await count.innerText(),/9 préférences enregistrées/);
    const checkbox=page.locator('#amPrivacyConfirm');
    const clear=page.locator('#amPrivacyDelete');
    assert.ok(await clear.isDisabled(),'No deletion before explicit customer choice');
    const rect=await clear.boundingBox();
    assert.ok(rect&&rect.height>=44&&rect.x>=-1&&rect.x+rect.width<=width+1,
      'Privacy action must fit Android/desktop viewport '+width);
    assert.ok((await page.locator('body').evaluate(el=>el.scrollWidth))<=width+2,
      'Privacy controls must not cause horizontal overflow at '+width);
    await checkbox.check();
    assert.ok(await clear.isEnabled());
    await clear.click();
    assert.match(await page.locator('#amPrivacyStatus').innerText(),/Préférences effacées/);
    assert.match(await count.innerText(),/0 préférence/);
    const state=await page.evaluate(({localKeys,sessionKeys})=>({
      deleted:localKeys.every(k=>localStorage.getItem(k)===null)
        &&sessionKeys.every(k=>sessionStorage.getItem(k)===null),
      checkoutLocal:localStorage.getItem('am_checkout_pending_v1_skmei-1251'),
      checkoutTab:sessionStorage.getItem('am_checkout_key_skmei-1251'),
      order:sessionStorage.getItem('am_order_ord_'+'a'.repeat(40)),
      unrelated:localStorage.getItem('foreign-app-value')
    }),{localKeys,sessionKeys});
    assert.ok(state.deleted,'Every documented personal preference must be removed');
    assert.equal(state.checkoutLocal,'c'.repeat(32));
    assert.equal(state.checkoutTab,'c'.repeat(32));
    assert.equal(state.order,'s'.repeat(40));
    assert.equal(state.unrelated,'unrelated');
    assert.ok(await clear.isDisabled(),'A second click must never erase anything unrelated');
    await page.reload({waitUntil:'domcontentloaded'});
    assert.match(await count.innerText(),/0 préférence/);
    assert.equal(errors.length,0,'No errors during browser-level privacy deletion: '+errors);
    await page.close();
  }
  const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:393,height:852}});
  await noJs.goto(new URL('/confidentialite.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await noJs.locator('#amPrivacyControls').isVisible(),false);
  assert.match(await noJs.locator('#amPrivacyFallback').innerText(),/paramètres du navigateur/);
  await noJs.close();
  console.log('PASS: browser preferences removed with explicit consent; payment/fulfillment tokens survive on 320/393/1366px and no-JS fallback');
}finally{await browser.close()}
