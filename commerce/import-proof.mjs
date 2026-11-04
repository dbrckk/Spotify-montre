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
    // Lock the current attestation together with its owning offer. A second
    // operator cannot renew concurrently or invalidate an in-flight sale.
    const current=await client.query(
      'SELECT * FROM commerce_offer_import_proofs WHERE offer_id=$1 FOR UPDATE',
      [offer.id]
    );
    const previous=current.rows[0]??null;
    if(!previous&&offer.approved===true)
      throw Error('Approved offer cannot receive a first customs attestation');
    if(previous&&new Date(previous.valid_until).getTime()>Date.now())
      throw Error('Active import proof cannot be silently replaced');
    const busy=await client.query(
      "SELECT 1 FROM commerce_orders WHERE offer_id=$1 AND status IN "+
      "('PAYMENT_CREATING','PAYMENT_PENDING','PAYMENT_REVIEW','PAID',"+
      "'SUPPLIER_SENDING','SUPPLIER_SUBMITTED','SUPPLIER_PAID') LIMIT 1",
      [offer.id]
    );
    if(busy.rowCount)throw Error('Active order prevents changing import proof');
    const result=validateEuImportEvidence(evidence,offer,{now});
    if(previous&&previous.supplier_evidence_sha256===result.supplierEvidenceSha256)
      throw Error('New import document must differ from expired document');
    const fields=[
      result.offerId,result.supplierVid,result.supplierPid,
      result.supplierVariantSku,result.supplierProductSku,
      result.logisticsName,result.consignmentValueEurCents,
      result.flatDutyEurCents,result.unionHandlingEurCents,
      result.buyerExtraEurCents,result.landedEurQuoteCents,
      result.importPayer,result.supplierEvidenceSha256,result.validUntil,
      result.merchantProductId,result.supplierNonStandardProductId,
      result.standardizedManufacturerProductId,
      result.noStandardizedManufacturerId,result.customsDeclarant,
      result.customsIdentifiersTransmissionConfirmed
    ];
    let state='recorded_not_approved';
    if(previous){
      // Archive an explicit allowlist: never copy future sensitive columns.
      const archiveFields=[
        'offer_id','supplier_vid','supplier_pid','supplier_variant_sku',
        'supplier_product_sku','logistics_name','consignment_value_eur_cents',
        'flat_duty_eur_cents','union_handling_eur_cents','buyer_extra_eur_cents',
        'landed_eur_quote_cents','import_payer','import_vat_covered',
        'carrier_clearance_covered','supplier_evidence_sha256',
        'valid_until','recorded_at',
        'merchant_product_identifier','supplier_nonstandard_identifier',
        'standardized_manufacturer_identifier',
        'no_standardized_manufacturer_identifier','customs_declarant',
        'customs_identifiers_transmission_confirmed'
      ];
      const archive=Object.fromEntries(archiveFields.map(field=>
        [field,previous[field]]));
      await client.query(
        'INSERT INTO commerce_offer_import_proof_history ('+
          'offer_id,supplier_evidence_sha256,replacement_evidence_sha256,'+
          'previous_record) VALUES($1,$2,$3,$4::jsonb)',
        [offer.id,previous.supplier_evidence_sha256,
          result.supplierEvidenceSha256,JSON.stringify(archive)]
      );
      const updated=await client.query(
        'UPDATE commerce_offer_import_proofs SET '+
          'supplier_vid=$2,supplier_pid=$3,supplier_variant_sku=$4,'+
          'supplier_product_sku=$5,logistics_name=$6,'+
          'consignment_value_eur_cents=$7,flat_duty_eur_cents=$8,'+
          'union_handling_eur_cents=$9,buyer_extra_eur_cents=$10,'+
          'landed_eur_quote_cents=$11,import_payer=$12,'+
          'import_vat_covered=true,carrier_clearance_covered=true,'+
          'supplier_evidence_sha256=$13,valid_until=$14,'+
          'merchant_product_identifier=$15,supplier_nonstandard_identifier=$16,'+
          'standardized_manufacturer_identifier=$17,'+
          'no_standardized_manufacturer_identifier=$18,'+
          'customs_declarant=$19,customs_identifiers_transmission_confirmed=$20,'+
          'recorded_at=now() '+
          'WHERE offer_id=$1 AND supplier_evidence_sha256=$21 '+
          'AND valid_until<=now() RETURNING offer_id',
        [...fields,previous.supplier_evidence_sha256]
      );
      if(updated.rowCount!==1)
        throw Error('Import proof renewal rejected; prior document still active');
      // A renewed cost statement never inherits old merchant approval or
      // stock confirmation, even if they were true on the expired offer.
      await client.query(
        'UPDATE commerce_offers SET approved=false,stock_confirmed=false,'+
          'verified_until=NULL,updated_at=now() WHERE id=$1',
        [offer.id]
      );
      state='renewed_unapproved';
    }else{
      const saved=await client.query(
        'INSERT INTO commerce_offer_import_proofs ('+
          'offer_id,supplier_vid,supplier_pid,supplier_variant_sku,'+
          'supplier_product_sku,logistics_name,consignment_value_eur_cents,'+
          'flat_duty_eur_cents,union_handling_eur_cents,buyer_extra_eur_cents,'+
          'landed_eur_quote_cents,import_payer,import_vat_covered,'+
          'carrier_clearance_covered,supplier_evidence_sha256,valid_until,'+
          'merchant_product_identifier,supplier_nonstandard_identifier,'+
          'standardized_manufacturer_identifier,'+
          'no_standardized_manufacturer_identifier,customs_declarant,'+
          'customs_identifiers_transmission_confirmed) '+
          'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,true,'+
          '$13,$14,$15,$16,$17,$18,$19,$20) '+
          'ON CONFLICT(offer_id) DO NOTHING RETURNING offer_id',
        fields
      );
      if(saved.rowCount!==1)
        throw Error('Import proof already exists; no silent rewrite permitted');
    }
    await client.query('COMMIT');
    return {offerId:offer.id,status:state,
      sourceDocumentSha256:result.supplierEvidenceSha256,
      validUntil:result.validUntil,checkoutEnabled:false};
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release()}
}
