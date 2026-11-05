import {getApprovedOffer} from './db.mjs';
import {storefrontCheckoutPermitted} from './merchant-gate.mjs';

/**
 * Operator-only, read-only launch diagnostics. Never exposes credentials,
 * encrypted customer data, tracking, supplier access tokens or order IDs.
 * The purchase gate in getApprovedOffer is the authoritative decision.
 */
const requiredFlags = [
  ['approved','merchant_approval_missing'],
  ['stock_confirmed','stock_confirmation_missing'],
  ['legal_verified','seller_legality_missing'],
  ['eu_compliance_verified','eu_product_compliance_missing'],
  ['photo_rights_verified','image_rights_missing'],
  ['supplier_payment_verified','supplier_payment_authorization_missing'],
  ['tax_treatment_verified','tax_status_unverified'],
  ['supplier_fx_verified','exchange_risk_unverified'],
  ['return_policy_verified','return_policy_unverified'],
  ['gpsr_traceability_verified','gpsr_traceability_unverified'],
  ['data_transfer_verified','customer_data_transfer_unverified']
];

export function offerReadinessBlockers(offer, now=new Date()){
  const reasons=requiredFlags.filter(([field])=>offer?.[field]!==true).map(([,reason])=>reason);
  // Match the SQL purchase predicate. A legacy unpinned supplier identity
  // must produce a concrete blocker instead of an optimistic readiness report.
  if(!['supplier_pid','supplier_variant_sku','supplier_product_sku'].every(
    field=>typeof offer?.[field]==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(offer[field])
  ))reasons.push('supplier_identity_proof_missing');
  if(offer?.eu_import_proof_ready!==true)
    reasons.push('eu_2026_import_proof_missing_or_expired');
  if(offer?.customs_identifiers_proof_ready!==true)
    reasons.push('customs_c127_c128_c129_or_y081_proof_missing');
  const cents=['amount_eur_cents','unit_cost_eur_cents',
    'supplier_landed_eur_ceiling_cents','reserves_eur_cents','supplier_max_usd_cents'];
  const allCentsValid=cents.every(field=>Number.isSafeInteger(offer?.[field]));
  if(!offer?.verified_until||!(new Date(offer.verified_until).getTime()>now.getTime()))
    reasons.push('supplier_quote_expired_or_missing');
  if(!allCentsValid||offer.amount_eur_cents<=0||offer.unit_cost_eur_cents<0||
    offer.reserves_eur_cents<0||offer.supplier_landed_eur_ceiling_cents<=0||
    offer.supplier_max_usd_cents<=0||
    offer.supplier_landed_eur_ceiling_cents<offer.unit_cost_eur_cents)
    reasons.push('supplier_cost_ceiling_invalid');
  const fx=offer?.supplier_fx_max_eur_per_usd_bps;
  if(!Number.isSafeInteger(fx)||fx<1000||fx>20000||
    !allCentsValid||offer.supplier_max_usd_cents*fx>
    offer.supplier_landed_eur_ceiling_cents*10000)
    reasons.push('fx_ceiling_not_covered');
  const vat=offer?.vat_rate_bps;
  if(!Number.isSafeInteger(vat)||vat<0||vat>3000)
    reasons.push('vat_rate_invalid');
  const min=offer?.delivery_min_business_days,max=offer?.delivery_max_business_days;
  if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||
    min<1||min>90||max<min||max>120)
    reasons.push('delivery_promise_invalid');
  if(allCentsValid&&Number.isSafeInteger(vat)&&vat>=0&&vat<=3000){
    const net=Math.round(offer.amount_eur_cents*10000/(10000+vat));
    if(net*3<(offer.supplier_landed_eur_ceiling_cents+offer.reserves_eur_cents)*4)
      reasons.push('contribution_margin_below_25_percent');
  }
  return reasons;
}
const isHttpsOrigin=value=>{
  if(typeof value!=='string')return false;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password&&
      !url.hash&&url.pathname==='/'&&url.search===''&&url.port==='';
  }catch{return false}
};
export function merchantConfigurationChecks(env={},siteConfig={}){
  const cap=Number(env.CJ_DAILY_CAP_USD_CENTS||0);
  return {
    storefront_checkout_active:siteConfig.checkoutMode==='active',
    storefront_checkout_targets_this_backend:storefrontCheckoutPermitted(
      siteConfig,env.COMMERCE_PUBLIC_URL),
    commerce_explicitly_enabled:env.COMMERCE_ENABLED==='true',
    mollie_live_key_configured:/^live_[a-zA-Z0-9]{12,}$/.test(env.MOLLIE_API_KEY||''),
    cj_access_token_configured:typeof env.CJ_ACCESS_TOKEN==='string'&&
      env.CJ_ACCESS_TOKEN.length>=20&&!/\s/.test(env.CJ_ACCESS_TOKEN),
    address_encryption_configured:/^[a-fA-F0-9]{64}$/.test(env.ADDRESS_ENCRYPTION_KEY||''),
    idempotency_secret_configured:typeof env.IDEMPOTENCY_SECRET==='string'&&
      env.IDEMPOTENCY_SECRET.length>=40,
    supplier_daily_budget_configured:Number.isSafeInteger(cap)&&cap>0,
    storefront_origin_configured:isHttpsOrigin(
      env.STOREFRONT_ORIGIN||'https://atelier-montres-selection-fr.onrender.com'),
    commerce_public_url_configured:isHttpsOrigin(env.COMMERCE_PUBLIC_URL)
  };
}
export async function commercialReadinessReport(pool,{env={},siteConfig={},now=new Date()}={}){
  const {rows}=await pool.query(`
    SELECT o.*,coalesce(q.quote_count,0)::integer AS quote_count,
      q.last_checked_at,
      (ip.offer_id IS NOT NULL
        AND o.from_country_code='CN'
        AND o.amount_eur_cents<=15000
        AND ip.supplier_vid=o.supplier_vid
        AND ip.supplier_pid=o.supplier_pid
        AND ip.supplier_variant_sku=o.supplier_variant_sku
        AND ip.supplier_product_sku=o.supplier_product_sku
        AND ip.logistics_name=o.logistics_name
        AND ip.flat_duty_eur_cents>=300
        AND ip.union_handling_eur_cents>=200
        AND ip.import_vat_covered=true
        AND ip.carrier_clearance_covered=true
        AND ip.buyer_extra_eur_cents=0
        AND ip.landed_eur_quote_cents<=o.supplier_landed_eur_ceiling_cents
        AND ip.valid_until>now()
        AND ip.recorded_at>now()-interval '7 days'
      ) AS eu_import_proof_ready,
      (ip.offer_id IS NOT NULL
        AND ip.supplier_vid=o.supplier_vid
        AND ip.supplier_pid=o.supplier_pid
        AND ip.supplier_variant_sku=o.supplier_variant_sku
        AND ip.supplier_product_sku=o.supplier_product_sku
        AND ip.logistics_name=o.logistics_name
        AND ip.merchant_product_identifier ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$'
        AND ip.merchant_product_identifier<>o.supplier_pid
        AND ip.merchant_product_identifier<>o.supplier_vid
        AND ip.supplier_nonstandard_identifier ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$'
        AND ((ip.standardized_manufacturer_identifier IS NULL
              AND ip.no_standardized_manufacturer_identifier=true)
          OR (ip.standardized_manufacturer_identifier ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{2,99}$'
              AND ip.no_standardized_manufacturer_identifier=false))
        AND char_length(trim(ip.customs_declarant)) BETWEEN 3 AND 100
        AND ip.customs_identifiers_transmission_confirmed=true
        AND ip.valid_until>now()
        AND ip.recorded_at>now()-interval '7 days'
      ) AS customs_identifiers_proof_ready
    FROM commerce_offers o
    LEFT JOIN commerce_offer_import_proofs ip ON ip.offer_id=o.id
    LEFT JOIN (
      SELECT offer_id,count(*) AS quote_count,max(checked_at) AS last_checked_at
      FROM commerce_offer_preflight_quotes GROUP BY offer_id
    ) q ON q.offer_id=o.id
    ORDER BY o.updated_at DESC,o.id ASC LIMIT 501
  `);
  if(rows.length>500)throw Error('Readiness report exceeds 500 offers; audit by segment');
  const offers=[];
  for(const row of rows){
    const eligible=Boolean(await getApprovedOffer(pool,row.id));
    const reasons=offerReadinessBlockers(row,now);
    // A mismatch between our explanation and the actual purchase gate is
    // an operator error, not a reason to claim that a listing can be sold.
    if(eligible&&reasons.length)
      throw Error('Offer readiness diagnostics disagree with purchase gate');
    if(!eligible&&!reasons.length)reasons.push('purchase_gate_rejected');
    offers.push({
      id:row.id,label:row.label,purchaseGateEligible:eligible,
      supplierQuoteRecords:row.quote_count,
      quoteLastCheckedAt:row.last_checked_at||null,
      warnings:row.quote_count===0?['supplier_quote_audit_missing']:[],
      blockers:reasons
    });
  }
  const orders=await pool.query(`
    SELECT status,count(*)::integer AS count FROM commerce_orders
    GROUP BY status ORDER BY status
  `);
  const quotes=await pool.query(
    'SELECT count(*)::integer AS count FROM commerce_offer_preflight_quotes'
  );
  const checks=merchantConfigurationChecks(env,siteConfig);
  const configBlockers=Object.entries(checks)
    .filter(([,value])=>!value).map(([name])=>name);
  if(!offers.some(x=>x.purchaseGateEligible))
    configBlockers.push('no_purchase_eligible_supplier_offer');
  const stateTotals=Object.fromEntries(orders.rows.map(r=>[r.status,r.count]));
  return {
    kind:'operator_readiness_diagnostic',
    checkedAt:now.toISOString(),
    productionLaunchCertified:false,
    productionLaunchRequires:'authenticated full-cycle payment, CJ purchase, delivery, tax and consumer-law review',
    merchantConfiguration:checks,
    totals:{
      supplierOffers:offers.length,
      purchaseGateEligibleOffers:offers.filter(x=>x.purchaseGateEligible).length,
      supplierQuoteAuditRecords:quotes.rows[0].count,
      orders:Object.values(stateTotals).reduce((a,b)=>a+b,0)
    },
    orderStates:stateTotals,
    launchBlockers:configBlockers,
    offers
  };
}
