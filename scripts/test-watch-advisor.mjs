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
assert.deepEqual(Array.from(ids(compact.slice(0,3))),['casio-mtp-b145','casio-ltp1302','hamilton-khaki']);
assert.ok(compact.slice(0,3).every(x=>x.matched===1&&x.criteria===1&&x.sizeNote===''));
const medium=e.recommend(products,{size:'medium'},15);
assert.equal(medium.filter(x=>x.matched===1).length,6,'Exactly six catalogued models have 38.1–40 mm diameters');
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
assert.match(html,/id="advisorHeroArt"/);
assert.match(html,/name="size"/);
assert.ok(html.includes('04</span> Quelle taille de boîtier'));
assert.ok(!html.includes('Habituellement sous 120 €'),'Unverified shop prices may not be used as purchase guidance');
assert.match(ui,/entry\.sizeNote/);
assert.match(ui,/tier','style','movement','size/);
assert.match(html,/src="\.\/watch-illustrations\.js" defer/);
assert.doesNotMatch(html,/src="\.\/assets\/watches\//);
assert.match(html,/src="\.\/conseiller-engine\.js" defer/);
assert.match(html,/src="\.\/conseiller\.js" defer/);
assert.match(html,/Sans inscription/);
assert.match(ui,/encodeURIComponent\(p\.id\)/);
assert.match(ui,/photoReview/);
assert.match(ui,/localUrl/);
assert.match(ui,/publicUsageApproved===true/);
assert.match(ui,/window\.AtelierWatch\?\.render/);
assert.doesNotMatch(ui,/innerHTML\s*=/);
assert.match(css,/@media\(max-width:560px\)/);
assert.match(read('site/affiliation.html'),/href="\.\/conseiller\.html"/);
assert.match(read('site/montre.html'),/href="\.\/conseiller\.html"/);
console.log('Advisor: 15 watches, 135 preference combinations, documented sizing and missing-data warnings — OK');
