/**
 * November 2026 EU ecommerce import baseline for a single tariff category.
 *
 * Official sources:
 * https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne
 * https://taxation-customs.ec.europa.eu/customs/eu-customs-reform_en
 *
 * The flat customs duty and EU handling fee are charged per tariff category,
 * NOT per physical item or per parcel. No assumption about seller import VAT
 * status, IOSS, customs classification, preferential duty, carrier charges or
 * actual fiscal incidence is made by this module.
 */
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const ID=/^[A-Za-z0-9_-]{3,100}$/;
const HASH=/^[a-f0-9]{64}$/;
const FEE_START='2026-11-01';
const DUTY_START='2026-07-01';
const DUTY_END='2028-07-01';

export function computeEuImport2026Baseline({
  onDate='2026-11-04',originCountry='CN',destinationCountry='FR',
  consignmentValueEurCents,tariffCategories=1
}={}){
  if(!ISO.test(onDate)||new Date(onDate+'T00:00:00Z').toISOString().slice(0,10)!==onDate)
    throw Error('A valid ISO customs-entry date is required');
  if(originCountry!=='CN'||destinationCountry!=='FR')
    throw Error('This pilot verifies only CN to metropolitan France');
  if(!Number.isSafeInteger(consignmentValueEurCents)||
    consignmentValueEurCents<1||consignmentValueEurCents>1_000_000)
    throw Error('Documented consignment value is required');
  if(tariffCategories!==1)
    throw Error('Pilot checkout is restricted to one tariff category');
  if(onDate<DUTY_START||onDate>=DUTY_END)
    throw Error('This regulatory baseline is not validated for that date');
  const flatDutyEurCents=consignmentValueEurCents<=15000?300:null;
  const handlingEurCents=onDate>=FEE_START?200:0;
  return {
    flatDutyEurCents,handlingEurCents,
    minimumKnownChargesEurCents:
      flatDutyEurCents===null?null:flatDutyEurCents+handlingEurCents,
    requiresOrdinaryTariffVerification:flatDutyEurCents===null,
    importVatAndCarrierFeesUnverified:true,
    merchantOrCarrierLiabilityMustBeVerified:true,
    notProofOfDeliveryOrSale:true
  };
}
const validString=(value,name,max=100,pattern=ID)=>{
  if(typeof value!=='string'||value.length>max||!pattern.test(value))
    throw Error(name+' invalid');
  return value;
};
const money=(value,name,min=0,max=1000000)=>{
  if(!Number.isSafeInteger(value)||value<min||value>max)
    throw Error(name+' outside supported range');
  return value;
};
const timestamp=value=>{
  if(typeof value!=='string'||!(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).test(value))
    throw Error('Evidence expiry requires an explicit UTC timestamp');
  const d=new Date(value);
  if(!Number.isFinite(d.getTime())||d.toISOString().replace('.000Z','Z')!==value)
    throw Error('Evidence expiry invalid');
  return d;
};
/**
 * Validate ONLY structure and consistency of operator-provided evidence.
 * This does not establish authenticity of the supplier statement: the
 * operator must inspect the actual signed document separately.
 */
export function validateEuImportEvidence(value,offer,{now=new Date()}={}){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    !offer||typeof offer!=='object')
    throw Error('Offer and source-backed customs evidence required');
  const keys=[
    'offerId','supplierVid','supplierPid','supplierVariantSku','supplierProductSku',
    'logisticsName','fromCountryCode','destinationCountry',
    'consignmentValueEurCents','tariffCategories',
    'flatDutyEurCents','unionHandlingEurCents',
    'importVatCovered','carrierClearanceCovered','buyerExtraEurCents',
    'landedEurQuoteCents','importPayer',
    'supplierEvidenceSha256','validUntil','operatorReviewed'
  ];
  if(Object.keys(value).some(x=>!keys.includes(x))||
    keys.some(x=>!Object.hasOwn(value,x)))
    throw Error('Exact import evidence fields required');
  const v={...value};
  const matches=[
    ['offerId','id'],['supplierVid','supplier_vid'],['supplierPid','supplier_pid'],
    ['supplierVariantSku','supplier_variant_sku'],['supplierProductSku','supplier_product_sku'],
    ['logisticsName','logistics_name'],['fromCountryCode','from_country_code']
  ];
  for(const [field,col] of matches){
    validString(v[field],field,field==='logisticsName'?50:100,
      field==='logisticsName'?/^[^\r\n\x00-\x1f\x7f]{3,50}$/:
        field==='fromCountryCode'?/^[A-Z]{2}$/:ID);
    if(v[field]!==offer[col])throw Error('Import evidence does not match pinned offer');
  }
  if(v.fromCountryCode!=='CN'||v.destinationCountry!=='FR')
    throw Error('Only CN to France is covered');
  money(v.consignmentValueEurCents,'Consignment value',1,15000);
  money(v.tariffCategories,'Tariff category count',1,1);
  money(v.flatDutyEurCents,'EU 2026 flat duty',300);
  money(v.unionHandlingEurCents,'EU 2026 handling fee',200);
  money(v.buyerExtraEurCents,'Recipient surprise charges',0,0);
  money(v.landedEurQuoteCents,'All-in landed cost',500);
  if(v.landedEurQuoteCents<v.flatDutyEurCents+v.unionHandlingEurCents)
    throw Error('All-in quote is lower than mandatory import fees');
  if(v.landedEurQuoteCents>offer.supplier_landed_eur_ceiling_cents)
    throw Error('All-in quote exceeds approved EUR supplier budget');
  if(!Number.isSafeInteger(offer.amount_eur_cents)||offer.amount_eur_cents>15000)
    throw Error('Only low-value pilot watch orders are covered');
  if(v.importVatCovered!==true||v.carrierClearanceCovered!==true||
    v.operatorReviewed!==true)
    throw Error('Import VAT, carrier clearance and manual review unverified');
  if(v.importPayer!=='SELLER'&&v.importPayer!=='SUPPLIER')
    throw Error('Buyer cannot be import payer for all-in checkout');
  validString(v.supplierEvidenceSha256,'Source digest',64,HASH);
  const expires=timestamp(v.validUntil);
  const current=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(current.getTime())||expires<=current||
    expires.getTime()-current.getTime()>7*86400000)
    throw Error('Import evidence expiry must be within the next 7 days');
  const baseline=computeEuImport2026Baseline({
    onDate:current.toISOString().slice(0,10),
    originCountry:v.fromCountryCode,destinationCountry:v.destinationCountry,
    consignmentValueEurCents:v.consignmentValueEurCents,
    tariffCategories:v.tariffCategories
  });
  if(baseline.minimumKnownChargesEurCents===null||
    v.flatDutyEurCents<baseline.flatDutyEurCents||
    v.unionHandlingEurCents<baseline.handlingEurCents)
    throw Error('Import evidence omits current EU customs charges');
  return {
    offerId:v.offerId,supplierVid:v.supplierVid,supplierPid:v.supplierPid,
    supplierVariantSku:v.supplierVariantSku,
    supplierProductSku:v.supplierProductSku,
    logisticsName:v.logisticsName,
    consignmentValueEurCents:v.consignmentValueEurCents,
    flatDutyEurCents:v.flatDutyEurCents,
    unionHandlingEurCents:v.unionHandlingEurCents,
    buyerExtraEurCents:v.buyerExtraEurCents,
    landedEurQuoteCents:v.landedEurQuoteCents,
    importPayer:v.importPayer,
    supplierEvidenceSha256:v.supplierEvidenceSha256,
    validUntil:v.validUntil,
    sourceNotCryptographicallyAuthenticated:true,
    checkoutApproved:false
  };
}
