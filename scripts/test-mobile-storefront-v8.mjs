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
const checkVector=async target=>{
 await target.scrollIntoViewIfNeeded();
 const svg=target.locator('svg.am-watch-svg');
 await svg.waitFor({state:'visible',timeout:8000});
 const label=await svg.getAttribute('aria-label');
 assert.match(label||'',/Interprétation vectorielle/,'Original art must be clearly labeled');
 return label;
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

 await checkVector(cards.first().locator('.aff-illustration'));
 assert.equal(await page.locator('.aff-card img.aff-product-photo').count(),0,'Unlicensed manufacturer photos must never be loaded');
 assert.equal(await page.locator('.aff-photo-expand').count(),0,'Photo zoom controls must stay absent until licensing is approved');


 // Discover filters must work, including the most expensive collection.
 for(const [key,n] of [['essential',6],['signature',6],['prestige',3],['all',15]]){
   await page.locator('#affTabs button[data-tier="'+key+'"]').click();
   assert.equal(await cards.count(),n,key+' filter must display the correct count');
 }
 
 // Movement refinement is independent of pricing tiers and brand.
 await page.locator('#affBrand').selectOption('Citizen');
 assert.equal(await cards.count(),3,'Brand filter must show the three Citizen references');
 assert.ok(await page.locator('#affActiveFilters .am-filter-chip').count()>=1,'Active brand should create a removable filter');
 await page.locator('#affActiveFilters .am-filter-chip',{hasText:'Citizen'}).click();
 assert.equal(await cards.count(),15,'Removing a single brand filter returns to all 15 models');
 // A factual size filter must include measured watches only and keep unknowns explicit.
 await page.locator('#affDiameter').selectOption('compact');
 assert.equal(await cards.count(),3,'Three documented cases have diameter at most 38 mm');
 await page.locator('#affDiameter').selectOption('medium');
 assert.equal(await cards.count(),6,'Six documented cases have diameter above 38 and at most 40 mm');
 await page.locator('#affDiameter').selectOption('unknown');
 assert.equal(await cards.count(),6,'Six catalogue references have no documented diameter');
 assert.ok(await page.locator('#affActiveFilters .am-filter-chip').count()>=1);
 await page.locator('#affActiveFilters .am-filter-chip',{hasText:'Diamètre à confirmer'}).click();
 assert.equal(await cards.count(),15,'Clearing diameter chip restores the catalogue');
 await page.locator('#affSort').selectOption('diameter-asc');
 assert.match(await cards.first().innerText(),/LTP-1302PD/,'Ascending diameter places 30.2mm first');
 await page.locator('#affSort').selectOption('diameter-desc');
 assert.ok((await cards.first().innerText()).includes('40'),'Descending diameter places 40mm models first');
 await page.locator('#affSort').selectOption('editorial');
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
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2,'Both selected watches have removable previews');
 assert.equal(await page.locator('#affCompareSelected img').count(),0,'No unlicensed thumbnail should load in the comparison dock');
 assert.equal(await page.locator('#affCompareTray').evaluate(el=>getComputedStyle(el).position),'fixed','Dock must be visible immediately on mobile');
 await page.locator('#affCompareSelected .am-compare-selected-chip').first().click();
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),1,'Removing one watch preserves the other');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(0).isChecked(),false,'Checkbox stays synced after removal');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(1).isChecked(),true,'The other comparison remains checked');
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(0).check();
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(2).check();
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).click();
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),3,'Maximum three compared watches');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).isChecked(),false,'A fourth selection is refused');
 assert.match(await page.locator('#affCompareNotice').innerText(),/Limite atteinte/,'Limit feedback must be explained');
 await page.locator('#affCompareSelected .am-compare-selected-chip').last().click();
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2,'Can return to two models in one tap');
 await checkWidth('Mobile comparison dock');
 await page.locator('#affCompareOpen').click();
 await page.locator('#affCompareDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#affCompareBody').evaluate(el=>el.parentElement?.id),'affCompareDialog','Compare body must be a direct child of the dialog, never trapped inside its flex header');
 assert.equal(await page.locator('#affCompareDialog .am-compare-thumb').count(),0,'Comparison must not display unlicensed photos');
 const note=page.locator('.am-compare-diff-note');
 if(!(await note.isVisible())){console.error('COMPARISON NOTE DEBUG',await note.evaluateAll(nodes=>nodes.map(n=>[n,n.parentElement,n.parentElement?.parentElement].map(e=>e&&({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display,width:getComputedStyle(e).width,flex:getComputedStyle(e).flex,overflow:getComputedStyle(e).overflow})))));await page.screenshot({path:'artifacts/mobile-compare-debug.png',fullPage:true})}
 assert.ok(await note.isVisible(),'Explain factual differences');
 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Comparison must create two readable mobile swipe cards');
 assert.ok(await page.locator('.am-compare-mobile-track').isVisible(),'Touch carousel must appear on mobile');
 await page.locator('.am-compare-mobile-nav button').last().click();
 await page.waitForFunction(()=>document.querySelector('.am-compare-mobile-position')?.textContent==='2 / 2',{timeout:5000});

 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Mobile comparison has a readable entry for each selected watch');
 assert.equal(await page.locator('.am-compare-mobile-photo').count(),0,'Mobile comparison must not show unlicensed images');
 await page.locator('#affCompareClose').click();
 await page.locator('#affCompareClear').click();

 const citizen=page.locator('#affGrid .aff-card',{hasText:'NJ0150-81X'});
 await citizen.locator('.aff-card-actions button').click();
 await page.locator('#affTabs button[data-tier="favourites"]').click();
 assert.equal(await cards.count(),1,'Favorites collection should show the saved Citizen watch');
 await cards.first().locator('.aff-card-actions a').click();
 await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#detailTitle').innerText(),/NJ0150-81X/);
 const productSchema=JSON.parse(await page.locator('#detailProductStructuredData').textContent());
 assert.equal(productSchema['@type'],'Product','Product details expose accurate structured data');
 assert.equal(productSchema.brand.name,'Citizen');
 assert.match(productSchema.model,/NJ0150-81X/);
 assert.equal(productSchema.image,undefined,'Never add unlicensed photos to structured data');
 assert.equal(productSchema.offers,undefined,'No fabricated commercial offers or prices');
 assert.equal(productSchema.aggregateRating,undefined,'No invented product ratings');
 assert.match(await page.locator('meta[name="description"]').getAttribute('content'),/Citizen/,'Each watch has an informative meta description');
 await checkWidth('Mobile detail');
 assert.ok(await page.locator('#detailFavorite').isVisible(),'Detail page must have favorites');
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'true','Favorites should sync from collection to detail');
 await checkVector(page.locator('#detailArtwork'));
 assert.ok(await page.locator('#detailPhotoZoom').isHidden(),'Do not enable photo zoom without a license');

 assert.equal(await page.locator('#detailRelatedGrid .detail-related-card').count(),3,'Show exactly 3 related genuine models');
 assert.equal(await page.locator('#detailRelatedGrid .detail-related-card img').count(),0,'Related products must not show unlicensed photos');
 await checkVector(page.locator('#detailRelatedGrid .detail-related-card').first());
 assert.ok(await page.locator('#detailAdjacent a').count()>=1,'Allow visiting neighboring watch products');
 await page.locator('#detailFavorite').click();
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'false','Detail favorite must toggle and persist');
 assert.ok(await page.locator('#detailShare').isVisible(),'Native sharing action should be present');
 assert.ok(await page.locator('#detailCompare').isVisible(),'Product detail must offer one-tap comparison');
 const comparisonUrl=await page.locator('#detailCompare').getAttribute('href');
 assert.ok(comparisonUrl.includes('compare=citizen-tsuyosa'),'Product link must carry the actual selected model');

 await page.screenshot({path:'artifacts/mobile-related-watch-detail.png',fullPage:true});
 console.log('PASS: responsive header, licensed-only vector visuals, filters, comparator, favorites and product navigation');

 const desktop=await browser.newPage({viewport:{width:1366,height:850},locale:'fr-FR'});
 await desktop.goto(new URL('/montre.html?id=tissot-prx-auto',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.ok(!(await desktop.locator('.am-mobile-nav').isVisible()),'Mobile nav should be hidden on desktop');
 assert.ok(await desktop.locator('.am-header .navigation').isVisible(),'Desktop nav should remain visible');
 assert.equal(await desktop.locator('#detailRelatedGrid .detail-related-card').count(),3);
 await checkVector(desktop.locator('#detailArtwork'));
 assert.equal(await desktop.locator('#detailArtwork img').count(),0,'Desktop detail must also avoid unlicensed photos');
 const dimensions=await desktop.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.client+2,'Desktop product page must not horizontally overflow');
 await desktop.screenshot({path:'artifacts/desktop-related-watch-detail.png',fullPage:true});
 await desktop.close();
 assert.deepEqual(errors,[],'No JavaScript uncaught errors in mobile browser');
 console.log('PASS: desktop vector Tissot, desktop navigation, recommendations, no overflow');
}finally{
 await browser.close();
}
