import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const repository=resolve(import.meta.dirname,'..');
const tmp=mkdtempSync(join(tmpdir(),'atelier-affiliate-integration-'));
try {
  const target=join(tmp,'site');
  mkdirSync(target,{recursive:true});
  for(const name of ['selection-affiliation.json','affiliation.html','confidentialite.html','affiliate-links.json']){
    cpSync(join(repository,'site',name),join(target,name));
  }
  const build=()=>execFileSync(process.execPath,[join(repository,'scripts/build-seo.mjs')],{
    cwd:tmp,env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/'},encoding:'utf8',timeout:15000
  });
  build();
  let html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.doesNotMatch(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Disabled mode must not render paid CTA');
  const cfg={version:1,enabled:true,approved:true,amazonPartnerTag:'example-21',links:{
    'citizen-tsuyosa':{provider:'amazon.fr',asin:'B012345678',url:'https://www.amazon.fr/dp/B012345678?tag=example-21',verifiedAt:'2026-10-30',productMatchConfirmed:true,linkApproved:true}
  }};
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  build();
  html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.match(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/);
  assert.match(html,/rel="noopener noreferrer nofollow sponsored"/);
  assert.match(html,/https:\/\/www\.amazon\.fr\/dp\/B012345678\?tag=example-21/);
  assert.match(html,/En tant que Partenaire d’Amazon/);
  const other=readFileSync(join(target,'montres/casio-mtp-1302.html'),'utf8');
  assert.doesNotMatch(other,/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Not all products are automatically monetized');
  const home=readFileSync(join(target,'index.html'),'utf8');
  assert.match(home,/Certains modèles proposent un lien Amazon.fr/);
  assert.equal((home.match(/rel="canonical"/g)||[]).length,1);
  assert.match(readFileSync(join(target,'seo-manifest.json'),'utf8'),/"affiliateCount": 1/);
  assert.match(readFileSync(join(target,'confidentialite.html'),'utf8'),/Certains liens Amazon.fr peuvent être rémunérés/);
  console.log('Affiliate publication functional check OK: inactive, verified single-product activation, disclosures and non-affiliated fallback');
} finally {
  rmSync(tmp,{recursive:true,force:true});
}
