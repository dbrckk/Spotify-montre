import {createHash,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Independent public-document gate: qualifying a CJ offer or setting
// COMMERCE_ENABLED must not silently open a checkout with missing seller
// identity, unsigned terms or outdated privacy information.
const files=[
  'informations-legales.html',
  'confidentialite.html',
  'conditions-generales-vente.html',
  'acheter.html'
];
const requiredDocumentChecks={
  'informations-legales.html':[
    ['registered_merchant',/\bSIRE(?:N|T)\b[\s\S]{0,80}\b\d{3}[\s.]?\d{3}[\s.]?\d{3}(?:[\s.]?\d{5})?\b/i],
    ['merchant_contact',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i]
  ],
  'confidentialite.html':[
    ['order_data',/commandes?/i],
    ['address_data',/adresse/i],
    ['supplier_data',/fournisseur/i]
  ],
  'conditions-generales-vente.html':[
    ['merchant_terms',/<h1\b[^>]*>[^<]*(?:conditions générales|CGV)[^<]*<\/h1>/i],
    ['sales_total',/prix[\s\S]{0,100}\bTTC\b/i],
    ['delivery_terms',/livraison/i],
    ['withdrawal_terms',/rétractation/i],
    ['legal_guarantee',/garantie/i],
    ['returns',/retours?/i],
    ['merchant_contact',/contact/i]
  ],
  'acheter.html':[
    ['actual_terms_link',/href=["']\.\/conditions-generales-vente\.html["']/i]
  ]
};
const bannedClaims={
  'informations-legales.html':/Informations d'identification incomplètes|n'ont pas encore été fournis|il ne revend pas ces montres|n'accepte aucune commande/i,
  'confidentialite.html':/il n'encaisse aucun paiement|ne prend aucune commande/i,
  'conditions-generales-vente.html':/en préparation|incomplètes|à compléter|exemple fictif|non disponibles|placeholders?/i
};
// An arbitrary nine-digit string is not sufficient evidence of a French
// registered merchant. Validate the public SIREN check digit before allowing
// legal-document publication. This does not verify active registration.
const sirenPattern=/\\bSIRE(?:N|T)\\b\\s*[:#-]?\\s*((?:\\d[\\s.]?){9})(?:\\s*\\d{5})?\\b/gi;
export function hasValidMerchantSiren(document){
  if(typeof document!=='string')return false;
  for(const match of document.matchAll(sirenPattern)){
    const digits=match[1].replace(/[^0-9]/g,'');
    if(digits.length!==9||/^0{9}$/.test(digits))continue;
    const sum=[...digits].reduce((total,digit,index)=>{
      const value=Number(digit)*(index%2===1?2:1);
      return total+(value>9?value-9:value);
    },0);
    if(sum%10===0)return true;
  }
  return false;
}
const issue=(file,name)=>file+':'+name;
export function inspectMerchantPublication({read=readFileSync}={}){
  const body=new Map(),blockers=[];
  for(const file of files){
    try{
      const content=read(new URL('../site/'+file,import.meta.url),'utf8');
      if(typeof content!=='string'||content.length<350||content.length>120_000||
        !/<!doctype html>/i.test(content))throw Error('Invalid merchant document');
      body.set(file,content);
    }catch{
      blockers.push(issue(file,'missing_or_invalid'));
    }
  }
  for(const [file,checks] of Object.entries(requiredDocumentChecks)){
    const content=body.get(file);
    if(!content)continue;
    if(bannedClaims[file]?.test(content))blockers.push(issue(file,'obsolete_or_unverified_claim'));
    for(const [name,pattern] of checks){
      if(!pattern.test(content))blockers.push(issue(file,name+'_missing'));
    }
  }
  if(body.has('informations-legales.html')&&
     !hasValidMerchantSiren(body.get('informations-legales.html')))
    blockers.push(issue('informations-legales.html','siren_checksum_invalid'));
  if(blockers.length)return {ready:false,blockers,bundleSha256:null};
  const h=createHash('sha256').update('atelier-montres-merchant-publication-v1\0');
  for(const file of files){
    const content=body.get(file);
    // Length prefixes disambiguate file boundaries. Order is fixed.
    h.update(file+'\0'+Buffer.byteLength(content,'utf8')+'\0'+content+'\0');
  }
  return {ready:true,blockers:[],bundleSha256:h.digest('hex')};
}
export function merchantPublicationPermitted(env=process.env,{read=readFileSync}={}){
  if(env?.MERCHANT_LEGAL_VERIFIED!=='true'||!(/^[a-f0-9]{64}$/i.test(
    env?.MERCHANT_LEGAL_BUNDLE_SHA256||'')))return false;
  const inspected=inspectMerchantPublication({read});
  return inspected.ready&&timingSafeEqual(
    Buffer.from(inspected.bundleSha256,'hex'),
    Buffer.from(env.MERCHANT_LEGAL_BUNDLE_SHA256,'hex')
  );
}

// Only a local operator uses this command. Output is a validated checklist,
// never the real legal identities or sensitive details from page contents.
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const inspection=inspectMerchantPublication();
  const approved=merchantPublicationPermitted();
  console.log(JSON.stringify({
    kind:'merchant_publication_audit',
    merchantDocumentsReady:inspection.ready,
    merchantPublicationApproved:approved,
    blockers:inspection.blockers,
    // This digest is not an approval; the operator must verify actual legal
    // identity, live fulfillment and consumer policies before pinning it.
    ...(inspection.ready?{publicationBundleSha256:inspection.bundleSha256}:{})
  },null,2));
  if(!approved)process.exitCode=1;
}
