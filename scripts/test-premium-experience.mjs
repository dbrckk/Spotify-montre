import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
const dir=resolve(import.meta.dirname,'..','site');
const read=(name)=>readFileSync(resolve(dir,name),'utf8');
const data=JSON.parse(read('selection-affiliation.json'));
const aff=read('affiliation.html'),js=read('affiliation.js'),css=read('horlogerie.css'),detail=read('montre.html'),detailJS=read('fiche.js');
const vectorJS=read('watch-illustrations.js');
assert.equal(data.products.length,15);
assert.equal(data.affiliateEnabled,false);
assert.match(aff,/id="heroWatch"/);
assert.match(aff,/id="affCompareDialog"/);
assert.match(aff,/id="affSort"/);
assert.match(aff,/id="affCompareTray"/);
assert.match(aff,/href="\.\/horlogerie\.css"/);
assert.match(aff,/src="\.\/watch-illustrations\.js" defer/);
assert.match(aff,/Les achats se font chez le marchand partenaire ou fabricant/);
assert.match(js,/affCompareDialog/);
assert.match(js,/window\.AtelierWatch\.render/);
assert.match(js,/\.textContent=/);
assert.doesNotMatch(js,/innerHTML\s*=/);
assert.match(css,/@media\(max-width:680px\)/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(aff,/id="chatLauncher"/);
assert.match(aff,/id="chatPanel"/);
assert.match(aff,/id="newsletterCta"/);
assert.match(aff,/id="faq"/);
assert.match(aff,/src="\.\/app\.js" defer/);
assert.match(aff,/src="\.\/embleme\.svg"/);
assert.match(detail,/id="detailArtwork"/);
assert.match(detail,/id="detailSpecList"/);
assert.match(detail,/id="detailAmazon"/);
assert.match(detail,/id="detailEbay"/);
assert.match(detail,/id="detailPhotoLabel"/);
assert.match(detail,/PHOTOGRAPHIE DU MODÈLE/);
assert.match(detailJS,/encodeURIComponent/);
assert.match(detailJS,/new URLSearchParams\(location\.search\)/);
assert.doesNotMatch(detailJS,/innerHTML\s*=/);
assert.match(read('marque.html'),/href="\.\/marque-refine\.css"/);
assert.match(read('marque.html'),/id="chatPanel"/);
assert.match(read('marque.html'),/id="newsletterCta"/);
assert.match(read('marque.html'),/src="\.\/embleme\.svg"/);
assert.match(read('marque-refine.css'),/\.am-brand-emblem/);
assert.match(read('embleme.svg'),/<svg/);
const nodes=[];
class Node {
 constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.textContent='';}
 setAttribute(k,v){this.attrs[k]=v}
 appendChild(c){this.children.push(c)}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
}
const doc={createElementNS(ns,tag){assert.equal(ns,'http://www.w3.org/2000/svg');return new Node(tag)}};
const root={document:doc,window:{}};
runInNewContext(vectorJS,root,{timeout:3000});
assert.equal(typeof root.window.AtelierWatch.render,'function');
for (const p of data.products){
 const mount=new Node('mount');
 const svg=root.window.AtelierWatch.render(mount,p);
 assert.equal(svg.tag,'svg');
 assert.match(svg.attrs['aria-label'],/Interprétation vectorielle/);
 assert.equal(svg.attrs.viewBox,'0 0 340 380');
 assert.ok(mount.children.length===1);
 assert.ok(svg.children.length>=2);
 nodes.push({id:p.id,desc:svg.attrs['aria-label']});
}
assert.equal(new Set(nodes.map(x=>x.id)).size,15);
const casio=data.products.find(p=>p.id==='casio-a168wa');
const surface=new Node('container');
root.window.AtelierWatch.render(surface,casio);
function visit(n,arr=[]){arr.push(n);for(const x of n.children||[])visit(x,arr);return arr;}
assert.ok(visit(surface).some(n=>n.tag==='text'&&n.textContent==='10:28'),'Digital model should have distinct display');
const field=data.products.find(p=>p.id==='hamilton-khaki');
const fieldMount=new Node('container');root.window.AtelierWatch.render(fieldMount,field);
assert.ok(visit(fieldMount).some(n=>n.tag==='text'&&n.textContent==='12'),'Field watch should display numeric markers');
console.log('15 differentiated vector watches, editorial detail page, comparison and accessible watch store checks — OK');