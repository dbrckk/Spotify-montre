#!/usr/bin/env node
import {appendFileSync} from 'node:fs';
import {obtainCjAccessToken} from './cj.mjs';
import {examineCjDetailedFreight} from './cj-detailed-freight.mjs';

// Catalog ID is a historical hint. The canonical PID must come from queryByVid.
const CATALOG_PID='7BCE6BB2-14F7-47C0-B1E1-79C50A253A3A';
const EXPECTED_PRODUCT_SKU='CJZBNSET00031';
const EXPECTED_VARIANT_SKU='CJZBNSET00031-black';
const VID='74F64E7D-7D90-425D-AFB3-487D28B1D09F';
async function main(){
  if(process.argv.length!==2)throw Error('No arguments supported');
  const key=process.env.CJ_API_KEY;
  const accessToken=typeof key==='string'&&key.length>=20?
    await obtainCjAccessToken({apiKey:key}):process.env.CJ_ACCESS_TOKEN;
  if(typeof accessToken!=='string'||accessToken.length<20)throw Error('No CJ secret');
  await new Promise(resolve=>setTimeout(resolve,1200));
  const report=await examineCjDetailedFreight({
    accessToken,pid:CATALOG_PID,vid:VID,
    expectedProductSku:EXPECTED_PRODUCT_SKU,
    expectedVariantSku:EXPECTED_VARIANT_SKU
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=[
      '## CJ — calcul détaillé de livraison en France (lecture seule)',
      '',
      '- Résultat : **'+report.status+'**',
      '- PID canonique de la variante : **'+report.pid+'**',
      '- PID du catalogue initial identique : **'+
        (report.catalogPidMatched?'oui':'non')+'**',
      '- Poids fournisseur de la variante : **'+
        (report.metadata.weightGrams??'indisponible')+' g**',
      '- Caractéristiques logistiques fournisseur : **'+
        (report.metadata.supplierProperties?.join(', ')||'indisponibles')+'**',
      '- Stock CN de cette variante : **'+(report.stockConfirmed?'oui':'non')+'**',
      '- Méthodes détaillées renvoyées : **'+report.detailedOptionsReturned+'**',
      '- Devis complets observés : **'+report.completeSupplierQuotes.length+'**',
      '',
      '> Aucun tarif ne peut être publié avant contrôle de la fiscalité vendeur, de la conformité et des frais réels du passage de commande.',
      ''
    ];
    if(report.completeSupplierQuotes.length){
      lines.push('| Transporteur | Coût fournisseur + transport/import indiqué (USD) |',
        '| --- | ---: |');
      for(const option of report.completeSupplierQuotes){
        lines.push('| '+option.carrier.replace(/[|\r\n]/g,' ')+' | $'+
          (option.landedUsdCents/100).toFixed(2)+' |');
      }
    }
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }
}
main().catch(error=>{
  // The detailed reader emits only these fixed stage codes. Never print
  // arbitrary provider messages, response bodies, request URLs or tokens.
  const code=error?.message;
  const allowed=new Set([
    'CJ_DETAIL_PRODUCT_READ_FAILED',
    'CJ_DETAIL_PRODUCT_ID_MISMATCH',
    'CJ_DETAIL_VARIANTS_UNAVAILABLE',
    'CJ_DETAIL_EXACT_VARIANT_ABSENT',
    'CJ_DETAIL_VARIANT_READ_FAILED',
    'CJ_DETAIL_VARIANT_ID_MISMATCH',
    'CJ_DETAIL_VARIANT_SKU_MISMATCH',
    'CJ_DETAIL_PRODUCT_SKU_MISMATCH',
    'CJ_DETAIL_PRODUCT_VARIANT_CONTRADICTION',
    'CJ_DETAIL_STOCK_READ_FAILED',
    'CJ_DETAIL_STOCK_FORMAT_INVALID',
    'CJ_DETAIL_FREIGHT_READ_FAILED',
    'CJ_DETAIL_FREIGHT_FORMAT_INVALID'
  ]);
  console.error(allowed.has(code)?code:
    'CJ_DETAIL_SUPPLIER_OR_AUTH_UNAVAILABLE');
  process.exitCode=1;
});
