#!/usr/bin/env node
import {appendFileSync} from 'node:fs';
import {obtainCjAccessToken} from './cj.mjs';
import {examineCjDetailedFreight} from './cj-detailed-freight.mjs';

const PID='7BCE6BB2-14F7-47C0-B1E1-79C50A253A3A';
const VID='74F64E7D-7D90-425D-AFB3-487D28B1D09F';
async function main(){
  if(process.argv.length!==2)throw Error('No arguments supported');
  const key=process.env.CJ_API_KEY;
  const accessToken=typeof key==='string'&&key.length>=20?
    await obtainCjAccessToken({apiKey:key}):process.env.CJ_ACCESS_TOKEN;
  if(typeof accessToken!=='string'||accessToken.length<20)throw Error('No CJ secret');
  await new Promise(resolve=>setTimeout(resolve,1200));
  const report=await examineCjDetailedFreight({accessToken,pid:PID,vid:VID});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=[
      '## CJ — calcul détaillé de livraison en France (lecture seule)',
      '',
      '- Résultat : **'+report.status+'**',
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
main().catch(()=>{
  console.error('CJ detailed freight estimate not available; credentials or provider data incomplete');
  process.exitCode=1;
});
