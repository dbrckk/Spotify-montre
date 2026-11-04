import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase,authorizeSupplierSubmission,
  abortSupplierBeforePost,recordPaymentStatus} from './db.mjs';
import {newOrderId,digest} from './security.mjs';
import {submitCjBalanceOrder} from './cj.mjs';

// Strictly local PostgreSQL and synthetic provider responses: no external debit.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL required');
const uri=new URL(dbUrl);
if(!['127.0.0.1','localhost'].includes(uri.hostname)||uri.pathname!=='/commerce_ci')
  throw Error('This check cannot use a production database');

const pool=createDatabase(dbUrl);
const offerId='ci-gate-'+randomBytes(7).toString('hex');
const orders=[];
const validPayment=order=>({
  paymentId:order.payment_id,amountCents:order.amount_eur_cents,
  paid:true,reversed:false,status:'paid'
});
async function insertOrder(status='SUPPLIER_SENDING'){
  const id=newOrderId();
  const paymentId='tr_'+randomBytes(15).toString('hex');
  await pool.query(`
    INSERT INTO commerce_orders (
      id,public_token_hash,idempotency_hash,request_hash,offer_id,product_label,
      amount_eur_cents,supplier_vid,supplier_pid,supplier_variant_sku,
      supplier_product_sku,supplier_max_usd_cents,logistics_name,
      from_country_code,address_encrypted,import_proof_sha256,
      status,payment_id,payment_mode
    ) VALUES($1,$2,$3,$4,$5,'Synthetic gated order',5000,'sample-vid',
             'sample-pid','SAMPLE-VID-SKU','SAMPLE-PRODUCT-SKU',2200,
             'CI-shipping','CN','no real address data',$6,$7,$8,'test')
  `,[id,digest(randomBytes(16).toString('hex')),
    digest(randomBytes(16).toString('hex')),
    digest(randomBytes(16).toString('hex')),offerId,
    'c'.repeat(64),status,paymentId]);
  const order={
    id,payment_id:paymentId,amount_eur_cents:5000,
    supplier_vid:'sample-vid',supplier_pid:'sample-pid',
    supplier_variant_sku:'SAMPLE-VID-SKU',
    supplier_product_sku:'SAMPLE-PRODUCT-SKU',
    supplier_max_usd_cents:2200,
    logistics_name:'CI-shipping',from_country_code:'CN'
  };
  orders.push(order);
  return order;
}
try{
  await initializeDatabase(pool);
  await pool.query(`
    INSERT INTO commerce_offers(
      id,label,amount_eur_cents,unit_cost_eur_cents,reserves_eur_cents,
      supplier_max_usd_cents,supplier_vid,supplier_pid,
      supplier_variant_sku,supplier_product_sku,logistics_name)
    VALUES($1,'Synthetic pre-supplier gate check',5000,1000,500,2200,
           'sample-vid','sample-pid','SAMPLE-VID-SKU',
           'SAMPLE-PRODUCT-SKU','CI-shipping')
  `,[offerId]);

  await pool.query(
    'INSERT INTO commerce_offer_import_proofs ('+
      'offer_id,supplier_vid,supplier_pid,supplier_variant_sku,'+
      'supplier_product_sku,logistics_name,consignment_value_eur_cents,'+
      'flat_duty_eur_cents,union_handling_eur_cents,buyer_extra_eur_cents,'+
      'landed_eur_quote_cents,import_payer,import_vat_covered,'+
      'carrier_clearance_covered,supplier_evidence_sha256,valid_until) '+
      "VALUES($1,'sample-vid','sample-pid','SAMPLE-VID-SKU',"+
      "'SAMPLE-PRODUCT-SKU','CI-shipping',5000,300,200,0,1800,"+
      "'SELLER',true,true,$2,now()+interval '1 day')",
    [offerId,'c'.repeat(64)]);
  const first=await insertOrder();
  assert.equal(await authorizeSupplierSubmission(pool,first,validPayment(first)),true);
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()-interval '1 minute' WHERE offer_id=$1",
    [offerId]);
  assert.equal(await authorizeSupplierSubmission(pool,first,validPayment(first)),false,
    'CJ debit must fail when the written import proof expires after payment');
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()+interval '1 day' WHERE offer_id=$1",
    [offerId]);
  assert.equal(await authorizeSupplierSubmission(pool,first,validPayment(first)),true);
  assert.equal(await authorizeSupplierSubmission(pool,first,{
    ...validPayment(first),status:'pending',paid:false
  }),false,'out-of-date payment status must not authorize CJ');
  assert.equal(await authorizeSupplierSubmission(pool,first,{
    ...validPayment(first),amountCents:1
  }),false,'different price must not authorize CJ');
  assert.equal(await authorizeSupplierSubmission(pool,first,{
    ...validPayment(first),paymentId:'tr_other1234567'
  }),false,'different provider payment must not authorize CJ');

  // A webhook may arrive while the supplier stock and wallet checks are running.
  const reversed=await recordPaymentStatus(pool,first.id,{
    ...validPayment(first),paid:false,reversed:true
  });
  assert.equal(reversed.status,'EXCEPTION');
  assert.equal(await authorizeSupplierSubmission(pool,first,validPayment(first)),false,
    'the old paid proof must not override a newly detected chargeback');
  assert.equal(await abortSupplierBeforePost(pool,first.id),false,
    'already-quarantined orders must not be modified twice');

  const second=await insertOrder();
  const missedSupplier=await abortSupplierBeforePost(pool,second.id);
  assert.equal(missedSupplier,true);
  assert.equal(await authorizeSupplierSubmission(pool,second,validPayment(second)),false);
  const types=(await pool.query(
    'SELECT event_type FROM commerce_events WHERE order_id=$1',[second.id]
  )).rows.map(x=>x.event_type);
  assert.deepEqual(types,['SUPPLIER_PREPOST_ABORTED']);
  const third=await insertOrder('PAID');
  assert.equal(await authorizeSupplierSubmission(pool,third,validPayment(third)),false,
    'only supplier-claimed orders may reach irreversible debit');

  // The CJ client must not perform createOrderV2 without a *fresh* callback.
  const customer={
    fullName:'Synthetic Buyer',email:'test@example.fr',address1:'12 rue Exemple',
    address2:'',postalCode:'75002',city:'Paris',region:'Ile de France',
    countryCode:'FR',phone:''
  };
  let walletChecked=0,posts=0,authorizations=0;
  const fetcher=async(url)=>{
    if(url.endsWith('/shopping/pay/getBalance')){
      walletChecked++;
      return {ok:true,json:async()=>({code:200,result:true,data:{amount:'30.00'}})};
    }
    if(url.endsWith('/shopping/order/createOrderV2')){
      posts++;
      throw Error('No CJ purchase must occur in the CI test');
    }
    throw Error('Unexpected provider call');
  };
  const args={order:first,customer,accessToken:'a'.repeat(40),fetcher};
  await assert.rejects(()=>submitCjBalanceOrder(args),/Final buyer payment authorization/);
  await assert.rejects(()=>submitCjBalanceOrder({
    ...args,order:{...first,supplier_pid:null},
    authorizeBeforeDebit:async()=>{throw Error('must not authorize legacy unpinned order')}
  }),/identity snapshot missing/);
  assert.equal(walletChecked,0);
  await assert.rejects(()=>submitCjBalanceOrder({
    ...args,authorizeBeforeDebit:async()=>{
      authorizations++;
      assert.equal(walletChecked,1,'authorize only AFTER CJ wallet check');
      throw Error('Provider payment reversed at final purchase boundary');
    }
  }),/reversed at final/);
  assert.equal(authorizations,1);
  assert.equal(posts,0,'no supplier POST after revoked authorization');
  console.log('Final CJ debit gate OK: late reversal, price binding, pre-POST abort and no supplier POST');
}finally{
  await pool.query('DELETE FROM commerce_events WHERE order_id=ANY($1::text[])',
    [orders.map(o=>o.id)]).catch(()=>{});
  await pool.query('DELETE FROM commerce_orders WHERE offer_id=$1',[offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[offerId]).catch(()=>{});
  await pool.end();
}
