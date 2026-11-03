import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const advisor=read('site/conseiller.html');
const detail=read('site/montre.html');
const generator=read('scripts/build-seo.mjs');
const css=read('site/editorial-product-advisor-2026.css');
assert.ok(css.length>15000,'A genuine, comprehensive style system must be used');
for(const html of [advisor,detail]){
  assert.match(html,/href="\.\/editorial-product-advisor-2026\.css"/);
  assert.match(html,/href="\.\/premium-system\.css"/);
}
assert.match(generator,/type === 'product' \? '<link rel="stylesheet" href="\.\.\/editorial-product-advisor-2026\.css"/);
assert.ok(generator.includes("type:'product'"),'Generated core product pages must adopt the design');
assert.equal((advisor.match(/class="advisor-direction"/g)||[]).length,3,
  'Exactly three accessible inspiration shortcuts');
const data=[
  ['style=retro','skmei-2056.webp','style'],
  ['movement=automatic','citizen-tsuyosa.webp','movement'],
  ['style=sport','pagani-pd1701.webp','style']
];
for(const [filter,image] of data){
  assert.ok(advisor.includes('./conseiller.html?'+filter+'#recommandations'),
    'Shortcut must use existing URL-supported adviser filter '+filter);
  assert.ok(advisor.includes(image),'Only real watch images already present on-site may be used');
}
for(const path of [
  'site/assets/watches-popular/skmei-2056.webp',
  'site/assets/watches/citizen-tsuyosa.webp',
  'site/assets/watches-popular/pagani-pd1701.webp'
])assert.ok(existsSync(path),'Missing license-declared local asset '+path);
assert.match(detail,/href="\.\/montres\/toutes-les-montres\.html">52 montres/);
assert.match(detail,/href="\.\/montres\/toutes-les-montres\.html" class="button">Explorer les 52 montres/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/hover:none/);
assert.match(css,/focus-visible/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(css,/\.advisor-directions-grid/);
assert.match(css,/\.watch-product/);
assert.match(css,/\.detail-layout/);
assert.doesNotMatch(css,/url\(https?:\/\//);
assert.match(read('site/config.json'),/"checkoutMode"\s*:\s*"inactive"/,
 'Visual redesign must not create or enable direct payments');
// The comparison matrix uses only exact-model approved local photographs.
const comparisonJs=read('site/unified-discovery.js');
const comparisonCss=read('site/unified-discovery.css');
assert.match(comparisonJs,/p\.photoUrl===expected/);
assert.match(comparisonJs,/ud-matrix-photo/);
assert.match(comparisonJs,/img\.onerror=\(\)=>visual\.remove\(\)/);
assert.match(comparisonJs,/Photographie du modèle /);
assert.match(comparisonCss,/\.ud-matrix-photo img/);
assert.match(comparisonCss,/@media\(max-width:620px\)/);
console.log('Editorial product/adviser structure OK: three live presets, genuine local photos, 52-watch navigation, responsive detail pages, reduced motion, no checkout activation');
