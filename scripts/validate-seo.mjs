import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.cwd(),'site');
const read=p=>readFileSync(resolve(root,p),'utf8');
const feed=JSON.parse(read('selection-affiliation.json'));
const manifest=JSON.parse(read('seo-manifest.json'));
assert.equal(manifest.productCount,15);
const config=JSON.parse(read('affiliate-links.json'));
assert.equal(manifest.affiliateActive,config.enabled);
assert.equal(manifest.affiliateCount,Object.keys(config.links).length);
assert.equal(manifest.checkoutActive,false);
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

assert.equal(manifest.paths.length,21);
assert.ok(manifest.paths.every(url=>url.startsWith(manifest.siteUrl)));
const home=read('index.html');
assert.match(home,/<h1>/i);
assert.match(home,/id="affGrid"/);
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
  const amazonMatch=amazon.links[product.id];
  if(amazonMatch) {
    const selected=config.enabled&&config.links[product.id]?config.links[product.id].url:amazonMatch.url;
    assert.ok(html.includes('href="'+selected+'"'),'Exact Amazon URL should be crawlable: '+product.id);
    assert.ok(html.includes(config.enabled&&config.links[product.id]?'lien rémunéré':'sans lien rémunéré'));
  }
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,'Single product canonical');
  const schema=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(schema,'JSON-LD required');
  assert.equal(JSON.parse(schema[1])['@graph'][0]['@type'],'Product');
}
assert.match(read('affiliation.js'),/hasEditorialPages/);
assert.match(read('affiliation.js'),/am-card-seo-link/);
const sitemap=read('sitemap.xml');
assert.equal((sitemap.match(/<loc>/g)||[]).length,21);
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
const guide=read('montres/guide-choisir-montre.html');
assert.match(guide,/<h1>Comment choisir une montre/);
console.log('SEO validation OK: 15 watch pages, 13 exact Amazon.fr product links, four editorial guides, 21 sitemap URLs');
