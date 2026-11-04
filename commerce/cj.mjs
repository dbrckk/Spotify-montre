import {usdToCents,computeCjFreightCents,computeCjLandedCents,checkCjFxCeiling} from './landed-cost.mjs';
// CJdropshipping OpenAPI v2. All calls are server-side; no credentials/client data in browser.
const ROOT='https://developers.cjdropshipping.com/api2.0/v1';
function assertToken(token){
  if(typeof token!=='string'||token.length<20||/[\s\r\n]/.test(token))
    throw Error('CJ-Access-Token unavailable');
}
/** Exchange the operator's private CJ API key for a transient access token.
 * Never print or persist either value. Only the manual read-only discovery
 * workflow uses this helper; merchant purchasing still has a separate gate.
 */
export async function obtainCjAccessToken({apiKey,fetcher=fetch}){
  if(typeof apiKey!=='string'||apiKey.length<20||apiKey.length>200||
    /\s/.test(apiKey))
    throw Error('CJ API key unavailable');
  const response=await fetcher(ROOT+'/authentication/getAccessToken',{
    method:'POST',redirect:'error',headers:{
      'Content-Type':'application/json','Accept':'application/json'
    },body:JSON.stringify({apiKey}),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('CJ authentication HTTP error');
  const result=await response.json();
  if(result?.code!==200||result?.result!==true||result?.success===false)
    throw Error('CJ account did not authorize access');
  const token=result?.data?.accessToken;
  assertToken(token);
  return token;
}
function validOrder(order,customer){
  if(!/^ord_[a-f0-9]{40}$/.test(order?.id||''))throw Error('Invalid internal supplier order reference');
  if(typeof order.supplier_vid!=='string'||!/^[\w-]{3,100}$/.test(order.supplier_vid))
    throw Error('CJ variant not verified');
  // Never allow a supplier purchase from a legacy order with no identity
  // snapshots, even if somebody skips the earlier checkout preflight.
  for(const key of ['supplier_pid','supplier_variant_sku','supplier_product_sku']){
    if(typeof order[key]!=='string'||!/^[a-zA-Z0-9_-]{3,100}$/.test(order[key]))
      throw Error('CJ supplier identity snapshot missing');
  }
  if(typeof order.logistics_name!=='string'||order.logistics_name.length<3||order.logistics_name.length>50)
    throw Error('CJ logistics method not verified');
  if(!/^[A-Z]{2}$/.test(order.from_country_code))throw Error('Shipping origin not verified');
  if(!Number.isSafeInteger(order.supplier_max_usd_cents)||order.supplier_max_usd_cents<=0)
    throw Error('Supplier cost ceiling unavailable');
  if(customer?.countryCode!=='FR'||!customer?.fullName||!customer?.address1||!customer?.postalCode||!customer?.city||!customer?.region)
    throw Error('Customer shipping address not verified');
}
async function api(path,token,{method='GET',body,fetcher=fetch}={}){
  assertToken(token);
  const response=await fetcher(ROOT+path,{method,redirect:'error',headers:{
    'CJ-Access-Token':token,'Content-Type':'application/json','Accept':'application/json'
  },...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('CJ API returned HTTP error');
  const data=await response.json();
  if(data?.success===false||data?.result!==true||data?.code!==200)
    throw Error('CJ API did not confirm success');
  return data.data;
}
// Refuse payment before an up-to-date inventory and French postage quote exists.
export async function preflightCjDelivery({vid,originCountry='CN',postalCode,
  logisticsName,maxSupplierUsdCents,maxSupplierEurCents,fxMaxEurPerUsdBps,
  expectedPid,expectedVariantSku,expectedProductSku,accessToken,fetcher=fetch}){
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(vid||'')||!/^[A-Z]{2}$/.test(originCountry||'')
    ||!/^[0-9]{5}$/.test(postalCode||'')||!/^[^\r\n]{3,50}$/.test(logisticsName||''))
    throw Error('Supplier or delivery data invalid');
  if(!Number.isSafeInteger(maxSupplierUsdCents)||maxSupplierUsdCents<=0)throw Error('Supplier limit absent');
  // Legacy tests may omit identity pins. The live checkout and supplier worker
  // always pass all three pins from the offer/order snapshots.
  const pins=[expectedPid,expectedVariantSku,expectedProductSku];
  const pinned=pins.some(x=>x!==undefined);
  if(pinned&&!pins.every(x=>typeof x==='string'&&
    /^[a-zA-Z0-9_-]{3,100}$/.test(x)))
    throw Error('Complete pinned CJ parent and SKU identity required');
  const variant=await api('/product/variant/queryByVid?vid='+encodeURIComponent(vid),
    accessToken,{fetcher});
  if(variant?.vid!==vid)throw Error('Supplier variant identity mismatch');
  if(pinned){
    if(variant.pid!==expectedPid||variant.variantSku!==expectedVariantSku)
      throw Error('Supplier PID or variant SKU changed: refuse payment');
    const parent=await api('/product/query?pid='+encodeURIComponent(expectedPid),
      accessToken,{fetcher});
    if(parent?.pid!==expectedPid||parent?.productSku!==expectedProductSku)
      throw Error('Supplier parent product SKU changed: refuse payment');
  }
  const productCostUsdCents=usdToCents(variant.variantSellPrice);
  if(productCostUsdCents<=0)throw Error('Supplier product price unavailable');
  const stock=await api('/product/stock/queryByVid?vid='+encodeURIComponent(vid),
    accessToken,{fetcher});
  if(!Array.isArray(stock)||!stock.some(row=>row?.countryCode===originCountry&&
    row?.vid===vid&&Number.isInteger(row.cjInventoryNum)&&row.cjInventoryNum>=1))
    throw Error('Supplier warehouse inventory unavailable: do not accept payment');
  const freight=await api('/logistic/freightCalculate',accessToken,{
    method:'POST',body:{startCountryCode:originCountry,endCountryCode:'FR',
      zip:postalCode,products:[{quantity:1,vid}]},fetcher
  });
  if(!Array.isArray(freight))throw Error('Supplier freight response invalid');
  const candidate=freight.find(x=>x.logisticName===logisticsName);
  if(!candidate)throw Error('No confirmed delivery method to this French postcode');
  // CJ totalPostageFee already includes duties/taxes/clearance.
  // A missing tariff or tax value is not proof that the fee is zero.
  const freightBreakdown=computeCjFreightCents(candidate);
  const shippingAndTaxes=freightBreakdown.freightAndImportUsdCents;
  const landedUsdCents=computeCjLandedCents(productCostUsdCents,freightBreakdown);
  if(landedUsdCents>maxSupplierUsdCents)
    throw Error('Supplier product, freight or customs exceed total approved budget');
  // Money guard at BOTH payment creation and irreversible supplier purchase.
  // Use the verified upper exchange bound, not an assumed 1 USD = 1 EUR.
  const fx=checkCjFxCeiling(landedUsdCents,fxMaxEurPerUsdBps,maxSupplierEurCents);
  const balance=await getCjBalance({accessToken,fetcher});
  if(balance<maxSupplierUsdCents)throw Error('Supplier wallet insufficient for a new sale');
  return {productUsdCents:productCostUsdCents,freightUsdCents:shippingAndTaxes,
    landedUsdCents,upperLandedEurCents:fx.upperEurCents,
    balanceUsdCents:balance,freightBreakdown,
    supplierPid:pinned?expectedPid:null,
    supplierVariantSku:pinned?expectedVariantSku:null,
    supplierProductSku:pinned?expectedProductSku:null,
    logisticsName,stockConfirmed:true};
}

/**
 * Read-only supplier discovery for the first real model.
 * No pricing assumptions, no customer address, no wallet requirement and,
 * crucially, no CJ order/payment write endpoint.
 * A single metropolitan French postcode is only a sample, not national coverage.
 */
export async function discoverCjVariant({vid,postalCode,originCountry='CN',
  accessToken,expectedPid,fetcher=fetch}){
  if(typeof vid!=='string'||!/^[a-zA-Z0-9_-]{3,100}$/.test(vid)||
    (expectedPid!==undefined&&
      (typeof expectedPid!=='string'||!/^[a-zA-Z0-9_-]{3,100}$/.test(expectedPid)))||
    typeof postalCode!=='string'||!/^[0-9]{5}$/.test(postalCode)||
    /^(?:97|98)/.test(postalCode)||
    originCountry!=='CN')
    throw Error('Provide exact CJ VID and a metropolitan French postcode; CN warehouse pilot only');
  // CJ account limits can be as low as 1 request/second. Synthetic CI
  // fetchers bypass waiting; real calls are paced conservatively.
  let lastRequestAt=0;
  const supplierFetcher=fetcher===fetch?async(url,options)=>{
    const remaining=1100-(Date.now()-lastRequestAt);
    if(lastRequestAt&&remaining>0)
      await new Promise(resolve=>setTimeout(resolve,remaining));
    lastRequestAt=Date.now();
    return fetcher(url,options);
  }:fetcher;
  const v=await api('/product/variant/queryByVid?vid='+encodeURIComponent(vid),
    accessToken,{fetcher:supplierFetcher});
  if(v?.vid!==vid)throw Error('CJ variant identity does not match requested VID');
  const productUsdCents=usdToCents(v.variantSellPrice);
  if(productUsdCents<=0)throw Error('CJ variant price is not available');
  // The catalog listing can be stale or refer to a different parent product.
  // The dedicated VID endpoint is authoritative for the exact variant.
  // Refuse to spend more points on stock/freight for mismatched pairings.
  const canonicalPid=typeof v.pid==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(v.pid)?
    v.pid:null;
  const catalogPidMatched=expectedPid===undefined?null:canonicalPid===expectedPid;
  if(catalogPidMatched===false){
    return {vid,canonicalPid,catalogPid:expectedPid,catalogPidMatched:false,
      variantSku:typeof v.variantSku==='string'&&v.variantSku.length<=100?
        v.variantSku:null,
      productUsdCents,stockConfirmed:false,stockChecked:false,
      shippingMethods:[],excludedIncompleteShippingOptions:0,
      state:'catalog_identity_mismatch',sampleOnly:true,approvedForSale:false,
      requiresLegalReview:true,
      notice:'Supplier VID belongs to another or an unknown parent. Stock and freight were intentionally not checked.'};
  }
  const inventory=await api('/product/stock/queryByVid?vid='+encodeURIComponent(vid),
    accessToken,{fetcher:supplierFetcher});
  if(!Array.isArray(inventory))throw Error('CJ inventory payload invalid');
  const warehouseRows=inventory.filter(x=>x?.countryCode===originCountry&&x?.vid===vid&&
    Number.isInteger(x.cjInventoryNum)&&x.cjInventoryNum>=0);
  const stockConfirmed=warehouseRows.some(x=>x.cjInventoryNum>=1);
  const base={
    vid,variantSku:typeof v.variantSku==='string'&&v.variantSku.length<=100?v.variantSku:null,
    variantName:typeof v.variantNameEn==='string'&&v.variantNameEn.length<=120&&
      !/[\u0000-\u001f\u007f]/.test(v.variantNameEn)?v.variantNameEn:null,
    originCountry,postalCode,productUsdCents,
    canonicalPid,catalogPid:expectedPid??null,catalogPidMatched,
    stockChecked:true,stockConfirmed,warehouseRows:warehouseRows.length,
    sampleOnly:true,approvedForSale:false,requiresLegalReview:true,
    shippingMethods:[],excludedIncompleteShippingOptions:0,
    shippingQuoteDiagnostics:null,shippingRouteSamples:[],
    notice:'Read-only CJ estimate for one postcode: not a verified watch, seller offer, tax conclusion or checkout approval.'
  };
  // Avoid spending further CJ API points on transport when supplier has no stock.
  if(!stockConfirmed)return base;
  const raw=await api('/logistic/freightCalculate',accessToken,{
    method:'POST',body:{startCountryCode:originCountry,endCountryCode:'FR',
      zip:postalCode,products:[{quantity:1,vid}]},fetcher:supplierFetcher
  });
  if(!Array.isArray(raw))throw Error('CJ freight payload invalid');
  const byName=new Map();
  let incomplete=0;
  // Only fixed diagnostic keys and public courier names are reported. Never
  // serialize raw CJ objects: unknown fields may contain private data.
  const diagnostics={optionsReturned:raw.length,missingImportFields:0,
    missingShippingRate:0,invalidCarrier:0,invalidAmounts:0,
    conflictingCarrierRates:0};
  const routeSamples=[];
  const absent=value=>value===undefined||value===null||value==='';
  for(const method of raw){
    const name=method?.logisticName;
    if(typeof name!=='string'||name.length<3||name.length>50||
      /[\u0000-\u001f\u007f]/.test(name)){
      diagnostics.invalidCarrier++;
      incomplete++;continue;
    }
    const missingImport=['taxesFee','clearanceOperationFee','tariff']
      .filter(key=>absent(method?.[key]));
    const noRate=absent(method?.totalPostageFee)&&absent(method?.logisticPrice);
    let baseShippingUsdCents=null;
    if(!absent(method?.logisticPrice)){
      try{baseShippingUsdCents=usdToCents(method.logisticPrice)}catch{}
    }
    // baseShippingUsdCents is NOT an all-in postage/tax quote.
    const sample={carrier:name,baseShippingUsdCents,
      missingImportFields:missingImport,
      validation:missingImport.length?'missing_import_fields':
        noRate?'missing_shipping_rate':'needs_validation'};
    if(routeSamples.length<8)routeSamples.push(sample);
    if(missingImport.length){
      diagnostics.missingImportFields++;
      incomplete++;continue;
    }
    if(noRate){
      diagnostics.missingShippingRate++;
      incomplete++;continue;
    }
    try{
      const breakdown=computeCjFreightCents(method);
      const landedUsdCents=computeCjLandedCents(productUsdCents,breakdown);
      const entry={logisticsName:name,
        freightAndImportUsdCents:breakdown.freightAndImportUsdCents,
        landedUsdCents,
        taxesUsdCents:breakdown.taxesUsdCents,
        tariffUsdCents:breakdown.tariffUsdCents,
        clearanceUsdCents:breakdown.clearanceUsdCents};
      if(byName.has(name)){
        // CJ order preflight identifies carriers by name. If one name maps to
        // different prices, no unambiguous purchase method can be selected.
        const old=byName.get(name);
        if(old&&old.landedUsdCents!==entry.landedUsdCents){
          byName.set(name,null);
          diagnostics.conflictingCarrierRates++;
          incomplete++;
        }
      }else byName.set(name,entry);
    }catch{
      diagnostics.invalidAmounts++;
      incomplete++;
      if(routeSamples.length&&routeSamples[routeSamples.length-1]===sample)
        sample.validation='invalid_or_inconsistent_amounts';
    }
  }
  const methods=[...byName.values()].filter(Boolean);
  methods.sort((a,b)=>a.landedUsdCents-b.landedUsdCents||
    a.logisticsName.localeCompare(b.logisticsName));
  return {...base,shippingMethods:methods.slice(0,12),
    shippingMethodsAvailable:methods.length,
    excludedIncompleteShippingOptions:incomplete,
    shippingQuoteDiagnostics:diagnostics,shippingRouteSamples:routeSamples};
}

export async function getCjBalance({accessToken,fetcher=fetch}){
  const data=await api('/shopping/pay/getBalance',accessToken,{fetcher});
  return usdToCents(data?.amount);
}
export function buildCjOrder(order,customer){
  validOrder(order,customer);
  // payType=2 is CJ balance auto-payment; NEVER use the deprecated cjPayUrl.
  return {
    orderNumber:order.id,shippingZip:customer.postalCode,
    shippingCountry:'France',shippingCountryCode:'FR',
    shippingProvince:customer.region,shippingCity:customer.city,
    shippingCustomerName:customer.fullName,shippingAddress:customer.address1,
    shippingAddress2:customer.address2||'',
    shippingPhone:customer.phone||'',
    email:customer.email?.slice(0,50)||'',
    payType:2,orderFlow:1,logisticName:order.logistics_name,
    fromCountryCode:order.from_country_code,
    products:[{vid:order.supplier_vid,quantity:1,storeLineItemId:order.id}]
  };
}
export async function submitCjBalanceOrder({order,customer,accessToken,authorizeBeforeDebit,fetcher=fetch}){
  if(typeof authorizeBeforeDebit!=='function')
    throw Error('Final buyer payment authorization required before CJ debit');
  const body=buildCjOrder(order,customer);
  const balance=await getCjBalance({accessToken,fetcher});
  if(balance<order.supplier_max_usd_cents)
    throw Error('Insufficient pre-funded supplier balance: delivery requires manual review');
  // Last operation immediately before POST: authenticated Mollie re-verification
  // and durable local state check. A failed callback must NEVER create a CJ order.
  await authorizeBeforeDebit();
  const data=await api('/shopping/order/createOrderV2',accessToken,{
    method:'POST',body,fetcher
  });
  // A 200 response alone does NOT confirm supplier payment or dispatch.
  if(data?.orderNumber!==order.id||!data.orderId)
    throw Error('CJ order response mismatch: manual reconciliation required');
  let actualCents=null;
  if(data.actualPayment!==undefined&&data.actualPayment!==null&&data.actualPayment!=='')
    actualCents=usdToCents(data.actualPayment);
  if(actualCents!==null&&actualCents>order.supplier_max_usd_cents)
    throw Error('CJ supplier charge exceeded the approved ceiling; investigate payment immediately');
  return {supplierId:String(data.orderId),orderNumber:order.id,
    supplierStatus:String(data.orderStatus||'UNKNOWN'),reportedCostUsdCents:actualCents};
}
export async function fetchCjOrder({orderId,accessToken,fetcher=fetch}){
  if(typeof orderId!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId))
    throw Error('Invalid CJ order identifier');
  const value=await api('/shopping/order/getOrderDetail?orderId='+encodeURIComponent(orderId),accessToken,{fetcher});
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid CJ order detail');
  return value;
}
