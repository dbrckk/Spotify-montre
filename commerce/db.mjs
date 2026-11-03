import pg from 'pg';
import {validateCommercialCeiling} from './landed-cost.mjs';
import {verifyCjOrderDetail} from './cj-status.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ClientError,digest,hmac,newOrderId,recoveryToken,restoredCheckoutState,sealAddress,openAddress,sameHash,checkoutFingerprint} from './security.mjs';

const schema=readFileSync(fileURLToPath(new URL('./schema.sql',import.meta.url)),'utf8');
export function createDatabase(connectionString){
  if(!connectionString)throw Error('DATABASE_URL required');
  const pool=new pg.Pool({connectionString,max:4,connectionTimeoutMillis:8000,idleTimeoutMillis:20000});
  return pool;
}
export async function initializeDatabase(pool){
  await pool.query(schema);
  await pool.query('SELECT 1');
}
export async function transaction(pool,run){
  const client=await pool.connect();
  try{await client.query('BEGIN');const result=await run(client);await client.query('COMMIT');return result}
  catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release()}
}
export async function listApprovedOffers(pool){
  const {rows}=await pool.query(`
    SELECT id,label,amount_eur_cents AS "amountCents",
      delivery_min_business_days AS "deliveryMinDays",
      delivery_max_business_days AS "deliveryMaxDays"
    FROM commerce_offers
    WHERE approved=true AND stock_confirmed=true AND legal_verified=true
      AND eu_compliance_verified=true AND photo_rights_verified=true
      AND supplier_payment_verified=true AND verified_until > now()
      AND supplier_landed_eur_ceiling_cents > 0
      AND supplier_landed_eur_ceiling_cents >= unit_cost_eur_cents
      AND tax_treatment_verified=true AND supplier_fx_verified=true
      AND supplier_fx_max_eur_per_usd_bps BETWEEN 1000 AND 20000
      AND supplier_max_usd_cents::bigint * supplier_fx_max_eur_per_usd_bps
          <= supplier_landed_eur_ceiling_cents::bigint * 10000
      AND return_policy_verified=true AND gpsr_traceability_verified=true
      AND data_transfer_verified=true
      AND delivery_min_business_days BETWEEN 1 AND 90
      AND delivery_max_business_days BETWEEN delivery_min_business_days AND 120
      AND vat_rate_bps BETWEEN 0 AND 3000
      AND round(amount_eur_cents * 10000.0 / (10000+vat_rate_bps))*3
          >= (supplier_landed_eur_ceiling_cents+reserves_eur_cents)*4
    ORDER BY label LIMIT 30
  `);
  return rows;
}
export async function getApprovedOffer(pool,offerId){
  const {rows}=await pool.query(`
    SELECT id,label,amount_eur_cents,supplier_vid,supplier_max_usd_cents,
      supplier_landed_eur_ceiling_cents,supplier_fx_max_eur_per_usd_bps,
      logistics_name,from_country_code,delivery_min_business_days,delivery_max_business_days
    FROM commerce_offers WHERE id=$1 AND approved=true
      AND stock_confirmed=true AND legal_verified=true
      AND eu_compliance_verified=true AND photo_rights_verified=true
      AND supplier_payment_verified=true AND verified_until>now()
      AND supplier_landed_eur_ceiling_cents > 0
      AND supplier_landed_eur_ceiling_cents >= unit_cost_eur_cents
      AND tax_treatment_verified=true AND supplier_fx_verified=true
      AND supplier_fx_max_eur_per_usd_bps BETWEEN 1000 AND 20000
      AND supplier_max_usd_cents::bigint * supplier_fx_max_eur_per_usd_bps
          <= supplier_landed_eur_ceiling_cents::bigint * 10000
      AND return_policy_verified=true AND gpsr_traceability_verified=true
      AND data_transfer_verified=true
      AND delivery_min_business_days BETWEEN 1 AND 90
      AND delivery_max_business_days BETWEEN delivery_min_business_days AND 120
      AND vat_rate_bps BETWEEN 0 AND 3000
      AND round(amount_eur_cents * 10000.0 / (10000+vat_rate_bps))*3
          >= (supplier_landed_eur_ceiling_cents+reserves_eur_cents)*4 LIMIT 1
  `,[offerId]);
  return rows[0]||null;
}
/** Read-only, retry-safe lookup BEFORE checking present supplier inventory.
 * A paid or already-created customer order must not get another Mollie payment,
 * even if its product subsequently goes out of stock. */
export async function findExistingCheckout(pool,request,{idempotencySecret}){
  const idempotencyHash=hmac(idempotencySecret,request.idempotencyKey);
  const {rows}=await pool.query(`
    SELECT id,public_token_hash,request_hash,amount_eur_cents,status,payment_checkout_url
    FROM commerce_orders WHERE idempotency_hash=$1 LIMIT 1
  `,[idempotencyHash]);
  const order=rows[0];
  if(!order)return null;
  if(!sameHash(order.request_hash,checkoutFingerprint(request)))
    throw new ClientError('Cette référence est déjà utilisée avec un autre panier',409);
  return restoredCheckoutState(order,recoveryToken(idempotencySecret,request.idempotencyKey));
}
export async function reserveCheckout(pool,request,{encryptionKey,idempotencySecret}){
  const token=recoveryToken(idempotencySecret,request.idempotencyKey);
  const idempotencyHash=hmac(idempotencySecret,request.idempotencyKey);
  const requestHash=checkoutFingerprint(request);
  const initial=await transaction(pool,async client=>{
    // An advisory transaction lock serializes the first insert as well as retries.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[idempotencyHash]);
    const previous=await client.query('SELECT * FROM commerce_orders WHERE idempotency_hash=$1 FOR UPDATE',[idempotencyHash]);
    if(previous.rows.length){
      if(!sameHash(previous.rows[0].request_hash,requestHash))
        throw new ClientError('Cette référence est déjà utilisée avec un autre panier',409);
      return {...restoredCheckoutState(previous.rows[0],token),reused:true};
    }
    // Simple global emergency anti-abuse ceiling; more specific per-IP throttling is mandatory before high traffic.
    const count=await client.query("SELECT count(*)::int AS n FROM commerce_orders WHERE created_at > now() - interval '1 hour'");
    if(count.rows[0].n>=40)throw new ClientError('Limite temporaire de commandes atteinte',429);
    const result=await client.query(`
      SELECT * FROM commerce_offers WHERE id=$1 AND approved=true
      AND stock_confirmed=true AND legal_verified=true AND eu_compliance_verified=true
      AND photo_rights_verified=true AND supplier_payment_verified=true
      AND verified_until>now()
      AND supplier_landed_eur_ceiling_cents > 0
      AND supplier_landed_eur_ceiling_cents >= unit_cost_eur_cents
      AND tax_treatment_verified=true AND supplier_fx_verified=true
      AND supplier_fx_max_eur_per_usd_bps BETWEEN 1000 AND 20000
      AND supplier_max_usd_cents::bigint * supplier_fx_max_eur_per_usd_bps
          <= supplier_landed_eur_ceiling_cents::bigint * 10000
      AND return_policy_verified=true AND gpsr_traceability_verified=true
      AND data_transfer_verified=true
      AND delivery_min_business_days BETWEEN 1 AND 90
      AND delivery_max_business_days BETWEEN delivery_min_business_days AND 120
      AND vat_rate_bps BETWEEN 0 AND 3000
      AND round(amount_eur_cents * 10000.0 / (10000+vat_rate_bps))*3
          >= (supplier_landed_eur_ceiling_cents+reserves_eur_cents)*4
      FOR UPDATE
    `,[request.offerId]);
    const offer=result.rows[0];
    if(!offer)throw new ClientError('Cette montre n’est pas disponible pour un achat direct',409);
    try{validateCommercialCeiling(offer)}
    catch{throw new ClientError('Offre commercialement indisponible',409)}
    // A single pilot purchase at a time per supplier SKU prevents overselling
    // during payment and fulfillment. The row lock on commerce_offers serializes reservations.
    const active=await client.query(`
      SELECT count(*)::int AS n FROM commerce_orders
      WHERE offer_id=$1 AND status IN ('PAYMENT_CREATING','PAYMENT_PENDING',
        'PAYMENT_REVIEW','PAID','SUPPLIER_SENDING','SUPPLIER_SUBMITTED','SUPPLIER_PAID')
    `,[offer.id]);
    if(active.rows[0].n>0)throw new ClientError('Une commande est déjà en cours pour ce modèle',409);
    const orderId=newOrderId();
    await client.query(`
      INSERT INTO commerce_orders (
        id,public_token_hash,idempotency_hash,request_hash,offer_id,product_label,
        amount_eur_cents,supplier_vid,supplier_max_usd_cents,logistics_name,
        from_country_code,address_encrypted,vat_rate_bps_snapshot,
        supplier_landed_eur_ceiling_cents,supplier_fx_max_eur_per_usd_bps,
        promised_delivery_min_business_days,promised_delivery_max_business_days,status
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'PAYMENT_CREATING')
    `,[orderId,digest(token),idempotencyHash,requestHash,offer.id,offer.label,
       offer.amount_eur_cents,offer.supplier_vid,offer.supplier_max_usd_cents,
       offer.logistics_name,offer.from_country_code,sealAddress(request.customer,encryptionKey),
       offer.vat_rate_bps,offer.supplier_landed_eur_ceiling_cents,
       offer.supplier_fx_max_eur_per_usd_bps,offer.delivery_min_business_days,
       offer.delivery_max_business_days]);
    await client.query('INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',[orderId,'ORDER_RESERVED']);
    return {orderId,token,amountCents:offer.amount_eur_cents,description:offer.label};
  });
  return initial;
}
export async function saveCreatedPayment(pool,orderId,payment){
  const {rowCount}=await pool.query(`
    UPDATE commerce_orders SET payment_id=$2,payment_checkout_url=$3,
      payment_mode=$4,status='PAYMENT_PENDING',updated_at=now()
    WHERE id=$1 AND status='PAYMENT_CREATING'
  `,[orderId,payment.paymentId,payment.checkoutUrl,payment.mode]);
  if(rowCount!==1)throw Error('Payment requires reconciliation; no second charge is allowed');
}
export async function flagPaymentReview(pool,orderId){
  await pool.query(`
    UPDATE commerce_orders SET status='PAYMENT_REVIEW',updated_at=now()
    WHERE id=$1 AND status='PAYMENT_CREATING'
  `,[orderId]);
}
export async function getOrderByPayment(pool,paymentId){
  const {rows}=await pool.query('SELECT * FROM commerce_orders WHERE payment_id=$1 LIMIT 1',[paymentId]);
  return rows[0]||null;
}
export async function getOrderForStatus(pool,id,token){
  if(!/^ord_[a-f0-9]{40}$/.test(id)||typeof token!=='string'||token.length<30||token.length>120)
    throw new ClientError('Accès à la commande non autorisé',403);
  const {rows}=await pool.query(`
    SELECT id,status,product_label,amount_eur_cents,public_token_hash,
      tracking_number,tracking_url,promised_delivery_min_business_days,
      promised_delivery_max_business_days,created_at FROM commerce_orders WHERE id=$1 LIMIT 1
  `,[id]);
  if(!rows[0]||!sameHash(rows[0].public_token_hash,digest(token)))
    throw new ClientError('Accès à la commande non autorisé',403);
  const o=rows[0];
  return {orderId:o.id,status:o.status,product:o.product_label,
    amountCents:o.amount_eur_cents,trackingNumber:o.tracking_number||null,
    deliveryMinDays:o.promised_delivery_min_business_days,
    deliveryMaxDays:o.promised_delivery_max_business_days,
    trackingUrl:o.tracking_url||null,createdAt:o.created_at};
}
export async function recordPaymentStatus(pool,orderId,verified){
  return transaction(pool,async client=>{
    const {rows}=await client.query('SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE',[orderId]);
    const o=rows[0];if(!o||o.payment_id!==verified.paymentId||
      o.amount_eur_cents!==verified.amountCents)throw Error('Payment and stored order mismatch');
    // A chargeback or refund may arrive while the original payment still
    // reports status=paid. Block dispatch and alert the operator immediately.
    if(verified.reversed===true&&
      ['PAYMENT_PENDING','PAID','SUPPLIER_SENDING','SUPPLIER_SUBMITTED',
        'SUPPLIER_PAID','SHIPPED','DELIVERED'].includes(o.status)){
      const next=o.status==='PAYMENT_PENDING'?'PAYMENT_REVIEW':'EXCEPTION';
      await client.query('UPDATE commerce_orders SET status=$2,updated_at=now() WHERE id=$1',[o.id,next]);
      await client.query(
        'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
        [o.id,'PAYMENT_REVERSAL_DETECTED',JSON.stringify({
          previousStatus:o.status,action:'manual_refund_or_dispute_review_no_automatic_supplier_order'
        })]
      );
      return {changed:true,status:next};
    }
    if(o.status==='PAYMENT_PENDING'){
      const next=verified.paid?'PAID':
        ['failed','expired','canceled'].includes(verified.status)?'PAYMENT_FAILED':null;
      if(next){
        await client.query('UPDATE commerce_orders SET status=$2,updated_at=now() WHERE id=$1',[o.id,next]);
        await client.query('INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',[o.id,next]);
        return {changed:true,status:next};
      }
    }
    // Never rewrite paid/fulfilled orders after receiving an out-of-order webhook.
    return {changed:false,status:o.status};
  });
}
export async function pendingPayments(pool){
  const {rows}=await pool.query(`
    SELECT id,payment_id,amount_eur_cents FROM commerce_orders
    WHERE status='PAYMENT_PENDING' AND payment_id IS NOT NULL
      AND created_at>now()-interval '14 days'
    ORDER BY created_at LIMIT 12
  `);
  return rows;
}
export async function claimSupplierOrder(pool,{dailyCapUsdCents}){
  if(!Number.isSafeInteger(dailyCapUsdCents)||dailyCapUsdCents<=0) return null;
  return transaction(pool,async client=>{
    await client.query('SELECT pg_advisory_xact_lock(48192371)');
    const sum=await client.query(`
      SELECT coalesce(sum(supplier_reserved_usd_cents),0)::bigint AS total
      FROM commerce_orders WHERE supplier_requested_at >= date_trunc('day',now())
    `);
    const {rows}=await client.query(`
      SELECT * FROM commerce_orders WHERE status='PAID' ORDER BY created_at
      FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    const o=rows[0];if(!o)return null;
    const total=Number(sum.rows[0].total);
    if(total+o.supplier_max_usd_cents>dailyCapUsdCents)return null;
    await client.query(`
      UPDATE commerce_orders SET status='SUPPLIER_SENDING',supplier_requested_at=now(),
       supplier_reserved_usd_cents=$2,updated_at=now() WHERE id=$1
    `,[o.id,o.supplier_max_usd_cents]);
    await client.query('INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',[o.id,'SUPPLIER_ATTEMPT_CLAIMED']);
    return o;
  });
}
export async function recordSupplierAttempt(pool,orderId,result,error){
  return transaction(pool,async client=>{
    const {rows}=await client.query('SELECT status FROM commerce_orders WHERE id=$1 FOR UPDATE',[orderId]);
    if(rows[0]?.status!=='SUPPLIER_SENDING')throw Error('Supplier order state changed');
    if(error){
      await client.query(`
        UPDATE commerce_orders SET status='EXCEPTION',updated_at=now() WHERE id=$1
      `,[orderId]);
      await client.query(`
        INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)
      `,[orderId,'SUPPLIER_RECONCILIATION_REQUIRED',JSON.stringify({reason:'supplier_response_or_network_unknown'})]);
      return;
    }
    await client.query(`
      UPDATE commerce_orders SET status='SUPPLIER_SUBMITTED',supplier_order_id=$2,
        supplier_status=$3,supplier_received_at=now(),updated_at=now() WHERE id=$1
    `,[orderId,result.supplierId,result.supplierStatus]);
    await client.query('INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',[orderId,'SUPPLIER_SUBMITTED']);
  });
}
/* A supplier request may have reached CJ before an API timeout or restart.
 * Quarantine, audit and require manual reconciliation: never blindly retry. */
export async function quarantineStaleSupplierAttempts(pool){
  return transaction(pool,async client=>{
    const {rows}=await client.query(`
      UPDATE commerce_orders SET status='EXCEPTION',updated_at=now()
      WHERE status='SUPPLIER_SENDING'
        AND supplier_requested_at < now() - interval '5 minutes'
      RETURNING id
    `);
    for(const row of rows)await client.query(
      'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
      [row.id,'SUPPLIER_ATTEMPT_STALE',JSON.stringify({
        reason:'worker_or_network_interrupted',
        action:'reconcile_order_number_with_cj_before_any_retry'
      })]);
    return rows.map(row=>row.id);
  });
}

/* Mollie may have created a payable checkout before a timeout. No blind retry. */
export async function quarantineStalePaymentCreation(pool){
  return transaction(pool,async client=>{
    const {rows}=await client.query(`
      UPDATE commerce_orders SET status='PAYMENT_REVIEW',updated_at=now()
      WHERE status='PAYMENT_CREATING'
        AND created_at < now() - interval '15 minutes'
      RETURNING id
    `);
    for(const row of rows)await client.query(
      'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
      [row.id,'PAYMENT_CREATION_STALE',JSON.stringify({
        reason:'mollie_result_unknown',action:'reconcile_provider_before_new_payment'
      })]);
    return rows.map(row=>row.id);
  });
}

export async function getCommerceExceptionSummary(pool){
  const {rows}=await pool.query(`
    SELECT status,count(*)::integer AS count FROM commerce_orders
    WHERE status IN ('PAYMENT_REVIEW','EXCEPTION','SUPPLIER_SENDING')
    GROUP BY status ORDER BY status
  `);
  return Object.fromEntries(rows.map(row=>[row.status,row.count]));
}
/**
 * A CJ POST may have succeeded despite a broken network response.
 * Look up our merchant orderNumber via CJ's documented read-only
 * getOrderDetail endpoint. Never re-POST createOrderV2.
 */
export async function claimSupplierRecoveryProbe(pool){
  return transaction(pool,async client=>{
    const {rows}=await client.query(`
      SELECT o.* FROM commerce_orders o
      WHERE o.status='EXCEPTION'
        AND o.supplier_order_id IS NULL AND o.supplier_requested_at IS NOT NULL
        AND o.payment_id IS NOT NULL
        AND o.supplier_recovery_attempts < 12
        AND (o.supplier_recovery_checked_at IS NULL
          OR o.supplier_recovery_checked_at < now()-interval '10 minutes')
        AND EXISTS (SELECT 1 FROM commerce_events e WHERE e.order_id=o.id
          AND e.event_type IN ('SUPPLIER_RECONCILIATION_REQUIRED','SUPPLIER_ATTEMPT_STALE'))
        AND NOT EXISTS (SELECT 1 FROM commerce_events e WHERE e.order_id=o.id
          AND e.event_type='PAYMENT_REVERSAL_DETECTED')
      ORDER BY o.supplier_requested_at
      FOR UPDATE OF o SKIP LOCKED LIMIT 1
    `);
    const o=rows[0];if(!o)return null;
    await client.query(`
      UPDATE commerce_orders SET supplier_recovery_checked_at=now(),
        supplier_recovery_attempts=supplier_recovery_attempts+1,
        updated_at=now() WHERE id=$1
    `,[o.id]);
    await client.query(
      'INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',
      [o.id,'SUPPLIER_RECOVERY_CHECK_STARTED']
    );
    if(o.supplier_recovery_attempts===11){
      await client.query(
        'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
        [o.id,'SUPPLIER_RECOVERY_EXHAUSTED',JSON.stringify({
          action:'manual_cj_order_lookup_and_payment_refund_decision'
        })]
      );
    }
    return o;
  });
}

/**
 * Non-creating recovery: we only attach a CJ ID after authenticated GET
 * returns the exact line/variant and decrypted customer address.
 * Unpaid CJ orders remain in EXCEPTION; never debit the wallet again.
 */
export async function recordRecoveredSupplierOrder(pool,id,detail,encryptionKey,payment){
  return transaction(pool,async client=>{
    const {rows}=await client.query(
      'SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE',[id]
    );
    const o=rows[0];
    if(!o||o.status!=='EXCEPTION'||o.supplier_order_id||
      !o.supplier_requested_at)return {changed:false};
    if(!payment?.paid||payment.paymentId!==o.payment_id||
      payment.amountCents!==o.amount_eur_cents)
      throw Error('Buyer payment not verified for CJ recovery');
    const reversed=await client.query(`
      SELECT 1 FROM commerce_events WHERE order_id=$1
        AND event_type='PAYMENT_REVERSAL_DETECTED' LIMIT 1
    `,[id]);
    if(reversed.rows.length)throw Error('Reversed payment cannot be recovered automatically');
    const cjId=String(detail?.orderId||'');
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(cjId))
      throw Error('Invalid CJ orderId for recovery');
    const customer=openAddress(o.address_encrypted,encryptionKey);
    const match=verifyCjOrderDetail(
      {...o,supplier_order_id:cjId},detail,customer
    );
    const status=match.next&&match.next!=='EXCEPTION'?match.next:'EXCEPTION';
    await client.query(`
      UPDATE commerce_orders SET supplier_order_id=$2,
        supplier_status=$3,supplier_received_at=now(),
        status=$4,tracking_number=$5,tracking_url=$6,updated_at=now()
      WHERE id=$1
    `,[o.id,cjId,match.supplierStatus,status,match.tracking,match.trackingUrl]);
    await client.query(
      'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
      [o.id,'SUPPLIER_ORDER_RECOVERED',JSON.stringify({
        supplierPaid:Boolean(match.next&&match.next!=='EXCEPTION'),
        action:status==='EXCEPTION'?'supplier_payment_review_required':'monitor_supplier_delivery'
      })]
    );
    return {changed:true,status,supplierPaid:status!=='EXCEPTION'};
  });
}

export async function ordersForSupplierReconciliation(pool){
  const {rows}=await pool.query(`
    SELECT id,supplier_order_id,status FROM commerce_orders
    WHERE status IN ('SUPPLIER_SUBMITTED','SUPPLIER_PAID','SHIPPED')
      AND supplier_order_id IS NOT NULL
    ORDER BY updated_at LIMIT 8
  `);
  return rows;
}
export async function recordSupplierDetail(pool,id,detail,encryptionKey){
  return transaction(pool,async client=>{
    const {rows}=await client.query(
      'SELECT * FROM commerce_orders WHERE id=$1 FOR UPDATE',[id]
    );
    const o=rows[0];
    if(!o||!['SUPPLIER_SUBMITTED','SUPPLIER_PAID','SHIPPED'].includes(o.status))
      return {changed:false};
    let result;
    try{
      const customer=openAddress(o.address_encrypted,encryptionKey);
      result=verifyCjOrderDetail(o,detail,customer);
    }
    catch(error){
      // Untrusted/mismatched provider detail must never advance paid or
      // delivery states. Quarantine and investigate the supplier manually.
      await client.query(
        "UPDATE commerce_orders SET status='EXCEPTION',updated_at=now() WHERE id=$1",
        [o.id]
      );
      await client.query(
        'INSERT INTO commerce_events(order_id,event_type,details) VALUES($1,$2,$3)',
        [o.id,'SUPPLIER_IDENTITY_REVIEW',JSON.stringify({
          reason:error.message.slice(0,180),
          action:'reconcile_with_cj_no_automatic_supplier_repayment'
        })]
      );
      return {changed:true,exception:true};
    }
    const {next,supplierStatus,tracking,trackingUrl}=result;
    const rank={SUPPLIER_SUBMITTED:0,SUPPLIER_PAID:1,SHIPPED:2,DELIVERED:3};
    if(next!=='EXCEPTION'&&(!next||rank[next]<=rank[o.status]))
      return {changed:false,status:o.status};
    await client.query(`
      UPDATE commerce_orders SET status=$2,supplier_status=$3,
        tracking_number=$4,tracking_url=$5,updated_at=now() WHERE id=$1
    `,[o.id,next,supplierStatus,tracking,trackingUrl]);
    await client.query(
      'INSERT INTO commerce_events(order_id,event_type) VALUES($1,$2)',[o.id,next]
    );
    return {changed:true,status:next};
  });
}
