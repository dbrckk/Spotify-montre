import {preflightCjDelivery} from './cj.mjs';

/**
 * A supplier intake is a read-only CJ quote followed by an unapproved DB draft.
 * It never creates a Mollie payment, buys from CJ, or asserts legal compliance.
 */
const integer=(v,name,min,max)=>{
  if(!Number.isSafeInteger(v)||v<min||v>max)
    throw Error(name+' must be an integer in ['+min+','+max+']');
  return v;
};
const text=(v,name,min,max,re)=>{
  if(typeof v!=='string'||v.length<min||v.length>max||
    /[\u0000-\u001f\u007f]/.test(v)||!re.test(v))
    throw Error(name+' is invalid');
  return v;
};
const required=[
  'id','label','amountEurCents','unitCostEurCents','supplierLandedEurCeilingCents',
  'reservesEurCents','vatRateBps','supplierMaxUsdCents','fxMaxEurPerUsdBps',
  'supplierVid','supplierPid','supplierVariantSku','supplierProductSku',
  'logisticsName','originCountry','samplePostalCode',
  'deliveryMinBusinessDays','deliveryMaxBusinessDays'
];
export function validateOfferCandidate(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Candidate must be an object');
  if(Object.keys(value).some(k=>!required.includes(k))||required.some(k=>!Object.hasOwn(value,k)))
    throw Error('Exactly the documented supplier candidate fields are required');
  const c={...value};
  text(c.id,'id',4,64,/^[a-z0-9-]+$/);
  text(c.label,'label',4,180,/^[^\r\n]+$/);
  text(c.supplierVid,'supplierVid',3,100,/^[a-zA-Z0-9_-]+$/);
  text(c.supplierPid,'supplierPid',3,100,/^[a-zA-Z0-9_-]+$/);
  text(c.supplierVariantSku,'supplierVariantSku',3,100,/^[a-zA-Z0-9_-]+$/);
  text(c.supplierProductSku,'supplierProductSku',3,100,/^[a-zA-Z0-9_-]+$/);
  text(c.logisticsName,'logisticsName',3,50,/^[^\r\n]+$/);
  text(c.originCountry,'originCountry',2,2,/^[A-Z]{2}$/);
  text(c.samplePostalCode,'samplePostalCode',5,5,/^[0-9]{5}$/);
  if(c.samplePostalCode.startsWith('97')||c.samplePostalCode.startsWith('98'))
    throw Error('Metropolitan France quote required for the pilot');
  integer(c.amountEurCents,'amountEurCents',100,1_000_000);
  integer(c.unitCostEurCents,'unitCostEurCents',0,1_000_000);
  integer(c.supplierLandedEurCeilingCents,'supplierLandedEurCeilingCents',1,1_000_000);
  integer(c.reservesEurCents,'reservesEurCents',0,1_000_000);
  integer(c.vatRateBps,'vatRateBps',0,3000);
  integer(c.supplierMaxUsdCents,'supplierMaxUsdCents',1,1_000_000);
  integer(c.fxMaxEurPerUsdBps,'fxMaxEurPerUsdBps',1000,20000);
  integer(c.deliveryMinBusinessDays,'deliveryMinBusinessDays',1,90);
  integer(c.deliveryMaxBusinessDays,'deliveryMaxBusinessDays',1,120);
  if(c.deliveryMaxBusinessDays<c.deliveryMinBusinessDays)
    throw Error('Delivery maximum must be >= minimum');
  if(c.supplierLandedEurCeilingCents<c.unitCostEurCents)
    throw Error('All-in EUR ceiling cannot be below stated product unit cost');
  return c;
}
const upperEuro=(usd,bps)=>Number((BigInt(usd)*BigInt(bps)+9999n)/10000n);
export function qualifyObservedCjQuote(candidate,quote){
  const c=validateOfferCandidate(candidate);
  if(!quote||typeof quote!=='object')throw Error('A real CJ API quote is required');
  for(const field of ['productUsdCents','freightUsdCents','landedUsdCents','balanceUsdCents'])
    integer(quote[field],'CJ '+field,0,1_000_000_000);
  if(quote.supplierPid!==c.supplierPid||
    quote.supplierVariantSku!==c.supplierVariantSku||
    quote.supplierProductSku!==c.supplierProductSku)
    throw Error('Supplier canonical PID or SKU identity changed');
  if(quote.productUsdCents<=0||quote.stockConfirmed!==true||
    quote.logisticsName!==c.logisticsName||
    quote.productUsdCents+quote.freightUsdCents!==quote.landedUsdCents)
    throw Error('Supplier quote is inconsistent or unverified');
  if(quote.landedUsdCents>c.supplierMaxUsdCents)
    throw Error('Supplier quote exceeds maximum CJ debit');
  if(quote.balanceUsdCents<c.supplierMaxUsdCents)
    throw Error('Supplier wallet insufficient for this proposed sale');
  const maxLandedEur=upperEuro(c.supplierMaxUsdCents,c.fxMaxEurPerUsdBps);
  const observedLandedEur=upperEuro(quote.landedUsdCents,c.fxMaxEurPerUsdBps);
  const observedUnitEur=upperEuro(quote.productUsdCents,c.fxMaxEurPerUsdBps);
  if(maxLandedEur>c.supplierLandedEurCeilingCents||
    observedLandedEur>c.supplierLandedEurCeilingCents)
    throw Error('Verified FX upper bound exceeds EUR all-in ceiling');
  if(observedUnitEur>c.unitCostEurCents)
    throw Error('Unit EUR cost understated relative to observed CJ price and FX ceiling');
  const netRevenue=Math.round(c.amountEurCents*10000/(10000+c.vatRateBps));
  const contribution=netRevenue-c.supplierLandedEurCeilingCents-c.reservesEurCents;
  if(contribution<=0||contribution*4<netRevenue)
    throw Error('Insufficient contribution after VAT, full supplier costs and reserves');
  return {
    candidate:c,
    observed:{productUsdCents:quote.productUsdCents,
      freightUsdCents:quote.freightUsdCents,landedUsdCents:quote.landedUsdCents,
      balanceUsdCents:quote.balanceUsdCents,observedLandedEurCents:observedLandedEur,
      fxUpperEurCents:maxLandedEur,samplePostcodePrefix:c.samplePostalCode.slice(0,2)},
    financial:{netRevenueEurCents:netRevenue,contributionEurCents:contribution,
      contributionMarginBps:Math.floor(contribution*10000/netRevenue)},
    state:'draft_unapproved'
  };
}
/** Staging MUST perform a new authenticated CJ read itself.
 * A pre-computed plan/observed JSON is deliberately not a valid input.
 * The injectable fetcher exists only for isolated CI testing; the production
 * CLI never passes it and always calls the real CJ API with its private token.
 */
export async function stageQualifiedOffer(pool,candidate,{accessToken,fetcher}={}){
  const c=validateOfferCandidate(candidate);
  if(typeof accessToken!=='string'||accessToken.length<20)
    throw Error('A CJ access token is required for live supplier re-verification');
  const quote=await preflightCjDelivery({
    vid:c.supplierVid,originCountry:c.originCountry,
    expectedPid:c.supplierPid,
    expectedVariantSku:c.supplierVariantSku,
    expectedProductSku:c.supplierProductSku,
    postalCode:c.samplePostalCode,logisticsName:c.logisticsName,
    maxSupplierUsdCents:c.supplierMaxUsdCents,
    maxSupplierEurCents:c.supplierLandedEurCeilingCents,
    fxMaxEurPerUsdBps:c.fxMaxEurPerUsdBps,accessToken,
    ...(fetcher?{fetcher}:{})
  });
  const {observed:q}=qualifyObservedCjQuote(c,quote);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const params=[c.id,c.label,c.amountEurCents,c.unitCostEurCents,
      c.supplierLandedEurCeilingCents,c.vatRateBps,c.reservesEurCents,
      c.supplierMaxUsdCents,c.supplierVid,c.supplierPid,
      c.supplierVariantSku,c.supplierProductSku,
      c.logisticsName,c.originCountry,
      c.deliveryMinBusinessDays,c.deliveryMaxBusinessDays,c.fxMaxEurPerUsdBps];
    // Drafts must remain unapproved even if an attacker tampers with the JSON.
    const inserted=await client.query(`
      INSERT INTO commerce_offers(id,label,amount_eur_cents,unit_cost_eur_cents,
        supplier_landed_eur_ceiling_cents,vat_rate_bps,reserves_eur_cents,
        supplier_max_usd_cents,supplier_vid,supplier_pid,
        supplier_variant_sku,supplier_product_sku,logistics_name,
        from_country_code,delivery_min_business_days,delivery_max_business_days,
        supplier_fx_max_eur_per_usd_bps,approved,
        stock_confirmed,legal_verified,tax_treatment_verified,supplier_fx_verified)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        false,false,false,false,false)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
    `,params);
    if(inserted.rowCount!==1)
      throw Error('Offer id already exists; refusing to overwrite a commercial record');
    await client.query(`
      INSERT INTO commerce_offer_preflight_quotes
        (offer_id,postal_prefix,product_usd_cents,freight_usd_cents,
         landed_usd_cents,fx_max_eur_per_usd_bps,upper_landed_eur_cents)
      VALUES($1,$2,$3,$4,$5,$6,$7)
    `,[c.id,q.samplePostcodePrefix,q.productUsdCents,q.freightUsdCents,
      q.landedUsdCents,c.fxMaxEurPerUsdBps,q.observedLandedEurCents]);
    await client.query('COMMIT');
    return {id:c.id,state:'draft_unapproved',fxCeilingPersistedOnOffer:true};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release();}
}
