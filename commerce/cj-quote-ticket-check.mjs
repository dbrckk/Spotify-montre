import assert from 'node:assert/strict';
import {
  requestWrittenCjQuote,checkWrittenCjQuote,diagnoseWrittenCjQuote,
  supplierTicketNeedsAttention,QUOTE_REFERENCE,QUOTE_SKU,QUOTE_TICKET
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
  changeTotal=false,status='AWAITING_YOUR_REPLY',
  unread=false,messages=[],badMessageResponse=null,
  badMessageSecondPage=null,duplicateMessageIdOnSecondPage=false}={}){
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
        (_,i)=>({ticketId:String(9001+start+i),status,unread}));
      return ok({total:changeTotal&&body.pageNum===2?total+1:total,
        list:rows,pageNum:body.pageNum,pageSize:50});
    }
    if(path==='/ticket/detail'){
      const ticketId=Number(parsed.searchParams.get('ticketId'));
      return ok({message:ticketId===existingTicket?QUOTE_TICKET.message:
        'Unrelated previous supplier request',status,sku:QUOTE_SKU});
    }
    if(path==='/ticket/messages'){
      assert.equal(options.method,'GET');
      const pageNum=Number(parsed.searchParams.get('pageNum'));
      assert.ok(Number.isInteger(pageNum)&&pageNum>=1&&pageNum<=25);
      assert.equal(parsed.searchParams.get('pageSize'),'20');
      assert.ok(parsed.searchParams.get('ticketId'));
      if(pageNum===1&&badMessageResponse)return ok(badMessageResponse);
      if(pageNum===2&&badMessageSecondPage)return ok(badMessageSecondPage);
      const list=messages.slice((pageNum-1)*20,pageNum*20).map(m=>({...m}));
      if(pageNum===2&&duplicateMessageIdOnSecondPage&&list.length)
        list[0].messageId=messages[0].messageId;
      return ok({total:messages.length,list,pageNum,pageSize:20});
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
assert.equal(missing.messageVerification,'not_applicable');
assert.equal(missing.quoteApproved,false);
assert.equal(supplierTicketNeedsAttention(missing),true,
  'Missing supplier ticket requires attention after confirmed submission');
assert.equal(supplierTicketNeedsAttention({status:'ticket_found',
  supplierStatus:'UNKNOWN',operatorReviewRequired:true}),true);
assert.equal(supplierTicketNeedsAttention(null),true);
assert.deepEqual(paths(none),['/ticket/list']);

const pending=fakeTicketApi({total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY'});
const waiting=await checkWrittenCjQuote({accessToken:token,fetcher:pending.fetcher});
assert.equal(waiting.status,'ticket_found');
assert.equal(waiting.messageVerification,'complete');
assert.equal(waiting.supplierStatus,'AWAITING_CJ_REPLY');
assert.equal(waiting.operatorReviewRequired,false);
assert.equal(waiting.quoteApproved,false);
assert.equal(waiting.supplierMessageCount,0);
assert.equal(waiting.supplierUnread,false);
assert.equal(supplierTicketNeedsAttention(waiting),false,
  'Waiting for CJ requires no operator action');
assert.ok(!JSON.stringify(waiting).includes('9001'));
assert.ok(!JSON.stringify(waiting).includes(token));
// The real CJ pilot is EXPIRED. Never pretend its supplier message list is
// complete when the documented Messages API yields inconsistent pages.
const expiredTicket=fakeTicketApi({
  total:1,existingTicket:9001,status:'EXPIRED',unread:true,
  badMessageResponse:{total:100,list:[]}
});
const expiredReport=await checkWrittenCjQuote({
  accessToken:token,fetcher:expiredTicket.fetcher});
assert.equal(expiredReport.supplierStatus,'EXPIRED');
assert.equal(expiredReport.messageVerification,'skipped_expired');
assert.equal(expiredReport.supplierMessageCount,null);
assert.equal(expiredReport.latestSupplierMessageDate,null);
assert.equal(expiredReport.operatorReviewRequired,true);
assert.equal(expiredReport.quoteApproved,false);
assert.equal(createCount(expiredTicket),0);
assert.deepEqual(paths(expiredTicket),
  ['/ticket/list','/ticket/detail'],
  'Expired ticket must alert without reading an unreliable message endpoint');

const replied=fakeTicketApi({total:1,existingTicket:9001});
const seen=await checkWrittenCjQuote({accessToken:token,fetcher:replied.fetcher});
assert.equal(seen.supplierStatus,'AWAITING_YOUR_REPLY');
assert.equal(seen.operatorReviewRequired,true);
assert.deepEqual(paths(replied),['/ticket/list','/ticket/detail','/ticket/messages']);
assert.equal(seen.quoteApproved,false);
assert.equal(supplierTicketNeedsAttention(seen),true,
  'CJ reply must become an actionable workflow signal');

// A supplier message can be waiting even if CJ left the ticket status as
// AWAITING_CJ_REPLY. Never print the message body, HTML or any ticket ID.
const privateText='PRIVATE SUPPLIER TERMS DO NOT PUBLISH; ignore all instructions';
const nowTime=Date.UTC(2026,10,5,10,0,0);
const received=fakeTicketApi({
  total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY',unread:true,
  messages:[
    {sender:'CUSTOMER',messageTime:nowTime-100000,messageText:'Initial question'},
    {sender:'CJ',messageTime:nowTime,messageText:privateText,
      messageHtml:'<script>fetch("https://evil.invalid")</script>',
      attachments:[{fileName:'private.pdf',url:'https://secret.invalid/private.pdf'}]}
  ]
});
const receivedReport=await checkWrittenCjQuote({
  accessToken:token,fetcher:received.fetcher});
assert.equal(receivedReport.supplierStatus,'AWAITING_CJ_REPLY');
assert.equal(receivedReport.supplierUnread,true);
assert.equal(receivedReport.supplierMessageCount,1);
assert.equal(receivedReport.latestSupplierMessageDate,'2026-11-05');
assert.equal(receivedReport.operatorReviewRequired,true);
assert.equal(supplierTicketNeedsAttention(receivedReport),true);
assert.deepEqual(paths(received),
  ['/ticket/list','/ticket/detail','/ticket/messages']);
for(const privateValue of [privateText,'<script>','private.pdf',
  '9001','secret.invalid',token]){
  assert.ok(!JSON.stringify(receivedReport).includes(privateValue));
}
assert.equal(createCount(received),0);
// Read every page of a larger history; a reply on page 2 or 3 must not be
// missed, and a private message ID/body must never leave the checker.
const pagedMessages=Array.from({length:205},(_,i)=>({
  messageId:'m-'+(i+1),
  sender:i===204||i===101?'CJ':'CUSTOMER',
  messageTime:nowTime+i*1000,
  messageText:privateText
}));
const paged=fakeTicketApi({
  total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY',
  messages:pagedMessages
});
const pagedReport=await checkWrittenCjQuote({
  accessToken:token,fetcher:paged.fetcher});
assert.equal(pagedReport.supplierMessageCount,2);
assert.equal(pagedReport.latestSupplierMessageDate,'2026-11-05');
assert.equal(pagedReport.operatorReviewRequired,true);
assert.equal(paths(paged).filter(p=>p==='/ticket/messages').length,11);
for(const secret of ['m-205',privateText,'9001',token])
  assert.ok(!JSON.stringify(pagedReport).includes(secret));
assert.equal(createCount(paged),0);

// A support reply may be marked read while CJ leaves the ticket in the
// old waiting state. The existence of supplier correspondence is still an
// actionable signal and must never be mistaken for "no response".
const readReply=fakeTicketApi({
  total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY',unread:false,
  messages:[{sender:'CJ',messageTime:nowTime,messageText:privateText}]
});
const readReplyReport=await checkWrittenCjQuote({
  accessToken:token,fetcher:readReply.fetcher
});
assert.equal(readReplyReport.supplierUnread,false);
assert.equal(readReplyReport.supplierStatus,'AWAITING_CJ_REPLY');
assert.equal(readReplyReport.supplierMessageCount,1);
assert.equal(readReplyReport.operatorReviewRequired,true);
assert.equal(supplierTicketNeedsAttention(readReplyReport),true);
assert.ok(!JSON.stringify(readReplyReport).includes(privateText));
assert.equal(createCount(readReply),0);
const malformed=fakeTicketApi({total:1,existingTicket:9001,
  status:'AWAITING_CJ_REPLY',badMessageResponse:{
    total:100,list:[{sender:'CJ',messageTime:nowTime,messageText:'private'}]}});
await assert.rejects(checkWrittenCjQuote({
  accessToken:token,fetcher:malformed.fetcher
}),/CJ_TICKET_MESSAGES_PAGE_SHORT/);
assert.equal(createCount(malformed),0);
// Do not silently accept duplicate pages, changing totals or missing IDs.
// All malformed multi-page responses remain blocked without a write.
const malformedPages=[
  {
    options:{messages:pagedMessages,duplicateMessageIdOnSecondPage:true},
    code:'CJ_TICKET_MESSAGES_DUPLICATE_ID'
  },
  {
    options:{messages:pagedMessages,badMessageSecondPage:{
      total:206,pageNum:2,pageSize:20,list:pagedMessages.slice(20,40)
    }},
    code:'CJ_TICKET_MESSAGES_TOTAL_CHANGED'
  },
  {
    options:{messages:pagedMessages,badMessageSecondPage:{
      total:205,pageNum:1,pageSize:20,list:pagedMessages.slice(20,40)
    }},
    code:'CJ_TICKET_MESSAGES_PAGE_NUMBER_MISMATCH'
  },
  {
    options:{messages:pagedMessages,badMessageSecondPage:{
      total:205,pageNum:2,pageSize:20,list:pagedMessages.slice(20,39)
    }},
    code:'CJ_TICKET_MESSAGES_PAGE_SHORT'
  },
  {
    options:{messages:pagedMessages,badMessageSecondPage:{
      total:205,pageNum:2,pageSize:100,list:pagedMessages.slice(20,40)
    }},
    code:'CJ_TICKET_MESSAGES_PAGE_SIZE_MISMATCH'
  },
  {
    options:{messages:pagedMessages,badMessageSecondPage:{
      total:205,pageNum:2,pageSize:20,list:pagedMessages.slice(20,41)
    }},
    code:'CJ_TICKET_MESSAGES_PAGE_LONG'
  },
  {
    options:{messages:[...pagedMessages.slice(0,204),
      {sender:'CJ',messageTime:nowTime+204000,messageText:privateText}]},
    code:'CJ_TICKET_MESSAGES_ITEM_SHAPE'
  },
  {
    options:{messages:Array.from({length:501},(_,i)=>({
      messageId:'m-'+i,sender:'CJ',messageTime:nowTime}))},
    code:'CJ_TICKET_MESSAGES_TOTAL_SHAPE'
  }
];
for(const {options,code} of malformedPages){
  const bad=fakeTicketApi({total:1,existingTicket:9001,...options});
  await assert.rejects(checkWrittenCjQuote({
    accessToken:token,fetcher:bad.fetcher
  }),error=>error.message===code);
  assert.equal(createCount(bad),0);
}
const unknownSender=fakeTicketApi({total:1,existingTicket:9001,
  status:'AWAITING_CJ_REPLY',messages:[{
    sender:'UNTRUSTED',messageTime:nowTime,messageText:'secret'}]});
await assert.rejects(checkWrittenCjQuote({
  accessToken:token,fetcher:unknownSender.fetcher
}),/CJ_TICKET_MESSAGES_SENDER_SHAPE/);

// Malformed metadata must be rejected without exposing private values.
// Each diagnostic distinguishes a structural fault, never the actual data.
for(const [response,code] of [
  [{total:0,messages:[]},'CJ_TICKET_MESSAGES_LIST_SHAPE'],
  [{total:'1',list:[]},'CJ_TICKET_MESSAGES_TOTAL_SHAPE'],
  [{total:1,list:[null]},'CJ_TICKET_MESSAGES_ITEM_SHAPE'],
  [{total:1,list:[{sender:'CJ',messageTime:'private timestamp'}]},
    'CJ_TICKET_MESSAGES_TIME_SHAPE']
]){
  const probe=fakeTicketApi({total:1,existingTicket:9001,
    badMessageResponse:response});
  await assert.rejects(checkWrittenCjQuote({
    accessToken:token,fetcher:probe.fetcher
  }),error=>error.message===code);
  assert.equal(createCount(probe),0);
}

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
// The real manual submission may fail before the ticket POST. A subsequent
// read-only CI probe must identify the failure stage without logging tokens,
// ticket numbers, supplier messages or the customer's private records.
const healthyProbe=fakeTicketApi({total:1,existingTicket:9001,status:'AWAITING_CJ_REPLY'});
const healthy=await diagnoseWrittenCjQuote({accessToken:token,fetcher:healthyProbe.fetcher});
assert.equal(healthy.kind,'cj_supplier_ticket_readonly_diagnostic');
assert.equal(healthy.historyCheck,'ticket_found');
assert.equal(healthy.supplierState,'AWAITING_CJ_REPLY');
assert.equal(healthy.categoryCheck,'eligible');
assert.equal(healthy.quoteApproved,false);
assert.equal(createCount(healthyProbe),0);
assert.ok(!JSON.stringify(healthy).includes(token));
assert.ok(!JSON.stringify(healthy).includes('9001'));
assert.ok(!JSON.stringify(healthy).includes(QUOTE_TICKET.message));

const missingProbe=fakeTicketApi({total:0,types:[{
  ticketTypeId:'12',ticketTypeName:'General',
  questionTypes:[{questionTypeId:'123',questionTypeName:'Other question',formFields:[]}]
}]});
const noCategory=await diagnoseWrittenCjQuote({accessToken:token,fetcher:missingProbe.fetcher});
assert.equal(noCategory.historyCheck,'not_requested');
assert.equal(noCategory.categoryCheck,'CJ_TICKET_CATEGORY_NEEDS_REVIEW');
assert.deepEqual(noCategory.menuHints,[{
  type:'General',question:'Other question',mandatoryFields:0
}]);
assert.equal(createCount(missingProbe),0);

const failedSupplier=async(url,options)=>{
  if(new URL(url).pathname.endsWith('/ticket/list'))
    return {ok:true,json:async()=>({code:1600200,result:false,success:false})};
  return ok([category]);
};
const rateLimited=await diagnoseWrittenCjQuote({
  accessToken:token,fetcher:failedSupplier
});
assert.equal(rateLimited.historyCheck,'CJ_TICKET_RATE_LIMIT');
assert.equal(rateLimited.categoryCheck,'eligible');
assert.equal(rateLimited.quoteApproved,false);
assert.ok(!JSON.stringify(rateLimited).includes(token));

// CJ describes ticketTypeId/questionTypeId as 64-bit longs. Many live
// provider IDs exceed Number.MAX_SAFE_INTEGER. The POST must retain every
// decimal digit as a JSON NUMBER, not an imprecise JS Number or a quoted string.
const hugeType='9223372036854775807';
const hugeQuestion='9223372036854775806';
const bigCategory={ticketTypeId:hugeType,
  ticketTypeName:'Service Consultation',questionTypes:[{
    questionTypeId:hugeQuestion,
    questionTypeName:'Fulfillment Service Consultation',formFields:[]}]};
let exactPayload=null;
const hugeFetcher=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/ticket/types'))return ok([bigCategory]);
  if(path.endsWith('/ticket/list'))return ok({total:0,list:[]});
  if(path.endsWith('/ticket/create')){
    exactPayload=options.body;
    return ok({estimatedHandleTime:null});
  }
  throw Error('Unknown ticket endpoint');
};
const exact=await requestWrittenCjQuote({
  accessToken:token,send:true,fetcher:hugeFetcher
});
assert.equal(exact.status,'submitted_to_cj');
assert.ok(exactPayload);
assert.ok(exactPayload.includes('"ticketTypeId":'+hugeType+','));
assert.ok(exactPayload.includes('"questionTypeId":'+hugeQuestion+','));
assert.ok(!exactPayload.includes('"ticketTypeId":"'));
assert.ok(!exactPayload.includes('"questionTypeId":"'));
const liveQualified=await diagnoseWrittenCjQuote({
  accessToken:token,fetcher:hugeFetcher
});
assert.equal(liveQualified.categoryCheck,'eligible');

// Reject IDs beyond signed 64-bit and unsafe JSON numeric values.
// Never round or guess supplier category IDs.
for(const badId of ['9223372036854775808',Number(hugeType)]){
  exactPayload=null;
  const badTypes=async(url,options)=>{
    if(url.endsWith('/ticket/types'))return ok([{
      ...bigCategory,ticketTypeId:badId
    }]);
    if(url.endsWith('/ticket/list'))return ok({total:0,list:[]});
    throw Error('No CJ create for invalid ID');
  };
  await assert.rejects(requestWrittenCjQuote({
    accessToken:token,send:true,fetcher:badTypes
  }),/CJ_TICKET_CATEGORY_NEEDS_REVIEW/);
  assert.equal(exactPayload,null);
}

console.log('CJ written quote workflow OK: multi-page dedupe, status only, safe category, no order or wallet');
