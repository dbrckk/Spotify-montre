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
  await assert.rejects(stageEuImportEvidence(pool,valid),/already exists/);
  assert.equal(await getApprovedOffer(pool,id),null,
    'A written proof must never turn a draft into a sellable product');

  await pool.query(
    'UPDATE commerce_offers SET approved=true WHERE id=$1',[id]);
  await assert.rejects(stageEuImportEvidence(pool,valid),
    /Approved offers cannot/);
  console.log('Import proof PostgreSQL OK: exact SKU, no overwrite, no auto approval');
}finally{
  await pool.query('DELETE FROM commerce_offer_import_proofs WHERE offer_id=$1',[id])
    .catch(()=>{});
  await pool.query('DELETE FROM commerce_offers WHERE id=$1',[id])
    .catch(()=>{});
  await pool.end();
}
