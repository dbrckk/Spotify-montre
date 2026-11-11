import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';

const site=new URL('../site/',import.meta.url);
const read=path=>readFileSync(new URL(path,site),'utf8');
const home=read('index.html');
const css=read('premium-showroom.css');
const approved=JSON.parse(read('selection-affiliation.json')).products;
const config=JSON.parse(read('config.json'));
const known=new Map(approved.map(item=>[item.id,item]));
const cards=[...home.matchAll(/<article class="home-product-card" data-watch-id="([a-z0-9-]+)">/g)].map(m=>m[1]);
const expected=[
  'casio-mtp-1302','casio-mdv107',
  'citizen-tsuyosa','seiko-5',
  'tissot-prx-auto','hamilton-khaki'
];
assert.deepEqual(cards,expected,'Showroom must use six vetted, exactly identified watch models');
for(const id of cards){
  const watch=known.get(id);
  assert.ok(watch?.photoReview?.publicUsageApproved===true,
    id+': no owner-approved exact-reference photograph');
  const asset='assets/watches/'+id+'.webp';
  assert.equal(watch.photoReview.localUrl,'./'+asset,id+': unexpected local image');
  assert.ok(existsSync(new URL(asset,site))&&statSync(new URL(asset,site)).size>1000,
    id+': product image is missing');
  assert.ok(home.includes('src="./'+asset+'"'),id+': product image not displayed');
  assert.ok(home.includes('href="./montres/'+id+'.html"'),
    id+': product must open the canonical, JS-free, indexable detail page');
}
// The photo-led homepage uses only approved local exact-reference WebPs.
// Every responsive candidate must exist and the LCP preload must match the
// hero image, preventing a redundant full-size desktop download on Android.
const photoTags=[...home.matchAll(/<img\b[^>]*>/g)].map(x=>x[0])
  .filter(tag=>/src="\.\/assets\/watches\/[a-z0-9-]+\.webp"/.test(tag));
assert.equal(photoTags.length,13,'Ten original showcase images plus three editorial collection photos');
for(const tag of photoTags){
  const id=/src="\.\/assets\/watches\/([a-z0-9-]+)\.webp"/.exec(tag)?.[1];
  const proof=known.get(id)?.photoReview;
  assert.ok(proof?.publicUsageApproved===true,'Unapproved homepage photograph: '+id);
  assert.ok(tag.includes('srcset="')&&tag.includes('sizes="')&&
    tag.includes('decoding="async"'),'Missing responsive image attributes for '+id);
  for(const width of [480,800]){
    assert.ok(tag.includes('./assets/watch-responsive/'+id+'-'+width+'.webp'),
      'Missing responsive variant reference '+id+'/'+width);
    const file=new URL('assets/watch-responsive/'+id+'-'+width+'.webp',site);
    assert.ok(existsSync(file)&&statSync(file).size>1000,
      'Missing optimized WebP file '+id+'/'+width);
  }
}
const heroPreload=home.match(/<link rel="preload"[^>]+>/)?.[0]||'';
const heroTag=photoTags.find(tag=>tag.includes('fetchpriority="high"'));
assert.ok(heroTag,'Exactly one hero photo must be prioritized');
const heroSrcset=/srcset="([^"]+)"/.exec(heroTag)?.[1];
const heroSizes=/sizes="([^"]+)"/.exec(heroTag)?.[1];
assert.ok(heroPreload.includes('imagesrcset="'+heroSrcset+'"')&&
  heroPreload.includes('imagesizes="'+heroSizes+'"'),
  'The LCP preload must select the exact responsive resource used by the hero');
assert.equal(photoTags.filter(tag=>tag.includes('fetchpriority="high"')).length,1,
  'High network priority must be reserved for the single hero photograph');

const structured=home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(structured,'Homepage should expose an indexable real-watch collection');
const graph=JSON.parse(structured[1])['@graph'];
const webPage=graph.find(item=>item['@type']==='CollectionPage');
assert.equal(webPage?.mainEntity?.numberOfItems,6);
assert.deepEqual(webPage.mainEntity.itemListElement.map(item=>item.position),[1,2,3,4,5,6]);
for(const item of webPage.mainEntity.itemListElement){
  assert.ok(cards.some(id=>item.url.endsWith('/montres/'+id+'.html')),
    'Only a real showcased watch with an indexable page may be added to ItemList');
}
assert.ok(!structured[1].includes('"offers"')&&!structured[1].includes('"aggregateRating"'),
  'Never invent ecommerce offers or consumer ratings for editorial pages');
for(const slug of ['montres-quartz','montres-automatiques','montres-petit-boitier'])
  assert.ok(home.includes('href="./montres/'+slug+'.html"'),
    'A photo-led homepage entry must link a real SEO collection: '+slug);
assert.equal((home.match(/class="am-editorial-path"/g)||[]).length,3);
assert.ok(css.includes('am-editorial-paths-grid')&&css.includes('@media(max-width:650px)'),
  'Editorial gallery needs an accessible mobile layout');

assert.equal((home.match(/class="am-budget-card"/g)||[]).length,3,
  'Three visually distinct budget categories required');
assert.equal((home.match(/class="am-budget-action">Explorer toute la gamme/g)||[]).length,3,
  'All budget categories must clearly advertise access to their full collection');
for(const [id,tier,range] of [
  ['collection-accessible','essential','20–120 €'],
  ['collection-intermediaire','signature','150–450 €'],
  ['collection-prestige','prestige','500–1 200 €']
]){
  assert.ok(home.includes('id="'+id+'"'),'Broken budget showcase section: '+id);
  assert.ok(home.includes('href="./montres/toutes-les-montres.html?tier='+tier+'#udCount"'),
    'A homepage budget card must open the complete filtered catalogue: '+tier);
  assert.ok(home.includes(range),'Missing budget guidance: '+range);
}
assert.ok(home.includes('Budgets d’orientation, non prix de vente'),
  'Budget suggestions must not be confused with merchant prices');
assert.ok(home.includes('class="am-order-story am-buyer-guide" id="bien-acheter"'),
  'Public homepage must teach customers to select, compare and verify the seller');
for(const link of [
  './montres/toutes-les-montres.html',
  './montres/guide-choisir-montre.html',
  './acheter.html#amPartnerSelection'
])assert.ok(home.includes('href="'+link+'"'),
  'Buyer guide must link to a real public destination: '+link);
assert.ok(!home.includes('id="achat-direct"')&&
  !home.includes('Après confirmation du paiement, le fournisseur reçoit la commande'),
  'The editorial homepage must not promote a nonfunctional checkout');
assert.match(home,/site\/premium-showroom\.css|href="\.\/premium-showroom\.css"/);
assert.equal(config.checkoutMode,'inactive',
  'Design changes must never open live payments by accident');
assert.deepEqual(JSON.parse(read('catalogue.json')).products,[],
  'Editorial watch selection must not silently become sellable CJ offers');
assert.ok(home.includes('src="./direct-offer-links.js"')&&
  home.includes('href="./direct-offer-links.css"'),
  'Existing checkout integration must remain intact even while payment is inactive');
assert.ok(!/class="am-direct-card-link"/.test(home),
  'Never hardcode unqualified paid-checkout buttons');
for(const [page,scope] of [
  ['affiliation.html','am-showroom-catalog'],
  ['montre.html','am-showroom-detail'],
  ['acheter.html','am-showroom-buy']
]){
  const html=read(page);
  assert.ok(html.includes('href="./premium-showroom.css"'),page+': missing visual styles');
  assert.ok(html.includes('class="'+scope+'"')||
    html.includes('class="'+scope+'"'),page+': no scoped visual theme');
}
assert.ok(css.includes('@media(max-width:650px)')&&
  css.includes('@media(max-width:430px)'),'Small Android layouts required');
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'),
  'Accessibility must respect reduced motion');
console.log('Public boutique: six real watch images, three budget tiers, direct checkout gate and mobile layout OK');
