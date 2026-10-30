import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {watchComparisons} from './watch-comparisons.mjs';
const root=resolve(process.cwd(),'site');
const read=p=>readFileSync(resolve(root,p),'utf8');
const feed=JSON.parse(read('selection-affiliation.json'));
const manifest=JSON.parse(read('seo-manifest.json'));
assert.equal(manifest.productCount,15);
assert.equal(manifest.comparisonCount,watchComparisons.length);
assert.equal(watchComparisons.length,4);
const config=JSON.parse(read('affiliate-links.json'));
assert.equal(manifest.affiliateActive,config.enabled);
assert.equal(manifest.affiliateCount,Object.keys(config.links).length);
assert.equal(manifest.checkoutActive,false);
assert.equal(manifest.licensedImageCount,feed.products.filter(p=>p.photoReview?.publicUsageApproved===true).length);
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

assert.equal(manifest.paths.length,25);
assert.ok(manifest.paths.every(url=>url.startsWith(manifest.siteUrl)));
const home=read('index.html');
assert.match(home,/<h1>/i);
assert.match(home,/id="affGrid"/);
assert.equal(home.includes('cloud.umami.is/script.js'),analyticsConfigured,'Homepage Umami opt-in only');
assert.equal(home.includes('./analytics.js'),analyticsConfigured,'Homepage click instrumentation opt-in only');
assert.match(home,/rel="canonical"/);
assert.match(home,/application\/ld\+json/);
assert.match(home,/Les 15 montres, modèle par modèle/);
assert.match(home,/Avant de choisir sa montre/);
for(const marker of ['AM_SEO_LINKS_START','AM_SEO_LINKS_END','AM_SEO_HEAD_START','AM_SEO_HEAD_END','AM_SEO_GUIDES_START','AM_SEO_GUIDES_END']){
 assert.equal(home.split(marker).length-1,1,'Idempotent build marker: '+marker);
}
assert.equal((home.match(/rel="canonical"/g)||[]).length,1,'Homepage has exactly one canonical link');
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
  if(product.photoReview?.publicUsageApproved!==true) {
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
assert.equal((sitemap.match(/<loc>/g)||[]).length,25);
for(const pair of watchComparisons){
 const path='montres/'+pair.slug+'.html';
 const html=read(path);
 assert.ok(statSync(resolve(root,path)).size>2400,'Detailed comparison page required: '+pair.slug);
 assert.ok(manifest.paths.includes(manifest.siteUrl+path),'Comparison in published manifest: '+pair.slug);
 assert.ok(sitemap.includes(manifest.siteUrl+path),'Comparison in sitemap: '+pair.slug);
 assert.ok(home.includes('./'+path),'Homepage links to comparison: '+pair.slug);
 assert.match(html,/<h1>/,'Comparison has headline');
 assert.match(html,/rel="canonical"/,'Comparison has canonical link');
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'One canonical per comparison');
 assert.ok(html.includes('../seo-watch-art.js'),'Comparison uses first-party vector illustrations');
 assert.equal((html.match(/class="watch-vector"/g)||[]).length,2,'Two original illustrations required');
 assert.ok(html.includes('class="spec-matrix"'),'Side by side facts table required');
 assert.ok(html.includes('class="pair-difference"'),'At least one documented difference must be highlighted');
 assert.match(html,/Non renseigné|Différence/,'Differences or uncertainty must be explained');
 assert.ok(html.includes('../affiliation.html?compare='+pair.ids.join(',')),'Interactive comparison deep link must keep both selected models');
 assert.ok(html.includes('Prix, stock et garanties sont à confirmer'),'Commercial caveat is mandatory');
 assert.doesNotMatch(html,/"offers"\s*:|"price"\s*:|"availability"\s*:|"aggregateRating"\s*:/,'No fabricated commercial structured data');
 assert.ok(!html.includes('../assets/watches/'),'No unlicensed images on pair page');
 const graphMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert.ok(graphMatch,'Structured article metadata required');
 const graph=JSON.parse(graphMatch[1]);
 assert.equal(graph['@type'],'Article');
 assert.equal(graph.about?.length,2);
 assert.equal(graph.mainEntityOfPage,manifest.siteUrl+path);
 assert.equal(html.includes('cloud.umami.is/script.js'),analyticsConfigured,'Umami remains opt-in');
 for(const id of pair.ids){
   const p=feed.products.find(item=>item.id===id);
   assert.ok(p,'Comparison references a real product');
   assert.ok(html.includes(p.brand+' '+p.model),'Exact product named: '+id);
   for(const key of ['movement','diameter','glass','waterResistance'])if(p.specs?.[key]) {
     assert.ok(html.includes(p.specs[key]),'Comparison facts must use sourced catalogue value: '+id+' / '+key);
   }
   assert.ok(html.includes('href="'+p.officialUrl+'"'),'Manufacturer link is required: '+id);
   assert.ok(read('montres/'+id+'.html').includes('./'+pair.slug+'.html'),'Product SEO page links back to its comparison');
   const listing=amazon.links[id];
   if(listing){
     const selected=config.enabled&&config.links[id]?config.links[id].url:listing.url;
     assert.ok(html.includes('href="'+selected+'"'),'Exact Amazon listing must remain available: '+id);
     assert.ok(html.includes('data-amazon-product="'+id+'"'),'Analytics event identifies watch without personal data');
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
console.log('SEO validation OK: 15 watch pages, 13 exact Amazon.fr links, 4 guides + 4 comparison articles, 25 sitemap URLs');
