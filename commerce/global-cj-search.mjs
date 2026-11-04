#!/usr/bin/env node
import {appendFileSync} from 'node:fs';
import {obtainCjAccessToken} from './cj.mjs';
import {scanCjWatchCatalog} from './cj-global.mjs';

const escapeCell=value=>String(value??'')
  .replace(/[\r\n]+/g,' ').replace(/[|]/g,'\\|')
  .replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,150);

async function main(){
  if(process.argv.length!==2)throw Error('No command-line arguments accepted');
  const key=process.env.CJ_API_KEY;
  const token=typeof key==='string'&&key.length>=20?
    await obtainCjAccessToken({apiKey:key}):process.env.CJ_ACCESS_TOKEN;
  if(typeof token!=='string'||token.length<20)throw Error('CJ credentials absent');
  // CJ authentications can be subject to the same frequency limits as reads.
  await new Promise(resolve=>setTimeout(resolve,1200));
  const report=await scanCjWatchCatalog({
    accessToken:token,postalCode:process.env.CJ_POSTAL_CODE||'75002',
    onProgress:step=>process.stdout.write(JSON.stringify({kind:'cj_scan_progress',...step})+'\n')
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(process.env.GITHUB_STEP_SUMMARY){
    const lines=[
      '## Recherche élargie CJ — échantillons sans achat',
      '',
      `- Recherches terminées : **${report.searchesCompleted}/${report.searchesPlanned}**`,
      `- Recherches interrompues : **${report.failedSearches.length}**`,
      `- Statut : **${report.status}**`,
      `- Produits distincts vérifiés : **${report.distinctProductsChecked}**`,
      `- Variantes avec stock et transport FR : **${report.shippableSamples.length}**`,
      `- Points CJ potentiellement consommés : **${report.pointsAttempted}/${report.maxPoints}**`,
      '',
      '> Recherche non exhaustive ; prix fournisseur en USD, sans homologation ni prix client. Aucun paiement, commande ou publication.',
      ''
    ];
    if(report.failedSearches.length){
      lines.push('### Échecs fournisseurs (sans secrets)',
        '| Recherche | Page | API | Type de problème |',
        '| --- | ---: | --- | --- |');
      for(const failure of report.failedSearches){
        lines.push(`| ${escapeCell(failure.keyword)} | ${failure.page} | ${escapeCell(failure.endpoint)} | ${escapeCell(failure.reason)} |`);
      }
    }
    if(report.shippableSamples.length){
      lines.push('| Produit | VID | Coût fournisseur + port/import USD |',
        '| --- | --- | ---: |');
      for(const item of report.shippableSamples){
        lines.push(`| ${escapeCell(item.name)} | ${escapeCell(item.vid)} | $${(item.shippingMethods[0].landedUsdCents/100).toFixed(2)} |`);
      }
    }else{
      lines.push('Aucun transport vers le code postal échantillon confirmé parmi les variantes examinées. Les autres produits CJ restent inconnus.');
    }
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n','utf8');
  }
  // No stock is a normal supplier outcome; provider faults must remain visible.
  if(report.failedSearches.length)process.exitCode=2;
}
main().catch(error=>{
  // Hide CJ request/response bodies, API key and token in the public log.
  const publicInputError=/^(No command-line arguments|CJ credentials absent|CJ-Access-Token unavailable|CJ sample postcode)/.test(error?.message||'');
  console.error(publicInputError?error.message:
    'CJ global discovery interrupted; inspect API account access, limits and search configuration');
  process.exitCode=1;
});
