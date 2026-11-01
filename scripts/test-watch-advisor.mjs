import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const context={};
runInNewContext(read('site/conseiller-engine.js'),context,{timeout:2500});
const e=context.AtelierAdvisorEngine;
assert.equal(typeof e?.recommend,'function');
const feed=JSON.parse(read('site/selection-affiliation.json'));
const products=feed.products;
assert.equal(products.length,15);
const ids=r=>r.map(x=>x.product.id);
const featured=e.recommend(products,{},3);
assert.deepEqual(Array.from(ids(featured)),['casio-mtp-1302','citizen-tsuyosa','tissot-prx-auto']);
const affordable=e.recommend(products,{tier:'essential',style:'retro'},3);
assert.equal(affordable.length,3);
assert.equal(affordable[0].product.id,'casio-a168wa');
assert.equal(affordable[0].matched,2);
const eco=e.recommend(products,{movement:'eco-drive'},3);
assert.equal(eco[0].product.id,'citizen-eco');
const prestige=e.recommend(products,{tier:'prestige',movement:'automatic'},3);
assert.equal(prestige.length,3);
assert.ok(prestige.every(x=>x.product.tier==='prestige'&&x.product.movement==='automatic'));
const compact=e.recommend(products,{size:'compact'},15);
assert.deepEqual(Array.from(ids(compact.slice(0,2))),['casio-ltp1302','hamilton-khaki']);
assert.ok(compact.slice(0,2).every(x=>x.matched===1&&x.criteria===1&&x.sizeNote===''));
const rectangular=compact.find(x=>x.product.id==='casio-mtp-b145');
assert.equal(rectangular.matched,0,'Rectangular 35 mm case width must not count as a circular diameter');
assert.match(rectangular.sizeNote,/non renseigné/,'Absent circular diameter remains explicit, even when width is recorded');
const medium=e.recommend(products,{size:'medium'},15);
assert.equal(medium.filter(x=>x.matched===1).length,7,'Seven manufacturer-documented models have 38.1–40 mm diameters');
assert.ok(medium.slice(0,6).every(x=>x.matched===1&&x.criteria===1));
const unmeasured=compact.find(x=>x.product.id==='casio-a168wa');
assert.equal(unmeasured.matched,0,'Missing measurement is not an exact match');
assert.match(unmeasured.sizeNote,/non renseigné/,'Missing size must be explicitly disclosed');
assert.equal(e.diameterMm(products.find(p=>p.id==='orient-bambino')),38.4);
assert.equal(e.diameterMm(products.find(p=>p.id==='casio-ltp1302')),30.2);
assert.equal(e.diameterMm(products.find(p=>p.id==='casio-a168wa')),null);
assert.equal(e.diameterMm({specs:{diameter:'38 mm non vérifié'}}),null,'Reject malformed measurements');
const all=e.recommend(products,{tier:'all',style:'all',movement:'all',size:'all'},15);
assert.equal(all.length,15);
assert.equal(new Set(ids(all)).size,15);
for(const tier of ['essential','signature','prestige'])
 for(const style of ['sport','classic','minimal','retro','statement'])
  for(const movement of ['quartz','automatic','eco-drive'])
   for(const size of ['all','compact','medium']){
    const r=e.recommend(products,{tier,style,movement,size},3);
    assert.equal(r.length,3);
    assert.equal(new Set(ids(r)).size,3);
    assert.ok(r.every(x=>x.matched>=0&&x.matched<= (size==='all'?3:4)&&x.criteria===(size==='all'?3:4)));
    if(size!=='all')for(const match of r) {
      const measured=e.diameterMm(match.product);
      if(measured===null) {
        assert.ok(match.sizeNote?.includes('non renseigné'),'Unknown case size must never count as a match');
      }
    }
   }
assert.equal(e.choices({tier:'bad',style:'bad',movement:'bad'}).tier,'all');
assert.equal(e.choices({tier:'bad',style:'bad',movement:'bad'}).style,'all');
assert.equal(e.choices({tier:'bad',style:'bad',movement:'bad',size:'bad'}).movement,'all');
assert.equal(e.choices({size:'bad'}).size,'all');
assert.equal(e.choices({size:'compact'}).size,'compact');
assert.deepEqual(Array.from(ids(e.recommend(products,{},3))),Array.from(ids(featured)),'No arbitrary randomness');
const html=read('site/conseiller.html'),ui=read('site/conseiller.js'),css=read('site/conseiller.css');
for(const id of ['advisorForm','advisorResults','advisorStatus','advisorSummary','advisorCriteria','advisorError','advisorReset'])assert.ok(html.includes('id="'+id+'"'),id);
for(const value of ['essential','signature','prestige','sport','classic','minimal','retro','statement','quartz','automatic','eco-drive','compact','medium'])assert.ok(html.includes('value="'+value+'"'),value);
assert.match(html,/href="\.\/montres\/toutes-les-montres\.html"/,'Advisor navigation must open all 52 watches');
assert.match(html,/href="\.\/montres\/modeles-populaires\.html"/,'Advisor navigation must expose popular watches');
assert.doesNotMatch(html,/href="\.\/affiliation\.html(?:#montres)?"/,'Advisor navigation must not lead back to the 15-watch legacy collection');
assert.match(html,/Quatre choix simples/,'Advisor asks four questions, not three');
assert.match(html,/id="advisorHeroArt"/);
assert.match(html,/name="size"/);
assert.match(html,/id="advisorCompare"/,'Shortlist requires a one-tap compare action');
assert.match(ui,/ids\.map\(encodeURIComponent\)\.join\(','\)/,'All recommended IDs must reach the compare deep link');
assert.match(ui,/toutes-les-montres\.html\?compare=/,'Mixed core and supplemental watches must be comparable');
assert.match(html,/52 MONTRES/,'Advisor must describe all 52 references, not only the original 15');
assert.ok(html.includes('04</span> Quelle taille de boîtier'));
assert.ok(!html.includes('Habituellement sous 120 €'),'Unverified shop prices may not be used as purchase guidance');
assert.match(ui,/entry\.sizeNote/);
assert.match(ui,/tier','style','movement','size/);
assert.match(html,/src="\.\/watch-illustrations\.js" defer/);
assert.doesNotMatch(html,/src="\.\/assets\/watches\//);
assert.match(html,/src="\.\/conseiller-engine\.js" defer/);
assert.match(html,/src="\.\/conseiller\.js" defer/);
assert.match(html,/Sans inscription/);
assert.match(ui,/detail\.href=p\.detailUrl/,'Advisor must navigate directly to each verified static watch page');
assert.match(ui,/photoUrl/);
assert.match(ui,/assets\/\(\?:watches\|watches-popular\)/);
assert.match(ui,/discovery-catalogue\.json/,'Advisor must use the same generated feed as the 52-watch storefront');
assert.match(ui,/window\.AtelierWatch\?\.render/);
assert.doesNotMatch(ui,/innerHTML\s*=/);
assert.match(css,/@media\(max-width:560px\)/);
assert.match(read('site/affiliation.html'),/href="\.\/conseiller\.html"/);
assert.match(read('site/montre.html'),/href="\.\/conseiller\.html"/);

// Test against the two REAL, committed source catalogues. The generated
// 52-watch JSON is validated separately after the SEO build; npm test also
// runs before that build in the storefront workflow.
const extra=JSON.parse(read('site/selection-populaires.json')).products;
assert.equal(extra.length,37);
assert.equal(new Set([...products,...extra].map(p=>p.id)).size,52);
const styleMap={sport:'sport',retro:'retro',compact:'minimal',steel:'classic',dress:'classic'};
const supplement=extra.map(p=>({
  id:p.id,kind:'supplemental',tier:p.tier,style:styleMap[p.style],
  movement:/automatique/i.test(p.movement)?'automatic':/solaire/i.test(p.movement)?'eco-drive':'quartz',
  diameterMm:/diam[eè]tre\s*(?:annonc[eé]\s*)?(?:de\s*)?(\d{1,2}(?:[,.]\d{1,2})?)\s*mm/i.test(p.case)
    ?Number(/diam[eè]tre\s*(?:annonc[eé]\s*)?(?:de\s*)?(\d{1,2}(?:[,.]\d{1,2})?)\s*mm/i.exec(p.case)[1].replace(',','.')):null
}));
const combined=[...products,...supplement];
const sport=e.recommend(combined,{tier:'essential',style:'sport'},3);
assert.equal(sport.length,3);
assert.ok(sport.some(x=>x.product.kind==='supplemental'),'SKMEI sport models should compete with the main collection');
const normalisedCompact=e.recommend(combined,{size:'compact'},3);
assert.equal(normalisedCompact.length,3,'Three recommendations must be available across normalized sources');
assert.ok(normalisedCompact.every(entry=>entry.product&&typeof entry.product.id==='string'));
const skmei1874=supplement.find(x=>x.id==='skmei-1874');
assert.equal(e.diameterMm(skmei1874),31,'Verified round diameter for supplemental watch must be recognized');
const withDocumentedRound=e.recommend([skmei1874],{size:'compact'},1);
assert.equal(withDocumentedRound[0].matched,1,'Normalized watch diameter must count as a match');
assert.ok(withDocumentedRound[0].details.some(x=>x.includes('31 mm')),
  'Normalized watch diameter must be displayable without legacy specs');
assert.equal(e.diameterMm(supplement.find(x=>x.id==='skmei-1251')),null,
 'Unknown circular diameter must not be inferred from vendor metadata');
assert.match(read('site/conseiller.js'),/discovery-catalogue\.json/,'Advisor must load common build output');
assert.match(read('scripts/build-unified-discovery.mjs'),/loadApprovedPopularPhotos/,'Common feed must enforce exact-model photo permissions');
console.log('Advisor: 52-model shared source, 15 legacy checks, 135 preference combinations and safe size handling — OK');
