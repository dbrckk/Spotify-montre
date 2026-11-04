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
const ids=Object.keys(config.links);
assert.equal(ids.length,13,'The real catalog must have 13 exact Amazon.fr matches');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({
    viewport:{width:390,height:840},deviceScaleFactor:1,locale:'fr-FR'
  });
  const issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  await page.goto(new URL('acheter.html',base).href,{waitUntil:'domcontentloaded'});
  await page.locator('.am-partner-card').first().waitFor();
  assert.equal(await page.locator('.am-partner-card').count(),13);
  assert.equal(await page.locator('#amDirectForm').isVisible(),false,
    'Affiliate gateway must never activate the own-site merchant checkout');
  assert.equal(await page.locator('#amDirectPrelaunch').isVisible(),true);
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
  }
  const first=cards.first().locator('img');
  await first.evaluate(async img=>{
    if(!img.complete)await new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
  });
  assert.equal(await first.evaluate(img=>img.naturalWidth>0),true,'First real product image must load');
  const essential=feed.products.filter(p=>p.tier==='essential'&&ids.includes(p.id)).length;
  const prestige=feed.products.filter(p=>p.tier==='prestige'&&ids.includes(p.id)).length;
  await page.locator('#amPartnerFilters button[data-tier=essential]').click();
  assert.equal(await page.locator('.am-partner-card').count(),essential);
  assert.equal(await page.locator('#amPartnerFilters button[data-tier=essential]').getAttribute('aria-pressed'),'true');
  await page.locator('#amPartnerFilters button[data-tier=prestige]').click();
  assert.equal(await page.locator('.am-partner-card').count(),prestige);
  await page.locator('#amPartnerFilters button[data-tier=all]').click();
  assert.equal(await page.locator('.am-partner-card').count(),13);
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
  await bad.close();

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
  assert.match(await noJS.locator('#amPartnerStatus').innerText(),/explorez les 15 fiches comparatives/);
  assert.equal(await noJS.locator('#amDirectPrelaunch').isVisible(),true);
  await noJS.close();
  console.log('Partner purchase gateway OK: 13 exact ASINs, mobile filters/photos, fail-closed links and no merchant payments');
}finally{
  await browser.close();
}