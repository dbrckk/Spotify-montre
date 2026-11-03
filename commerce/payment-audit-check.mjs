import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase,claimPaymentsForAudit,recordPaymentStatus} from './db.mjs';
import {newOrderId,digest} from './security.mjs';

// No external payment or supplier calls: local PostgreSQL state-machine checks.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL is required');
const parsed=new URL(dbUrl);
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.pathname!=='/commerce_ci')
  throw Error('Refusing to run against a non-local database');
const pool=createDatabase(dbUrl);
const offerId='ci-audit-'+randomBytes(7).toString('hex');
const orders=[];
try{
  await initializeDatabase(pool);
  await pool.query(`
    INSERT INTO commerce_offers
      (id,label,amount_eur_cents,unit_cost_eur_cents,reserves_eur_cents,
       supplier_max_usd_cents,supplier_vid,logistics_name)
    VALUES($1,'Synthetic payment audit CI watch',5000,1000,500,2000,'ci-vid','ci-shipping')
  `,[offerId]);
  for(const status of ['PAYMENT_PENDING','PAID','SHIPPED','REFUNDED']){
    const id=newOrderId(),paymentId='tr_'+randomBytes(12).toString('hex');
    await pool.query(`
      INSERT INTO commerce_orders
        (id,public_token_hash,idempotency_hash,request_hash,offer_id,product_label,
         amount_eur_cents,supplier_vid,supplier_max_usd_cents,logistics_name,
         from_country_code,address_encrypted,status,payment_id,payment_mode)
      VALUES($1,$2,$3,$4,$5,'Synthetic audit CI order',5000,'ci-vid',2000,
             'ci-shipping','CN','no real customer data',$6,$7,'test')
    `,[id,digest(randomBytes(16).toString('hex')),
      digest(randomBytes(16).toString('hex')),
      digest(randomBytes(16).toString('hex')),offerId,status,paymentId]);
    orders.push({id,paymentId,status});
  }
  assert.throws(()=>claimPaymentsForAudit(pool,0),/Invalid payment audit batch size/);
  const [first,second]=await Promise.all([
    claimPaymentsForAudit(pool,2),claimPaymentsForAudit(pool,2)
  ]);
  const claimed=[...first,...second];
  assert.equal(claimed.length,3,'pending, paid and shipped must be auditable');
  assert.equal(new Set(claimed.map(x=>x.id)).size,3,'a distributed audit must not duplicate claims');
  assert.deepEqual(claimed.map(x=>x.status).sort(),['PAID','PAYMENT_PENDING','SHIPPED'].sort());
  assert.equal((await claimPaymentsForAudit(pool)).length,0,'recently checked orders must not be rechecked every 45 seconds');
  const get=status=>orders.find(x=>x.status===status);
  await pool.query(`
    UPDATE commerce_orders SET payment_audited_at=now()-interval '11 minutes'
    WHERE id=$1
  `,[get('PAYMENT_PENDING').id]);
  assert.deepEqual((await claimPaymentsForAudit(pool)).map(x=>x.id),[get('PAYMENT_PENDING').id]);
  await pool.query(`
    UPDATE commerce_orders SET payment_audited_at=now()-interval '13 hours'
    WHERE id=$1
  `,[get('PAID').id]);
  assert.deepEqual((await claimPaymentsForAudit(pool)).map(x=>x.id),[get('PAID').id]);
  await pool.query(`
    UPDATE commerce_orders SET payment_audited_at=now()-interval '8 days'
    WHERE id=$1
  `,[get('SHIPPED').id]);
  assert.deepEqual((await claimPaymentsForAudit(pool)).map(x=>x.id),[get('SHIPPED').id]);

  // A missed Mollie refund must freeze further supplier processing.
  const paid=get('PAID');
  const result=await recordPaymentStatus(pool,paid.id,{
    paymentId:paid.paymentId,amountCents:5000,paid:false,reversed:true,status:'paid'
  });
  assert.equal(result.status,'EXCEPTION');
  const state=await pool.query('SELECT status,payment_audited_at FROM commerce_orders WHERE id=$1',[paid.id]);
  assert.equal(state.rows[0].status,'EXCEPTION');
  assert.ok(state.rows[0].payment_audited_at);
  const events=await pool.query(
    "SELECT count(*)::int AS n FROM commerce_events WHERE order_id=$1 AND event_type='PAYMENT_REVERSAL_DETECTED'",[paid.id]);
  assert.equal(events.rows[0].n,1);
  assert.equal((await claimPaymentsForAudit(pool)).length,0,'EXCEPTION must not be dispatched by the audit');
  console.log('Mollie reconciliation OK: multi-worker claims, bounded audit cadence, late reversal and no provider calls');
}finally{
  await pool.query('DELETE FROM commerce_events WHERE order_id=ANY($1::text[])',[orders.map(x=>x.id)]).catch(()=>{});
  await pool.query('DELETE FROM commerce_orders WHERE offer_id=$1',[offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[offerId]).catch(()=>{});
  await pool.end();
}
