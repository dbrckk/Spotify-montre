import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=p=>readFileSync(resolve(root,p),'utf8');
const catalogue=JSON.parse(load('site/selection-affiliation.json'));
const html=load('site/revue-photo.html');
const js=load('site/revue-photo.js');
const css=load('site/revue-photo.css');
assert.equal(catalogue.products.length,15);
const tiers={essential:0,signature:0,prestige:0};
for(const p of catalogue.products){
  tiers[p.tier]++;
  const photo=p.photoReview;
  assert.ok(photo,'Missing official photo research for '+p.id);
  assert.equal(photo.accuracy,'exact');
  assert.equal(photo.publicUsageApproved,false,'A licence must be confirmed before commercial publishing');
  assert.equal(photo.licence,'permission_required');
  assert.equal(p.photoRights,'not_licensed');
  assert.equal(p.imageMode,'custom_vector_illustration','Public site retains original illustrations');
  for(const field of ['url','source']){
    const url=new URL(photo[field]);
    assert.equal(url.protocol,'https:');
    assert.ok(url.hostname && !url.username && !url.password);
  }
}
assert.deepEqual(tiers,{essential:6,signature:6,prestige:3});
assert.match(html,/name="robots" content="noindex,nofollow"/);
assert.match(html,/id="photoGrid"/);
assert.match(html,/id="photoDialog"/);
assert.match(html,/non autoris/i);
assert.match(js,/photo\.publicUsageApproved!==false/);
assert.match(js,/img\.src=p\.photoReview\.url/);
assert.match(js,/img\.onerror=/);
assert.match(js,/\.textContent=content/);
assert.doesNotMatch(js,/innerHTML\s*=/);
assert.match(css,/@media\(max-width:620px\)/);
console.log('Photo source review: 15 exact packshot references; public license gate and responsive preview — OK');
