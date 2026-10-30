import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';

/**
 * Source-level production guards; the mobile Chromium suite verifies the
 * rendered images, keyboard interactions and zoom separately.
 */
const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const html=read('site/affiliation.html');
const js=read('site/editorial-photo.js');
const css=read('site/editorial-photo.css');
const catalogue=JSON.parse(read('site/selection-affiliation.json')).products;
assert.equal(catalogue.length,15);
const curated=['citizen-tsuyosa','tissot-prx-quartz','orient-bambino','casio-mtp-b145'];
const lookbook=['seiko-5','orient-bambino','tissot-prx-quartz'];
for(const id of [...new Set([...curated,...lookbook])]){
  const p=catalogue.find(item=>item.id===id);
  assert.ok(p,'Curated model must exist in the product catalogue: '+id);
  assert.equal(p.photoReview?.publicUsageApproved,true,'Never expose denied manufacturer rights: '+id);
  assert.equal(p.photoReview?.localUrl,'./assets/watches/'+id+'.webp','Use only exact local photo paths');
  assert.ok(statSync(resolve(root,'site/assets/watches/'+id+'.webp')).size>20000,'Required real product photo missing: '+id);
  assert.ok(js.includes("id:'"+id+"'"),'Photographic module must reference exact product: '+id);
}
assert.match(js,/t\.publicUsageApproved!==true/,'Block images without permission');
assert.match(js,/t\.localUrl!=='.\/assets\/watches\/'.*p\.id.*'.webp'/,'Strict local photo path, no arbitrary external assets');
assert.doesNotMatch(js,/innerHTML\s*=/,'No injected user HTML');
assert.doesNotMatch(js,/fetch\s*\(/,'No additional network dependency or third-party API');
assert.match(js,/window\.AtelierPhoto\?\.open/,'Reuse the existing keyboard and touch photographic zoom');
assert.match(js,/event\.key==='ArrowRight'/,'Hero must support keyboard navigation');
assert.match(js,/event\.key==='Home'/,'Hero must support accessible first/last navigation');
assert.match(js,/\+\+request/,'Ignore stale image fetch completion');
assert.match(js,/aria-busy/,'Loading an alternative must not mislabel the previous image');
assert.match(js,/aria-pressed/,'Hero controls must announce their selection');
assert.match(html,/id="heroVariants"/);
assert.match(html,/id="heroEditorialLink"/);
assert.match(html,/id="heroEditorialZoom"/);
assert.match(html,/id="amEditorialGallery"[^>]*hidden/,'Do not display an empty or unlicensed gallery');
assert.match(html,/id="amEditorialGrid"/);
assert.match(html,/href="\.\/editorial-photo\.css"/);
assert.match(html,/src="\.\/editorial-photo\.js" defer/);
assert.ok(html.indexOf('src="./editorial-photo.js" defer')<html.indexOf('src="./affiliation.js" defer'),'Editorial module must load before catalogue initialization');
assert.match(read('site/affiliation.js'),/window\.AtelierEditorial\?\.init/,'Use the current validated catalogue for visual galleries');
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/max-width:680px/);
assert.match(css,/scroll-snap-type:x mandatory/);
assert.match(css,/:focus-visible/);
console.log('Editorial photography guardrails OK: 4 featured exact watches, 3 real photographic stories, source rights, responsiveness, keyboard and zoom');
