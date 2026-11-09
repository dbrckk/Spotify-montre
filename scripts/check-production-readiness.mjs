import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const command=join(root,'scripts/report-production-readiness.mjs');
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const invoke=(...args)=>spawnSync(process.execPath,[command,...args],{
  cwd:root,encoding:'utf8',timeout:15000
});
const run=invoke('--json');
assert.equal(run.status,0,'Read-only report must execute: '+run.stderr);
assert.equal(run.stderr,'','No sensitive diagnostics on stderr');
const status=JSON.parse(run.stdout);
const core=read('site/selection-affiliation.json');
const additional=read('site/selection-populaires.json');
const rights=read('site/popular-photo-rights.json');
const exact=read('research/amazon-fr-exact-products.json');
const popular=read('research/amazon-fr-popular-verified.json');
const affiliate=read('site/affiliate-links.json');
const awin=read('research/partner-affiliate-offers.json');
const sellable=read('site/catalogue.json');
const setting=read('site/config.json');
const legal=readFileSync(join(root,'site/informations-legales.html'),'utf8');

assert.equal(status.schemaVersion,1);
assert.equal(status.reportKind,'read-only-source-evidence');
assert.equal(status.figures.totalWatches,core.products.length+additional.products.length);
assert.equal(status.figures.coreWatches,core.products.length);
assert.equal(status.figures.extraWatches,additional.products.length);
assert.equal(status.figures.publishedLocalPhotos,
  core.products.filter(p=>p.photoReview?.publicUsageApproved===true).length
  +Object.keys(rights.photos).length);
assert.equal(status.figures.missingLocalPhotos,
  status.figures.totalWatches-status.figures.publishedLocalPhotos);
assert.equal(status.figures.independentlyVerifiedPhotoRights,
  core.products.filter(p=>p.photoReview?.permissionIndependentlyVerified===true).length
  +Object.values(rights.photos).filter(p=>p.permissionIndependentlyVerified===true).length);
assert.equal(status.figures.documentedAsins,
  Object.values(exact.products).filter(x=>x.status==='matched_on_amazon_fr').length
    +Object.keys(popular.verifiedProducts).length);
assert.equal(status.figures.sellableDirectOffers,sellable.products.length);
for(const field of ['eligibleAffiliateSales','paidAffiliateCommissions','directGrossSales',
  'googleSearchClicks','organicSessions','fieldLcpP75','fieldInpP75']){
  assert.equal(status.figures[field],null,field+' cannot be derived from the source');
}
const gates=new Map(status.checks.map(c=>[c.id,c]));
assert.equal(gates.size,14,'14 unique agency signoff gates expected');
for(let i=1;i<=14;i++){
  const id='G'+String(i).padStart(2,'0');
  assert.ok(gates.has(id),'Missing '+id);
  assert.ok(['PASS','BLOCKED','EXTERNAL_PROOF_REQUIRED','NOT_MEASURED'].includes(gates.get(id).status));
  assert.ok(gates.get(id).source&&gates.get(id).owner&&gates.get(id).evidenceRequired);
}
assert.equal(gates.get('G01').status,
  core.products.length===15&&additional.products.length===37&&
  new Set([...core.products,...additional.products].map(p=>p.id)).size===52?'PASS':'BLOCKED');
assert.equal(gates.get('G02').status,
  setting.checkoutMode==='inactive'&&sellable.products.length===0?'PASS':'BLOCKED');
assert.equal(gates.get('G03').status,'EXTERNAL_PROOF_REQUIRED',
  'Source declarations cannot authenticate photo agreements');
assert.equal(gates.get('G04').status,
  /Informations d'identification incomplètes|n'ont pas encore été fournis pour publication/.test(legal)
    ?'BLOCKED':'EXTERNAL_PROOF_REQUIRED');
assert.equal(gates.get('G05').status,affiliate.approved===true?'EXTERNAL_PROOF_REQUIRED':'BLOCKED');
assert.equal(gates.get('G06').status,status.figures.documentedAsins===27?'PASS':'BLOCKED');
assert.equal(gates.get('G07').status,
  awin.enabled&&awin.publisherApproved&&Object.keys(awin.offers).length>0
    ?'EXTERNAL_PROOF_REQUIRED':'BLOCKED');
assert.equal(gates.get('G08').status,'NOT_MEASURED');
assert.equal(gates.get('G10').status,'EXTERNAL_PROOF_REQUIRED');
assert.equal(gates.get('G13').status,'EXTERNAL_PROOF_REQUIRED');
assert.equal(status.conclusions.compliantAffiliateLaunchConfirmed,false);
assert.equal(status.conclusions.monetizedAffiliateBusinessConfirmed,false);
assert.equal(status.conclusions.liveDirectCheckoutConfirmed,false);
assert.equal(status.conclusions.productionReadyFinalConfirmed,false);
const human=invoke();
assert.equal(human.status,0);
assert.match(human.stdout,/Production-ready final : NON DÉMONTRÉ/);
assert.match(human.stdout,/CJ_TICKET_MESSAGES_UNVERIFIED/);
assert.doesNotMatch(human.stdout,/revenu (confirmé|garanti)|ventes réalisées/i);
const strict=invoke('--strict','--json');
assert.equal(strict.status,2,'External legal and sale proofs must fail closed');
assert.equal(JSON.parse(strict.stdout).conclusions.productionReadyFinalConfirmed,false);
console.log('Production readiness quality gate: 14 evidence checks, source consistency, safe no-go OK');
