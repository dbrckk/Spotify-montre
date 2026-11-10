import assert from 'node:assert/strict';
import {evaluateQuoteWatchSignal} from './cj-quote-watch-signal.mjs';
import {QUOTE_REFERENCE,QUOTE_SKU} from './cj-quote-ticket.mjs';
const base={
  reference:QUOTE_REFERENCE,sku:QUOTE_SKU,status:'ticket_found',
  supplierStatus:'AWAITING_CJ_REPLY',messageVerification:'complete',
  supplierUnread:false,
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
for(const state of ['AWAITING_YOUR_REPLY','COMPLETED','REVIEWED',
  'ON_HOLD','COLLABORATING','UNKNOWN']){
  const v={...unread,supplierUnread:false,supplierStatus:state};
  assert.equal(evaluateQuoteWatchSignal(v).attention,true);
}
const notRequested={...base,status:'not_requested',supplierStatus:null,
  messageVerification:'not_applicable'};
assert.equal(evaluateQuoteWatchSignal(notRequested).blocked,true);
const expired={...base,supplierStatus:'EXPIRED',
  messageVerification:'skipped_expired',supplierMessageCount:null,
  operatorReviewRequired:true};
const expiredSignal=evaluateQuoteWatchSignal(expired);
assert.deepEqual({state:expiredSignal.state,attention:expiredSignal.attention,
  blocked:expiredSignal.blocked},
  {state:'expired_ticket',attention:true,blocked:true});
for(const malformed of [
  {...base,reference:'ANOTHER_TICKET'},
  {...expired,messageVerification:'complete'},
  {...expired,supplierMessageCount:0},
  {...expired,operatorReviewRequired:false},
  {...base,messageVerification:'skipped_expired'},
  {...notRequested,messageVerification:'complete'},
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
  {...base,supplierMessageCount:501},
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
const readonlyWorkflow=readFileSync(new URL('../.github/workflows/cj-ticket-readonly-check.yml',import.meta.url),'utf8');
const manualWorkflow=readFileSync(new URL('../.github/workflows/request-cj-landed-quote.yml',import.meta.url),'utf8');
const concurrencyGroup=source=>/\n\s+group: (cj-[a-z-]+)\n/.exec(source)?.[1];
assert.ok(concurrencyGroup(workflow),'CJ quote monitor needs a shared concurrency guard');
assert.equal(concurrencyGroup(workflow),concurrencyGroup(readonlyWorkflow),
  'CJ supplier polls must run serially under one API QPS guard');
assert.equal(concurrencyGroup(workflow),concurrencyGroup(manualWorkflow),
  'CJ manual ticket request must not overlap with background polls');
for(const required of [
  'workflow_dispatch:',
  "cron: '23 8 * * *'",
  'contents: read',
  'issues: write',
  'node commerce/cj-quote-ticket.mjs status',
  'node commerce/cj-quote-watch-signal.mjs',
  "if: ${{ always() && (steps.quote.outputs.attention == 'true' || steps.quote.outputs.blocked == 'true') }}"
])assert.ok(workflow.includes(required),'CJ watch needs '+required);
assert.match(workflow,/gh issue list --state all/,
  'Supplier alerts and missing-ticket alerts must reuse the same issue');
assert.match(workflow,/steps.quote.outputs.blocked == 'true'/,
  'A missing CJ ticket must generate operator action despite a nonzero prior step');
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
  const expiredResult=run(expired);
  assert.equal(expiredResult.status,2,'An expired supplier ticket must block commerce');
  assert.match(readFileSync(out,'utf8'),/attention=true/);
  assert.match(readFileSync(out,'utf8'),/blocked=true/);
  assert.match(readFileSync(out,'utf8'),/state=expired_ticket/);
  assert.match(readFileSync(summary,'utf8'),/aucun message supposé lu/i);
  const untrusted=run({...base,quoteApproved:true});
  assert.equal(untrusted.status,1);
  assert.doesNotMatch(untrusted.stderr,/at file:|CJ_API_KEY|ticketId/);
}finally{rmSync(temp,{recursive:true,force:true});}
console.log('CJ pilot ticket monitor OK: no inferred quote, only exact supplier correspondence and strictly read-only flags');
