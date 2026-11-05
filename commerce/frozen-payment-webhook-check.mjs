import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {createDatabase} from './db.mjs';

// Start a real HTTP server against the isolated CI PostgreSQL, with sales
// disabled and NO real Mollie/CJ credentials. A nonexistent payment ID must
// be acknowledged WITHOUT calling Mollie or purchasing from CJ.
const dbUrl=process.env.TEST_DATABASE_URL;
if(!dbUrl)throw Error('TEST_DATABASE_URL required');
const uri=new URL(dbUrl);
if(!['127.0.0.1','localhost'].includes(uri.hostname)||
  uri.pathname!=='/commerce_ci')
  throw Error('Refusing webhook integration check outside isolated local CI database');

async function unusedPort(){
  const server=createServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const port=server.address().port;
  server.close();
  await once(server,'close');
  return port;
}
const port=await unusedPort();
const base='http://127.0.0.1:'+port;
const pool=createDatabase(dbUrl);
const child=spawn(process.execPath,['server.mjs'],{
  cwd:new URL('.',import.meta.url),
  env:{
    ...process.env,
    PORT:String(port),
    DATABASE_URL:dbUrl,
    COMMERCE_ENABLED:'false',
    MOLLIE_API_KEY:'',
    CJ_ACCESS_TOKEN:'',
    ADDRESS_ENCRYPTION_KEY:'',
    IDEMPOTENCY_SECRET:'',
    CJ_DAILY_CAP_USD_CENTS:'0',
    STOREFRONT_ORIGIN:'https://atelier-montres-selection-fr.onrender.com',
    COMMERCE_PUBLIC_URL:'https://atelier-montres-commerce-api.onrender.com/'
  },
  stdio:'ignore'
});
async function fetchLocal(path,options={}){
  return fetch(base+path,{...options,signal:AbortSignal.timeout(2500)});
}
try{
  let ready=false;
  for(let attempt=0;attempt<90;attempt++){
    if(child.exitCode!==null)throw Error('Frozen commerce server exited unexpectedly');
    try{
      const response=await fetchLocal('/healthz');
      const state=await response.json();
      assert.equal(state.checkoutEnabled,false);
      if(state.databaseReady===true){ready=true;break;}
    }catch{/* Local service may still be starting. */}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(ready,true,'Frozen commerce should still connect to PostgreSQL');
  const countBefore=Number((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_orders'
  )).rows[0].n);
  const origin='https://atelier-montres-selection-fr.onrender.com';
  const offers=await fetchLocal('/api/offers',{headers:{Origin:origin}});
  assert.equal(offers.status,200);
  assert.deepEqual(await offers.json(),{offers:[],checkoutEnabled:false});
  const checkout=await fetchLocal('/api/checkout',{
    method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({offerId:'ci-test',quantity:1})
  });
  assert.equal(checkout.status,503,
    'commercial freeze must prohibit creation of any new Mollie payment');

  // Mollie legacy webhooks are NOT proof of payment; unknown IDs must trigger
  // zero external calls and be acknowledged without creating customer orders.
  const webhook=await fetchLocal('/api/webhooks/mollie',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'id=tr_ci_unknown_legacy'
  });
  assert.equal(webhook.status,200,
    'freezing sales must not suppress reconciliation callbacks');
  assert.deepEqual(await webhook.json(),{ok:true});

  const countAfter=Number((await pool.query(
    'SELECT count(*)::integer AS n FROM commerce_orders'
  )).rows[0].n);
  assert.equal(countAfter,countBefore,'no local order can be created by unknown webhook');
  const health=await fetchLocal('/healthz');
  assert.equal((await health.json()).checkoutEnabled,false);
  console.log('Frozen commerce HTTP integration OK: no checkout, legacy webhook accepted, no external payment or CJ calls');
}finally{
  child.kill('SIGTERM');
  await Promise.race([once(child,'exit'),new Promise(resolve=>
    setTimeout(()=>{child.kill('SIGKILL');resolve();},3000)
  )]);
  await pool.end();
}
