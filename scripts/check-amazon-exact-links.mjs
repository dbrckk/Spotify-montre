import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const catalog=load('site/selection-affiliation.json');
const research=load('research/amazon-fr-exact-products.json');
assert.equal(research.version,1);
assert.equal(research.marketplace,'amazon.fr');
assert.equal(research.status,'source_research_not_account_approval','Research alone never certifies the enrolled Amazon account');
assert.match(research.amazonPartnerTag,/^[a-z0-9][a-z0-9-]{1,48}-21$/i);
const all=Object.entries(research.products);
assert.equal(all.length,catalog.products.length,'Aucun modèle ne doit être omis');
assert.deepEqual(new Set(all.map(([id])=>id)),new Set(catalog.products.map(p=>p.id)),'Références identiques au catalogue');
const seen=new Set();
let exact=0,unmatched=0;
for(const [id,item] of all){
  const p=catalog.products.find(q=>q.id===id);
  assert.ok(p,id);
  assert.equal(item.commercialActivationApproved,false,'Ne jamais déclarer un accord commercial non vérifié');
  if(item.status==='not_confirmed_on_amazon_fr'){
    assert.equal(item.asin,null);
    assert.equal(item.productUrl,null);
    assert.equal(item.affiliateUrl,null);
    assert.ok(item.reason?.length>20);
    unmatched++;
    continue;
  }
  assert.equal(item.status,'matched_on_amazon_fr',id);
  assert.equal(item.provider,'amazon.fr');
  assert.match(item.asin,/^[A-Z0-9]{10}$/);
  assert.ok(!seen.has(item.asin),'ASIN dupliqué : '+item.asin);
  seen.add(item.asin);
  assert.equal(item.productUrl,'https://www.amazon.fr/dp/'+item.asin);
  assert.equal(item.evidenceUrl,item.productUrl);
  assert.equal(item.affiliateUrl,item.productUrl+'?tag='+research.amazonPartnerTag);
  const url=new URL(item.affiliateUrl);
  assert.equal(url.hostname,'www.amazon.fr');
  assert.equal(url.protocol,'https:');
  assert.equal(url.searchParams.getAll('tag').length,1);
  assert.deepEqual([...url.searchParams.keys()],['tag']);
  assert.equal(item.checkedOn,research.checkedOn);
  assert.ok(['exact','match_regional_suffix'].includes(item.modelRelation),id);
  const modelCode=p.model.match(/\b(?=[A-Z0-9-]*\d)[A-Z0-9]{2,}(?:-[A-Z0-9]+)*\b/g)?.filter(code=>code.length>=6)||[];
  assert.ok(modelCode.some(code=>item.amazonModel.toUpperCase().startsWith(code)),'Référence Amazon différente du catalogue : '+id);
  exact++;
}
assert.equal(exact,13,'13 liens exacts trouvés');
assert.equal(unmatched,2,'2 modèles sans lien exact');
const active=load('site/affiliate-links.json');
assert.equal(active.approved,false,"Amazon's final review must not be misrepresented as approved");
assert.equal(active.enabled,true,'The owner confirmed tracking ID and registered domain');
assert.equal(active.enrollmentStatus,'enrolled_approval_unverified');
assert.equal(active.amazonPartnerTag,research.amazonPartnerTag,'Only the user-confirmed Tracking ID may be published');
assert.equal(active.ownerConfirmedTrackingId,true);
assert.equal(active.ownerConfirmedSiteListed,true);
assert.equal(active.specialLinksCreatedOnSite,true);
assert.equal(Object.keys(active.links).length,exact,'Enable only exact matches, never substitutes');
for(const [id,item] of all){
 const link=active.links[id];
 if(item.status!=='matched_on_amazon_fr'){assert.equal(link,undefined,'No fabricated ASIN for '+id);continue}
 assert.ok(link,'Missing approved site-created special link for '+id);
 assert.equal(link.asin,item.asin);
 assert.equal(link.url,item.affiliateUrl);
 assert.equal(link.provider,'amazon.fr');
 assert.equal(link.linkApproved,true,'Site-owner approved for publication, not Amazon final account approval');
}
if(process.argv.includes('--markdown')){
 console.log('# Montres Amazon.fr vérifiées le '+research.checkedOn+'\n');
 console.log('Tag confirmé par le propriétaire : `'+research.amazonPartnerTag+'`. 13 liens créés par le site pour commencer la période de ventes éligibles, sans preuve d’approbation finale ni de revenus.\n');
 console.log('| Modèle | Amazon.fr (avec tag) | Statut |\n|---|---|---|');
 for(const p of catalog.products){
  const x=research.products[p.id];
  console.log('| '+p.brand+' '+p.model+' | '+(x.affiliateUrl?'[ASIN '+x.asin+']('+x.affiliateUrl+')':'Aucun lien exact')+' | '+(x.status==='matched_on_amazon_fr'?(x.availabilityAtCheck==='unavailable_at_check'?'Page trouvée, indisponible au contrôle':'Fiche exacte trouvée'):'À rechercher')+' |');
 }
 console.log('\n'+exact+'/15 liens partenaires balisés et activés, '+unmatched+'/15 non confirmés. Revenus et approbation Amazon à vérifier dans le tableau de bord.');
}else console.log('Amazon.fr: '+exact+'/15 liens partenaires balisés activés, '+unmatched+' absents ; approbation finale Amazon et ventes non vérifiées.');
