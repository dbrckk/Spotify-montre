import {createServer} from 'node:http';
import {createHostedPayment,verifyHostedPayment} from '../scripts/commerce-mollie.mjs';
import {createDatabase,initializeDatabase,listApprovedOffers,reserveCheckout,saveCreatedPayment,
  flagPaymentReview,getApprovedOffer,findExistingCheckout,getOrderByPayment,getOrderForStatus,recordPaymentStatus,claimPaymentsForAudit,
  claimSupplierOrder,recordSupplierAttempt,authorizeSupplierSubmission,abortSupplierBeforePost,
  claimSupplierReconciliation,recordSupplierDetail,
  quarantineStaleSupplierAttempts,quarantineStalePaymentCreation,getCommerceExceptionSummary,
  claimSupplierRecoveryProbe,recordRecoveredSupplierOrder} from './db.mjs';
import {ClientError,validateCheckoutBody,readJsonBody,readWebhookBody,openAddress} from './security.mjs';
import {submitCjBalanceOrder,fetchCjOrder,preflightCjDelivery} from './cj.mjs';

const origin=process.env.STOREFRONT_ORIGIN||'https://atelier-montres-selection-fr.onrender.com';
const enabled=process.env.COMMERCE_ENABLED==='true';
const mollieKey=process.env.MOLLIE_API_KEY||'';
const cjToken=process.env.CJ_ACCESS_TOKEN||'';
const encryptionKey=process.env.ADDRESS_ENCRYPTION_KEY||'';
const idempotencySecret=process.env.IDEMPOTENCY_SECRET||'';
const backendUrl=process.env.COMMERCE_PUBLIC_URL||'';
const rawCap=Number(process.env.CJ_DAILY_CAP_USD_CENTS||0);
const dailyCap=Number.isSafeInteger(rawCap)&&rawCap>0?rawCap:0;
let pool=null,dbReady=false,dbConnectBusy=false,workerBusy=false,
  lastExceptionAlertAt=0,lastDatabaseAlertAt=0;

async function ensureDatabase(){
  if(dbReady||dbConnectBusy||!process.env.DATABASE_URL)return;
  dbConnectBusy=true;
  try{
    if(!pool)pool=createDatabase(process.env.DATABASE_URL);
    await initializeDatabase(pool);
    dbReady=true;
    console.log('commerce_database_ready');
  }catch{
    dbReady=false;
    if(Date.now()-lastDatabaseAlertAt>15*60*1000){
      lastDatabaseAlertAt=Date.now();
      console.error('commerce_database_unavailable_will_retry');
    }
  }finally{dbConnectBusy=false;}
}
function safeHttps(u){
  try{const p=new URL(u);return p.protocol==='https:'&&!p.username&&!p.password&&!p.hash&&p.pathname==='/'&&p.search==='' }
  catch{return false}
}
const merchantReady=()=>enabled&&dbReady&&pool&&
  /^live_[a-zA-Z0-9]{12,}$/.test(mollieKey)&&cjToken.length>=20&&
  /^[a-fA-F0-9]{64}$/.test(encryptionKey)&&idempotencySecret.length>=40&&
  safeHttps(backendUrl)&&safeHttps(origin)&&dailyCap>0;
function reply(res,status,body,extra={}){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',...extra});
  res.end(JSON.stringify(body));
}
function cors(req){
  const accepted=req.headers.origin===origin;
  return accepted?{
    'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, X-Order-Token',
    'Access-Control-Max-Age':'600','Vary':'Origin'
  }:{'Vary':'Origin'};
}
async function reconcilePayment(paymentId){
  const existing=await getOrderByPayment(pool,paymentId);
  if(!existing)return {changed:false};
  const verified=await verifyHostedPayment({
    apiKey:mollieKey,paymentId,orderId:existing.id,amountCents:existing.amount_eur_cents
  });
  return recordPaymentStatus(pool,existing.id,verified);
}
async function supplierWork(){
  if(workerBusy)return;
  workerBusy=true;
  try{
    await ensureDatabase();
    if(!dbReady||!pool)return;
    const supplierStale=await quarantineStaleSupplierAttempts(pool);
    const paymentStale=await quarantineStalePaymentCreation(pool);
    if(supplierStale.length||paymentStale.length)
      console.error('commerce_attempts_quarantined',{supplier:supplierStale.length,payment:paymentStale.length});
    if(Date.now()-lastExceptionAlertAt>15*60*1000){
      lastExceptionAlertAt=Date.now();
      const summary=await getCommerceExceptionSummary(pool);
      if(Object.values(summary).some(Number))console.error('commerce_manual_intervention_required',summary);
    }
    // A sales freeze must stop new CJ purchases, not blind the operator to
    // existing customer payments and already-created supplier shipments.
    const canReadPayment=/^live_[a-zA-Z0-9]{12,}$/.test(mollieKey);
    const canReadSupplier=cjToken.length>=20&&/^[a-fA-F0-9]{64}$/.test(encryptionKey);
    if(canReadPayment){
      // Read-only verification; paid and shipped orders also need periodic
      // checks because legacy Mollie webhooks can be lost during an outage.
      for(const row of await claimPaymentsForAudit(pool)){
        try{await reconcilePayment(row.payment_id)}
        catch{console.error('payment_reconciliation_requires_review',row.id)}
      }
    }
    // A previous CJ POST may already have purchased the watch when HTTP failed.
    // Recovery is strictly GET-only by our merchant order reference; never
    // submit/pay an uncertain second supplier order.
    if(canReadPayment&&canReadSupplier){
    const orphan=await claimSupplierRecoveryProbe(pool);
    if(orphan){
      try{
        const proof=await verifyHostedPayment({
          apiKey:mollieKey,paymentId:orphan.payment_id,
          orderId:orphan.id,amountCents:orphan.amount_eur_cents
        });
        if(!proof.paid){
          console.error('supplier_recovery_payment_not_verified',orphan.id);
        }else{
          const matched=await fetchCjOrder({
            orderId:orphan.id,accessToken:cjToken
          });
          const recovered=await recordRecoveredSupplierOrder(
            pool,orphan.id,matched,encryptionKey,proof
          );
          if(recovered.changed)
            console.log('supplier_order_recovered_read_only',orphan.id,recovered.status);
        }
      }catch{
        console.error('supplier_recovery_requires_review',orphan.id);
      }
    }
    }
    // Only this section can create and pay a new supplier order.
    if(merchantReady()){
    const order=await claimSupplierOrder(pool,{dailyCapUsdCents:dailyCap});
    if(order){
      let supplierPostAuthorized=false;
      try{
        // Avoid supplier lookups for a payment which was already reversed.
        const initialPayment=await verifyHostedPayment({
          apiKey:mollieKey,paymentId:order.payment_id,
          orderId:order.id,amountCents:order.amount_eur_cents
        });
        await recordPaymentStatus(pool,order.id,initialPayment);
        if(!initialPayment.paid)
          throw Error('Customer payment not settled before supplier preparation');
        const customer=openAddress(order.address_encrypted,encryptionKey);
        // Stock, duties, exchange ceiling and wallet can change after checkout.
        await preflightCjDelivery({
          vid:order.supplier_vid,originCountry:order.from_country_code,
          postalCode:customer.postalCode,logisticsName:order.logistics_name,
          maxSupplierUsdCents:order.supplier_max_usd_cents,
          maxSupplierEurCents:order.supplier_landed_eur_ceiling_cents,
          fxMaxEurPerUsdBps:order.supplier_fx_max_eur_per_usd_bps,
          accessToken:cjToken
        });
        const result=await submitCjBalanceOrder({
          order,customer,accessToken:cjToken,
          // This callback executes AFTER CJ wallet read, immediately before
          // its irreversible createOrderV2 POST. Never use an earlier proof.
          authorizeBeforeDebit:async()=>{
            const latest=await verifyHostedPayment({
              apiKey:mollieKey,paymentId:order.payment_id,
              orderId:order.id,amountCents:order.amount_eur_cents
            });
            await recordPaymentStatus(pool,order.id,latest);
            if(!await authorizeSupplierSubmission(pool,order,latest))
              throw Error('Customer payment or local order changed before supplier debit');
            supplierPostAuthorized=true;
          }
        });
        await recordSupplierAttempt(pool,order.id,result,null);
      }catch{
        if(supplierPostAuthorized){
          // Once CJ POST was authorized, even a lost HTTP response could
          // represent a charged supplier order: GET-only recovery is required.
          await recordSupplierAttempt(pool,order.id,null,true).catch(()=>{});
        }else{
          // No POST was started; do not misclassify a preflight rejection as
          // an uncertain CJ purchase or launch needless recovery probes.
          await abortSupplierBeforePost(pool,order.id).catch(()=>{});
        }
        console.error('supplier_order_requires_manual_reconciliation',order.id);
      }
    }
    }
    if(canReadSupplier){
    // Persisted per-order lease avoids repeatedly polling the same shipment
    // on the 45-second worker tick, even when CJ is temporarily unavailable.
    for(const row of await claimSupplierReconciliation(pool)){
      try{
        const detail=await fetchCjOrder({orderId:row.supplier_order_id,accessToken:cjToken});
        await recordSupplierDetail(pool,row.id,detail,encryptionKey);
      }catch{console.error('supplier_status_reconciliation_requires_review',row.id)}
    }
    }
  }catch{dbReady=false;console.error('commerce_worker_unavailable_database_or_job_error')}
  finally{workerBusy=false;}
}
async function route(req,res){
  const pathname=new URL(req.url||'/', 'http://internal.invalid').pathname;
  if(req.method==='GET'&&pathname==='/healthz'){
    return reply(res,200,{service:'atelier-montres-commerce',up:true,
      databaseReady:dbReady,checkoutEnabled:Boolean(merchantReady())});
  }
  if(req.method==='GET'&&pathname==='/api/offers'){
    if(!merchantReady())return reply(res,200,{offers:[],checkoutEnabled:false},cors(req));
    return reply(res,200,{offers:await listApprovedOffers(pool),checkoutEnabled:true},cors(req));
  }
  if(req.method==='OPTIONS'&&pathname.startsWith('/api/')){
    if(req.headers.origin!==origin)return reply(res,403,{error:'Origine refusée'});
    res.writeHead(204,cors(req));res.end();return;
  }
  if(req.method==='POST'&&pathname==='/api/checkout'){
    if(req.headers.origin!==origin)return reply(res,403,{error:'Origine refusée'});
    if(!merchantReady())return reply(res,503,{error:'Achat direct temporairement indisponible'},cors(req));
    const request=validateCheckoutBody(await readJsonBody(req));
    // Lost HTTP responses MUST reuse the first Mollie payment, never start another.
    // Check this before a fresh stock quote: the offer may have expired since purchase.
    const resumed=await findExistingCheckout(pool,request,{idempotencySecret});
    if(resumed)return reply(res,200,resumed,cors(req));
    const offer=await getApprovedOffer(pool,request.offerId);
    if(!offer)return reply(res,409,{error:'Cette montre n’est pas en vente directe actuellement'},cors(req));
    try{
      await preflightCjDelivery({vid:offer.supplier_vid,originCountry:offer.from_country_code,
        postalCode:request.customer.postalCode,logisticsName:offer.logistics_name,
        maxSupplierUsdCents:offer.supplier_max_usd_cents,
        maxSupplierEurCents:offer.supplier_landed_eur_ceiling_cents,
        fxMaxEurPerUsdBps:offer.supplier_fx_max_eur_per_usd_bps,accessToken:cjToken});
    }catch{
      return reply(res,409,{error:'Stock, frais ou livraison non vérifiables pour cette adresse. Aucun paiement demandé.'},cors(req));
    }
    const order=await reserveCheckout(pool,request,{
      encryptionKey,idempotencySecret
    });
    // Another request may have reserved this order while CJ preflight ran.
    // Only the creator of the reservation is allowed to create a payment.
    if(order.reused)return reply(res,200,order,cors(req));
    let payment;
    try{
      payment=await createHostedPayment({apiKey:mollieKey,orderId:order.orderId,
        amountCents:order.amountCents,description:order.description,
        returnUrl:origin+'/commande.html?commande='+encodeURIComponent(order.orderId),
        webhookUrl:backendUrl+'api/webhooks/mollie'});
      await saveCreatedPayment(pool,order.orderId,payment);
    }catch{
      await flagPaymentReview(pool,order.orderId).catch(()=>{});
      throw new ClientError('Le paiement ne peut pas être confirmé actuellement. Aucun nouvel essai automatique.',503);
    }
    return reply(res,201,{kind:'payment',orderId:order.orderId,orderToken:order.token,
      checkoutUrl:payment.checkoutUrl,amountCents:order.amountCents},cors(req));
  }
  if(req.method==='POST'&&pathname==='/api/webhooks/mollie'){
    if(!dbReady||!pool||!enabled)return reply(res,503,{error:'Service de paiement indisponible'});
    const paymentId=await readWebhookBody(req);
    const result=await reconcilePayment(paymentId);
    // Legacy Mollie webhook uses a payment ID, NOT an authenticated success assertion.
    // Only our own authenticated Mollie GET and database transaction can mark PAID.
    reply(res,200,{ok:true});
    if(result.status==='PAID')setImmediate(()=>supplierWork());
    return;
  }
  if(req.method==='GET'&&/^\/api\/orders\/ord_[a-f0-9]{40}$/.test(pathname)){
    if(req.headers.origin!==origin||!dbReady||!pool)
      return reply(res,403,{error:'Accès refusé'});
    const id=pathname.slice('/api/orders/'.length);
    const order=await getOrderForStatus(pool,id,req.headers['x-order-token']);
    return reply(res,200,order,cors(req));
  }
  return reply(res,404,{error:'Route inexistante'});
}
async function start(){
  await ensureDatabase();
  const port=Number(process.env.PORT||8787);
  const server=createServer((req,res)=>route(req,res).catch(error=>{
    const status=error instanceof ClientError?error.status:503;
    if(status===503){
      if(!(error instanceof ClientError))dbReady=false;
      console.error('commerce_request_failed');
    }
    if(!res.writableEnded)reply(res,status,{error:error instanceof ClientError?
      error.message:'Service temporairement indisponible'},cors(req));
  }));
  server.requestTimeout=15000;
  server.headersTimeout=10000;
  server.listen(port,'0.0.0.0',()=>console.log('commerce_api_listening',
    {port,checkoutEnabled:Boolean(merchantReady())}));
  const interval=setInterval(()=>supplierWork(),45000);interval.unref();
  setImmediate(()=>supplierWork());
  const terminate=()=>{clearInterval(interval);server.close();pool?.end().catch(()=>{});};
  process.once('SIGTERM',terminate);process.once('SIGINT',terminate);
}
start().catch(()=>{console.error('commerce_start_failed');process.exitCode=1});
