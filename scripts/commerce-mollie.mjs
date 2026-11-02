/*
 * Atelier Montres — transport de paiement hébergé Mollie pour notre propre site.
 * Bibliothèque SERVEUR uniquement : ne jamais l'importer depuis site/.
 *
 * Les appels ne créent jamais de commande fournisseur, ne gèrent pas les cartes
 * et ne prouvent pas la vente sans commande locale durable / webhook réconcilié.
 * Les clés et données clients appartiennent exclusivement aux variables privées.
 */
const API='https://api.mollie.com/v2/payments';
const ORDER=/^ord_[a-zA-Z0-9_-]{12,80}$/;
const PAYMENT=/^tr_[a-zA-Z0-9]{8,80}$/;
const KEY=/^(live|test)_[a-zA-Z0-9]{12,}$/;
const AMOUNT=/^(?:0|[1-9][0-9]*)\.[0-9]{2}$/;

function assertKey(key) {
  if(typeof key!=='string'||!KEY.test(key))throw Error('Clé Mollie serveur absente ou invalide');
  return key.startsWith('live_')?'live':'test';
}
function assertOrder(orderId) {
  if(typeof orderId!=='string'||!ORDER.test(orderId))throw Error('Identifiant de commande interne invalide');
}
function cents(c) {
  if(!Number.isSafeInteger(c)||c<=0||c>100000000)throw Error('Montant EUR en centimes entiers positif requis');
  return c;
}
function euro(c){cents(c);return Math.floor(c/100)+'.'+String(c%100).padStart(2,'0')}
function httpsUrl(s){
  const u=new URL(s);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('URL HTTPS publique sans authentification requise');
  return u.toString();
}
function providerLink(link){
  const url=new URL(link);
  if(url.protocol!=='https:'||url.username||url.password||url.port||
    !['www.mollie.com','checkout.mollie.com'].includes(url.hostname))
    throw Error('URL de paiement Mollie non authentique');
  return url.toString();
}
async function responseJson(resp) {
  if(!resp||!resp.ok)throw Error('Le prestataire de paiement a refusé la requête');
  const j=await resp.json();
  if(!j||typeof j!=='object'||Array.isArray(j))throw Error('Réponse du prestataire invalide');
  return j;
}
const amountMatches=(payment,amountCents)=>payment?.amount?.currency==='EUR'&&
  typeof payment.amount.value==='string'&&AMOUNT.test(payment.amount.value)&&
  payment.amount.value===euro(amountCents);
const belongs=(payment,orderId)=>payment?.metadata?.order_id===orderId;

/*
 * À appeler uniquement APRÈS une transaction DB idempotente créant l'ordre.
 * Lors d'un timeout incertain, réconcilier via l'API et ne JAMAIS recréer
 * naïvement le paiement : aucun double paiement de client.
 */
export async function createHostedPayment({apiKey,orderId,amountCents,description,returnUrl,webhookUrl,fetcher=fetch}){
  const expectedMode=assertKey(apiKey);
  assertOrder(orderId);cents(amountCents);
  if(typeof description!=='string'||!description.trim()||description.length>255)
    throw Error('Description de commande invalide');
  const payload={
    amount:{currency:'EUR',value:euro(amountCents)},
    description:description.trim(),
    redirectUrl:httpsUrl(returnUrl),
    webhookUrl:httpsUrl(webhookUrl),
    metadata:{order_id:orderId}
  };
  const res=await fetcher(API,{method:'POST',redirect:'error',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
  const p=await responseJson(res);
  if(!PAYMENT.test(p.id||'')||p.mode!==expectedMode||!belongs(p,orderId)||
    !amountMatches(p,amountCents)||p.status!=='open')
    throw Error('Paiement créé mais réponse incohérente : rapprochement manuel obligatoire');
  const url=providerLink(p?._links?.checkout?.href);
  return {paymentId:p.id,checkoutUrl:url,mode:p.mode,status:'open',amountCents};
}

/*
 * À appeler depuis le serveur sur notification entrante : le webhook seul
 * ne prouve RIEN. Chercher l'ordre via paymentId préalablement stocké en DB,
 * interroger Mollie, valider identité, devise, montant, mode et référence.
 * Seulement ensuite une transaction DB peut marquer la commande payée.
 */
export async function verifyHostedPayment({apiKey,paymentId,orderId,amountCents,fetcher=fetch}){
  const expectedMode=assertKey(apiKey);
  assertOrder(orderId);cents(amountCents);
  if(typeof paymentId!=='string'||!PAYMENT.test(paymentId))throw Error('Identifiant de paiement invalide');
  const p=await responseJson(await fetcher(API+'/'+paymentId,{
    method:'GET',redirect:'error',
    headers:{'Authorization':'Bearer '+apiKey,'Accept':'application/json'},
    signal:AbortSignal.timeout(10000)
  }));
  if(p.id!==paymentId||p.mode!==expectedMode||!belongs(p,orderId)||
    !amountMatches(p,amountCents))throw Error('Paiement non concordant : ne pas préparer la commande fournisseur');
  const statuses=['open','pending','authorized','paid','failed','canceled','expired'];
  if(!statuses.includes(p.status))throw Error('Statut de paiement inattendu : intervention requise');
  return {paymentId:p.id,orderId,amountCents,status:p.status,paid:p.status==='paid',mode:p.mode};
}
