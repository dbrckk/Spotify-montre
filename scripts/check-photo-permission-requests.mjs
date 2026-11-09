import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const path=join(root,'scripts/prepare-photo-permission-requests.mjs');
const run=(...args)=>spawnSync(process.execPath,[path,...args],{
  cwd:root,encoding:'utf8',timeout:15000
});
const list=run();
assert.equal(list.status,0,list.stderr);
assert.match(list.stdout,/Casio, Edifice et G-SHOCK/);
assert.match(list.stdout,/Photos publiées/);
const result=run('--all','--json');
assert.equal(result.status,0,result.stderr);
const data=JSON.parse(result.stdout);
assert.equal(data.reportKind,'unsent-photo-rights-requests');
assert.equal(data.automaticSending,false);
assert.equal(data.legalClearanceConfirmed,false);
assert.equal(data.totalModels,52);
assert.equal(data.totalPublished,40);
assert.equal(data.packets.reduce((n,g)=>n+g.missing,0),12);
assert.equal(data.packets.reduce((n,g)=>n+g.total,0),52);
assert.equal(data.packets.find(g=>g.brand==='Casio').displayedBrands.length,3);
const allIds=data.packets.flatMap(g=>g.photos.map(p=>p.id));
assert.equal(new Set(allIds).size,52);
for(const g of data.packets){
  assert.equal(g.legalClearanceConfirmed,false);
  assert.equal(g.transmitted,false);
  assert.equal(g.photos.length,g.total);
  assert.equal(g.published,g.photos.filter(p=>p.photoPublished).length);
  assert.ok(g.draft.includes('Ce message ne présume'));
  assert.ok(g.draft.includes('l’hébergement local'));
  assert.ok(g.draft.includes('hors GitHub'));
  for(const photo of g.photos){
    assert.ok(g.draft.includes(photo.id));
    assert.ok(g.draft.includes(photo.modelPage));
    if(photo.photoPublished){
      assert.ok(g.draft.includes(photo.imageSha256));
      assert.ok(g.draft.includes(photo.sourcePage));
    }else{
      assert.equal(photo.imageSha256,null);
      assert.ok(g.draft.includes('aucune nouvelle photo'));
    }
  }
}
const single=run('--brand','SKMEI');
assert.equal(single.status,0,single.stderr);
assert.match(single.stdout,/SKMEI/);
assert.doesNotMatch(single.stdout,/## Citizen/);
const alias=run('--brand','Casio Edifice','--json');
assert.equal(alias.status,0,alias.stderr);
assert.equal(JSON.parse(alias.stdout).packets[0].brand,'Casio');
const allText=run('--all');
assert.equal(allText.status,0,allText.stderr);
assert.equal((allText.stdout.match(/^## [^#].* — \d+ références/gm)||[]).length,data.packets.length);
assert.doesNotMatch(allText.stdout,/\bpermission (accordée|validée)|licence certifiée\b/i);
for(const args of [
 ['--brand','Unknown Brand'],['--all','--brand','SKMEI'],
 ['--json'],['--all','--secret'],['--all','--all'],
 ['--brand'],['--brand','../bad']
])assert.equal(run(...args).status,1,'Invalid options must fail: '+args.join(' '));
console.log('R1 permission requests: 52 exact models, full photo/brand coverage, unsent drafts and safe CLI validated');
