import assert from 'node:assert/strict';
import {calculateCjPilotPrice,CJ_PILOT} from './cj-price-floor.mjs';

const NOW=new Date('2026-11-05T12:00:00Z');
const base={
  identity:{
    ...CJ_PILOT,originCountry:'CN',destinationCountry:'FR',
    postalCode:'75002'
  },
  supplierQuote:{
    sourceSha256:'c'.repeat(64),issuedAt:'2026-11-05T09:00:00Z',
    expiresAt:'2026-11-11T09:00:00Z',
    supplierProductUsdCents:850,
    supplierFreightAndImportUsdCents:1250,
    supplierGrandTotalUsdCents:2100,
    fxUpperEurPerUsdBps:11000,
    consignmentValueEurCents:850,
    deliveryMinBusinessDays:7,deliveryMaxBusinessDays:20,
    stockConfirmed:true
  },
  importCosts:{
    flatDuty:{amountEurCents:300,treatment:'included_in_supplier_total'},
    unionHandling:{amountEurCents:200,treatment:'included_in_supplier_total'},
    importVat:{amountEurCents:400,treatment:'included_in_supplier_total'},
    carrierClearance:{amountEurCents:100,treatment:'included_in_supplier_total'},
    importPayer:'SUPPLIER',buyerExtraEurCents:0,
    importLiabilityReviewed:true,vatAndFeeTreatmentReviewed:true
  },
  commercial:{
    sellerVatRateBps:2000,vatSchemeReviewed:true,
    pspVariableFeeBps:250,pspFixedFeeEurCents:30,
    returnAndServiceReserveEurCents:500,otherSellerCostsEurCents:150,
    marginTargetBps:2500
  }
};
const calc=x=>calculateCjPilotPrice(x,{now:NOW});
const valid=calc(base);
assert.equal(valid.status,'provisional_floor_calculated');
assert.equal(valid.supplierUpperEurCents,2310);
assert.equal(valid.alreadyIncludedImportFeesEurCents,1000);
assert.equal(valid.additionalImportFeesEurCents,0);
assert.equal(valid.landedUpperEurCents,2310);
assert.equal(valid.reserveEurCents,650);
assert.ok(valid.minimumGrossEurCents>=100&&valid.minimumGrossEurCents<=15000);
assert.ok(valid.provisionalContributionEurCents>0);
assert.ok(valid.provisionalMarginBps>=2500);
assert.equal(valid.checkoutApproved,false);
assert.equal(valid.publicPriceApproved,false);
assert.equal(valid.documentaryAuthenticityVerified,false);
assert.ok(!JSON.stringify(valid).includes(base.supplierQuote.sourceSha256),
  'supplier source details must stay private');

// Verify exact minimum gross cent, not a floating-point approximation.
const priceBefore=valid.minimumGrossEurCents-1;
const net=Number(BigInt(priceBefore)*10000n/12000n);
const psp=30+Number((BigInt(priceBefore)*250n+9999n)/10000n);
const contribution=net-2310-650-psp;
assert.ok(priceBefore<100||BigInt(contribution)*10000n<
  BigInt(net)*2500n,'one cent below the result must fail the 25% floor');

// Extra seller charges are ADDED exactly once. Import costs explicitly
// covered by CJ are NOT added again to the landed cost.
const extra=structuredClone(base);
extra.importCosts.importPayer='SELLER';
extra.importCosts.importVat.treatment='extra_seller_cost';
extra.importCosts.carrierClearance.treatment='extra_seller_cost';
const withExtra=calc(extra);
assert.equal(withExtra.supplierUpperEurCents,2310);
assert.equal(withExtra.alreadyIncludedImportFeesEurCents,500);
assert.equal(withExtra.additionalImportFeesEurCents,500);
assert.equal(withExtra.landedUpperEurCents,2810);
assert.ok(withExtra.minimumGrossEurCents>valid.minimumGrossEurCents);

const rejects=(mutate,code)=>{
  const input=structuredClone(base);
  mutate(input);
  assert.throws(()=>calc(input),e=>e.message===code,code);
};
rejects(x=>{delete x.importCosts.carrierClearance},
  'CJ_PRICE_IMPORT_EVIDENCE_INCOMPLETE');
rejects(x=>{x.identity.supplierVid='unknown-supplier-vid'},
  'CJ_PRICE_SUPPLIER_VARIANT_CHANGED');
rejects(x=>{x.identity.postalCode='97100'},
  'CJ_PRICE_DESTINATION_NOT_COVERED');
rejects(x=>{x.supplierQuote.sourceSha256='unknown'},
  'CJ_PRICE_SUPPLIER_SOURCE_MISSING');
rejects(x=>{x.supplierQuote.issuedAt='2026-12-01T00:00:00Z'},
  'CJ_PRICE_SUPPLIER_QUOTE_EXPIRED_OR_INVALID');
rejects(x=>{x.supplierQuote.expiresAt='2026-11-04T00:00:00Z'},
  'CJ_PRICE_SUPPLIER_QUOTE_EXPIRED_OR_INVALID');
rejects(x=>{x.supplierQuote.supplierGrandTotalUsdCents=2099},
  'CJ_PRICE_SUPPLIER_TOTAL_INCONSISTENT');
rejects(x=>{x.supplierQuote.fxUpperEurPerUsdBps=null},
  'CJ_PRICE_APPROVED_FX_CEILING_MISSING');
rejects(x=>{x.supplierQuote.stockConfirmed=false},
  'CJ_PRICE_SUPPLIER_DELIVERY_OR_STOCK_MISSING');
rejects(x=>{x.supplierQuote.consignmentValueEurCents=15100},
  'CJ_PRICE_SUPPLIER_DELIVERY_OR_STOCK_MISSING');
rejects(x=>{x.importCosts.flatDuty.amountEurCents=299},
  'CJ_PRICE_EU_IMPORT_MINIMUM_NOT_COVERED');
rejects(x=>{x.importCosts.unionHandling.amountEurCents=199},
  'CJ_PRICE_EU_IMPORT_MINIMUM_NOT_COVERED');
rejects(x=>{x.importCosts.importVat.amountEurCents=0},
  'CJ_PRICE_IMPORT_VAT_ZERO_NEEDS_EXTERNAL_PROOF');
rejects(x=>{x.importCosts.importPayer='BUYER'},
  'CJ_PRICE_IMPORT_LIABILITY_UNVERIFIED');
rejects(x=>{x.importCosts.buyerExtraEurCents=100},
  'CJ_PRICE_IMPORT_LIABILITY_UNVERIFIED');
rejects(x=>{x.importCosts.flatDuty.treatment='extra_seller_cost'},
  'CJ_PRICE_IMPORT_PAYER_CONTRADICTION');
rejects(x=>{x.commercial.vatSchemeReviewed=false},
  'CJ_PRICE_COMMERCIAL_TERMS_NOT_VALIDATED');
rejects(x=>{x.commercial.pspVariableFeeBps=null},
  'CJ_PRICE_COMMERCIAL_TERMS_NOT_VALIDATED');
rejects(x=>{x.commercial.marginTargetBps=1000},
  'CJ_PRICE_COMMERCIAL_TERMS_NOT_VALIDATED');

// A cheap headline supplier cost can still be commercially nonviable when
// returns, payment and import handling costs exceed the €150 pilot ceiling.
const infeasible=structuredClone(base);
infeasible.commercial.returnAndServiceReserveEurCents=15000;
const blocked=calc(infeasible);
assert.equal(blocked.status,'not_viable_under_150_eur_pilot_cap');
assert.equal(blocked.minimumGrossEurCents,null);
assert.equal(blocked.checkoutApproved,false);
assert.equal(blocked.publicPriceApproved,false);

// Do not accept undisclosed extra fields masquerading as supplier approval.
rejects(x=>{x.supplierQuote.approved=true},
  'CJ_PRICE_SUPPLIER_QUOTE_INCOMPLETE');
console.log('CJ pilot private price floor OK: exact cents, import double-count guard, VAT/PSP fees, expiry and fail-closed checkout');
