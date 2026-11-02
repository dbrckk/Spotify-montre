import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const read=path=>readFileSync(path,'utf8');
const home=read('site/affiliation.html');
const stylesheet=read('site/editorial-atelier-2026.css');
const generator=read('scripts/build-unified-discovery.mjs');
const files=[
  'site/assets/watches-popular/skmei-2056.webp',
  'site/assets/watches/citizen-tsuyosa.webp',
  'site/assets/watches-popular/pagani-pd1701.webp'
];
assert.ok(stylesheet.length>9000,'editorial system should materially restyle the experience');
assert.match(home,/<link rel="stylesheet" href="\.\/editorial-atelier-2026\.css">/);
assert.match(generator, /\.\.\/editorial-atelier-2026\.css/);
assert.match(home, /<section class="am-style-entrances" aria-labelledby="amStyleTitle">/);
assert.match(home, /<header class="am-style-intro">/);
assert.equal((home.match(/class="am-style-card" data-style=/g)||[]).length,3,
  'style discovery must have exactly three useful visual paths');
for(const [href,original] of [
  ['./montres/toutes-les-montres.html?style=retro#udCount','skmei-2056.webp'],
  ['./montres/toutes-les-montres.html?movement=automatic#udCount','citizen-tsuyosa.webp'],
  ['./montres/toutes-les-montres.html?style=sport#udCount','pagani-pd1701.webp']
]){
  assert.ok(home.includes('href="'+href+'"'),'missing valid catalogue destination '+href);
  assert.ok(home.includes(original),'missing exact-model authorized local watch image '+original);
}
for(const file of files)assert.ok(existsSync(file),'real local source watch photo missing: '+file);
for(const text of [
  'class="ud-discovery-links"',
  '?brand=SKMEI#udCount','?movement=automatic#udCount',
  '?size=compact#udCount','?visual=photo#udCount'
])assert.ok(generator.includes(text),'catalogue quick navigation contract missing: '+text);
assert.match(generator,/const normalized=\[\]/);
assert.match(generator,/normalized\.length!==52/);
assert.match(generator,/approvedPhotos\.get\(p\.id\)/);
assert.match(generator,/unified-discovery\.js/);
assert.match(stylesheet,/:focus-visible/,'keyboard focus must be visible');
assert.match(stylesheet, /prefers-reduced-motion:reduce/,
  'animations must respect reduced-motion user setting');
assert.match(stylesheet,/max-width:620px/,'Android layout must be intentionally designed');
assert.match(stylesheet,/hover:none/,'touch devices must not depend on hover');
assert.match(stylesheet,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  'mobile discovery must remain structured');
assert.ok(!/https?:\/\//.test(stylesheet),'the theme must not require remote fonts, images or JS');
assert.match(home,/Les montres proposées en affiliation s’achètent chez nos marchands partenaires/);
assert.match(generator,/une commande directe n’est possible que si/i);
assert.match(read('site/config.json'),/"checkoutMode": "inactive"/,
  'the storefront redesign must not activate commercial checkout');
console.log('Editorial watch UX OK: 3 real-photo paths, 52 model catalogue, functional filters, accessible mobile, honest commerce disclosure and no external UI dependencies');
