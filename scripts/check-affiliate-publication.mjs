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
  mkdirSync(join(tmp,'research'),{recursive:true});
  cpSync(join(repository,'research','amazon-fr-exact-products.json'),join(tmp,'research','amazon-fr-exact-products.json'));
  const build=(extraEnv={})=>execFileSync(process.execPath,[join(repository,'scripts/build-seo.mjs')],{
    cwd:tmp,env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/',UMAMI_WEBSITE_ID:'',...extraEnv},encoding:'utf8',timeout:15000
  });
  build({GOOGLE_SITE_VERIFICATION:'Valid_Example_Token_123456'});
  assert.match(readFileSync(join(target,'index.html'),'utf8'),/<meta name="google-site-verification" content="Valid_Example_Token_123456">/);
  let tokenBlocked=false;
  try { build({GOOGLE_SITE_VERIFICATION:'\"><script>alert(1)</script>'}); } catch { tokenBlocked=true; }
  assert.equal(tokenBlocked,true,'HTML-injection attempts in verification metadata must fail');
  build({GOOGLE_SITE_VERIFICATION:''});
  assert.doesNotMatch(readFileSync(join(target,'index.html'),'utf8'),/name="google-site-verification"/);
  // Exercise the real published output rather than mocking the tracker.
  const umamiId='94db1cb1-74f4-4a40-ad6c-962362670409';
  build({UMAMI_WEBSITE_ID:umamiId});
  const privacyText=()=>readFileSync(join(target,'confidentialite.html'),'utf8');
  let trackedHome=readFileSync(join(target,'index.html'),'utf8');
  let trackedProduct=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.ok(trackedHome.includes('cloud.umami.is/script.js'));
  assert.ok(trackedHome.includes('data-website-id="'+umamiId+'"'));
  assert.ok(trackedHome.includes('src="./analytics.js"'));
  assert.ok(trackedProduct.includes('src="../analytics.js"'));
  assert.ok(trackedProduct.includes('data-amazon-product="citizen-tsuyosa"'));
  assert.match(privacyText(),/Les visites et clics vers Amazon sont mesurés avec Umami Cloud/);
  build({UMAMI_WEBSITE_ID:umamiId}); // repeat deploy must be idempotent
  build({UMAMI_WEBSITE_ID:''}); // turning metrics off restores the privacy notice
  assert.ok(!readFileSync(join(target,'index.html'),'utf8').includes('cloud.umami.is'));
  assert.doesNotMatch(privacyText(),/Les visites et clics vers Amazon sont mesurés avec Umami Cloud/);
  let invalidAnalyticsIdBlocked=false;
  try {build({UMAMI_WEBSITE_ID:'"><img src=x onerror=alert(1)>'})}catch{invalidAnalyticsIdBlocked=true}
  assert.equal(invalidAnalyticsIdBlocked,true,'Invalid analytics identifiers must not inject arbitrary HTML');
  let html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.doesNotMatch(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Disabled mode must not render paid CTA');
  const cfg={version:1,enabled:true,approved:true,amazonPartnerTag:'example-21',links:{
    'citizen-tsuyosa':{provider:'amazon.fr',asin:'B012345678',url:'https://www.amazon.fr/dp/B012345678?tag=example-21',verifiedAt:'2026-10-30',productMatchConfirmed:true,linkApproved:true}
  }};
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  let blocked=false;
  try { build(); } catch { blocked=true; }
  assert.equal(blocked,true,'Commercial activation must refuse unlicensed watch photos');
  const feedPath=join(target,'selection-affiliation.json');
  const feed=JSON.parse(readFileSync(feedPath,'utf8'));
  feed.products.find(p=>p.id==='citizen-tsuyosa').photoReview.publicUsageApproved=true;
  writeFileSync(feedPath,JSON.stringify(feed));
  build();
  html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.match(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/);
  assert.match(html,/rel="noopener noreferrer nofollow sponsored"/);
  assert.match(html,/https:\/\/www\.amazon\.fr\/dp\/B012345678\?tag=example-21/);
  assert.match(html,/En tant que Partenaire Amazon/);
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
