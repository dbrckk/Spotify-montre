import assert from 'node:assert/strict';
import {evaluateQuoteWatchSignal} from './cj-quote-watch-signal.mjs';
import {QUOTE_REFERENCE,QUOTE_SKU} from './cj-quote-ticket.mjs';
const base={
  reference:QUOTE_REFERENCE,sku:QUOTE_SKU,status:'ticket_found',
  supplierStatus:'AWAITING_CJ_REPLY',supplierUnread:false,
  supplierMessageCount:0,latestSupplierMessageDate:null,
  operatorReviewRequired:false,quoteApproved:false,
  orderPlaced:false,walletDebited:false
};
assert.deepEqual(
  (({state,attention,blocked})=>({state,attention,blocked}))(
    evaluateQuoteWatchSignal(base)
  ),
  {state:'awaiting_cj',attention:false,blocked:false}
);
const unread={...base,supplierUnread:true,operatorReviewRequired:true,
  supplierMessageCount:1,latestSupplierMessageDate:'2026-11-06'};
assert.equal(evaluateQuoteWatchSignal(unread).state,'supplier_review_required');
// An already-read supplier reply must still open the single operator task.
const readReply={...unread,supplierUnread:false};
assert.equal(evaluateQuoteWatchSignal(readReply).state,'supplier_review_required');
assert.equal(evaluateQuoteWatchSignal(readReply).attention,true);
for(const state of ['AWAITING_YOUR_REPLY','COMPLETED','EXPIRED','REVIEWED',
  'ON_HOLD','COLLABORATING','UNKNOWN']){
  const v={...unread,supplierUnread:false,supplierStatus:state};
  assert.equal(evaluateQuoteWatchSignal(v).attention,true);
}
const notRequested={...base,status:'not_requested',supplierStatus:null};
assert.equal(evaluateQuoteWatchSignal(notRequested).blocked,true);
for(const malformed of [
  {...base,reference:'ANOTHER_TICKET'},
  {...base,sku:'some_other_model'},
  {...base,quoteApproved:true},
  {...base,walletDebited:true},
  {...base,orderPlaced:true},
  {...base,supplierMessageCount:1},
  {...base,operatorReviewRequired:true},
  {...base,supplierUnread:true},
  {...base,supplierStatus:'PAID_AND_DELIVERED'},
  {...base,latestSupplierMessageDate:'now'},
  {...notRequested,supplierMessageCount:2},
  {...notRequested,operatorReviewRequired:true},
  {...base,status:'ticket_unknown'},
  {...base,supplierMessageCount:101},
  {...base,supplierMessageCount:-1}
]){
  assert.throws(()=>evaluateQuoteWatchSignal(malformed),
    /CJ_WATCH_/,'Malformed or forged CJ report must fail closed');
}
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const workflow=readFileSync(new URL('../.github/workflows/cj-pilot-written-quote-watch.yml',import.meta.url),'utf8');
for(const required of [
  'workflow_dispatch:',
  "cron: '23 8 * * *'",
  'contents: read',
  'issues: write',
  'node commerce/cj-quote-ticket.mjs status',
  'node commerce/cj-quote-watch-signal.mjs',
  "if: steps.quote.outputs.attention == 'true'"
])assert.ok(workflow.includes(required),'CJ watch needs '+required);
assert.ok(!workflow.includes('node commerce/cj-quote-ticket.mjs send'),
  'Automated monitoring must never submit supplier tickets');
assert.ok(!workflow.includes('/api/checkout'),
  'Supplier watching must not access checkout operations');
const temp=mkdtempSync(join(tmpdir(),'cj-watch-'));
try{
  const report=join(temp,'status.json'),out=join(temp,'output.txt'),summary=join(temp,'summary.md');
  const cli=new URL('./cj-quote-watch-signal.mjs',import.meta.url);
  const run=v=>{
    writeFileSync(report,JSON.stringify(v));
    writeFileSync(out,'');
    writeFileSync(summary,'');
    return spawnSync(process.execPath,[new URL(cli).pathname,report],{
      encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:out,GITHUB_STEP_SUMMARY:summary}
    });
  };
  const waiting=run(base);
  assert.equal(waiting.status,0,waiting.stderr);
  assert.match(readFileSync(out,'utf8'),/attention=false/);
  assert.match(readFileSync(summary,'utf8'),/Aucun paiement, achat CJ, devis validé/);
  assert.doesNotMatch(waiting.stdout,/accessToken|CJ_API_KEY|ticketId/);
  const reply=run(unread);
  assert.equal(reply.status,0,reply.stderr);
  assert.match(readFileSync(out,'utf8'),/attention=true/);
  const missing=run(notRequested);
  assert.equal(missing.status,2,'A missing supplier ticket must block the review');
  assert.match(readFileSync(out,'utf8'),/blocked=true/);
  const untrusted=run({...base,quoteApproved:true});
  assert.equal(untrusted.status,1);
  assert.doesNotMatch(untrusted.stderr,/at file:|CJ_API_KEY|ticketId/);
}finally{rmSync(temp,{recursive:true,force:true});}
console.log('CJ pilot ticket monitor OK: no inferred quote, only exact supplier correspondence and strictly read-only flags');
