import assert from 'node:assert/strict';
import {computeEuImport2026Baseline,validateEuImportEvidence} from './eu-import-2026.mjs';

// Official EU measures effective on 2026-11-04, one low-value watch category.
assert.deepEqual(computeEuImport2026Baseline({
  onDate:'2026-11-04',consignmentValueEurCents:2000
}),{
  flatDutyEurCents:300,handlingEurCents:200,
  minimumKnownChargesEurCents:500,
  requiresOrdinaryTariffVerification:false,
  importVatAndCarrierFeesUnverified:true,
  merchantOrCarrierLiabilityMustBeVerified:true,
  notProofOfDeliveryOrSale:true
});
assert.equal(computeEuImport2026Baseline({
  onDate:'2026-07-01',consignmentValueEurCents:1000
}).minimumKnownChargesEurCents,300);
assert.equal(computeEuImport2026Baseline({
  onDate:'2026-10-31',consignmentValueEurCents:1000
}).minimumKnownChargesEurCents,300);
assert.equal(computeEuImport2026Baseline({
  onDate:'2026-11-01',consignmentValueEurCents:1000
}).minimumKnownChargesEurCents,500);
assert.equal(computeEuImport2026Baseline({
  onDate:'2026-11-04',consignmentValueEurCents:15000
}).minimumKnownChargesEurCents,500);
assert.equal(computeEuImport2026Baseline({
  onDate:'2026-11-04',consignmentValueEurCents:15001
}).requiresOrdinaryTariffVerification,true);
for(const onDate of ['2026-06-30','2028-07-01','2026-02-30','bad']){
  assert.throws(()=>computeEuImport2026Baseline({
    onDate,consignmentValueEurCents:1000
  }));
}
assert.throws(()=>computeEuImport2026Baseline({
  consignmentValueEurCents:1000,tariffCategories:2
}),/one tariff category/);

const offer={
  id:'ci-eu-proof',supplier_vid:'verified-vid',supplier_pid:'verified-pid',
  supplier_variant_sku:'WATCH-BLACK',supplier_product_sku:'WATCH-1',
  logistics_name:'CJPacket Postal',from_country_code:'CN',
  supplier_landed_eur_ceiling_cents:2500,amount_eur_cents:8990
};
const evidence={
  offerId:offer.id,supplierVid:offer.supplier_vid,supplierPid:offer.supplier_pid,
  supplierVariantSku:offer.supplier_variant_sku,
  supplierProductSku:offer.supplier_product_sku,
  logisticsName:offer.logistics_name,fromCountryCode:'CN',
  destinationCountry:'FR',consignmentValueEurCents:8990,tariffCategories:1,
  flatDutyEurCents:300,unionHandlingEurCents:200,
  importVatCovered:true,carrierClearanceCovered:true,
  buyerExtraEurCents:0,landedEurQuoteCents:1700,importPayer:'SUPPLIER',
  supplierEvidenceSha256:'a'.repeat(64),validUntil:'2026-11-06T12:00:00Z',
  operatorReviewed:true,
  merchantProductId:'STORE-WATCH-001',
  supplierNonStandardProductId:'FACTORY-MODEL-1251',
  standardizedManufacturerProductId:null,
  noStandardizedManufacturerId:true,
  customsDeclarant:'Synthetic declarations provider',
  customsIdentifiersTransmissionConfirmed:true
};
const now=new Date('2026-11-04T12:00:00Z');
const reviewed=validateEuImportEvidence(evidence,offer,{now});
assert.equal(reviewed.checkoutApproved,false);
assert.equal(reviewed.sourceNotCryptographicallyAuthenticated,true);
assert.equal(reviewed.flatDutyEurCents,300);
assert.equal(reviewed.merchantProductId,'STORE-WATCH-001');
assert.equal(reviewed.supplierNonStandardProductId,'FACTORY-MODEL-1251');
assert.equal(reviewed.noStandardizedManufacturerId,true);
const spid=validateEuImportEvidence({
  ...evidence,standardizedManufacturerProductId:'GTIN-123456789',
  noStandardizedManufacturerId:false
},offer,{now});
assert.equal(spid.standardizedManufacturerProductId,'GTIN-123456789');
for(const change of [
  {supplierPid:'other-parent'},{supplierVid:'fake-variant'},
  {supplierProductSku:'other-sku'},{logisticsName:'Unquoted transport'},
  {unionHandlingEurCents:0},{flatDutyEurCents:0},
  {importVatCovered:false},{carrierClearanceCovered:false},
  {buyerExtraEurCents:1},{landedEurQuoteCents:2600},
  {importPayer:'CUSTOMER'},{operatorReviewed:false},
  {consignmentValueEurCents:15001},
  {supplierEvidenceSha256:'not a checksum'},
  {validUntil:'2026-11-04T11:59:59Z'},
  {validUntil:'2026-12-01T12:00:00Z'},
  {tariffCategories:2},
  {merchantProductId:offer.supplier_pid},
  {merchantProductId:offer.supplier_vid},
  {merchantProductId:'bad ID'},
  {supplierNonStandardProductId:null},
  {standardizedManufacturerProductId:null,noStandardizedManufacturerId:false},
  {standardizedManufacturerProductId:'GTIN-123',noStandardizedManufacturerId:true},
  {noStandardizedManufacturerId:'Y081'},
  {customsDeclarant:'unknown\ncontact'},
  {customsIdentifiersTransmissionConfirmed:false}
]){
  assert.throws(()=>validateEuImportEvidence({...evidence,...change},offer,{now}));
}
assert.throws(()=>validateEuImportEvidence(
  {...evidence,secretCJKey:'never accepted'},offer,{now}
),/Exact import evidence fields/);
console.log('EU import 2026 OK: €3 duty, €2 handling and strict C127/C128/C129-or-Y081 documentary review');
