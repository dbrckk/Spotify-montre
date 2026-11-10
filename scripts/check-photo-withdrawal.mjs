import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const script=join(root,'scripts/report-photo-withdrawal.mjs');
const run=(...args)=>spawnSync(process.execPath,[script,...args],{
  cwd:root,encoding:'utf8',timeout:15000
});
const inventory=JSON.parse(readFileSync(join(root,'site/popular-photo-rights.json'),'utf8')).photos;
const publishedMain=JSON.parse(readFileSync(join(root,'site/selection-affiliation.json'),'utf8'))
  .products.filter(p=>p.photoReview?.publicUsageApproved===true);
const all=run('--all','--json');
assert.equal(all.status,0,all.stderr);
assert.equal(all.stderr,'');
const report=JSON.parse(all.stdout);
assert.equal(report.kind,'photo-withdrawal-impact-read-only');
assert.equal(report.changesApplied,false);
assert.equal(report.realRemovalConfirmed,false);
assert.equal(report.records.length,52);
assert.equal(new Set(report.records.map(r=>r.id)).size,52);
assert.equal(report.records.filter(r=>r.published).length,
  publishedMain.length+Object.keys(inventory).length);
assert.equal(report.records.filter(r=>!r.published).length,52-publishedMain.length-Object.keys(inventory).length);
const ids=new Set();
for(const record of report.records){
  assert.ok(!ids.has(record.id));ids.add(record.id);
  assert.equal(record.executed,false);
  assert.equal(record.rightsClearanceConfirmed,false);
  assert.equal(record.liveRemovalConfirmed,false);
  assert.equal(record.cdnInvalidationConfirmed,null);
  assert.ok(record.registry.startsWith('site/'));
  assert.ok(record.blockers.some(b=>b.includes('CDN caches')));
  assert.ok(record.blockers.some(b=>b.includes('Rebuild catalogue')));
  for(const path of record.assets){
    assert.ok(path.startsWith('site/assets/'));
    assert.ok(path.includes('/'+record.id) || path.includes('/'+record.id+'-'));
    assert.match(path,/\.webp$/);
  }
  for(const path of record.referencingFiles)
    assert.ok(path.startsWith('site/')||path.startsWith('docs/deploy-package-'));
  if(record.published){
    assert.ok(record.assets.length>=1,'Published image original must be identified: '+record.id);
    assert.ok(record.assets.includes(record.sourceAsset));
  }else{
    assert.deepEqual(record.assets,[],'Non-published model cannot retain public photo files');
    assert.equal(record.sourceAsset,null);
  }
}
const casio=run('--id','casio-mtp-1302','--json');
assert.equal(casio.status,0,casio.stderr);
const casioRow=JSON.parse(casio.stdout).records[0];
assert.equal(casioRow.kind,'core');
assert.ok(casioRow.assets.includes('site/assets/watches/casio-mtp-1302.webp'));
assert.ok(casioRow.assets.some(p=>p.includes('watch-responsive/')));
const skmei=run('--id','skmei-1251','--json');
assert.equal(skmei.status,0,skmei.stderr);
const skmeiRow=JSON.parse(skmei.stdout).records[0];
assert.equal(skmeiRow.kind,'supplemental');
assert.ok(skmeiRow.assets.includes('site/assets/watches-popular/skmei-1251.webp'));
assert.ok(skmeiRow.assets.some(p=>p.includes('popular-responsive/')));
const noPhoto=run('--id','casio-f91w-1','--json');
assert.equal(noPhoto.status,0,noPhoto.stderr);
assert.equal(JSON.parse(noPhoto.stdout).records[0].published,false);
assert.deepEqual(JSON.parse(noPhoto.stdout).records[0].assets,[]);
const text=run('--id','skmei-1251');
assert.equal(text.status,0,text.stderr);
assert.match(text.stdout,/Aucune suppression effectuée/);
assert.match(text.stdout,/ne constitue pas une preuve de retrait/);
assert.match(run().stdout,/Cartographie des retraits photo/);
for(const args of [
  ['--id'],['--id','../bad'],['--id','unknown-model'],['--json'],
  ['--all','--id','skmei-1251'],['--all','--all'],
  ['--all','--secret'],['--id','skmei-1251','garbage']
])assert.notEqual(run(...args).status,0,'Invalid input must fail: '+args.join(' '));
console.log('Photo withdrawal impact: 52 models, 40 published media groups, 12 no-photo cases; assets and source references audited read-only.');
