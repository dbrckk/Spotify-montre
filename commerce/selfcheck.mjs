import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {newOrderId,newPublicToken,sealAddress,openAddress,digest,sameHash,
  validateCheckoutBody,checkoutFingerprint,readWebhookBody} from './security.mjs';
import {buildCjOrder,getCjBalance,submitCjBalanceOrder,fetchCjOrder} from './cj.mjs';

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
const submitted=await submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),fetcher});
assert.equal(submitted.supplierId,'2608010710340327100');
assert.equal(submitted.reportedCostUsdCents,1850);
assert.equal(submitted.supplierStatus,'UNSHIPPED');
assert.equal(calls.filter(x=>x.url.endsWith('createOrderV2')).length,1);
const detail=await fetchCjOrder({orderId:submitted.supplierId,accessToken:'a'.repeat(40),fetcher});
assert.equal(detail.orderStatus,'SHIPPED');
const noBalance=async(url)=>({ok:true,json:async()=>({code:200,result:true,success:true,
  data:{amount:0.5}})});
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),fetcher:noBalance}),/Insufficient/);
const incorrect=async(url)=>{
  if(url.endsWith('/getBalance'))return {ok:true,json:async()=>({code:200,result:true,success:true,data:{amount:200}})};
  return {ok:true,json:async()=>({code:200,result:true,success:true,data:{orderId:'1',orderNumber:'WRONG',actualPayment:'1.00'}})};
};
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),fetcher:incorrect}),/mismatch/);
const expensive=async(url)=>{
  if(url.endsWith('/getBalance'))return {ok:true,json:async()=>({code:200,result:true,success:true,data:{amount:200}})};
  return {ok:true,json:async()=>({code:200,result:true,success:true,
    data:{orderId:'1',orderNumber:order.id,actualPayment:'25.01'}})};
};
await assert.rejects(submitCjBalanceOrder({order,customer,accessToken:'a'.repeat(40),fetcher:expensive}),/exceeded/);
console.log('Independent commerce checks OK: encrypted address, checkout safety, CJ balance, exact shipping, paid submission and ambiguous-cost refusal');
