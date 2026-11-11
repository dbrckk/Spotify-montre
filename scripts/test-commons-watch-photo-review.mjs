import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewCommonsCandidates,markdownCommonsReview} from './review-commons-watch-photos.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalogue=read('site/selection-populaires.json');
const rights=read('site/popular-photo-rights.json');
const register=read('research/commons-watch-photo-candidates.json');
const baseline=reviewCommonsCandidates({catalogue,rights,register});
assert.equal(baseline.models,37);
assert.equal(baseline.published,Object.keys(rights.photos).length);
assert.equal(baseline.unpublished,37-baseline.published);
assert.equal(baseline.possibleCandidates,
  register.candidates.filter(c=>!rights.photos[c.modelId]).length);
assert.equal(baseline.publicationAllowed,0);
assert.equal(baseline.usage,'RESEARCH_ONLY_NO_AUTO_PUBLICATION');
assert.equal(register.candidates.length,3);
assert.match(markdownCommonsReview(baseline),/exact variant/i);
for(const c of baseline.candidates){
  assert.equal(c.publicationAllowed,false);
  assert.equal(c.identityStatus,'family_only_exact_variant_not_verified');
  assert.ok(c.filePage.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.ok(c.licenseUrl.startsWith('https://creativecommons.org/'));
  // The manufacturer sourcing job runs BEFORE HTML generation. Other jobs
  // inspect the actual generated pages; check them here when available.
  const path=new URL('../site/montres/'+c.modelId+'.html',import.meta.url);
  if(existsSync(path)){
    const html=readFileSync(path,'utf8');
    if(!rights.photos[c.modelId]){
      assert.ok(html.includes('am-extra-art-no-photo'),
        'Family-level candidate must never become a fake photo on the shop: '+c.modelId);
      assert.ok(!html.includes('class="am-extra-licensed-photo"'),
        'No photo source without exact SKU confirmation: '+c.modelId);
    }
    assert.ok(!html.includes(c.filePage),
      'Research URLs must not leak into the public product sheet: '+c.modelId);
  }
}
const check=(change,expected)=>{
  const bad=structuredClone(register);
  change(bad);
  assert.throws(()=>reviewCommonsCandidates({catalogue,rights,register:bad}),expected);
};
check(x=>x.candidates[0].license='CC-BY-NC-4.0',/licence/);
check(x=>x.candidates[0].licenseUrl='https://creativecommons.org/licenses/by-nc/4.0/',/licence/);
check(x=>x.candidates[0].publicationAllowed=true,/unpublished/);
check(x=>x.candidates[0].identityStatus='exact_sku_verified',/unpublished/);
check(x=>x.candidates[0].candidateModel=x.candidates[0].catalogModel,/variant review/);
check(x=>x.candidates[0].sourceSha1='0'.repeat(39),/SHA-1/);
check(x=>x.candidates[0].modelId='other-casio',/unknown/);
check(x=>x.candidates[0].filePage='https://attacker.example/wiki/File:Casio_F-91W.jpg',/Untrusted/);
check(x=>x.candidates[0].filePage+='?redirect=https://attacker.example/',/Untrusted/);
check(x=>x.candidates[0].filePage='https://commons.wikimedia.org/wiki/File:Casio_A168W.jpg',/Untrusted/);
check(x=>x.candidates.push(structuredClone(x.candidates[0])),/duplicated/);
check(x=>x.candidates[0].creator='<script>alert(1)</script>',/unpublished/);
check(x=>x.candidates[0].catalogModel='F-91W-1Y',/mismatched/);
// A later new OFFICIAL photo must safely archive the research candidate,
// never require a fake Commons approval or break weekly photo sourcing.
const futureRights=structuredClone(rights);
futureRights.photos[register.candidates[0].modelId]={sourcePage:'https://www.casio.com/'};
const future=reviewCommonsCandidates({catalogue,rights:futureRights,register});
assert.equal(future.possibleCandidates,baseline.possibleCandidates-1);
assert.equal(future.publicationAllowed,0);

const cli=fileURLToPath(new URL('./review-commons-watch-photos.mjs',import.meta.url));
const json=spawnSync(process.execPath,[cli,'--json'],{encoding:'utf8',timeout:5000});
assert.equal(json.status,0,json.stderr);
assert.equal(JSON.parse(json.stdout).possibleCandidates,baseline.possibleCandidates);
const md=spawnSync(process.execPath,[cli,'--markdown'],{encoding:'utf8',timeout:5000});
assert.equal(md.status,0,md.stderr);
assert.ok(md.stdout.includes('Creative Commons candidates'));
// A bare CLI request must not silently publish or default to an unsafe mode.
const invalid=spawnSync(process.execPath,[cli,'--publish'],{encoding:'utf8',timeout:5000});
assert.notEqual(invalid.status,0);
console.log('PASS: three Commons CC source candidates, SKU-safe research-only workflow, licensing, no storefront publication.');
