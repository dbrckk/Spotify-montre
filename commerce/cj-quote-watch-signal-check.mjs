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
console.log('CJ pilot ticket monitor OK: no inferred quote, only exact supplier correspondence and strictly read-only flags');
