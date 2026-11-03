#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createDatabase} from './db.mjs';
import {commercialReadinessReport} from './readiness.mjs';

// Local/operator-only CLI. No HTTP management endpoint, no client addresses,
// no provider keys or full database connection string in output.
async function main(){
  if(process.argv.length!==2)
    throw Error('Usage: node commerce/readiness-report.mjs');
  if(!process.env.DATABASE_URL)
    throw Error('DATABASE_URL required for the private operator report');
  const path=fileURLToPath(new URL('../site/config.json',import.meta.url));
  const siteConfig=JSON.parse(readFileSync(path,'utf8'));
  const pool=createDatabase(process.env.DATABASE_URL);
  try{
    const report=await commercialReadinessReport(pool,{
      env:process.env,siteConfig
    });
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }finally{
    await pool.end();
  }
}
main().catch(()=>{
  console.error('Readiness diagnostic unavailable: verify database access and installed schema');
  process.exitCode=1;
});
