import assert from 'node:assert/strict';
import {requestWrittenCjQuote,QUOTE_REFERENCE,QUOTE_SKU,QUOTE_TICKET} from './cj-quote-ticket.mjs';

const token='t'.repeat(40);
const category={ticketTypeId:'1001',ticketTypeName:'Service Consultation',
  questionTypes:[{questionTypeId:'2002',
    questionTypeName:'Fulfillment Service Consultation',formFields:[]}]};
const ok=data=>({ok:true,json:async()=>({code:200,success:true,data})});
function fakeTicketApi({existing=false,total=0,types=[category],badHistory=false}={}){
  const calls=[];
  const fetcher=async(url,options)=>{
    const path=new URL(url).pathname.replace('/api2.0/v1','');
    calls.push({path,method:options.method,
      body:options.body?JSON.parse(options.body):null});
    assert.equal(options.headers['CJ-Access-Token'],token);
    assert.equal(options.redirect,'error');
    assert.ok(path.startsWith('/ticket/'));
    if(path==='/ticket/types')return ok(types);
    if(path==='/ticket/list'){
      assert.equal(options.method,'POST');
      assert.deepEqual(JSON.parse(options.body),{pageNum:1,pageSize:30});
      return ok({total:existing?1:total,list:existing?[{
        ticketId:'9001',ticketNo:'T202611040001'}]:[]});
    }
    if(path==='/ticket/detail')return ok({
      message:badHistory?'Unexpected reply':QUOTE_TICKET.message,sku:QUOTE_SKU});
    if(path==='/ticket/create'){
      assert.equal(options.method,'POST');
      const body=JSON.parse(options.body);
      assert.equal(body.ticketTypeId,'1001');
      assert.equal(body.questionTypeId,'2002');
      assert.equal(body.sku,QUOTE_SKU);
      assert.equal(body.requestNo,QUOTE_REFERENCE);
      assert.ok(body.message.includes(QUOTE_REFERENCE));
      assert.ok(!('cjOrderNo' in body));
      assert.deepEqual(body.formList,[]);
      return ok({estimatedHandleTime:null});
    }
    throw Error('Unexpected API route');
  };
  return {calls,fetcher};
}

assert.ok(QUOTE_TICKET.message.length<=1000);
assert.ok(QUOTE_TICKET.expectResult.length<=1000);
const preview=fakeTicketApi();
const p=await requestWrittenCjQuote({accessToken:token,fetcher:preview.fetcher});
assert.equal(p.status,'preview_only');
assert.deepEqual(preview.calls.map(x=>x.path),['/ticket/types']);
assert.equal(p.walletDebited,false);
assert.equal(p.orderPlaced,false);

const send=fakeTicketApi();
const s=await requestWrittenCjQuote({accessToken:token,send:true,fetcher:send.fetcher});
assert.equal(s.status,'submitted_to_cj');
assert.deepEqual(send.calls.map(x=>x.path),
  ['/ticket/types','/ticket/list','/ticket/create']);
assert.equal(send.calls.filter(x=>x.path==='/ticket/create').length,1);

const duplicate=fakeTicketApi({existing:true});
const d=await requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:duplicate.fetcher});
assert.equal(d.status,'already_requested');
assert.deepEqual(duplicate.calls.map(x=>x.path),
  ['/ticket/types','/ticket/list','/ticket/detail']);
assert.equal(duplicate.calls.filter(x=>x.path==='/ticket/create').length,0);

const busy=fakeTicketApi({total:31});
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:busy.fetcher
}),/HISTORY_UNVERIFIED/);
assert.equal(busy.calls.filter(x=>x.path==='/ticket/create').length,0);

const ambiguous=fakeTicketApi({types:[category,category]});
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:ambiguous.fetcher
}),/CATEGORY_NEEDS_REVIEW/);
assert.deepEqual(ambiguous.calls.map(x=>x.path),['/ticket/types']);

const mandatory=fakeTicketApi({types:[{...category,
  questionTypes:[{...category.questionTypes[0],
    formFields:[{fieldName:'Order number',required:true}]}]}]});
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:mandatory.fetcher
}),/CATEGORY_NEEDS_REVIEW/);
assert.deepEqual(mandatory.calls.map(x=>x.path),['/ticket/types']);

await assert.rejects(requestWrittenCjQuote({
  accessToken:'invalid',send:true,fetcher:send.fetcher
}),/CJ_ACCESS_TOKEN_MISSING/);
await assert.rejects(requestWrittenCjQuote({
  accessToken:token,send:'yes',fetcher:send.fetcher
}),/Ticket mode/);
assert.equal(send.calls.filter(x=>x.path==='/ticket/create').length,1);
assert.ok(!JSON.stringify(s).includes(token));
assert.ok(!JSON.stringify(p).includes(token));
console.log('CJ ticket quote OK: preview, one explicit send, no duplicate, verified category, no wallet/order');
