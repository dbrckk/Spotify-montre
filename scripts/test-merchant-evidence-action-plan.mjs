import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSourceEvidenceReview} from './source-evidence-review.mjs';
import {buildMerchantEvidenceActionPlan} from './merchant-evidence-action-plan.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const core=read('site/selection-affiliation.json').products;
const extra=read('site/selection-populaires.json').products;
const coreResearch=read('research/amazon-fr-exact-products.json').products;
const supplemental=read('research/amazon-fr-popular-verified.json').verifiedProducts;
const photoRights=read('site/popular-photo-rights.json').photos;
const ids=new Set([...core,...extra].map(p=>p.id));
const sourceReview=buildSourceEvidenceReview({
  coreResearch,supplemental,catalogIds:ids,asOf:'2026-11-13'
});
const params={coreProducts:core,extraProducts:extra,photoRights,sourceReview,coreResearch};
const plan=buildMerchantEvidenceActionPlan(params);
assert.equal(plan.schemaVersion,1);
assert.equal(plan.asOf,'2026-11-13');
assert.deepEqual(plan.totals,{
  watches:52,documentedAsins:27,noDocumentedAsin:25,photosPublished:41,
  photosMissing:11,independentRightsClaims:0,historicallyUnavailable:4,
  comparatorOnly:6,documentaryDue:0,documentaryDueSoon:0
});
assert.equal(plan.rows.length,52);
assert.equal(new Set(plan.rows.map(p=>p.id)).size,52);
assert.ok(plan.rows.every(p=>p.merchantAction&&p.photoAction&&
  p.officialUrl.startsWith('https://')&&!p.modelUrl.includes('undefined')));
assert.ok(plan.rows.every((p,i,a)=>!i||a[i-1].merchantPriority<=p.merchantPriority));
assert.ok(plan.rows.filter(p=>p.historicallyUnavailable)
  .every(p=>p.merchantPriority===1&&p.documentedAsin&&p.merchantAction.includes('situation actuelle inconnue')));
assert.equal(plan.rows.find(p=>p.id==='casio-mtp-1302').documentedAsin,'B0BRPD1FTX');
assert.equal(plan.rows.find(p=>p.id==='skmei-1251').merchantPriority,2);
assert.equal(plan.rows.find(p=>p.id==='skmei-2056').documentedAsin,null);
assert.equal(plan.rows.find(p=>p.id==='skmei-2056').merchantPriority,4);
assert.equal(plan.rows.filter(p=>!p.photoPublished).length,11);
assert.equal(plan.rows.find(p=>p.id==='casio-ga-2100-1a1').photoPublished,false);
const near=buildSourceEvidenceReview({
  coreResearch,supplemental,catalogIds:ids,asOf:'2026-12-09'
});
const soon=buildMerchantEvidenceActionPlan({...params,sourceReview:near});
assert.ok(soon.totals.documentaryDueSoon>=1,'Approaching evidence deadlines must surface');
assert.equal(soon.totals.documentaryDue,0);
const staleReview=buildSourceEvidenceReview({
  coreResearch,supplemental,catalogIds:ids,asOf:'2027-01-01'
});
const stale=buildMerchantEvidenceActionPlan({...params,sourceReview:staleReview});
assert.equal(stale.totals.documentaryDue,27);
assert.deepEqual(plan,buildMerchantEvidenceActionPlan(params),'Queue must be deterministic');
assert.throws(()=>buildMerchantEvidenceActionPlan({...params,photoRights:{
  ...photoRights,'unknown-watch':{file:'assets/watches-popular/unknown.webp'}
}}),/unknown supplemental/);
assert.throws(()=>buildMerchantEvidenceActionPlan({...params,extraProducts:[...extra,extra[0]]}),/complete source/);
assert.throws(()=>buildMerchantEvidenceActionPlan({...params,coreProducts:[
  {...core[0],officialUrl:'javascript:alert(1)'},...core.slice(1)
]}),/official URL/);
// Future ASIN research must not require hardcoding today's 27 matches.
const futureResearch={...supplemental,
  'skmei-2056':{asin:'B012345678',verifiedAt:'2026-11-13',
    evidenceType:'amazon_fr_product_page'}};
const futureReview=buildSourceEvidenceReview({coreResearch,
  supplemental:futureResearch,catalogIds:ids,asOf:'2026-11-13'});
const future=buildMerchantEvidenceActionPlan({...params,sourceReview:futureReview});
assert.equal(future.totals.documentedAsins,28);
assert.equal(future.rows.find(p=>p.id==='skmei-2056').documentedAsin,'B012345678');
const reducedResearch=Object.fromEntries(Object.entries(supplemental)
  .filter(([id])=>id!=='skmei-1251'));
const reducedReview=buildSourceEvidenceReview({coreResearch,
  supplemental:reducedResearch,catalogIds:ids,asOf:'2026-11-13'});
const reduced=buildMerchantEvidenceActionPlan({...params,sourceReview:reducedReview});
assert.equal(reduced.totals.documentedAsins,26);
assert.equal(reduced.rows.find(p=>p.id==='skmei-1251').documentedAsin,null);
assert.ok(plan.limitations.some(x=>x.includes('not a purchase')));
console.log('PASS: read-only 52-model merchant evidence plan, 27 historical ASINs, priority queue and 11 photo gaps.');
