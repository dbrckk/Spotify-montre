import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Test a locally served, built source site. Never follow the outbound
// partner links or call a provider checkout from automation.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Partner-purchase browser test is localhost-only');
const root=new URL('../site/',import.meta.url);
const config=JSON.parse(readFileSync(new URL('affiliate-links.json',root),'utf8'));
const feed=JSON.parse(readFileSync(new URL('selection-affiliation.json',root),'utf8'));
const evidence=JSON.parse(readFileSync(new URL('amazon-product-links.json',root),'utf8'));
const evidenceDate=evidence.checkedOn.split('-').reverse().join('/');
const ids=Object.keys(config.links);
const discovery=JSON.parse(readFileSync(new URL('discovery-catalogue.json',root),'utf8'));
const commercial=JSON.parse(readFileSync(new URL('commercial-registry.json',root),'utf8'));
const extra=discovery.products.filter(p=>p.kind==='supplemental'&&p.merchantKind==='direct');
const total=ids.length+extra.length;
assert.equal(extra.length,10,'Ten independently reviewed exact Amazon supplemental models must publish');
assert.equal(commercial.counts.activeExactAmazonReferrals,total,
  'The purchase showroom must agree with the independent commercial proof');
assert.equal(Object.values(evidence.links).filter(x=>
  x.availabilityAtCheck==='unavailable_at_check').length,4,
  'Four historically unavailable exact ASINs must remain visibly qualified');
assert.equal(ids.length,13,'The real catalog must have 13 exact Amazon.fr matches');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({
    viewport:{width:390,height:840},deviceScaleFactor:1,locale:'fr-FR'
  });
  const issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  await page.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('.am-partner-card').length===23);
  assert.equal(await page.locator('.am-partner-card').count(),total);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false,
    'Affiliate gateway must never activate the own-site merchant checkout');
  assert.equal(await page.locator('#amDirectCommerce').isVisible(),false,
    'A public partner showroom must not lead with an inactive checkout panel');
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),false,
    'Do not expose a development-style prelaunch panel to shoppers');
  assert.equal(await page.locator('#amPartnerSelection').isVisible(),true,
    'Verified merchant listings remain the primary purchase experience');
  assert.equal(await page.locator('#amDirectPurchaseSteps').isVisible(),false,
    'Inactive purchase instructions must not imply a new order can be placed');
  assert.equal(await page.locator('#amPartnerFilters').isVisible(),true);
  const cards=page.locator('.am-partner-card');
  for(let i=0;i<ids.length;i++){
    const card=cards.nth(i);
    const id=(await card.locator('.am-partner-buy').getAttribute('data-amazon-product'));
    assert.ok(ids.includes(id));
    const a=card.locator('.am-partner-buy');
    assert.equal(await a.getAttribute('href'),config.links[id].url);
    assert.equal(await a.getAttribute('target'),'_blank');
    assert.equal(await a.getAttribute('rel'),'noopener noreferrer nofollow sponsored');
    assert.equal(await a.getAttribute('data-amazon-placement'),'showroom');
    assert.ok(!(await card.innerText()).includes('€'),
      'Do not display stale/imaginary prices');
    const img=card.locator('img');
    assert.match(await img.getAttribute('src'),new RegExp('^\\./assets/watches/'+id+'\\.webp\\?v=[a-f0-9]{12}$'));
    const unavailable=evidence.links[id].availabilityAtCheck==='unavailable_at_check';
    const note=await card.locator('.am-partner-card-note').innerText();
    assert.ok(note.includes(evidenceDate),'All historical stock observations need an explicit date');
    assert.match(note,unavailable?/Indisponible lors du contrôle/:/Disponibilité non vérifiée/,
      'Never imply a live stock check or buyable offer');
    if(unavailable)assert.match(await a.innerText(),/stock à vérifier/i,
      'Historically unavailable products must not use the normal buy CTA label');
  }
  for(const product of extra){
    const card=page.locator('.am-partner-card[data-watch-id="'+product.id+'"]');
    assert.equal(await card.count(),1,'Additional ASIN model must be displayed: '+product.id);
    const action=card.locator('.am-partner-buy');
    assert.equal(await action.getAttribute('href'),product.merchantUrl);
    assert.equal(await action.getAttribute('rel'),'noopener noreferrer nofollow sponsored');
    assert.equal(await action.getAttribute('data-amazon-product'),product.id);
    assert.equal(await card.locator('.am-partner-detail').getAttribute('href'),
      './montres/'+product.id+'.html','Supplemental detail must open a real SEO product page');
    const note=await card.locator('.am-partner-card-note').innerText();
    const onDate=product.sourceCheckedOn.split('-').reverse().join('/');
    assert.ok(note.includes(onDate),'Supplemental ASIN proof must include the real research date');
    assert.doesNotMatch(note,/en stock|livraison garantie|commande confirmée/i,
      'Historical source evidence is not a live buyable offer');
    const proof=commercial.products.find(p=>p.id===product.id);
    assert.equal(proof.amazon.referralUrl,product.merchantUrl);
    if(product.photoUrl){
      assert.equal(await card.locator('img').getAttribute('src'),product.photoUrl);
    }else{
      assert.equal(await card.locator('img').count(),0);
      assert.match(await card.locator('.am-partner-no-photo').innerText(),/Aucune photographie publiée/);
    }
    if(product.marketplaceVariant)
      assert.match(await card.locator('.am-partner-variant').innerText(),/Variante de la fiche Amazon.fr/);
    if(product.merchantEvidenceType==='amazon_fr_comparator_redirect'){
      assert.match(note,/non consultée directement/);
      assert.match(await action.innerText(),/modèle à confirmer/);
    }
  }
  const first=cards.first().locator('img');
  // Native lazy loading must be activated before waiting for image.onload.
  await first.scrollIntoViewIfNeeded();
  await first.evaluate(async img=>{
    if(!img.complete)await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
  });
  assert.equal(await first.evaluate(img=>img.naturalWidth>0),true,'First real product image must load');
  const essential=feed.products.filter(p=>p.tier==='essential'&&ids.includes(p.id)).length+
    extra.filter(p=>p.tier==='essential').length;
  const prestige=feed.products.filter(p=>p.tier==='prestige'&&ids.includes(p.id)).length+
    extra.filter(p=>p.tier==='prestige').length;
  await page.locator('#amPartnerFilters button[data-tier=essential]').click();
  assert.equal(await page.locator('.am-partner-card').count(),essential);
  assert.equal(await page.locator('#amPartnerFilters button[data-tier=essential]').getAttribute('aria-pressed'),'true');
  await page.locator('#amPartnerFilters button[data-tier=prestige]').click();
  assert.equal(await page.locator('.am-partner-card').count(),prestige);
  await page.locator('#amPartnerFilters button[data-tier=all]').click();
  assert.equal(await page.locator('.am-partner-card').count(),total);
  await page.locator('#amPartnerSearch').fill('SKMEI1257');
  assert.equal(await page.locator('.am-partner-card').count(),1,
    'Mobile buyers can search compact model codes without punctuation');
  assert.equal(await page.locator('.am-partner-card').first().getAttribute('data-watch-id'),
    'skmei-1257');
  await page.locator('#amPartnerSearch').fill('référence totalement absente');
  assert.equal(await page.locator('.am-partner-card').count(),0);
  assert.equal(await page.locator('#amPartnerEmpty').isVisible(),true,
    'Empty results must offer a route back to the full 52-watch catalogue');
  await page.locator('#amPartnerSearch').fill('');
  assert.equal(await page.locator('.am-partner-card').count(),total);
  assert.equal(await page.locator('#amPartnerEmpty').isVisible(),false);
  await page.setViewportSize({width:320,height:740});
  const narrow=await page.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(narrow.scroll<=narrow.client+2,
    'Complete 23-model shopping showroom must reflow at 320px Android');
  await page.setViewportSize({width:390,height:840});
  const mobile=await page.evaluate(()=>({
    documentWidth:document.documentElement.clientWidth,
    scrollWidth:document.documentElement.scrollWidth
  }));
  assert.ok(mobile.scrollWidth<=mobile.documentWidth+2,
    'Mobile shopping gateway must have no horizontal overflow: '+JSON.stringify(mobile));
  mkdirSync('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/verified-partner-purchase-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:840});
  await page.screenshot({path:'artifacts/verified-partner-purchase-desktop.png',fullPage:true});
  assert.deepEqual(issues,[]);
  await page.close();

  // Public entrypoint: the homepage must sell the selection, not the
  // engineering roadmap. Verify actual photos, product navigation and mobile
  // reflow on the same local build as the partner purchase journey.
  const home=await browser.newPage({viewport:{width:320,height:720},locale:'fr-FR'});
  const homeErrors=[];
  home.on('pageerror',error=>homeErrors.push(error.message));
  await home.goto(new URL('index.html',base).href,{waitUntil:'domcontentloaded'});
  assert.match(await home.locator('h1').innerText(),/Trouvez la montre/);
  assert.equal(await home.locator('.home-product-card').count(),6,'The public boutique presents two verified photos per budget tier');
  assert.equal(await home.locator('#siteStatus').count(),0,
    'Internal prelaunch status must not appear in the public site');
  assert.equal(await home.locator('#emptyState').count(),0,
    'The homepage must not present an empty catalog when real references exist');
  assert.equal(await home.locator('.home-product-card a[href*="montre.html?id="]').count(),12,'Every featured watch offers image and detail navigation');
  for(const width of [320,390,1280]){
    await home.setViewportSize({width,height:width===1280?900:760});
    const sizes=await home.evaluate(()=>({
      viewport:document.documentElement.clientWidth,
      contents:document.documentElement.scrollWidth
    }));
    assert.ok(sizes.contents<=sizes.viewport+2,
      'Public homepage horizontal overflow at '+width+' px: '+JSON.stringify(sizes));
    await home.screenshot({path:'artifacts/public-home-'+width+'.png',fullPage:true});
  }
  const heroPhoto=home.locator('.home-hero-visual img');
  await heroPhoto.scrollIntoViewIfNeeded();
  await heroPhoto.evaluate(async img=>{
    if(!img.complete)await new Promise(resolve=>{
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    });
  });
  assert.equal(await heroPhoto.evaluate(img=>img.naturalWidth>0),true,
    'Real photograph must load in the public homepage hero');
  for(const photo of await home.locator('.home-product-card img').all()){
    await photo.scrollIntoViewIfNeeded();
    await photo.evaluate(async img=>{
      if(!img.complete)await new Promise(resolve=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',resolve,{once:true});
      });
    });
    assert.ok(await photo.evaluate(img=>img.naturalWidth>100),
      'Every featured public watch must have a real, decodable local photograph');
  }
  assert.equal(await home.locator('.home-choice[href="./affiliation.html#selection-accessible"]').count(),1,
    'Budget shoppers must land on the photographed affordable collection');
  assert.equal(await home.getByRole('button',{name:/Une question \?/}).count(),1,
    'Visible question button must have a matching accessible name');
  assert.deepEqual(homeErrors,[]);
  await home.close();

  // Deep-linked discovery must preserve the exact watch instead of forcing
  // Android shoppers to search again through all 13 partner offers.
  const referredId='seiko-sharp'; // Historically unavailable at last check.
  const referred=await browser.newPage({viewport:{width:390,height:840}});
  await referred.goto(new URL('acheter.html?modele='+referredId,base).href,
    {waitUntil:'domcontentloaded'});
  await referred.waitForFunction(()=>document.querySelectorAll('.am-partner-card').length===23);
  assert.equal(await referred.locator('.am-partner-card').count(),total);
  assert.equal(await referred.locator('.am-partner-card').first().getAttribute('data-watch-id'),
    referredId);
  assert.equal(await referred.locator('.am-partner-card').first().getAttribute('data-featured'),
    'true');
  assert.match(await referred.locator('.am-partner-card').first().innerText(),
    /Votre modèle recherché/);
  assert.match(await referred.locator('.am-partner-card').first().innerText(),
    /Indisponible lors du contrôle/);
  assert.equal(await referred.locator('#amDirectForm').isVisible(),false);
  assert.equal(await referred.locator('#amDirectUnavailable').isVisible(),false,
    'The requested Amazon watch must not be incorrectly labeled unavailable for purchase');
  await referred.locator('#amPartnerFilters button[data-tier=essential]').click();
  assert.equal(await referred.locator('.am-partner-card').count(),essential);
  await referred.locator('#amPartnerFilters button[data-tier=all]').click();
  assert.equal(await referred.locator('.am-partner-card').first().getAttribute('data-watch-id'),
    referredId);
  await referred.close();

  // Supplemental deep links must highlight the exact researched product,
  // never an unrelated watch from the older 13-watch checkout selection.
  const supplementalId=extra.find(p=>p.merchantEvidenceType==='amazon_fr_comparator_redirect')?.id||extra[0].id;
  const supplementalPage=await browser.newPage({viewport:{width:390,height:840}});
  await supplementalPage.goto(new URL('acheter.html?modele='+supplementalId,base).href,
    {waitUntil:'domcontentloaded'});
  await supplementalPage.waitForFunction(()=>document.querySelectorAll('.am-partner-card').length===23);
  assert.equal(await supplementalPage.locator('.am-partner-card').first().getAttribute('data-watch-id'),
    supplementalId,'Additional buyer referrals must preserve the exact model deep link');
  assert.equal(await supplementalPage.locator('.am-partner-card').first().getAttribute('data-featured'),'true');
  assert.equal(await supplementalPage.locator('#amPartnerUnmatched').isVisible(),false);
  await supplementalPage.close();

  // A missing independently checked Amazon match must offer a catalogue
  // search rather than putting a different reference first.
  const unmatched=await browser.newPage({viewport:{width:390,height:840}});
  await unmatched.goto(new URL('acheter.html?modele=skmei-2056',base).href,
    {waitUntil:'domcontentloaded'});
  await unmatched.locator('#amPartnerUnmatched').waitFor({state:'visible'});
  assert.match(await unmatched.locator('#amPartnerUnmatched').innerText(),
    /ne pouvons pas confirmer ici un lien Amazon.fr exact/);
  assert.match(await unmatched.locator('#amPartnerUnmatchedLink').getAttribute('href'),
    /toutes-les-montres\.html\?q=skmei-2056$/);
  await unmatched.close();

  // An altered supplemental ref, or a missing proof registry, must never
  // publish misleading new Amazon links; valid original core links survive.
  const tamperedDiscovery=structuredClone(discovery);
  const injected=tamperedDiscovery.products.find(p=>p.id===extra[0].id);
  injected.merchantUrl='https://malicious.invalid/dp/B012345678?tag='+config.amazonPartnerTag;
  const forgedSupplemental=await browser.newPage();
  const supplementErrors=[];
  forgedSupplemental.on('pageerror',e=>supplementErrors.push(e.message));
  await forgedSupplemental.route('**/discovery-catalogue.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(tamperedDiscovery)
  }));
  await forgedSupplemental.goto(new URL('acheter.html?modele='+extra[0].id,base).href,
    {waitUntil:'domcontentloaded'});
  await forgedSupplemental.locator('#amPartnerUnmatched').waitFor({state:'visible'});
  assert.equal(await forgedSupplemental.locator('.am-partner-card').count(),13);
  assert.equal(await forgedSupplemental.locator('.am-partner-buy[href*="malicious.invalid"]').count(),0);
  assert.deepEqual(supplementErrors,[]);
  await forgedSupplemental.close();

  const unavailableSupplemental=await browser.newPage();
  await unavailableSupplemental.route('**/commercial-registry.json',
    route=>route.abort('failed'));
  await unavailableSupplemental.goto(new URL('acheter.html?modele='+extra[0].id,base).href,
    {waitUntil:'domcontentloaded'});
  await unavailableSupplemental.locator('#amPartnerUnmatched').waitFor({state:'visible'});
  assert.equal(await unavailableSupplemental.locator('.am-partner-card').count(),13);
  await unavailableSupplemental.close();

  // An invented "in stock" value is tampered evidence: fail closed.
  const stockForgery=structuredClone(evidence);
  stockForgery.links[referredId].availabilityAtCheck='in_stock';
  const forgedStock=await browser.newPage();
  await forgedStock.route('**/amazon-product-links.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(stockForgery)
  }));
  await forgedStock.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await forgedStock.waitForFunction(()=>document.getElementById('amPartnerStatus')?.
    textContent.includes('ne sont pas vérifiables'));
  assert.equal(await forgedStock.locator('.am-partner-card').count(),0);
  await forgedStock.close();

  // Fail closed when a tracked link is modified to the wrong ASIN while the
  // independent generated product registry still points to the old ASIN.
  const forged=structuredClone(config);
  const id=ids[0];
  forged.links[id].asin='B012345678';
  const bad=await browser.newPage({viewport:{width:390,height:840}});
  await bad.route('**/affiliate-links.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(forged)
  }));
  await bad.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await bad.waitForFunction(()=>document.getElementById('amPartnerStatus')?.textContent.includes('ne sont pas vérifiables'));
  assert.equal(await bad.locator('.am-partner-card').count(),0);
  assert.equal(await bad.locator('#amPartnerFilters').isVisible(),false);
  assert.equal(await bad.locator('#amDirectForm').isVisible(),false);
  assert.equal(await bad.locator('#amPartnerRetry').isVisible(),true);
  await bad.close();

  // A second tag parameter is an ambiguous affiliate destination; reject
  // the whole compensated batch, rather than presenting an unsafe link.
  const duplicateTag=structuredClone(config);
  duplicateTag.links[id].url+='&tag='+config.amazonPartnerTag;
  const duplicate=await browser.newPage();
  await duplicate.route('**/affiliate-links.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(duplicateTag)
  }));
  await duplicate.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await duplicate.locator('#amPartnerRetry').waitFor({state:'visible'});
  assert.equal(await duplicate.locator('.am-partner-card').count(),0);
  await duplicate.close();

  // Transient mobile network failures must be recoverable without refreshing
  // the page, duplicating filter handlers or enabling the internal checkout.
  const recover=await browser.newPage({viewport:{width:390,height:840}});
  let attempts=0;
  await recover.route('**/affiliate-links.json',route=>
    ++attempts===1?route.abort('failed'):route.continue());
  await recover.goto(new URL('acheter.html?modele=seiko-sharp',base).href,
    {waitUntil:'domcontentloaded'});
  await recover.locator('#amPartnerRetry').waitFor({state:'visible'});
  assert.equal(await recover.locator('.am-partner-card').count(),0);
  await recover.locator('#amPartnerRetry').click();
  await recover.waitForFunction(()=>document.querySelectorAll('.am-partner-card').length===23);
  assert.equal(await recover.locator('.am-partner-card').count(),total);
  assert.equal(await recover.locator('.am-partner-card').first().getAttribute('data-watch-id'),
    'seiko-sharp');
  assert.equal(await recover.locator('#amPartnerRetry').isVisible(),false);
  await recover.locator('#amPartnerFilters button[data-tier=essential]').click();
  assert.equal(await recover.locator('.am-partner-card').count(),essential);
  await recover.locator('#amPartnerFilters button[data-tier=all]').click();
  assert.equal(await recover.locator('.am-partner-card').count(),total);
  assert.equal(await recover.locator('#amDirectForm').isVisible(),false);
  await recover.close();

  // A revoked image right must never result in a compensated product
  // presentation based on that photograph.
  const revoked=structuredClone(feed);
  revoked.products.find(p=>p.id===id).photoReview.publicUsageApproved=false;
  const wrongPhoto=await browser.newPage();
  await wrongPhoto.route('**/selection-affiliation.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(revoked)
  }));
  await wrongPhoto.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await wrongPhoto.waitForFunction(()=>document.getElementById('amPartnerStatus')?.textContent.includes('ne sont pas vérifiables'));
  assert.equal(await wrongPhoto.locator('.am-partner-card').count(),0);
  await wrongPhoto.close();

  // Disabled program: no paid links, but editorial fallback and the direct
  // checkout lock must remain available without scripts or third parties.
  const inactive=await browser.newPage();
  await inactive.route('**/affiliate-links.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({version:1,enabled:false,approved:false,links:{},amazonPartnerTag:null})
  }));
  await inactive.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await inactive.waitForFunction(()=>document.getElementById('amPartnerStatus')?.textContent.includes('ne sont pas vérifiables'));
  assert.equal(await inactive.locator('.am-partner-card').count(),0);
  assert.equal(await inactive.locator('#amDirectForm').isVisible(),false);
  await inactive.close();
  const noJS=await browser.newPage({javaScriptEnabled:false});
  await noJS.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  assert.match(await noJS.locator('#amPartnerStatus').innerText(),/explorez les 52 fiches de montres/);
  assert.equal(await noJS.locator('#amDirectCommerce').isVisible(),false,
    'A disabled direct checkout must remain hidden even without JavaScript');
  await noJS.close();

  // All the real shopping entrypoints must display the same dated source
  // limitations, not only the dedicated acheter.html gateway.
  const gallery=await browser.newPage({viewport:{width:390,height:840},locale:'fr-FR'});
  await gallery.goto(new URL('affiliation.html',base).href,{waitUntil:'domcontentloaded'});
  const unavailableCard=gallery.locator('.aff-card[data-watch-id="casio-mtp-1302"]');
  await unavailableCard.locator('.am-affiliate-cta').waitFor();
  assert.match(await unavailableCard.locator('.am-affiliate-note').innerText(),
    /Indisponible lors du contrôle du 30\/10\/2026/);
  assert.match(await unavailableCard.locator('.am-affiliate-cta').innerText(),
    /stock à vérifier/i);
  assert.equal(await unavailableCard.locator('.am-affiliate-cta').getAttribute('href'),
    config.links['casio-mtp-1302'].url);
  const uncheckedCard=gallery.locator('.aff-card[data-watch-id="citizen-tsuyosa"]');
  await uncheckedCard.locator('.am-affiliate-cta').waitFor();
  assert.match(await uncheckedCard.locator('.am-affiliate-note').innerText(),
    /Disponibilité non vérifiée au 30\/10\/2026/);
  assert.equal(await gallery.locator('.aff-card .am-affiliate-cta').count(),13,
    'The main 15-watch gallery should publish exactly the 13 documented ASINs');
  assert.match(await unavailableCard.locator('.aff-card-foot').innerText(),
    /ASIN documenté · lien rémunéré/,
    'A documented ASIN is not a verified live Amazon offer');
  assert.doesNotMatch(await gallery.locator('#affGrid').innerText(),
    /Fiche Amazon vérifiée/,
    'Gallery must not imply a live stock verification from historic ASIN evidence');
  await gallery.close();

  // An unavailable independent ASIN registry must fail closed without an
  // unhandled exception or any commissionable product button in the gallery.
  const noEvidence=await browser.newPage({viewport:{width:390,height:840}});
  const pageErrors=[];
  noEvidence.on('pageerror',error=>pageErrors.push(error.message));
  await noEvidence.route('**/amazon-product-links.json',route=>route.abort('failed'));
  await noEvidence.goto(new URL('affiliation.html',base).href,{waitUntil:'domcontentloaded'});
  await noEvidence.locator('.aff-card').first().waitFor();
  await noEvidence.waitForTimeout(250);
  assert.equal(await noEvidence.locator('.aff-card .am-affiliate-cta').count(),0,
    'A missing evidence registry must not publish paid Amazon exits');
  assert.deepEqual(pageErrors,[],'Missing affiliate evidence must not crash the product page');
  await noEvidence.close();

  const detail=await browser.newPage({viewport:{width:390,height:840},locale:'fr-FR'});
  await detail.goto(new URL('montre.html?id=casio-mtp-1302',base).href,
    {waitUntil:'domcontentloaded'});
  await detail.locator('.am-affiliate-detail').waitFor();
  assert.match(await detail.locator('.detail-sub').innerText(),
    /Indisponible lors du contrôle du 30\/10\/2026/);
  assert.match(await detail.locator('.am-affiliate-detail').innerText(),/stock à vérifier/i);
  assert.equal(await detail.locator('.am-affiliate-detail').getAttribute('href'),
    config.links['casio-mtp-1302'].url);
  assert.equal(await detail.locator('#detailAmazon').isVisible(),false,
    'Paid Amazon product should have one prominent affiliate CTA, no duplicate link');
  assert.equal(await detail.locator('.detail-buyer-guide li').count(),3,
    'Every detail needs three concrete checks before placing a merchant order');
  assert.match(await detail.locator('.detail-disclosure').innerText(),/Lien rémunéré/i,
    'Paid seller link must carry an explicit consumer disclosure');
  assert.match(await detail.locator('.detail-buyer-guide').innerText(),/prix total/i);
  assert.equal(new URL(await detail.locator('#detailBackToResults').getAttribute('href'),detail.url()).pathname,
    '/montres/toutes-les-montres.html',
    'Visitors coming from the public home must return to the 52-watch catalogue');
  assert.equal(new URL(await detail.locator('#detailCompare').getAttribute('href'),detail.url()).pathname,
    '/affiliation.html',
    'The detailed compare action must open the real 15-watch comparison interface');
  const detailWidth=await detail.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(detailWidth.scroll<=detailWidth.client+2,
    'Watch detail must not overflow small Android viewports');
  await detail.close();

  const missing=await browser.newPage({viewport:{width:390,height:840}});
  await missing.goto(new URL('montre.html?id=citizen-eco',base).href,
    {waitUntil:'domcontentloaded'});
  await missing.locator('#detailShell').waitFor({state:'visible'});
  assert.equal(await missing.locator('.am-affiliate-detail').count(),0,
    'A model without an exact Amazon ASIN must not receive a compensated link');
  assert.match(await missing.locator('#detailAmazon').getAttribute('href'),/^https:\/\/www\.amazon\.fr\/s\?k=/,
    'Unknown ASIN must remain an explicit generic search, not a substituted product');
  assert.match(await missing.locator('.detail-sub').innerText(),/recherche.*offre vérifiée/i,
    'Generic merchant search must never look like a verified product offer');
  assert.doesNotMatch(await missing.locator('.detail-disclosure').innerText(),
    /aucune commission d'affiliation active/i,
    'Unpaid fallback must not falsely deny active affiliate commissions elsewhere');
  await missing.close();

  // Shoppers must always have a useful path if their browser disables scripts.
  const noscript=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:740}});
  await noscript.goto(new URL('montre.html?id=casio-mtp-1302',base).href,{waitUntil:'load'});
  assert.equal(await noscript.locator('.detail-nojs').isVisible(),true);
  assert.equal(await noscript.locator('.detail-nojs .button').getAttribute('href'),
    './montres/toutes-les-montres.html');
  assert.equal(await noscript.locator('#detailStatus').isVisible(),false);
  await noscript.close();

  // An unavailable editorial feed must never trap buyers on a loading screen.
  const failedFeed=await browser.newPage({viewport:{width:390,height:840}});
  const failures=[];
  failedFeed.on('pageerror',e=>failures.push(e.message));
  await failedFeed.route('**/selection-affiliation.json',route=>route.abort('failed'));
  await failedFeed.goto(new URL('montre.html?id=casio-mtp-1302',base).href,
    {waitUntil:'domcontentloaded'});
  await failedFeed.locator('#detailError').waitFor({state:'visible'});
  assert.equal(await failedFeed.locator('#detailShell').isVisible(),false);
  assert.equal(await failedFeed.locator('#detailError a').getAttribute('href'),
    './montres/toutes-les-montres.html');
  assert.deepEqual(failures,[]);
  await failedFeed.close();

  console.log('Partner routes OK: showroom, 15-watch catalogue, interactive details, exact ASIN, documented stock and no internal charge');
}finally{
  await browser.close();
}