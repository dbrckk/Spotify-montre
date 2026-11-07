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
  assert.ok(home.includes('href="./montre.html?id='+id+'"'),
    id+': product must open its own verified detail');
}
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
assert.ok(home.includes('Un achat direct sur Atelier Montres ne s’affiche que'),
  'Do not advertise checkout without a verified offer');
assert.ok(home.includes('class="am-order-story" id="achat-direct"'),
  'Explain seller-owned payment and background supplier fulfillment');
assert.match(home,/Après confirmation du paiement, le fournisseur reçoit la commande/);
assert.match(home,/site\/premium-showroom\.css|href="\.\/premium-showroom\.css"/);
assert.equal(config.checkoutMode,'inactive',
  'Design changes must never open live payments by accident');
assert.deepEqual(JSON.parse(read('catalogue.json')).products,[],
  'Editorial watch selection must not silently become sellable CJ offers');
assert.ok(home.includes('src="./direct-offer-links.js"'),
  'Only verified API offers may insert direct buy calls to action');
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
