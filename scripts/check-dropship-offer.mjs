import assert from 'node:assert/strict';
import {evaluateDropshipOffer} from './evaluate-dropship-offer.mjs';
// Les montants ci-dessous sont STRICTEMENT synthétiques pour vérifier le moteur.
// Ils ne doivent jamais servir de prix, de devis ni de SKU publié.
const evidence=[
 'exactVariantMatched','supplierIdentityVerified','supplierStockConfirmed',
 'shippingToFranceConfirmed','importTaxesAndDdpReviewed','euProductComplianceVerified',
 'photoRightsVerified','merchantLegalAndCgvReady','returnsAndWarrantyReady',
 'shopifyPaymentsLiveVerified','shopifyVariantMapped',
 'automaticSupplierOrderVerified','automaticSupplierPaymentVerified',
 'supplierFundingAvailable','idempotenceAndFailureAlertsVerified'
];
const base={
  version:1,catalogueId:'skmei-2056',supplierName:'Fournisseur synthétique',
  supplierSku:'TEST-NON-PUBLIC',quoteReference:'TEST-ONLY',
  fulfilmentMode:'cj_wallet_api',quotedOn:'2026-11-01',validThrough:'2026-11-30',
  costs:{
    sellingPriceInclVatCents:4990,sellingVatBasisPoints:2000,
    supplierUnitCents:1100,supplierShippingCents:400,
    customsAndHandlingCents:500,nonRecoverableImportVatCents:0,
    paymentFeeBasisPoints:150,paymentFixedCents:25,packingCents:0,
    refundReserveCents:150,warrantyReserveCents:100,
    supportReserveCents:100,otherVariableCostsCents:0
  },
  proofs:Object.fromEntries(evidence.map(k=>[k,true]))
};
const date={asOf:'2026-11-02'};
const valid=evaluateDropshipOffer(base,date);
assert.equal(valid.customerTotalCents,4990);
assert.equal(valid.sellerRevenueCents,4158);
assert.equal(valid.sellerVatCents,832);
assert.equal(valid.supplierTotalCents,2000);
assert.equal(valid.paymentTotalCents,100); // 1,5 % arrondi au-dessus + 25 centimes
assert.equal(valid.contributionCents,1708);
assert.equal(valid.eligibleForMerchantReview,true);
assert.equal(valid.checkoutActivated,false);
const withChange=change=>({...structuredClone(base),...change});
assert.equal(evaluateDropshipOffer(withChange({fulfilmentMode:'manual'}),date).eligibleForMerchantReview,false);
const missing=structuredClone(base);
missing.proofs.supplierFundingAvailable=false;
assert.ok(evaluateDropshipOffer(missing,date).missingProofs.includes('supplierFundingAvailable'));
assert.equal(evaluateDropshipOffer(missing,date).eligibleForMerchantReview,false);
assert.equal(evaluateDropshipOffer(base,{asOf:'2026-12-01'}).eligibleForMerchantReview,false);
const weak=structuredClone(base);
weak.costs.supplierUnitCents=2600;
assert.equal(evaluateDropshipOffer(weak,date).eligibleForMerchantReview,false);
const vatExempt=structuredClone(base);
vatExempt.costs.sellingVatBasisPoints=0;
assert.equal(evaluateDropshipOffer(vatExempt,date).sellerRevenueCents,4990);
const missingCost=structuredClone(base);
delete missingCost.costs.customsAndHandlingCents;
assert.throws(()=>evaluateDropshipOffer(missingCost,date),/customsAndHandlingCents/);
const suspicious=structuredClone(base);
suspicious.costs.paymentFeeBasisPoints=12000;
assert.throws(()=>evaluateDropshipOffer(suspicious,date),/paymentFeeBasisPoints/);
assert.throws(()=>evaluateDropshipOffer(base,{asOf:'2026-11-32'}),/asOf/);
console.log('Direct-sale review gate OK: exact cents, VAT model, shipping, payment fee, margin, evidence, expiry and manual-supplier blocking');
