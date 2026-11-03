import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase,reserveCheckout,saveCreatedPayment,
  findExistingCheckout} from './db.mjs';
import {validateCheckoutBody} from './security.mjs';

// An isolated, ephemeral local PostgreSQL database is mandatory. No supplier
// API or payment API is called by this check.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL is required');
const parsed=new URL(dbUrl);
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.pathname!=='/commerce_ci')
  throw Error('Concurrency check refuses non-local or non-test databases');

const pool=createDatabase(dbUrl);
const offerId='check-'+randomBytes(8).toString('hex');
const idempotencyKey=randomBytes(24).toString('hex');
const opts={encryptionKey:'ab'.repeat(32),idempotencySecret:'S'.repeat(64)};
const request=validateCheckoutBody({
  offerId,idempotencyKey,quantity:1,acceptTerms:true,
  fullName:'Commerce Test',email:'test@example.fr',
  address1:'12 rue de la Montre',address2:'',
  postalCode:'75002',city:'Paris',region:'Ile-de-France',
  countryCode:'FR',phone:''
});
let inserted=false;
try{
  await initializeDatabase(pool);
  await pool.query(`
    INSERT INTO commerce_offers
      (id,label,amount_eur_cents,unit_cost_eur_cents,
       supplier_landed_eur_ceiling_cents,vat_rate_bps,reserves_eur_cents,
       supplier_max_usd_cents,supplier_vid,logistics_name,from_country_code,
       approved,stock_confirmed,legal_verified,eu_compliance_verified,
       photo_rights_verified,supplier_payment_verified,tax_treatment_verified,
       supplier_fx_verified,return_policy_verified,gpsr_traceability_verified,
       data_transfer_verified,verified_until,delivery_min_business_days,
       delivery_max_business_days)
    VALUES ($1,'Synthetic CI watch — never for sale',8000,1200,
      2200,2000,900,2000,'ci-supplier-sku','ci-shipping','CN',
      true,true,true,true,true,true,true,true,true,true,true,
      now()+interval '1 day',7,20)
  `,[offerId]);
  inserted=true;
  // Also support the stricter FX migration when the parallel finance PR lands.
  const fxColumn=await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='commerce_offers' AND column_name='supplier_fx_max_eur_per_usd_bps'");
  if(fxColumn.rowCount)
    await pool.query('UPDATE commerce_offers SET supplier_fx_max_eur_per_usd_bps=10500 WHERE id=$1',[offerId]);
  // Two clients can both find no prior order before either transaction commits.
  // The DB lock must let exactly one reserve and the other reuse it.
  const [a,b]=await Promise.all([
    reserveCheckout(pool,request,opts),
    reserveCheckout(pool,request,opts)
  ]);
  assert.equal(a.orderId,b.orderId,'both attempts must refer to one order');
  assert.equal(Boolean(a.reused)+Boolean(b.reused),1,'exactly one attempt creates an order');
  const winner=a.reused?b:a;
  const retry=a.reused?a:b;
  assert.equal(retry.kind,'status');
  assert.equal(retry.status,'PAYMENT_CREATING');
  assert.equal(retry.orderToken,winner.token);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM commerce_orders WHERE offer_id=$1',[offerId])).rows[0].n,1);

  // Simulate persisting a provider result, without calling any provider.
  const checkoutUrl='https://www.mollie.com/checkout/select-method/CI123';
  await saveCreatedPayment(pool,winner.orderId,{
    paymentId:'tr_ci_'+randomBytes(12).toString('hex'),
    checkoutUrl,mode:'test'
  });
  const recovered=await findExistingCheckout(pool,request,{idempotencySecret:opts.idempotencySecret});
  assert.equal(recovered.kind,'payment');
  assert.equal(recovered.checkoutUrl,checkoutUrl);
  assert.equal(recovered.orderToken,winner.token);

  // The same key cannot be repurposed for a different customer or basket.
  await assert.rejects(
    ()=>reserveCheckout(pool,{...request,customer:{...request.customer,city:'Lyon'}},opts),
    error=>error.status===409
  );
  console.log('Checkout concurrency OK: one order, one payment, safe retry and fingerprint rejection');
}finally{
  if(inserted){
    await pool.query('DELETE FROM commerce_events WHERE order_id IN (SELECT id FROM commerce_orders WHERE offer_id=$1)',[offerId]).catch(()=>{});
    await pool.query('DELETE FROM commerce_orders WHERE offer_id=$1',[offerId]).catch(()=>{});
    await pool.query('DELETE FROM commerce_offers WHERE id=$1',[offerId]).catch(()=>{});
  }
  await pool.end();
}
