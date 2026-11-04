#!/usr/bin/env node
// Single exact-Vid supplier audit: no checkout, publication or wallet access.
import {appendFileSync} from 'node:fs';
import {discoverCjVariant,obtainCjAccessToken} from './cj.mjs';

const EXACT_VID='74F64E7D-7D90-425D-AFB3-487D28B1D09F';
const POSTAL_CODE='75002';
const compactName=value=>typeof value==='string'?
  value.replace(/[\r\n|<>]/g,' ').slice(0,50):'unknown';
async function main(){
  if(process.argv.length!==2)throw Error('This audit accepts no arguments');
  const key=process.env.CJ_API_KEY;
  const token=typeof key==='string'&&key.length>=20?
    await obtainCjAccessToken({apiKey:key}):process.env.CJ_ACCESS_TOKEN;
  if(typeof token!=='string'||token.length<20)throw Error('CJ secret missing');
  await new Promise(resolve=>setTimeout(resolve,1200));
  const result=await discoverCjVariant({
    vid:EXACT_VID,postalCode:POSTAL_CODE,accessToken:token
  });
  // Deliberately whitelist output; never log provider raw JSON/credentials.
  const report={
    kind:'cj_single_freight_diagnostic_read_only',
    vid:EXACT_VID,postalCode:POSTAL_CODE,
    productUsdCents:result.productUsdCents,
    stockConfirmed:result.stockConfirmed,
    shippingMethods:result.shippingMethods,
    excludedIncompleteShippingOptions:result.excludedIncompleteShippingOptions,
    shippingQuoteDiagnostics:result.shippingQuoteDiagnostics,
    shippingRouteSamples:result.shippingRouteSamples,
    sampleOnly:true,approvedForSale:false,customerOrdersCreated:false,
    note:'Quoted carrier base rates are not all-in landed cost. Unknown customs/taxes cannot be treated as zero.'
  };
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    const d=report.shippingQuoteDiagnostics;
    const lines=[
      '## Diagnostic ciblé CJ — une variante, sans achat',
      '',
      '- Stock CN confirmé : **'+(report.stockConfirmed?'oui':'non')+'**',
      '- Options CJ reçues : **'+(d?.optionsReturned??0)+'**',
      '- Options sans informations complètes import : **'+(d?.missingImportFields??0)+'**',
      '- Options sans tarif de transport : **'+(d?.missingShippingRate??0)+'**',
      '- Options aux montants invalides : **'+(d?.invalidAmounts??0)+'**',
      '- Transporteurs contradictoires : **'+(d?.conflictingCarrierRates??0)+'**',
      '- Devis entièrement validés : **'+report.shippingMethods.length+'**',
      '',
      '> Les tarifs de base ci-dessous sont des indications CJ, sans garantie fiscale. Aucune vente ni commande ne peut être activée sur cette seule base.',
      '',
      '| Transporteur | Tarif de base (USD, hors frais non confirmés) | Champs import absents |',
      '| --- | ---: | --- |'
    ];
    for(const option of report.shippingRouteSamples||[]){
      lines.push('| '+compactName(option.carrier)+' | '+
        (Number.isInteger(option.baseShippingUsdCents)?
          '$'+(option.baseShippingUsdCents/100).toFixed(2):'indisponible')+
        ' | '+(option.missingImportFields.join(', ')||'aucun')+' |');
    }
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }
}
main().catch(error=>{
  // No error.message is printed: prevent accidental supplier response leakage.
  console.error('CJ targeted freight audit unavailable (supplier or network error)');
  process.exitCode=1;
});
