import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';

const sourceRoot=resolve(import.meta.dirname,'..');
const picks=JSON.parse(readFileSync(join(sourceRoot,'site/selection-populaires.json'),'utf8')).products;
const tmp=mkdtempSync(join(tmpdir(),'atelier-awin-fail-closed-'));
const root=join(tmp,'site');
const research=join(tmp,'research');
mkdirSync(root);mkdirSync(research);
const path=join(research,'partner-affiliate-offers.json');
const fixtureToday=new Date().toISOString().slice(0,10);
cpSync(join(sourceRoot,'research/partner-affiliate-offers.json'),path);
const candidatePath=join(research,'aliexpress-skmei-candidates.json');
cpSync(join(sourceRoot,'research/aliexpress-skmei-candidates.json'),candidatePath);
const load=()=>loadApprovedPartnerOffers({root,picks});
const read=()=>JSON.parse(readFileSync(path,'utf8'));
const set=value=>writeFileSync(path,JSON.stringify(value));
const rejects=(v,reason)=>{set(v);assert.throws(load,undefined,reason)};
try{
  assert.equal(load().size,0,'No live Awin promotions without accepted membership and valid publisher link');
  const empty=read();
  const candidatesRaw=readFileSync(candidatePath,'utf8');
  const tampered=JSON.parse(candidatesRaw);
  tampered.products['skmei-2056'].candidates[0].sourceUrl=
    'https://fr.pricearchive.org/aliexpress.com/item/1005000000000';
  writeFileSync(candidatePath,JSON.stringify(tampered));
  assert.throws(load,/citation must identify/,
    'Reject third-party source that does not match AliExpress item ID');
  writeFileSync(candidatePath,candidatesRaw);
  const duplicated=JSON.parse(candidatesRaw);
  duplicated.products['skmei-2514'].candidates[0].itemId=
    duplicated.products['skmei-2056'].candidates[0].itemId;
  duplicated.products['skmei-2514'].candidates[0].sourceUrl=
    duplicated.products['skmei-2056'].candidates[0].sourceUrl;
  writeFileSync(candidatePath,JSON.stringify(duplicated));
  assert.throws(load,/Untraceable AliExpress/,
    'No AliExpress item can be silently assigned to two different watch models');
  writeFileSync(candidatePath,candidatesRaw);
  rejects({...empty,enabled:true},'Reject missing publisher approval');
  rejects({...empty,offers:{'skmei-2056':{}}},'Reject staged offers in disabled registry');
  rejects({...empty,publisherId:9999},'Reject active publisher identity in disabled registry');
  const publisherId=123456;
  const ad=picks.find(p=>p.id==='addiesdive-ad2030');
  const track=(mid,url,extra={})=>{
    const t=new URL('https://www.awin1.com/cread.php');
    t.searchParams.set('awinmid',String(mid));
    t.searchParams.set('awinaffid',String(publisherId));
    t.searchParams.set('ued',url);
    for(const [k,v] of Object.entries(extra))t.searchParams.set(k,v);
    return t.href;
  };
  const approved={version:1,enabled:true,publisherId,publisherApproved:true,
    programs:{'aliexpress-fr':{advertiserId:26009,joined:false},addiesdive:{advertiserId:94513,joined:true}},
    offers:{'addiesdive-ad2030':{program:'addiesdive',destinationUrl:ad.officialUrl,
      trackingUrl:track(94513,ad.officialUrl),
      variant:'AD2030 36 mm, fiche originale, modèle précis à comparer',
      verifiedAt:fixtureToday,issuedInPublisherAccount:true,modelAndVariantConfirmed:true}}};
  set(approved);
  const eligible=load();
  assert.equal(eligible.size,1);
  assert.equal(eligible.get('addiesdive-ad2030').advertiserId,94513);
  assert.equal(eligible.get('addiesdive-ad2030').url,approved.offers['addiesdive-ad2030'].trackingUrl);
  const original=approved.offers['addiesdive-ad2030'];
  rejects({...approved,publisherId:888888},'Reject wrong publisher account');
  rejects({...approved,publisherApproved:false},'Reject publisher not approved');
  rejects({...approved,programs:{...approved.programs,addiesdive:{advertiserId:94513,joined:false}}},
    'Reject advertiser not joined');
  rejects({...approved,offers:{'pagani-pd1701':original}},'Reject brand mismatch for ADDIESDIVE programme');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    trackingUrl:track(26009,ad.officialUrl)}}},'Reject advertiser mismatch');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    trackingUrl:track(94513,'https://www.attacker.invalid/') }}},'Reject redirect substitution');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    trackingUrl:original.trackingUrl+'&awinaffid=123456'}}},'Reject duplicate publisher ID');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    trackingUrl:original.trackingUrl.replace('www.awin1.com','www.awin1.com.evil.example')}}},
    'Reject phishing tracking host');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    issuedInPublisherAccount:false}}},'Reject unissued link');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    verifiedAt:'2037-12-01'}}},'Reject future attestation');
  rejects({...approved,offers:{'addiesdive-ad2030':{...original,
    destinationUrl:'https://www.addiesdivewatches.com/products/unrelated'}}},
    'Reject unknown product destination');

  // Independent AliExpress programme: only individual SKMEI item links, never
  // general searches or unverifiable merchant landing URLs. These are test
  // fixtures; no fictitious URL is added to the public merchant registry.
  const url='https://www.aliexpress.com/item/1005007793914474.html';
  const reviewedVariant='SKMEI 2056 black resin watch test-only exact variant';
  const skmei={...approved,programs:{...approved.programs,
    'aliexpress-fr':{advertiserId:26009,joined:true}},
    offers:{'skmei-2056':{program:'aliexpress-fr',destinationUrl:url,
      trackingUrl:track(26009,url,{clickref:'skmei2056'}),
      variant:reviewedVariant,
      verifiedAt:fixtureToday,issuedInPublisherAccount:true,modelAndVariantConfirmed:true}}};
  // Even a publisher-issued link for a plausible item is NOT enough if the
  // primary merchant, selected variant and delivery to France are unchecked.
  set(skmei);
  assert.throws(load,/Unreviewed AliExpress item/,
    'A third-party source must not be treated as live merchant verification');
  const sourceEvidence=JSON.parse(readFileSync(candidatePath,'utf8'));
  const originalCandidate=sourceEvidence.products['skmei-2056'].candidates[0];
  originalCandidate.status='merchant_reviewed_exact_variant_fr';
  originalCandidate.review={
    checkedOn:fixtureToday,modelConfirmed:'2056',variant:reviewedVariant,
    sellerName:'TEST ONLY simulated seller',franceShippingConfirmed:true,
    franceCheckoutConfirmed:true,awinEligibilityConfirmed:true,
    merchantProductUrl:url,
    evidenceNote:'ISOLATED TEST DATA ONLY: hypothetical review of exact SKU, France checkout, seller and eligible merchant item. No live commercial proof exists.'
  };
  writeFileSync(candidatePath,JSON.stringify(sourceEvidence));
  assert.equal(load().get('skmei-2056').program,'aliexpress-fr',
    'Test-only fully reviewed candidate may pass all independently checked registry gates');
  rejects({...skmei,offers:{'skmei-2056':{...skmei.offers['skmei-2056'],
    variant:'SKMEI 2056 wrong color variant'}}},
    'Wrong variant must never inherit an approved item');
  set(skmei);
  originalCandidate.review.franceShippingConfirmed=false;
  writeFileSync(candidatePath,JSON.stringify(sourceEvidence));
  assert.throws(load,/Missing fresh primary merchant/,
    'France delivery must be confirmed by primary merchant review');
  originalCandidate.review.franceShippingConfirmed=true;
  writeFileSync(candidatePath,JSON.stringify(sourceEvidence));
  assert.equal(load().get('skmei-2056').program,'aliexpress-fr');
  const unknownItem='https://www.aliexpress.com/item/1005000000000.html';
  rejects({...skmei,offers:{'skmei-2056':{...skmei.offers['skmei-2056'],
    destinationUrl:unknownItem,trackingUrl:track(26009,unknownItem)}}},
    'Unreviewed, unregistered AliExpress item must be blocked');
  set(skmei);
  rejects({...skmei,offers:{'skmei-2056':{...skmei.offers['skmei-2056'],
    destinationUrl:'https://www.aliexpress.com/w/wholesale-skmei.html',
    trackingUrl:track(26009,'https://www.aliexpress.com/w/wholesale-skmei.html')}}},
    'Reject generic AliExpress search pages');
  rejects({...skmei,offers:{'skmei-2056':{...skmei.offers['skmei-2056'],
    destinationUrl:'https://www.aliexpress.com/item/1005000000000.html?ref=1',
    trackingUrl:track(26009,'https://www.aliexpress.com/item/1005000000000.html?ref=1')}}},
    'Reject tracking-bearing destination');
  set(empty);
  assert.equal(load().size,0);
  console.log('Awin partner gates OK: two programmes, exact publisher+advertiser, exact destination and disabled-by-default production');
}finally{rmSync(tmp,{recursive:true,force:true})}
