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
const checkPhoto=async target=>{
 await target.scrollIntoViewIfNeeded();
 const img=target.locator('img[src*="assets/watches/"]').first();
 await img.waitFor({state:'visible',timeout:10000});
 await img.evaluate(async el=>{if(!el.complete)await new Promise(resolve=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',resolve,{once:true})})});
 assert.ok(await img.evaluate(el=>el.naturalWidth>100&&el.naturalHeight>100),'Authorized local photo must decode successfully');
 return img;
};

try{
 await page.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 const cards=page.locator('#affGrid .aff-card');
 await cards.first().waitFor({state:'visible',timeout:20000});
 assert.equal(await cards.count(),15,'The full genuine catalogue should render');
 // Gallery and detailed presentation must both remain functional on Android.
 const galleryButton=page.locator('#affViewGallery'),detailButton=page.locator('#affViewDetail');
 await galleryButton.waitFor({state:'visible'});
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'gallery','First-time mobile visitor sees the visual gallery');
 assert.equal(await galleryButton.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#affGrid .am-gallery-facts').count(),15,'Every gallery watch includes sourced movement and diameter facts');
 assert.equal(await page.locator('#affGrid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),2,'Photo gallery displays two responsive columns on mobile');
 await detailButton.click();
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'detail');
 assert.equal(await page.locator('#affGrid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),1,'Detailed view remains one large card per row on Android');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#affGrid .aff-card').first().waitFor({state:'visible'});
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'detail','Saved viewing preference survives reload');
 await page.locator('#affViewGallery').click();
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'gallery');
 await checkWidth('Mobile gallery and its controls');

 // The real browser must publish all 13 tagged Amazon.fr destinations, but
 // never manufacture the two ASINs absent from the source catalogue.
 const ctas=page.locator('#affGrid .am-affiliate-cta');
 await ctas.first().waitFor({state:'visible',timeout:15000});
 assert.equal(await ctas.count(),13,'All exact model matches have tagged Amazon Special Links');
 const citizenPaid=page.locator('#affGrid .aff-card[data-watch-id="citizen-tsuyosa"] .am-affiliate-cta');
 assert.equal(await citizenPaid.getAttribute('href'),'https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21');
 assert.match(await citizenPaid.getAttribute('rel'),/nofollow sponsored/,'Paid links must be labelled to crawlers');
 assert.match(await citizenPaid.innerText(),/lien rémunéré/i,'Visible disclosure on paid destination');
 for(const id of ['citizen-eco','tissot-prx-auto']){
   assert.equal(await page.locator('#affGrid .aff-card[data-watch-id="'+id+'"] .am-affiliate-cta').count(),0,'No fabricated paid product for '+id);
 }
 assert.match(await page.locator('.aff-disclosure').innerText(),/En tant que Partenaire Amazon/);
 assert.equal(await ctas.evaluateAll(nodes=>nodes.every(a=>a.href.startsWith('https://www.amazon.fr/dp/')&&new URL(a.href).searchParams.get('tag')==='drackk04-21')),true,'Every outbound paid link must use the owner-confirmed ID');

 // Premium real-photography editorial journey (actual catalogue, no mock assets).
 const variants=page.locator('#heroVariants .am-hero-option');
 await variants.first().waitFor({state:'visible',timeout:15000});
 assert.equal(await variants.count(),4,'Four curated source-backed cover watches');
 const thumbnailImages=page.locator('#heroVariants .am-hero-option-photo img');
 assert.equal(await thumbnailImages.count(),4,'Every cover option needs a real local photographic thumbnail');
 for(const thumb of await thumbnailImages.all()){
   await thumb.evaluate(async el=>{if(!el.complete)await new Promise(resolve=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',resolve,{once:true})})});
   assert.ok(await thumb.evaluate(el=>el.naturalWidth>100&&el.naturalHeight>100),'Hero thumbnail must decode');
 }
 assert.match(await page.locator('.am-hero-label').evaluate(el=>getComputedStyle(el).backgroundImage),/linear-gradient/,'Cover captions need a dark opaque contrast surface');
 assert.equal(await variants.first().getAttribute('aria-pressed'),'true','Citizen is initially featured');
 const heroPhoto=page.locator('#heroWatch img.am-hero-real-photo');
 await checkPhoto(page.locator('#heroWatch'));
 assert.match(await heroPhoto.getAttribute('alt'),/Citizen Tsuyosa/);
 await page.locator('#heroVariants button[data-watch-id="tissot-prx-quartz"]').click();
 await heroPhoto.waitFor({state:'visible',timeout:15000});
 assert.match(await heroPhoto.getAttribute('alt'),/Tissot PRX Quartz/,'Selected cover must show exact PRX photograph');
 assert.equal(await page.locator('#heroVariants button[data-watch-id="tissot-prx-quartz"]').getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('#heroEditorialLink').getAttribute('href'),/tissot-prx-quartz/,'Featured link must open matching product');
 await page.locator('#heroEditorialZoom').click();
 await page.locator('#amPhotoDialog').waitFor({state:'visible',timeout:15000});
 assert.match(await page.locator('#amPhotoDialog .am-photo-title').innerText(),/Tissot/);
 await page.locator('#amPhotoDialog .am-photo-close').click();
 await page.locator('#heroVariants button[data-watch-id="orient-bambino"]').focus();
 await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('#heroVariants button[data-watch-id="casio-mtp-b145"]').getAttribute('aria-pressed'),'true','Right arrow switches cover by keyboard');
 await heroPhoto.waitFor({state:'visible',timeout:15000});
 assert.match(await heroPhoto.getAttribute('alt'),/Casio MTP-B145/);
 const lookbook=page.locator('#amEditorialGallery');
 await lookbook.waitFor({state:'visible',timeout:15000});
 const photoCards=page.locator('#amEditorialGrid .am-story-card');
 assert.equal(await photoCards.count(),3,'Three independently sourced real-watch editorial images');
 for(const id of ['seiko-5','orient-bambino','tissot-prx-quartz']){
   assert.ok(await page.locator('#amEditorialGrid .am-story-card[data-watch-id="'+id+'"]').count(),'Source-backed gallery: '+id);
 }
 await checkPhoto(photoCards.first().locator('.am-story-media'));
 await page.locator('#amEditorialGrid .am-story-card[data-watch-id="seiko-5"] .am-story-zoom').click();
 await page.locator('#amPhotoDialog').waitFor({state:'visible'});
 assert.match(await page.locator('#amPhotoDialog .am-photo-title').innerText(),/Seiko/,'Gallery zoom opens exact product');
 await page.locator('#amPhotoDialog .am-photo-close').click();
 await checkWidth('Mobile photographic lookbook');
 await page.screenshot({path:'artifacts/mobile-genuine-watch-lookbook.png',fullPage:true});

 await checkWidth('Mobile collection');
 assert.ok((await page.locator('.am-header').boundingBox()).height<=100,'Mobile header must stay compact');
 assert.ok(await page.locator('.am-mobile-nav>summary').isVisible(),'Mobile navigation must be visible');
 assert.ok(!(await page.locator('.am-header .navigation').isVisible()),'Full desktop navigation must be hidden on mobile');

 await page.locator('.am-mobile-nav>summary').click();
 assert.ok(await page.locator('.am-mobile-links a').first().isVisible(),'Mobile menu must open');
 await page.locator('.am-mobile-links a[href="#gammes"]').click();
 assert.ok(!(await page.locator('.am-mobile-links a').first().isVisible()),'Mobile menu should close after navigation');

 await checkPhoto(cards.first().locator('.aff-illustration'));
 assert.equal(await page.locator('.aff-card img.aff-product-photo').count(),15,'All 15 owner-authorized images must render');
 assert.equal(await page.locator('.aff-photo-expand').count(),15,'All 15 photo zoom controls must be usable');


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
 assert.equal(await page.locator('#affCompareSelected img').count(),2,'Compared watches should display real photos');
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
 assert.equal(await page.locator('#affCompareDialog .am-compare-thumb').count(),2,'Comparison must display two real model photos');
 const note=page.locator('.am-compare-diff-note');
 if(!(await note.isVisible())){console.error('COMPARISON NOTE DEBUG',await note.evaluateAll(nodes=>nodes.map(n=>[n,n.parentElement,n.parentElement?.parentElement].map(e=>e&&({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display,width:getComputedStyle(e).width,flex:getComputedStyle(e).flex,overflow:getComputedStyle(e).overflow})))));await page.screenshot({path:'artifacts/mobile-compare-debug.png',fullPage:true})}
 assert.ok(await note.isVisible(),'Explain factual differences');
 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Comparison must create two readable mobile swipe cards');
 assert.ok(await page.locator('.am-compare-mobile-track').isVisible(),'Touch carousel must appear on mobile');
 await page.locator('.am-compare-mobile-nav button').last().click();
 await page.waitForFunction(()=>document.querySelector('.am-compare-mobile-position')?.textContent==='2 / 2',{timeout:5000});

 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Mobile comparison has a readable entry for each selected watch');
 assert.equal(await page.locator('.am-compare-mobile-photo').count(),2,'Mobile comparison photos must match both selected watches');
 await page.locator('#affCompareClose').click();
 await page.locator('#affCompareClear').click();

 const citizen=page.locator('#affGrid .aff-card',{hasText:'NJ0150-81X'});
 await citizen.locator('.aff-card-actions button').click();
 await page.locator('#affTabs button[data-tier="favourites"]').click();
 assert.equal(await cards.count(),1,'Favorites collection should show the saved Citizen watch');
 await cards.first().locator('.aff-card-actions a[href^="./montre.html?id="]').click();
 await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#detailTitle').innerText(),/NJ0150-81X/);
 const productSchema=JSON.parse(await page.locator('#detailProductStructuredData').textContent());
 assert.equal(productSchema['@type'],'Product','Product details expose accurate structured data');
 assert.equal(productSchema.brand.name,'Citizen');
 assert.match(productSchema.model,/NJ0150-81X/);
 assert.ok(Array.isArray(productSchema.image)&&productSchema.image[0]?.includes('assets/watches/citizen-tsuyosa.webp'),'Authorized local product photo must appear in structured data');
 assert.equal(productSchema.offers,undefined,'No fabricated commercial offers or prices');
 assert.equal(productSchema.aggregateRating,undefined,'No invented product ratings');
 assert.match(await page.locator('meta[name="description"]').getAttribute('content'),/Citizen/,'Each watch has an informative meta description');
 await checkWidth('Mobile detail');
 assert.ok(await page.locator('#detailFavorite').isVisible(),'Detail page must have favorites');
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'true','Favorites should sync from collection to detail');
 await checkPhoto(page.locator('#detailArtwork'));
 assert.ok(await page.locator('#detailPhotoZoom').isVisible(),'Owner-authorized photo should enable detail zoom');

 assert.equal(await page.locator('#detailRelatedGrid .detail-related-card').count(),3,'Show exactly 3 related genuine models');
 assert.equal(await page.locator('#detailRelatedGrid .detail-related-card img').count(),3,'Three related watches should show model photos');
 await checkPhoto(page.locator('#detailRelatedGrid .detail-related-card').first());
 assert.ok(await page.locator('#detailAdjacent a').count()>=1,'Allow visiting neighboring watch products');
 await page.locator('#detailFavorite').click();
 assert.equal(await page.locator('#detailFavorite').getAttribute('aria-pressed'),'false','Detail favorite must toggle and persist');
 assert.ok(await page.locator('#detailShare').isVisible(),'Native sharing action should be present');
 assert.ok(await page.locator('#detailCompare').isVisible(),'Product detail must offer one-tap comparison');
 const comparisonUrl=await page.locator('#detailCompare').getAttribute('href');
 assert.ok(comparisonUrl.includes('compare=citizen-tsuyosa'),'Product link must carry the actual selected model');

 await page.screenshot({path:'artifacts/mobile-related-watch-detail.png',fullPage:true});
 console.log('PASS: responsive header, 15 owner-authorized source photos, filters, comparator, favorites and product navigation');

 const desktop=await browser.newPage({viewport:{width:1366,height:850},locale:'fr-FR'});
 await desktop.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#amEditorialGrid .am-story-card').first().waitFor({state:'visible',timeout:20000});
 assert.equal(await desktop.locator('#amEditorialGrid .am-story-card').count(),3,'Desktop editorial photography layout');
 assert.equal(await desktop.locator('#heroVariants .am-hero-option').count(),4,'Desktop hero selection');
 const desktopHomeSize=await desktop.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(desktopHomeSize.scroll<=desktopHomeSize.client+2,'Desktop editorial layout must not overflow');
 await desktop.screenshot({path:'artifacts/desktop-genuine-watch-lookbook.png',fullPage:true});
 await desktop.goto(new URL('/montre.html?id=tissot-prx-auto',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.ok(!(await desktop.locator('.am-mobile-nav').isVisible()),'Mobile nav should be hidden on desktop');
 assert.ok(await desktop.locator('.am-header .navigation').isVisible(),'Desktop nav should remain visible');
 assert.equal(await desktop.locator('#detailRelatedGrid .detail-related-card').count(),3);
 await checkPhoto(desktop.locator('#detailArtwork'));
 assert.equal(await desktop.locator('#detailArtwork img').count(),1,'Desktop detail should show an owner-authorized watch photo');
 const dimensions=await desktop.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.client+2,'Desktop product page must not horizontally overflow');
 await desktop.screenshot({path:'artifacts/desktop-related-watch-detail.png',fullPage:true});
 await desktop.close();
 assert.deepEqual(errors,[],'No JavaScript uncaught errors in mobile browser');
 console.log('PASS: desktop source photograph, navigation, recommendations, no overflow');
}finally{
 await browser.close();
}
