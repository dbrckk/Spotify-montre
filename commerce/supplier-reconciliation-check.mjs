import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase,claimSupplierReconciliation} from './db.mjs';
import {newOrderId,digest} from './security.mjs';

// Real PostgreSQL state-machine test; provider IDs and customers are synthetic.
// Refuse any non-isolated database before writing records.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL required');
const uri=new URL(dbUrl);
if(!['localhost','127.0.0.1'].includes(uri.hostname)||uri.pathname!=='/commerce_ci')
  throw Error('Refusing supplier reconciliation check on non-local database');

const pool=createDatabase(dbUrl);
const offerId='ci-supplier-poll-'+randomBytes(5).toString('hex');
const rows=[];
try{
  await initializeDatabase(pool);
  await pool.query(`
    INSERT INTO commerce_offers(
      id,label,amount_eur_cents,unit_cost_eur_cents,reserves_eur_cents,
      supplier_max_usd_cents,supplier_vid,logistics_name)
    VALUES($1,'Synthetic CJ reconciliation CI order',5000,1000,500,2000,'ci-vid','ci-logistics')
  `,[offerId]);
  for(const status of [
    'SUPPLIER_SUBMITTED','SUPPLIER_SUBMITTED','SUPPLIER_SUBMITTED',
    'SUPPLIER_SUBMITTED','SUPPLIER_SUBMITTED','SUPPLIER_SUBMITTED',
    'SUPPLIER_PAID','SUPPLIER_PAID','SHIPPED','SHIPPED',
    'DELIVERED','EXCEPTION'
  ]){
    const id=newOrderId(),supplierId='CJ'+randomBytes(9).toString('hex');
    await pool.query(`
      INSERT INTO commerce_orders(
        id,public_token_hash,idempotency_hash,request_hash,offer_id,product_label,
        amount_eur_cents,supplier_vid,supplier_max_usd_cents,logistics_name,
        from_country_code,address_encrypted,status,supplier_order_id)
      VALUES($1,$2,$3,$4,$5,'Synthetic CJ order',5000,'ci-vid',2000,
             'ci-logistics','CN','test-only-address',$6,$7)
    `,[id,digest(randomBytes(16).toString('hex')),
      digest(randomBytes(16).toString('hex')),
      digest(randomBytes(16).toString('hex')),offerId,status,supplierId]);
    rows.push({id,status,supplierId});
  }
  await assert.rejects(()=>claimSupplierReconciliation(pool,0),/Invalid supplier reconciliation/);
  await assert.rejects(()=>claimSupplierReconciliation(pool,9),/Invalid supplier reconciliation/);
  const [a,b]=await Promise.all([
    claimSupplierReconciliation(pool,4),claimSupplierReconciliation(pool,4)
  ]);
  const claimed=[...a,...b];
  assert.equal(claimed.length,8);
  assert.equal(new Set(claimed.map(x=>x.id)).size,8,'separate workers must never double claim');
  const remaining=await claimSupplierReconciliation(pool,4);
  assert.equal(remaining.length,2,'newer supplier orders must not starve behind old shipments');
  const firstPass=[...claimed,...remaining];
  assert.equal(firstPass.length,10);
  assert.equal(new Set(firstPass.map(x=>x.id)).size,10);
  assert.equal((await claimSupplierReconciliation(pool)).length,0,
    'the 45-second worker tick must not re-query a previously checked CJ order');

  const byStatus=status=>rows.find(x=>x.status===status);
  for(const [status,age] of [
    ['SUPPLIER_SUBMITTED','11 minutes'],
    ['SUPPLIER_PAID','61 minutes'],
    ['SHIPPED','7 hours']
  ]){
    const id=byStatus(status).id;
    await pool.query(`
      UPDATE commerce_orders
      SET supplier_checked_at=now()-$2::interval WHERE id=$1
    `,[id,age]);
  }
  const overdue=await claimSupplierReconciliation(pool,4);
  assert.deepEqual(overdue.map(x=>x.status).sort(),
    ['SUPPLIER_PAID','SUPPLIER_SUBMITTED','SHIPPED'].sort(),
    'poll due only after status-specific cooldown');
  assert.equal((await claimSupplierReconciliation(pool)).length,0,
    'an immediately subsequent run must not repeat any CJ GET');
  await pool.query(`
    UPDATE commerce_orders SET supplier_checked_at=now()-interval '5 minutes'
    WHERE id=$1
  `,[byStatus('SUPPLIER_SUBMITTED').id]);
  assert.equal((await claimSupplierReconciliation(pool)).length,0,
    'supplier submitted orders must honor their 10-minute cooldown');
  await pool.query(`
    UPDATE commerce_orders SET supplier_checked_at=now()-interval '30 minutes'
    WHERE id=$1
  `,[byStatus('SHIPPED').id]);
  assert.equal((await claimSupplierReconciliation(pool)).length,0,
    'shipped parcels must honor their 6-hour cooldown');
  console.log('CJ status queue OK: 2-worker fairness, distinct orders, durable cooldowns and no polling of closed cases');
}finally{
  await pool.query('DELETE FROM commerce_events WHERE order_id IN (SELECT id FROM commerce_orders WHERE offer_id=$1)',[offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_orders WHERE offer_id=$1',[offerId]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[offerId]).catch(()=>{});
  await pool.end();
}
