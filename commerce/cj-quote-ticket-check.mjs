import assert from 'node:assert/strict';
import {
  requestWrittenCjQuote,checkWrittenCjQuote,
  QUOTE_REFERENCE,QUOTE_SKU,QUOTE_TICKET
} from './cj-quote-ticket.mjs';

const token='t'.repeat(40);
const category={ticketTypeId:'1001',ticketTypeName:'Service Consultation',
  questionTypes:[{questionTypeId:'2002',
    questionTypeName:'Fulfillment Service Consultation',formFields:[]}]};
const genericCategory={ticketTypeId:1002,ticketTypeName:'Other Consultation',
  questionTypes:[{questionTypeId:2003,
    questionTypeName:'General Service',formFields:[]}]};
const ok=data=>({ok:true,json:async()=>({code:200,success:true,result:true,data})});
function fakeTicketApi({total=0,existingTicket=0,types=[category],truncate=false,
  changeTotal=false,status='AWAITING_YOUR_REPLY'}={}){
  const calls=[];
  const fetcher=async(url,options)=>{
    const parsed=new URL(url);
    const path=parsed.pathname.replace('/api2.0/v1','');
    const body=options.body?JSON.parse(options.body):null;
    calls.push({path,method:options.method,body});
    assert.equal(parsed.hostname,'developers.cjdropshipping.com');
    assert.equal(options.headers['CJ-Access-Token'],token);
    assert.equal(options.redirect,'error');
    assert.ok(path.startsWith('/ticket/'),'Never access CJ wallet or order endpoints');
    if(path==='/ticket/types')return ok(types);
    if(path==='/ticket/list'){
      assert.equal(options.method,'POST');
      assert.deepEqual(body,{pageNum:body.pageNum,pageSize:50});
      assert.ok(Number.isInteger(body.pageNum)&&body.pageNum>=1);
      const count=Math.max(0,Math.min(50,total-(body.pageNum-1)*50));
      const start=(body.pageNum-1)*50;
      const rows=Array.from({length:truncate&&body.pageNum===1?Math.max(0,count-1):count},
        (_,i)=>({ticketId:String(9001+start+i),status}));
      return ok({total:changeTotal&&body.pageNum===2?total+1:total,
        list:rows,pageNum:body.pageNum,pageSize:50});
    }
    if(path==='/ticket/detail'){
      const ticketId=Number(parsed.searchParams.get('ticketId'));
      return ok({message:ticketId===existingTicket?QUOTE_TICKET.message:
        'Unrelated previous supplier request',status,sku:QUOTE_SKU});
    }
    if(path==='/ticket/create'){
      assert.equal(options.method,'POST');
      assert.equal(body.ticketTypeId,1001,'CJ numeric long ID, not a string');
      assert.equal(body.questionTypeId,2002,'CJ numeric long ID, not a string');
      assert.equal(body.sku,QUOTE_SKU);
      assert.equal(body.requestNo,QUOTE_REFERENCE);
      assert.ok(body.message.includes(QUOTE_REFERENCE));
      assert.ok(!('cjOrderNo' in body));
      assert.deepEqual(body.formList,[]);
      return ok({estimatedHandleTime:null});
    }
    throw Error('Unexpected CJ path');
  };
  return {calls,fetcher};
}
const paths=x=>x.calls.map(c=>c.path);
const createCount=x=>paths(x).filter(p=>p==='/ticket/create').length;

assert.ok(QUOTE_TICKET.message.length<=1000);
assert.ok(QUOTE_TICKET.expectResult.length<=1000);
const preview=fakeTicketApi();
const p=await requestWrittenCjQuote({accessToken:token,fetcher:preview.fetcher});
assert.equal(p.status,'preview_only');
assert.deepEqual(paths(preview),['/ticket/types']);
assert.equal(p.walletDebited,false);
assert.equal(p.orderPlaced,false);

const send=fakeTicketApi();
const s=await requestWrittenCjQuote({accessToken:token,send:true,fetcher:send.fetcher});
assert.equal(s.status,'submitted_to_cj');
assert.deepEqual(paths(send),['/ticket/types','/ticket/list','/ticket/create']);
assert.equal(createCount(send),1);

const duplicate=fakeTicketApi({total:1,existingTicket:9001});
const d=await requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:duplicate.fetcher});
assert.equal(d.status,'already_requested');
assert.deepEqual(paths(duplicate),['/ticket/types','/ticket/list','/ticket/detail']);
assert.equal(createCount(duplicate),0);

// A ticket from page two must prevent a repeat; scanning only 30 or 50
// tickets is not a durable deduplication mechanism.
const secondPage=fakeTicketApi({total:51,existingTicket:9051});
const old=await requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:secondPage.fetcher});
assert.equal(old.status,'already_requested');
assert.equal(paths(secondPage).filter(p=>p==='/ticket/list').length,2);
assert.equal(createCount(secondPage),0);

const none=fakeTicketApi();
const missing=await checkWrittenCjQuote({accessToken:token,fetcher:none.fetcher});
assert.equal(missing.status,'not_requested');
assert.equal(missing.quoteApproved,false);
assert.deepEqual(paths(none),['/ticket/list']);

const pending=fakeTicketApi({total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY'});
const waiting=await checkWrittenCjQuote({accessToken:token,fetcher:pending.fetcher});
assert.equal(waiting.status,'ticket_found');
assert.equal(waiting.supplierStatus,'AWAITING_CJ_REPLY');
assert.equal(waiting.operatorReviewRequired,false);
assert.equal(waiting.quoteApproved,false);
assert.ok(!JSON.stringify(waiting).includes('9001'));
assert.ok(!JSON.stringify(waiting).includes(token));
const replied=fakeTicketApi({total:1,existingTicket:9001});
const seen=await checkWrittenCjQuote({accessToken:token,fetcher:replied.fetcher});
assert.equal(seen.supplierStatus,'AWAITING_YOUR_REPLY');
assert.equal(seen.operatorReviewRequired,true);
assert.equal(seen.quoteApproved,false);

// Unknown or unverified history always fails closed.
for(const fake of [
  fakeTicketApi({total:151}),
  fakeTicketApi({total:1,truncate:true}),
  fakeTicketApi({total:51,changeTotal:true})
]){
  await assert.rejects(requestWrittenCjQuote({
    accessToken:token,send:true,fetcher:fake.fetcher
  }),/HISTORY_UNVERIFIED/);
  assert.equal(createCount(fake),0);
}
const ambiguous=fakeTicketApi({types:[category,category]});
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:ambiguous.fetcher
}),/CATEGORY_NEEDS_REVIEW/);
assert.deepEqual(paths(ambiguous),['/ticket/types']);

const weighted=fakeTicketApi({types:[genericCategory,category]});
const specific=await requestWrittenCjQuote({
  accessToken:token,fetcher:weighted.fetcher
});
assert.equal(specific.category,'Service Consultation');
assert.equal(specific.subject,'Fulfillment Service Consultation');

const mandatory=fakeTicketApi({types:[{...category,
  questionTypes:[{...category.questionTypes[0],
    formFields:[{fieldName:'Order number',required:true}]}]}]});
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:mandatory.fetcher
}),/CATEGORY_NEEDS_REVIEW/);
assert.deepEqual(paths(mandatory),['/ticket/types']);

await assert.rejects(requestWrittenCjQuote({
  accessToken:'invalid',send:true,fetcher:send.fetcher
}),/CJ_ACCESS_TOKEN_MISSING/);
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:'yes',fetcher:send.fetcher
}),/Ticket mode/);
assert.equal(createCount(send),1);
assert.ok(!JSON.stringify(s).includes(token));
assert.ok(!JSON.stringify(p).includes(token));
console.log('CJ written quote workflow OK: multi-page dedupe, status only, safe category, no order or wallet');
