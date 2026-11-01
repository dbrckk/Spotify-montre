import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync,mkdtempSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const repository=resolve(import.meta.dirname,'..');
const tmp=mkdtempSync(join(tmpdir(),'atelier-affiliate-integration-'));
try {
  const target=join(tmp,'site');
  mkdirSync(target,{recursive:true});
  for(const name of ['selection-affiliation.json','selection-populaires.json','popular-photo-rights.json','popular-ai-visuals.json','affiliation.html','confidentialite.html','affiliate-links.json','comparaisons-montres.json','editorial-insights.json']){
    cpSync(join(repository,'site',name),join(target,name));
  }
  // Keep source image files in the temporary integration build so the
  // generated hero srcset does not vary between repeated publications.
  for(const folder of ['watches','watch-responsive']){
    const source=join(repository,'site','assets',folder);
    if(existsSync(source)){
      mkdirSync(join(target,'assets'),{recursive:true});
      cpSync(source,join(target,'assets',folder),{recursive:true});
    }
  }
  const sourcePhotoDir=join(repository,'site','assets','watches-popular');
  if(existsSync(sourcePhotoDir)){
    const destPhotoDir=join(target,'assets','watches-popular');
    mkdirSync(join(target,'assets'),{recursive:true});
    cpSync(sourcePhotoDir,destPhotoDir,{recursive:true});
  }
  // Test a disabled fixture before reviewing the real owner-tagged 13-link site.
  const enabledSourceConfig=JSON.parse(readFileSync(join(repository,'site','affiliate-links.json'),'utf8'));
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify({version:1,enabled:false,approved:false,amazonPartnerTag:null,links:{}}));
  mkdirSync(join(tmp,'research'),{recursive:true});
  cpSync(join(repository,'research','amazon-fr-exact-products.json'),join(tmp,'research','amazon-fr-exact-products.json'));
  cpSync(join(repository,'research','amazon-fr-popular-verified.json'),join(tmp,'research','amazon-fr-popular-verified.json'));
  cpSync(join(repository,'research','partner-affiliate-offers.json'),join(tmp,'research','partner-affiliate-offers.json'));
  cpSync(join(repository,'research','aliexpress-skmei-candidates.json'),join(tmp,'research','aliexpress-skmei-candidates.json'));
  const verifiedPopularPath=join(tmp,'research','amazon-fr-popular-verified.json');
  const build=(extraEnv={})=>execFileSync(process.execPath,[join(repository,'scripts/build-seo.mjs')],{
    cwd:tmp,env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/',UMAMI_WEBSITE_ID:'',...extraEnv},encoding:'utf8',timeout:15000
  });
  // Rights clearance cannot be invented by setting a boolean or by
  // smuggling a downloaded product photo into the public directory.
  const rightsPath=join(target,'popular-photo-rights.json');
  const rightsOriginal=readFileSync(rightsPath,'utf8');
  writeFileSync(rightsPath,JSON.stringify({version:1,policy:'commercial_rights_holder_license_required',
    photos:{'skmei-2056':{rightsBasis:'unverified_vendor_photo',file:'assets/watches-popular/skmei-2056.webp'}}}));
  let unlicensedBlocked=false;
  try{build()}catch{unlicensedBlocked=true}
  assert.equal(unlicensedBlocked,true,'Unlicensed retailer photo must never be published');
  writeFileSync(rightsPath,rightsOriginal);

  const verifiedPopularOriginal=readFileSync(verifiedPopularPath,'utf8');
  build({GOOGLE_SITE_VERIFICATION:'Valid_Example_Token_123456'});
  const disabledShortlist=readFileSync(join(target,'montres/modeles-populaires.html'),'utf8');
  const disabledFocus=(disabledShortlist.split('<section id="selection-10-montres"')[1]||'').split('</section>')[0];
  assert.equal((disabledShortlist.match(/data-partner-offer-id=/g)||[]).length,0,
    'No Awin paid link may leak into the production-disabled affiliate fixture');
  assert.equal((disabledFocus.match(/data-amazon-product=/g)||[]).length,0,
    'No Amazon paid CTA may survive on the priority collection when affiliation is disabled');
  assert.equal((disabledFocus.match(/data-merchant-official-id=/g)||[]).length,10,
    'Affiliate-disabled priority list must keep only real seller-documentation links');
  const disabledWatch=readFileSync(join(target,'montres','casio-gw-m5610u-1.html'),'utf8');
  assert.ok(!disabledWatch.includes('data-amazon-product="casio-gw-m5610u-1"'),
    'Affiliate-disabled mode must not display the G-SHOCK direct product CTA');
  // Fail-closed: even an otherwise authorized Amazon tag cannot publish a
  // tampered registry entry or a different ASIN for this watch model.
  const forgedPopular=JSON.parse(verifiedPopularOriginal);
  forgedPopular.verifiedProducts['casio-gw-m5610u-1'].asin='B0FAKE1234';
  writeFileSync(verifiedPopularPath,JSON.stringify(forgedPopular));
  let incorrectAsinRejected=false;
  try{build()}catch{incorrectAsinRejected=true}
  assert.equal(incorrectAsinRejected,true,'Evidence URL/ASIN mismatch must refuse a forged direct-link entry');
  writeFileSync(verifiedPopularPath,verifiedPopularOriginal);
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
  assert.match(privacyText(),/Les visites et clics sortants vers Amazon\.fr et les fiches des marques ou vendeurs documentés sont mesurés avec Umami Cloud/);
  const trackedSupplement=readFileSync(join(target,'montres/skmei-2056.html'),'utf8');
  assert.ok(trackedSupplement.includes('data-merchant-official-id="skmei-2056" data-merchant-placement="popular"'),
    'The SKMEI product must be measurable as vendor intent only with opted-in analytics');
  assert.ok(trackedHome.includes('data-merchant-official-id="skmei-2056"'),
    'The home storefront must distinguish non-commissioned SKMEI vendor exits');
  assert.ok(!trackedSupplement.includes('href="https://www.amazon.fr/dp/B0C7W5NNX2?'),
    'Unavailable exact Amazon.fr listing must never replace current SKMEI search');
  build({UMAMI_WEBSITE_ID:umamiId}); // repeat deploy must be idempotent
  build({UMAMI_WEBSITE_ID:''}); // turning metrics off restores the privacy notice
  assert.ok(!readFileSync(join(target,'index.html'),'utf8').includes('cloud.umami.is'));
  assert.doesNotMatch(privacyText(),/Les visites et clics sortants vers Amazon\.fr et les fiches des marques ou vendeurs documentés sont mesurés avec Umami Cloud/);
  let invalidAnalyticsIdBlocked=false;
  try {build({UMAMI_WEBSITE_ID:'"><img src=x onerror=alert(1)>'})}catch{invalidAnalyticsIdBlocked=true}
  assert.equal(invalidAnalyticsIdBlocked,true,'Invalid analytics identifiers must not inject arbitrary HTML');
  let html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.doesNotMatch(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Disabled mode must not render paid CTA');
  const cfg={version:1,enabled:true,approved:true,amazonPartnerTag:'example-21',links:{
    'citizen-tsuyosa':{provider:'amazon.fr',asin:'B012345678',url:'https://www.amazon.fr/dp/B012345678?tag=example-21',verifiedAt:'2026-10-30',productMatchConfirmed:true,linkApproved:true}
  }};
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  const feedPath=join(target,'selection-affiliation.json');
  const feed=JSON.parse(readFileSync(feedPath,'utf8'));
  // A local negative scenario must still reject an image whose publication
  // approval is revoked, even when the standard catalogue is owner-approved.
  feed.products.find(p=>p.id==='citizen-tsuyosa').photoReview.publicUsageApproved=false;
  writeFileSync(feedPath,JSON.stringify(feed));
  let blocked=false;
  try { build(); } catch { blocked=true; }
  assert.equal(blocked,true,'Commercial activation must refuse an unapproved photograph');
  feed.products.find(p=>p.id==='citizen-tsuyosa').photoReview.publicUsageApproved=true;
  writeFileSync(feedPath,JSON.stringify(feed));
  let wrongAsinBlocked=false;
  try {build()}catch{wrongAsinBlocked=true}
  assert.equal(wrongAsinBlocked,true,'Even with photo rights, a paid link for the wrong model must fail');
  cfg.links['citizen-tsuyosa'].asin='B0BG7VD5YL';
  cfg.links['citizen-tsuyosa'].url='https://www.amazon.fr/dp/B0BG7VD5YL?tag=example-21';
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  build();
  const directExample=readFileSync(join(target,'montres/casio-gw-m5610u-1.html'),'utf8');
  assert.ok(directExample.includes('https://www.amazon.fr/dp/B09BCPP68Q?tag=example-21'),
    'The verified Amazon.fr ASIN should inherit the active account tag without hardcoding');
  assert.match(directExample,/data-amazon-product="casio-gw-m5610u-1"/,
    'Direct supplementary referral must be distinguished from a search event');
  html=readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8');
  assert.match(html,/Voir ce modèle sur Amazon.fr · lien rémunéré/);
  assert.match(html,/rel="noopener noreferrer nofollow sponsored"/);
  assert.match(html,/https:\/\/www\.amazon\.fr\/dp\/B0BG7VD5YL\?tag=example-21/);
  assert.match(html,/En tant que Partenaire Amazon/);
  const duel=readFileSync(join(target,'montres/comparer-citizen-tsuyosa-vs-tissot-prx-automatique.html'),'utf8');
  assert.match(duel,/https:\/\/www\.amazon\.fr\/dp\/B0BG7VD5YL\?tag=example-21/);
  assert.match(duel,/rel="noopener noreferrer nofollow sponsored"/);
  assert.match(duel,/En tant que Partenaire Amazon/);
  const other=readFileSync(join(target,'montres/casio-mtp-1302.html'),'utf8');
  assert.doesNotMatch(other,/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Not all products are automatically monetized');
  const home=readFileSync(join(target,'index.html'),'utf8');
  assert.match(home,/Certains modèles proposent un lien Amazon.fr/);
  assert.equal((home.match(/rel="canonical"/g)||[]).length,1);
  assert.match(readFileSync(join(target,'seo-manifest.json'),'utf8'),/"affiliateCount": 1/);
  assert.match(readFileSync(join(target,'confidentialite.html'),'utf8'),/Certains liens Amazon.fr peuvent être rémunérés/);
  // Initial eligible sales must be possible while Amazon's final review is pending.
  cfg.approved=false;
  cfg.enrollmentStatus='registered_pending_review';
  cfg.ownerConfirmedEnrollment=true;
  cfg.specialLinksCreatedInAccount=true;
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  build();
  assert.match(readFileSync(join(target,'montres/citizen-tsuyosa.html'),'utf8'),/Voir ce modèle sur Amazon.fr · lien rémunéré/,'Provisional special link must be functional');
  assert.match(readFileSync(join(target,'seo-manifest.json'),'utf8'),/"affiliateCount": 1/,'Pending applicant must have a real linked product');
  cfg.specialLinksCreatedInAccount=false;
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(cfg));
  let noEnrollmentBlocked=false;
  try{build()}catch{noEnrollmentBlocked=true}
  assert.equal(noEnrollmentBlocked,true,'Unconfirmed pending participation must be blocked');
  // Final real publication, not a synthetic mock.
  writeFileSync(join(target,'affiliate-links.json'),JSON.stringify(enabledSourceConfig));
  build();
  const manifest=JSON.parse(readFileSync(join(target,'seo-manifest.json'),'utf8'));
  assert.equal(manifest.affiliateActive,true);
  assert.equal(manifest.affiliateCount,13,'Publish the 13 owner-tagged core product matches');
  assert.equal(manifest.popularAffiliateDirectLinks,7,'Seven documented direct links in supplementary selection');
  assert.equal(manifest.popularAffiliateSearchLinks,30,'Remaining thirty supplemental watches must stay labeled searches');
  assert.equal(manifest.popularPartnerAffiliateLinks,0,'No unapproved Awin partner URL is published');
  const directProduction=readFileSync(join(target,'montres/casio-gw-m5610u-1.html'),'utf8');
  assert.ok(directProduction.includes('href="https://www.amazon.fr/dp/B09BCPP68Q?tag=drackk04-21"'),
    'Publish only the independently source-confirmed G-SHOCK Amazon.fr direct match');
  assert.ok(!directProduction.includes('data-amazon-search-id="casio-gw-m5610u-1"'),
    'An exact product match must not be mislabeled as an unverified search');
  for(const [id,asin] of [['casio-a158wea-1','B000GAYQJ0'],['casio-ga-2100-1a1','B07WGJ1JNW']]){
    const detail=readFileSync(join(target,'montres/'+id+'.html'),'utf8');
    assert.ok(detail.includes('href="https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21"'),
      'New Amazon.fr exact-model referral requires its proof-backed ASIN '+id);
    assert.ok(detail.includes('data-amazon-product="'+id+'"')&&!detail.includes('data-amazon-search-id="'+id+'"'),
      'Never advertise a verified direct ASIN as an Amazon search '+id);
  }
  for(const [id,asin,fragment] of [['addiesdive-ad2030','B0DNK5TT6D','SH-DE-AD2030-Steel-blue'],['pagani-pd1701','B0C7QC653D','PGN-1701']]){
    const html=readFileSync(join(target,'montres/'+id+'.html'),'utf8');
    assert.ok(html.includes('href="https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21"'),
      'Direct affiliate exit must match documented ASIN for '+id);
    assert.ok(html.includes('data-amazon-product="'+id+'"')&&!html.includes('data-amazon-search-id="'+id+'"'),
      'Exact destination must never be mislabeled search '+id);
    assert.ok(html.includes('Variante de la fiche Amazon :')&&html.includes(fragment),
      'Exact matched listing must disclose variant limitations: '+id);
  }
  const realResearch=JSON.parse(readFileSync(join(repository,'research','amazon-fr-exact-products.json'),'utf8'));
  const publicHome=readFileSync(join(target,'index.html'),'utf8');
  assert.match(publicHome,/En tant que Partenaire Amazon/,'The homepage must disclose paid links');
  assert.doesNotMatch(publicHome,/Liens actuellement non affiliés|aucun identifiant Partenaires Amazon/);
  for(const [id,item] of Object.entries(realResearch.products)) {
    const published=readFileSync(join(target,'montres',id+'.html'),'utf8');
    if(item.status==='matched_on_amazon_fr') {
      assert.ok(published.includes('href="'+item.affiliateUrl+'"'),'Exact tag/ASIN: '+id);
      assert.match(published,/nofollow sponsored/,'Paid destination must be marked: '+id);
      assert.match(published,/lien rémunéré/,'Paid destination must be disclosed: '+id);
    }else {
      assert.ok(!published.includes('?tag='),'No fabricated Amazon match: '+id);
    }
  }
  const comparison=readFileSync(join(target,'montres/comparer-casio-mtp-b145-vs-mtp-1302.html'),'utf8');
  assert.match(comparison,/tag=drackk04-21/,'Curated comparisons must carry the confirmed tag');
  build();
  assert.equal(JSON.parse(readFileSync(join(target,'seo-manifest.json'),'utf8')).affiliateCount,13,'Idempotent second build');

  // Isolated integration fixture: a publisher and SKMEI item that are NOT
  // represented as real approved production links. Test the complete
  // build/product/shortlist route only after all fail-closed production checks.
  const partnerResearchPath=join(tmp,'research','partner-affiliate-offers.json');
  const fixtureReviewDate=new Date().toISOString().slice(0,10);
  const fakeDestination='https://www.aliexpress.com/item/1005007793914474.html';
  const fakeVariant='SKMEI 2056 example testing-only exact black variant';
  const isolatedResearchPath=join(tmp,'research','aliexpress-skmei-candidates.json');
  const isolatedResearch=JSON.parse(readFileSync(isolatedResearchPath,'utf8'));
  const fixtureCandidate=isolatedResearch.products['skmei-2056'].candidates[0];
  fixtureCandidate.status='merchant_reviewed_exact_variant_fr';
  fixtureCandidate.review={checkedOn:fixtureReviewDate,modelConfirmed:'2056',
    variant:fakeVariant,sellerName:'TEST-ONLY simulated merchant',
    franceShippingConfirmed:true,franceCheckoutConfirmed:true,
    awinEligibilityConfirmed:true,merchantProductUrl:fakeDestination,
    evidenceNote:'ISOLATED AUTOMATED TEST ONLY: hypothetical verification of a specific selected product and French shipping; not an actual buyer offer.'};
  writeFileSync(isolatedResearchPath,JSON.stringify(isolatedResearch));
  const fakeLink=new URL('https://www.awin1.com/cread.php');
  fakeLink.searchParams.set('awinmid','26009');
  fakeLink.searchParams.set('awinaffid','314159');
  fakeLink.searchParams.set('ued',fakeDestination);
  writeFileSync(partnerResearchPath,JSON.stringify({
    version:1,enabled:true,publisherId:314159,publisherApproved:true,
    programs:{'aliexpress-fr':{advertiserId:26009,joined:true},
      addiesdive:{advertiserId:94513,joined:false}},
    offers:{'skmei-2056':{program:'aliexpress-fr',destinationUrl:fakeDestination,
      trackingUrl:fakeLink.href,variant:fakeVariant,
      verifiedAt:fixtureReviewDate,issuedInPublisherAccount:true,modelAndVariantConfirmed:true}}
  }));
  build();
  const partnerHtml=readFileSync(join(target,'montres/skmei-2056.html'),'utf8');
  const priorityHtml=readFileSync(join(target,'montres/modeles-populaires.html'),'utf8');
  assert.ok(partnerHtml.includes('href="'+fakeLink.href.replace(/&/g,'&amp;')+'"'),
    'An approved-in-test, exact-item Awin LinkBuilder URL must be displayed on the watch details');
  assert.equal((partnerHtml.match(/data-partner-offer-id="skmei-2056"/g)||[]).length,1,
    'Exactly one Awin exit on a model detail');
  assert.equal((priorityHtml.match(/data-partner-offer-id="skmei-2056"/g)||[]).length,2,
    'The catalogue and the priority shortlist must both expose the same verified item');
  assert.equal(JSON.parse(readFileSync(join(target,'seo-manifest.json'),'utf8')).popularPartnerAffiliateLinks,1,
    'Manifest must count approved Awin models, not the number of duplicated CTA placements');

  console.log('Affiliate publication functional check OK: Amazon intact, Awin disabled in production, isolated approved deep-link test and idempotent build');
} finally {
  rmSync(tmp,{recursive:true,force:true});
}
