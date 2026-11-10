/**
 * End-to-end withdrawal rehearsal in a private temporary copy.
 *
 * Simulates two formerly published main models (including the static hero)
 * and one supplemental model. It does not alter checked-out files or contact
 * merchants/CDNs. This is deliberately distinct from a live takedown.
 */
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,mkdirSync,readdirSync,readFileSync,
  rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const project=resolve(import.meta.dirname,'..');
const scratch=mkdtempSync(join(tmpdir(),'atelier-withdrawal-rehearsal-'));
const load=p=>JSON.parse(readFileSync(join(scratch,p),'utf8'));
const save=(p,value)=>writeFileSync(join(scratch,p),JSON.stringify(value,null,2)+'\n');
const coreIds=['citizen-tsuyosa','casio-mtp-b145'];
const extraId='skmei-1251';
const retired=[...coreIds,extraId];
const folders=['watches','watch-responsive','watch-thumbs','watches-popular','popular-responsive'];
function run(command,args){
  const result=spawnSync(command,args,{
    cwd:scratch,encoding:'utf8',timeout:120000,
    env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/'},
    maxBuffer:20*1024*1024
  });
  assert.equal(result.status,0,command+' '+args.join(' ')+'\n'+result.stdout.slice(-4500)+'\n'+result.stderr.slice(-4500));
  assert.equal(result.stderr,'',command+' wrote to stderr');
}
try{
  for(const name of ['site','scripts','research'])
    cpSync(join(project,name),join(scratch,name),{recursive:true});
  mkdirSync(join(scratch,'docs'),{recursive:true});
  const core=load('site/selection-affiliation.json');
  const extra=load('site/selection-populaires.json');
  const rights=load('site/popular-photo-rights.json');
  for(const id of coreIds){
    const p=core.products.find(x=>x.id===id);
    assert.ok(p?.photoReview?.publicUsageApproved===true);
    p.photoRights='publication_withdrawn';
    p.imageMode='editorial_illustration';
    p.photoReview={publicUsageApproved:false,licence:'permission_withdrawn',
      provider:p.brand,accuracy:'exact'};
  }
  const supplementary=extra.products.find(x=>x.id===extraId);
  assert.ok(supplementary&&rights.photos[extraId]);
  supplementary.photoPublicationBlocked=true;
  delete rights.photos[extraId];
  save('site/selection-affiliation.json',core);
  save('site/selection-populaires.json',extra);
  save('site/popular-photo-rights.json',rights);
  for(const folder of folders){
    const dir=join(scratch,'site/assets',folder);
    if(!existsSync(dir))continue;
    for(const file of readdirSync(dir))
      if(retired.some(id=>new RegExp('^'+id+'(?:-(?:240|360|480|720|800|960))?\\.webp$').test(file)))
        rmSync(join(dir,file));
  }
  run('node',['scripts/validate-photo-review.mjs']);
  run('node',['scripts/build-seo.mjs']);
  run('node',['scripts/validate-seo.mjs']);
  run('python',['scripts/build-shipstatic-bundle.py']);
  const manifest=load('docs/deploy-package-manifest.json');
  assert.equal(manifest.totalModels,52);
  assert.equal(manifest.models,13);
  assert.equal(manifest.supplementalPhotos,24);
  const allAssets=manifest.parts.flatMap(part=>
    load('docs/'+part.file).files);
  const paths=allAssets.map(x=>x.path);
  for(const id of retired){
    assert.ok(paths.includes('montres/'+id+'.html'),
      'The existing model page must survive the photo withdrawal: '+id);
    assert.ok(!paths.some(p=>folders.some(folder=>
      new RegExp('^assets/'+folder+'/'+id+'(?:-(?:240|360|480|720|800|960))?\\.webp$').test(p))),
      'Photo original or responsive derivatives leaked into package: '+id);
    const html=readFileSync(join(scratch,'site/montres',id+'.html'),'utf8');
    assert.ok(html.includes(id),'Product identity must remain visible: '+id);
    assert.ok(!html.includes('assets/watches/'+id+'.webp')&&!html.includes('assets/watches-popular/'+id+'.webp'),
      'Withdrawn media URL leaked into article: '+id);
  }
  const result=load('site/selection-affiliation.json');
  assert.equal(result.products.length,15);
  for(const id of coreIds){
    const row=result.products.find(p=>p.id===id);
    assert.equal(row.photoReview.publicUsageApproved,false);
    assert.equal(row.photoReview.localUrl,undefined);
    assert.equal(row.photoReview.url,undefined);
    assert.equal(row.photoReview.source,undefined);
  }
  const home=readFileSync(join(scratch,'site/affiliation.html'),'utf8');
  assert.ok(home.includes('class="am-hero-real-photo"'));
  assert.ok(!home.includes('assets/watches/citizen-tsuyosa.webp'),
    'Withdrawn original cannot be the homepage hero or OG image');
  assert.match(home,/aria-label="Photographie de [^"]+"/);
  const manifestSeo=load('site/seo-manifest.json');
  assert.equal(manifestSeo.licensedImageCount,13);
  assert.ok(readFileSync(join(scratch,'site/affiliation.js'),'utf8').includes('publication_withdrawn'),
    'Catalogue must keep watch without the photograph');
  console.log('PHOTO WITHDRAWAL REHEARSAL PASSED: 52 models, 3 source photos removed, 13 core photos/24 supplementary photos, packaging and SEO checked; production untouched.');
}finally{
  rmSync(scratch,{recursive:true,force:true});
}
