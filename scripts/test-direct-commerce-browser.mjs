import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// CI-only browser contract: no direct-sale offer, payment or merchant account
// is created by this test. Synthetic API output never leaves localhost.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(!['localhost','127.0.0.1'].includes(base.hostname)||base.protocol!=='http:')
  throw Error('Prelaunch browser test is localhost-only');
const browser=await chromium.launch({headless:true});
const url=new URL('acheter.html',base).href;
const errors=[];
try{
  // Customers without scripts must be able to explore watches, never pay.
  for(const width of [360,1280]){
    const page=await browser.newPage({
      javaScriptEnabled:false,
      viewport:{width,height:850},locale:'fr-FR'
    });
    await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#amDirectCommerce').isVisible(),false,
      'Unverified payment section must not be displayed to customers');
    assert.equal(await page.locator('#amDirectForm').isVisible(),false);
    assert.equal(await page.locator('#amPartnerSelection').isVisible(),true,
      'Partner selection must be available without scripts');
    assert.equal(await page.locator('.am-direct-discovery-card').count(),3);
    await page.close();
  }

  const page=await browser.newPage({
    viewport:{width:393,height:850},locale:'fr-FR'
  });
  page.on('pageerror',error=>errors.push(error.message));
  // Malformed/offline config must retain the editorial experience.
  await page.route('**/config.json',route=>route.abort('failed'));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.getElementById('amDirectStatus')?.textContent.includes('ne peut pas être vérifiée')
  );
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),false);
  assert.equal(await page.locator('#amPartnerSelection').isVisible(),true);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false);
  await page.unroute('**/config.json');

  // CI fake storefront gate: exercise the future valid state but NEVER submit
  // to a provider, create an order or modify a live production setting.
  await page.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'active',
      commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'})
  }));
  await page.route('https://atelier-montres-commerce-api.onrender.com/api/offers',
    route=>route.fulfill({
      status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':base.origin},
      body:JSON.stringify({checkoutEnabled:true,offers:[{
        id:'ci-watch-only',label:'Montre CI non commercialisée',
        amountCents:9990,deliveryMinDays:7,deliveryMaxDays:14
      }]})
    }));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#amDirectForm').waitFor({state:'visible'});
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),true);
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),false);
  assert.match(await page.locator('#amDirectPrice').innerText(),/99,90/);
  assert.equal(await page.locator('#amDirectOffers option').count(),1);
  const layout=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(layout.scroll<=layout.width+2,
    'mobile checkout overflow: '+JSON.stringify(layout));
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('Purchase page OK: scripts disabled, API offline, mobile CSS, synthetic eligible purchase gate; no payments');
}finally{
  await browser.close();
}
