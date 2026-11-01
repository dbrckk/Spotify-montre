import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {responsiveSrcset} from './responsive-images.mjs';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadPopularAiVisuals} from './popular-ai-visuals.mjs';
import {commercialShortlist} from './build-commercial-shortlist.mjs';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';
const root=resolve(process.cwd(),'site');
const read=p=>readFileSync(resolve(root,p),'utf8');
const feed=JSON.parse(read('selection-affiliation.json'));
const manifest=JSON.parse(read('seo-manifest.json'));
assert.equal(manifest.productCount,15);
assert.equal(manifest.popularAdditionalCount,37,'37 researched models complement the 15 photo-backed core products');
assert.equal(manifest.popularDetailCount,37,'Every supplemental model requires a dedicated factual landing page');
assert.equal(manifest.popularAffiliateDirectLinks,manifest.affiliateActive?7:0,'Only source-verified supplementary ASINs may become direct product links');
assert.equal(manifest.popularAffiliateSearchLinks,manifest.affiliateActive?30:0,'All remaining supplemental products require labeled Amazon searches');
const insightData=JSON.parse(read('editorial-insights.json'));
assert.equal(insightData.version,1);
assert.equal(Object.keys(insightData.products).length,15,'15 unique editorial briefs required');
const editorialTexts=new Set();
for(const p of feed.products){
 const insight=insightData.products[p.id];
 assert.ok(insight,'No editorial copy for '+p.id);
 const pageHtml=read('montres/'+p.id+'.html');
 assert.equal((pageHtml.match(/class="watch-decision-grid"/g)||[]).length,1,'One decision grid per product '+p.id);
 assert.match(pageHtml,/href="#avis-editorial"/,'Editorial anchor missing '+p.id);
 assert.match(pageHtml,/sans prétendre avoir essayé ce modèle/,'No fabricated hands-on claim '+p.id);
 for(const key of ['strength','usage','caution']){
   assert.ok(typeof insight[key]==='string'&&insight[key].length>=45,'Invalid editorial copy '+p.id+'/'+key);
   assert.ok(!editorialTexts.has(insight[key]),'Duplicated product advice '+p.id+'/'+key);
   editorialTexts.add(insight[key]);
   const escaped=insight[key].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
   assert.ok(pageHtml.includes(escaped),'Generated advice differs from catalogue '+p.id+'/'+key);
 }
 for(const fact of insight.facts){
   assert.ok(typeof p.specs?.[fact]==='string'&&p.specs[fact].trim(),'Unverified fact '+p.id+'/'+fact);
   assert.ok(pageHtml.includes(p.specs[fact].replace(/&/g,'&amp;')),'Product fact not shown '+p.id+'/'+fact);
 }
}
const casioPair=read('montres/comparer-casio-mtp-b145-vs-mtp-1302.html');
assert.ok(casioPair.includes('35 mm de largeur'),'Casio rectangle width must be explained');
assert.ok(casioPair.includes('38,5 mm de diamètre'),'Casio round diameter must be distinguished');
assert.ok(!casioPair.includes('boîtier plus compact de 35 mm'),'Old misleading 35mm diameter language persists');
assert.match(read('seo-guides.css'),/\.watch-decision-grid/,'Editorial cards styling missing');

assert.equal(manifest.comparisonCount,4,'Four evidence-based pairs must be indexable');
assert.equal(manifest.categoryCount,3,'Three distinct editorial search-intent collections are required');
const config=JSON.parse(read('affiliate-links.json'));
assert.equal(manifest.affiliateActive,config.enabled);
assert.equal(manifest.affiliateCount,Object.keys(config.links).length);
assert.equal(manifest.checkoutActive,false);
assert.equal(manifest.licensedImageCount,feed.products.filter(p=>p.photoReview?.publicUsageApproved===true).length);
assert.equal(manifest.photoPermissionEvidenceStatus,'owner_declared_not_independently_verified');
const analyticsConfigured=Boolean((process.env.UMAMI_WEBSITE_ID||'').trim());
assert.equal(manifest.analyticsActive,analyticsConfigured);
assert.equal(manifest.analyticsProvider,analyticsConfigured?'umami':null);
assert.equal(Boolean(manifest.analyticsActive),analyticsConfigured);
const amazon=JSON.parse(read('amazon-product-links.json'));
assert.equal(amazon.version,1);
assert.equal(Object.keys(amazon.links).length,13,'13 exact, untracked Amazon.fr listings in build');
assert.deepEqual(new Set(Object.keys(amazon.links)).size,13);
for(const [id,entry] of Object.entries(amazon.links)){
 assert.ok(feed.products.some(p=>p.id===id),'Unknown Amazon reference');
 assert.match(entry.asin,/^[A-Z0-9]{10}$/);
 assert.equal(entry.url,'https://www.amazon.fr/dp/'+entry.asin);
 assert.ok(!entry.url.includes('?tag='),'Unapproved affiliate tracking cannot be published');
}

assert.equal(manifest.paths.length,71);
assert.equal(manifest.unifiedCount,52,'Unified catalogue must contain all 52 source-backed watches');
assert.equal(manifest.unifiedPath,'montres/toutes-les-montres.html');
assert.ok(manifest.paths.every(url=>url.startsWith(manifest.siteUrl)));
// Ensure small, local, original-source thumbnails are shipped with the site.
for(const name of ['citizen-tsuyosa','tissot-prx-quartz','orient-bambino','casio-mtp-b145']){
 const full=resolve(root,'assets/watches/'+name+'.webp');
 const thumbnail=resolve(root,'assets/watch-thumbs/'+name+'.webp');
 // Minimal affiliate fixtures need not ship gallery assets; the actual
 // deployable package always contains the original and its thumbnail.
 if(existsSync(full)){
   assert.ok(existsSync(thumbnail),'Missing real image thumbnail: '+name);
   const thumbSize=statSync(thumbnail).size;
   assert.ok(thumbSize>500&&thumbSize<statSync(full).size,'Thumbnail must be a smaller image: '+name);
 }
}
assert.match(read('editorial-photo.js'),/assets\/watch-thumbs\/.*item\.id/,'Featured picker must request smaller local thumbnails');
assert.match(read('affiliation.js'),/assets\/watch-responsive\/.*p\.id/,'Dynamic catalogue must prefer responsive photos');
const home=read('index.html');
const legacyHome=read('affiliation.html');
assert.equal(home,legacyHome,'Generated landing pages must remain byte-identical');
assert.ok(home.includes('52 MONTRES DOCUMENTÉES'),'The hero must present the full 52-model range');
assert.ok(home.includes('Explorer les 52 montres'),'Primary discovery CTA must open the complete catalogue');
assert.ok(home.includes('15 montres comparées en détail'),'The 15 in-depth subset must remain clearly described');
assert.ok(home.includes('href="./montres/toutes-les-montres.html">52 montres</a>'),'Navigation must link to unified collection');
assert.ok(!/découvrez 15 références réelles|parmi nos 15 modèles authentiques|Découvrir les 15 modèles/i.test(home),'No stale 15-only main offer');
assert.ok(home.includes('52 montres documentées à découvrir, dont 15 comparées en profondeur'),'Social preview must match real scope');
const premiumCss=read('premium-system.css');
assert.match(premiumCss,/--am-p-paper:/,'Premium color tokens must ship');
assert.match(premiumCss,/prefers-reduced-motion:reduce/,'Motion preferences must be respected');
for(const page of ['index.html','conseiller.html','montre.html']){
  assert.match(read(page),/<link rel="stylesheet" href="\.\/premium-system\.css">/,'Missing shared design system '+page);
}
assert.match(read('montres/citizen-tsuyosa.html'),/<link rel="stylesheet" href="\.\.\/premium-system\.css">/,'SEO product page must share the design system');

const advisor=read('conseiller.html');
assert.ok(advisor.includes('<link rel="canonical" href="'+manifest.siteUrl+'conseiller.html">'),'Advisor needs one canonical public URL');
assert.equal((advisor.match(/rel="canonical"/g)||[]).length,1,'Advisor must not duplicate canonical tags after repeated builds');
assert.equal((advisor.match(/AM_ADVISOR_SEO_START/g)||[]).length,1,'Advisor SEO must be idempotent');
assert.match(advisor,/<title>Trouver sa montre : conseiller en 4 critères \| Atelier Montres<\/title>/);
assert.match(advisor,/<meta property="og:url" content="https:\/\/atelier-montres-selection-fr\.onrender\.com\/conseiller\.html">/);
const advisorJson=advisor.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(advisorJson,'Advisor needs server-rendered WebPage data');
const advisorSchema=JSON.parse(advisorJson[1]);
assert.equal(advisorSchema['@type'],'WebPage');
assert.equal(advisorSchema.url,manifest.siteUrl+'conseiller.html');
assert.equal(advisorSchema.isPartOf.url,manifest.siteUrl);

// Legal transparency must be visible and accurate in every published entry point.
const legal=read('informations-legales.html');
const privacyDisclosure=read('confidentialite.html');
assert.match(legal,/<h1>Informations légales et transparence<\/h1>/);
assert.match(legal,/Informations d'identification incomplètes/,'Incomplete legal identity must not be presented as verified');
assert.match(legal,/ne constitue pas des mentions légales complètes/);
assert.match(privacyDisclosure,/Certains liens Amazon.fr peuvent être rémunérés/,'Privacy notice must reflect affiliate status');
assert.doesNotMatch(privacyDisclosure,/Ces liens ne sont actuellement pas rémunérés/,'No obsolete non-affiliate claims');
assert.match(privacyDisclosure,/stockage de session/,'Comparison persistence must be disclosed');
assert.match(privacyDisclosure,/Informations légales/,'Legal page accessible from privacy notice');
for(const path of ['index.html','affiliation.html','conseiller.html','marque.html','montre.html','selection.html','catalogue.html']){
 const page=read(path);
 assert.ok(page.includes('href="./informations-legales.html"'),path+' must link legal information');
 assert.ok(page.includes('href="./confidentialite.html"'),path+' must link privacy');
}
assert.match(read('montres/citizen-tsuyosa.html'),/href="\.\.\/informations-legales\.html"/,'Generated product pages must link legal information');
assert.match(read('montres/guide-choisir-montre.html'),/href="\.\.\/informations-legales\.html"/,'Generated guides must link legal information');

assert.match(home,/<h1>/i);
assert.ok(home.includes('Chaque lien rémunéré est identifié « lien rémunéré »'),'Commercial FAQ must describe actual affiliate status');
assert.ok(!home.includes('Non, pas actuellement. Si nous rejoignons un programme'),'Commercial FAQ must not deny active partner links');
assert.match(home,/id="affGrid"/);
assert.equal(home.includes('cloud.umami.is/script.js'),analyticsConfigured,'Homepage Umami opt-in only');
assert.equal(home.includes('./analytics.js'),analyticsConfigured,'Homepage click instrumentation opt-in only');
assert.match(home,/rel="canonical"/);
assert.match(home,/application\/ld\+json/);
assert.match(home,/Les 15 montres, modèle par modèle/);
assert.match(home,/Avant de choisir sa montre/);
assert.match(home,/id="comparaisons"/,'Homepage must promote head-to-head comparison pages');
assert.match(home,/id="seo-collections-title"/,'Homepage must link to explanatory indexable watch collections');
assert.ok(home.includes('./montres/methode-selection.html'),'Homepage must link to transparent selection methodology');
assert.equal((home.match(/AM_EDITORIAL_POLICY_START/g)||[]).length,1,'Editorial teaser generated exactly once');
const methodPath='montres/methode-selection.html';
const method=read(methodPath);
assert.ok(manifest.paths.includes(manifest.siteUrl+methodPath),'Method must be in sitemap manifest');
assert.ok(read('sitemap.xml').includes(manifest.siteUrl+methodPath),'Method must be in sitemap');
assert.ok(method.includes('<link rel="canonical" href="'+manifest.siteUrl+methodPath+'">'),'Method page must have canonical URL');
assert.equal((method.match(/rel="canonical"/g)||[]).length,1,'Method must have a single canonical');
assert.match(method,/<h1>Comment nous sélectionnons les montres<\/h1>/);
assert.match(method,/ne prétendons pas avoir testé physiquement les montres/,'No unsupported first-hand testing claims');
assert.match(method,/vérification juridique indépendante/,'Photo authorization is not independently established');
assert.match(method,/« À vérifier » ou « Non renseigné »/,'Unknown specs must remain unknown');
assert.match(method,/lien rémunéré/,'Commercial disclosure explained');
assert.match(method,/références Amazon.fr identifiées/,'Amazon model counts are transparent');
assert.match(method,/Sélection enregistrée le/,'Catalog selection date disclosed');
assert.equal((method.match(/<ul class="related seo-method-products">/g)||[]).length,1,"Exactly one list of the fifteen referenced models");
for(const product of feed.products)assert.ok(method.includes('href="./'+product.id+'.html"'),'Method links exact product '+product.id);
const methodJson=method.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(methodJson,'Machine-readable method metadata required');
const methodGraph=JSON.parse(methodJson[1]);
assert.deepEqual(methodGraph['@graph'].map(x=>x['@type']),['AboutPage','BreadcrumbList']);
assert.equal(methodGraph['@graph'][0].url,manifest.siteUrl+methodPath);
assert.ok(read('montres/guide-choisir-montre.html').includes('./methode-selection.html'),'Method linked from guide navigation');
assert.ok(read('montres/montres-casio.html').includes('./methode-selection.html'),'Method linked from collection navigation');

assert.match(home,/id="heroWatch"[^>]*><img class="am-hero-real-photo"/,'First genuine watch must render in initial HTML for early LCP');
const first=feed.products.find(p=>p.id==='citizen-tsuyosa');
assert.equal(first.photoReview.publicUsageApproved,true);
const heroPhoto='./assets/watches/'+first.id+'.webp?v='+first.photoReview.localSha256.slice(0,12);
assert.ok(home.includes('src="'+heroPhoto+'"'),'HTML hero must use exact locally versioned image');
assert.ok(home.includes('<link rel="preload" as="image" fetchpriority="high" href="'+heroPhoto+'" imagesrcset="'),'Matching responsive LCP preload must be present');
assert.ok(home.includes('imagesizes="(max-width: 760px) 92vw, 520px"'),'Preloaded LCP must match image sizes');
assert.ok(home.includes('<meta property="og:image" content="'+manifest.siteUrl+'assets/watches/'+first.id+'.webp">'),'Social sharing must use the real published photograph');
assert.ok(home.includes('<meta name="twitter:card" content="summary_large_image">'),'Large social image requested');
for(const marker of ['AM_SEO_LINKS_START','AM_SEO_LINKS_END','AM_SEO_HEAD_START','AM_SEO_HEAD_END','AM_SEO_GUIDES_START','AM_SEO_GUIDES_END','AM_SEO_CATEGORIES_START','AM_SEO_CATEGORIES_END','AM_SEO_COMPARISONS_START','AM_SEO_COMPARISONS_END']){
 assert.equal(home.split(marker).length-1,1,'Idempotent build marker: '+marker);
}
assert.equal((home.match(/rel="canonical"/g)||[]).length,1,'Homepage has exactly one canonical link');

// Every supplemental model has manufacturer evidence. Only explicitly
// source-confirmed Amazon.fr ASINs can become direct product links.
const exactPopular=JSON.parse(readFileSync(resolve(root,'../research/amazon-fr-popular-verified.json'),'utf8'));
const exactPopularLinks=exactPopular.verifiedProducts;
assert.equal(Object.keys(exactPopularLinks).length,7,'ASIN promotion requires a source-verified registry entry');
assert.equal(exactPopularLinks['casio-gw-m5610u-1'].asin,'B09BCPP68Q','Actual Amazon.fr G-SHOCK source code must be used');
assert.equal(exactPopularLinks['casio-f91w-1'].asin,'B000J34HN4','Casio F-91W documented Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-a168wg-9'].asin,'B002LAS086','Casio vintage gold documented Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-a158wea-1'].asin,'B000GAYQJ0','Casio A158 silver exact regional listing and Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-ga-2100-1a1'].asin,'B07WGJ1JNW','GA-2100 blackout G-SHOCK exact regional listing and Amazon.fr ASIN');
for(const [id,asin] of [['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
  const proof=exactPopularLinks[id];
  assert.equal(proof.asin,asin,'Published ASIN must be independently documented: '+id);
  assert.equal(proof.verifiedAt,'2026-11-01','New Amazon.fr proof must be dated: '+id);
  assert.equal(proof.evidenceType,'amazon_fr_product_page','Source must be Amazon.fr detail listing: '+id);
  assert.ok(proof.evidenceListingTitle.includes(proof.marketplaceModel),'Amazon title must include the exact documented model: '+id);
  assert.equal(proof.evidenceUrl,'https://www.amazon.fr/dp/'+asin,'Evidence URL must match published product ASIN: '+id);
  assert.ok(proof.marketplaceVariant?.length>30,'Exact marketplace variant must be explicitly disclosed: '+id);
}
for(const id of ['casio-a158wea-1','casio-ga-2100-1a1']){
  const match=exactPopularLinks[id];
  assert.equal(match.verifiedAt,'2026-11-01','The evidence is dated for '+id);
  assert.ok(match.evidenceListingTitle.includes(match.marketplaceModel),'Amazon title must contain exact regional model '+id);
  assert.ok(match.evidenceUrl.endsWith('/dp/'+match.asin),'Evidence URL must point to exact verified ASIN '+id);
  assert.match(match.corroborationUrl,/^https:\/\/www\.bfmtv\.com\/pratique\//,'Independent article must corroborate exact reference '+id);
}
const popularFeed=JSON.parse(read('selection-populaires.json'));
const approvedPopularPhotos=loadApprovedPopularPhotos({root,picks:popularFeed.products});

// Universal discovery must be source-backed, useful without JS and complete.
const unified=JSON.parse(read('discovery-catalogue.json'));
assert.equal(unified.version,1);
assert.equal(unified.total,52);
assert.equal(unified.coreCount,15);
assert.equal(unified.supplementalCount,37);
assert.equal(unified.products.length,52);
assert.equal(new Set(unified.products.map(p=>p.id)).size,52);
assert.deepEqual(new Set(unified.products.map(p=>p.id)),
  new Set([...feed.products,...popularFeed.products].map(p=>p.id)),
  'The advisor and the unified storefront cannot silently omit a model');
const unifiedPath='montres/toutes-les-montres.html';
for(const watch of JSON.parse(read('selection-populaires.json')).products){
  const html=read('montres/'+watch.id+'.html');
  assert.ok(html.includes('class="am-extra-factual-table"'),'Missing comparison on '+watch.id);
  assert.ok(html.includes('class="am-extra-factual-scroll" role="region" tabindex="0"'),
    'Accessible comparison required: '+watch.id);
  assert.ok(html.includes('href="../extra-factual-comparison.css"'),'Missing comparison CSS: '+watch.id);
  const table=html.split('<table class="am-extra-factual-table">')[1]?.split('</table>')[0];
  assert.ok(table,'Missing table: '+watch.id);
  assert.equal(table.split('<th scope="col">').length-1,5,'Five headings including labels: '+watch.id);
  assert.equal(table.split('<th scope="row">').length-1,4,'Four source facts: '+watch.id);
  assert.ok(table.includes('Modèle consulté'),'Current model label required: '+watch.id);
}
const unifiedHtml=read(unifiedPath);
assert.ok(manifest.paths.includes(manifest.siteUrl+unifiedPath),'Unified page canonical in sitemap');
assert.ok(unifiedHtml.includes('rel="canonical" href="'+manifest.siteUrl+unifiedPath+'"'));
assert.equal((unifiedHtml.match(/class="ud-card"/g)||[]).length,52,
  'All 52 item cards must be rendered in static HTML before JavaScript');
assert.equal((unifiedHtml.match(/class="ud-select"/g)||[]).length,52,
  'Each watch must have an opt-in local comparison button');
const photoCount=unified.products.filter(p=>p.photoUrl!==null).length;
assert.equal(photoCount,36,'Exactly 15 core and 21 supplemental owner-attested photos');
assert.equal(unified.products.filter(p=>p.photoUrl===null).length,16,
  'Missing published photos must remain explicit rather than be replaced with AI packshots');
assert.equal((unifiedHtml.match(/data-visual="photo"/g)||[]).length,36);
assert.equal((unifiedHtml.match(/data-visual="no-photo"/g)||[]).length,16);
assert.equal((unifiedHtml.match(/class="ud-zoom"/g)||[]).length,36,
  'Only photograph-backed models can provide a zoom control');
assert.equal((unifiedHtml.match(/Aucune photographie publiée pour cette référence/g)||[]).length,16);
assert.ok(unifiedHtml.includes('id="udVisual"')&&unifiedHtml.includes('value="no-photo"'),
  'Users must be able to distinguish photo-backed models from honest fallbacks');
assert.ok(unifiedHtml.includes('id="udViewTools" class="ud-view-tools" hidden'),
  'Display controls must not be shown without a working JavaScript catalogue');
assert.ok(unifiedHtml.includes('id="udViewLarge" aria-pressed="false"'),
  'Large photo layout must be opt-in and accessible');
assert.ok(unifiedHtml.includes('href="../photo-zoom.css"')&&unifiedHtml.includes('src="../photo-zoom.js"'),
  'Full-size authorized model viewer must be loaded on the unified catalogue');
assert.match(read('photo-zoom.js'),/watches-popular/,
  'Shared viewer must accept exact locally registered supplemental watch photos');
const visualJs=read('unified-discovery.js');
assert.match(visualJs,/window\.AtelierPhoto\.open/,'Viewer actions must use the shared accessible photo component');
assert.match(visualJs,/changeView\(params\.get\('view'\)/,
  'Shareable grid and large-photo view must restore safely from URL');
assert.match(visualJs,/controls\.visual\.value/,
  'Photo availability filter must operate on trusted catalogue data');
assert.match(unifiedHtml,/id="udFilters"[^>]*hidden/,'Filter controls invisible before JS initialization');
assert.match(unifiedHtml,/id="udCompareTable"/,'Comparison must be accessible');
assert.match(unifiedHtml,/<aside id="udCompareTray"[^>]*aria-label="Votre sélection de montres" hidden>/,
  'Compare dock must be accessible and hidden before verified JSON finishes loading');
for(const id of ['udTrayItems','udTrayCount','udTrayOpen','udTrayClear'])
  assert.ok(unifiedHtml.includes('id="'+id+'"'),'Missing comparison dock control: '+id);
assert.ok(unifiedHtml.includes('id="udTrayOpen" class="ud-tray-open" href="#comparer" hidden'),
  'Compare action must navigate to the existing real data table after at least two watches');
const trayJS=read('unified-discovery.js');
assert.match(trayJS,/selected\.length<2/,'One watch must not unlock comparison');
assert.match(trayJS,/catalogue\.classList\.toggle\('ud-has-tray'/,
  'Selected models need safe extra page padding for fixed mobile dock');
assert.match(trayJS,/trayItems\.replaceChildren/,'Watch chips must come from validated selected catalogue IDs');
assert.doesNotMatch(trayJS,/innerHTML\s*=/,
  'Untrusted watch labels must not be concatenated as HTML');
const trayCSS=read('unified-discovery.css');
assert.match(trayCSS,/\.ud-tray\[hidden\]/,
  'Dock must not be visible in no-JavaScript mode');
assert.match(trayCSS,/safe-area-inset-bottom/,'Android/iOS dock must respect bottom safe area');
assert.ok(unifiedHtml.includes('src="../unified-discovery.js"'));
assert.ok(unifiedHtml.includes('href="../unified-discovery.css"'));
assert.ok(home.includes('href="./montres/toutes-les-montres.html"'),'Homepage must link the full catalogue');
assert.equal(unified.products.filter(p=>p.merchantKind==='search').length,manifest.popularAffiliateSearchLinks);
assert.equal(unified.products.filter(p=>p.merchantKind==='direct').length,
  manifest.affiliateActive?manifest.affiliateCount+manifest.popularAffiliateDirectLinks:0);
for(const product of unified.products){
  assert.equal(product.detailUrl,'./montres/'+product.id+'.html');
  assert.ok(unifiedHtml.includes('id="modele-'+product.id+'"'),'Unified card missing: '+product.id);
  assert.equal(typeof product.officialUrl,'string');
  if(product.photoUrl)assert.ok(/^\.\/assets\/(?:watches|watches-popular)\/[a-z0-9-]+\.webp$/.test(product.photoUrl),'Only local, exact model WebP is eligible');
  if(product.kind==='supplemental' && product.diameterMm!==null)
    assert.match(product.caseText,/diam[eè]tre/i,'Do not infer diameter from a rectangular width');
}

// A model match that was explicitly observed as unavailable is research,
 // not an active commercial destination: it must never receive a paid exact ASIN.
const skippedCandidates=JSON.parse(readFileSync(resolve(root,'../research/amazon-fr-popular-asin-candidates.json'),'utf8'));
const unavailableSkmei=skippedCandidates.candidates.find(x=>x.productId==='skmei-2056');
assert.equal(unavailableSkmei.status,'verified_model_but_unavailable_on_amazon_fr_do_not_publish');
assert.equal(unavailableSkmei.asinCandidate,'B0C7W5NNX2');
assert.ok(!exactPopularLinks['skmei-2056'],'Unavailable SKMEI 2056 ASIN must not be published as a direct link');
const aiVisuals=loadPopularAiVisuals({root,picks:popularFeed.products});
const popularPath='montres/modeles-populaires.html';
const popularHtml=read(popularPath);
const approvedPartnerOffers=loadApprovedPartnerOffers({root,picks:popularFeed.products});
assert.equal(manifest.popularPartnerAffiliateLinks,approvedPartnerOffers.size,
  'Manifest counts approved Awin models, not clicks or duplicate CTA placements');
const approvedPriorityIds=new Set(commercialShortlist.map(item=>item.id));
const expectedPartnerCTAs=[...approvedPartnerOffers.keys()]
  .reduce((n,id)=>n+1+(approvedPriorityIds.has(id)?1:0),0);
assert.equal((popularHtml.match(/data-partner-offer-id=/g)||[]).length,expectedPartnerCTAs,
  'Only approved Awin links may appear in collection and commercial priority sections');
for(const [id,offer] of approvedPartnerOffers){
  const encoded=offer.url.replace(/&/g,'&amp;');
  assert.ok(popularHtml.includes('href="'+encoded+'"'),
    'Awin product entry must use the exact generated issuer URL: '+id);
  const page=read('montres/'+id+'.html');
  assert.ok(page.includes('href="'+encoded+'"')&&page.includes('data-partner-offer-id="'+id+'"'),
    'Awin partner link must be published on the real model page: '+id);
  assert.ok(page.includes('rel="noopener noreferrer nofollow sponsored"'),
    'Approved partner links must be marked sponsored: '+id);
}
const popularSitemap=read('sitemap.xml');
assert.equal(popularFeed.products.length,37);
assert.ok(manifest.paths.includes(manifest.siteUrl+popularPath),'Research-led selection must enter sitemap');
assert.ok(popularSitemap.includes(manifest.siteUrl+popularPath),'Research-led collection must be crawlable');
assert.match(popularHtml,/rel="canonical"/,'Canonical for supplemental source-led page');
assert.match(popularHtml,/aucun|Aucun/,'Supplemental section must disclose limitations');
assert.equal((popularHtml.match(/<article class="am-pick-card /g)||[]).length,37,'One editorial card for each researched watch');
assert.equal((popularHtml.match(/data-merchant-official-id=/g)||[]).length,42,
  'Every supplemental card and five model-specific shortlist seller options must expose privacy-minimal vendor intent');
// Commercial shortlist: an explicitly editorial priority list, not sales data.
// The existing 52 catalogue entries and Amazon paid CTA counts must stay intact.
assert.equal(commercialShortlist.length,10,'Ten documented watches selected for commercial qualification');
const focusMatches=[...popularHtml.matchAll(/<li class="am-focus-item" data-focus-id="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(focusMatches,commercialShortlist.map(item=>item.id),
  'Commercial shortlist must follow the reviewed source file and never substitute products');
assert.equal(new Set(focusMatches).size,10,'Shortlist cannot repeat a product');
assert.ok(popularHtml.includes('id="selection-10-montres"'),'Priorities must be reachable via a stable accessible anchor');
assert.ok(home.includes('href="./montres/modeles-populaires.html#selection-10-montres"'),
  'Homepage must surface the priorities without duplicating all ten full cards');
assert.ok(popularHtml.includes('Ce n’est ni un classement des ventes en France'),
  'Editorial readiness must not be mistaken for sales ranking or verified popularity');
assert.equal(commercialShortlist.filter(item=>Boolean(exactPopularLinks[item.id])).length,5,
  'Five source-confirmed listings and five explicitly uncertain searches in this editorial mix');
assert.equal(commercialShortlist.filter(item=>approvedPopularPhotos.has(item.id)).length,7,
  'Seven shortlist watches have declared-authorised local model photos');
assert.equal((popularHtml.match(/class="am-focus-detail"/g)||[]).length,10,
  'Every shortlist entry needs its own direct internal source-and-merchant action');
for(const item of commercialShortlist){
  const p=popularFeed.products.find(x=>x.id===item.id);
  assert.ok(p,'Shortlist model must originate from the 37-watch catalogue');
  const html=popularHtml.match(new RegExp('<li class="am-focus-item" data-focus-id="'+item.id+'"[\\s\\S]*?<\\/li>'))?.[0];
  assert.ok(html,'Shortlist card missing: '+item.id);
  assert.ok(html.includes('href="./'+item.id+'.html"'),'The genuine model detail page must be linked: '+item.id);
  const sellerLink=exactPopularLinks[item.id];
  const expectedAction=sellerLink?
    'https://www.amazon.fr/dp/'+sellerLink.asin+'?tag=drackk04-21':p.officialUrl;
  assert.ok(html.includes('href="'+expectedAction+'"'),
    'Shortlist must open only the exact documented Amazon model or actual supplier source: '+item.id);
  assert.ok(html.includes('data-'+(sellerLink?'amazon-product':'merchant-official-id')+'="'+item.id+'"'),
    'Shortlist must track exact Amazon referrals and non-paid vendor clicks separately: '+item.id);
  assert.ok(html.includes(sellerLink?'lien rémunéré':'lien non rémunéré'),
    'Buyers must be told whether shortlist merchant exits are paid: '+item.id);
  if(sellerLink?.marketplaceVariant)
    assert.ok(html.includes(sellerLink.marketplaceVariant.replace(/&/g,'&amp;')),
      'Shortlist direct Amazon CTA needs variant disclosure: '+item.id);
  if(sellerLink)assert.ok(html.includes('rel="noopener noreferrer nofollow sponsored"'),
    'Shortlist paid product exits require sponsored relationship: '+item.id);
  assert.ok(html.includes(item.caution),'Editorial caveat must be visible: '+item.id);
  assert.ok(html.includes(exactPopularLinks[item.id]?
    'Fiche Amazon.fr correspondant au code modèle':'Recherche Amazon.fr uniquement'),
    'Never mislabel generic search as an exact merchant listing: '+item.id);
  if(approvedPopularPhotos.has(item.id))
    assert.ok(html.includes('src="../'+approvedPopularPhotos.get(item.id).url+'"'),
      'Only the recorded authorised model photo may be shown: '+item.id);
  else assert.ok(!html.includes('<img'),'Never invent a watch image: '+item.id);
}
assert.match(read('popular-picks.css'),/\.am-focus-list\{/, 'Mobile-friendly shortlist CSS required');
assert.equal((home.match(/<article class="am-pick-card /g)||[]).length,8,'Eight diverse supplemental models feature prominently, including direct-link G-SHOCK');
assert.equal((home.match(/class="am-pick-detail-link"/g)||[]).length,8,'Every featured model title must link its source-backed SEO landing page');
assert.equal((popularHtml.match(/<section class="am-picks-tier"/g)||[]).length,3,'All three ranges visibly represented');
assert.equal(home.split('AM_POPULAR_PICKS_START').length-1,1,'Popular section must be idempotent');
assert.equal(home.split('AM_POPULAR_PICKS_END').length-1,1,'Popular section closing marker must be idempotent');
assert.match(home,/href="\.\/montres\/modeles-populaires\.html"/,'Homepage must link the complete sourced selection');
assert.match(home,/href="\.\/popular-picks\.css"/,'Homepage must load the premium commercial selection styles');
assert.match(popularHtml,/href="\.\.\/popular-picks\.css"/,'Full selection must use the same premium design');
assert.match(popularHtml,/src="\.\.\/popular-filters\.js"/,'Filter script must load only on the supplemental selection page');
assert.match(popularHtml,/<form class="am-pick-filters" id="am-pick-filters"[^>]*hidden>/,'Filtering UI must remain hidden unless progressive enhancement is available');
assert.match(popularHtml,/<div id="am-picks-list">/,'Source-backed cards must be grouped for filtering');
assert.match(popularHtml,/id="am-pick-filter-count"[^>]*aria-live="polite"/,'Accessible result count must update without reloading');
assert.match(popularHtml,/id="am-pick-filter-empty"[^>]*hidden>/,'Empty-state must be available without showing it before filtering');
assert.match(read('popular-filters.js'),/querySelectorAll\('\.am-pick-card\[data-pick-id\]'\)/,'Filters must operate on existing source-backed cards');
assert.match(read('popular-picks.css'),/\.am-picks-page \.am-pick-card\[hidden\]/,'CSS must honor native hidden when filter is active');
assert.doesNotMatch(home,/src="\.\.\/popular-filters\.js"/,'Homepage must not load collection-only interaction JavaScript');
assert.ok(home.includes('id="pick-casio-gw-m5610u-1"'),'Verified Amazon G-SHOCK must be featured on homepage');
assert.ok(home.includes('https://www.amazon.fr/dp/B09BCPP68Q?tag=drackk04-21'),'Home feature must link to the verified G-SHOCK ASIN');
assert.equal((home.match(/data-amazon-product="casio-gw-m5610u-1"/g)||[]).length,1,'Only one direct Amazon supplemental CTA should be featured');
assert.equal((home.match(/data-amazon-search-id=/g)||[]).length,3,'Three featured SKMEI and Pagani variants without exact ASINs remain honest searches');
assert.equal((home.match(/data-amazon-product="casio-f91w-1"/g)||[]).length,1,'F-91W featured exact-model Amazon referral');
assert.equal((home.match(/data-amazon-product="casio-ga-2100-1a1"/g)||[]).length,1,'GA-2100 featured exact-model Amazon referral');
for(const [id,asin] of [['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
  assert.equal((home.match(new RegExp('data-amazon-product="'+id+'"','g'))||[]).length,1,'New exact Amazon product featured once: '+id);
  assert.ok(home.includes('https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21'),'Verified Amazon link must be attributed: '+id);
}
assert.ok(home.includes('https://www.amazon.fr/dp/B07WGJ1JNW?tag=drackk04-21'),'Homepage must link to source-backed GA-2100 listing');

const shopperCollections=[
  {slug:'montres-femme-accessibles',ids:['casio-ltp1302','skmei-1874','casio-la-20wh-4a1','casio-ltp-1234pgl-7a','curren-cur210','pagani-pd1776']},
  {slug:'montres-homme-style-accessible',ids:['casio-mtp-1302','casio-a168wa','casio-mdv107','skmei-2256','addiesdive-ad2030','pagani-pd1701']},
  {slug:'montres-automatiques-selection',ids:['orient-bambino','citizen-tsuyosa','seiko-5','orient-bambino-38-cream','citizen-tsuyosa-37-blue','pagani-pd1751']}
];
const shopperProducts=new Map([...feed.products,...popularFeed.products].map(p=>[p.id,p]));
for(const selection of shopperCollections){
  const path='montres/'+selection.slug+'.html';
  const html=read(path);
  assert.ok(manifest.paths.includes(manifest.siteUrl+path),'Shopper collection not in sitemap: '+path);
  assert.ok(popularSitemap.includes(manifest.siteUrl+path),'Shopper collection missing XML location: '+path);
  assert.ok(html.includes('<link rel="canonical" href="'+manifest.siteUrl+path+'">'),'Shopper canonical missing');
  assert.match(html,/class="am-shopper-grid"/,'Accessible product grid must be visible without JavaScript');
  assert.match(html,/href="\.\.\/shopper-selections\.css"/,'Stylesheet must be included');
  assert.equal((html.match(/class="am-shopper-card"/g)||[]).length,selection.ids.length,'Only selected products in shopper collection');
  assert.equal((html.match(/class="am-shopper-art am-shopper-real-photo"/g)||[]).length,
    selection.ids.filter(id=>approvedPopularPhotos.has(id)||feed.products.some(p=>p.id===id&&p.photoReview?.publicUsageApproved===true)).length,
    'Only locally registered and checksum-verified model photos may be used');
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(graph[0]['@type'],'CollectionPage');
  assert.equal(graph[0].url,manifest.siteUrl+path);
  assert.deepEqual(graph[1].itemListElement.map(x=>x.url),selection.ids.map(id=>manifest.siteUrl+'montres/'+id+'.html'));
  for(const id of selection.ids){
    const p=shopperProducts.get(id);
    assert.ok(p,'Unknown watch in curated collection: '+id);
    assert.ok(html.includes('data-shopper-watch="'+id+'"'),'Shopper card ID missing: '+id);
    assert.ok(html.includes(p.brand.replace(/&/g,'&amp;')),'Model brand missing from shopper page: '+id);
    assert.ok(html.includes('href="../montres/'+id+'.html"'),'Internal fact-checking link missing: '+id);
    if(!feed.products.some(x=>x.id===id)){
      assert.ok(html.includes('data-amazon-'+(exactPopularLinks[id]?'product':'search-id')+'="'+id+'"'),
        'Popular shopper affiliate path incorrectly classified: '+id);
    }
  }
  assert.doesNotMatch(html,/"offers"\s*:|"aggregateRating"\s*:/,'Shopper page must not invent offers or ratings');
  assert.ok(html.includes('En tant que Partenaire Amazon')===manifest.affiliateActive,'Explicit commission disclosure required when Amazon links are active');
  assert.ok(html.includes('Les photographies locales sont publiées sur la base d’autorisations déclarées'),'Source-rights disclosure is required');
  assert.ok(home.includes('href="./montres/'+selection.slug+'.html"'),'Homepage must link shopper collection');
  assert.ok(popularHtml.includes('href="./'+selection.slug+'.html"'),'Supplemental index must link shopper collection');
}
const existingIds=new Set(feed.products.map(p=>p.id));
for(const p of popularFeed.products){
  assert.ok(!existingIds.has(p.id),'Supplemental reference must not duplicate comparables: '+p.id);
  assert.ok(popularHtml.includes('id="pick-'+p.id+'"'),'Missing popular model: '+p.id);
  assert.ok(popularHtml.includes('data-pick-id="'+p.id+'"'),'Filterable watch must retain exact ID: '+p.id);
  assert.ok(popularHtml.includes('data-pick-tier="'+p.tier+'"'),'Filterable tier must match source: '+p.id);
  assert.ok(popularHtml.includes('data-pick-style="'+p.style+'"'),'Filterable style must match source: '+p.id);
  const movementKind=p.movement.startsWith('Automatique')?'automatic':p.movement.startsWith('Quartz solaire')?'solar':'quartz';
  assert.ok(popularHtml.includes('data-pick-movement="'+movementKind+'"'),'Movement filter must derive from documented manufacturer specification: '+p.id);
  assert.ok(popularHtml.includes('href="'+p.officialUrl+'"'),'Manufacturer page must be clickable: '+p.id);
  assert.ok(popularHtml.includes('href="'+p.marketEvidence.url+'"'),'Evidence must be linked: '+p.id);
  const detailPath='montres/'+p.id+'.html';
  const detailHtml=read(detailPath);
  assert.ok(manifest.paths.includes(manifest.siteUrl+detailPath),'Each researched model must enter the sitemap: '+p.id);
  assert.ok(popularSitemap.includes(manifest.siteUrl+detailPath),'Unique supplemental canonical not in sitemap: '+p.id);
  assert.ok(popularHtml.includes('href="./'+p.id+'.html"'),'Selected watch card must link its unique landing page: '+p.id);
  assert.match(detailHtml,/<h1>[^<]+<\/h1>/,'Every model needs a clear visible H1: '+p.id);
  assert.ok(detailHtml.includes('data-popular-watch-id="'+p.id+'"'),'Landing page must match product identity: '+p.id);
  assert.ok(detailHtml.includes('Référence à retrouver chez le marchand'),'Show exact model reference before external purchase: '+p.id);
  assert.ok(detailHtml.includes('Comparer les 52 montres'),'Related models must link to full comparison: '+p.id);
  const recommendations=[...detailHtml.matchAll(/<li data-related-id="([a-z0-9-]+)" data-related-reason="([^"]+)"/g)];
  assert.equal(recommendations.length,3,'Three contextual model alternatives required: '+p.id);
  const compareHref='./toutes-les-montres.html?compare='+
    [p.id,...recommendations.slice(0,2).map(x=>x[1])].join(',')+'#comparer';
  assert.equal((detailHtml.match(new RegExp('data-compare-source="'+p.id+'"','g'))||[]).length,2,
    'Each detail must provide a buyer-visible source-backed comparison near CTAs and alternatives: '+p.id);
  assert.equal(detailHtml.split('href="'+compareHref+'"').length-1,2,
    'Comparison deep link must preserve the exact selected model plus two documented alternatives: '+p.id);
  const hasViewer=detailHtml.includes('src="../extra-product-viewer.js"');
  assert.equal(hasViewer,approvedPopularPhotos.has(p.id),
    'Only image-backed pages may load the optional local-photo modal: '+p.id);
  assert.equal(detailHtml.includes('src="../photo-zoom.js"'),hasViewer);
  assert.equal(detailHtml.includes('href="../photo-zoom.css"'),hasViewer);
  assert.equal(new Set(recommendations.map(m=>m[1])).size,3,'Never recommend the same watch twice: '+p.id);
  assert.ok(!recommendations.some(m=>m[1]===p.id),'Do not self-recommend: '+p.id);
  for(const [,id,reason] of recommendations){
    const q=popularFeed.products.find(w=>w.id===id);
    assert.ok(q,'Recommended watch must exist in the researched source catalogue: '+id);
    assert.ok(['Même marque','Style proche','Mouvement comparable','Autre approche'].includes(reason),'Reason must not imply ranking or test: '+id);
    assert.ok(detailHtml.includes('class="am-extra-related-name" href="./'+id+'.html"'),'A live related detail page must be linked: '+id);
    const approved=approvedPopularPhotos.get(id);
    if(approved)assert.ok(detailHtml.includes('src="../'+approved.url+'"'),'Recommended product photo must be approved: '+id);
    else assert.ok(detailHtml.includes('class="am-extra-related-fallback"'),'Missing related photos need an honest fallback: '+id);
  }
  if(popularFeed.products.filter(w=>w.brand===p.brand&&w.id!==p.id).length>=2)
    assert.equal(recommendations.filter(m=>popularFeed.products.find(w=>w.id===m[1]).brand===p.brand).length,2,'Brand alternatives must include two distinct models: '+p.id);
  assert.ok(detailHtml.includes('rel="canonical" href="'+manifest.siteUrl+detailPath+'"'),
    'Dedicated product canonical must be self-referencing: '+p.id);
  assert.ok(detailHtml.includes('name="robots" content="index,follow'),'New editorial product pages should be crawlable: '+p.id);
  assert.ok(detailHtml.includes('href="'+p.officialUrl+'"'),'The correct manufacturer page must remain accessible: '+p.id);
  assert.ok(detailHtml.includes('data-merchant-official-id="'+p.id+'" data-merchant-placement="popular"'),
    'Every model detail must distinguish its source-vendor exit from Amazon for analytics: '+p.id);
  assert.ok(detailHtml.includes('href="'+p.marketEvidence.url+'"'),'Source for the bestseller claim or editorial choice missing: '+p.id);
  for(const fact of [p.model,p.movement,p.case,p.glass,p.water,p.caution]){
    assert.ok(detailHtml.includes(fact.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),
      'Missing source-backed watch fact: '+p.id+' '+fact);
  }
  assert.equal((detailHtml.match(/class="am-extra-fact"/g)||[]).length,4,'Four useful watch facts per model: '+p.id);
  assert.equal((detailHtml.match(/class="am-extra-editorial-grid"/g)||[]).length,1,
    'One source-backed decision section per watch: '+p.id);
  if(approvedPopularPhotos.has(p.id)){
    assert.match(detailHtml,/class="am-extra-art[^"]*am-extra-art-with-photo"/,
      'Registered model photograph must receive the photo-led premium stage: '+p.id);
    assert.ok(detailHtml.includes('data-extra-zoom-id="'+p.id+'"'),
      'Only licensed by owner-declaration exact product photos receive a photo zoom button: '+p.id);
    assert.ok(detailHtml.includes('src="../'+approvedPopularPhotos.get(p.id).url+'"'),
      'Registered exact-model photograph must appear in the product page: '+p.id);
  }else{
    assert.ok(!detailHtml.includes('class="am-extra-licensed-photo"'),'An unapproved hero photo must never be embedded: '+p.id);
    assert.ok(!detailHtml.includes('data-extra-zoom-id='),'Unphotographed watch must never show a fake product zoom: '+p.id);
  }
  const ai=aiVisuals.get(p.id);
  if(ai){
    assert.ok(detailHtml.includes('id="vue-ia"'),'SKMEI visual must have a dedicated transparent editorial section: '+p.id);
    assert.ok(detailHtml.includes('src="'+ai.url+'"'),'Source-owned AI artwork must appear on landing page: '+p.id);
    assert.ok(popularHtml.includes('src="'+ai.url+'"'),'AI artwork must appear as secondary catalogue preview: '+p.id);
    assert.match(detailHtml,/Interprétation IA · non contractuelle/,'AI art cannot appear as an official product photograph: '+p.id);
    assert.match(detailHtml,/ne s’agit pas d’une photographie du produit/,'Buyer should know the art is illustrative: '+p.id);
  }else{
    assert.ok(!detailHtml.includes('class="am-ai-editorial"'),'No arbitrary AI renders for other watch models: '+p.id);
  }
  assert.doesNotMatch(detailHtml,/"offers"\s*:|"price"\s*:|"aggregateRating"\s*:/,'No false checkout offer, pricing or rating: '+p.id);
  const script=detailHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(script,'Product JSON-LD missing: '+p.id);
  const graph=JSON.parse(script[1])['@graph'];
  assert.deepEqual(graph.map(g=>g['@type']),['Product','BreadcrumbList']);
  assert.equal(graph[0].url,manifest.siteUrl+detailPath);
  assert.equal(graph[0].model,p.model);
  assert.equal(graph[0].additionalProperty.length,4);
  const direct=exactPopularLinks[p.id];
  const expectedMerchant=direct
    ?'https://www.amazon.fr/dp/'+direct.asin+'?tag=drackk04-21'
    :'https://www.amazon.fr/s?k='+encodeURIComponent((p.brand+' '+p.model).slice(0,130))+'&amp;tag=drackk04-21';
  if(manifest.affiliateActive){
    assert.ok(detailHtml.includes('href="'+expectedMerchant+'"'),'Exact merchant destination missing on individual watch page: '+p.id);
    if(['addiesdive-ad2030','pagani-pd1701'].includes(p.id)){
      assert.ok(direct?.marketplaceVariant,'Two newly source-verified watches require honest variant disclosure: '+p.id);
      assert.ok(detailHtml.includes('Variante de la fiche Amazon :'),'The exact marketplace variant must be user-visible: '+p.id);
      assert.ok(detailHtml.includes(direct.marketplaceVariant.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),
        'Public buying UI must match Amazon source variant exactly: '+p.id);
      assert.ok(popularHtml.includes(direct.marketplaceVariant.replace(/&/g,'&amp;')),
        'Collection card must disclose variant ambiguity: '+p.id);
    }
    assert.ok(popularHtml.includes('href="'+expectedMerchant+'"'),'Merchant destination must match source-led collection: '+p.id);
    assert.ok(detailHtml.includes('data-amazon-'+(direct?'product':'search-id')+'="'+p.id+'"'),
      'Distinct product vs search tracking required: '+p.id);
    assert.match(detailHtml,/rel="noopener noreferrer nofollow sponsored"/,'Paid merchant exit must be clearly marked: '+p.id);
    if(direct){
      assert.ok(detailHtml.includes('Fiche Amazon.fr correspondant au code modèle'),'Direct link must visibly identify a documented matching listing: '+p.id);
      assert.ok(detailHtml.includes('Correspondance du code modèle vérifiée'),'Direct link must document model evidence: '+p.id);
      assert.ok(detailHtml.includes('prix, vendeur et disponibilité restent à contrôler'),'No unverified stock claim: '+p.id);
      assert.ok(!detailHtml.includes('data-amazon-search-id="'+p.id+'"'),'Verified product must not masquer search results: '+p.id);
    }else{
      assert.ok(detailHtml.includes('Recherche Amazon.fr — modèle non garanti'),'Search must not imply an exact offer: '+p.id);
      assert.ok(detailHtml.includes('Le lien ouvre des résultats de recherche'),'Search must warn about different variants: '+p.id);
      assert.ok(!detailHtml.includes('data-amazon-product="'+p.id+'"'),'No invented exact ASIN: '+p.id);
    }
  }else{
    assert.ok(!detailHtml.includes('data-amazon-search-id="'+p.id+'"')&&!detailHtml.includes('data-amazon-product="'+p.id+'"'),
      'Inactive affiliate settings cannot publish paid links: '+p.id);
  }
}
assert.equal((popularHtml.match(/class="am-pick-ai-preview"/g)||[]).length,9,'Exactly nine SKMEI AI concepts must be labelled separately from manufacturer photos');
assert.equal((popularHtml.match(/class="am-pick-licensed-photo"/g)||[]).length,approvedPopularPhotos.size,
  'Only registered photo assets may appear in supplemental catalogue');
assert.doesNotMatch(popularHtml,/"offers"\s*:|"aggregateRating"\s*:|"price"\s*:/,'No invented structured pricing or ratings');
const trackedResults=popularHtml.match(/data-amazon-search-id=/g)||[];
const trackedDirect=popularHtml.match(/data-amazon-product=/g)||[];
const sponsoring=popularHtml.match(/rel="noopener noreferrer nofollow sponsored"/g)||[];
assert.equal(trackedResults.length,manifest.popularAffiliateSearchLinks,'Only unverified models may have search links');
assert.equal(trackedDirect.length,manifest.popularAffiliateDirectLinks+(manifest.affiliateActive?5:0),
  'Five source-confirmed shortlist merchant actions augment 7 original cards, without pretending to verify new ASINs');
assert.equal(sponsoring.length,manifest.affiliateActive?42:0,'All 37 catalogue and five shortlist paid actions must carry sponsored relation');
assert.equal((popularHtml.match(/amazon\.fr\/dp\/B09BCPP68Q/g)||[]).length,manifest.affiliateActive?2:0,
  'The same G-SHOCK ASIN appears in one standard card and one shortlist action, never a new unverified ASIN');
for(const [id,url] of [['pagani-pd1701','https://paganidesign.com/fr/products/pagani-design-1701'],['pagani-pd1776','https://paganidesign.com/products/pd-1776']]){
  const sourceProduct=popularFeed.products.find(p=>p.id===id);
  assert.equal(sourceProduct.officialUrl,url,'Pagani exact manufacturer-distributor model source must not regress: '+id);
  assert.ok(read('montres/'+id+'.html').includes('href="'+url+'"'),
    'Pagani direct product source must remain available on the individual model page');
}
assert.doesNotMatch(popularHtml,/amazon\.fr\/gp\/product\//,'No unverified direct product destinations');
assert.match(popularHtml,/recherche Amazon/i,'Visitor must be warned that search results may contain different variants');

const browseOrder=[
  ['gammes','<section id="gammes"'],
  ['montres','<section id="montres"'],
  ['photographic lookbook','<section class="am-editorial-gallery" id="amEditorialGallery"'],
  ['SEO guides','<!-- AM_SEO_GUIDES_START -->'],
  ['SEO categories','<!-- AM_SEO_CATEGORIES_START -->'],
  ['SEO comparisons','<!-- AM_SEO_COMPARISONS_START -->']
];
const browsePositions=browseOrder.map(([name,marker])=>{
  const index=home.indexOf(marker);
  assert.ok(index>=0,'Homepage missing '+name);
  return index;
});
assert.ok(browsePositions.every((x,i)=>i===0||x>browsePositions[i-1]),'The 15 real watches must appear before long guides and comparisons, with sections ordered once');

for(const product of feed.products){
  const path='montres/'+product.id+'.html';
  const html=read(path);
  assert.ok(statSync(resolve(root,path)).size>1000,path);
  assert.ok(html.includes(product.brand),path);
  assert.ok(html.includes(product.model),path);
  assert.ok(html.includes(manifest.siteUrl+path),path);
  assert.match(html,/<h1>/);
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/rel="canonical"/);
  assert.match(html,/application\/ld\+json/);
  assert.doesNotMatch(html,/"offers"\s*:|"price"\s*:|"availability"\s*:|"aggregateRating"\s*:/,'No unverified commercial schema');
  assert.ok(home.includes('./'+path),'Missing static crawlable home link: '+path);
  assert.match(html,/class="spec-matrix"/,'Model-to-model comparisons required');
  // Production detail layout remains factual, navigable and useful on mobile.
  assert.match(html,/class="watch watch-product"/,'Premium product layout required: '+product.id);
  assert.match(html,/class="photo watch-photo"/,'Photo stage must preserve the real product photo');
  assert.match(html,/class="watch-photo-caption"/,'Exact model photograph needs a source caption');
  // Real-source zoom is a progressive enhancement on indexable pages:
  // the exact local photo URL remains a working link without JavaScript.
  const approvedPhoto=product.photoReview?.publicUsageApproved===true&&
    product.photoReview?.localUrl==='./assets/watches/'+product.id+'.webp';
  if(approvedPhoto){
    assert.ok(html.includes('class="watch-photo-zoom" href="../assets/watches/'+product.id+'.webp"'),
      'Exact photograph zoom must have a no-JS local link: '+product.id);
    assert.ok(html.includes('data-watch-id="'+product.id+'"'),
      'Zoom must identify the exact model: '+product.id);
    assert.match(html,/href="\.\.\/photo-zoom\.css"/,'Shared premium photographic viewer styles missing');
    assert.match(html,/src="\.\.\/photo-zoom\.js"/,'Shared photographic viewer script missing');
    assert.match(html,/src="\.\.\/seo-product-photo\.js"/,'Indexable watch viewer bridge missing');
  }else{
    assert.doesNotMatch(html,/class="watch-photo-zoom"/,
      'Unavailable or unapproved photographic source must not expose a zoom: '+product.id);
  }

  assert.match(html,/class="watch-section-nav"/,'Quick in-page navigation must be present');
  for(const section of ['caracteristiques','comparatif','avant-achat','modeles-proches']){
    assert.ok(html.includes('href="#'+section+'"'),'Missing anchor link '+section+' for '+product.id);
    assert.ok(html.includes('id="'+section+'"'),'Missing heading target '+section+' for '+product.id);
  }
  const facts=html.match(/<section class="watch-facts"[^>]*>[\s\S]*?<dl>([\s\S]*?)<\/dl><\/section>/);
  assert.ok(facts,'Source-grounded summary must exist on every product page: '+product.id);
  assert.equal((facts[1].match(/class="watch-quickfact"/g)||[]).length,4,'Exactly four verified-or-unknown facts: '+product.id);
  const sizeFact=product.specs?.diameter?['Diamètre',product.specs.diameter]
    :product.specs?.caseSize?['Dimensions du boîtier',product.specs.caseSize]:['Diamètre',null];
  for(const [label,documented] of [['Mouvement',product.specs?.movement],sizeFact,['Verre',product.specs?.glass],['Étanchéité',product.specs?.waterResistance]]){
    assert.ok(facts[1].includes('<dt>'+label+'</dt>'),'Missing quick-fact label '+label+' on '+product.id);
    if(label!=='Mouvement')assert.ok(facts[1].includes(documented||'Non documenté'),'Quick-fact must not invent '+label+' on '+product.id);
  }
  assert.match(html,/class="watch-actions"/,'Accessible purchase/compare actions remain grouped');
  // Product facts need model-specific, inspectable manufacturer provenance.
  const review=product.specReview;
  assert.match(html,/class="watch-evidence"/,'Every SEO product page must expose source evidence or a missing-proof disclaimer');
  if(review){
    assert.equal(review.sourceKind,'manufacturer_exact_reference');
    assert.equal(review.sourceUrl,product.officialUrl,'Technical proof must link to the exact manufacturer product page');
    assert.match(review.verifiedOn,/^2026-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(review.verifiedFields)&&review.verifiedFields.length>=1,'Audited fields required');
    const knownFields=new Set(['movement','diameter','caseSize','glass','waterResistance']);
    for(const field of review.verifiedFields){
      assert.ok(knownFields.has(field),'Unexpected verified field: '+field);
      assert.ok(product.specs?.[field],'Verification cannot cite an absent value: '+product.id+' / '+field);
    }
    assert.ok(html.includes('Caractéristiques constructeur recoupées le'),'Latest source review must be clearly dated: '+product.id);
    assert.ok(html.includes('la licence des photographies ne sont pas couvertes'),'Technical evidence must not be mistaken for a photo license');
    assert.ok(html.includes(review.sourceUrl),'Manufacturer evidence link missing: '+product.id);
  }else{
    assert.ok(html.includes('Caractéristiques à confirmer sur la source officielle'),'Unaudited models must not claim a new manufacturer check');
  }
  if(product.specs?.caseSize){
    assert.ok(html.includes(product.specs.caseSize),'Official L × l × H case size must be visible');
    // A round watch can have BOTH a diameter and overall dimensions;
    // only ambiguous/rectangular watches omit the circular diameter.
    if(!product.specs.diameter){
      assert.ok(html.includes('Il ne s’agit pas d’un diamètre'),'Buyer guidance must explain rectangular watch dimensions');
      assert.ok(html.includes('<dt>Dimensions du boîtier</dt>'),'Unknown diameter replaced with truthful L × l × H');
    }else{
      assert.ok(html.includes('<dt>Diamètre</dt>'),'Round watch retains its separately documented diameter');
    }
  }


  const expectedMovement={quartz:'quartz',automatic:'automatique','eco-drive':'solaire'}[product.movement];
  const expectedTitle=product.brand+' '+product.model+' : montre '+expectedMovement+(product.specs?.diameter?' '+product.specs.diameter:'')+' | Atelier Montres';
  assert.ok(html.includes('<title>'+expectedTitle+'</title>'),'Search title contains exact model and sourced specs: '+product.id);
  assert.match(html,/<section class="seo-buying-checks"/,'Practical checks before purchase must be rendered');
  assert.ok(html.includes('code exact '+product.model),'Advice must use model-specific reference');
  assert.ok(html.includes(product.specs?.diameter?'Diamètre documenté : '+product.specs.diameter:product.specs?.caseSize?'Dimensions L × l × H indiquées : '+product.specs.caseSize:'Diamètre non renseigné'),'Documented case size must not be confused with a measured diameter');
  assert.ok(html.includes(product.specs?.waterResistance?'Étanchéité indiquée : '+product.specs.waterResistance:'Étanchéité non renseignée'),'Water resistance claims must not be invented');
  assert.equal((html.match(/class="seo-related-photo"/g)||[]).length,3,'Three photo comparison cards required');
  assert.equal((html.match(/loading="lazy" decoding="async"/g)||[]).length,3,'Below-fold related images must be lazy-loaded');
  if(product.photoReview?.publicUsageApproved===true){
    assert.ok(html.includes('width="'+product.photoReview.localWidth+'" height="'+product.photoReview.localHeight+'" decoding="async" fetchpriority="high"'),'High priority hero uses real source dimensions');
  }

  assert.ok(html.includes('montre.html?id='+encodeURIComponent(product.id)), 'Interactive product page must remain accessible');
  assert.equal(html.includes('cloud.umami.is/script.js'),analyticsConfigured,'SEO page Umami opt-in only');
  if(analyticsConfigured)assert.match(html,/data-watch-id=/);
  const amazonMatch=amazon.links[product.id];
  if(amazonMatch) {
    const selected=config.enabled&&config.links[product.id]?config.links[product.id].url:amazonMatch.url;
    assert.ok(html.includes('href="'+selected+'"'),'Exact Amazon URL should be crawlable: '+product.id);
    assert.ok(html.includes(config.enabled&&config.links[product.id]?'lien rémunéré':'sans lien rémunéré'));
    assert.ok(html.includes('data-amazon-product="'+product.id+'"'),'SEO click event needs exact watch id');
  }
  if(product.photoReview?.publicUsageApproved===true){
    const set=responsiveSrcset(root,product,'../');
    // Do not upscale the narrow 399px Swatch source just to force srcset.
    if(product.photoReview.localWidth>480){
      assert.ok(set&&html.includes('srcset="'+set+'"'),'Published model must expose responsive local photo variants: '+product.id);
      assert.ok(html.includes('sizes="(max-width: 760px) 92vw, 540px"'),'Responsive model image must declare realistic display sizes');
    }else{
      assert.equal(set,'','A narrow original photo must not be artificially upscaled');
    }
    const sourceBytes=statSync(resolve(root,'assets/watches/'+product.id+'.webp')).size;
    for(const width of [480,800].filter(w=>w<product.photoReview.localWidth)){
      const derived='assets/watch-responsive/'+product.id+'-'+width+'.webp';
      assert.ok(existsSync(resolve(root,derived)),'Missing responsive photo: '+derived);
      assert.ok(statSync(resolve(root,derived)).size<sourceBytes,'Responsive image must actually be smaller: '+derived);
    }
    const photoPath='assets/watches/'+product.id+'.webp';
    assert.equal(product.photoReview.permissionDeclaration,'site_owner_explicit_confirmation_2026-10-30','Declared authorization provenance must be explicit');
    assert.equal(product.photoReview.permissionIndependentlyVerified,false,'Never invent third-party proof');
    assert.ok(existsSync(resolve(root,photoPath)),'Locally published model photograph required: '+product.id);
    const bytes=readFileSync(resolve(root,photoPath));
    assert.ok(bytes.length>20000,'Local photo should be a full product picture');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),product.photoReview.localSha256,'Photograph checksum mismatch: '+product.id);
    assert.ok(html.includes('../'+photoPath),'SEO product detail should serve authorized image');
    assert.ok(html.includes('property="og:image"'),'Authorized picture is used for social sharing');
  }else {
    assert.match(html,/watch-vector/,'Original vector illustration instead of unlicensed image');
    assert.ok(html.includes('../seo-watch-art.js'),'SEO product page must render original art');
    assert.ok(!html.includes('../assets/watches/'+product.id+'.webp'),'No unlicensed image in product HTML');
    assert.ok(!existsSync(resolve(root,'assets/watches/'+product.id+'.webp')),'No unlicensed assets on the public deployment');
    assert.equal(product.photoReview?.url,undefined,'Never publish unlicensed manufacturer image URL');
    assert.equal(product.photoReview?.localUrl,undefined,'Never publish unlicensed WebP image path');
    assert.equal(product.photoReview?.source,undefined,'Never publish research photo-source URL');
  }
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Single product canonical');
  const schema=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(schema,'JSON-LD required');
  assert.equal(JSON.parse(schema[1])['@graph'][0]['@type'],'Product');
}
assert.match(read('affiliation.js'),/hasEditorialPages/);
assert.match(read('affiliation.js'),/am-card-seo-link/);
for(const name of ['revue-photo.html','revue-photo.js','revue-photo.css']){
  assert.ok(!existsSync(resolve(root,name)),'No internal photo-research UI exposed on the public site: '+name);
}
assert.ok(existsSync(resolve(root,'seo-watch-art.js')),'SEO watch illustrations script is required');
const sitemap=read('sitemap.xml');
assert.equal((sitemap.match(/<loc>/g)||[]).length,71);
const comparisons=JSON.parse(read('comparaisons-montres.json'));
assert.equal(comparisons.version,1);
assert.equal(comparisons.comparisons.length,4);
for(const c of comparisons.comparisons){
  const left=feed.products.find(p=>p.id===c.left);
  const right=feed.products.find(p=>p.id===c.right);
  assert.ok(left&&right&&left.id!==right.id,'Both compared references must exist');
  const path='montres/comparer-'+c.slug+'.html';
  const html=read(path);
  assert.ok(statSync(resolve(root,path)).size>2000,'Full editorial page: '+path);
  assert.ok(manifest.paths.includes(manifest.siteUrl+path),'Comparison must enter manifest');
  assert.ok(sitemap.includes(manifest.siteUrl+path),'Comparison must enter sitemap');
  assert.ok(home.includes('./'+path),'Comparison must link from homepage');
  assert.ok(html.includes('href="./'+left.id+'.html"')&&html.includes('href="./'+right.id+'.html"'),'Each side links to exact SEO product');
  assert.ok(html.includes('href="'+left.officialUrl+'"')&&html.includes('href="'+right.officialUrl+'"'),'Each side links to official manufacturer');
  assert.ok(html.includes(left.model)&&html.includes(right.model));
  assert.match(html,/class="spec-matrix"/,'Actual side-by-side evidence');
  for(const p of [left,right]){
    if(p.photoReview?.publicUsageApproved===true){
      assert.ok(html.includes('src="../assets/watches/'+p.id+'.webp"'),'Approved photo in head-to-head comparison: '+p.id);
    }else {
      assert.ok(html.includes('data-watch-id="'+p.id+'"'),'Original vector fallback for unapproved comparison image: '+p.id);
      assert.ok(!html.includes('src="../assets/watches/'+p.id+'.webp"'),'Never publish unapproved comparison photo: '+p.id);
    }
  }
  assert.equal((html.match(/class="headtohead-photo"/g)||[]).length,
    [left,right].filter(p=>p.photoReview?.publicUsageApproved===true).length,'One photograph per approved compared model');
  assert.match(html,/<h1>/);
  assert.match(html,/rel="canonical"/);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Single canonical comparison URL');
  assert.equal(html.includes('cloud.umami.is/script.js'),analyticsConfigured,'Umami remains explicitly optional');
  assert.doesNotMatch(html,/"offers"\s*:|"price"\s*:|"availability"\s*:|"aggregateRating"\s*:/,'Never invent price, stock, reviews or offers');
  const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const schema=JSON.parse(json[1]);
  assert.equal(schema['@graph'][0]['@type'],'Article');
  assert.equal(schema['@graph'][2]['@type'],'ItemList');
  assert.equal(schema['@graph'][2].numberOfItems,2);
  for(const p of [left,right]){
    assert.match(read('montres/'+p.id+'.html'),new RegExp('comparer-'+c.slug+'\\.html'),'Relevant product page must cross-link comparison');
    const match=amazon.links[p.id];
    if(match){
      const selected=config.enabled&&config.links[p.id]?config.links[p.id].url:match.url;
      assert.ok(html.includes('href="'+selected+'"'),'Direct exact Amazon URL on comparison: '+p.id);
      assert.ok(html.includes('data-amazon-product="'+p.id+'"'),'Optional event hook on comparison: '+p.id);
      assert.ok(html.includes(config.enabled&&config.links[p.id]?'lien rémunéré':'lien non rémunéré'));
    }
  }
}
const seoCategories=[
 {slug:'montres-quartz',members:feed.products.filter(p=>p.movement==='quartz'),title:'Montres à quartz'},
 {slug:'montres-casio',members:feed.products.filter(p=>p.brand==='Casio'),title:'Montres Casio'},
 {slug:'montres-petit-boitier',members:feed.products.filter(p=>{const m=/^(\d{1,2})(?:[,.](\d{1,2}))?\s*mm$/i.exec((p.specs?.diameter||'').trim());return m&&Number(m[1]+'.'+(m[2]||'0'))<=38}),title:'Montres à petit boîtier'}
];
assert.deepEqual(seoCategories.map(x=>x.members.length),[7,5,2]);
for(const category of seoCategories){
 const path='montres/'+category.slug+'.html';
 const html=read(path);
 assert.ok(statSync(resolve(root,path)).size>3000,'Unique editorial category with real comparisons: '+path);
 assert.ok(manifest.paths.includes(manifest.siteUrl+path),'Search collection must be in published manifest: '+path);
 assert.ok(sitemap.includes(manifest.siteUrl+path),'Search collection must appear in sitemap: '+path);
 assert.ok(home.includes('./'+path),'Homepage category link is crawlable: '+path);
 assert.ok(html.includes(category.title),'Category must match a real search intent: '+path);
 assert.ok(html.includes('<link rel="canonical" href="'+manifest.siteUrl+path+'">'));
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Only one canonical per category');
 assert.match(html,/<h1>/,'An actual category H1 is required');
 assert.match(html,/class="seo-collection-grid"/,'Visible accessible photographic product cards');
 assert.match(html,/class="spec-matrix"/,'Source-backed facts table is required');
 assert.match(html,/class="comparison-scroll"/,'Mobile table must be scrollable');
 if(category.members.some(p=>!p.specs?.diameter||!p.specs?.glass||!p.specs?.waterResistance)) assert.match(html,/Non renseigné|À vérifier/,'Unknown specification values must stay explicitly unknown');
 else assert.match(html,/Une mesure absente n’est jamais estimée/,'Even complete categories need an evidence disclaimer');
 assert.doesNotMatch(html,/"offers"\s*:|"price"\s*:|"availability"\s*:|"aggregateRating"\s*:/,'No fabricated merchant/ratings metadata');
 assert.equal(html.includes('cloud.umami.is/script.js'),analyticsConfigured,'Tracking remains opt-in');
 assert.equal((html.match(/class="seo-collection-card"/g)||[]).length,category.members.length,'Exactly the catalogued products, not arbitrary keyword landing pages');
 const graphMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.ok(graphMatch,'Structured metadata must be server-rendered');
 const graph=JSON.parse(graphMatch[1]);
 assert.deepEqual(graph['@graph'].map(n=>n['@type']),['CollectionPage','ItemList','BreadcrumbList']);
 assert.equal(graph['@graph'][0].url,manifest.siteUrl+path);
 assert.equal(graph['@graph'][1].numberOfItems,category.members.length);
 assert.equal(graph['@graph'][1].itemListElement.length,category.members.length);
 assert.deepEqual(graph['@graph'][1].itemListElement.map(n=>n.url),category.members.map(p=>manifest.siteUrl+'montres/'+p.id+'.html'));
 for(const p of category.members){
   assert.ok(html.includes(p.brand+' '+p.model),'Model name must be accurate: '+p.id);
   assert.ok(html.includes('href="./'+p.id+'.html"'),'Exact internal product link missing: '+p.id);
   assert.ok(html.includes('href="'+p.officialUrl+'"'),'Manufacturer link missing: '+p.id);
   assert.ok(read('montres/'+p.id+'.html').includes('./'+category.slug+'.html'),'Product must link back to its relevant category: '+p.id);
   const image='src="../assets/watches/'+p.id+'.webp"';
   assert.equal(html.includes(image),p.photoReview?.publicUsageApproved===true,'Only owner-approved exact photos in collection: '+p.id);
   const match=amazon.links[p.id];
   if(match){
     const selected=config.enabled&&config.links[p.id]?config.links[p.id].url:match.url;
     assert.ok(html.includes('href="'+selected+'"'),'Only exact Amazon listing may be linked: '+p.id);
     if(config.enabled&&config.links[p.id]){
       assert.ok(html.includes('data-amazon-product="'+p.id+'"'),'Same product id used by existing analytics');
       assert.ok(html.includes('rel="nofollow sponsored noopener noreferrer"'),'Affiliate link must be sponsored');
       assert.ok(html.includes('lien rémunéré'),'Clear paid disclosure');
     }
   }
 }
}
const editorialPaths=['quartz-ou-automatique','taille-boitier-montre','montres-automatiques'];
for(const slug of editorialPaths){
 const path='montres/'+slug+'.html',page=read(path);
 assert.ok(page.includes(manifest.siteUrl+path),path);
 assert.match(page,/<h1>/);
 assert.match(page,/<ul class="related">|<table class="spec-matrix"/);
 assert.ok(home.includes('./montres/'+slug+'.html'),'Missing homepage editorial card: '+slug);
 assert.ok(sitemap.includes(manifest.siteUrl+path));
 const meta=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.equal(JSON.parse(meta[1])['@type'],'Article');
}
assert.ok(!read('affiliation.html').includes('AM_SEO_LINKS_START') || read('affiliation.html').includes('AM_SEO_LINKS_END'));
assert.ok(sitemap.includes(manifest.siteUrl+'montres/guide-choisir-montre.html'));
assert.match(read('robots.txt'),/Sitemap: https:\/\//);
const privacy=read('confidentialite.html');
assert.equal(privacy.includes('Les visites et clics sortants vers Amazon.fr et les fiches des marques ou vendeurs documentés sont mesurés avec Umami Cloud'),analyticsConfigured);
assert.ok(read('analytics.js').includes("merchantHosts=new Set([")&&read('analytics.js').includes("'merchant:'+id+':'+placement"),
  'Brand/vendor conversion-intent events require a strict destination allowlist');
assert.ok(privacy.includes('chez Render'),'Privacy notice must identify actual host');
const guide=read('montres/guide-choisir-montre.html');
assert.match(guide,/<h1>Comment choisir une montre/);
console.log('SEO validation OK: 15 model pages, 3 categories, 4 guides, 4 comparisons, transparent editorial method, 13 Amazon links, 71 sitemap URLs, 37 individual source-backed product pages and genuine hero LCP preload');
