import {obtainCjAccessToken} from './cj.mjs';

// One exact, already-observed CJ watch. Never create an order or debit a wallet.
const ROOT='https://developers.cjdropshipping.com/api2.0/v1';
export const QUOTE_REFERENCE='AM-CJ-FR-QUOTE-20261104-CJZBNSET00031';
export const QUOTE_SKU='CJZBNSET00031-black';
const message=[
  'Ref '+QUOTE_REFERENCE+'. Written PRE-ORDER quote only; no purchase.',
  'SKU CJZBNSET00031 / '+QUOTE_SKU+',',
  'VID 74F64E7D-7D90-425D-AFB3-487D28B1D09F,',
  'canonical PID EC60873E-E5A2-4081-82F7-427BC84A8A3D.',
  'One 45g BATTERY watch from CN warehouse to France 75002.',
  '13 freightCalculate routes omitted tariff, and freightCalculateTip',
  'omitted taxesFee and clearanceOperationFee.',
  'Please quote CJPacket Postal, Liquid Line and Euro Sensitive F,',
  'or identify an official all-in prepayment quotation method.',
  'Do not create an order or charge any wallet.'
].join(' ');
const expected=[
  'Written item + freight + VAT/import tax + duty + clearance + handling',
  'and full final total in USD/EUR, per route and valid-through date.',
  'Specify DDP/DAP, importer/declarant, IOSS, 2026 EU low-value/handling',
  'fees, any extra cost the recipient could owe, and whether included.',
  'Give tracked delivery window, battery/GPSR restrictions, customs HS',
  'code, and how C127 M-PID, C128 NS-PID, C129 S-PID or Y081 are handled.',
  'An omitted fee must not be represented as zero.'
].join(' ');
export const QUOTE_TICKET={sku:QUOTE_SKU,message,expectResult:expected,requestNo:QUOTE_REFERENCE};

function assertTicketPayload(){
  for(const field of ['message','expectResult']){
    if(QUOTE_TICKET[field].length<20||QUOTE_TICKET[field].length>1000)
      throw Error('CJ ticket text outside documented limits');
  }
  if(QUOTE_REFERENCE.length>64||QUOTE_SKU.length>100)
    throw Error('CJ ticket reference outside documented limits');
}
// CJ Ticket Types can contain signed-64-bit identifiers larger than the
// JavaScript Number safe range. Preserve their exact decimal digits.
const id=value=>{
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>0;
  return typeof value==='string'&&/^[1-9][0-9]{0,18}$/.test(value)&&
    BigInt(value)<=9223372036854775807n;
};
const ticketId=value=>/^[a-zA-Z0-9_-]{1,64}$/.test(String(value||''));
function selectConsultationCategory(types){
  if(!Array.isArray(types))throw Error('CJ_TICKET_TYPES_UNAVAILABLE');
  const qualified=[];
  for(const type of types){
    if(!id(type?.ticketTypeId)||typeof type.ticketTypeName!=='string'||
      !/consultation|enquiry|inquiry/i.test(type.ticketTypeName))continue;
    if(!Array.isArray(type.questionTypes))continue;
    for(const question of type.questionTypes){
      if(!id(question?.questionTypeId)||typeof question.questionTypeName!=='string'||
        !/fulfil|logistic|shipping|import|customs|general|service/i.test(question.questionTypeName))continue;
      if(!Array.isArray(question.formFields))continue;
      // No fake order number or made-up mandatory form value.
      if(question.formFields.some(f=>f?.required===true))continue;
      const category=type.ticketTypeName.slice(0,75);
      const subject=question.questionTypeName.slice(0,75);
      const score= (/^service consultation$/i.test(category)?100:0)+
        (/^fulfill?ment service consultation$/i.test(subject)?80:0)+
        (/fulfil|logistic|shipping|import|customs/i.test(subject)?30:0);
      qualified.push({ticketTypeId:String(type.ticketTypeId),
        questionTypeId:String(question.questionTypeId),
        category,subject,score});
    }
  }
  // Prefer the uniquely identified consultation workflow. Never guess
  // numeric IDs, and never submit to tied/unknown supplier support queues.
  qualified.sort((a,b)=>b.score-a.score);
  if(!qualified.length||qualified.length>1&&
     qualified[0].score===qualified[1].score)
    throw Error('CJ_TICKET_CATEGORY_NEEDS_REVIEW');
  return qualified[0];
}
// Encode only validated CJ category IDs as exact JSON integer literals.
// JSON.stringify(Number(18-digit-id)) silently rounds; sending a quoted
// string may violate CJ's documented 'long' parameter type.
function encodeCreateTicket(body){
  if(!body||!id(body.ticketTypeId)||!id(body.questionTypeId))
    throw Error('CJ_TICKET_CATEGORY_NEEDS_REVIEW');
  const {ticketTypeId,questionTypeId,...fields}=body;
  if(typeof fields.message!=='string'||typeof fields.expectResult!=='string'||
    !Array.isArray(fields.formList))
    throw Error('CJ_TICKET_INVALID_CREATE_PAYLOAD');
  const suffix=JSON.stringify(fields);
  return '{"ticketTypeId":'+String(ticketTypeId)+
    ',"questionTypeId":'+String(questionTypeId)+','+suffix.slice(1);
}
function createCaller(accessToken,fetcher){
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ_ACCESS_TOKEN_MISSING');
  if(typeof fetcher!=='function')throw Error('Invalid provider transport');
  let last=0;
  return async(path,{method='GET',body}={})=>{
    // Strict endpoint allowlist: never touch order, wallet or product writes.
    if(!['/ticket/types','/ticket/list','/ticket/create'].includes(path)&&
      !/^\/ticket\/detail\?ticketId=[a-zA-Z0-9_-]{1,64}$/.test(path)&&
      !/^\/ticket\/messages\?ticketId=[a-zA-Z0-9_-]{1,64}&pageNum=[1-5]&pageSize=100$/.test(path))
      throw Error('CJ_TICKET_ENDPOINT_DENIED');
    if(fetcher===fetch){
      const delay=1200-(Date.now()-last);
      if(last&&delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
      last=Date.now();
    }
    const response=await fetcher(ROOT+path,{
      method,redirect:'error',
      headers:{'CJ-Access-Token':accessToken,'Content-Type':'application/json',
        'Accept':'application/json'},
      ...(body?{body:path==='/ticket/create'?
        encodeCreateTicket(body):JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(12000)
    });
    const stage=path==='/ticket/types'?'TYPES':
      path==='/ticket/list'?'LIST':
      path==='/ticket/create'?'CREATE':
      path.startsWith('/ticket/messages?')?'MESSAGES':'DETAIL';
    if(!response?.ok)
      throw Error('CJ_TICKET_'+stage+'_HTTP_FAILURE');
    const result=await response.json();
    if(result?.code===1600200)throw Error('CJ_TICKET_RATE_LIMIT');
    if(result?.code!==200||result?.success===false||result?.result===false)
      throw Error('CJ_TICKET_'+stage+'_REJECTED');
    return result.data;
  };
}

// CJ ticket list supports pageSize<=100. Searching one page of 30 tickets
// incorrectly treats a normal, active account as unserviceable. We inspect
// at most 150 tickets in the selected account, never assume older history is
// empty, and abort if pagination or the reported total is inconsistent.
const HISTORY_PAGE_SIZE=50;
const HISTORY_MAX=150;
const CJ_STATES=new Set([
  'AWAITING_CJ_REPLY','AWAITING_YOUR_REPLY','COMPLETED','EXPIRED',
  'REVIEWED','ON_HOLD','COLLABORATING'
]);
async function findExistingQuoteTicket(call){
  let total=null;
  for(let pageNum=1;pageNum<=HISTORY_MAX/HISTORY_PAGE_SIZE;pageNum++){
    const page=await call('/ticket/list',{method:'POST',body:{
      pageNum,pageSize:HISTORY_PAGE_SIZE
    }});
    if(!page||!Array.isArray(page.list)||!Number.isSafeInteger(page.total)||
      page.total<0||page.total>HISTORY_MAX||
      (total!==null&&total!==page.total))
      throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
    total=page.total;
    const expected=Math.max(0,Math.min(HISTORY_PAGE_SIZE,
      total-(pageNum-1)*HISTORY_PAGE_SIZE));
    if(page.list.length!==expected)
      throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
    for(const entry of page.list){
      if(!ticketId(entry?.ticketId))throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
      const detail=await call('/ticket/detail?ticketId='+encodeURIComponent(entry.ticketId));
      if(typeof detail?.message!=='string')
        throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
      if(detail.message.includes(QUOTE_REFERENCE))
        return {state:CJ_STATES.has(detail.status)?detail.status:
          CJ_STATES.has(entry.status)?entry.status:'UNKNOWN',
          // Private ticket ID must never be returned from any public report.
          id:entry.ticketId,
          unread:detail.unread===true||entry.unread===true};
    }
    if(pageNum*HISTORY_PAGE_SIZE>=total)return null;
  }
  throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
}
// Ticket Messages is paginated: "total" is the global count, not the
// number of entries on page 1. Read all pages before reporting "no reply".
// Bound the work: any larger history must be checked manually in CJ.
const MESSAGE_PAGE_SIZE=100;
const MESSAGE_MAX=500;
async function readSupplierMessageMetadata(call,privateTicketId){
  let total=null,supplierMessageCount=0,latestSupplierMessageUtc=null;
  const seenMessageIds=new Set();
  for(let pageNum=1;pageNum<=MESSAGE_MAX/MESSAGE_PAGE_SIZE;pageNum++){
    const path='/ticket/messages?ticketId='+encodeURIComponent(privateTicketId)+
      '&pageNum='+pageNum+'&pageSize='+MESSAGE_PAGE_SIZE;
    const data=await call(path);
    // Only shape codes escape this function: never supplier text, IDs, account
    // details, request URL, timestamps or attachments.
    if(!data||typeof data!=='object'||Array.isArray(data)||
      !Array.isArray(data.list))
      throw Error('CJ_TICKET_MESSAGES_LIST_SHAPE');
    if(!Number.isSafeInteger(data.total)||data.total<0||
      data.total>MESSAGE_MAX)
      throw Error('CJ_TICKET_MESSAGES_TOTAL_SHAPE');
    if(total!==null&&data.total!==total)
      throw Error('CJ_TICKET_MESSAGES_PAGE_MISMATCH');
    total=data.total;
    if((data.pageNum!==undefined&&data.pageNum!==pageNum)||
       (data.pageSize!==undefined&&data.pageSize!==MESSAGE_PAGE_SIZE))
      throw Error('CJ_TICKET_MESSAGES_PAGE_MISMATCH');
    const expected=Math.max(0,Math.min(MESSAGE_PAGE_SIZE,
      total-(pageNum-1)*MESSAGE_PAGE_SIZE));
    if(data.list.length!==expected)
      throw Error('CJ_TICKET_MESSAGES_PAGE_MISMATCH');
    for(const item of data.list){
      if(!item||typeof item!=='object'||Array.isArray(item))
        throw Error('CJ_TICKET_MESSAGES_ITEM_SHAPE');
      if(!['CJ','CUSTOMER'].includes(item.sender))
        throw Error('CJ_TICKET_MESSAGES_SENDER_SHAPE');
      if(!Number.isSafeInteger(item.messageTime)||
        item.messageTime<1577836800000||
        item.messageTime>Date.now()+86400000)
        throw Error('CJ_TICKET_MESSAGES_TIME_SHAPE');
      // CJ documents a messageId as a string. On multi-page histories it
      // must be present and unique: repeated pages must never be counted
      // twice, even if sender and timestamp look plausible.
      if(total>MESSAGE_PAGE_SIZE&&
        (typeof item.messageId!=='string'||!item.messageId.trim()||
         item.messageId.length>128))
        throw Error('CJ_TICKET_MESSAGES_ITEM_SHAPE');
      if(typeof item.messageId==='string'&&item.messageId.trim()){
        if(seenMessageIds.has(item.messageId))
          throw Error('CJ_TICKET_MESSAGES_DUPLICATE_ID');
        seenMessageIds.add(item.messageId);
      }
      if(item.sender==='CJ'){
        supplierMessageCount++;
        latestSupplierMessageUtc=latestSupplierMessageUtc===null?
          item.messageTime:Math.max(latestSupplierMessageUtc,item.messageTime);
      }
    }
    if(pageNum*MESSAGE_PAGE_SIZE>=total){
      return {supplierMessageCount,
        latestSupplierMessageDate:latestSupplierMessageUtc===null?null:
          new Date(latestSupplierMessageUtc).toISOString().slice(0,10)};
    }
  }
  throw Error('CJ_TICKET_MESSAGES_PAGE_MISMATCH');
}
// Never expose the private supplier message, ticket ID, agent identity,
// HTML, attachments or access credentials to GitHub Actions output.
export async function checkWrittenCjQuote({accessToken,fetcher=fetch}={}){
  const call=createCaller(accessToken,fetcher);
  const found=await findExistingQuoteTicket(call);
  const messageMetadata=found?
    await readSupplierMessageMetadata(call,found.id):
    {supplierMessageCount:0,latestSupplierMessageDate:null};
  const unread=found?.unread===true;
  return {reference:QUOTE_REFERENCE,sku:QUOTE_SKU,
    status:found?'ticket_found':'not_requested',
    supplierStatus:found?.state??null,
    supplierUnread:unread,...messageMetadata,
    operatorReviewRequired:Boolean(found&&
      (found.state!=='AWAITING_CJ_REPLY'||unread||
       messageMetadata.supplierMessageCount>0)),
    orderPlaced:false,walletDebited:false,
    quoteApproved:false};
}
// Read-only, supplier-backed health report. It never creates or replies to
// tickets, never places orders and never writes supplier-facing state.
// Only publish short, validated menu labels: not raw CJ responses, private
// tickets, access tokens, customer information or request URLs.
const safeMenuLabel=value=>typeof value==='string'&&value.length<=100&&
  /^[\p{L}\p{N}\p{Zs}.,:&()\/+-]+$/u.test(value)?
  value.slice(0,65):null;
const safeErrorCode=error=>{
  const message=typeof error?.message==='string'?error.message:'';
  const allowed=new Set([
    'CJ_TICKET_HISTORY_UNVERIFIED','CJ_TICKET_TYPES_UNAVAILABLE',
    'CJ_TICKET_CATEGORY_NEEDS_REVIEW','CJ_TICKET_TYPES_HTTP_FAILURE',
    'CJ_TICKET_TYPES_REJECTED','CJ_TICKET_LIST_HTTP_FAILURE',
    'CJ_TICKET_LIST_REJECTED','CJ_TICKET_DETAIL_HTTP_FAILURE',
    'CJ_TICKET_DETAIL_REJECTED','CJ_TICKET_MESSAGES_HTTP_FAILURE',
    'CJ_TICKET_MESSAGES_REJECTED','CJ_TICKET_MESSAGES_UNVERIFIED',
    'CJ_TICKET_MESSAGES_LIST_SHAPE','CJ_TICKET_MESSAGES_TOTAL_SHAPE',
    'CJ_TICKET_MESSAGES_PAGE_MISMATCH','CJ_TICKET_MESSAGES_ITEM_SHAPE',
    'CJ_TICKET_MESSAGES_SENDER_SHAPE','CJ_TICKET_MESSAGES_TIME_SHAPE',
    'CJ_TICKET_MESSAGES_DUPLICATE_ID',
    'CJ_TICKET_CREATE_HTTP_FAILURE',
    'CJ_TICKET_CREATE_REJECTED','CJ_TICKET_RATE_LIMIT',
    'CJ_API_KEY_GITHUB_SECRET_MISSING','CJ_ACCESS_TOKEN_MISSING'
  ]);
  if(allowed.has(message))return message;
  if(message==='CJ authentication HTTP error')return 'CJ_AUTH_HTTP_FAILURE';
  if(message==='CJ account did not authorize access')return 'CJ_AUTH_REJECTED';
  if(message==='CJ API key unavailable')return 'CJ_AUTH_KEY_REJECTED';
  if(message==='CJ-Access-Token unavailable')return 'CJ_AUTH_TOKEN_REJECTED';
  if(error?.name==='TimeoutError'||error?.name==='AbortError')
    return 'CJ_SUPPLIER_TIMEOUT';
  if(error?.name==='TypeError'&&/fetch failed/.test(message))
    return 'CJ_SUPPLIER_NETWORK';
  return 'CJ_TICKET_UNKNOWN_FAILURE';
};
export async function diagnoseWrittenCjQuote({accessToken,fetcher=fetch}={}){
  const call=createCaller(accessToken,fetcher);
  const report={kind:'cj_supplier_ticket_readonly_diagnostic',
    reference:QUOTE_REFERENCE,sku:QUOTE_SKU,
    historyCheck:'not_checked',categoryCheck:'not_checked',
    supplierState:null,quoteApproved:false,
    orderPlaced:false,walletDebited:false};
  try{
    const existing=await findExistingQuoteTicket(call);
    report.historyCheck=existing?'ticket_found':'not_requested';
    if(existing)report.supplierState=existing.state;
  }catch(error){report.historyCheck=safeErrorCode(error);}
  try{
    const types=await call('/ticket/types');
    if(!Array.isArray(types))throw Error('CJ_TICKET_TYPES_UNAVAILABLE');
    report.ticketTypeCount=types.length;
    report.questionTypeCount=types.reduce((n,t)=>n+(
      Array.isArray(t?.questionTypes)?t.questionTypes.length:0),0);
    try{
      const selected=selectConsultationCategory(types);
      report.categoryCheck='eligible';
      report.category=selected.category;
      report.question=selected.subject;
    }catch(error){
      report.categoryCheck=safeErrorCode(error);
      report.menuHints=types.slice(0,12).flatMap(t=>{
        const group=safeMenuLabel(t?.ticketTypeName);
        if(!group||!Array.isArray(t?.questionTypes))return [];
        return t.questionTypes.slice(0,10).flatMap(q=>{
          const subject=safeMenuLabel(q?.questionTypeName);
          return subject?[{type:group,question:subject,
            mandatoryFields:Array.isArray(q.formFields)?
              q.formFields.filter(x=>x?.required===true).length:null}]:[];
        });
      }).slice(0,25);
    }
  }catch(error){report.categoryCheck=safeErrorCode(error);}
  return report;
}
/**
 * Explicit manual support inquiry. Previews only read ticket types.
 * Sending scans paginated account history for our stable marker,
 * because CJ requestNo is only a 5-second duplicate guard.
 * Never automatically retry a failed/timeout POST.
 */
export async function requestWrittenCjQuote({accessToken,send=false,fetcher=fetch}={}){
  if(typeof send!=='boolean')throw Error('Ticket mode must be explicit');
  assertTicketPayload();
  const call=createCaller(accessToken,fetcher);
  const category=selectConsultationCategory(await call('/ticket/types'));
  const safe={reference:QUOTE_REFERENCE,sku:QUOTE_SKU,
    category:category.category,subject:category.subject,
    orderPlaced:false,walletDebited:false};
  if(!send)return {...safe,status:'preview_only'};
  const existing=await findExistingQuoteTicket(call);
  if(existing)return {...safe,status:'already_requested'};
  // The only POST with a side effect. No retries, even on timeout or 5xx.
  // Do not log the raw response or credentials in public GitHub Actions.
  const payload={ticketTypeId:category.ticketTypeId,
    questionTypeId:category.questionTypeId,formList:[],...QUOTE_TICKET};
  await call('/ticket/create',{method:'POST',body:payload});
  return {...safe,status:'submitted_to_cj'};
}

// Alert on any transition away from "waiting for CJ", including unknown
// supplier states and a missing ticket. No supplier action is taken here.
export function supplierTicketNeedsAttention(result){
  return !result||result.status!=='ticket_found'||
    result.supplierStatus!=='AWAITING_CJ_REPLY'||
    result.operatorReviewRequired!==false;
}
async function main(){
  const mode=process.argv[2]||'preview';
  if(!['preview','send','status','diagnose','watch'].includes(mode)||
    process.argv.length>3)
    throw Error('Use preview, send, status, diagnose or watch');
  const apiKey=process.env.CJ_API_KEY;
  if(!apiKey)throw Error('CJ_API_KEY_GITHUB_SECRET_MISSING');
  const token=await obtainCjAccessToken({apiKey});
  // CJ authentication also has a 1 req/s cap; allow it to settle.
  await new Promise(resolve=>setTimeout(resolve,1250));
  const result=mode==='status'||mode==='watch'?
    await checkWrittenCjQuote({accessToken:token}):
    mode==='diagnose'?
      await diagnoseWrittenCjQuote({accessToken:token}):
      await requestWrittenCjQuote({accessToken:token,send:mode==='send'});
  console.log(JSON.stringify(result));
  if(mode==='watch'&&supplierTicketNeedsAttention(result)){
    console.error('CJ_TICKET_OPERATOR_REVIEW_REQUIRED');
    process.exitCode=1;
  }
  if(mode==='diagnose'&&(result.historyCheck!=='not_requested'&&
    result.historyCheck!=='ticket_found'||result.categoryCheck!=='eligible'))
    process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  main().catch(error=>{
    console.error('CJ quote workflow failed at '+safeErrorCode(error)+
      '. Check existing CJ tickets before any send retry. No checkout enabled.');
    process.exitCode=1;
  });
}
