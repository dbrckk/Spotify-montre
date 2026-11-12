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
const htmlEscape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
const feed=JSON.parse(read('selection-affiliation.json'));
const manifest=JSON.parse(read('seo-manifest.json'));
assert.equal(manifest.productCount,15);
assert.equal(manifest.popularAdditionalCount,37,'37 researched models complement the 15 photo-backed core products');
assert.equal(manifest.popularDetailCount,37,'Every supplemental model requires a dedicated factual landing page');
assert.equal(manifest.popularAffiliateDirectLinks,manifest.affiliateActive?14:0,'Only source-verified supplementary ASINs may become direct product links');
assert.equal(manifest.popularAffiliateSearchLinks,manifest.affiliateActive?23:0,'All remaining supplemental products require labeled Amazon searches');
const insightData=JSON.parse(read('editorial-insights.json'));
assert.equal(insightData.version,1);
assert.equal(Object.keys(insightData.products).length,15,'15 unique editorial briefs required');
const editorialTexts=new Set();
for(const p of feed.products){
 const insight=insightData.products[p.id];
 assert.ok(insight,'No editorial copy for '+p.id);
 const pageHtml=read('montres/'+p.id+'.html');
  const articleOpen=pageHtml.match(/<article class="watch watch-product"[^>]*>/)?.[0]||'';
  assert.ok([
    'data-watch-id="'+p.id+'"',
    'data-brand="'+htmlEscape(p.brand)+'"',
    'data-model="'+htmlEscape(p.model)+'"'
  ].every(attribute=>articleOpen.includes(attribute)),
    'Core watch reference must use documented brand and model: '+p.id);
  assert.equal((pageHtml.match(/data-watch-ref-copy=/g)||[]).length,1,
    'One exact source-only model copy control per historical watch: '+p.id);
  assert.ok(pageHtml.includes('data-watch-ref-copy="'+p.id+'" hidden>Copier la référence</button>'),
    'Source-model copy enhancement must fail closed without JavaScript: '+p.id);
  assert.ok(pageHtml.includes('<h1>'+htmlEscape(p.brand+' '+p.model)+'</h1>'),
    'Core reference identity must match visible H1: '+p.id);
  assert.ok(pageHtml.includes('src="../watch-reference-copy-v2.js"')&&
    pageHtml.includes('href="../watch-reference-copy.css"'),
    'Historical watch page must load common safe reference helper: '+p.id);
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

assert.equal(manifest.comparisonCount,4,'Four evidence-based historical pairs must remain indexable');
assert.equal(manifest.affordableComparisonCount,4,'Four independent affordable buying decisions must be indexable');
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
assert.match(amazon.checkedOn,/^20\d{2}-\d{2}-\d{2}$/);
assert.equal(Object.values(amazon.links).filter(x=>
  x.availabilityAtCheck==='unavailable_at_check').length,4,
  'Four historically unavailable listings must not be falsely marked buyable');
for(const [id,entry] of Object.entries(amazon.links)){
 assert.ok(feed.products.some(p=>p.id===id),'Unknown Amazon reference');
 assert.match(entry.asin,/^[A-Z0-9]{10}$/);
 assert.equal(entry.url,'https://www.amazon.fr/dp/'+entry.asin);
 assert.ok(['not_checked','unavailable_at_check'].includes(entry.availabilityAtCheck),
   'Amazon source status must be preserved without a fabricated live stock claim');
 assert.ok(!entry.url.includes('?tag='),'Unapproved affiliate tracking cannot be published');
 const indexedProduct=read('montres/'+id+'.html');
 assert.ok(indexedProduct.includes('data-amazon-evidence-status="'+entry.availabilityAtCheck+'"'),
   'Indexed watch page must disclose the same dated stock evidence as the purchase gateway: '+id);
 assert.ok(indexedProduct.includes(amazon.checkedOn.split('-').reverse().join('/')),
   'Indexed watch page must show the actual observation date: '+id);
 if(entry.availabilityAtCheck==='unavailable_at_check'){
   assert.ok(indexedProduct.includes('stock à vérifier'),
     'Previously unavailable product must not be advertised as a live buyable offer: '+id);
   assert.ok(indexedProduct.includes('Indisponible lors du contrôle'),
     'Historically unavailable observation must be labeled and dated: '+id);
 }else{
   assert.ok(indexedProduct.includes('Disponibilité non vérifiée au'),
     'Unobserved stock status must be disclosed on product page: '+id);
 }
}
for(const id of ['citizen-eco','tissot-prx-auto']){
 const indexedProduct=read('montres/'+id+'.html');
 assert.ok(!indexedProduct.includes('data-amazon-evidence-status='),
   'Unknown exact ASIN must not inherit another model’s stock evidence: '+id);
}

assert.equal(manifest.paths.length,78,'Existing 74 SEO URLs plus four original affordable duels');
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
const publicHome=read('index.html');
// The public LCP and product cards must use the exact rights-approved widths
// emitted by the current photo generator, not a stale 480/800px snapshot.
const approvedHomeModels=new Map(feed.products
  .filter(p=>p.photoReview?.publicUsageApproved===true).map(p=>[p.id,p]));
const homeImgTags=[...publicHome.matchAll(/<img\b[^>]*\bsrc="\.\/assets\/watches\/([a-z0-9-]+)\.webp(?:\?[^\"]*)?"[^>]*>/g)];
for(const [tag,id] of homeImgTags.map(match=>[match[0],match[1]])){
  const product=approvedHomeModels.get(id);
  assert.ok(product,'Public home must only reference approved watch photo: '+id);
  const expected=responsiveSrcset(root,product,'./');
  if(!expected)continue;
  assert.ok(tag.includes('srcset="'+htmlEscape(expected)+'"'),
    'Homepage model must use every verified local WebP width: '+id);
  assert.match(tag,/\bsizes="[^"]+"/,'Homepage responsive image needs display sizes: '+id);
}
const homePreloads=[...publicHome.matchAll(/<link\b[^>]*\brel="preload"[^>]*\bas="image"[^>]*>/g)];
for(const preload of homePreloads){
  const tag=preload[0],match=tag.match(/\bhref="\.\/assets\/watches\/([a-z0-9-]+)\.webp(?:\?[^\"]*)?"/);
  if(!match)continue;
  const product=approvedHomeModels.get(match[1]);
  assert.ok(product,'Homepage must not preload a photo without publication rights');
  const expected=responsiveSrcset(root,product,'./');
  if(expected)assert.ok(tag.includes('imagesrcset="'+htmlEscape(expected)+'"'),
    'Homepage preload must agree with the visible hero photo srcset: '+match[1]);
}
const home=read('affiliation.html');
const affordableDuels=JSON.parse(read('comparaisons-accessibles.json'));
const escapeEditorialHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const affordableCatalog=JSON.parse(read('selection-populaires.json')).products;
const affordableRights=JSON.parse(read('popular-photo-rights.json')).photos;
const affordableASIN=JSON.parse(readFileSync(resolve(root,'../research/amazon-fr-popular-verified.json'),'utf8')).verifiedProducts;
assert.equal(affordableDuels.version,1);
assert.equal(affordableDuels.comparisons.length,4);
assert.equal(new Set(affordableDuels.comparisons.map(pair=>pair.slug)).size,4);
const affordableById=new Map(affordableCatalog.map(p=>[p.id,p]));
const duelsById=new Map();
const duelPairs=new Set();
const xmlSitemap=read('sitemap.xml');
for(const pair of affordableDuels.comparisons){
  const left=affordableById.get(pair.left),right=affordableById.get(pair.right);
  assert.ok(left&&right&&left.id!==right.id,'Buyer duel must compare two different documented models');
  const key=[left.id,right.id].sort().join('|');
  assert.ok(!duelPairs.has(key),'No duplicate commercial comparison pages');
  duelPairs.add(key);
  const path='montres/comparer-'+pair.slug+'.html';
  const url=manifest.siteUrl+path;
  const html=read(path);
  assert.ok(manifest.paths.includes(url)&&xmlSitemap.includes(url),'New buyer duel must be crawlable: '+pair.slug);
  assert.ok(html.includes('<link rel="canonical" href="'+url+'">'),'Unique canonical URL required for '+pair.slug);
  assert.ok(html.includes('data-affordable-duel="'+pair.slug+'"'),'Correct pair identity required: '+pair.slug);
  assert.ok(html.includes('<h1>'+pair.title+'</h1>'),'Original editorial comparison title required');
  assert.ok([pair.intro,pair.leftAdvice,pair.rightAdvice,pair.caution].every(copy=>html.includes(escapeEditorialHtml(copy))),
    'Original distinct buying guidance missing or not safely HTML-escaped for '+pair.slug);
  assert.equal((html.match(/class="am-duel-model" data-duel-model="/g)||[]).length,2,
    'Two and only two real products in the buying comparison: '+pair.slug);
  assert.ok(html.includes('href="./'+left.id+'.html"')&&html.includes('href="./'+right.id+'.html"'),
    'Both actual model fiches must be accessible from the buyer article');
  assert.match(html,/class="spec-matrix"/,'Factual accessible comparison table required');
  assert.ok(html.includes(left.movement)&&html.includes(right.movement)
    &&html.includes(left.case)&&html.includes(right.case)
    &&html.includes(left.glass)&&html.includes(right.glass)
    &&html.includes(left.water)&&html.includes(right.water),
    'Buyer table must use the original sourced facts, including unknowns');
  const prefill='./toutes-les-montres.html?compare='+left.id+','+right.id+'#comparer';
  assert.ok(html.includes('href="'+prefill+'"'),'One-tap exact product comparison required: '+pair.slug);
  const jsonLd=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'{}');
  assert.equal(jsonLd['@graph'][0]['@type'],'Article');
  assert.equal(jsonLd['@graph'][0].mainEntityOfPage,url);
  assert.deepEqual(jsonLd['@graph'][1].itemListElement.map(x=>x.url),
    [manifest.siteUrl+'montres/'+left.id+'.html',manifest.siteUrl+'montres/'+right.id+'.html']);
  assert.doesNotMatch(html,/"offers"\s*:|"aggregateRating"\s*:|data-checkout|class="add-to-cart"/,
    'No invented stock, ratings or transaction checkout: '+pair.slug);
  assert.equal((html.match(/class="am-duel-merchant"/g)||[]).length,2,
    'Both products need a genuinely reachable source or direct merchant');
  for(const p of [left,right]){
    const amazonEntry=affordableASIN[p.id];
    const shouldLink=manifest.affiliateActive&&Boolean(amazonEntry);
    const photo=affordableRights[p.id];
    assert.ok(html.includes(photo?'src="../assets/watches-popular/'+p.id+'.webp"':
      'Photographie exacte à consulter chez le fabricant'),
      'Never invent or substitute a missing product photo: '+p.id);
    if(shouldLink){
      const href='https://www.amazon.fr/dp/'+amazonEntry.asin+'?tag='+config.amazonPartnerTag;
      assert.ok(html.includes('href="'+href+'"'),'Amazon buyer CTA must use source-backed ASIN and owner tag: '+p.id);
      assert.ok(html.includes('data-amazon-product="'+p.id+'"'),'Amazon source tracking missing for '+p.id);
      assert.match(html,/rel="noopener noreferrer nofollow sponsored"/);
      if(amazonEntry.marketplaceVariant)
        assert.ok(html.includes(escapeEditorialHtml(amazonEntry.marketplaceVariant)),
          'Variant disclosures must not disappear on editorial duels: '+p.id);
      if(amazonEntry.evidenceType==='amazon_fr_comparator_redirect')
        assert.ok(html.includes('Amazon.fr non consulté directement'),
          'Comparator-only ASIN must not claim direct Amazon inspection: '+p.id);
    }else{
      assert.ok(html.includes('href="'+p.officialUrl.replace(/&/g,'&amp;')+'"'),
        'No verified ASIN means manufacturer source, never invented direct purchase: '+p.id);
      assert.ok(html.includes('data-merchant-official-id="'+p.id+'"'),
        'Uncompensated source must stay distinct from Amazon click: '+p.id);
    }
    if(!duelsById.has(p.id))duelsById.set(p.id,[]);
    duelsById.get(p.id).push(pair.slug);
  }
}
assert.match(read('affordable-comparisons.css'),/\.am-duel-promo-grid\{/,
  'Fully responsive premium comparison design must be deployed');

// The public storefront and the long-form editorial comparison are now
// deliberately different pages, both useful and indexable.
assert.notEqual(publicHome,home,'Customer homepage must not be a duplicate comparison page');
assert.match(publicHome,/href="\.\/montres\/toutes-les-montres\.html"/);
assert.match(publicHome,/href="\.\/acheter\.html#amPartnerSelection"/);
assert.match(publicHome,/href="\.\/public-home\.css"/);
assert.match(publicHome,/id="montres"/);
assert.doesNotMatch(publicHome,/Projet en préparation|Notre sélection se prépare/);
assert.ok(publicHome.includes('<link rel="canonical" href="'+manifest.siteUrl+'">'),
  'Customer homepage must retain its own canonical URL');
assert.ok(home.includes('<link rel="canonical" href="'+manifest.siteUrl+'affiliation.html">'),
  'Editorial showroom must have its own canonical URL');
assert.equal((publicHome.match(/rel="canonical"/g)||[]).length,1);
assert.equal((publicHome.match(/AM_PUBLIC_SEO_START/g)||[]).length,1);
assert.equal((publicHome.match(/AM_PUBLIC_SEO_END/g)||[]).length,1);
assert.ok(home.includes('52 MONTRES DOCUMENTÉES'),'The hero must present the full 52-model range');
assert.ok(home.includes('Explorer les 52 montres'),'Primary discovery CTA must open the complete catalogue');
assert.ok(home.includes('15 montres comparées en détail'),'The 15 in-depth subset must remain clearly described');
assert.ok(home.includes('href="./montres/toutes-les-montres.html">52 montres</a>'),'Navigation must link to unified collection');
assert.ok(!/découvrez 15 références réelles|parmi nos 15 modèles authentiques|Découvrir les 15 modèles/i.test(home),'No stale 15-only main offer');
assert.ok(home.includes('52 montres documentées à découvrir, dont 15 comparées en profondeur'),'Social preview must match real scope');
const premiumCss=read('premium-system.css');
assert.match(premiumCss,/--am-p-paper:/,'Premium color tokens must ship');
assert.match(premiumCss,/prefers-reduced-motion:reduce/,'Motion preferences must be respected');
for(const page of ['affiliation.html','conseiller.html','montre.html']){
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
assert.match(privacyDisclosure,/id="amPrivacyControls"[^>]*hidden/,'No nonfunctional privacy deletion panel without JS');
assert.match(privacyDisclosure,/src="\.\/privacy-controls\.js"/,'Local privacy control must be explicitly loaded');
assert.match(privacyDisclosure,/id="amPrivacyFallback"/,'No-JS deletion guidance must be available');
const privacyControlJs=read('privacy-controls.js');
assert.match(privacyControlJs,/atelier-montres-multibrand-favorites-v1/,'Real saved favorites must be covered');
assert.match(privacyControlJs,/atelier-montres-comparison-v1/,'Session comparison must be covered');
assert.doesNotMatch(privacyControlJs,/\b(?:localStorage|sessionStorage)\.clear\s*\(/,
  'No bulk storage clearing: order follow-up access and third-party keys are not preferences');
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
const partnerPurchase=read('acheter.html');
assert.match(partnerPurchase,/id="amPartnerSelection"/,
  'Purchase page must keep its exact-model partner section');
assert.equal(partnerPurchase.includes('cloud.umami.is/script.js'),analyticsConfigured,
  'Showroom analytics must use the same optional configuration as the homepage');
assert.equal(partnerPurchase.includes('src="./analytics.js"'),analyticsConfigured,
  'Showroom outbound events are not measurable if the delegated tracker is absent');
assert.equal((partnerPurchase.match(/AM_PARTNER_ANALYTICS_START/g)||[]).length,1,
  'Rebuilt partner page must contain exactly one analytics guard marker');
if(analyticsConfigured){
  assert.match(partnerPurchase,/data-do-not-track="true"/);
  assert.equal((partnerPurchase.match(/cloud\.umami\.is\/script\.js/g)||[]).length,1,
    'Rebuilt partner page must never register the Umami script twice');
}

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

const heroPreferred=feed.products.find(p=>p.id==='citizen-tsuyosa');
const hero=heroPreferred?.photoReview?.publicUsageApproved===true
  ?heroPreferred:feed.products.find(p=>p.photoReview?.publicUsageApproved===true);
if(hero){
  assert.match(home,/id="heroWatch"[^>]*><img class="am-hero-real-photo"/,
    'Homepage must show only an approved real watch photo before JS');
  const heroPhoto='./assets/watches/'+hero.id+'.webp?v='+hero.photoReview.localSha256.slice(0,12);
  assert.ok(home.includes('src="'+heroPhoto+'"'),'Early homepage image must match an approved model');
  assert.ok(home.includes('<link rel="preload" as="image" fetchpriority="high" href="'+heroPhoto+'" imagesrcset="'),
    'LCP preload must match approved homepage hero');
  assert.ok(home.includes('imagesizes="(max-width: 760px) 92vw, 520px"'),
    'LCP preload responsive sizes must match displayed image');
  assert.ok(home.includes('<meta property="og:image" content="'+manifest.siteUrl+'assets/watches/'+hero.id+'.webp">'),
    'Social image must be approved and exact-model');
  assert.ok(home.includes('<meta name="twitter:card" content="summary_large_image">'));
}else{
  assert.ok(home.includes('aria-label="Illustration éditoriale sans photographie publiée"'),
    'Fallback to documented editorial art when every photograph is withdrawn');
  assert.ok(!home.includes('class="am-hero-real-photo"'),'No withdrawn hero photo');
}
for(const marker of ['AM_SEO_LINKS_START','AM_SEO_LINKS_END','AM_SEO_HEAD_START','AM_SEO_HEAD_END','AM_SEO_GUIDES_START','AM_SEO_GUIDES_END','AM_SEO_CATEGORIES_START','AM_SEO_CATEGORIES_END','AM_SEO_COMPARISONS_START','AM_SEO_COMPARISONS_END']){
 assert.equal(home.split(marker).length-1,1,'Idempotent build marker: '+marker);
}
assert.equal((home.match(/rel="canonical"/g)||[]).length,1,'Homepage has exactly one canonical link');

// Four high-intent, photographed references must be visible immediately after
// the homepage hero, without misleading prices, invented ASINs or fake photos.
assert.equal((home.match(/AM_AFFORDABLE_SHOWROOM_START/g)||[]).length,1,
  'Exactly one accessible showroom must be injected into every build');
assert.equal((home.match(/AM_AFFORDABLE_SHOWROOM_END/g)||[]).length,1);
const affordableHtml=home.match(/<section class="am-affordable" id="selection-accessible"[\s\S]*?<\/section>/)?.[0];
assert.ok(affordableHtml,'The commercial showroom must remain a no-JS, crawlable section');
assert.ok(home.indexOf('id="selection-accessible"')>home.indexOf('class="aff-hero"')
  &&home.indexOf('id="selection-accessible"')<home.indexOf('id="gammes"'),
  'Affordable photographic models must appear immediately after the hero, before the 15-model catalogue');
const affordableIds=['skmei-1257','skmei-1251','addiesdive-ad2030','pagani-pd1701'];
const affordableComparePairs={
  'skmei-1257':'skmei-1251',
  'skmei-1251':'skmei-1257',
  'addiesdive-ad2030':'pagani-pd1701',
  'pagani-pd1701':'addiesdive-ad2030'
};
assert.deepEqual([...affordableHtml.matchAll(/data-affordable-id="([^"]+)"/g)].map(m=>m[1]),affordableIds,
  'The showcase contains four distinct researched and buyer-visible economical choices');
assert.ok(affordableHtml.includes('sans prix, stock ni classement de ventes inventés'));
assert.ok(affordableHtml.includes('non vérifiées indépendamment'),
  'Publisher-attested product photo permissions must not masquer independent licensing');
for(const id of affordableIds){
  const card=affordableHtml.match(new RegExp('<article class="am-affordable-card" data-affordable-id="'+id+'"[\\s\\S]*?<\\/article>'))?.[0];
  assert.ok(card,'Missing sourced homepage hero watch '+id);
  const product=JSON.parse(read('selection-populaires.json')).products.find(p=>p.id===id);
  assert.ok(product&&card.includes('href="./montres/'+id+'.html"'),
    'Each affordably styled watch must link to its genuine product detail page: '+id);
  if(Object.hasOwn(JSON.parse(read('popular-photo-rights.json')).photos,id)){
    assert.ok(card.includes('src="./assets/watches-popular/'+id+'.webp"'),
      'Approved exact-model photo required when its registry entry is active: '+id);
  }else{
    assert.ok(card.includes('am-affordable-no-photo')&&
      !card.includes('src="./assets/watches-popular/'+id+'.webp"'),
      'Revoked model must remain discoverable without any unapproved media: '+id);
  }
  const comparedId=affordableComparePairs[id];
  assert.ok(comparedId&&comparedId!==id&&affordableIds.includes(comparedId),
    'Home comparison must always use a second documented affordable watch: '+id);
  const expectedCompare='./montres/toutes-les-montres.html?compare='+encodeURIComponent(id+','+comparedId)+'#comparer';
  assert.ok(card.includes('href="'+expectedCompare+'"'),
    'No-JS page must link to a real prefilled two-watch comparison: '+id);
  assert.ok(card.includes('data-affordable-compare="'+id+'"'),
    'Buyer comparison actions must retain their exact source watch ID: '+id);
  assert.equal((card.match(/data-amazon-product=/g)||[]).length,manifest.affiliateActive?1:0,
    'No extra or unapproved sponsored exit can appear in the affordable showroom: '+id);
  assert.equal((card.match(/data-merchant-official-id=/g)||[]).length,manifest.affiliateActive?0:1,
    'Non-monetized fixture must show the real manufacturer/supplier source: '+id);
}
if(manifest.affiliateActive){
  for(const [id,asin] of [
    ['skmei-1257','B07B6ML1VJ'],['skmei-1251','B072JTCP5H'],
    ['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']
  ]){
    const card=affordableHtml.match(new RegExp('<article class="am-affordable-card" data-affordable-id="'+id+'"[\\s\\S]*?<\\/article>'))?.[0];
    assert.ok(card.includes('https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21'),
      'Only the source-backed exact ASIN and current owner tag may be featured: '+id);
    assert.match(card,/rel="noopener noreferrer nofollow sponsored"/);
    assert.ok(card.includes('data-amazon-placement="showroom"'),
      'Four new buy-now links must be attributable to their actual homepage placement');
  }
  assert.ok(affordableHtml.includes('data-affordable-proof="comparator"')
    &&affordableHtml.includes('La page Amazon.fr n’a pas été consultée directement'),
    'SKMEI 1251 comparator-only evidence must remain explicit in the leading commercial showroom');
}
assert.match(read('popular-picks.css'),/\.am-affordable-grid\{/,
  'Premium mobile responsive layout is required for above-hero commercial showcase');


// Every supplemental model has manufacturer evidence. Only explicitly
// source-confirmed Amazon.fr ASINs can become direct product links.
const exactPopular=JSON.parse(readFileSync(resolve(root,'../research/amazon-fr-popular-verified.json'),'utf8'));
const exactPopularLinks=exactPopular.verifiedProducts;
assert.equal(Object.keys(exactPopularLinks).length,14,'ASIN promotion requires a source-verified registry entry');
for(const [id,asin,code,comparator] of [
  ['casio-la-20wh-4a1','B077YZHF21','LA-20WH-4A1EF',
    'https://www.123comparer.fr/Montres-femme/go4ueqjige5dnpt38yhur.html'],
  ['tissot-gentleman-auto','B07XTVQ3W7','T1274071104100',
    'https://www.123comparer.fr/Montres-homme/gh5dncjsgyhdrqj1gahug.html'],
  ['casio-dw5600rl-1','B0DN6LT6FX','DW-5600RL-1ER',
    'https://leboncadran.fr/montre/casio-the-origin-dw-5600rl-1er'],
  ['tissot-le-locle-white','B01N7FXE80','T0064071103300',
    'https://leboncadran.fr/montre/tissot-le-locle-automatique-t0064071103300']
]){
  const record=exactPopularLinks[id];
  assert.equal(record.asin,asin,'Exact source ASIN for '+id);
  assert.equal(record.marketplaceModel,code,'No inferred regional model for '+id);
  assert.equal(record.evidenceType,'amazon_fr_comparator_redirect',
    'Do not imply first-hand Amazon.fr inspection: '+id);
  assert.equal(record.comparisonUrl,comparator);
  assert.equal(record.evidenceUrl,'https://www.amazon.fr/dp/'+asin);
}
assert.equal(exactPopularLinks['casio-gw-m5610u-1'].asin,'B09BCPP68Q','Actual Amazon.fr G-SHOCK source code must be used');
assert.equal(exactPopularLinks['casio-f91w-1'].asin,'B000J34HN4','Casio F-91W documented Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-a168wg-9'].asin,'B002LAS086','Casio vintage gold documented Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-a158wea-1'].asin,'B000GAYQJ0','Casio A158 silver exact regional listing and Amazon.fr ASIN');
assert.equal(exactPopularLinks['casio-ga-2100-1a1'].asin,'B07WGJ1JNW','GA-2100 blackout G-SHOCK exact regional listing and Amazon.fr ASIN');
const skmei1257=exactPopularLinks['skmei-1257'];
assert.equal(skmei1257.asin,'B07B6ML1VJ','SKMEI 1257 black must use its directly inspected Amazon.fr ASIN');
assert.equal(skmei1257.marketplaceModel,'1257');
assert.equal(skmei1257.verifiedAt,'2026-11-02','SKMEI evidence must be dated');
assert.equal(skmei1257.evidenceUrl,'https://www.amazon.fr/dp/B07B6ML1VJ');
assert.match(skmei1257.evidenceListingTitle,/SKMEI.*1257/i);
assert.match(skmei1257.marketplaceVariant,/1257 Black/,'Specific black variant must not become a generic model claim');

for(const [id,asin,model] of [
  ['skmei-1251','B072JTCP5H','1251'],
  ['casio-ae1200wh-1av','B0099M2IWI','AE-1200WH-1AVEF']
]){
  const proof=exactPopularLinks[id];
  assert.ok(proof,'Missing cross-referenced Amazon.fr comparator redirect: '+id);
  assert.equal(proof.asin,asin,'Redirect ASIN must match the source evidence: '+id);
  assert.equal(proof.marketplaceModel,model);
  assert.equal(proof.verifiedAt,'2026-11-02');
  assert.equal(proof.evidenceType,'amazon_fr_comparator_redirect',
    'A comparator redirect is NOT a firsthand inspection of Amazon: '+id);
  assert.equal(proof.evidenceUrl,'https://www.amazon.fr/dp/'+asin);
  assert.match(proof.evidenceNote,/pas pu être consultée directement/,
    'The inability to visit the Amazon listing must be documented: '+id);
  assert.match(proof.comparisonUrl,/^https:\/\/(?:www\.leguide\.com|www\.123comparer\.fr)\//);
  assert.match(proof.corroborationUrl,/^https:\/\/www\.desertcart\./);
  const detail=read('montres/'+id+'.html');
  assert.ok(detail.includes('via redirection du comparateur et source indépendante'),
    'Product page must NOT claim direct Amazon inspection: '+id);
  assert.ok(detail.includes('fiche Amazon.fr non consultée directement'),
    'Buyer-facing evidence status must be prominent: '+id);
}


for(const [id,asin] of [['skmei-1257','B07B6ML1VJ'],['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
  const proof=exactPopularLinks[id];
  assert.equal(proof.asin,asin,'Published ASIN must be independently documented: '+id);
  assert.equal(proof.verifiedAt,id==='skmei-1257'?'2026-11-02':'2026-11-01','Each exact listing must retain its genuine verification date: '+id);
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
const commercial=JSON.parse(read('commercial-registry.json'));
assert.equal(commercial.version,1);
assert.equal(commercial.scope,'editorial_watch_purchase_evidence_not_live_offers');
assert.equal(commercial.counts.total,52);
assert.equal(commercial.counts.core,15);
assert.equal(commercial.counts.supplemental,37);
assert.equal(commercial.counts.documentedAmazonAsins,27);
assert.equal(commercial.counts.historicallyUnavailable,4);
assert.equal(commercial.counts.activeExactAmazonReferrals,manifest.affiliateActive?27:0);
assert.equal(commercial.counts.directSaleEligible,0);
assert.equal(commercial.products.length,52);
assert.deepEqual(commercial.products.map(p=>p.id),unified.products.map(p=>p.id),
  'Every editorial watch must share exactly one commercial evidence record and order');
const commercialById=new Map(commercial.products.map(p=>[p.id,p]));
assert.equal(commercialById.size,52,'Commercial registry may not duplicate product IDs');
for(const record of commercial.products){
  const source=unified.products.find(p=>p.id===record.id);
  assert.ok(source,'Commercial status cannot exist without an editorial watch: '+record.id);
  assert.equal(record.vendorSourceUrl,source.officialUrl,'Vendor identity cannot drift: '+record.id);
  assert.equal(record.photo.published,Boolean(source.photoUrl),
    'Photo permission must agree with actual published WebP: '+record.id);
  assert.equal(record.amazon.currentAvailability,'not_verified');
  assert.equal(record.commission.confirmed,false,'Click intent does not prove paid commission');
  assert.equal(record.directSale.eligible,false,'A verified CJ quote and checkout are still absent');
  assert.equal(record.purchasePath,source.commercialStatus,
    'Every catalog card must reuse the same commercial proof: '+record.id);
  assert.equal(record.amazon.observedAvailability,source.observedAvailability);
  assert.equal(record.amazon.sourceCheckedOn,source.sourceCheckedOn);
  if(record.amazon.documented){
    const expected=record.collection==='core'?
      amazon.links[record.id]?.asin:exactPopular.verifiedProducts[record.id]?.asin;
    assert.equal(record.amazon.asin,expected,'ASIN must come from actual dated research: '+record.id);
    assert.ok(record.amazon.sourceCheckedOn,'Documented ASIN cannot lack its source date');
  }else{
    assert.equal(record.amazon.asin,null,'Unknown ASIN must not be substituted: '+record.id);
    assert.equal(record.amazon.referralActive,false);
  }
  if(record.amazon.referralActive){
    assert.equal(record.amazon.referralUrl,source.merchantKind==='direct'?source.merchantUrl:undefined,
      'Paid direct links may only target the researched model: '+record.id);
    assert.ok(record.amazon.referralUrl.includes('/dp/'+record.amazon.asin+'?tag='),
      'Exact ASIN and disclosed affiliate link must stay together: '+record.id);
    assert.equal(record.purchasePath,'documented_amazon_referral');
  }else{
    assert.equal(record.amazon.referralUrl,null);
  }
}
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
const editorialPairs=JSON.parse(read('comparaisons-montres.json')).comparisons;
assert.equal(editorialPairs.length,4,'Four curated, factual watch comparisons should be selectable');
assert.equal((unifiedHtml.match(/class="ud-pair-starter" data-pair-slug=/g)||[]).length,4,
  '52-watch catalogue must expose four ready-made comparisons');
for(const pair of editorialPairs){
  assert.ok(unifiedHtml.includes('href="./comparer-'+pair.slug+'.html"'),
    'Static comparison must be usable without JavaScript: '+pair.slug);
  assert.ok(unifiedHtml.includes('data-ud-pair-interactive hidden href="?compare='+pair.left+','+pair.right+'#comparer"'),
    'Interactive pair must be initially hidden and use exact IDs: '+pair.slug);
  assert.ok(unifiedHtml.includes(pair.title.replaceAll('&','&amp;')),
    'Pair title must match the source editorial comparison: '+pair.slug);
}
assert.match(read('unified-discovery.js'),/querySelectorAll\('\[data-ud-pair-interactive\]'\)/,
  'Interactive comparison shortcuts must only activate after trusted catalogue load');
assert.ok(manifest.paths.includes(manifest.siteUrl+unifiedPath),'Unified page canonical in sitemap');
assert.ok(unifiedHtml.includes('rel="canonical" href="'+manifest.siteUrl+unifiedPath+'"'));
assert.equal((unifiedHtml.match(/class="ud-card"/g)||[]).length,52,
  'All 52 item cards must be rendered in static HTML before JavaScript');
assert.equal((unifiedHtml.match(/class="ud-select"/g)||[]).length,52,
  'Each watch must have an opt-in local comparison button');
const photoCount=unified.products.filter(p=>p.photoUrl!==null).length;
const expectedPhotoCount=feed.products.filter(p=>p.photoReview?.publicUsageApproved===true).length+approvedPopularPhotos.size;
const missingPhotoCount=52-expectedPhotoCount;
assert.ok(approvedPopularPhotos.size<=37,'More approved photos than documented models');
assert.equal(photoCount,expectedPhotoCount,
  'Only 15 core and SHA-checked supplemental photos may be shown');
assert.equal(unified.products.filter(p=>p.photoUrl===null).length,missingPhotoCount,
  'Missing published photos must remain explicit, never replaced with AI packshots');
assert.equal((unifiedHtml.match(/data-visual="photo"/g)||[]).length,expectedPhotoCount);
assert.equal((unifiedHtml.match(/data-visual="no-photo"/g)||[]).length,missingPhotoCount);
assert.equal((unifiedHtml.match(/class="ud-zoom"/g)||[]).length,expectedPhotoCount,
  'Only photograph-backed models can provide a zoom control');
assert.equal((unifiedHtml.match(/Aucune photographie publiée pour cette référence/g)||[]).length,missingPhotoCount);
assert.ok(unifiedHtml.includes('id="udVisual"')&&unifiedHtml.includes('value="no-photo"'),
  'Users must be able to distinguish photo-backed models from honest fallbacks');
assert.ok(unifiedHtml.includes('id="udMerchant"')&&unifiedHtml.includes('value="direct"')
  &&unifiedHtml.includes('value="search"')&&unifiedHtml.includes('value="official"'),
  'Merchant-confidence filter must distinguish exact listing, search and source-only links');
assert.ok(unifiedHtml.includes('id="udSort"')
  &&['essential','direct','photo','alpha','editorial'].every(value=>unifiedHtml.includes('<option value="'+value+'">')),
  'Buyer-priority sorting must remain accessible and honest about unknown prices');
assert.match(read('unified-discovery.js'),/reorderCards\(controls\.sort\.value\)/,
  'Interactive priority ordering must use source-backed model attributes');
for(const watch of unified.products){
  const start=unifiedHtml.indexOf('<article class="ud-card" id="modele-'+watch.id+'"');
  const end=unifiedHtml.indexOf('</article>',start);
  assert.ok(start>=0&&end>start,'Missing source-backed card for '+watch.id);
  const card=unifiedHtml.slice(start,end);
  assert.ok(card.includes('data-merchant="'+(watch.merchantKind||'official')+'"'),
    'Card must reflect verified merchant destination type: '+watch.id);
  assert.ok(card.includes('class="ud-merchant-kind"'),
    'Card must explain its merchant-link confidence: '+watch.id);
  const commerceState=commercialById.get(watch.id);
  assert.ok(card.includes('data-commerce-status="'+commerceState.purchasePath+'"'),
    'Rendered watch card must match the unified commercial registry: '+watch.id);
  assert.ok(card.includes('class="ud-commercial-proof"'),
    'Commercial proof must be visible on all 52 cards without JavaScript: '+watch.id);
  if(commerceState.amazon.observedAvailability==='unavailable_at_check'){
    assert.ok(card.includes('Indisponible lors du contrôle du'),
      'Historic unavailability must be visible on full catalogue: '+watch.id);
  }else if(commerceState.amazon.referralActive){
    assert.ok(card.includes('stock actuel non vérifié'),
      'A documented ASIN is not a live offer: '+watch.id);
  }
  assert.equal((card.match(/class="ud-source"/g)||[]).length,1,
    'Exactly one documented vendor/manufacturer source on every unified card: '+watch.id);
  assert.ok(card.includes('data-merchant-official-id="'+watch.id+'" data-merchant-placement="popular"'),
    'Source must be model-attributed without claiming a paid referral: '+watch.id);
  assert.ok(card.includes('href="'+watch.officialUrl.replace(/&/g,'&amp;')+'"'),
    'The exact model URL must be preserved in the catalog card: '+watch.id);
  const linkOrder=[...card.matchAll(/class="(ud-details|ud-source|ud-merchant)"/g)].map(m=>m[1]);
  if(watch.merchantKind==='search')assert.deepEqual(linkOrder,
    ['ud-details','ud-source','ud-merchant'],
    'The exact reference source must precede non-exact Amazon searches: '+watch.id);
  if(watch.merchantKind==='direct')assert.deepEqual(linkOrder,
    ['ud-details','ud-merchant','ud-source'],
    'Direct Amazon model and official source must both remain accessible: '+watch.id);
  if(!watch.merchantKind)assert.deepEqual(linkOrder,
    ['ud-details','ud-source'],
    'Unpaid models must not claim an Amazon purchase link: '+watch.id);
  if(watch.merchantEvidenceType==='amazon_fr_comparator_redirect')assert.ok(
    card.includes('class="ud-redirect-proof"')&&card.includes('page Amazon.fr non consultée directement'),
    'Comparator-sourced ASIN must never masquerade a directly inspected Amazon product: '+watch.id);
  if(watch.marketplaceVariant){
    assert.ok(watch.merchantKind==='direct','Only documented ASIN links may mention marketplace variant');
    assert.ok(card.includes('class="ud-exact-variant"'),
      'The Amazon variant must be disclosed at the listing level: '+watch.id);
    assert.ok(card.includes(watch.marketplaceVariant.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),
      'The exact researched marketplace variant must be shown: '+watch.id);
  }

  if(watch.merchantKind==='search')assert.match(card,/Rechercher sur Amazon\.fr/,
    'A broad merchant search cannot masquerade as an exact offer: '+watch.id);
  if(watch.merchantKind===null)assert.ok(!card.includes('lien rémunéré</a>'),
    'Source-only cards must not imply payable merchant offers: '+watch.id);
}
// Six real references remain visible even when a photograph is withdrawn;
// published photographs must always match the exact SKU.
const requestedSpotlight=['skmei-2056','skmei-2514','addiesdive-ad2030',
  'pagani-pd1701','casio-mtp-1302','citizen-tsuyosa'];
const spotlightIds=[...unifiedHtml.matchAll(/class="ud-feature-card" data-feature-id="([^"]+)"/g)]
  .map(m=>m[1]);
assert.equal(spotlightIds.length,6,'Exactly six documented editorial picks required');
assert.equal(new Set(spotlightIds).size,6,'No duplicate showcase model');
assert.ok(unifiedHtml.includes('id="udSpotlightTitle"'),'Editorial showcase must be accessible');
assert.ok(!unifiedHtml.includes('Meilleures ventes garanties')&&!unifiedHtml.includes('Stock confirmé'));
for(const id of requestedSpotlight){
  const model=unified.products.find(x=>x.id===id);
  if(model?.photoUrl)assert.ok(spotlightIds.includes(id),
    'Originally preferred photographed model should remain in the showcase: '+id);
}
for(const id of spotlightIds){
  const p=unified.products.find(item=>item.id===id);
  assert.ok(p&&p.detailUrl&&p.officialUrl,'Featured model must be real: '+id);
  const start=unifiedHtml.indexOf('<article class="ud-feature-card" data-feature-id="'+id+'"');
  const end=unifiedHtml.indexOf('</article>',start);
  assert.ok(start>=0&&end>start,'Missing editorial card: '+id);
  const card=unifiedHtml.slice(start,end);
  if(p.photoUrl)
    assert.ok(card.includes('../'+p.photoUrl.slice(2)),'Showcase photo must match exact SKU: '+id);
  else
    assert.ok(card.includes('Photo exacte non publiée')&&!card.includes('<img'),
      'Withdrawn photo must become a no-image editorial card: '+id);
  assert.ok(card.includes('href="./'+id+'.html"'),'Model facts remain navigable: '+id);
  if(p.merchantKind==='direct'||p.merchantKind==='awin'){
    assert.ok(card.includes(p.merchantUrl.replaceAll('&','&amp;'))||card.includes(p.merchantUrl),
      'Verified merchant destination must not be substituted: '+id);
    assert.ok(card.includes('nofollow sponsored')&&card.includes('lien rémunéré'));
  }else{
    assert.ok(card.includes(p.officialUrl.replaceAll('&','&amp;'))||card.includes(p.officialUrl));
    assert.ok(!card.includes('sponsored')&&card.includes('lien non rémunéré'));
  }
}
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
assert.match(visualJs,/const requestedView=params\.get\('view'\)/,
  'Shareable grid and large-photo view must restore safely from URL');
assert.match(visualJs,/requestedView==='grid'\|\|requestedView==='large'/,
  'Both explicit display parameters must be respected before device defaults');
assert.match(visualJs,/localStorage\.setItem\(VIEW_KEY,view\)/,
  'Manual grid or large-photo view preference must persist across visits');
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
assert.equal((popularHtml.match(/data-merchant-official-id=/g)||[]).length,41,
  'Every supplemental card and four model-specific shortlist seller options must expose privacy-minimal vendor intent');
// Commercial shortlist: an explicitly editorial priority list, not sales data.
// The existing 52 catalogue entries and Amazon paid CTA counts must stay intact.
assert.equal(commercialShortlist.length,10,'Ten documented watches selected for commercial qualification');
const focusMatches=[...popularHtml.matchAll(/<li class="am-focus-item" data-focus-id="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(focusMatches,commercialShortlist.map(item=>item.id),
  'Commercial shortlist must follow the reviewed source file and never substitute products');
assert.equal(new Set(focusMatches).size,10,'Shortlist cannot repeat a product');
assert.ok(popularHtml.includes('id="selection-10-montres"'),'Priorities must be reachable via a stable accessible anchor');
// Prioritise product identity evidence, not unverified popularity or invented stock.
const focusedWithAsin=[...popularHtml.matchAll(
  /<li class="am-focus-item" data-focus-id="([^"]+)" data-evidence="documented-asin">/g
)].map(m=>m[1]);
const focusedSourceOnly=[...popularHtml.matchAll(
  /<li class="am-focus-item" data-focus-id="([^"]+)" data-evidence="(?:manufacturer-source|partner-source)">/g
)].map(m=>m[1]);
const expectedExact=commercialShortlist.filter(x=>Boolean(exactPopularLinks[x.id])).map(x=>x.id);
assert.deepEqual(focusedWithAsin,expectedExact,
  'Only exact source-backed ASIN matches belong in the Amazon-ready-to-verify group');
assert.deepEqual(focusedSourceOnly,commercialShortlist.filter(x=>!exactPopularLinks[x.id]).map(x=>x.id),
  'Watch sources without exact Amazon ASINs must remain in the clearly labeled editorial group');
assert.equal(focusedWithAsin.length,6,'Six exact ASIN references supported by existing independent source research');
assert.equal(focusedSourceOnly.length,4,'Four complementary watches without an exact published Amazon exit');
assert.ok(popularHtml.includes('id="selection-avec-asin"')&&
  popularHtml.includes('id="selection-sources-marchandes"')&&
  popularHtml.includes('aria-label="Accès par niveau de preuve"'),
  'Two visible, keyboard-navigable proof-level groups must be present without JavaScript');
assert.ok(popularHtml.indexOf('id="selection-avec-asin"')<
  popularHtml.indexOf('id="selection-sources-marchandes"'),
  'Source-confirmed ASIN models must be visible before incomplete merchant sources');
assert.ok(popularHtml.includes('6 références avec ASIN documenté')&&
  popularHtml.includes('4 sources vendeur à explorer'),
  'The proof navigation must show actual model counts instead of unverifiable bestseller claims');
assert.ok(home.includes('6 références avec ASIN Amazon.fr documenté et 4 alternatives'),
  'Homepage must show truthful evidence counts and link to the comparative shortlist');

assert.ok(home.includes('id="duels-accessibles"'),'Four affordable buyer guides must be promoted from the homepage');
assert.equal((home.match(/class="am-duel-promo-card" data-duel-promo="/g)||[]).length,4,
  'Four real watch duel cards should be visible even without JavaScript');
assert.ok(home.includes('href="#duels-accessibles"'),
  'Homepage four-photo showroom must connect the shopper to the evidence-based duels');
assert.ok(home.includes('href="./affordable-comparisons.css"'),
  'Homepage must load the new lightweight buyer comparison styles');
for(const pair of affordableDuels.comparisons){
  assert.ok(home.includes('href="./montres/comparer-'+pair.slug+'.html"'),
    'Each original comparison needs a crawlable homepage entry');
}
for(const [id,slugs] of duelsById){
  const html=read('montres/'+id+'.html');
  assert.ok(html.includes('class="am-extra-duels"'),'Exact watch detail must link to its relevant original duel: '+id);
  for(const slug of slugs)assert.ok(html.includes('href="./comparer-'+slug+'.html"'),
    'Buyer guide must return a link from its product details: '+id+'/'+slug);
}

assert.ok(home.includes('href="./montres/modeles-populaires.html#selection-10-montres"'),
  'Homepage must surface the priorities without duplicating all ten full cards');
assert.ok(popularHtml.includes('Ce n’est ni un classement des ventes en France'),
  'Editorial readiness must not be mistaken for sales ranking or verified popularity');
assert.equal(commercialShortlist.filter(item=>Boolean(exactPopularLinks[item.id])).length,6,
  'Six source-confirmed listings and four explicitly uncertain source-only models in this editorial mix');
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
  const alt=popularFeed.products.find(x=>x.id===item.compareWith);
  assert.ok(alt&&alt.id!==item.id,'Only real distinct catalog models can be compared: '+item.id);
  const compareHref='./toutes-les-montres.html?compare='+encodeURIComponent(item.id+','+alt.id)+'#comparer';
  assert.ok(html.includes('href="'+compareHref+'"'),
    'A buyer must be able to open the exact curated two-watch comparison: '+item.id);
  assert.ok(html.includes('data-focus-compare="'+item.id+'"'),
    'Comparison action must identify its watch and stay keyboard accessible: '+item.id);
  assert.ok(html.includes('Comparer avec '+alt.brand+' '+alt.model),
    'Comparison needs the real alternative model label: '+item.id);
  assert.ok(html.includes('class="am-focus-evidence"'),
    'Source proof must be in static HTML without requiring JavaScript: '+item.id);
  const expectedEvidence=exactPopularLinks[item.id]?'documented-asin':
    approvedPartnerOffers.has(item.id)?'partner-source':'manufacturer-source';
  assert.ok(html.includes('data-evidence="'+expectedEvidence+'"'),
    'Commercial grouping must be derived from the verified Amazon map: '+item.id);
  assert.ok(html.includes(exactPopularLinks[item.id]?
    'ASIN Amazon.fr documenté · variante et stock actuel non confirmés':
    approvedPartnerOffers.has(item.id)?
      'Lien partenaire documenté · variante et stock actuel non confirmés':
      'Source vendeur ou fabricant · aucun ASIN exact établi pour cette offre'),
    'Visible model-specific label must never invent live availability: '+item.id);
  assert.ok(html.includes('Source constructeur ou vendeur')||html.includes('ASIN recoupé')||html.includes('Comparateur + seconde source'),
    'No unverified sale or invented proof may appear on shortlist: '+item.id);

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
  if(sellerLink){
    assert.ok(html.includes(sellerLink.verifiedAt),
      'Evidence verification date must be visible separately from live availability: '+item.id);
    assert.ok(html.includes('ce n’est pas un contrôle du stock actuel'),
      'A recorded ASIN must never imply current Amazon availability: '+item.id);
    if(sellerLink.evidenceType==='amazon_fr_comparator_redirect')
      assert.ok(html.includes('Amazon.fr non consulté directement'),
        'Comparison-source evidence cannot be upgraded to firsthand Amazon inspection: '+item.id);
  }else{
    assert.ok(html.includes('Aucune fiche Amazon exacte confirmée'),
      'Unknown ASIN must remain explicitly unknown on shortlist: '+item.id);
  }
  assert.ok(html.includes(approvedPopularPhotos.has(item.id)
    ?'droits déclarés, non vérifiés indépendamment':'Photo exacte à consulter chez la marque ou le vendeur'),
    'Every buyer must understand whether a watch has an owner-attested source photo: '+item.id);
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
assert.equal((home.match(/data-amazon-search-id=/g)||[]).length,2,'Two featured SKMEI variants without exact ASINs remain honest searches');
assert.equal((home.match(/data-amazon-product="casio-f91w-1"/g)||[]).length,1,'F-91W featured exact-model Amazon referral');
assert.equal((home.match(/data-amazon-product="casio-ga-2100-1a1"/g)||[]).length,1,'GA-2100 featured exact-model Amazon referral');
const popularTeaser=home.match(/<section class="am-picks" id="modeles-populaires"[\s\S]*?<\/section>/)?.[0];
assert.ok(popularTeaser,'Existing eight-watch homepage teaser is distinct from the new affordable showroom');
for(const [id,asin] of [['addiesdive-ad2030','B0DNK5TT6D'],['pagani-pd1701','B0C7QC653D']]){
  assert.equal((popularTeaser.match(new RegExp('data-amazon-product="'+id+'"','g'))||[]).length,1,'New exact Amazon product featured once within the eight-card teaser: '+id);
  assert.ok(home.includes('https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21'),'Verified Amazon link must be attributed: '+id);
}
assert.ok(home.includes('https://www.amazon.fr/dp/B07WGJ1JNW?tag=drackk04-21'),'Homepage must link to source-backed GA-2100 listing');

const shopperCollections=[
  {slug:'montres-femme-accessibles',ids:['casio-ltp1302','skmei-1874','casio-la-20wh-4a1','casio-ltp-1234pgl-7a','curren-cur210','pagani-pd1776']},
  {slug:'montres-homme-style-accessible',ids:['casio-mtp-1302','casio-a168wa','casio-mdv107','skmei-2256','addiesdive-ad2030','pagani-pd1701']},
  {slug:'montres-automatiques-selection',ids:['orient-bambino','citizen-tsuyosa','seiko-5','orient-bambino-38-cream','citizen-tsuyosa-37-blue','pagani-pd1751']},
  {slug:'montres-skmei',kind:'skmei',ids:['skmei-1251','skmei-1257','skmei-2056','skmei-2514','skmei-9156','skmei-9353','skmei-1874','skmei-2471','skmei-1220','skmei-2256'],compare:['skmei-2056','skmei-2256','skmei-9156']},
  {slug:'montres-pagani-design',kind:'pagani',ids:['pagani-pd1701','pagani-pd1751','pagani-pd1776'],compare:['pagani-pd1701','pagani-pd1751','pagani-pd1776']},
  {slug:'montres-numeriques',kind:'digital',ids:['skmei-1251','skmei-1257','skmei-2056','skmei-2514','skmei-2471','skmei-1220','casio-a158wea-1','casio-la-20wh-4a1','casio-f91w-1','casio-a168wg-9','casio-dw5600rl-1','casio-ae1200wh-1av'],compare:['skmei-2056','casio-f91w-1','skmei-2471']}
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
  if(selection.kind){
    const source=[...shopperProducts.values()].filter(p=>selection.kind==='skmei'?p.brand==='SKMEI'
      :selection.kind==='pagani'?p.brand==='Pagani Design'
      :/numérique|digital/i.test(p.movement)).map(p=>p.id).sort();
    assert.deepEqual([...selection.ids].sort(),source,'Curated brand and digital index must cover exact source selection: '+selection.slug);
    assert.equal((html.match(/data-matrix-watch="/g)||[]).length,selection.ids.length,
      'Complete factual table must include all and only indexed models: '+selection.slug);
    assert.equal((html.match(/class="am-shopper-insight-grid"/g)||[]).length,1,
      'Each high-intent page requires distinct helpful buying guidance beyond duplicated product cards');
    assert.match(html,/role="region" tabindex="0" aria-label="Tableau comparatif des références"/,
      'Large comparison table must scroll and retain keyboard focus');
    assert.ok(html.includes('class="spec-matrix"'),'Source-backed fact matrix must have a caption and headings');
    const compareHref='./toutes-les-montres.html?compare='+selection.compare.join(',')+'#comparer';
    assert.equal(html.split('href="'+compareHref+'"').length-1,2,
      'Two one-tap links must compare three documented exact models: '+selection.slug);
    assert.doesNotMatch(html,/Acheté par \d+|\d+[\s\u00a0]+ventes confirmées|noté [45]\/5|stock limité/i,
      'No invented sales ranks, ratings or urgency on search-intent collections');
  }
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
    assert.equal(q.tier,p.tier,'Recommendation must stay in the exact editorial range: '+p.id+' / '+id);
    assert.ok(detailHtml.includes('data-related-id="'+id+'" data-related-reason="'+reason+'" data-related-tier="'+p.tier+'"'),
      'Related card must declare its verified editorial range: '+id);
    assert.ok(detailHtml.includes('class="am-extra-related-tier">Gamme '+
      ({essential:'Essentielle',signature:'Signature',prestige:'Prestige'})[p.tier]+'</span>'),
      'Visible range badge required: '+p.id);
    assert.ok(['Même marque','Style proche','Mouvement comparable','Autre approche'].includes(reason),'Reason must not imply ranking or test: '+id);
    assert.ok(detailHtml.includes('class="am-extra-related-name" href="./'+id+'.html"'),'A live related detail page must be linked: '+id);
    const approved=approvedPopularPhotos.get(id);
    if(approved)assert.ok(detailHtml.includes('src="../'+approved.url+'"'),'Recommended product photo must be approved: '+id);
    else assert.ok(detailHtml.includes('class="am-extra-related-fallback"'),'Missing related photos need an honest fallback: '+id);
  }
  const recommendedWatches=recommendations.map(m=>popularFeed.products.find(w=>w.id===m[1]));
  assert.ok(recommendedWatches.some(w=>w.brand!==p.brand),
    'Show another manufacturer to avoid a same-brand recommendation tunnel: '+p.id);
  assert.ok(recommendedWatches.filter(w=>w.brand===p.brand).length<=2,
    'Maximum two recommendations from the consulted brand: '+p.id);
  assert.ok(detailHtml.includes('Trois alternatives dans la même gamme'),
    'Buyer must see that alternatives have a common editorial range: '+p.id);
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
  // Search engines may use genuine exact-model photographs, but must never
  // interpret AI editorial concepts as authentic commercial product photos.
  const approved=approvedPopularPhotos.get(p.id);
  if(approved){
    assert.deepEqual(graph[0].image,[manifest.siteUrl+approved.url],
      'Structured Product.image must reference only the exact approved local watch photo: '+p.id);
    assert.ok(detailHtml.includes('src="../'+approved.url+'"'),
      'Structured photo must also be genuinely displayed on its product page: '+p.id);
  }else{
    assert.equal(Object.hasOwn(graph[0],'image'),false,
      'A watch without approved exact-model photography must not receive fabricated Product.image: '+p.id);
  }
  const direct=exactPopularLinks[p.id];
  const expectedMerchant=direct
    ?'https://www.amazon.fr/dp/'+direct.asin+'?tag=drackk04-21'
    :'https://www.amazon.fr/s?k='+encodeURIComponent((p.brand+' '+p.model).slice(0,130))+'&amp;tag=drackk04-21';
  if(manifest.affiliateActive){
    assert.ok(detailHtml.includes('href="'+expectedMerchant+'"'),'Exact merchant destination missing on individual watch page: '+p.id);
    if(['addiesdive-ad2030','pagani-pd1701','skmei-1257'].includes(p.id)){
      assert.ok(direct?.marketplaceVariant,'Three source-verified watches require honest variant disclosure: '+p.id);
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
assert.equal(trackedDirect.length,manifest.popularAffiliateDirectLinks+(manifest.affiliateActive?6:0),
  'Six source-confirmed shortlist merchant actions augment twelve original cards');
assert.equal(sponsoring.length,manifest.affiliateActive?43:0,'All 37 catalogue and six shortlist paid actions must carry sponsored relation');
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
  assert.ok(html.includes('data-tier="'+product.tier+'" data-visual="'+(product.photoReview?.publicUsageApproved===true?'photo':'no-photo')+'"'),
    'Product studio lighting must use verified category and photo state: '+product.id);
  assert.ok(html.includes('<div class="watch-mobile-prelude" aria-hidden="true">'),
    'Mobile shoppers must see an exact-model identification before the photo: '+product.id);
  assert.equal((html.match(/class="watch-mobile-prelude"/g)||[]).length,1,
    'Use one non-semantic mobile model prelude; keep the unique h1: '+product.id);
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
  assert.ok(html.includes('href="./toutes-les-montres.html?tier='+product.tier+'#udCount"'),
    'The product breadcrumb should return to its exact filtered collection: '+product.id);
  assert.match(html,/class="watch-actions"/,'Accessible purchase/compare actions remain grouped');
  assert.ok(html.includes('href="../affiliation.html#montres">Comparer avec les 14 autres modèles</a>'),
    'Canonical watch comparison must open all 15 detailed models, not six homepage selections');
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
  const relatedHtml=html.match(/<ul class="related seo-related-products">([\s\S]*?)<\/ul>/)?.[1]||'';
  assert.equal((relatedHtml.match(/<li>/g)||[]).length,3,
    'Three documented related models must remain, with or without photographs');
  const relatedPictures=(relatedHtml.match(/class="seo-related-photo"/g)||[]).length;
  const relatedMissing=(relatedHtml.match(/class="seo-related-photo-placeholder"/g)||[]).length;
  assert.equal(relatedPictures+relatedMissing,3,
    'One approved photo or explicit fallback per related model');
  assert.equal((relatedHtml.match(/loading="lazy" decoding="async"/g)||[]).length,relatedPictures,
    'Only actual below-fold photographic images need lazy-loading');
  if(product.photoReview?.publicUsageApproved===true){
    assert.ok(html.includes('width="'+product.photoReview.localWidth+'" height="'+product.photoReview.localHeight+'" decoding="async" fetchpriority="high"'),'High priority hero uses real source dimensions');
  }

  assert.ok(html.includes('montre.html?id='+encodeURIComponent(product.id)), 'Interactive product page must remain accessible');
  const buyerActions=html.match(/<div class="watch-actions">([\s\S]*?)<\/div>/)?.[1]||'';
  assert.ok(buyerActions.includes('class="secondary am-interactive-detail-link"')&&
    buyerActions.includes('href="../montre.html?id='+encodeURIComponent(product.id)+'"'),
    'Premium product hero must offer interactive favorites and comparison near the main buying decision: '+product.id);
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
      assert.ok(html.includes('sizes="(max-width: 480px) calc(100vw - 52px), (max-width: 800px) calc(100vw - 72px), 500px"'),'Responsive model image must declare realistic display sizes');
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
assert.equal((sitemap.match(/<loc>/g)||[]).length,78,'All four original buyer duels must be published in sitemap');
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
console.log('SEO validation OK: 15 model pages, 6 shopper collections, 3 core categories, 4 guides, 4 historical comparisons, 4 affordable buyer duels, 13 Amazon links, 78 sitemap URLs, 37 source-backed detailed product pages and genuine hero LCP preload');
