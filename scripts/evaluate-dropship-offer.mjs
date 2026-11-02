import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

/*
 * Audit d'une offre dropshipping réelle, avant toute publication ou encaissement.
 * Prix en centimes entiers, taxes et coûts fournis par un devis vérifié.
 * Un résultat positif autorise seulement une revue humaine, jamais un checkout.
 */
const REQUIRED_PROOFS=[
  'exactVariantMatched','supplierIdentityVerified','supplierStockConfirmed',
  'shippingToFranceConfirmed','importTaxesAndDdpReviewed','euProductComplianceVerified',
  'photoRightsVerified','merchantLegalAndCgvReady','returnsAndWarrantyReady',
  'independentPaymentAccountVerified','paymentWebhookReconciliationVerified',
  'independentCheckoutBackendVerified','encryptedShippingDataVerified',
  'catalogueSupplierVariantMapped',
  'automaticSupplierOrderVerified','automaticSupplierPaymentVerified',
  'supplierFundingAvailable','idempotenceAndFailureAlertsVerified'
];
const REQUIRED_COSTS=[
  'sellingPriceInclVatCents','supplierUnitCents','supplierShippingCents',
  'customsAndHandlingCents','nonRecoverableImportVatCents','paymentFixedCents',
  'packingCents','refundReserveCents','warrantyReserveCents',
  'supportReserveCents','otherVariableCostsCents'
];
const euroCents=(value,key)=>{
  if(!Number.isSafeInteger(value)||value<0)throw Error(key+': centimes entiers positifs ou nuls requis');
  return value;
};
const text=(value,key)=>{
  if(typeof value!=='string'||!value.trim())throw Error(key+': valeur obligatoire');
  return value.trim();
};
const date=(value,key)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||
    !Number.isFinite(Date.parse(value+'T00:00:00Z'))||
    new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)
    throw Error(key+': date ISO AAAA-MM-JJ obligatoire');
  return value;
};
const sumSafe=values=>{
  const total=values.reduce((acc,n)=>acc+n,0);
  if(!Number.isSafeInteger(total))throw Error('Total trop élevé pour être calculé exactement');
  return total;
};
export function evaluateDropshipOffer(record,{asOf=new Date().toISOString().slice(0,10)}={}){
  if(!record||typeof record!=='object'||Array.isArray(record)||record.version!==1)
    throw Error('Devis version 1 requis');
  const sku=text(record.catalogueId,'catalogueId');
  if(!/^[a-z0-9-]{4,64}$/.test(sku))throw Error('Identifiant catalogue invalide');
  text(record.supplierName,'supplierName');
  text(record.supplierSku,'supplierSku');
  text(record.quoteReference,'quoteReference');
  if(!['cj_wallet_api','verified_partner_api','manual'].includes(record.fulfilmentMode))
    throw Error('fulfilmentMode invalide');
  const issued=date(record.quotedOn,'quotedOn');
  const through=date(record.validThrough,'validThrough');
  const today=date(asOf,'asOf');
  if(through<issued)throw Error('Date de fin antérieure au devis');
  const costs=record.costs,proofs=record.proofs;
  if(!costs||typeof costs!=='object'||Array.isArray(costs))throw Error('Coûts détaillés requis');
  if(!proofs||typeof proofs!=='object'||Array.isArray(proofs))throw Error('Preuves requises');
  for(const name of REQUIRED_COSTS)euroCents(costs[name],name);
  if(Object.keys(proofs).some(name=>!REQUIRED_PROOFS.includes(name)))throw Error('Preuve inconnue : contrat de validation commerce indépendant');
  if(Object.keys(proofs).some(name=>typeof proofs[name]!=='boolean'))throw Error('Preuves : valeurs booléennes requises');
  for(const name of ['sellingVatBasisPoints','paymentFeeBasisPoints']){
    if(!Number.isSafeInteger(costs[name])||costs[name]<0||costs[name]>10000)
      throw Error(name+': taux en points de base de 0 à 10000 requis');
  }
  const gross=costs.sellingPriceInclVatCents;
  // Le montant payé par l'acheteur est *tout compris* (dont livraison client).
  // Un régime en franchise TVA peut être renseigné avec un taux de TVA facturée de 0.
  const sellerRevenueCents=Math.round(gross*10000/(10000+costs.sellingVatBasisPoints));
  const vatCollectedCents=gross-sellerRevenueCents;
  const paymentVariableCents=Math.ceil(gross*costs.paymentFeeBasisPoints/10000);
  const supplierTotalCents=sumSafe([
    costs.supplierUnitCents,costs.supplierShippingCents,costs.customsAndHandlingCents,
    costs.nonRecoverableImportVatCents
  ]);
  const paymentTotalCents=sumSafe([paymentVariableCents,costs.paymentFixedCents]);
  const allVariableCostsCents=sumSafe([
    supplierTotalCents,paymentTotalCents,costs.packingCents,costs.refundReserveCents,
    costs.warrantyReserveCents,costs.supportReserveCents,costs.otherVariableCostsCents
  ]);
  const contributionCents=sellerRevenueCents-allVariableCostsCents;
  const marginPercent=sellerRevenueCents>0?Math.round(contributionCents/sellerRevenueCents*10000)/100:0;
  const missingProofs=REQUIRED_PROOFS.filter(name=>proofs[name]!==true);
  const blockers=[];
  if(today<issued||today>through)blockers.push('Devis hors de sa période de validité');
  if(record.fulfilmentMode==='manual')blockers.push('Paiement fournisseur manuel : incompatible avec une commande entièrement automatique');
  if(missingProofs.length)blockers.push('Preuves commerciales, fiscales ou techniques manquantes');
  if(gross===0)blockers.push('Prix de vente nul');
  if(contributionCents<=0)blockers.push('Contribution après frais nulle ou négative');
  else if(marginPercent<25)blockers.push('Contribution inférieure au seuil interne de prudence de 25 %');
  return {
    catalogueId:sku,supplierSku:record.supplierSku,fulfilmentMode:record.fulfilmentMode,
    quoteValidThrough:through,customerTotalCents:gross,sellerVatCents:vatCollectedCents,
    sellerRevenueCents,supplierTotalCents,paymentTotalCents,allVariableCostsCents,
    contributionCents,contributionMarginPct:marginPercent,missingProofs,blockers,
    eligibleForMerchantReview:blockers.length===0,
    checkoutActivated:false,
    note:'Évaluation préparatoire uniquement. Le checkout ne peut être activé que par vérification distincte du compte marchand, du fournisseur et des obligations légales.'
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const filename=process.argv[2];
  if(!filename){
    console.error('Usage : node scripts/evaluate-dropship-offer.mjs chemin/devis-fournisseur-reel.json');
    process.exitCode=2;
  } else {
    try{
      const report=evaluateDropshipOffer(JSON.parse(readFileSync(filename,'utf8')));
      console.log(JSON.stringify(report,null,2));
      if(!report.eligibleForMerchantReview)process.exitCode=1;
    }catch(error){console.error('Devis invalide : '+error.message);process.exitCode=2;}
  }
}
