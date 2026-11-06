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
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),true);
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),true,
    'The customer-facing unavailable notice must not be hidden with checkout');
  assert.equal(await page.locator('#amDirectStatus').isVisible(),true);
  assert.equal(await page.locator('#amDirectPurchaseSteps').isVisible(),false,
    'Do not advertise live-payment steps during an API failure');
  assert.equal(await page.locator('#amPartnerSelection').isVisible(),true);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false);
  assert.equal(await page.locator('#amDirectUnavailable').isVisible(),false);
  await page.unroute('**/config.json');

  // Public inactive checkout must prioritize real merchant references while
  // keeping the entire payment panel and all payment fields hidden.
  await page.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'inactive',status:'prelaunch',
      commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'})
  }));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('amDirectStatus')?.textContent.includes('Aucun paiement direct'));
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),false);
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),false);
  assert.equal(await page.locator('#amPartnerSelection').isVisible(),true);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false);
  assert.equal(await page.locator('#amDirectPurchaseSteps').isVisible(),false);
  const prelaunchLayout=await page.evaluate(()=>({
    width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(prelaunchLayout.scroll<=prelaunchLayout.width+2,
    'Prelaunch must not overflow a narrow Android screen');
  await page.goto(new URL('acheter.html?modele=citizen-tsuyosa',base).href,
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.getElementById('amDirectStatus')?.textContent.includes('Aucun paiement direct')
  );
  assert.equal(await page.locator('#amDirectUnavailable').isVisible(),false,
    'An inactive checkout is not proof that an exact partner watch is unavailable');
  assert.equal(await page.locator('#amPartnerSelection').isVisible(),true);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false,
    'A partner deep link must never open the direct payment form');
  await page.unroute('**/config.json');

  // A compromised or misconfigured static config must not send buyers'
  // addresses or checkout requests to another tenant on Render.
  const foreignApi='https://untrusted-watch-commerce.onrender.com';
  let foreignRequests=0;
  await page.route(foreignApi+'/**',route=>{
    foreignRequests++;
    return route.abort('failed'); // Never contact a third-party API in CI.
  });
  await page.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'active',commerceApiUrl:foreignApi+'/'})
  }));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('amDirectStatus')
    ?.textContent.includes('Aucun paiement direct'));
  assert.equal(await page.locator('#amDirectForm').isVisible(),false,
    'An unknown Render tenant must never receive a customer checkout');
  assert.equal(foreignRequests,0,'No request may reach an unpinned merchant API');
  const configObserved=page.waitForResponse(response=>response.url().endsWith('/config.json'));
  await page.goto(new URL('index.html',base).href,{waitUntil:'domcontentloaded'});
  await configObserved;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.locator('.am-direct-card-link').count(),0,
    'An unpinned merchant API must not create own-site purchase CTAs');
  assert.equal(foreignRequests,0,'No offer discovery may reach an unknown Render API');
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
  // Return to the generic purchase URL after the preceding SKU deep link.
  // Reloading that deep link would correctly select Citizen, not the first offer.
  await page.goto(url,{waitUntil:'domcontentloaded'});
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
  assert.match(await page.locator('#homePurchaseAnswer').textContent(),
    /commande[z]? auprès de notre boutique|commandez auprès de notre boutique/i,
    'The public FAQ must explain own-site ordering when qualified watches exist');
  assert.equal(new URL(await page.locator('.home-product-card[data-watch-id="citizen-tsuyosa"] .am-direct-card-link').getAttribute('href')).searchParams.get('modele'),'citizen-tsuyosa');

  await page.goto(new URL('montres/citizen-tsuyosa.html',base).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('.watch-product .am-direct-card-link').waitFor({state:'visible'});
  assert.equal(await page.locator('.watch-product .am-direct-card-link').count(),1);
  assert.equal(new URL(await page.locator('.watch-product .am-direct-card-link').getAttribute('href')).searchParams.get('modele'),'citizen-tsuyosa');
  assert.doesNotMatch(await page.locator('.watch-product .disclosure').innerText(),
    /Atelier Montres ne vend pas ce modèle/);
  assert.equal(await page.locator('footer p').filter({hasText:/Aucun achat ni paiement/}).count(),0,
    'Product-page footer must not deny checkout when a valid direct offer exists');

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
  // Mobile browsers can discard the active tab while a checkout POST is
  // uncertain. A NEW tab on the same site must reuse exactly the old retry
  // key. All responses below are synthetic and never reach Mollie or CJ.
  const recoveryContext=await browser.newContext({
    viewport:{width:393,height:852},locale:'fr-FR'
  });
  let postCount=0,firstAttempt=null,storeFrozen=false;
  await recoveryContext.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:storeFrozen?'inactive':'active',
      commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'})
  }));
  await recoveryContext.route('https://atelier-montres-commerce-api.onrender.com/api/offers',
    route=>route.fulfill({
      status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':base.origin},
      body:JSON.stringify({checkoutEnabled:true,offers:[
        {id:'ci-watch-only',label:'Montre CI non commercialisée',
          amountCents:9990,deliveryMinDays:7,deliveryMaxDays:14}
      ]})
    }));
  await recoveryContext.route('https://atelier-montres-commerce-api.onrender.com/api/checkout',
    route=>{
      // Browsers may preflight the cross-origin JSON POST. This is still an
      // isolated localhost test and must never reach the real provider.
      if(route.request().method()==='OPTIONS')return route.fulfill({
        status:204,headers:{
          'Access-Control-Allow-Origin':base.origin,
          'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type'
        }
      });
      postCount++;
      const sent=route.request().postDataJSON();
      assert.equal(sent.offerId,'ci-watch-only');
      assert.match(sent.idempotencyKey,/^[a-f0-9]{32}$/);
      if(firstAttempt===null)firstAttempt=sent.idempotencyKey;
      else assert.equal(sent.idempotencyKey,firstAttempt,
        'A fresh Android tab must NOT create a different Mollie payment attempt');
      if(postCount===1)return route.abort('failed');
      return route.fulfill({
        status:200,contentType:'application/json',
        headers:{'Access-Control-Allow-Origin':base.origin},
        body:JSON.stringify({
          kind:'status',status:'PAYMENT_CREATING',
          orderId:'ord_'+'b'.repeat(40),orderToken:'t'.repeat(43)
        })
      });
    });
  const enterCheckout=async checkoutPage=>{
    await checkoutPage.locator('#amDirectForm').waitFor({state:'visible'});
    for(const [name,value] of Object.entries({
      fullName:'Client Test Local',email:'client@example.test',
      address1:'10 rue du Test',postalCode:'75001',city:'Paris',region:'Paris'
    })){
      await checkoutPage.locator('#amDirectForm [name="'+name+'"]').fill(value);
    }
    await checkoutPage.locator('#amDirectForm [name="acceptTerms"]').check();
  };
  const tabOne=await recoveryContext.newPage();
  await tabOne.goto(new URL('acheter.html?modele=ci-watch-only',base).href,
    {waitUntil:'domcontentloaded'});
  await enterCheckout(tabOne);
  await tabOne.locator('#amDirectSubmit').click();
  await tabOne.waitForFunction(()=>document.querySelector('#amDirectStatus')
    ?.textContent?.includes('Failed to fetch')||
    document.querySelector('#amDirectStatus')?.textContent?.includes('paiement'));
  await tabOne.waitForFunction(()=>document.querySelector('#amDirectSubmit')
    ?.disabled===false);
  assert.equal(postCount,1);
  const saved=await tabOne.evaluate(()=>{
    const key=localStorage.getItem('am_checkout_pending_v1_ci-watch-only');
    return {
      key,session:sessionStorage.getItem('am_checkout_key_ci-watch-only'),
      localData:Object.entries(localStorage),
      sessionData:Object.entries(sessionStorage)
    };
  });
  assert.equal(saved.key,firstAttempt);
  assert.equal(saved.session,firstAttempt);
  assert.ok(saved.localData.every(([k])=>k==='am_checkout_pending_v1_ci-watch-only'),
    'Persistent storage may contain ONLY the opaque retry key, never customer details');
  assert.doesNotMatch(JSON.stringify(saved.localData),/Client Test Local|rue du Test|client@example/);
  await tabOne.close();
  const tabTwo=await recoveryContext.newPage();
  await tabTwo.goto(new URL('acheter.html?modele=ci-watch-only',base).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await tabTwo.evaluate(()=>
    sessionStorage.getItem('am_checkout_key_ci-watch-only')),null,
    'New tab starts without the old session key');
  await enterCheckout(tabTwo);
  await tabTwo.locator('#amDirectSubmit').click();
  await tabTwo.waitForFunction(()=>document.querySelector('#amDirectStatus')
    ?.textContent?.includes('en cours de préparation'));
  assert.equal(postCount,2);
  assert.equal(await tabTwo.evaluate(()=>
    localStorage.getItem('am_checkout_pending_v1_ci-watch-only')),firstAttempt,
    'An unresolved payment keeps its original retry key');
  await tabTwo.close();

  // The storefront has now frozen NEW sales while the customer's original
  // attempt remains unresolved. Only the read-only recovery route is legal.
  storeFrozen=true;
  let recoverCount=0;
  await recoveryContext.route(
    'https://atelier-montres-commerce-api.onrender.com/api/checkout/recover',
    route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({
        status:204,headers:{
          'Access-Control-Allow-Origin':base.origin,
          'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type'
        }
      });
      recoverCount++;
      const sent=route.request().postDataJSON();
      assert.equal(sent.idempotencyKey,firstAttempt);
      assert.equal(sent.offerId,'ci-watch-only');
      return route.fulfill({
        status:200,contentType:'application/json',
        headers:{'Access-Control-Allow-Origin':base.origin},
        body:JSON.stringify({
          kind:'status',status:'PAYMENT_CREATING',
          orderId:'ord_'+'b'.repeat(40),orderToken:'t'.repeat(43)
        })
      });
    });
  const frozenTab=await recoveryContext.newPage();
  await frozenTab.goto(new URL('acheter.html?modele=ci-watch-only',base).href,
    {waitUntil:'domcontentloaded'});
  await frozenTab.locator('#amDirectForm').waitFor({state:'visible'});
  assert.match(await frozenTab.locator('#amDirectSubmit').textContent(),
    /Retrouver ma tentative/);
  assert.equal(await frozenTab.locator('#amDirectOffers').inputValue(),'ci-watch-only');
  assert.equal(await frozenTab.locator('#amDirectOffers').isDisabled(),true);
  assert.equal(await frozenTab.locator('#amDirectPurchaseHint').isVisible(),false,
    'Read-only recovery must not promise a new TTC sale');
  assert.equal(await frozenTab.locator('#amDirectPaymentHint').isVisible(),false,
    'Read-only recovery must not ask the customer to pay again');
  assert.equal(await frozenTab.locator('#amDirectPurchaseSteps').isVisible(),false,
    'Read-only recovery must not show a new-purchase funnel');
  assert.equal(await frozenTab.locator('#amDirectTerms').isVisible(),true,
    'The existing verified checkout request still requires accepted terms');
  await enterCheckout(frozenTab);
  await frozenTab.locator('#amDirectSubmit').click();
  await frozenTab.waitForFunction(()=>document.querySelector('#amDirectStatus')
    ?.textContent?.includes('en cours de préparation'));
  assert.equal(recoverCount,1);
  assert.equal(postCount,2,'Frozen storefront must not create a third checkout POST');
  await frozenTab.close();

  // Two different pending SKUs must remain individually recoverable. The
  // absence of ?modele must not make both attempts inaccessible on Android.
  const multiTab=await recoveryContext.newPage();
  await multiTab.addInitScript(()=>{
    localStorage.setItem('am_checkout_pending_v1_ci-watch-extra','c'.repeat(32));
  });
  await multiTab.goto(new URL('acheter.html',base).href,
    {waitUntil:'domcontentloaded'});
  await multiTab.locator('#amDirectForm').waitFor({state:'visible'});
  assert.equal(await multiTab.locator('#amDirectOffers option').count(),2);
  assert.equal(await multiTab.locator('#amDirectOffers').isEnabled(),true);
  await multiTab.locator('#amDirectOffers').selectOption('ci-watch-only');
  await enterCheckout(multiTab);
  await multiTab.locator('#amDirectSubmit').click();
  await multiTab.waitForFunction(()=>document.querySelector('#amDirectStatus')
    ?.textContent?.includes('en cours de préparation'));
  assert.equal(recoverCount,2);
  assert.equal(postCount,2,'Multi-attempt recovery must never create a new payment');
  await multiTab.close();
  await recoveryContext.close();

  // Storage denied by Android privacy/browser settings must fail BEFORE any
  // checkout POST; a generated key that cannot survive an uncertain HTTP
  // response is unsafe to charge against.
  const blockedContext=await browser.newContext({
    viewport:{width:393,height:852},locale:'fr-FR'
  });
  await blockedContext.addInitScript(()=>{
    Object.defineProperty(window,'localStorage',{configurable:true,
      get(){throw new DOMException('Local data access denied','SecurityError')}
    });
  });
  let blockedCheckoutPosts=0;
  await blockedContext.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'active',
      commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'})
  }));
  await blockedContext.route(
    'https://atelier-montres-commerce-api.onrender.com/api/offers',
    route=>route.fulfill({
      status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':base.origin},
      body:JSON.stringify({checkoutEnabled:true,offers:[
        {id:'ci-watch-only',label:'Montre CI',amountCents:9990,
          deliveryMinDays:7,deliveryMaxDays:14}
      ]})
    }));
  await blockedContext.route(
    'https://atelier-montres-commerce-api.onrender.com/api/checkout',
    route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({
        status:204,headers:{
          'Access-Control-Allow-Origin':base.origin,
          'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type'
        }
      });
      blockedCheckoutPosts++;
      return route.abort('failed');
    });
  const blockedPage=await blockedContext.newPage();
  await blockedPage.goto(new URL('acheter.html?modele=ci-watch-only',base).href,
    {waitUntil:'domcontentloaded'});
  await enterCheckout(blockedPage);
  await blockedPage.locator('#amDirectSubmit').click();
  await blockedPage.waitForFunction(()=>document.querySelector('#amDirectStatus')
    ?.textContent?.includes('Autorisez le stockage local'));
  assert.equal(blockedCheckoutPosts,0,
    'Never attempt a charge without durable idempotency storage');
  assert.equal(await blockedPage.locator('#amDirectSubmit').isEnabled(),true);
  await blockedContext.close();

  // An existing customer must still track an order after an emergency
  // freeze of NEW checkout. All order data below is localhost browser-only;
  // no payment, vendor API, customer address or real shipment is involved.
  const orderId='ord_'+ 'a'.repeat(40);
  const orderToken='t'.repeat(43);
  const orderPage=await browser.newPage({
    viewport:{width:360,height:740},locale:'fr-FR'
  });
  orderPage.on('pageerror',error=>errors.push(error.message));
  let trackingRequests=0;
  let state='SHIPPED',backendFailure=false;
  const trackingEndpoint='https://atelier-montres-commerce-api.onrender.com/api/orders/'+orderId;
  await orderPage.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'inactive',status:'prelaunch',
      commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'})
  }));
  await orderPage.route(trackingEndpoint,route=>{
    trackingRequests++;
    assert.equal(route.request().headers()['x-order-token'],orderToken,
      'Order tracking must carry the original private customer token');
    if(backendFailure)return route.abort('failed');
    return route.fulfill({
      status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':base.origin},
      body:JSON.stringify({
        orderId,status:state,product:'Montre CJ — essai navigateur uniquement',
        amountCents:3490,deliveryMinDays:7,deliveryMaxDays:14,
        trackingNumber:'CI-TRACK-ONLY-0001',
        trackingUrl:'https://www.laposte.fr/outils/suivre-vos-envois?code=CI-TRACK-ONLY-0001'
      })
    });
  });
  const orderUrl=new URL('commande.html?commande='+orderId,base).href;
  await orderPage.goto(orderUrl,{waitUntil:'domcontentloaded'});
  assert.match(await orderPage.locator('#amOrderStatus').innerText(),
    /Suivi disponible uniquement depuis le navigateur/,
    'No stored order token must never expose another customer order');
  assert.equal(trackingRequests,0,'An unauthenticated customer must not query the order API');
  await orderPage.evaluate(({id,token})=>{
    sessionStorage.setItem('am_order_'+id,token);
  },{id:orderId,token:orderToken});
  await orderPage.reload({waitUntil:'domcontentloaded'});
  await orderPage.waitForFunction(()=>document.querySelector('#amOrderStatus')
    ?.textContent?.includes('expédiée'));
  assert.equal(await orderPage.locator('#amOrderDetails').isVisible(),true,
    'Existing shipments remain visible after new-sales checkout is disabled');
  assert.match(await orderPage.locator('#amOrderAmount').innerText(),/34,90/);
  assert.match(await orderPage.locator('#amOrderProduct').innerText(),/Montre CJ/);
  assert.equal(await orderPage.locator('#amOrderShipping a').getAttribute('rel'),
    'noopener noreferrer');
  assert.equal(trackingRequests,1);
  state='DELIVERED';
  await orderPage.locator('#amOrderRefresh').click();
  await orderPage.waitForFunction(()=>document.querySelector('#amOrderStatus')
    ?.textContent?.includes('effectuée'));
  backendFailure=true;
  await orderPage.locator('#amOrderRefresh').click();
  await orderPage.waitForFunction(()=>document.querySelector('#amOrderStatus')
    ?.textContent?.includes('temporairement indisponible'));
  assert.equal(await orderPage.locator('#amOrderDetails').isVisible(),false,
    'A failed status refresh must not pretend stale shipment details are current');
  assert.equal(await orderPage.locator('#amOrderRefresh').isEnabled(),true);
  // Never send the private order token to another Render tenant, even if a
  // modified storefront config points at that tenant.
  let foreignTrackingRequests=0;
  await orderPage.route(foreignApi+'/**',route=>{
    foreignTrackingRequests++;
    return route.abort('failed');
  });
  await orderPage.route('**/config.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({checkoutMode:'inactive',commerceApiUrl:foreignApi+'/'})
  }));
  const trackingBeforeTamper=trackingRequests;
  await orderPage.reload({waitUntil:'domcontentloaded'});
  await orderPage.waitForFunction(()=>document.querySelector('#amOrderStatus')
    ?.textContent?.includes('temporairement indisponible'));
  assert.equal(await orderPage.locator('#amOrderDetails').isVisible(),false);
  assert.equal(foreignTrackingRequests,0,
    'Private order status and token must never go to an unknown Render tenant');
  assert.equal(trackingRequests,trackingBeforeTamper);
  await orderPage.close();
  const noScriptTracking=await browser.newPage({
    javaScriptEnabled:false,viewport:{width:320,height:740},locale:'fr-FR'
  });
  await noScriptTracking.goto(orderUrl,{waitUntil:'domcontentloaded'});
  assert.equal(await noScriptTracking.locator('noscript a[href="./informations-legales.html"]').isVisible(),true,
    'A customer without scripts must find a way to contact the seller');
  await noScriptTracking.close();
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('Purchase and historical order tracking OK: live-sale gate off, token required, refresh and API failure; no payments');
}finally{
  await browser.close();
}
