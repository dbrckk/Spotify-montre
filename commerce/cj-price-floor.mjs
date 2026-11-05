import {computeEuImport2026Baseline} from './eu-import-2026.mjs';

// Operator-only calculation for the single real CJ pilot variant. This does
// NOT validate the supplier's signature, legal standing, import documents,
// VAT scheme or payment-provider contract. Nothing it returns can enable sale.
export const CJ_PILOT=Object.freeze({
  supplierVid:'74F64E7D-7D90-425D-AFB3-487D28B1D09F',
  supplierPid:'EC60873E-E5A2-4081-82F7-427BC84A8A3D',
  supplierVariantSku:'CJZBNSET00031-black',
  supplierProductSku:'CJZBNSET00031'
});
const PILOT_GROSS_MAX=15000;
const HEX=/^[a-f0-9]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const TYPES=['included_in_supplier_total','extra_seller_cost'];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const fail=code=>{throw Error(code)};
const keys=(object,expected,code)=>{
  if(!object||typeof object!=='object'||Array.isArray(object)||
    Object.keys(object).some(x=>!expected.includes(x))||
    expected.some(x=>!own(object,x)))fail(code);
};
const cents=(n,max=1_000_000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const positive=n=>Number.isSafeInteger(n)&&n>0&&n<=1_000_000;
const date=value=>{
  if(typeof value!=='string'||!DATE.test(value))fail('CJ_PRICE_DATE_FORMAT_INVALID');
  const dt=new Date(value);
  if(!Number.isFinite(dt.getTime())||dt.toISOString().replace('.000Z','Z')!==value)
    fail('CJ_PRICE_DATE_FORMAT_INVALID');
  return dt.getTime();
};
const ceilDiv=(a,b)=>(a+b-1n)/b;
const scaled=(n,bps)=>Number(ceilDiv(BigInt(n)*BigInt(bps),10000n));

// Individual import charges MUST be explicitly classified. CJ inclusive
// postage already contains some charges: those are counted exactly once.
function assessedFee(input,label){
  keys(input,['amountEurCents','treatment'],'CJ_PRICE_'+label+'_PROOF_INCOMPLETE');
  if(!cents(input.amountEurCents)||!TYPES.includes(input.treatment))
    fail('CJ_PRICE_'+label+'_PROOF_INCOMPLETE');
  return input;
}
function evaluateSale(price,netCost,reserve,pspFixed,pspRate,vat){
  // Round merchant revenue DOWN, and provider fee UP: deliberately
  // conservative; no floating point money or fictitious FX rate.
  const net=Number(BigInt(price)*10000n/(10000n+BigInt(vat)));
  const paymentFee=pspFixed+scaled(price,pspRate);
  const contribution=net-netCost-reserve-paymentFee;
  const marginBps=net>0?Number(BigInt(contribution)*10000n/BigInt(net)):null;
  return {grossEurCents:price,netRevenueEurCents:net,
    pspFeeEurCents:paymentFee,contributionEurCents:contribution,
    contributionMarginBps:marginBps};
}
export function calculateCjPilotPrice(input,{now=new Date()}={}){
  keys(input,['identity','supplierQuote','importCosts','commercial'],
    'CJ_PRICE_EVIDENCE_FIELDS_REQUIRED');
  keys(input.identity,['supplierVid','supplierPid','supplierVariantSku',
    'supplierProductSku','originCountry','destinationCountry','postalCode'],
    'CJ_PRICE_IDENTITY_INCOMPLETE');
  for(const [field,expected] of Object.entries(CJ_PILOT))
    if(input.identity[field]!==expected)fail('CJ_PRICE_SUPPLIER_VARIANT_CHANGED');
  if(input.identity.originCountry!=='CN'||input.identity.destinationCountry!=='FR'||
    typeof input.identity.postalCode!=='string'||
    !/^[0-9]{5}$/.test(input.identity.postalCode)||
    /^(97|98)/.test(input.identity.postalCode))
    fail('CJ_PRICE_DESTINATION_NOT_COVERED');

  const q=input.supplierQuote;
  keys(q,['sourceSha256','issuedAt','expiresAt','supplierProductUsdCents',
    'supplierFreightAndImportUsdCents','supplierGrandTotalUsdCents',
    'fxUpperEurPerUsdBps','consignmentValueEurCents',
    'deliveryMinBusinessDays','deliveryMaxBusinessDays','stockConfirmed'],
    'CJ_PRICE_SUPPLIER_QUOTE_INCOMPLETE');
  if(typeof q.sourceSha256!=='string'||!HEX.test(q.sourceSha256))
    fail('CJ_PRICE_SUPPLIER_SOURCE_MISSING');
  const issued=date(q.issuedAt),expiry=date(q.expiresAt);
  const current=now instanceof Date?now.getTime():new Date(now).getTime();
  if(!Number.isFinite(current)||issued>current||expiry<=current||
    expiry<=issued||expiry-issued>31*86400000)
    fail('CJ_PRICE_SUPPLIER_QUOTE_EXPIRED_OR_INVALID');
  if(!positive(q.supplierProductUsdCents)||
    !cents(q.supplierFreightAndImportUsdCents)||
    !positive(q.supplierGrandTotalUsdCents)||
    q.supplierProductUsdCents+q.supplierFreightAndImportUsdCents!==
      q.supplierGrandTotalUsdCents)
    fail('CJ_PRICE_SUPPLIER_TOTAL_INCONSISTENT');
  if(!Number.isSafeInteger(q.fxUpperEurPerUsdBps)||
    q.fxUpperEurPerUsdBps<1000||q.fxUpperEurPerUsdBps>20000)
    fail('CJ_PRICE_APPROVED_FX_CEILING_MISSING');
  if(!positive(q.consignmentValueEurCents)||
    q.consignmentValueEurCents>15000||
    !Number.isInteger(q.deliveryMinBusinessDays)||
    !Number.isInteger(q.deliveryMaxBusinessDays)||
    q.deliveryMinBusinessDays<1||q.deliveryMaxBusinessDays>120||
    q.deliveryMaxBusinessDays<q.deliveryMinBusinessDays||
    q.stockConfirmed!==true)
    fail('CJ_PRICE_SUPPLIER_DELIVERY_OR_STOCK_MISSING');

  const i=input.importCosts;
  keys(i,['flatDuty','unionHandling','importVat','carrierClearance',
    'importPayer','buyerExtraEurCents','importLiabilityReviewed',
    'vatAndFeeTreatmentReviewed'], 'CJ_PRICE_IMPORT_EVIDENCE_INCOMPLETE');
  const fees=Object.fromEntries(['flatDuty','unionHandling','importVat',
    'carrierClearance'].map(k=>[k,assessedFee(i[k],k.toUpperCase())]));
  if(!['SUPPLIER','SELLER'].includes(i.importPayer)||
    i.buyerExtraEurCents!==0||
    i.importLiabilityReviewed!==true||
    i.vatAndFeeTreatmentReviewed!==true)
    fail('CJ_PRICE_IMPORT_LIABILITY_UNVERIFIED');
  if(i.importPayer==='SUPPLIER'&&
    Object.values(fees).some(f=>f.treatment==='extra_seller_cost'))
    fail('CJ_PRICE_IMPORT_PAYER_CONTRADICTION');
  // A signed source document must establish true zero import VAT; JSON
  // booleans are just operator assertions and never merchant approval.
  if(fees.importVat.amountEurCents===0)
    fail('CJ_PRICE_IMPORT_VAT_ZERO_NEEDS_EXTERNAL_PROOF');
  const baseline=computeEuImport2026Baseline({
    onDate:new Date(current).toISOString().slice(0,10),
    originCountry:'CN',destinationCountry:'FR',
    consignmentValueEurCents:q.consignmentValueEurCents,tariffCategories:1
  });
  if(fees.flatDuty.amountEurCents<baseline.flatDutyEurCents||
    fees.unionHandling.amountEurCents<baseline.handlingEurCents)
    fail('CJ_PRICE_EU_IMPORT_MINIMUM_NOT_COVERED');

  const commercial=input.commercial;
  keys(commercial,['sellerVatRateBps','vatSchemeReviewed','pspVariableFeeBps',
    'pspFixedFeeEurCents','returnAndServiceReserveEurCents',
    'otherSellerCostsEurCents','marginTargetBps'],
  'CJ_PRICE_COMMERCIAL_COSTS_MISSING');
  if(!Number.isSafeInteger(commercial.sellerVatRateBps)||
    commercial.sellerVatRateBps<0||commercial.sellerVatRateBps>3000||
    commercial.vatSchemeReviewed!==true||
    !cents(commercial.pspVariableFeeBps,1000)||
    !cents(commercial.pspFixedFeeEurCents)||
    !cents(commercial.returnAndServiceReserveEurCents)||
    !cents(commercial.otherSellerCostsEurCents)||
    !Number.isSafeInteger(commercial.marginTargetBps)||
    commercial.marginTargetBps<2500||commercial.marginTargetBps>8500)
    fail('CJ_PRICE_COMMERCIAL_TERMS_NOT_VALIDATED');

  const supplierUpperEurCents=scaled(q.supplierGrandTotalUsdCents,
    q.fxUpperEurPerUsdBps);
  const includedFeesEurCents=Object.values(fees).filter(f=>
    f.treatment==='included_in_supplier_total')
    .reduce((sum,f)=>sum+f.amountEurCents,0);
  const sellerExtraImportEurCents=Object.values(fees).filter(f=>
    f.treatment==='extra_seller_cost')
    .reduce((sum,f)=>sum+f.amountEurCents,0);
  if(includedFeesEurCents>supplierUpperEurCents)
    fail('CJ_PRICE_INCLUDED_FEES_EXCEED_SUPPLIER_TOTAL');
  const landedUpperEurCents=supplierUpperEurCents+sellerExtraImportEurCents;
  const reserveEurCents=commercial.returnAndServiceReserveEurCents+
    commercial.otherSellerCostsEurCents;
  let offer=null;
  for(let candidate=100;candidate<=PILOT_GROSS_MAX;candidate++){
    const x=evaluateSale(candidate,landedUpperEurCents,reserveEurCents,
      commercial.pspFixedFeeEurCents,commercial.pspVariableFeeBps,
      commercial.sellerVatRateBps);
    if(x.netRevenueEurCents>0&&x.contributionEurCents>0&&
      BigInt(x.contributionEurCents)*10000n>=
      BigInt(x.netRevenueEurCents)*BigInt(commercial.marginTargetBps)){
      offer=x;
      break;
    }
  }
  return {
    kind:'cj_private_price_floor_one_variant',
    sku:CJ_PILOT.supplierVariantSku,
    status:offer?'provisional_floor_calculated':'not_viable_under_150_eur_pilot_cap',
    minimumGrossEurCents:offer?.grossEurCents??null,
    sellerNetRevenueEurCents:offer?.netRevenueEurCents??null,
    provisionalContributionEurCents:offer?.contributionEurCents??null,
    provisionalMarginBps:offer?.contributionMarginBps??null,
    supplierUpperEurCents,alreadyIncludedImportFeesEurCents:includedFeesEurCents,
    additionalImportFeesEurCents:sellerExtraImportEurCents,
    landedUpperEurCents,reserveEurCents,
    pspAtMinimumEurCents:offer?.pspFeeEurCents??null,
    minimumTargetMarginBps:commercial.marginTargetBps,
    samplePostalCode:input.identity.postalCode,
    assessedQuoteValidUntil:q.expiresAt,
    supplierSourceDigestPresent:true,
    documentaryAuthenticityVerified:false,
    actualPspContractVerified:false,
    fullFranceDeliveryCoverageVerified:false,
    publicPriceApproved:false,checkoutApproved:false,orderPlaced:false,
    note:'Operator-supplied costs only. Validate original CJ evidence, legal VAT regime, payment fees, battery GPSR and seller identity before any listing.'
  };
}
