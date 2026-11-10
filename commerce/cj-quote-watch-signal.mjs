import {appendFileSync,readFileSync} from 'node:fs';
import {QUOTE_REFERENCE,QUOTE_SKU} from './cj-quote-ticket.mjs';

// Convert CJ's already-sanitized, read-only ticket summary into a stable
// operator signal. Never parse supplier message bodies, private ticket IDs,
// credentials, client addresses or raw API responses into Actions/Issues.
const STATES=new Set([
  'AWAITING_CJ_REPLY','AWAITING_YOUR_REPLY','COMPLETED','EXPIRED',
  'REVIEWED','ON_HOLD','COLLABORATING','UNKNOWN'
]);
const ISO_DATE=/^20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])$/;
export function evaluateQuoteWatchSignal(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    value.reference!==QUOTE_REFERENCE||value.sku!==QUOTE_SKU||
    value.orderPlaced!==false||value.walletDebited!==false||
    value.quoteApproved!==false||
    !['complete','skipped_expired','not_applicable'].includes(value.messageVerification)||
    (value.messageVerification==='skipped_expired'?
      value.supplierMessageCount!==null:
      !Number.isSafeInteger(value.supplierMessageCount)||
      value.supplierMessageCount<0||value.supplierMessageCount>500)||
    (value.latestSupplierMessageDate!==null&&
     (typeof value.latestSupplierMessageDate!=='string'||
      !ISO_DATE.test(value.latestSupplierMessageDate)))||
    typeof value.supplierUnread!=='boolean'||
    typeof value.operatorReviewRequired!=='boolean')
    throw Error('CJ_WATCH_INVALID_REPORT');

  if(value.status==='not_requested'){
    if(value.messageVerification!=='not_applicable'||
      value.supplierStatus!==null||value.supplierMessageCount!==0||
      value.latestSupplierMessageDate!==null||
      value.supplierUnread||value.operatorReviewRequired)
      throw Error('CJ_WATCH_INCONSISTENT_MISSING_TICKET');
    return {state:'ticket_not_found',attention:false,blocked:true,
      note:'Ticket CJ introuvable : contrôler le compte et le ticket existant, ne rien envoyer automatiquement.'};
  }
  if(value.status!=='ticket_found'||!STATES.has(value.supplierStatus))
    throw Error('CJ_WATCH_UNKNOWN_SUPPLIER_STATE');
  if(value.supplierStatus==='EXPIRED'){
    if(value.messageVerification!=='skipped_expired'||
       value.supplierMessageCount!==null||
       value.latestSupplierMessageDate!==null||
       value.operatorReviewRequired!==true)
      throw Error('CJ_WATCH_EXPIRED_UNVERIFIED');
    return {state:'expired_ticket',attention:true,blocked:true,
      note:'Ticket fournisseur expiré. Contrôler le dossier CJ et demander un nouveau devis valide uniquement après revue humaine ; aucun message supposé lu.'};
  }
  if(value.messageVerification!=='complete')
    throw Error('CJ_WATCH_INCOMPLETE_MESSAGE_REVIEW');
  if(value.supplierMessageCount===0&&value.latestSupplierMessageDate!==null||
     value.supplierMessageCount>0&&value.latestSupplierMessageDate===null)
    throw Error('CJ_WATCH_INCONSISTENT_MESSAGE_METADATA');
  // A real CJ response requires review even when the ticket is marked read
  // or its status was left as AWAITING_CJ_REPLY by supplier support.
  const expectedReview=value.supplierUnread||value.supplierMessageCount>0||
    value.supplierStatus!=='AWAITING_CJ_REPLY';
  if(value.operatorReviewRequired!==expectedReview)
    throw Error('CJ_WATCH_INCONSISTENT_REVIEW_FLAG');
  const attention=expectedReview;
  return {state:attention?'supplier_review_required':'awaiting_cj',
    attention,blocked:false,
    note:attention?
      'Réponse ou changement d’état CJ à examiner dans le portail fournisseur. Aucun devis approuvé automatiquement.':
      'En attente de CJ : aucun devis livré complet approuvé.'};
}

// GitHub Actions entrypoint: only a tiny, validated status file produced by
// "node commerce/cj-quote-ticket.mjs status" is accepted. No raw supplier
// fields or external identifiers are carried into the issue body/summary.
function main(){
  if(process.argv.length!==3||!process.argv[2])
    throw Error('CJ_WATCH_REPORT_PATH_REQUIRED');
  const data=readFileSync(process.argv[2],'utf8');
  if(data.length>4096)throw Error('CJ_WATCH_REPORT_TOO_LARGE');
  const signal=evaluateQuoteWatchSignal(JSON.parse(data));
  const safe={reference:QUOTE_REFERENCE,sku:QUOTE_SKU,
    state:signal.state,attention:signal.attention,blocked:signal.blocked,
    checkoutEnabled:false,supplierOrderCreated:false,quoteApproved:false};
  console.log(JSON.stringify(safe));
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,
    'attention='+(signal.attention?'true':'false')+'\n'+
    'blocked='+(signal.blocked?'true':'false')+'\n'+
    'state='+signal.state+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '## Première montre — réponse fournisseur CJ (lecture seule)\n\n'+
    '- Référence pilote : `'+QUOTE_SKU+'`\n'+
    '- État : **'+signal.state+'**\n'+
    '- '+signal.note+'\n'+
    '- Aucun paiement, achat CJ, devis validé ni activation de boutique.\n');
  if(signal.blocked)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{main()}catch{
    console.error('CJ_WATCH_REPORT_UNAVAILABLE_OR_INVALID');
    process.exitCode=1;
  }
}
