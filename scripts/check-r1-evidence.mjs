import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const run=(...args)=>spawnSync(process.execPath,
  [join(root,'scripts/report-r1-evidence.mjs'),...args],
  {cwd:root,encoding:'utf8',timeout:12000});
const cmd=run('--json');
assert.equal(cmd.status,0,'Source report must run: '+cmd.stderr);
assert.equal(cmd.stderr,'','No private data diagnostics should be logged');
const report=JSON.parse(cmd.stdout);
const core=read('site/selection-affiliation.json').products;
const extras=read('site/selection-populaires.json').products;
const licensed=read('site/popular-photo-rights.json').photos;
assert.equal(report.reportKind,'r1-evidence-register-source-only');
assert.equal(report.totals.models,52);
assert.equal(report.photos.length,52);
assert.equal(new Set(report.photos.map(p=>p.id)).size,52);
assert.equal(report.totals.published,
  core.filter(p=>p.photoReview?.publicUsageApproved===true).length+Object.keys(licensed).length);
assert.equal(report.totals.unpublished,52-report.totals.published);
assert.equal(report.totals.authenticatedPhotoPermissions,null,
  'Reading source files cannot verify private photo contracts');
assert.equal(report.legal.publisherIdentification,'BLOCKED');
assert.equal(report.legal.pageNoIndex,true,'Legally incomplete site stays non-indexable');
assert.equal(report.release.r1LegallySignedOff,false);
assert.equal(report.release.directSaleApproved,false);
assert.equal(report.partners.amazonRevenueIndependentlyConfirmed,null);
assert.equal(report.partners.cjExactLandedQuoteConfirmed,null);
assert.equal(report.brands.reduce((n,b)=>n+b.total,0),52);
assert.equal(report.brands.reduce((n,b)=>n+b.published,0),report.totals.published);
assert.equal(report.brands.reduce((n,b)=>n+b.missing,0),report.totals.unpublished);
for(const row of report.photos){
  assert.equal(row.legalSignOff,'EXTERNAL_PROOF_REQUIRED');
  assert.ok(row.nextAction.includes(row.photoPublished?'Conserver':'Obtenir'));
  assert.ok(row.id&&row.model&&row.brand);
  assert.equal(row.registryClaimsIndependentVerification,
    row.collection==='core'?
      core.find(p=>p.id===row.id).photoReview?.permissionIndependentlyVerified===true
      :licensed[row.id]?.permissionIndependentlyVerified===true);
  if(row.photoPublished){
    assert.match(row.sourcePage,/^https:\/\//);
    assert.match(row.imageSha256,/^[a-f0-9]{64}$/i);
    assert.ok(row.photoPath);
  }else{
    assert.equal(row.photoPath,null);
    assert.equal(row.imageSha256,null);
  }
}
const md=run();
assert.equal(md.status,0);
assert.match(md.stdout,/R1 non validé/);
assert.doesNotMatch(md.stdout,/R1 conforme|licence vérifiée indépendamment|commissions prouvées/i);
const csv=run('--csv');
assert.equal(csv.status,0);
assert.equal(csv.stdout.trimEnd().split('\n').length,53,
  'One header and 52 actionable photo records');
assert.ok(csv.stdout.startsWith('id,brand,model,collection,'));
assert.equal(run('--json','--csv').status,1,'Ambiguous output formats must fail');
console.log('R1 evidence register: 52 exact models, legal blockers, photos, CSV and no-go validated');
