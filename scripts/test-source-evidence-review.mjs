import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSourceEvidenceReview} from './source-evidence-review.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const core=read('site/selection-affiliation.json').products;
const supplemental=read('site/selection-populaires.json').products;
const amazon=read('research/amazon-fr-exact-products.json').products;
const verified=read('research/amazon-fr-popular-verified.json').verifiedProducts;
const ids=new Set([...core,...supplemental].map(p=>p.id));
assert.equal(ids.size,52);
const params={coreResearch:amazon,supplemental:verified,catalogIds:ids};
const expected=Object.values(amazon).filter(p=>p.status==='matched_on_amazon_fr').length+
  Object.keys(verified).length;
const recent=buildSourceEvidenceReview({...params,asOf:'2026-11-08'});
assert.equal(recent.documentedAsins,expected);
assert.equal(recent.records.length,expected);
assert.equal(recent.dueCount,0,'No source should be older than 45 days on research day');
assert.ok(recent.records.every(p=>p.ageDays>=0&&!p.needsReview));
assert.match(recent.notes,/never live prices, stock/i);
assert.equal(recent.records.find(p=>p.id==='casio-la-20wh-4a1').checkedOn,'2026-11-08');
assert.equal(recent.records.find(p=>p.id==='tissot-gentleman-auto').asin,'B07XTVQ3W7');

const day44=buildSourceEvidenceReview({...params,asOf:'2026-12-22'});
const day45=buildSourceEvidenceReview({...params,asOf:'2026-12-23'});
assert.equal(day44.records.find(p=>p.id==='casio-la-20wh-4a1').ageDays,44);
assert.equal(day44.records.find(p=>p.id==='casio-la-20wh-4a1').needsReview,false);
assert.equal(day45.records.find(p=>p.id==='casio-la-20wh-4a1').ageDays,45);
assert.equal(day45.records.find(p=>p.id==='casio-la-20wh-4a1').needsReview,true);
assert.ok(day45.dueCount>0);
const later=buildSourceEvidenceReview({...params,asOf:'2027-01-01'});
assert.equal(later.dueCount,expected,'Every 2026 source must be re-reviewed in 2027');
assert.equal(later.records[0].ageDays>=later.records.at(-1).ageDays,true);
assert.deepEqual(later.records,buildSourceEvidenceReview({...params,asOf:'2027-01-01'}).records,
  'The review queue must be deterministic across reruns');
assert.throws(()=>buildSourceEvidenceReview({...params,asOf:'2026-11-07'}),/future/);
assert.throws(()=>buildSourceEvidenceReview({...params,asOf:'2026-02-30'}),/calendar/);
assert.throws(()=>buildSourceEvidenceReview({...params,reviewIntervalDays:0}),/positive/);
assert.throws(()=>buildSourceEvidenceReview({...params,catalogIds:new Set(['skmei-1251'])}),/complete/);
assert.throws(()=>buildSourceEvidenceReview({...params,supplemental:{
  ...verified,'malicious-watch':{asin:'B0DN6LT6FX',verifiedAt:'2026-11-01',
    evidenceType:'amazon_fr_product_page'}}}),/unknown/);
assert.throws(()=>buildSourceEvidenceReview({...params,supplemental:{
  ...verified,'casio-mtp-1302':{asin:'B0BRPD1FTX',verifiedAt:'2026-11-01',
    evidenceType:'amazon_fr_product_page'}}}),/duplicated/);
assert.throws(()=>buildSourceEvidenceReview({...params,supplemental:{
  ...verified,'casio-la-20wh-4a1':{...verified['casio-la-20wh-4a1'],asin:'B0000X'}}}),/invalid ASIN/);
assert.throws(()=>buildSourceEvidenceReview({...params,supplemental:{
  ...verified,'casio-la-20wh-4a1':{...verified['casio-la-20wh-4a1'],verifiedAt:'2026-11-31'}}}),/calendar/);
console.log('PASS: '+expected+' source-backed ASIN review dates, aging thresholds and tamper-resistant editorial audit.');
