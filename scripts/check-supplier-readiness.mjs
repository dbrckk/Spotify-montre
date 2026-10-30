import assert from 'node:assert/strict';
import {evaluateSupplierQuote} from './evaluate-supplier.mjs';
// Synthetic values exist only in this functional check, never in a published product or supplier record.
const flags=['supplierIdentity','sampleTested','materialSpecifications','batchTraceability','gpsrRiskAssessment','euResponsibleOperator','customsAndVatReviewed','batteryAndWasteCompliance','commercialImageRights','sellerRegistration','customerReturnsProcess','warrantyAndRecallProcess'];
const record={
 reference:'test-reference',supplierName:'test supplier',originCountry:'CN',
 order:{quantity:100,unitFactoryPriceEur:9,freightEur:100,customsDutyEur:50,inspectionEur:100,packagingEur:50,otherImportCostsEur:0,nonRecoverableImportVatEur:0},
 sale:{retailPriceInclVatEur:49.9,outputVatRate:0.2,paymentRate:0.015,paymentFeeFixedEur:0.25,shippingAndPackingPerUnitEur:4,marketingPerSaleEur:5,warrantyReservePerUnitEur:1,returnsReservePerUnitEur:2},
 evidence:Object.fromEntries(flags.map(x=>[x,true]))
};
const ok=evaluateSupplierQuote(record);
assert.equal(ok.landedCostEur,12);
assert.equal(ok.eligibleForCommercialReview,true);
assert.ok(ok.contributionPerUnitEur>0);
const unverified=structuredClone(record);
unverified.evidence.gpsrRiskAssessment=false;
assert.equal(evaluateSupplierQuote(unverified).eligibleForCommercialReview,false);
assert.ok(evaluateSupplierQuote(unverified).missingEvidence.includes('gpsrRiskAssessment'));
const expensive=structuredClone(record);
expensive.order.unitFactoryPriceEur=25;
assert.equal(evaluateSupplierQuote(expensive).eligibleForCommercialReview,false);
const unprofitable=structuredClone(record);
unprofitable.sale.retailPriceInclVatEur=10;
assert.equal(evaluateSupplierQuote(unprofitable).eligibleForCommercialReview,false);
const invalid=structuredClone(record);
delete invalid.order.customsDutyEur;
assert.throws(()=>evaluateSupplierQuote(invalid),/customsDutyEur/);
console.log('Supplier functional checks OK: landed costs, contribution, missing evidence and hard financial gates');
