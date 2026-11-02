/**
 * Currency-safe CJ quote normalization. The CJ Logistics API documents
 * totalPostageFee = base carriage + tax + clearance + tariff (after discounts).
 * Adding taxes AGAIN to totalPostageFee would incorrectly double count them.
 *
 * All costs must have an explicit meaning; missing import fees fail closed.
 * https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
 */
export function usdToCents(value,label='USD amount'){
  if(value===undefined||value===null||value==='')throw Error(label+' is missing');
  if(!['string','number'].includes(typeof value))throw Error(label+' is not numeric');
  const s=String(value);
  if(!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(s))
    throw Error(label+' must be a nonnegative USD value with at most 2 decimals');
  const [d,c='']=s.split('.');
  const cents=Number(d)*100+Number(c.padEnd(2,'0'));
  if(!Number.isSafeInteger(cents))throw Error(label+' exceeds safe limits');
  return cents;
}
const MAX_CENTS=1_000_000_000;
export function computeCjFreightCents(option){
  if(!option||typeof option!=='object'||Array.isArray(option))
    throw Error('No CJ freight option');
  if(typeof option.logisticName!=='string'||!option.logisticName.trim())
    throw Error('No actual shipping provider name');
  const taxes=usdToCents(option.taxesFee,'CJ taxesFee');
  const clearance=usdToCents(option.clearanceOperationFee,'CJ clearanceOperationFee');
  const tariff=usdToCents(option.tariff,'CJ tariff');
  const declaredFees=taxes+clearance+tariff;
  if(!Number.isSafeInteger(declaredFees)||declaredFees>MAX_CENTS)
    throw Error('CJ import fees out of range');
  let shippingCents,totalCents,mode;
  if(option.totalPostageFee!==undefined&&option.totalPostageFee!==null&&option.totalPostageFee!==''){
    // CJ documents this amount as ALREADY INCLUDING all duty/tax/clearance.
    totalCents=usdToCents(option.totalPostageFee,'CJ totalPostageFee');
    if(totalCents<declaredFees)throw Error('CJ inclusive postage contradicts import fees');
    shippingCents=totalCents-declaredFees;
    mode='inclusive_postage';
  }else{
    // For legacy simple rates, logisticPrice is carriage only.
    shippingCents=usdToCents(option.logisticPrice,'CJ logisticPrice');
    totalCents=shippingCents+declaredFees;
    mode='base_plus_import_fees';
  }
  if(!Number.isSafeInteger(totalCents)||totalCents>MAX_CENTS)
    throw Error('CJ freight and import quote out of range');
  return {
    mode,shippingUsdCents:shippingCents,taxesUsdCents:taxes,
    clearanceUsdCents:clearance,tariffUsdCents:tariff,
    freightAndImportUsdCents:totalCents
  };
}
export function computeCjLandedCents(productCostCents,freight){
  if(!Number.isSafeInteger(productCostCents)||productCostCents<=0)
    throw Error('CJ product cost unavailable');
  if(!Number.isSafeInteger(freight?.freightAndImportUsdCents)
    ||freight.freightAndImportUsdCents<0)
    throw Error('CJ freight breakdown unavailable');
  const total=productCostCents+freight.freightAndImportUsdCents;
  if(!Number.isSafeInteger(total)||total>MAX_CENTS)
    throw Error('CJ landed amount out of range');
  return total;
}
/**
 * Published EUR margin guard: approved max includes supplier goods,
 * shipping, all duties and a documented FX risk cushion.
 * The selling VAT and remaining payment/return costs are accounted for
 * separately in merchant revenue and reserves.
 */
export function validateCommercialCeiling(offer){
  const {amount_eur_cents:sale,
    supplier_landed_eur_ceiling_cents:landed,
    reserves_eur_cents:reserves,
    unit_cost_eur_cents:unit,
    vat_rate_bps:vatBps,
    tax_treatment_verified:taxVerified,
    supplier_fx_verified:fxVerified}=offer||{};
  if(![sale,landed,reserves,unit,vatBps].every(Number.isSafeInteger)
    ||sale<=0||landed<=0||reserves<0||unit<0)
    throw Error('Real EUR supplier ceiling and costs are required');
  if(vatBps<0||vatBps>3000||taxVerified!==true||fxVerified!==true)
    throw Error('Seller VAT treatment and supplier FX reserve not validated');
  if(landed<unit)throw Error('All-in supplier ceiling cannot be below unit cost');
  const sellerNetRevenueCents=Math.round(sale*10000/(10000+vatBps));
  const margin=sellerNetRevenueCents-landed-reserves;
  if(margin<=0)throw Error('The fully landed supplier cost leaves no contribution');
  if(margin*10000<sellerNetRevenueCents*2500)
    throw Error('Contribution is below required 25 percent of seller net revenue');
  return {grossEurCents:sale,sellerNetRevenueCents,
    maxLandedEurCents:landed,reserveEurCents:reserves,
    provisionalContributionEurCents:margin,
    provisionalContributionMarginPct:Math.round(margin*10000/sellerNetRevenueCents)/100};
}
