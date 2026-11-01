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
 // The 37 additional popular/editorial models are a clearly separated
 // commercial discovery path, not fake 15-card catalog entries.
 const popular=page.locator('#modeles-populaires');
 assert.ok(await popular.isVisible(),'Popular sourced watches should be visible below the core catalogue');
 assert.equal(await popular.locator('article.am-pick-card').count(),8,'Eight source-backed homepage ideas should render, including the exact ASIN option');
 assert.equal(await popular.locator('a[data-amazon-search-id]').count(),3,
   'Three unverified homepage referrals must remain clearly labeled as searches');
 assert.equal(await popular.locator('a[data-amazon-product]').count(),5,
   'Five featured watches have documented Amazon.fr ASINs');
 assert.equal(await popular.locator('#pick-casio-gw-m5610u-1 a[data-amazon-product]').getAttribute('href'),
   'https://www.amazon.fr/dp/B09BCPP68Q?tag=drackk04-21',
   'Homepage direct link must match confirmed Amazon.fr ASIN and owner tag');
 assert.equal(await popular.locator('#pick-casio-f91w-1 a[data-amazon-product]').getAttribute('href'),
  'https://www.amazon.fr/dp/B000J34HN4?tag=drackk04-21','Featured Casio F-91W must link to documented ASIN');
 assert.equal(await popular.locator('#pick-casio-ga-2100-1a1 a[data-amazon-product]').getAttribute('href'),
  'https://www.amazon.fr/dp/B07WGJ1JNW?tag=drackk04-21','Featured black G-SHOCK must link to documented ASIN');
 for(const [id,asin] of [['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
   assert.equal(await popular.locator('#pick-'+id+' a[data-amazon-product]').getAttribute('href'),
     'https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21','Source-verified affiliate destination on homepage: '+id);
 }
 const popularSearch=popular.locator('a[data-amazon-search-id]').first();
 assert.ok((await popularSearch.getAttribute('href')).startsWith('https://www.amazon.fr/s?k='),
   'Do not manufacture an exact ASIN link for the new model');
 assert.match(await popularSearch.getAttribute('rel'),/sponsored/,
   'Popular Amazon search must disclose sponsorship');
 await popular.scrollIntoViewIfNeeded();
 const popularExtent=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(popularExtent.scroll<=popularExtent.client+2,'Popular cards must not overflow mobile');
 await page.screenshot({path:'artifacts/mobile-popular-watch-discovery.png',fullPage:true});

 // The primary catalogue is now 52 models, not two disconnected discovery experiences.
 const allWatches=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
 const allUrl=new URL('/montres/toutes-les-montres.html?compare=skmei-2056,citizen-tsuyosa#comparer',base).href;
 assert.ok((await allWatches.goto(allUrl,{waitUntil:'domcontentloaded'}))?.ok());
 assert.equal(await allWatches.locator('article.ud-card').count(),52,'All 52 real models must exist as static HTML');
 await allWatches.locator('#udFilters:visible').waitFor({timeout:20000});
 assert.equal(await allWatches.locator('#udCompareTable table').count(),1,
   'Advisor links must be able to compare mixed core and supplementary watches');
 assert.equal(await allWatches.locator('#udCompareTable th[scope=col]').count(),3,
   'A mixed two-model comparison must render a table with two real watches');
 assert.equal(await allWatches.locator('.ud-select[aria-pressed=true]').count(),2);
 const fullExtent=await allWatches.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(fullExtent.scroll<=fullExtent.client+2,'Unified 52-watch catalogue must not overflow Android');
 await allWatches.locator('#udSearch').fill('SKMEI 2056');
 assert.equal(await allWatches.locator('.ud-card:visible').count(),1,'Search must work across brand and model');
 await allWatches.locator('#udFilters button[type=reset]').click();
 await allWatches.waitForFunction(()=>document.querySelectorAll('.ud-card:not([hidden])').length===52);
 assert.equal(await allWatches.locator('.ud-card:visible').count(),52,'Clearing filters must restore all 52');
 await allWatches.locator('#udBrand').selectOption('SKMEI');
 assert.equal(await allWatches.locator('.ud-card:visible').count(),10,'All ten SKMEI models must be discoverable together');
 await allWatches.locator('#udBrand').selectOption('all');
 await allWatches.locator('#udSize').selectOption('unknown');
 assert.ok(await allWatches.locator('.ud-card:visible').count()>0,'Unknown dimensions must have an honest filter');
 assert.ok(await allWatches.locator('.ud-card:visible').count()<52,'Unknown dimensions must be distinguished from known values');
 await allWatches.close();
 const allNoJs=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,javaScriptEnabled:false});
 await allNoJs.goto(new URL('/montres/toutes-les-montres.html',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(await allNoJs.locator('.ud-card:visible').count(),52,'52 model links must remain usable without JS');
 assert.equal(await allNoJs.locator('#udFilters:visible').count(),0,'No-JS filters must not be presented as functional');
 await allNoJs.close();
 const unifiedAdvisor=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await unifiedAdvisor.goto(new URL('/conseiller.html',base).href,{waitUntil:'domcontentloaded'});
 await unifiedAdvisor.locator('.advisor-card').first().waitFor({state:'visible',timeout:15000});
 assert.match(await unifiedAdvisor.locator('#advisorStatus').innerText(),/parmi 52/);
 const link52=await unifiedAdvisor.locator('#advisorCompare').getAttribute('href');
 assert.ok(link52?.includes('toutes-les-montres.html?compare='));
 await unifiedAdvisor.close();

 const popularPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
 await popularPage.goto(new URL('/montres/modeles-populaires.html',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(await popularPage.locator('article.am-pick-card').count(),37,'All supplemental watch models on one source-backed page');
 const focus=popularPage.locator('#selection-10-montres');
 assert.equal(await focus.locator('li.am-focus-item').count(),10,
   'Ten editorial priority watches must be visible without JavaScript');
 assert.equal(await focus.locator('a.am-focus-detail').count(),10,
   'Every priority must preserve a factual internal model page');
 assert.equal(await focus.locator('.am-focus-merchant a').count(),10,
   'Ten shortlist cards must offer an honest one-step merchant option');
 assert.equal(await focus.locator('a[data-amazon-product]').count(),5,
   'Only five of the shortlist models have a documented exact Amazon product page');
 assert.equal(await focus.locator('a[data-merchant-official-id]').count(),5,
   'Five unverified Amazon models should point to the product-specific vendor source instead');
 assert.equal(await focus.locator('a[data-amazon-search-id]').count(),0,
   'Shortlist must never present a generic Amazon search as a direct seller option');
 const paganiSeller=focus.locator('[data-focus-id="pagani-pd1776"] .am-focus-merchant a');
 assert.equal(await paganiSeller.getAttribute('href'),'https://paganidesign.com/products/pd-1776',
   'PD-1776 primary seller destination must open a specific product page');
 assert.doesNotMatch(await paganiSeller.getAttribute('rel'),/sponsored/,
   'Pagani supplier link must not invent an unapproved commission');
 const adAmazon=focus.locator('[data-focus-id="addiesdive-ad2030"] .am-focus-merchant a');
 assert.equal(await adAmazon.getAttribute('href'),
   'https://www.amazon.fr/dp/B0DNK5TT6D?tag=drackk04-21');
 assert.match(await adAmazon.getAttribute('rel'),/sponsored/);
 assert.match(await focus.locator('[data-focus-id="addiesdive-ad2030"]').innerText(),
   /Variante de la fiche Amazon/,'Verify the advertised variant before visiting Amazon');
 assert.equal(await focus.locator('.am-focus-with-photo img').count(),7,
   'Seven shortlist photos must match declared-rights model assets');
 for(const id of ['skmei-2056','skmei-2256','skmei-2514','addiesdive-ad2030','pagani-pd1701']){
   const item=focus.locator('[data-focus-id="'+id+'"]');
   assert.equal(await item.count(),1,'High-priority affordable model represented once: '+id);
   assert.equal(await item.locator('a.am-focus-detail').getAttribute('href'),'./'+id+'.html');
 }
 assert.match(await focus.innerText(),/Ce n’est ni un classement des ventes en France/,
   'Shortlist is not a fabricated ranking by sales volume');
 assert.ok(await popularPage.locator('a[href="./toutes-les-montres.html"]').count()>0,
   'No featured shortlist can hide the complete 52-watch catalogue');
 const focusDimensions=await popularPage.evaluate(()=>({
   client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
 }));
 assert.ok(focusDimensions.scroll<=focusDimensions.client+2,'Shortlist must fit Android width');
 await focus.screenshot({path:'artifacts/android-commercial-shortlist.png'});

 // Each SEO selection must work on Android without a filter, script or shop account.
 for (const slug of ['montres-femme-accessibles','montres-homme-style-accessible','montres-automatiques-selection']) {
   const curated=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
   const response=await curated.goto(new URL('/montres/'+slug+'.html',base).href,{waitUntil:'domcontentloaded'});
   assert.ok(response?.ok(),'Curated SEO landing page must load '+slug);
   assert.equal(await curated.locator('article.am-shopper-card').count(),6,'Six traceable watch options '+slug);
   assert.equal(await curated.locator('.am-shopper-nav a').count(),3,'All three categories must be linked '+slug);
   assert.equal(await curated.locator('.am-shopper-card h2 a').count(),6,'Every title must link its model facts '+slug);
   assert.equal(await curated.locator('a.am-shopper-action').count(),6,'Every watch needs a real merchant or manufacturer exit '+slug);
   const dimensions=await curated.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.client+2,'Curated cards must not overflow Android '+slug);
   await curated.screenshot({path:'artifacts/android-selection-'+slug+'.png',fullPage:true});
   await curated.close();
 }

 assert.equal(await popularPage.locator('.am-picks-tier').count(),3,'All three editorial ranges are represented');
 assert.equal(await popularPage.locator('a[data-amazon-search-id]').count(),30,'Thirty variants without documented ASINs must use labeled search results');
 assert.equal(await popularPage.locator('a[data-amazon-product]').count(),12,
   'Seven original exact products plus five direct-merchant shortlist cards are attributed without new ASINs');
 const confirmedGshock=popularPage.locator('#pick-casio-gw-m5610u-1 a[data-amazon-product]');
 assert.equal(await confirmedGshock.getAttribute('href'),'https://www.amazon.fr/dp/B09BCPP68Q?tag=drackk04-21');
 assert.equal(await confirmedGshock.getAttribute('data-amazon-placement'),'popular');
 for(const [id,asin] of [['casio-a158wea-1','B000GAYQJ0'],['casio-ga-2100-1a1','B07WGJ1JNW'],['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
   const exact=popularPage.locator('#pick-'+id+' a[data-amazon-product]');
   assert.equal(await exact.count(),1,'Verified Amazon.fr product link required for '+id);
   assert.equal(await exact.getAttribute('href'),'https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21','Exact attributed destination for '+id);
   assert.equal(await popularPage.locator('#pick-'+id+' a[data-amazon-search-id]').count(),0,'Do not substitute a generic search for '+id);
 }
 assert.match(await confirmedGshock.getAttribute('rel'),/sponsored/);
 const approvedWatchPhotos=JSON.parse(readFileSync('site/popular-photo-rights.json','utf8')).photos;
 const approvedPhotoCount=Object.keys(approvedWatchPhotos).length;
 assert.equal(await popularPage.locator('img.am-pick-licensed-photo').count(),approvedPhotoCount,
   'All and only registered branded images should render in the supplemental catalogue');
 const visualResearch=JSON.parse(readFileSync('site/popular-ai-visuals.json','utf8')).visuals;
 assert.equal(await popularPage.locator('figure.am-pick-ai-preview').count(),9,
   'Nine SKMEI original AI concepts must appear in catalogue as secondary visuals');
 for(const [id,art] of Object.entries(visualResearch)){
   const card=popularPage.locator('#pick-'+id);
   const ai=card.locator('figure.am-pick-ai-preview img');
   assert.equal(await ai.getAttribute('src'),art.url,'AI visual must match the exact id: '+id);
   assert.match(await ai.getAttribute('alt'),/IA.*non contractuel/i,
     'AI-created images must never look like an official product photo: '+id);
   assert.equal(await card.locator('img.am-pick-licensed-photo').count(),1,
     'Original watch photograph remains primary above the AI concept: '+id);
 }
 const popularPageExtent=await popularPage.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(popularPageExtent.scroll<=popularPageExtent.client+2,'Supplemental page must not overflow Android');
 await popularPage.screenshot({path:'artifacts/mobile-37-popular-watches.png',fullPage:true});
 // Accessible progressive enhancement: filters must be functional on Android,
 // preserve one exact Amazon destination and never hide source content without JS.
 const filterForm=popularPage.locator('#am-pick-filters');
 assert.ok(await filterForm.isVisible(),'Source-backed collection filters should activate when JavaScript runs');
 assert.equal(await popularPage.locator('#am-pick-filter-count').innerText(),'37 modèles sur 37');
 await popularPage.locator('#am-filter-style').selectOption('sport');
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),10,
   'Sport style includes documented G-SHOCKs, Seiko 5, Citizen, Orient and Speedtimer');
 await popularPage.locator('#am-filter-tier').selectOption('signature');
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),4,
   'Sport Signature includes G-SHOCK, Seiko 5, Citizen Promaster and Orient Mako');
 await popularPage.locator('#am-filter-movement').selectOption('solar');
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),2,
   'Solar sport Signature includes GW-M5610U and Citizen Eco-Drive');
 assert.ok(await popularPage.locator('#pick-casio-gw-m5610u-1').isVisible(),
   'Verified direct-to-Amazon watch must remain discoverable through filters');
 await popularPage.locator('#am-filter-query').fill('référence introuvable');
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),0,
   'Impossible search must not show unrelated watches');
 assert.ok(await popularPage.locator('#am-pick-filter-empty').isVisible(),'Accessible empty state must be displayed');
 assert.match(await popularPage.locator('#am-pick-filter-count').innerText(),/^0 modèle sur 37$/);
 await filterForm.locator('button[type=reset]').click();
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),37,
   'Reset must restore all 37 products and not remove existing links');
 assert.equal(await popularPage.locator('.am-picks-tier:visible').count(),3);
 assert.equal(await popularPage.locator('#am-pick-filter-count').innerText(),'37 modèles sur 37');
 await popularPage.locator('#am-filter-query').fill('Tsuyósa');
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),1,
   'Accent-insensitive exact-model lookup should find Citizen Tsuyosa');
 assert.ok(await popularPage.locator('#pick-citizen-tsuyosa-37-blue').isVisible());
 await popularPage.locator('.am-picks-tier-nav a[href="#gamme-prestige"]').click();
 assert.equal(await popularPage.locator('#am-picks-list .am-pick-card:visible').count(),37,
   'Existing collection tier anchor links must reset filters instead of pointing to hidden categories');
 await popularPage.screenshot({path:'artifacts/mobile-filterable-popular-watches.png',fullPage:true});
 const noJs=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,
   locale:'fr-FR',javaScriptEnabled:false});
 const fallbackResponse=await noJs.goto(new URL('/montres/modeles-populaires.html',base).href,
   {waitUntil:'domcontentloaded'});
 assert.ok(fallbackResponse?.ok(),'Progressive-enhancement fallback should load without JavaScript');
 assert.equal(await noJs.locator('.am-pick-card:visible').count(),37,
   'JavaScript disabled must preserve all source-backed watch ideas');
 assert.equal(await noJs.locator('#am-pick-filters:visible').count(),0,
   'Non-functional controls must not be exposed without JavaScript');
 assert.equal(await noJs.locator('a[data-amazon-search-id]').count(),30);
 assert.equal(await noJs.locator('a[data-amazon-product]').count(),12,
   'Without JavaScript, all seven original and five shortlist exact Amazon options remain clickable');
 assert.equal(await noJs.locator('#selection-10-montres .am-focus-merchant a').count(),10,
   'Ten seller-specific choices remain visible without scripting');
 await noJs.close();
 console.log('PASS: 37 source-backed watches filtered by tier, style, movement and accented search, with no-JS fallback');

 // High-intent landing pages: each supplemental model must have a distinct,
 // indexable, source-backed product page and an honest Amazon search exit.
 const supplemental=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
 const verifiedPopular=JSON.parse(readFileSync('research/amazon-fr-popular-verified.json','utf8')).verifiedProducts;
 for(const watch of supplemental){
   const response=await popularPage.goto(new URL('/montres/'+watch.id+'.html',base).href,{waitUntil:'load'});
   await popularPage.evaluate(()=>document.fonts?.ready); // Measure after external CSS/fonts settle on Render CDN.
   assert.ok(response?.ok(),'Supplementary model product page reachable: '+watch.id);
   const article=popularPage.locator('article.am-extra-product');
   assert.equal(await article.getAttribute('data-popular-watch-id'),watch.id);
   assert.ok((await popularPage.locator('h1').innerText()).includes(watch.model),
     'Unique SEO title must retain exact manufacturer reference: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-fact').count(),4,'Four factual product attributes: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-editorial-grid>div').count(),2,
     'Model-specific editorial rationale and caution: '+watch.id);
   if(watch.id==='addiesdive-ad2030'||watch.id==='pagani-pd1701'){
     const sourceVariant=verifiedPopular[watch.id]?.marketplaceVariant;
     assert.ok(sourceVariant,'New exact listing must declare color or generation '+watch.id);
     const disclosure=popularPage.locator('.am-extra-merchant-variant');
     assert.equal(await disclosure.count(),1,'Buyer must see marketplace variant before the paid link: '+watch.id);
     assert.ok((await disclosure.innerText()).includes(sourceVariant),'Variant on site must match Amazon provenance: '+watch.id);
   }
   const relatedCards=popularPage.locator('.am-extra-related li');
   assert.equal(await relatedCards.count(),3,'Three contextual live alternatives per watch: '+watch.id);
   const relatedIds=await relatedCards.evaluateAll(nodes=>nodes.map(n=>n.dataset.relatedId));
   assert.equal(new Set(relatedIds).size,3,'Alternatives must be distinct: '+watch.id);
   assert.ok(!relatedIds.includes(watch.id),'No self-recommendation: '+watch.id);
   assert.ok(relatedIds.every(id=>supplemental.some(p=>p.id===id)),'Alternatives must link to documented supplementary watches: '+watch.id);
   assert.equal(await relatedCards.locator('img').count(),relatedIds.filter(id=>Boolean(approvedWatchPhotos[id])).length,
     'Related images must be source-registered real product photos: '+watch.id);
   assert.ok((await popularPage.locator('.am-extra-reference').innerText()).includes(watch.model),
     'Exact manufacturer reference must be displayed before external purchase: '+watch.id);
   assert.equal(await popularPage.locator('.am-extra-related>a[href="./toutes-les-montres.html"]').count(),1,
     'Recommendations must lead to the complete 52-watch comparison: '+watch.id);
   const expectedImage=approvedWatchPhotos[watch.id];
   assert.equal(await popularPage.locator('img.am-extra-licensed-photo').count(),expectedImage?1:0,
     'Only registered exact-model imagery may be published: '+watch.id);
   const aiArt=visualResearch[watch.id];
   assert.equal(await popularPage.locator('section.am-ai-editorial').count(),aiArt?1:0,
     'AI design section is shown only for the nine recorded SKMEI watches: '+watch.id);
   if(aiArt){
     const img=popularPage.locator('.am-ai-editorial-media img');
     assert.equal(await img.getAttribute('src'),aiArt.url,'Product page shows the approved original AI asset: '+watch.id);
     assert.match(await img.getAttribute('alt'),/IA.*non contractuel/i);
     assert.match(await popularPage.locator('.am-ai-editorial-copy').innerText(),/ne s’agit pas d’une photographie du produit/);
   }
   if(expectedImage){
     const img=popularPage.locator('img.am-extra-licensed-photo');
     assert.ok((await img.getAttribute('src')).includes('assets/watches-popular/'+watch.id+'.webp'));
     assert.ok(await img.evaluate(el=>el.complete&&el.naturalWidth>300),
       'Published manufacturer photo must decode correctly: '+watch.id);
   }
 assert.ok(verifiedPopular[watch.id]||watch.id!=='casio-gw-m5610u-1',
   'The confirmed reference must exist in the verified Amazon registry');
 const verified=verifiedPopular[watch.id];
 const commercial=popularPage.locator(verified?'a[data-amazon-product]':'a[data-amazon-search-id]');
 assert.equal(await commercial.count(),1,
   'Paid destination must be exactly one product or search link: '+watch.id);
 assert.equal(await commercial.getAttribute(verified?'data-amazon-product':'data-amazon-search-id'),watch.id);
 assert.match(await commercial.getAttribute('rel'),/sponsored/);
 const merchant=new URL(await commercial.getAttribute('href'));
 assert.equal(merchant.origin,'https://www.amazon.fr');
 assert.equal(merchant.searchParams.get('tag'),'drackk04-21');
 if(verified){
   assert.match(await popularPage.locator('.am-extra-link-status').innerText(),/Fiche Amazon.fr correspondant au code modèle/,
     'A documented exact listing must be identified to the visitor: '+watch.id);
   assert.equal(merchant.pathname,'/dp/'+verified.asin,'Use only a source-verified exact ASIN: '+watch.id);
   assert.equal(await popularPage.locator('a[data-amazon-search-id]').count(),0,
     'Never mix a direct link and a search CTA for the same confirmed model: '+watch.id);
   assert.match(await popularPage.locator('.am-extra-disclosure').innerText(),/Correspondance du code modèle vérifiée/,
     'Exact-match evidence and price/stock limitations must be visible: '+watch.id);
 }else{
   assert.match(await popularPage.locator('.am-extra-link-status').innerText(),/Recherche Amazon.fr — modèle non garanti/,
     'An Amazon search must never appear as a confirmed exact offer: '+watch.id);
   assert.equal(merchant.pathname,'/s','Non-confirmed watches must remain search links: '+watch.id);
   assert.ok(merchant.searchParams.get('k').includes(watch.model),
     'Search must include the manufacturer model reference: '+watch.id);
   assert.equal(await popularPage.locator('a[data-amazon-product]').count(),0,
     'Unverified watches must not publish direct ASINs: '+watch.id);
 }
   assert.equal(await popularPage.locator('.am-extra-actions a').last().getAttribute('href'),
     watch.officialUrl,'Official photos link must be model-specific: '+watch.id);
   const overflow=await popularPage.evaluate(()=>({
     client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   assert.ok(overflow.scroll<=overflow.client+2,'Individual watch page must fit Android: '+watch.id+' '+JSON.stringify(overflow));
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
 console.log('PASS: 37 SEO watch pages, seven documented Amazon.fr ASINs, thirty honest searches, exact variants and Android reflow');
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
