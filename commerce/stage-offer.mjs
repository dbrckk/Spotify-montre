#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {preflightCjDelivery} from './cj.mjs';
import {createDatabase,initializeDatabase} from './db.mjs';
import {validateOfferCandidate,qualifyObservedCjQuote,stageQualifiedOffer} from './offer-intake.mjs';

// Deliberately no HTTP admin endpoint: credentials and commercial staging stay
// on the operator's machine or isolated CI environment, never in site/.
async function main(){
  const [mode,filename,...other]=process.argv.slice(2);
  if(other.length||!['inspect','stage'].includes(mode)||!filename)
    throw Error('Usage: node commerce/stage-offer.mjs inspect|stage /private/real-cj-candidate.json');
  const token=process.env.CJ_ACCESS_TOKEN;
  if(typeof token!=='string'||token.length<20)
    throw Error('A live CJ_ACCESS_TOKEN is required to inspect a real supplier quote');
  const candidate=validateOfferCandidate(JSON.parse(readFileSync(filename,'utf8')));
  if(mode==='inspect'){
    const quote=await preflightCjDelivery({
      vid:candidate.supplierVid,
      expectedPid:candidate.supplierPid,
      expectedVariantSku:candidate.supplierVariantSku,
      expectedProductSku:candidate.supplierProductSku,
      originCountry:candidate.originCountry,
      postalCode:candidate.samplePostalCode,
      logisticsName:candidate.logisticsName,
      maxSupplierUsdCents:candidate.supplierMaxUsdCents,
      maxSupplierEurCents:candidate.supplierLandedEurCeilingCents,
      fxMaxEurPerUsdBps:candidate.fxMaxEurPerUsdBps,
      accessToken:token
    });
    const plan=qualifyObservedCjQuote(candidate,quote);
    console.log(JSON.stringify({
      id:candidate.id,state:plan.state,observed:plan.observed,
      financial:plan.financial,
      checkoutEnabled:false,
      note:'Single French postcode quote; documents, delivery range, tax, images, conformity and seller registration remain UNVERIFIED.'
    },null,2));
    return;
  }
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required for staging');
  const pool=createDatabase(process.env.DATABASE_URL);
  try{
    await initializeDatabase(pool);
    const staged=await stageQualifiedOffer(pool,candidate,{accessToken:token});
    console.log(JSON.stringify({...staged,checkoutEnabled:false,
      note:'Draft only: no approval, no live sale, no CJ purchase, no Mollie payment.'},null,2));
  }finally{await pool.end();}
}
main().catch(error=>{
  // Never print the candidate (may contain proprietary supplier details), credentials,
  // customer addresses or HTTP responses on failure.
  const known=/^(Usage:|A live CJ_ACCESS_TOKEN|DATABASE_URL|Candidate |Exactly |id |label |supplier|logistics|origin|sample|amount|unit|reserves|vat|fx|delivery|Delivery|Metropolitan|All-in|Supplier|A real|CJ |Unit |Insufficient|Offer id |Missing observed|Only unapproved)/;
  console.error(known.test(error.message||'')?error.message:'Supplier intake unavailable: inspect securely before retrying');
  process.exitCode=1;
});
