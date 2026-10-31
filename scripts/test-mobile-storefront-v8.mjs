import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
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
 // The 13 additional popular/editorial models are a clearly separated
 // commercial discovery path, not fake 15-card catalog entries.
 const popular=page.locator('#modeles-populaires');
 assert.ok(await popular.isVisible(),'Popular sourced watches should be visible below the core catalogue');
 assert.equal(await popular.locator('article.am-pick-card').count(),6,'Six premium new-watch teasers should render');
 assert.equal(await popular.locator('a[data-amazon-search-id]').count(),6,
   'Featured Amazon referrals must be disclosed, search-based and attributable');
 const popularSearch=popular.locator('a[data-amazon-search-id]').first();
 assert.ok((await popularSearch.getAttribute('href')).startsWith('https://www.amazon.fr/s?k='),
   'Do not manufacture an exact ASIN link for the new model');
 assert.match(await popularSearch.getAttribute('rel'),/sponsored/,
   'Popular Amazon search must disclose sponsorship');
 await popular.scrollIntoViewIfNeeded();
 const popularExtent=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(popularExtent.scroll<=popularExtent.client+2,'Popular cards must not overflow mobile');
 await page.screenshot({path:'artifacts/mobile-popular-watch-discovery.png',fullPage:true});
 const popularPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
 await popularPage.goto(new URL('/montres/modeles-populaires.html',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(await popularPage.locator('article.am-pick-card').count(),13,'All supplemental watch models on one source-backed page');
 assert.equal(await popularPage.locator('.am-picks-tier').count(),3,'All three editorial ranges are represented');
 assert.equal(await popularPage.locator('a[data-amazon-search-id]').count(),13,'Tracked Amazon search for each new model');
 assert.equal(await popularPage.locator('img').count(),0,'No unauthorized new product photography');
 const popularPageExtent=await popularPage.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(popularPageExtent.scroll<=popularPageExtent.client+2,'Supplemental page must not overflow Android');
 await popularPage.screenshot({path:'artifacts/mobile-13-popular-watches.png',fullPage:true});
 // High-intent landing pages: each supplemental model must have a distinct,
 // indexable, source-backed product page and an honest Amazon search exit.
 const supplemental=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
 for(const watch of supplemental){
   const response=await popularPage.goto(new URL('/montres/'+watch.id+'.html',base).href,{waitUntil:'domcontentloaded'});
   assert.ok(response?.ok(),'Supplementary model product page reachable: '+watch.id);
   const article=popularPage.locator('article.am-extra-product');
   assert.equal(await article.getAttribute('data-popular-watch-id'),watch.id);
   assert.ok((await popularPage.locator('h1').innerText()).includes(watch.model),
     'Unique SEO title must retain exact manufacturer's reference: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-fact').count(),4,'Four factual product attributes: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-editorial-grid>div').count(),2,
     'Model-specific editorial rationale and caution: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-related li').count(),3,
     'Three live comparable models must have internal landing links: '+watch.id);
   assert.equal(await popularPage.locator('img').count(),0,
     'Unlicensed supplemental photo must not be published: '+watch.id);
   assert.equal(await popularPage.locator('a[data-amazon-search-id]').count(),1,
     'Affiliate search action must be distinct from a verified-ASIN product link: '+watch.id);
   const commercial=popularPage.locator('a[data-amazon-search-id]');
   assert.equal(await commercial.getAttribute('data-amazon-search-id'),watch.id);
   assert.match(await commercial.getAttribute('rel'),/sponsored/);
   const merchant=new URL(await commercial.getAttribute('href'));
   assert.equal(merchant.origin,'https://www.amazon.fr');
   assert.equal(merchant.pathname,'/s');
   assert.equal(merchant.searchParams.get('tag'),'drackk04-21');
   assert.ok(merchant.searchParams.get('k').includes(watch.model),
     'Search must include exact manufacturer model: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-actions a').last().getAttribute('href'),
     watch.officialUrl,'Official photos link must be model-specific: '+watch.id);
   const overflow=await popularPage.evaluate(()=>({
     client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.client+2,'Individual watch page must fit Android: '+watch.id);
   if(watch.id==='citizen-tsuyosa-37-blue'||watch.id==='tissot-gentleman-auto'){
     await popularPage.screenshot({path:'artifacts/mobile-extra-'+watch.id+'.png',fullPage:true});
   }
 }
 await popularPage.setViewportSize({width:320,height:760});
 await popularPage.goto(new URL('/montres/casio-ga-2100-1a1.html',base).href,{waitUntil:'domcontentloaded'});
 const narrow=await popularPage.evaluate(()=>({
   client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
 }));
 assert.ok(narrow.scroll<=narrow.client+2,'Supplemental watch landing must reflow at 320 CSS px');
 await popularPage.close();
 console.log('PASS: 13 model-specific SEO watch pages, sponsored search integrity, manufacturer photos, source facts and Android reflow');
 const shopFirst=await page.evaluate(()=>{
   const ids=['gammes','montres','amEditorialGallery','histoire'];
   const positions=ids.map(id=>document.getElementById(id)?.getBoundingClientRect().top+window.scrollY);
   const firstCard=document.querySelector('#affGrid .aff-card')?.getBoundingClientRect().top+window.scrollY;
   return {positions,firstCard};
 });
 assert.ok(shopFirst.positions.every((x,i)=>Number.isFinite(x)&&(i===0||x>shopFirst.positions[i-1])),
   'Mobile home must place the catalog directly after tiers and before editorial content');
 assert.ok(shopFirst.firstCard<5000,'Mobile visitors should see real watches before excessive editorial scrolling: '+JSON.stringify(shopFirst));
 const discovery=await page.locator('.am-discovery-grid').evaluate(el=>{
   const style=getComputedStyle(el);
   return {flow:style.gridAutoFlow,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};
 });
 assert.equal(discovery.flow,'column','Watch category shortcuts should occupy a single horizontal mobile rail');
 assert.ok(discovery.scrollWidth>discovery.clientWidth,'Mobile readers can swipe to discover the other product categories');
 assert.equal(await page.locator('.am-discovery-paths a.am-discovery-path').count(),3,'All three verified watch collections remain discoverable');


 // Gallery and detailed presentation must both remain functional on Android.
 const galleryButton=page.locator('#affViewGallery'),detailButton=page.locator('#affViewDetail');
 await galleryButton.waitFor({state:'visible'});
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'gallery','First-time mobile visitor sees the visual gallery');
 assert.equal(await galleryButton.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#affGrid .am-gallery-facts').count(),15,'Every gallery watch shows factual movement and case dimensions');
 for(const [id,width,dimensions] of [['casio-mtp-b145','35','40 × 35 × 7,4 mm'],['casio-a168wa','36,3','38,6 × 36,3 × 9,6 mm'],['casio-mdv107','44,2','49,5 × 44,2 × 12,1 mm']]){
   const fact=page.locator('#affGrid .aff-card[data-watch-id="'+id+'"] .am-gallery-facts span').last();
   assert.equal(await fact.innerText(),'Largeur '+width+' mm','A rectangular width must not be called a diameter: '+id);
   assert.ok((await fact.getAttribute('aria-label')).includes(dimensions),'Full L × l × H accessible to screen readers: '+id);
 }
 assert.equal(await page.locator('#affGrid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),2,'Photo gallery displays two responsive columns on mobile');
 // Every manufacturer's real photo receives the same neutral stage. Optical
 // style must not depend on the watch dial colour. Keep original pixels intact.
 const galleryStages=await cards.evaluateAll(items=>items.map(card=>{
   const stage=card.querySelector('.aff-illustration');
   const picture=stage?.querySelector('img.aff-product-photo');
   const model=card.querySelector('h3');
   return {
     background:stage?getComputedStyle(stage).backgroundImage:'',
     stageWidth:stage?.getBoundingClientRect().width||0,
     stageHeight:stage?.getBoundingClientRect().height||0,
     modelMinHeight:model?parseFloat(getComputedStyle(model).minHeight):0,
     picture:!!picture
   };
 }));
 assert.equal(galleryStages.length,15,'All watch models must be present in the photo-first gallery');
 assert.ok(galleryStages.every(item=>item.picture),'Every approved model retains its genuine source photo');
 assert.equal(new Set(galleryStages.map(item=>item.background)).size,1,'Different dial colours must not change the neutral photo stage');
 assert.ok(galleryStages.every(item=>item.stageWidth>100&&item.stageHeight>110),'Mobile photos must have a useful and consistent presentation area');
 assert.ok(galleryStages.every(item=>item.modelMinHeight>20),'Model names must retain space for two lines');
 const gallerySource=page.locator('#affGrid .aff-card[data-watch-id="casio-mtp-1302"] img.aff-product-photo');
 assert.ok((await gallerySource.getAttribute('sizes'))?.includes('(max-width: 760px) 46vw'),'Two-column gallery must request half-viewport WebP images, not full-viewport bytes');

 await detailButton.click();
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'detail');
 assert.equal(await page.locator('#affGrid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),1,'Detailed view remains one large card per row on Android');
 assert.ok((await page.locator('#affGrid .aff-card[data-watch-id="casio-mtp-1302"] img.aff-product-photo').getAttribute('sizes'))?.includes('(max-width: 680px) 92vw'),'Full-width detailed card must advertise its actual image width');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#affGrid .aff-card').first().waitFor({state:'visible'});
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'detail','Saved viewing preference survives reload');
 await page.locator('#affViewGallery').click();
 assert.equal(await page.locator('#affGrid').getAttribute('data-view'),'gallery');
 assert.ok((await page.locator('#affGrid .aff-card[data-watch-id="casio-mtp-1302"] img.aff-product-photo').getAttribute('sizes'))?.includes('(max-width: 760px) 46vw'),'Switching views must update existing responsive image sizes without remounting cards');
 await checkWidth('Mobile gallery and its controls');
 const chatLauncher=page.locator('#chatLauncher');
 const launcherBox=await chatLauncher.boundingBox();
 assert.ok(launcherBox&&launcherBox.width<=60&&launcherBox.height<=60,'Compact assistant button must not cover large parts of mobile product photos');
 assert.match(await chatLauncher.getAttribute('aria-label'),/assistant/i,'Icon-only help control must preserve an accessible name');
 await chatLauncher.click();
 assert.ok(await page.locator('#chatPanel').isVisible(),'Assistant still opens from compact mobile button');
 await page.locator('#chatClose').click();
 assert.ok(!(await page.locator('#chatPanel').isVisible()),'Mobile assistant can be closed');


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
 const paidCardNote=page.locator('#affGrid .aff-card[data-watch-id="citizen-tsuyosa"] .am-affiliate-note');
 assert.match(await paidCardNote.innerText(),/Lien rémunéré/,'The gallery must preserve an explicit compensation disclosure on each paid card');
 assert.ok((await paidCardNote.innerText()).length<150,'Global statement is not repeated in every narrow mobile card');
 assert.equal(await page.locator('.aff-disclosure').locator('text=En tant que Partenaire Amazon').count(),1,'The global required Amazon disclosure appears exactly once');
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
 assert.match(await heroPhoto.getAttribute('srcset'),/watch-responsive\/tissot-prx-quartz-480\.webp/,'Switching featured watches must use local responsive WebP candidates');
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
 const editorialImages=await page.locator('#amEditorialGrid .am-story-img').evaluateAll(imgs=>
   imgs.map(img=>({srcset:img.getAttribute('srcset')||'',sizes:img.getAttribute('sizes')||''})));
 assert.equal(editorialImages.length,3);
 assert.ok(editorialImages.every(img=>img.srcset.includes('/assets/watch-responsive/')&&img.sizes.includes('82vw')),
   'Mobile editorial cards must request responsive approved WebP photos at actual carousel width');
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
 assert.equal(await cards.count(),2,'Two circular watches have documented diameter at most 38 mm');
 await page.locator('#affDiameter').selectOption('medium');
 assert.equal(await cards.count(),7,'Seven documented cases have diameter above 38 and at most 40 mm');
 await page.locator('#affDiameter').selectOption('unknown');
 assert.equal(await cards.count(),5,'Five catalogue references have no manufacturer-defined circular diameter, including rectangular cases');
 assert.ok(await page.locator('#affActiveFilters .am-filter-chip').count()>=1);
 await page.locator('#affActiveFilters .am-filter-chip',{hasText:'Diamètre à confirmer'}).click();
 assert.equal(await cards.count(),15,'Clearing diameter chip restores the catalogue');
 await page.locator('#affSort').selectOption('diameter-asc');
 assert.match(await cards.first().innerText(),/LTP-1302PD/,'Ascending diameter places 30.2mm first');
 await page.locator('#affSort').selectOption('diameter-desc');
 assert.match(await cards.first().innerText(),/SRPD55/,'Descending diameter places verified 42.5 mm Seiko first');
 await page.locator('#affSort').selectOption('editorial');
 await page.locator('#affMovement').selectOption('eco-drive');
 assert.equal(await cards.count(),1,'Eco-Drive movement must show the matching Citizen');
 await page.locator('#affMovement').selectOption('automatic');
 assert.equal(await cards.count(),7,'Seven mechanical automatic references in the original catalogue');
 await page.locator('#affMovement').selectOption('all');
 // Search only real catalogue facts: model references, sourced glass and
 // resistance, accented French measurements and multiple combined terms.
 const searchInput=page.locator('#affSearch');
 assert.equal(await searchInput.getAttribute('aria-describedby'),'affSearchHint','Source-grounded search help must be accessible');
 assert.ok(await page.locator('#affSearchHint').isVisible(),'Search help must render on Android');
 await searchInput.fill('saphir 40 mm');
 assert.deepEqual((await cards.evaluateAll(items=>items.map(x=>x.dataset.watchId))).sort(),
   ['citizen-tsuyosa','tissot-prx-auto','tissot-prx-quartz'].sort(),
   'Combined 40 mm sapphire query must match only documented watches');
 await searchInput.fill('Seiko 42,5 Hardlex');
 assert.equal(await cards.count(),1,'French decimal comma and verified Hardlex should combine');
 assert.equal(await cards.first().getAttribute('data-watch-id'),'seiko-5');
 await searchInput.fill('casio 20 bar');
 assert.equal(await cards.count(),1,'Only the exact Casio diver reference claims 20 bar');
 assert.equal(await cards.first().getAttribute('data-watch-id'),'casio-mdv107');
 await searchInput.fill('T1374101104100');
 assert.equal(await cards.count(),1,'Model code copied without punctuation identifies the exact Tissot PRX');
 assert.equal(await cards.first().getAttribute('data-watch-id'),'tissot-prx-quartz');
 await searchInput.fill('casio MTP-B145');
 assert.equal(await cards.count(),1,'Partial hyphenated Casio code is searchable');
 assert.equal(await cards.first().getAttribute('data-watch-id'),'casio-mtp-b145');
 await searchInput.fill('Seiko 20bar');
 assert.equal(await cards.count(),0,'Contradictory undocumented facts must never return a false match');
 await searchInput.fill('ref-does-not-exist-987');
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
 const originalThree=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')||'[]'));
 assert.equal(originalThree.length,3,'Three watch IDs are persisted before replacement');
 const incoming=await cards.nth(3).getAttribute('data-watch-id');
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).click();
 const picker=page.locator('#affCompareReplaceDialog');
 await picker.waitFor({state:'visible',timeout:5000});
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),3,'Three comparison slots are preserved while the replacement picker is open');
 assert.equal(await picker.locator('.am-replace-choice').count(),3,'Offer one explicit replacement option for each of the three selected models');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).isChecked(),false,'A pending fourth item is not yet selected');
 assert.match(await picker.locator('#affReplaceHint').innerText(),/Les deux autres seront conservées/,'Replacement semantics are explained before confirmation');
 await page.locator('#affReplaceCancel').click();
 assert.ok(!(await picker.isVisible()),'Cancellation closes replacement picker');
 assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1'))),originalThree,'Cancelling preserves all three original watches');
 await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).click();
 await picker.waitFor({state:'visible',timeout:5000});
 // Replace only slot 3: the first two original models remain available for the
 // existing two-watch comparison and its model-specific specifications.
 await picker.locator('.am-replace-choice').last().click();
 assert.ok(!(await picker.isVisible()),'Confirming replacement closes modal');
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),3,'Comparison remains capped at exactly three after replacement');
 const replaced=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')));
 assert.deepEqual(replaced,[originalThree[0],originalThree[1],incoming],'Exactly one slot is replaced; the other two keep their order');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(3).isChecked(),true,'New comparison checkbox is checked');
 assert.equal(await page.locator('#affGrid .aff-card input[type="checkbox"]').nth(2).isChecked(),false,'Replaced comparison checkbox is unchecked');
 assert.match(await page.locator('#affCompareNotice').innerText(),/3\/3/,'Full comparator explains that a new model can replace an existing one');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#affCompareSelected .am-compare-selected-chip').last().waitFor({state:'visible',timeout:15000});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1'))),replaced,'Replacement survives a fresh Android page load');
 await page.locator('#affCompareSelected .am-compare-selected-chip').last().click();
 assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2,'Can return to two models in one tap');
 await checkWidth('Mobile comparison dock');
 await page.locator('#affCompareOpen').click();
 await page.locator('#affCompareDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#affCompareBody').evaluate(el=>el.parentElement?.id),'affCompareDialog','Compare body must be a direct child of the dialog, never trapped inside its flex header');
 assert.equal(await page.locator('#affCompareDialog .am-compare-thumb').count(),2,'Comparison must display two real model photos');

 const diffToggle=page.locator('#affCompareOnlyDiff'),diffSummary=page.locator('#affCompareSummary');
 assert.ok(await diffToggle.isEnabled(),'Known differences must enable focused comparison');
 assert.equal(await diffToggle.getAttribute('aria-pressed'),'false');
 const summary=await diffSummary.innerText();
 const diffCount=Number(summary.match(/([0-9]+) critères? différents? sur 5/)?.[1]);
 assert.ok(diffCount>0&&diffCount<=5,'Differences must derive from the five documented criteria: '+summary);
 assert.equal(await page.locator('.am-compare-table thead th[scope="col"]').count(),3,'Column headings must be explicit');
 assert.equal(await page.locator('.am-compare-table tbody th[scope="row"]').count(),6,'Row headings must be explicit');
 await diffToggle.click();
 assert.equal(await diffToggle.getAttribute('aria-pressed'),'true','Assistive technologies get toggle state');
 assert.equal(await page.locator('.am-compare-table tbody tr').count(),diffCount+1,'Only differing rows and detail links remain');
 assert.equal(await page.locator('.am-compare-mobile-card').first().locator('dt').count(),diffCount,'Mobile and desktop filtering must match');
 await diffToggle.focus();
 await page.keyboard.press('Space');
 assert.equal(await diffToggle.getAttribute('aria-pressed'),'false','Space toggles differences mode');
 assert.equal(await page.locator('.am-compare-table tbody tr').count(),6,'All five attributes restored');
 await diffToggle.click();
 const note=page.locator('.am-compare-diff-note');
 if(!(await note.isVisible())){console.error('COMPARISON NOTE DEBUG',await note.evaluateAll(nodes=>nodes.map(n=>[n,n.parentElement,n.parentElement?.parentElement].map(e=>e&&({tag:e.tagName,class:e.className,rect:e.getBoundingClientRect().toJSON(),display:getComputedStyle(e).display,width:getComputedStyle(e).width,flex:getComputedStyle(e).flex,overflow:getComputedStyle(e).overflow})))));await page.screenshot({path:'artifacts/mobile-compare-debug.png',fullPage:true})}
 assert.ok(await note.isVisible(),'Explain factual differences');
 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Comparison must create two readable mobile swipe cards');
 const sizes=page.locator('.am-compare-table tbody tr',{hasText:'Taille du boîtier'});
 assert.equal(await sizes.count(),1,'One comparison row must distinguish circular diameter and rectangular case size');
 assert.match(await sizes.innerText(),/L × l × H 40 × 35 × 7,4 mm/,'Casio MTP-B145 35 mm width is not a circular diameter');
 assert.ok(await page.locator('.am-compare-mobile-track').isVisible(),'Touch carousel must appear on mobile');
 await page.locator('.am-compare-mobile-nav button').last().click();
 await page.waitForFunction(()=>document.querySelector('.am-compare-mobile-position')?.textContent==='2 / 2',{timeout:5000});

 assert.equal(await page.locator('.am-compare-mobile-card').count(),2,'Mobile comparison has a readable entry for each selected watch');
 assert.equal(await page.locator('.am-compare-mobile-photo').count(),2,'Mobile comparison photos must match both selected watches');
 // Replace directly from the second mobile slide without leaving the
 // comparison or losing the other selected model.
 const beforeInline=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')));
 const slideSwap=page.locator('.am-compare-mobile-card').nth(1).locator('.am-compare-inline-swap select');
 assert.ok(await slideSwap.isVisible(),'Mobile comparison shows a native accessible replacement selector');
 assert.equal(await slideSwap.inputValue(),beforeInline[1]);
 assert.equal(await slideSwap.locator('option[value="'+beforeInline[0]+'"]').evaluate(option=>option.disabled),true,'Native option must reject a watch already selected in another slot');
 await slideSwap.selectOption('seiko-5');
 const afterInline=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')));
 assert.deepEqual(afterInline,[beforeInline[0],'seiko-5'],'Inline replacement preserves the other slot and the chosen order');
 assert.ok(await page.locator('#affCompareDialog').isVisible(),'Replacement keeps the comparison dialog open');
 assert.equal(await page.locator('#affCompareOnlyDiff').getAttribute('aria-pressed'),'true','Differences filter persists across replacement');
 assert.match(await page.locator('#affCompareSummary').innerText(),/sur 5/,'Comparison count recalculated');
 assert.equal(await page.locator('.am-compare-mobile-position').innerText(),'2 / 2','Active swipe card remains selected after replacement');
 assert.equal(await page.locator('.am-compare-mobile-card').nth(1).locator('select').inputValue(),'seiko-5','Native picker displays the new model');
 assert.match(await page.locator('.am-compare-table').innerText(),/42,5 mm/,'Comparison facts update to the replacement watch');
 assert.equal(await page.locator('#affGrid .aff-card[data-watch-id="seiko-5"] .am-compare-check input').isChecked(),true,'Catalogue checkboxes sync to inline replacement');
 await page.screenshot({path:'artifacts/mobile-compare-inline-replacement.png',fullPage:true});
 await page.locator('#affCompareClose').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#affCompareSelected .am-compare-selected-chip').first().waitFor({state:'visible',timeout:20000});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1'))),afterInline,'Inline selection survives an Android page reload');
 await page.locator('#affCompareClear').click();

 const citizen=page.locator('#affGrid .aff-card',{hasText:'NJ0150-81X'});
 await citizen.locator('.aff-card-actions button').click();
 await page.locator('#affTabs button[data-tier="favourites"]').click();
 assert.equal(await cards.count(),1,'Favorites collection should show the saved Citizen watch');
 await cards.first().locator('.aff-card-actions a[href^="./montre.html?id="]').click();
 await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#detailTitle').innerText(),/NJ0150-81X/);
 await page.locator('#detailEditorialAdvice').waitFor({state:'visible',timeout:12000});
 assert.equal(await page.locator('#detailAdviceGrid .detail-decision-card').count(),3,'Interactive Citizen detail must show 3 distinct source-backed editorial cards');
 assert.equal(await page.locator('#detailAdviceFacts .detail-decision-fact').count(),3,'Citizen exact reference must show 3 documented evidence fields');
 assert.ok(await page.locator('#detailAdviceShortcut').isVisible(),'The editorial section must be reachable from the fast navigation');
 assert.match(await page.locator('#detailAdviceGrid').innerText(),/bracelet intégré/,'Citizen advice must retain model-specific wording');

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
 // Validate the actual 15-model editorial data end-to-end, not just a
 // placeholder on the first product. Values must agree with the same JSON
 // and the exact catalog specs used by indexable SEO watch pages.
 const editorialSource=JSON.parse(readFileSync('site/editorial-insights.json','utf8'));
 const watchSource=JSON.parse(readFileSync('site/selection-affiliation.json','utf8')).products;
 assert.equal(Object.keys(editorialSource.products).length,15);
 const labelByFact={diameter:'Diamètre',caseSize:'Dimensions L × l × H',movement:'Mouvement',glass:'Verre',waterResistance:'Étanchéité'};
 const editorialPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const editorialErrors=[];
 editorialPage.on('pageerror',err=>editorialErrors.push(err.message));
 for(const watch of watchSource){
   const response=await editorialPage.goto(new URL('/montre.html?id='+encodeURIComponent(watch.id),base).href,{waitUntil:'domcontentloaded'});
   assert.ok(response?.ok(),'Dynamic watch route reachable: '+watch.id);
   await editorialPage.locator('#detailEditorialAdvice').waitFor({state:'visible',timeout:12000});
   const insight=editorialSource.products[watch.id];
   assert.ok(insight,'Must have a reviewed exact-model editorial brief: '+watch.id);
   const cardTexts=await editorialPage.locator('#detailAdviceGrid .detail-decision-card p').allTextContents();
   assert.deepEqual(cardTexts,[insight.strength,insight.usage,insight.caution],'Model-specific advice must match SEO editorial source: '+watch.id);
   const factPairs=await editorialPage.locator('#detailAdviceFacts .detail-decision-fact').evaluateAll(nodes=>nodes.map(el=>[
     el.querySelector('dt')?.textContent,el.querySelector('dd')?.textContent
   ]));
   assert.deepEqual(factPairs,insight.facts.map(key=>[labelByFact[key],watch.specs[key]]),
     'All product evidence must come from the exact model specs: '+watch.id);
   assert.equal(await editorialPage.locator('#detailAdviceShortcut').isVisible(),true,'The section must be navigable: '+watch.id);
   const extent=await editorialPage.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
   assert.ok(extent.scroll<=extent.client+2,'Editorial product layout has overflow: '+watch.id);
 }
 assert.deepEqual(editorialErrors,[],'15 watch editorial screens should have no runtime errors');
 await editorialPage.close();
 // All indexable SEO pages must zoom the exact, approved watch photograph
 // with the shared viewer, never inventing extra angles or losing focus.
 const seoPhoto=await browser.newPage({viewport:{width:393,height:852},
   isMobile:true,hasTouch:true,locale:'fr-FR'});
 const photoErrors=[];
 seoPhoto.on('pageerror',e=>photoErrors.push(e.message));
 for(const watch of watchSource){
   const response=await seoPhoto.goto(new URL('/montres/'+watch.id+'.html',base).href,
     {waitUntil:'domcontentloaded'});
   assert.ok(response?.ok(),'Indexable product route reachable: '+watch.id);
   const trigger=seoPhoto.locator('.watch-photo-zoom');
   const authorized=watch.photoReview?.publicUsageApproved===true&&
     watch.photoReview?.localUrl==='./assets/watches/'+watch.id+'.webp';
   if(!authorized){
     assert.equal(await trigger.count(),0,'No zoom when photo permission is missing: '+watch.id);
     continue;
   }
   assert.equal(await trigger.count(),1,'One genuine photo zoom link: '+watch.id);
   assert.equal(await trigger.getAttribute('href'),'../assets/watches/'+watch.id+'.webp');
   const bounds=await trigger.boundingBox();
   assert.ok(bounds&&bounds.height>=44&&bounds.width>=44,'Touch zoom control: '+watch.id);
   await trigger.click();
   const dialog=seoPhoto.locator('#amPhotoDialog');
   await dialog.waitFor({state:'visible'});
   assert.equal(await dialog.locator('.am-photo-large').getAttribute('src'),
     '../assets/watches/'+watch.id+'.webp','Exact model in viewer: '+watch.id);
   await seoPhoto.waitForFunction(()=>{
     const img=document.querySelector('#amPhotoDialog .am-photo-large');
     return img?.complete&&img.naturalWidth>100&&!img.hidden;
   },null,{timeout:15000});
   assert.equal(await dialog.locator('.am-photo-official').getAttribute('href'),
     watch.officialUrl,'Manufacturer link in viewer: '+watch.id);
   assert.equal(await dialog.locator('.am-photo-prev').isDisabled(),true,'No fabricated angles');
   assert.equal(await dialog.locator('.am-photo-next').isDisabled(),true,'No fabricated angles');
   if(watch.id==='citizen-tsuyosa')
     await seoPhoto.screenshot({path:'artifacts/mobile-seo-product-photo-zoom.png'});
   await seoPhoto.keyboard.press('Escape');
   await dialog.waitFor({state:'hidden'});
   assert.ok(await trigger.evaluate(el=>document.activeElement===el),
     'Escape restores keyboard focus: '+watch.id);
   const measured=await seoPhoto.evaluate(()=>({
     width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(measured.scroll<=measured.width+2,'No layout overflow: '+watch.id);
 }
 assert.deepEqual(photoErrors,[],'No errors in 15 SEO photograph viewers');
 await seoPhoto.close();
 const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:393,height:852}});
 const noScriptPage=await noScript.newPage();
 await noScriptPage.goto(new URL('/montres/citizen-tsuyosa.html',base).href);
 const sourceLink=noScriptPage.locator('a.watch-photo-zoom');
 assert.ok(await sourceLink.isVisible(),'No-JavaScript fallback link visible');
 const sourceUrl=new URL(await sourceLink.getAttribute('href'),noScriptPage.url());
 assert.ok((await noScriptPage.request.get(sourceUrl.href)).ok(),'Fallback WebP must be reachable');
 await noScript.close();
 console.log('PASS: 15 SEO watch photo lightboxes, exact images, Escape focus and no-JS fallback');
 // Non-critical editorial feed failure must keep the primary technical
 // product page, genuine photo, official link and comparison usable.
 const unavailable=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await unavailable.route('**/editorial-insights.json',route=>route.fulfill({status:503,body:'Unavailable'}));
 await unavailable.goto(new URL('/montre.html?id=citizen-tsuyosa',base).href,{waitUntil:'domcontentloaded'});
 await unavailable.locator('#detailShell').waitFor({state:'visible'});
 assert.equal(await unavailable.locator('#detailEditorialAdvice').isHidden(),true,'Unavailable supplementary feed remains hidden');
 assert.equal(await unavailable.locator('#detailAdviceShortcut').isHidden(),true,'Unavailable editorial feed must not leave broken navigation visible');
 assert.match(await unavailable.locator('#detailTitle').innerText(),/NJ0150-81X/);
 assert.ok(await unavailable.locator('#detailOfficial').isVisible());
 await unavailable.close();
 const zoomed=await browser.newPage({viewport:{width:320,height:640},isMobile:true,hasTouch:true});
 await zoomed.goto(new URL('/montre.html?id=casio-mtp-b145',base).href,{waitUntil:'domcontentloaded'});
 await zoomed.locator('#detailEditorialAdvice').waitFor({state:'visible'});
 const zoomExtent=await zoomed.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 assert.ok(zoomExtent.scroll<=zoomExtent.client+2,'320px source-backed editorial cards must reflow');
 await zoomed.screenshot({path:'artifacts/mobile-320-editorial-decision.png',fullPage:true});
 await zoomed.close();
 console.log('PASS: 15 dynamic product briefs, exact source-backed facts, failed-feed fallback and 320px editorial layout');

 console.log('PASS: responsive header, 15 owner-authorized source photos, filters, comparator, favorites and product navigation');

 const desktop=await browser.newPage({viewport:{width:1366,height:850},locale:'fr-FR'});
 await desktop.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#amEditorialGrid .am-story-card').first().waitFor({state:'visible',timeout:20000});
 assert.equal(await desktop.locator('#amEditorialGrid .am-story-card').count(),3,'Desktop editorial photography layout');
 assert.equal(await desktop.locator('#heroVariants .am-hero-option').count(),4,'Desktop hero selection');
 // Desktop also offers the replacement picker inside the comparison table.
 await desktop.locator('#affGrid .aff-card .am-compare-check input').nth(0).check();
 await desktop.locator('#affGrid .aff-card .am-compare-check input').nth(1).check();
 await desktop.locator('#affCompareOpen').click();
 await desktop.locator('#affCompareDialog').waitFor({state:'visible',timeout:10000});
 const desktopSwap=desktop.locator('.am-compare-table .am-compare-inline-swap select').first();
 assert.ok(await desktopSwap.isVisible(),'Desktop table allows inline model switching');
 await desktopSwap.selectOption('seiko-sharp');
 assert.equal(await desktop.locator('.am-compare-table .am-compare-inline-swap select').first().inputValue(),'seiko-sharp');
 assert.match(await desktop.locator('.am-compare-table').innerText(),/39,3 mm/,'Desktop comparison facts update immediately');
 assert.ok(await desktop.locator('#affCompareDialog').isVisible(),'Table stays open while replacing a watch');
 await desktop.locator('#affCompareClose').click();
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
