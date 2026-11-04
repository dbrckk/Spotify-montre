import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createDatabase,initializeDatabase,getApprovedOffer} from './db.mjs';
import {stageEuImportEvidence} from './import-proof.mjs';

const url=process.env.TEST_DATABASE_URL;
if(!url)throw Error('TEST_DATABASE_URL required for import evidence CI');
const parsed=new URL(url);
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||
  parsed.pathname!=='/commerce_ci')
  throw Error('Import proof CI cannot connect to a real merchant database');

const pool=createDatabase(url);
const id='ci-import-'+randomBytes(5).toString('hex');
const offer={
  id,supplier_vid:'ci-watch-vid',supplier_pid:'ci-watch-pid',
  supplier_variant_sku:'CI-BLACK',supplier_product_sku:'CI-WATCH',
  logistics_name:'CI Shipping',from_country_code:'CN',
  supplier_landed_eur_ceiling_cents:2500,amount_eur_cents:8990
};
const expires=new Date(Date.now()+86400000).toISOString().replace(/\.\d{3}Z/,'Z');
const valid={
  offerId:id,supplierVid:offer.supplier_vid,supplierPid:offer.supplier_pid,
  supplierVariantSku:offer.supplier_variant_sku,
  supplierProductSku:offer.supplier_product_sku,
  logisticsName:offer.logistics_name,fromCountryCode:'CN',
  destinationCountry:'FR',consignmentValueEurCents:8990,
  tariffCategories:1,flatDutyEurCents:300,unionHandlingEurCents:200,
  importVatCovered:true,carrierClearanceCovered:true,buyerExtraEurCents:0,
  landedEurQuoteCents:1700,importPayer:'SUPPLIER',
  supplierEvidenceSha256:'e'.repeat(64),validUntil:expires,
  operatorReviewed:true
};
try{
  await initializeDatabase(pool);
  await pool.query(
    'INSERT INTO commerce_offers ('+
    'id,label,amount_eur_cents,unit_cost_eur_cents,reserves_eur_cents,'+
    'supplier_landed_eur_ceiling_cents,supplier_max_usd_cents,supplier_vid,'+
    'supplier_pid,supplier_variant_sku,supplier_product_sku,logistics_name) '+
    "VALUES($1,'Synthetic EU customs check',8990,500,600,2500,2000,"+
    "'ci-watch-vid','ci-watch-pid','CI-BLACK','CI-WATCH','CI Shipping')",[id]);

  await assert.rejects(stageEuImportEvidence(pool,{...valid,
    supplierProductSku:'WRONG-SKU'}),/does not match pinned offer/);
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [id])).rows[0].n,0);

  const saved=await stageEuImportEvidence(pool,valid);
  assert.equal(saved.status,'recorded_not_approved');
  assert.equal(saved.checkoutEnabled,false);
  assert.equal(saved.sourceDocumentSha256,'e'.repeat(64));
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [id])).rows[0].n,1);
  await assert.rejects(stageEuImportEvidence(pool,{...valid,
    supplierEvidenceSha256:'f'.repeat(64)}),/Active import proof/);
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proof_history WHERE offer_id=$1',
    [id])).rows[0].n,0,'a still-valid attestation must never be archived');

  assert.equal(await getApprovedOffer(pool,id),null,
    'A written proof must never turn a draft into a sellable product');

  // First proof expired: a new signed document can be recorded only after
  // checking active orders. The previous source and cost stay auditable.
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()-interval '1 minute' WHERE offer_id=$1",
    [id]);
  const orderId='ord_'+randomBytes(16).toString('hex');
  const digest=()=>randomBytes(32).toString('hex');
  await pool.query(
    'INSERT INTO commerce_orders ('+
      'id,public_token_hash,idempotency_hash,request_hash,offer_id,'+
      'product_label,amount_eur_cents,supplier_vid,supplier_pid,'+
      'supplier_variant_sku,supplier_product_sku,supplier_max_usd_cents,'+
      'logistics_name,from_country_code,address_encrypted,status) '+
      'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
    [orderId,digest(),digest(),digest(),id,'Private synthetic watch',
      8990,offer.supplier_vid,offer.supplier_pid,offer.supplier_variant_sku,
      offer.supplier_product_sku,2000,offer.logistics_name,'CN','synthetic',
      'PAYMENT_PENDING']
  );
  const renewal={...valid,supplierEvidenceSha256:'f'.repeat(64)};
  await assert.rejects(stageEuImportEvidence(pool,renewal),
    /Active order prevents/);
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proof_history WHERE offer_id=$1',
    [id])).rows[0].n,0);
  await pool.query('DELETE FROM commerce_orders WHERE id=$1',[orderId]);

  // An expired offer may still carry old administrative approval flags. The
  // renewed document must reset them so a fresh merchant review is required.
  await pool.query(
    "UPDATE commerce_offers SET approved=true,stock_confirmed=true,"+
      "verified_until=now()+interval '1 day' WHERE id=$1",
    [id]);
  const renewed=await stageEuImportEvidence(pool,renewal);
  assert.equal(renewed.status,'renewed_unapproved');
  assert.equal(renewed.checkoutEnabled,false);
  assert.equal(renewed.sourceDocumentSha256,'f'.repeat(64));
  const current=(await pool.query(
    'SELECT supplier_evidence_sha256 FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [id])).rows[0];
  assert.equal(current.supplier_evidence_sha256,'f'.repeat(64));
  const history=(await pool.query(
    'SELECT supplier_evidence_sha256,replacement_evidence_sha256,previous_record FROM '+
    'commerce_offer_import_proof_history WHERE offer_id=$1',
    [id])).rows;
  assert.equal(history.length,1);
  assert.equal(history[0].supplier_evidence_sha256,'e'.repeat(64));
  assert.equal(history[0].replacement_evidence_sha256,'f'.repeat(64));
  assert.equal(history[0].previous_record.supplier_variant_sku,offer.supplier_variant_sku);
  assert.equal(history[0].previous_record.supplier_evidence_sha256,'e'.repeat(64));
  const oldApproval=(await pool.query(
    'SELECT approved,stock_confirmed,verified_until FROM commerce_offers WHERE id=$1',
    [id])).rows[0];
  assert.equal(oldApproval.approved,false);
  assert.equal(oldApproval.stock_confirmed,false);
  assert.equal(oldApproval.verified_until,null);
  await assert.rejects(stageEuImportEvidence(pool,{...valid,
    supplierEvidenceSha256:'a'.repeat(64)}),/Active import proof/);
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proof_history WHERE offer_id=$1',
    [id])).rows[0].n,1,'must retain exactly one immutable archive row');
  // Concurrent admins cannot both replace one expired document.
  await pool.query(
    "UPDATE commerce_offer_import_proofs SET valid_until=now()-interval '1 minute' WHERE offer_id=$1",
    [id]);
  const [one,two]=await Promise.allSettled([
    stageEuImportEvidence(pool,{...valid,supplierEvidenceSha256:'a'.repeat(64)}),
    stageEuImportEvidence(pool,{...valid,supplierEvidenceSha256:'b'.repeat(64)})
  ]);
  assert.equal([one,two].filter(x=>x.status==='fulfilled').length,1);
  assert.equal([one,two].filter(x=>x.status==='rejected').length,1);
  const successfulSha=[one,two].find(x=>x.status==='fulfilled').value.sourceDocumentSha256;
  assert.equal((await pool.query(
    'SELECT supplier_evidence_sha256 FROM commerce_offer_import_proofs WHERE offer_id=$1',
    [id])).rows[0].supplier_evidence_sha256,successfulSha);
  assert.equal((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_offer_import_proof_history WHERE offer_id=$1',
    [id])).rows[0].n,2,'both old documents must stay in append-only history');
  await pool.query(
    'UPDATE commerce_offers SET approved=true WHERE id=$1',[id]);
  await assert.rejects(stageEuImportEvidence(pool,valid),
    /Active import proof/);
  console.log('Import proof PostgreSQL OK: renewal only after expiry, history retained, active orders blocked, merchant approval revoked');
}finally{
  await pool.query('DELETE FROM commerce_offer_import_proof_history WHERE offer_id=$1',
    [id]).catch(()=>{});
  await pool.query('DELETE FROM commerce_offer_import_proofs WHERE offer_id=$1',[id])
    .catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[id])
    .catch(()=>{});
  await pool.end();
}
