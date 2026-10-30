import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

/**
 * Supplier quote evaluation, not a checkout or an order system.
 * Amounts are EUR, including non-recoverable import taxes only when appropriate.
 * The input must be a real quote with documented assumptions; no default costs.
 */
const checks=[
  'supplierIdentity','sampleTested','materialSpecifications','batchTraceability',
  'gpsrRiskAssessment','euResponsibleOperator','customsAndVatReviewed',
  'batteryAndWasteCompliance','commercialImageRights','sellerRegistration',
  'customerReturnsProcess','warrantyAndRecallProcess'
];
const money = x=>Math.round((x+Number.EPSILON)*100)/100;
const amt = (v,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error(name+' : montant EUR non négatif obligatoire');return v};
export function evaluateSupplierQuote(data) {
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Document de devis invalide');
  if(typeof data.reference!=='string'||!data.reference.trim())throw Error('Référence du modèle requise');
  if(typeof data.supplierName!=='string'||!data.supplierName.trim())throw Error('Identité du fournisseur requise');
  if(data.originCountry!=='CN')throw Error('Ce processus concerne les fournisseurs basés en Chine (CN)');
  const order=data.order,sale=data.sale,evidence=data.evidence;
  if(!order||!sale||!evidence||typeof evidence!=='object')throw Error('Order, sale et evidence requis');
  if(!Number.isSafeInteger(order.quantity)||order.quantity<=0)throw Error('Quantité entière positive requise');
  const price=amt(sale.retailPriceInclVatEur,'retailPriceInclVatEur');
  const vat=amt(sale.outputVatRate,'outputVatRate');
  const fee=amt(sale.paymentRate,'paymentRate');
  if(vat>1||fee>1)throw Error('Les taux doivent être compris entre 0 et 1');
  const landed=amt(order.unitFactoryPriceEur,'unitFactoryPriceEur')+
    (amt(order.freightEur,'freightEur')+amt(order.customsDutyEur,'customsDutyEur')+
    amt(order.inspectionEur,'inspectionEur')+amt(order.packagingEur,'packagingEur')+
    amt(order.otherImportCostsEur,'otherImportCostsEur')+
    amt(order.nonRecoverableImportVatEur,'nonRecoverableImportVatEur'))/order.quantity;
  const expenses=landed+amt(sale.paymentFeeFixedEur,'paymentFeeFixedEur')+
    price*fee+amt(sale.shippingAndPackingPerUnitEur,'shippingAndPackingPerUnitEur')+
    amt(sale.marketingPerSaleEur,'marketingPerSaleEur')+
    amt(sale.warrantyReservePerUnitEur,'warrantyReservePerUnitEur')+
    amt(sale.returnsReservePerUnitEur,'returnsReservePerUnitEur');
  const netRevenue=price/(1+vat);
  const contribution=netRevenue-expenses;
  const missing=checks.filter(c=>evidence[c]!==true);
  const blockers=[];
  if(landed>20)blockers.push('Coût rendu unitaire supérieur à la cible de 20 €');
  if(contribution<=0)blockers.push('Marge de contribution nulle ou négative');
  if(missing.length)blockers.push('Documents et contrôles réglementaires manquants');
  return {
    reference:data.reference,supplierName:data.supplierName,quantity:order.quantity,
    landedCostEur:money(landed),netRevenueEur:money(netRevenue),
    allInVariableCostEur:money(expenses),contributionPerUnitEur:money(contribution),
    contributionMarginPct:netRevenue>0?money(contribution/netRevenue*100):0,
    missingEvidence:missing,blockers,
    eligibleForCommercialReview:blockers.length===0,
    note:'Audit préparatoire uniquement : ne constitue ni une validation réglementaire définitive, ni une autorisation de mise en vente.'
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file=process.argv[2];
  if(!file){console.error('Usage: node scripts/evaluate-supplier.mjs chemin/devis-reel.json');process.exitCode=2;}
  else {
    try {
      const result=evaluateSupplierQuote(JSON.parse(readFileSync(file,'utf8')));
      console.log(JSON.stringify(result,null,2));
      if(!result.eligibleForCommercialReview)process.exitCode=1;
    } catch(error){console.error('Devis invalide : '+error.message);process.exitCode=2;}
  }
}
