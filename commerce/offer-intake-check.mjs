import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase} from './db.mjs';
import {validateOfferCandidate,qualifyObservedCjQuote,stageQualifiedOffer} from './offer-intake.mjs';

// Synthetic data is restricted to an isolated local test database. Nothing is
// inserted into a public storefront or a real supplier/payment system.
const candidate={
  id:'ci-intake-'+randomBytes(6).toString('hex'),
  label:'Synthetic qualification check',
  amountEurCents:8990,unitCostEurCents:1300,
  supplierLandedEurCeilingCents:2800,reservesEurCents:800,
  vatRateBps:2000,supplierMaxUsdCents:2500,fxMaxEurPerUsdBps:10500,
  supplierVid:'test-variant-id',logisticsName:'CI Transport',
  originCountry:'CN',samplePostalCode:'75002',
  deliveryMinBusinessDays:7,deliveryMaxBusinessDays:20
};
const quote={
  productUsdCents:1100,freightUsdCents:400,landedUsdCents:1500,
  balanceUsdCents:3000,stockConfirmed:true,logisticsName:'CI Transport'
};
const plan=qualifyObservedCjQuote(candidate,quote);
assert.equal(plan.state,'draft_unapproved');
assert.equal(plan.observed.fxUpperEurCents,2625);
assert.equal(plan.observed.observedLandedEurCents,1575);
assert.equal(plan.observed.samplePostcodePrefix,'75');
assert.ok(plan.financial.contributionMarginBps>=2500);
assert.throws(()=>validateOfferCandidate({...candidate,approved:true}),/Exactly/);
assert.throws(()=>validateOfferCandidate({...candidate,id:'BAD ID'}),/id is invalid/);
assert.throws(()=>validateOfferCandidate({...candidate,samplePostalCode:'97100'}),/Metropolitan/);
assert.throws(()=>validateOfferCandidate({...candidate,fxMaxEurPerUsdBps:0}),/fxMax/);
assert.throws(()=>qualifyObservedCjQuote(candidate,{...quote,stockConfirmed:false}),/unverified/);
assert.throws(()=>qualifyObservedCjQuote(candidate,{...quote,landedUsdCents:1600}),/inconsistent/);
assert.throws(()=>qualifyObservedCjQuote(candidate,{...quote,balanceUsdCents:1}),/wallet/);
assert.throws(()=>qualifyObservedCjQuote(candidate,{...quote,productUsdCents:1450,freightUsdCents:50}),/understated/);
assert.throws(()=>qualifyObservedCjQuote({...candidate,supplierMaxUsdCents:2700,
  supplierLandedEurCeilingCents:2800},quote),/FX upper bound/);
assert.throws(()=>qualifyObservedCjQuote({...candidate,reservesEurCents:6000},quote),/contribution/);

const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL is mandatory for intake DB checks');
const uri=new URL(dbUrl);
if(!['127.0.0.1','localhost'].includes(uri.hostname)||uri.pathname!=='/commerce_ci')
  throw Error('Refusing to stage test offers outside isolated local PostgreSQL');
const pool=createDatabase(dbUrl);
let inserted=false;
try{
  await initializeDatabase(pool);
  const result=await stageQualifiedOffer(pool,plan);
  inserted=true;
  assert.equal(result.state,'draft_unapproved');
  const row=(await pool.query('SELECT * FROM commerce_offers WHERE id=$1',[candidate.id])).rows[0];
  assert.ok(row);
  for(const flag of ['approved','stock_confirmed','legal_verified',
    'tax_treatment_verified','supplier_fx_verified','supplier_payment_verified',
    'gpsr_traceability_verified','data_transfer_verified','return_policy_verified'])
    assert.equal(row[flag],false,'draft must not approve '+flag);
  assert.equal(row.verified_until,null,'staged record must never be an approved live quote');
  assert.equal(row.supplier_vid,candidate.supplierVid);
  const quoteRows=await pool.query(
    'SELECT * FROM commerce_offer_preflight_quotes WHERE offer_id=$1',[candidate.id]);
  assert.equal(quoteRows.rows.length,1);
  assert.equal(quoteRows.rows[0].landed_usd_cents,1500);
  assert.equal(quoteRows.rows[0].postal_prefix,'75');
  assert.equal(quoteRows.rows[0].fx_max_eur_per_usd_bps,10500);
  if(result.fxCeilingPersistedOnOffer)
    assert.equal(row.supplier_fx_max_eur_per_usd_bps,10500);
  await assert.rejects(()=>stageQualifiedOffer(pool,plan),/Offer id already exists/);
  const after=await pool.query(
    'SELECT count(*)::int AS n FROM commerce_offer_preflight_quotes WHERE offer_id=$1',
    [candidate.id]);
  assert.equal(after.rows[0].n,1,'duplicate insert must not record a second quote');
  console.log('CJ offer intake OK: strict quote, verified margins, unapproved PostgreSQL draft, audit and no overwrite');
}finally{
  if(inserted){
    await pool.query('DELETE FROM commerce_offer_preflight_quotes WHERE offer_id=$1',[candidate.id]).catch(()=>{});
    await pool.query('DELETE FROM commerce_offers WHERE id=$1',[candidate.id]).catch(()=>{});
  }
  await pool.end();
}
