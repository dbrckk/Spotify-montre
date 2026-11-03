import {usdToCents,computeCjFreightCents,computeCjLandedCents,checkCjFxCeiling} from './landed-cost.mjs';
// CJdropshipping OpenAPI v2. All calls are server-side; no credentials/client data in browser.
const ROOT='https://developers.cjdropshipping.com/api2.0/v1';
function assertToken(token){
  if(typeof token!=='string'||token.length<20||/[\s\r\n]/.test(token))
    throw Error('CJ-Access-Token unavailable');
}
function validOrder(order,customer){
  if(!/^ord_[a-f0-9]{40}$/.test(order?.id||''))throw Error('Invalid internal supplier order reference');
  if(typeof order.supplier_vid!=='string'||!/^[\w-]{3,100}$/.test(order.supplier_vid))
    throw Error('CJ variant not verified');
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
  accessToken,fetcher=fetch}){
  if(!/^[a-zA-Z0-9_-]{3,100}$/.test(vid||'')||!/^[A-Z]{2}$/.test(originCountry||'')
    ||!/^[0-9]{5}$/.test(postalCode||'')||!/^[^\r\n]{3,50}$/.test(logisticsName||''))
    throw Error('Supplier or delivery data invalid');
  if(!Number.isSafeInteger(maxSupplierUsdCents)||maxSupplierUsdCents<=0)throw Error('Supplier limit absent');
  const variant=await api('/product/variant/queryByVid?vid='+encodeURIComponent(vid),
    accessToken,{fetcher});
  if(variant?.vid!==vid)throw Error('Supplier variant identity mismatch');
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
    logisticsName,stockConfirmed:true};
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
export async function submitCjBalanceOrder({order,customer,accessToken,fetcher=fetch}){
  const body=buildCjOrder(order,customer);
  const balance=await getCjBalance({accessToken,fetcher});
  if(balance<order.supplier_max_usd_cents)
    throw Error('Insufficient pre-funded supplier balance: delivery requires manual review');
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
