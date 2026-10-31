import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {responsiveSrcset} from './responsive-images.mjs';
const root=resolve(process.cwd(),'site');
const read=p=>readFileSync(resolve(root,p),'utf8');
const feed=JSON.parse(read('selection-affiliation.json'));
const manifest=JSON.parse(read('seo-manifest.json'));
assert.equal(manifest.productCount,15);
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

assert.equal(manifest.paths.length,29);
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
    assert.equal(review.sourceUrl,product.officialUrl,'A technical check must link to the manufacturer's exact published model');
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
    assert.ok(!product.specs?.diameter,'Rectangular case L × l × H is not a diameter');
    assert.ok(html.includes('Il ne s’agit pas d’un diamètre'),'Buyer guidance must explain rectangular watch dimensions');
    assert.ok(html.includes(product.specs.caseSize),'Official L × l × H size must be visible');
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
assert.equal((sitemap.match(/<loc>/g)||[]).length,29);
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
assert.deepEqual(seoCategories.map(x=>x.members.length),[7,5,3]);
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
assert.equal(privacy.includes('Les visites et clics vers Amazon sont mesurés avec Umami Cloud'),analyticsConfigured);
assert.ok(privacy.includes('chez Render'),'Privacy notice must identify actual host');
const guide=read('montres/guide-choisir-montre.html');
assert.match(guide,/<h1>Comment choisir une montre/);
console.log('SEO validation OK: 15 model pages, 3 categories, 4 guides, 4 comparisons, transparent editorial method, 13 Amazon links, 29 sitemap URLs and genuine hero LCP preload');
