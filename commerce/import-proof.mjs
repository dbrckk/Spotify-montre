import {validateEuImportEvidence} from './eu-import-2026.mjs';

/**
 * Operator-only ingestion of a supplier's written customs/freight statement.
 * A human must validate the document and source independently.
 * No CJ order, wallet, payment, or storefront publication.
 */
export async function stageEuImportEvidence(pool,evidence,{now=new Date()}={}){
  if(!pool||typeof pool.connect!=='function')throw Error('Operator database required');
  if(!evidence||typeof evidence.offerId!=='string'||
    !/^[a-z0-9-]{4,64}$/.test(evidence.offerId))
    throw Error('Valid existing offer id required');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const {rows}=await client.query(
      'SELECT * FROM commerce_offers WHERE id=$1 FOR UPDATE',
      [evidence.offerId]
    );
    const offer=rows[0];
    if(!offer)throw Error('Offer id not present; stage the supplier offer first');
    if(offer.approved===true)throw Error('Approved offers cannot be silently re-attested');
    const busy=await client.query(
      "SELECT 1 FROM commerce_orders WHERE offer_id=$1 AND status IN "+
      "('PAYMENT_CREATING','PAYMENT_PENDING','PAYMENT_REVIEW','PAID',"+
      "'SUPPLIER_SENDING','SUPPLIER_SUBMITTED','SUPPLIER_PAID') LIMIT 1",
      [offer.id]
    );
    if(busy.rowCount)throw Error('Active order prevents changing import proof');
    const result=validateEuImportEvidence(evidence,offer,{now});
    const saved=await client.query(
      'INSERT INTO commerce_offer_import_proofs ('+
      'offer_id,supplier_vid,supplier_pid,supplier_variant_sku,'+
      'supplier_product_sku,logistics_name,consignment_value_eur_cents,'+
      'flat_duty_eur_cents,union_handling_eur_cents,buyer_extra_eur_cents,'+
      'landed_eur_quote_cents,import_payer,import_vat_covered,'+
      'carrier_clearance_covered,supplier_evidence_sha256,valid_until) '+
      'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,true,$13,$14) '+
      'ON CONFLICT(offer_id) DO NOTHING RETURNING offer_id',
      [result.offerId,result.supplierVid,result.supplierPid,
       result.supplierVariantSku,result.supplierProductSku,
       result.logisticsName,result.consignmentValueEurCents,
       result.flatDutyEurCents,result.unionHandlingEurCents,
       result.buyerExtraEurCents,result.landedEurQuoteCents,
       result.importPayer,result.supplierEvidenceSha256,result.validUntil]
    );
    if(saved.rowCount!==1)
      throw Error('Import proof already exists; no silent rewrite permitted');
    await client.query('COMMIT');
    return {offerId:offer.id,status:'recorded_not_approved',
      sourceDocumentSha256:result.supplierEvidenceSha256,
      validUntil:result.validUntil,checkoutEnabled:false};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release()}
}
