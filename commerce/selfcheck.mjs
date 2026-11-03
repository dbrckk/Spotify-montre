import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {newOrderId,newPublicToken,sealAddress,openAddress,digest,sameHash,
  validateCheckoutBody,checkoutFingerprint,readWebhookBody,recoveryToken,restoredCheckoutState} from './security.mjs';
import {buildCjOrder,getCjBalance,submitCjBalanceOrder,fetchCjOrder,preflightCjDelivery} from './cj.mjs';
import {verifyCjOrderDetail} from './cj-status.mjs';
import {usdToCents,computeCjFreightCents,computeCjLandedCents,checkCjFxCeiling,validateCommercialCeiling} from './landed-cost.mjs';

const key='a1'.repeat(32);
const customer={fullName:'Test Client',email:'test@example.fr',address1:'12 rue des Montres',
  address2:'',postalCode:'75002',city:'Paris',region:'Île-de-France',
  countryCode:'FR',phone:'+33123456789'};
const input={offerId:'watch-test1',quantity:1,idempotencyKey:'ABC123-456def789-GHI',
  acceptTerms:true,...customer};
const verified=validateCheckoutBody(input);
assert.deepEqual(verified.customer,customer);
assert.equal(verified.quantity,1);
assert.match(newOrderId(),/^ord_[a-f0-9]{40}$/);
assert.ok(newPublicToken().length>=40);
// Retrying the same checkout must reuse access credentials and NOT charge twice.
const attemptSecret='S'.repeat(64);
const resumeToken=recoveryToken(attemptSecret,verified.idempotencyKey);
assert.equal(resumeToken,recoveryToken(attemptSecret,verified.idempotencyKey));
assert.notEqual(resumeToken,recoveryToken(attemptSecret,'another-cryptographically-random-attempt'));
const persistedCheckout={id:newOrderId(),public_token_hash:digest(resumeToken),
  amount_eur_cents:5990,status:'PAYMENT_PENDING',
  payment_checkout_url:'https://www.mollie.com/checkout/select-method/ABCD'};
const firstRetry=restoredCheckoutState(persistedCheckout,resumeToken);
assert.equal(firstRetry.kind,'payment');
assert.equal(firstRetry.reused,true);
assert.equal(firstRetry.checkoutUrl,persistedCheckout.payment_checkout_url);
assert.equal(restoredCheckoutState({...persistedCheckout,status:'PAID'},resumeToken).kind,'status');
assert.equal(restoredCheckoutState({...persistedCheckout,
  payment_checkout_url:'https://untrusted.example/collect'},resumeToken).kind,'status');
assert.throws(()=>restoredCheckoutState(persistedCheckout,'invalid'),/ne peut pas être récupérée/);
const cipher1=sealAddress(customer,key),cipher2=sealAddress(customer,key);
assert.notEqual(cipher1,cipher2,'fresh AES-GCM nonces are required');
assert.deepEqual(openAddress(cipher1,key),customer);
const parts=cipher1.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
assert.throws(()=>openAddress(parts.join('.'),key));
assert.ok(sameHash(digest('x'),digest('x')));
assert.ok(!sameHash(digest('x'),digest('y')));
const plus={...input,city:'Lyon'};
assert.notEqual(checkoutFingerprint(verified),checkoutFingerprint(validateCheckoutBody(plus)));
for(const change of [
  {acceptTerms:false},{quantity:2},{countryCode:'US'},
  {postalCode:'97400'},{postalCode:'7500X'},{email:'not-mail'},
  {address1:'\r\nInjected header'},{idempotencyKey:'short'}
])assert.throws(()=>validateCheckoutBody({...input,...change}));
assert.equal(await readWebhookBody(Object.assign(Readable.from(['id=tr_5B8cwPMGnU6qLbRvo7qEZo']),{headers:{}})),
  'tr_5B8cwPMGnU6qLbRvo7qEZo');
await assert.rejects(readWebhookBody(Object.assign(Readable.from(['id=tr_one123456789&id=tr_two123456789']),{headers:{}})));

const order={id:newOrderId(),supplier_vid:'92511400-C758-4474-93CA-66D442F5F787',
  logistics_name:'PostNL',from_country_code:'CN',supplier_max_usd_cents:2500};
const payload=buildCjOrder(order,customer);
assert.equal(payload.payType,2);
assert.equal(payload.orderFlow,1);
assert.equal(payload.shippingCountryCode,'FR');
assert.equal(payload.shippingAddress,customer.address1);
assert.deepEqual(payload.products,[{vid:order.supplier_vid,quantity:1,storeLineItemId:order.id}]);
assert.ok(!Object.hasOwn(payload,'cjPayUrl'));
let calls=[];
const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/shopping/pay/getBalance'))
    return {ok:true,json:async()=>({code:200,result:true,success:true,data:{amount:100.75}})};
  if(url.endsWith('/shopping/order/createOrderV2')){
    const body=JSON.parse(options.body);
    assert.equal(body.orderNumber,order.id);
    assert.equal(body.payType,2);
    assert.equal(options.headers['CJ-Access-Token'],'a'.repeat(40));
    return {ok:true,json:async()=>({code:200,result:true,success:true,
      data:{orderId:'2608010710340327100',orderNumber:order.id,orderStatus:'UNSHIPPED',actualPayment:'18.50'}})};
  }
  if(url.includes('/shopping/order/getOrderDetail?orderId='))
    return {ok:true,json:async()=>({code:200,result:true,success:true,
      data:{orderNum:order.id,orderStatus:'SHIPPED',trackNumber:'TRACKED1000',paymentDate:'2026-11-02 15:00:00'}})};
  throw Error('Unexpected provider request');
};
assert.equal(await getCjBalance({accessToken:'a'.repeat(40),fetcher}),10075);
const submitted=await submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),authorizeBeforeDebit:async()=>{},fetcher});
assert.equal(submitted.supplierId,'2608010710340327100');
assert.equal(submitted.reportedCostUsdCents,1850);
assert.equal(submitted.supplierStatus,'UNSHIPPED');
assert.equal(calls.filter(x=>x.url.endsWith('createOrderV2')).length,1);
const detail=await fetchCjOrder({orderId:submitted.supplierId,accessToken:'a'.repeat(40),fetcher});
assert.equal(detail.orderStatus,'SHIPPED');
const noBalance=async(url)=>({ok:true,json:async()=>({code:200,result:true,success:true,
  data:{amount:0.5}})});
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),authorizeBeforeDebit:async()=>{},fetcher:noBalance}),/Insufficient/);
const incorrect=async(url)=>{
  if(url.endsWith('/getBalance'))return {ok:true,json:async()=>({code:200,result:true,success:true,data:{amount:200}})};
  return {ok:true,json:async()=>({code:200,result:true,success:true,data:{orderId:'1',orderNumber:'WRONG',actualPayment:'1.00'}})};
};
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),authorizeBeforeDebit:async()=>{},fetcher:incorrect}),/mismatch/);
const expensive=async(url)=>{
  if(url.endsWith('/getBalance'))return {ok:true,json:async()=>({code:200,result:true,success:true,data:{amount:200}})};
  return {ok:true,json:async()=>({code:200,result:true,success:true,
    data:{orderId:'1',orderNumber:order.id,actualPayment:'25.01'}})};
};
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),authorizeBeforeDebit:async()=>{},fetcher:expensive}),/exceeded/);

const supplierPreflight=async(url,options)=>{
  if(url.includes('/product/variant/queryByVid'))return {ok:true,json:async()=>({
    code:200,result:true,data:{vid:order.supplier_vid,variantSellPrice:11.3}
  })};
  if(url.includes('/product/stock/queryByVid'))return {ok:true,json:async()=>({
    code:200,result:true,data:[{vid:order.supplier_vid,countryCode:'CN',cjInventoryNum:7}]
  })};
  if(url.endsWith('/logistic/freightCalculate')){
    const request=JSON.parse(options.body);
    assert.equal(request.zip,'75002');
    assert.equal(request.endCountryCode,'FR');
    assert.equal(request.products[0].vid,order.supplier_vid);
    return {ok:true,json:async()=>({code:200,result:true,data:[
      {logisticName:'PostNL',logisticPrice:3.1,totalPostageFee:4.4,taxesFee:0.85,clearanceOperationFee:0.45,tariff:0}
    ]})};
  }
  if(url.endsWith('/shopping/pay/getBalance'))return {ok:true,json:async()=>({
    code:200,result:true,data:{amount:31.0}
  })};
  throw Error('unexpected preflight endpoint');
};
const ready=await preflightCjDelivery({
  vid:order.supplier_vid,originCountry:'CN',postalCode:'75002',
  logisticsName:'PostNL',maxSupplierUsdCents:2500,
  maxSupplierEurCents:2390,fxMaxEurPerUsdBps:10500,
  accessToken:'a'.repeat(40),
  fetcher:supplierPreflight
});
assert.equal(ready.productUsdCents,1130);
assert.equal(ready.freightUsdCents,440);
assert.equal(ready.balanceUsdCents,3100);
assert.equal(ready.upperLandedEurCents,1649);
assert.equal(checkCjFxCeiling(1570,10500,2390).upperEurCents,1649);
assert.equal(checkCjFxCeiling(1,10500,2).upperEurCents,2);
assert.throws(()=>checkCjFxCeiling(1570,0,2390),/Verified USD\/EUR/);
assert.throws(()=>checkCjFxCeiling(2500,10500,2390),/exceeds EUR landed budget/);
await assert.rejects(preflightCjDelivery({
  vid:order.supplier_vid,originCountry:'CN',postalCode:'75002',
  logisticsName:'PostNL',maxSupplierUsdCents:2500,
  maxSupplierEurCents:1500,fxMaxEurPerUsdBps:10500,accessToken:'a'.repeat(40),
  fetcher:supplierPreflight
}),/exceeds EUR landed budget/);
await assert.rejects(preflightCjDelivery({
  vid:order.supplier_vid,originCountry:'CN',postalCode:'75002',
  logisticsName:'NonexistentCarrier',maxSupplierUsdCents:2500,
  maxSupplierEurCents:2390,fxMaxEurPerUsdBps:10500,accessToken:'a'.repeat(40),
  fetcher:supplierPreflight
}),/delivery method/);
await assert.rejects(preflightCjDelivery({
  vid:order.supplier_vid,originCountry:'CN',postalCode:'75002',
  logisticsName:'PostNL',maxSupplierUsdCents:1200,
  maxSupplierEurCents:2390,fxMaxEurPerUsdBps:10500,accessToken:'a'.repeat(40),
  fetcher:supplierPreflight
}),/exceed total/);


// Official CJ quote: totalPostageFee already contains taxes, customs and tariff.
const inclusive=computeCjFreightCents({
  logisticName:'PostNL',logisticPrice:'3.10',taxesFee:'0.85',
  clearanceOperationFee:'0.45',tariff:'0.00',totalPostageFee:'4.40'
});
assert.equal(inclusive.mode,'inclusive_postage');
assert.equal(inclusive.shippingUsdCents,310);
assert.equal(inclusive.freightAndImportUsdCents,440,'Tax/customs must NOT be double-counted');
assert.equal(computeCjLandedCents(1130,inclusive),1570);
const fallbackFreight=computeCjFreightCents({
  logisticName:'PostNL',logisticPrice:3.1,taxesFee:0.85,
  clearanceOperationFee:0.45,tariff:0.2
});
assert.equal(fallbackFreight.freightAndImportUsdCents,460);
assert.throws(()=>computeCjFreightCents({
  logisticName:'PostNL',totalPostageFee:1.0,taxesFee:0.85,
  clearanceOperationFee:0.45,tariff:0.2
}),/contradicts/);
assert.throws(()=>computeCjFreightCents({
  logisticName:'PostNL',totalPostageFee:4.4,taxesFee:0.85,
  clearanceOperationFee:0.45
}),/tariff is missing/);
assert.throws(()=>usdToCents('1.999'),/at most 2 decimals/);
const approvedCosts={amount_eur_cents:5990,unit_cost_eur_cents:1100,
  supplier_landed_eur_ceiling_cents:2390,reserves_eur_cents:900,
  supplier_max_usd_cents:2200,supplier_fx_max_eur_per_usd_bps:10500,
  vat_rate_bps:2000,tax_treatment_verified:true,supplier_fx_verified:true};
assert.equal(validateCommercialCeiling(approvedCosts).sellerNetRevenueCents,4992);
assert.equal(validateCommercialCeiling(approvedCosts).provisionalContributionEurCents,1702);
assert.equal(validateCommercialCeiling(approvedCosts).supplierWorstCaseEurCents,2310);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_fx_max_eur_per_usd_bps:0}),/Verified USD\/EUR/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_max_usd_cents:2500}),/exceeds EUR landed budget/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  tax_treatment_verified:false}),/VAT treatment/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_fx_verified:false}),/FX reserve/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  amount_eur_cents:4990}),/25 percent/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_landed_eur_ceiling_cents:0}),/required/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_landed_eur_ceiling_cents:4200}),/no contribution/);
assert.throws(()=>validateCommercialCeiling({...approvedCosts,
  supplier_landed_eur_ceiling_cents:100}),/below unit cost/);


const persisted={
  id:order.id,
  supplier_order_id:'2608010710340327100',
  supplier_vid:order.supplier_vid,
  supplier_max_usd_cents:2500,
  logistics_name:'PostNL',
  from_country_code:'CN'
};
// CJ distinguishes orderId (its own), orderNum (its own), and our
// storeLineItemId. Never compare two unrelated identifiers as equal.
const cjDetail={
  orderId:persisted.supplier_order_id,
  orderNum:'CJ2608010711150328200',
  platformOrderId:'6387689586969',
  shippingCountryCode:'FR',fromCountryCode:'CN',isSandbox:0,
  shippingCustomerName:customer.fullName,shippingAddress:customer.address1,
  shippingCity:customer.city,shippingZip:customer.postalCode,
  currency:'USD',logisticName:'PostNL',orderAmount:'18.50',
  orderStatus:'SHIPPED',paymentDate:'2026-11-02 22:00:00',
  trackNumber:'SY123456789CN',trackingUrl:'https://track.example.net/SY123456789CN',
  productList:[{vid:order.supplier_vid,quantity:1,storeLineItemId:order.id}]
};
assert.equal(verifyCjOrderDetail(persisted,cjDetail,customer).next,'SHIPPED');
assert.equal(verifyCjOrderDetail(persisted,cjDetail,customer).tracking,'SY123456789CN');
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,orderStatus:'DELIVERED'
},customer).next,'DELIVERED');
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,orderStatus:'UNSHIPPED',trackNumber:null
},customer).next,'SUPPLIER_PAID');
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,orderStatus:'SHIPPED',trackNumber:null
},customer).next,'SUPPLIER_PAID','Do not claim shipped before tracking evidence');
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,paymentDate:null
},customer).next,null,'No claim of supplier payment before actual pay date');
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,orderStatus:'CANCELLED',paymentDate:null
},customer).next,'EXCEPTION');
for(const [description,invalid] of [
  ['CJ ID',{orderId:'wrong-supplier-id'}],
  ['destination',{shippingCountryCode:'US'}],
  ['recipient',{shippingCustomerName:'Wrong Recipient'}],
  ['street',{shippingAddress:'999 avenue inconnue'}],
  ['city',{shippingCity:'Lyon'}],
  ['postcode',{shippingZip:'69002'}],
  ['sandbox',{isSandbox:1}],
  ['variant',{productList:[{...cjDetail.productList[0],vid:'unrelated-vid'}]}],
  ['quantity',{productList:[{...cjDetail.productList[0],quantity:2}]}],
  ['merchant reference',{productList:[{...cjDetail.productList[0],storeLineItemId:'ord_other'}]}],
  ['currency',{currency:'EUR'}],
  ['cost ceiling',{orderAmount:'25.01'}],
  ['provider discrepancy',{disputeId:'DP100'}]
]){
  assert.throws(()=>verifyCjOrderDetail(persisted,{...cjDetail,...invalid},customer),
    /CJ fulfillment mismatch/,description);
}
assert.equal(verifyCjOrderDetail(persisted,{
  ...cjDetail,trackingUrl:'javascript:alert(1)'
},customer).trackingUrl,null,'Reject unsafe external tracking URLs');


// A lost createOrderV2 HTTP response must be recovered via CJ GET by our
// original merchant orderNumber, with no new POST or balance payment.
let recoveryReads=0;
const recoveredByMerchantReference=await fetchCjOrder({
  orderId:order.id,accessToken:'a'.repeat(40),
  fetcher:async(url,options)=>{
    recoveryReads++;
    assert.equal(options.method,'GET');
    assert.equal(url,'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId='+order.id);
    assert.ok(!('body' in options),'Supplier recovery must never send purchase data');
    return {ok:true,json:async()=>({
      code:200,result:true,data:{...cjDetail,orderNum:'SD_CJ_INTERNAL_NUMBER'}
    })};
  }
});
assert.equal(recoveryReads,1);
assert.equal(recoveredByMerchantReference.orderId,persisted.supplier_order_id);
assert.equal(verifyCjOrderDetail(persisted,recoveredByMerchantReference,customer).next,'SHIPPED');

console.log('Independent commerce checks OK: encrypted address, checkout safety, CJ balance, exact shipping, paid submission and ambiguous-cost refusal');
