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
// CJ documents long numeric IDs; JSON must carry an exact safe integer.
const id=value=>/^[1-9][0-9]{0,15}$/.test(String(value??''))&&
  Number.isSafeInteger(Number(value));
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
      qualified.push({ticketTypeId:Number(type.ticketTypeId),
        questionTypeId:Number(question.questionTypeId),
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
function createCaller(accessToken,fetcher){
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ_ACCESS_TOKEN_MISSING');
  if(typeof fetcher!=='function')throw Error('Invalid provider transport');
  let last=0;
  return async(path,{method='GET',body}={})=>{
    // Strict endpoint allowlist: never touch order, wallet or product writes.
    if(!['/ticket/types','/ticket/list','/ticket/create'].includes(path)&&
      !/^\/ticket\/detail\?ticketId=[a-zA-Z0-9_-]{1,64}$/.test(path))
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
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(12000)
    });
    if(!response?.ok)throw Error('CJ_TICKET_HTTP_FAILURE');
    const result=await response.json();
    if(result?.code!==200||result?.success===false||result?.result===false)
      throw Error('CJ_TICKET_API_REJECTED');
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
          CJ_STATES.has(entry.status)?entry.status:'UNKNOWN'};
    }
    if(pageNum*HISTORY_PAGE_SIZE>=total)return null;
  }
  throw Error('CJ_TICKET_HISTORY_UNVERIFIED');
}
// Print only the supplier's normalized state; supplier replies, ticket IDs
// and account details are never published in public GitHub Actions logs.
export async function checkWrittenCjQuote({accessToken,fetcher=fetch}={}){
  const call=createCaller(accessToken,fetcher);
  const found=await findExistingQuoteTicket(call);
  return {reference:QUOTE_REFERENCE,sku:QUOTE_SKU,
    status:found?'ticket_found':'not_requested',
    supplierStatus:found?.state??null,
    operatorReviewRequired:Boolean(found&&found.state!=='AWAITING_CJ_REPLY'),
    orderPlaced:false,walletDebited:false,
    quoteApproved:false};
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

async function main(){
  const mode=process.argv[2]||'preview';
  if(!['preview','send','status'].includes(mode)||process.argv.length>3)
    throw Error('Use preview, send or status');
  const apiKey=process.env.CJ_API_KEY;
  if(!apiKey)throw Error('CJ_API_KEY_GITHUB_SECRET_MISSING');
  const token=await obtainCjAccessToken({apiKey});
  // CJ authentication also has a 1 req/s cap; allow it to settle.
  await new Promise(resolve=>setTimeout(resolve,1250));
  const result=mode==='status'?
    await checkWrittenCjQuote({accessToken:token}):
    await requestWrittenCjQuote({accessToken:token,send:mode==='send'});
  console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  main().catch(()=>{
    console.error('CJ ticket request not confirmed. Check existing CJ tickets before any retry; no checkout was enabled.');
    process.exitCode=1;
  });
}
