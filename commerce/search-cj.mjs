#!/usr/bin/env node
import {obtainCjAccessToken} from './cj.mjs';
import {searchCjWatchCandidates} from './cj-search.mjs';

/** Read-only Android-friendly shortlist. GitHub Actions never has DB/Mollie secrets. */
async function main(){
  if(process.argv.length!==2)throw Error('Use CJ_SEARCH_KEYWORD and CJ_POSTAL_CODE');
  const keyword=process.env.CJ_SEARCH_KEYWORD||'SKMEI';
  const postalCode=process.env.CJ_POSTAL_CODE||'75002';
  const apiKey=process.env.CJ_API_KEY;
  const token=typeof apiKey==='string'&&apiKey.length>=20?
    await obtainCjAccessToken({apiKey}):process.env.CJ_ACCESS_TOKEN;
  if(typeof token!=='string'||token.length<20)
    throw Error('CJ_API_KEY or CJ_ACCESS_TOKEN is required');
  const report=await searchCjWatchCandidates({
    keyword,postalCode,accessToken:token
  });
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(!report.findings.some(row=>row.state==='sample_shipping_available'))
    process.exitCode=2;
}
main().catch(error=>{
  // Unanticipated CJ server messages are excluded from public Actions logs.
  // No raw API credentials, URLs, HTTP payloads or customer data are printed.
  const safe=/^(Use CJ_SEARCH_KEYWORD|CJ_API_KEY or CJ_ACCESS_TOKEN|CJ search keyword|CJ sample postcode|CJ product search limit|CJ-Access-Token)/;
  console.error(safe.test(error?.message||'')?error.message:
    'CJ watch discovery unavailable; inspect API account access and retry');
  process.exitCode=1;
});
