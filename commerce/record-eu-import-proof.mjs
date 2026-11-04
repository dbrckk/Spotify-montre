#!/usr/bin/env node
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createDatabase,initializeDatabase} from './db.mjs';
import {stageEuImportEvidence} from './import-proof.mjs';
import {computeEuImport2026Baseline} from './eu-import-2026.mjs';

async function main(){
  const [mode,jsonPath,documentPath,...extra]=process.argv.slice(2);
  if(extra.length||!['inspect','record'].includes(mode)||!jsonPath||!documentPath)
    throw Error('Usage: node record-eu-import-proof.mjs inspect|record /private/quote.json /private/supplier-confirmation.pdf');
  const size=statSync(documentPath).size;
  if(!Number.isSafeInteger(size)||size<1||size>5_000_000)
    throw Error('Supplier evidence file must be 1-5000000 bytes');
  const sha=createHash('sha256').update(readFileSync(documentPath)).digest('hex');
  const raw=JSON.parse(readFileSync(jsonPath,'utf8'));
  if(raw&&Object.hasOwn(raw,'supplierEvidenceSha256'))
    throw Error('Do not enter a digest: it is calculated from the actual private evidence file');
  const evidence={...raw,supplierEvidenceSha256:sha};
  const basis=computeEuImport2026Baseline({
    consignmentValueEurCents:evidence.consignmentValueEurCents,
    originCountry:evidence.fromCountryCode,
    destinationCountry:evidence.destinationCountry,
    tariffCategories:evidence.tariffCategories
  });
  if(mode==='inspect'){
    process.stdout.write(JSON.stringify({
      kind:'operator_import_proof_preview',offerId:evidence.offerId,
      sourceSha256:sha,minimumCustomsAndHandlingEurCents:
        basis.minimumKnownChargesEurCents,
      status:'not_recorded_not_approved',
      notice:'Manual written-source verification and full seller tax review still required; no checkout enabled'
    },null,2)+'\n');
    return;
  }
  if(!process.env.DATABASE_URL)
    throw Error('DATABASE_URL required for private import proof recording');
  const pool=createDatabase(process.env.DATABASE_URL);
  try{
    await initializeDatabase(pool);
    const saved=await stageEuImportEvidence(pool,evidence);
    process.stdout.write(JSON.stringify(saved,null,2)+'\n');
  }finally{await pool.end()}
}
main().catch(error=>{
  const safe=/^(Usage:|Supplier evidence file|Do not enter a digest|DATABASE_URL|A valid ISO|This pilot|Documented consignment|Pilot checkout)/.test(error?.message||'');
  console.error(safe?error.message:
    'Cannot record import proof: check source document, exact offer identity, EU fees and source expiry');
  process.exitCode=1;
});
