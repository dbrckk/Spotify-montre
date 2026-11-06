import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase} from './db.mjs';
import {commercialReadinessReport,merchantConfigurationChecks,
  offerReadinessBlockers} from './readiness.mjs';

// Synthetic offer data only, isolated PostgreSQL. Never inspect live customers.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL is mandatory');
const u=new URL(dbUrl);
if(!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname!=='/commerce_ci')
  throw Error('Readiness test refuses to access a non-local database');

const env={
  COMMERCE_ENABLED:'true',MOLLIE_API_KEY:'live_'+'A'.repeat(24),
  CJ_ACCESS_TOKEN:'z'.repeat(40),
  ADDRESS_ENCRYPTION_KEY:'a'.repeat(64),
  IDEMPOTENCY_SECRET:'b'.repeat(64),
  CJ_DAILY_CAP_USD_CENTS:'2500',
  STOREFRONT_ORIGIN:'https://atelier-montres-selection-fr.onrender.com',
  COMMERCE_PUBLIC_URL:'https://atelier-montres-commerce-api.onrender.com/'
};
const siteConfig={checkoutMode:'active',commerceApiUrl:env.COMMERCE_PUBLIC_URL};
const flags=merchantConfigurationChecks(env,siteConfig);
assert.equal(flags.merchant_publication_pinned_and_verified,false,
  'A verified CJ quote and provider credentials cannot substitute for signed seller terms');
assert.ok(Object.entries(flags).filter(([name])=>name!=='merchant_publication_pinned_and_verified')
  .every(([,ok])=>ok),'Other synthetic merchant configuration checks should pass');
assert.equal(merchantConfigurationChecks(env,{...siteConfig,
  commerceApiUrl:'https://wrong-payment-api.onrender.com/'})
  .storefront_checkout_targets_this_backend,false);

assert.equal(merchantConfigurationChecks({...env,CJ_ACCESS_TOKEN:'z'.repeat(20)+' '},
  siteConfig).cj_access_token_configured,false);
assert.equal(merchantConfigurationChecks({...env,MOLLIE_API_KEY:'test_'+'A'.repeat(24)},
  siteConfig).mollie_live_key_configured,false);
assert.equal(merchantConfigurationChecks({...env,COMMERCE_ENABLED:'false'},
  siteConfig).commerce_explicitly_enabled,false);

const offerId='ci-readiness-'+randomBytes(5).toString('hex');
const pool=createDatabase(dbUrl);
try{
  await initializeDatabase(pool);
  await pool.query(`
    INSERT INTO commerce_offers(
      id,label,amount_eur_cents,unit_cost_eur_cents,
      supplier_landed_eur_ceiling_cents,supplier_fx_max_eur_per_usd_bps,
      reserves_eur_cents,vat_rate_bps,supplier_max_usd_cents,
      supplier_vid,supplier_pid,supplier_variant_sku,supplier_product_sku,
      logistics_name,from_country_code,
      delivery_min_business_days,delivery_max_business_days
    ) VALUES($1,'Synthetic private readiness watch',8990,1300,
       2800,10500,800,2000,2500,'ci-vid',
       'ci-parent','CI-VAR-SKU','CI-PRODUCT-SKU',
       'CI delivery','CN',7,20)
  `,[offerId]);
  let report=await commercialReadinessReport(pool,{env,siteConfig});
  let current=report.offers.find(x=>x.id===offerId);
  assert.ok(current);
  assert.equal(current.purchaseGateEligible,false);
  assert.ok(current.blockers.includes('merchant_approval_missing'));
  assert.ok(!current.blockers.includes('supplier_identity_proof_missing'));
  assert.ok(current.blockers.includes('supplier_quote_expired_or_missing'));
  assert.ok(current.blockers.includes('eu_2026_import_proof_missing_or_expired'));
  assert.ok(current.blockers.includes('customs_c127_c128_c129_or_y081_proof_missing'));
  assert.ok(current.warnings.includes('supplier_quote_audit_missing'));
  assert.ok(report.launchBlockers.includes('no_purchase_eligible_supplier_offer'),
    'unapproved products cannot authorize a sale');

  await pool.query(`
    UPDATE commerce_offers SET
      approved=true,stock_confirmed=true,legal_verified=true,
      eu_compliance_verified=true,photo_rights_verified=true,
      supplier_payment_verified=true,tax_treatment_verified=true,
      supplier_fx_verified=true,return_policy_verified=true,
      gpsr_traceability_verified=true,data_transfer_verified=true,
      verified_until=now()+interval '6 hours'
    WHERE id=$1
  `,[offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,false,
    'merchant flags alone cannot prove EU customs or handling costs');
  assert.ok(current.blockers.includes('eu_2026_import_proof_missing_or_expired'));
  assert.ok(current.blockers.includes('customs_c127_c128_c129_or_y081_proof_missing'));
  await pool.query(
    'INSERT INTO commerce_offer_import_proofs ('+
      'offer_id,supplier_vid,supplier_pid,supplier_variant_sku,'+
      'supplier_product_sku,logistics_name,consignment_value_eur_cents,'+
      'flat_duty_eur_cents,union_handling_eur_cents,buyer_extra_eur_cents,'+
      'landed_eur_quote_cents,import_payer,import_vat_covered,'+
      'carrier_clearance_covered,supplier_evidence_sha256,valid_until,'+
      'merchant_product_identifier,supplier_nonstandard_identifier,'+
      'standardized_manufacturer_identifier,no_standardized_manufacturer_identifier,'+
      'customs_declarant,customs_identifiers_transmission_confirmed) '+
      "VALUES($1,'ci-vid','ci-parent','CI-VAR-SKU','CI-PRODUCT-SKU',"+
      "'CI delivery',8990,300,200,0,1900,'SUPPLIER',true,true,$2,"+
      "now()+interval '1 day','STORE-READINESS-WATCH',"+
      "'MANUFACTURER-1251',NULL,true,'Synthetic customs declarant',true)",
    [offerId,'b'.repeat(64)]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,true,
    'authoritative checkout gate and readiness report must agree');
  await pool.query(
    'UPDATE commerce_offer_import_proofs SET merchant_product_identifier=supplier_pid WHERE offer_id=$1',
    [offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,false);
  assert.ok(current.blockers.includes('customs_c127_c128_c129_or_y081_proof_missing'));
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET merchant_product_identifier='STORE-READINESS-WATCH' WHERE offer_id=$1",
    [offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,true);
  assert.deepEqual(current.blockers,[]);
  assert.ok(report.totals.purchaseGateEligibleOffers>=1);
  await pool.query('UPDATE commerce_offers SET supplier_pid=NULL WHERE id=$1',[offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,false);
  assert.ok(current.blockers.includes('supplier_identity_proof_missing'));
  await pool.query('UPDATE commerce_offers SET supplier_pid=$2 WHERE id=$1',
    [offerId,'ci-parent']);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,true);
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()-interval '1 minute' WHERE offer_id=$1",
    [offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,false);
  assert.ok(current.blockers.includes('eu_2026_import_proof_missing_or_expired'));
  assert.ok(current.blockers.includes('customs_c127_c128_c129_or_y081_proof_missing'));
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()+interval '1 day' WHERE offer_id=$1",
    [offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  assert.equal(report.offers.find(x=>x.id===offerId).purchaseGateEligible,true);
  assert.equal(report.productionLaunchCertified,false,
    'no CI simulation may certify a real customer/supplier purchase');

  await pool.query(`
    INSERT INTO commerce_offer_preflight_quotes(
      offer_id,postal_prefix,product_usd_cents,freight_usd_cents,
      landed_usd_cents,fx_max_eur_per_usd_bps,upper_landed_eur_cents
    ) VALUES($1,'75',1100,400,1500,10500,1575)
  `,[offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.supplierQuoteRecords,1);
  assert.deepEqual(current.warnings,[]);
  const sanitized=JSON.stringify(report);
  for(const secret of [env.MOLLIE_API_KEY,env.CJ_ACCESS_TOKEN,
    env.ADDRESS_ENCRYPTION_KEY,env.IDEMPOTENCY_SECRET])
    assert.ok(!sanitized.includes(secret),'secrets must never appear in report');

  await pool.query(`
    UPDATE commerce_offers SET supplier_fx_max_eur_per_usd_bps=20000
    WHERE id=$1
  `,[offerId]);
  report=await commercialReadinessReport(pool,{env,siteConfig});
  current=report.offers.find(x=>x.id===offerId);
  assert.equal(current.purchaseGateEligible,false);
  assert.ok(current.blockers.includes('fx_ceiling_not_covered'));

  assert.ok(offerReadinessBlockers({}).length>0,
    'missing commercial proof must fail closed');
  console.log('Readiness report OK: live purchase predicate, missing evidence, FX risk and no credentials exposed');
}finally{
  await pool.query('DELETE FROM commerce_offer_preflight_quotes WHERE offer_id=$1',
    [offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[offerId]).catch(()=>{});
  await pool.end();
}
