import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

const origin=resolve(import.meta.dirname,'..');
const call=(where,args)=>spawnSync(process.execPath,
  ['scripts/withdraw-watch-photo.mjs',...args],{
    cwd:where,encoding:'utf8',timeout:180000,maxBuffer:2e6
  });
const read=(root,path)=>JSON.parse(readFileSync(join(root,path),'utf8'));
for(const id of ['skmei-1251','casio-ltp1302','citizen-tsuyosa']){
  const tmp=mkdtempSync(join(tmpdir(),'atelier-photo-removal-'));
  try{
    for(const dir of ['site','scripts','research','docs'])
      cpSync(join(origin,dir),join(tmp,dir),{recursive:true});
    const preview=call(tmp,['--id',id]);
    assert.equal(preview.status,0,preview.stderr);
    const plan=JSON.parse(preview.stdout);
    assert.equal(plan.operation,'preview_only');
    assert.equal(plan.liveRemovalVerified,false);
    assert.equal(plan.cdnPurged,false);
    assert.ok(plan.media.length>=1);
    const original=plan.media[0];
    assert.ok(existsSync(join(tmp,original)));
    const invalid=call(tmp,['--id',id,'--apply','--confirm','RETIRER:wrong']);
    assert.notEqual(invalid.status,0,'Explicit, ID-scoped confirmation is required');
    assert.ok(existsSync(join(tmp,original)),'Invalid confirmation must not change bytes');
    const applied=call(tmp,['--id',id,'--apply','--confirm','RETIRER:'+id]);
    assert.equal(applied.status,0,
      id+' removal must rebuild the actual site and deployment archive: '+applied.stderr);
    const result=JSON.parse(applied.stdout);
    assert.equal(result.sourceRemoved,true);
    assert.equal(result.sourceRebuilt,true);
    assert.equal(result.bundlesRebuilt,true);
    assert.equal(result.liveRemovalVerified,false);
    assert.equal(result.cdnPurged,false);
    assert.equal(result.media.length,plan.media.length);
    for(const path of plan.media)
      assert.ok(!existsSync(join(tmp,path)),'Withdrawn media must not survive: '+path);
    const manifest=read(tmp,'site/photo-takedowns.json');
    assert.equal(manifest.retired.length,1);
    assert.equal(manifest.retired[0].id,id);
    const core=read(tmp,'site/selection-affiliation.json').products.find(p=>p.id===id);
    const extra=read(tmp,'site/popular-photo-rights.json').photos[id];
    if(core){
      assert.equal(core.photoReview.publicUsageApproved,false);
      assert.equal(core.photoReview.url,undefined);
      assert.equal(core.photoReview.localUrl,undefined);
      assert.equal(core.imageMode,'illustration');
    }else assert.equal(extra,undefined);
    const sheet=readFileSync(join(tmp,'site/montres',id+'.html'),'utf8');
    assert.ok(sheet.includes('Photo')||sheet.includes('photo')||sheet.includes('Photographie'));
    const stalePattern=new RegExp('assets/(?:watches|watches-popular|watch-responsive|popular-responsive|watch-thumbs)/'+id+'(?:-\\d+)?\\.webp');
    for(const path of ['site/index.html','site/montres/toutes-les-montres.html',
      'site/montres/'+id+'.html','site/commercial-registry.json']){
      if(!existsSync(join(tmp,path)))continue;
      assert.ok(!stalePattern.test(readFileSync(join(tmp,path),'utf8')),
        'Published HTML and commercial metadata cannot reference removed media: '+path);
    }
    const check=spawnSync(process.execPath,['scripts/validate-seo.mjs'],{
      cwd:tmp,encoding:'utf8',timeout:120000,maxBuffer:2e6
    });
    assert.equal(check.status,0,'SEO validation must survive retirement: '+check.stderr);
    assert.notEqual(call(tmp,['--id',id,'--apply','--confirm','RETIRER:'+id]).status,0,
      'Retiring an already retired image must fail safely');
    console.log('Isolated real retirement succeeded for '+id+' ('+plan.media.length+' source WebPs removed)');
  }finally{rmSync(tmp,{recursive:true,force:true});}
}
console.log('Supplemental, ordinary core and homepage-hero core photos can be withdrawn in isolated copies with a complete rebuild; live proof remains pending.');
