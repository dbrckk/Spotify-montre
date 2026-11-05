#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {calculateCjPilotPrice} from './cj-price-floor.mjs';

// Local/private operator entrypoint. No CJ credentials are needed, and no
// supplier API, checkout, database, wallet or HTTP operation is performed.
try{
  if(process.argv.length!==3)
    throw Error('CJ_PRICE_USAGE_REQUIRES_PRIVATE_EVIDENCE_FILE');
  const payload=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const result=calculateCjPilotPrice(payload);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.minimumGrossEurCents===null)process.exitCode=2;
}catch(error){
  // A source document may contain private supplier business terms. Never
  // echo file names, raw payloads, parser excerpts or stack traces to logs.
  const code=String(error?.message||'');
  console.error(/^CJ_PRICE_[A-Z0-9_]{1,76}$/.test(code)?
    code:'CJ_PRICE_PRIVATE_INPUT_UNAVAILABLE');
  process.exitCode=1;
}
