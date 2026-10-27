import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)),'Local HTTP is allowed only for loopback E2E tests');
const browser=await chromium.launch({headless:true});
const errors=[];
mkdirSync('artifacts',{recursive:true});
const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
page.on('pageerror',e=>errors.push(e.message));

const checkWidth=async label=>{
 const box=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(box.scroll<=box.client+2,label+' must not horizontally overflow '+JSON.stringify(box));
};
const checkPhoto=async img=>{
 await img.scrollIntoViewIfNeeded();
 await img.evaluate(el=>el.decode());
 return img.evaluate(el=>({width:el.naturalWidth,src:el.currentSrc}));
};

try{
 await page.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 const cards=page.locator('#affGrid .aff-card');
 await cards.first().waitFor({state:'visible',timeout:20000});
 assert.equal(await cards.count(),15,'The full genuine catalogue should render');
 await checkWidth('Mobile collection');
 assert.ok((await page.locator('.am-header').boundingBox()).height<=100,'Mobile header must stay compact');
 assert.ok(await page.locator('.am-mobile-nav>summary').isVisible(),'Mobile navigation must be visible');
 assert.ok(!(await page.locator('.am-header .navigation').isVisible()),'Full desktop navigation must be hidden on mobile');

 await page.locator('.am-mobile-nav>summary').click();
 assert.ok(await page.locator('.am-mobile-links a').first().isVisible(),'Mobile menu must open');
 await page.locator('.am-mobile-links a[href="#gammes"]').click();
 assert.ok(!(await page.locator('.am-mobile-links a').first().isVisible()),'Mobile menu should close after navigation');

 const img=cards.first().locator('img.aff-product-photo');
 const firstPhoto=await checkPhoto(img);
 assert.ok(firstPhoto.width>200&&firstPhoto.src.includes('/assets/watches/'),'First model must use real same-origin WebP photo');
 // Real watch photo lightbox: open from the card, navigate, zoom and exit.
 await cards.first().locator('.aff-photo-expand').click();
 await page.locator('#amPhotoDialog').waitFor({state:'visible'});
 assert.match(await page.locator('#amPhotoDialog .am-photo-title').innerText(),/Casio/i);
 const modalPhoto=page.locator('#amPhotoDialog img.am-photo-large');
 await modalPhoto.evaluate(img=>img.decode());
 assert.ok((await modalPhoto.evaluate(img=>img.naturalWidth))>200,'Zoom must display a genuine local photograph');
 await page.locator('.am-photo-next').click();
 assert.match(await page.locator('.am-photo-position').innerText(),/2 \/ 15/);
 await page.locator('.am-photo-prev').click();
 assert.match(await page.locator('.am-photo-position').innerText(),/1 \/ 15/);
 await page.locator('.am-photo-zoom').click();
 assert.ok(await page.locator('.am-photo-canvas').evaluate(x=>x.classList.contains('am-photo-expanded')),'Magnify the actual photograph');
 await page.locator('.am-photo-close').click();
 assert.ok(!(await page.locator('#amPhotoDialog').isVisible()),'Close the photo viewer');


 // Discover filters must work, including the most expensive collection.
 for(const [key,n] of [['essential',6],['signature',6],['prestige',3],['all',15]]){
   await page.locator('#affTabs button[data-tier="'+key+'"]').click();
   assert.equal(await cards.count(),n,key+' filter must display the correct count');
 }
 
 // Movement refinement is independent of pricing tiers and brand.
 await page.locator('#affMovement').selectOption('eco-drive');
 assert.equal(await cards.count(),1,'Eco-Drive movement must show the matching Citizen');
 await page.locator('#affMovement').selectOption('automatic');
 assert.equal(await cards.count(),7,'Seven mechanical automatic references in the original catalogue');
 await page.locator('#affMovement').selectOption('all');
 await page.locator('#affSearch').fill('ref-does-not-exist-987');
 assert.equal(await cards.count(),0,'An impossible search must show an empty state');
 assert.ok(await page.locator('#affReset').isVisible(),'No-results recovery control');
 await page.locator('#affReset').click();
 assert.equal(await cards.count(),15,'One-tap filter reset must restore the entire collection');
await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(0).check();
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(1).check();
 assert.ok(await page.locator('#affCompareTray').isVisible(),'Comparison tray should appear after selecting 2 watches');
 await page.locator('#affCompareOpen').click();
 await page.locator('#affCompareDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#affCompareDialog .am-compare-thumb').count(),2,'Both compared models should display real photographs');
 assert.ok(await page.locator('.am-compare-diff-note').isVisible(),'Explain factual differences');
 for(const comparisonImg of await page.locator('#affCompareDialog .am-compare-thumb').all()){
   const state=await checkPhoto(comparisonImg);assert.ok(state.width>200,'Comparison photograph must decode');
 }
 await page.locator('#affCompareClose').click();
 await page.locator('#affCompareClear').click();

 const citizen=page.locator('#affGrid .aff-card',{hasText:'NJ0150-81X'});
 await citizen.locator('.aff-card-actions button').click();
 await page.locator('#affTabs button[data-tier="favourites"]').click();
 assert.equal(await cards.count(),1,'Favorites collection should show the saved Citizen watch');
 await cards.first().locator('.aff-card-actions a').click();
 await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#detailTitle').innerText(),/NJ0150-81X/);
 await checkWidth('Mobile detail');
 assert.ok(await page.locator('#detailFavorite').isVisible(),'Detail page must have favorites');
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'true','Favorites should sync from collection to detail');
 const actual=await checkPhoto(page.locator('#detailArtwork img.am-real-product-photo'));
 assert.ok(actual.width>=240&&actual.src.includes('/assets/watches/citizen-tsuyosa.webp'),'Main detail must use local authentic photo');
 await page.locator('#detailPhotoZoom').click();
 await page.locator('#amPhotoDialog').waitFor({state:'visible'});
 await page.locator('#amPhotoDialog img.am-photo-large').evaluate(img=>img.decode());
 await page.locator('#amPhotoDialog .am-photo-close').click();
 assert.ok(!(await page.locator('#amPhotoDialog').isVisible()),'Detail photo viewer closes safely');

 assert.equal(await page.locator('#detailRelatedGrid .detail-related-card').count(),3,'Show exactly 3 related genuine models');
 const suggestion=await checkPhoto(page.locator('#detailRelatedGrid .detail-related-card img').first());
 assert.ok(suggestion.width>=200&&suggestion.src.includes('/assets/watches/'),'Related watches should use real photos');
 assert.ok(await page.locator('#detailAdjacent a').count()>=1,'Allow visiting neighboring watch products');
 await page.locator('#detailFavorite').click();
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'false','Detail favorite must toggle and persist');
 assert.ok(await page.locator('#detailShare').isVisible(),'Native sharing action should be present');
 await page.screenshot({path:'artifacts/mobile-related-watch-detail.png',fullPage:true});
 console.log('PASS: responsive header, real images, filters, photo comparator, related watch images, synced favorites and product navigation');

 const desktop=await browser.newPage({viewport:{width:1366,height:850},locale:'fr-FR'});
 await desktop.goto(new URL('/montre.html?id=tissot-prx-auto',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.ok(!(await desktop.locator('.am-mobile-nav').isVisible()),'Mobile nav should be hidden on desktop');
 assert.ok(await desktop.locator('.am-header .navigation').isVisible(),'Desktop nav should remain visible');
 assert.equal(await desktop.locator('#detailRelatedGrid .detail-related-card').count(),3);
 const tissot=desktop.locator('#detailArtwork img.am-real-product-photo');
 await tissot.evaluate(img=>img.decode());
 assert.ok((await tissot.evaluate(img=>img.naturalWidth))>400,'Tissot main real photo must decode on desktop');
 const dimensions=await desktop.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.client+2,'Desktop product page must not horizontally overflow');
 await desktop.screenshot({path:'artifacts/desktop-related-watch-detail.png',fullPage:true});
 await desktop.close();
 assert.deepEqual(errors,[],'No JavaScript uncaught errors in mobile browser');
 console.log('PASS: desktop real Tissot photo, desktop navigation, recommendations, no overflow');
}finally{
 await browser.close();
}
