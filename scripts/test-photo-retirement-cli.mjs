/**
 * Real exact-photo retirement in isolated temporary copies, never live media.
 * Exercises SHA guard, confirmation, source deletion, SEO, package and rollback boundary.
 */
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const origin=resolve(import.meta.dirname,'..');
const currentCore=JSON.parse(readFileSync(join(origin,'site/selection-affiliation.json'),'utf8')).products;
const currentExtra=JSON.parse(readFileSync(join(origin,'site/popular-photo-rights.json'),'utf8')).photos;
const coreId=currentCore.find(p=>p.id==='citizen-tsuyosa'&&p.photoReview?.publicUsageApproved===true)?.id||
  currentCore.find(p=>p.photoReview?.publicUsageApproved===true)?.id;
const supplementalId=currentExtra['skmei-1251']?'skmei-1251':Object.keys(currentExtra)[0];
assert.ok(coreId&&supplementalId,'Retirement CLI checks need a published model in both classes');
const scenarios=[{id:coreId,kind:'core'},{id:supplementalId,kind:'supplemental'}];
const load=(dir,name)=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const run=(dir,id,extra=[],sandbox=false)=>spawnSync(process.execPath,
  ['scripts/withdraw-watch-photo.mjs','--id',id,...extra],{
    cwd:dir,encoding:'utf8',timeout:180000,maxBuffer:20*1024*1024,
    env:{...process.env,AM_WITHDRAWAL_SANDBOX:sandbox?'1':'0'}
  });
for(const {id,kind} of scenarios){
  const scratch=mkdtempSync(join(tmpdir(),'atelier-photo-action-'));
  try{
    for(const name of ['site','scripts','research'])
      cpSync(join(origin,name),join(scratch,name),{recursive:true});
    mkdirSync(join(scratch,'docs'),{recursive:true});
    const catalogue=load(scratch,'site/selection-affiliation.json');
    const rights=load(scratch,'site/popular-photo-rights.json');
    const originalPhoto=readFileSync(join(scratch,'site/assets/'+
      (kind==='core'?'watches/':'watches-popular/')+id+'.webp'));
    const report=run(scratch,id);
    assert.equal(report.status,0,report.stderr);
    const preview=JSON.parse(report.stdout);
    assert.equal(preview.operation,'preview_only');
    assert.equal(preview.liveRemovalVerified,false);
    assert.equal(preview.cdnPurged,false);
    assert.ok(preview.media.length>=1);
    assert.ok(preview.media.some(x=>x.endsWith('/'+id+'.webp')));
    assert.equal(run(scratch,id,['--apply','--confirm','RETIRER:wrong'],true).status!==0,true,
      'Invalid confirmation must fail');
    assert.equal(run(scratch,id,['--apply','--confirm','RETIRER:'+id],false).status!==0,true,
      'Apply without review branch must fail');
    assert.deepEqual(readFileSync(join(scratch,preview.media.find(x=>x.endsWith('/'+id+'.webp')))),
      originalPhoto,'Refused actions must leave original bytes intact');
    const applied=run(scratch,id,['--apply','--confirm','RETIRER:'+id],true);
    assert.equal(applied.status,0,
      id+' action failed:\n'+applied.stdout.slice(-7000)+'\n'+applied.stderr.slice(-7000));
    const info=JSON.parse(applied.stdout);
    assert.equal(info.sourceRemoved,true);
    assert.equal(info.pagesRebuilt,true);
    assert.equal(info.packageValidated,true);
    assert.equal(info.liveRemovalVerified,false);
    assert.equal(info.cdnPurged,false);
    const ledger=load(scratch,'site/photo-takedowns.json');
    assert.equal(ledger.retired.length,1);
    assert.equal(ledger.retired[0].id,id);
    for(const path of preview.media)assert.ok(!existsSync(join(scratch,path)),
      'Source photo or derivative survived: '+path);
    const updated=load(scratch,'site/selection-affiliation.json');
    const updatedRights=load(scratch,'site/popular-photo-rights.json');
    if(kind==='core'){
      assert.equal(updated.products.length,catalogue.products.length);
      const p=updated.products.find(x=>x.id===id);
      assert.equal(p.imageMode,'editorial_illustration');
      assert.equal(p.photoReview.publicUsageApproved,false);
      assert.equal(p.photoReview.localUrl,undefined);
    }else{
      assert.equal(updatedRights.photos[id],undefined);
      assert.ok(rights.photos[id]);
      assert.equal(load(scratch,'site/selection-populaires.json').products
        .find(x=>x.id===id).photoPublicationBlocked,true);
    }
    const manifest=load(scratch,'docs/deploy-package-manifest.json');
    assert.equal(manifest.totalModels,52);
    const paths=manifest.parts.flatMap(part=>load(scratch,'docs/'+part.file).files.map(f=>f.path));
    assert.ok(paths.includes('montres/'+id+'.html'),'Watch page must remain indexable');
    assert.equal(paths.some(p=>preview.media.some(m=>p===m.replace(/^site\//,''))),false,
      'Deploy package cannot contain withdrawn media');
    assert.ok(existsSync(join(origin,'site/assets/'+
      (kind==='core'?'watches/':'watches-popular/')+id+'.webp')),
      'Source repository must remain unchanged');
    assert.notEqual(run(scratch,id).status,0,'A retired watch cannot be retired twice');
    console.log('ISOLATED PHOTO RETIREMENT OK: '+id+', '+preview.media.length+' media assets removed');
  }finally{rmSync(scratch,{recursive:true,force:true});}
}
