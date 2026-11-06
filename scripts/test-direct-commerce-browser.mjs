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
  assert.equal(await page.locator('#amDirectUnavailable').isVisible(),false);
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
      body:JSON.stringify({checkoutEnabled:true,offers:[
        {id:'ci-watch-only',label:'Montre CI non commercialisée',
          amountCents:9990,deliveryMinDays:7,deliveryMaxDays:14},
        {id:'citizen-tsuyosa',label:'Citizen Tsuyosa · référence de test',
          amountCents:17500,deliveryMinDays:7,deliveryMaxDays:14},
        {id:'casio-mdv107',label:'Casio MDV107 · référence de test',
          amountCents:7200,deliveryMinDays:7,deliveryMaxDays:14},
        {id:'skmei-1257',label:'SKMEI 1257 · référence de test',
          amountCents:2990,deliveryMinDays:7,deliveryMaxDays:14}
      ]})
    }));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#amDirectForm').waitFor({state:'visible'});
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),true);
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),false);
  assert.match(await page.locator('#amDirectPrice').innerText(),/99,90/);
  assert.equal(await page.locator('#amDirectOffers option').count(),4);
  assert.match(await page.locator('#amDirectHeading').innerText(),/Achetez votre montre chez Atelier Montres/);
  assert.equal(await page.locator('#amDirectUnavailable').isVisible(),false);
  const layout=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(layout.scroll<=layout.width+2,
    'mobile checkout overflow: '+JSON.stringify(layout));
  // A link for an unavailable watch must NEVER silently substitute another SKU.
  await page.goto(new URL('acheter.html?modele=seiko-5',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('#amDirectUnavailable').waitFor({state:'visible'});
  assert.equal(await page.locator('#amDirectForm').isVisible(),false);
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),false);
  assert.equal(await page.locator('#amDirectHeading').innerText(),
    'Une montre choisie. Un vendeur à consulter.');
  await page.goto(new URL('acheter.html?modele=citizen-tsuyosa',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('#amDirectForm').waitFor({state:'visible'});
  assert.equal(await page.locator('#amDirectOffers').inputValue(),'citizen-tsuyosa',
    'An exact qualified SKU must be preselected, not the first available watch');
  assert.match(await page.locator('#amDirectPrice').innerText(),/175,00/);

  // Real pages never get an own-site buy link unless this mocked backend
  // explicitly lists that exact model. No payment calls or test transactions.
  await page.goto(new URL('index.html',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('.home-product-card .am-direct-card-link').first()
    .waitFor({state:'visible'});
  assert.equal(await page.locator('.home-product-card .am-direct-card-link').count(),2);
  assert.equal(await page.locator('.home-product-card[data-watch-id="seiko-5"] .am-direct-card-link').count(),0);
  assert.equal((await page.locator('.home-nav-buy').textContent()).trim(),'Acheter sur notre site',
    'The navigation label is correct even when CSS renders it in uppercase');
  assert.equal(new URL(await page.locator('.home-product-card[data-watch-id="citizen-tsuyosa"] .am-direct-card-link').getAttribute('href')).searchParams.get('modele'),'citizen-tsuyosa');

  await page.goto(new URL('montres/citizen-tsuyosa.html',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('.watch-product .am-direct-card-link').waitFor({state:'visible'});
  assert.equal(await page.locator('.watch-product .am-direct-card-link').count(),1);
  assert.equal(new URL(await page.locator('.watch-product .am-direct-card-link').getAttribute('href')).searchParams.get('modele'),'citizen-tsuyosa');
  assert.doesNotMatch(await page.locator('.watch-product .disclosure').innerText(),
    /Atelier Montres ne vend pas ce modèle/);

  await page.goto(new URL('montres/skmei-1257.html',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('.am-extra-product .am-direct-card-link').waitFor({state:'visible'});
  assert.equal(await page.locator('.am-extra-product .am-direct-card-link').count(),1);
  assert.equal(new URL(await page.locator('.am-extra-product .am-direct-card-link').getAttribute('href')).searchParams.get('modele'),'skmei-1257');
  assert.doesNotMatch(await page.locator('.am-extra-approval').innerText(),
    /Nous ne vendons pas directement ce produit/);

  await page.goto(new URL('montre.html?id=citizen-tsuyosa',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('#detailShell .am-direct-card-link').waitFor({state:'visible'});
  assert.equal(await page.locator('#detailShell .am-direct-card-link').count(),1);
  assert.doesNotMatch(await page.locator('.detail-commerce').innerText(),
    /Atelier Montres ne vend pas cet article/);

  await page.goto(new URL('montres/seiko-5.html',base).href,
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.readyState==='complete');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.watch-product .am-direct-card-link').count(),0);
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('Purchase page OK: scripts disabled, API offline, mobile CSS, synthetic eligible purchase gate; no payments');
}finally{
  await browser.close();
}
