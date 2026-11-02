import assert from 'node:assert/strict';
import {createHostedPayment,verifyHostedPayment} from './commerce-mollie.mjs';

const apiKey='test_'+'A'.repeat(24);
const orderId='ord_'+'abc123XYZ7890000';
const paymentId='tr_1234567890abcdef';
const amountCents=3990;
const webhookUrl='https://commerce.atelier-montres.example/api/webhooks/payment';
const returnUrl='https://atelier-montres-selection-fr.onrender.com/commande-retour.html';
const payment=(status='open')=>({
  id:paymentId,mode:'test',status,
  amount:{currency:'EUR',value:'39.90'},
  metadata:{order_id:orderId},
  _links:{checkout:{href:'https://www.mollie.com/checkout/select-method/ABC123'}}
});
const json=(p,ok=true)=>({ok,json:async()=>p});
let called=0;
const fetcher=async(url,options)=>{
  called++;
  assert.equal(url,'https://api.mollie.com/v2/payments');
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,'Bearer '+apiKey);
  const body=JSON.parse(options.body);
  assert.deepEqual(body.amount,{currency:'EUR',value:'39.90'});
  assert.equal(body.metadata.order_id,orderId);
  assert.equal(body.redirectUrl,returnUrl);
  assert.equal(body.webhookUrl,webhookUrl);
  return json(payment());
};
const created=await createHostedPayment({
  apiKey,orderId,amountCents,description:'Montre source documentée',returnUrl,webhookUrl,fetcher
});
assert.equal(created.paymentId,paymentId);
assert.equal(created.checkoutUrl,'https://www.mollie.com/checkout/select-method/ABC123');
assert.equal(called,1);
const get=async(url,options)=>{
  assert.equal(url,'https://api.mollie.com/v2/payments/'+paymentId);
  assert.equal(options.method,'GET');
  return json(payment('paid'));
};
const paid=await verifyHostedPayment({apiKey,paymentId,orderId,amountCents,fetcher:get});
assert.equal(paid.paid,true);
assert.equal(paid.status,'paid');
const pending=await verifyHostedPayment({apiKey,paymentId,orderId,amountCents,
  fetcher:async()=>json(payment('pending'))});
assert.equal(pending.paid,false);
for(const [label,mutate] of [
  ['wrong customer order',p=>{p.metadata.order_id='ord_fake123456789012';}],
  ['wrong amount',p=>{p.amount.value='0.01';}],
  ['wrong currency',p=>{p.amount.currency='USD';}],
  ['wrong mode',p=>{p.mode='live';}],
  ['wrong payment id',p=>{p.id='tr_other123456789';}],
  ['unknown status',p=>{p.status='unrecognized';}]
]){
  const bad=payment('paid');mutate(bad);
  await assert.rejects(verifyHostedPayment({apiKey,paymentId,orderId,amountCents,
    fetcher:async()=>json(bad)}),undefined,label);
}
await assert.rejects(verifyHostedPayment({apiKey,paymentId:'https://evil.example',orderId,amountCents,fetcher:get}),/invalide/);
await assert.rejects(verifyHostedPayment({apiKey:'fake',paymentId,orderId,amountCents,fetcher:get}),/Clé/);
await assert.rejects(createHostedPayment({apiKey,orderId,amountCents:0,description:'Montre',returnUrl,webhookUrl,fetcher}),/Montant/);
await assert.rejects(createHostedPayment({apiKey,orderId,amountCents,description:'Montre',
  returnUrl:'http://unsecure.example/path',webhookUrl,fetcher}),/HTTPS/);
await assert.rejects(createHostedPayment({apiKey,orderId,amountCents,description:'Montre',returnUrl,webhookUrl,
  fetcher:async()=>json({...payment(),_links:{checkout:{href:'https://evil.example/checkout'}}})}),/Mollie/);
await assert.rejects(createHostedPayment({apiKey,orderId,amountCents,description:'Montre',returnUrl,webhookUrl,
  fetcher:async()=>json(payment(),false)}),/refusé/);
assert.equal(called,1,'Bad input must be rejected before calling the provider');
console.log('Own-site hosted payments OK: live provider contract, verified status, exact EUR amount, order binding and rejection cases');
