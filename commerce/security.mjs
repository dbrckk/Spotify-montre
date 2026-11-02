import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export class ClientError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
const bytes=()=>randomBytes(20).toString('hex');
export const newOrderId=()=> 'ord_'+bytes();
export const newPublicToken=()=>randomBytes(32).toString('base64url');
export const digest=v=>createHash('sha256').update(v).digest('hex');
export const hmac=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
export function sameHash(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;
  return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}
export function addressKey(key){
  if(typeof key!=='string'||!/^[a-f0-9]{64}$/i.test(key))throw Error('ADDRESS_ENCRYPTION_KEY must be 64 hexadecimal characters');
  return Buffer.from(key,'hex');
}
export function sealAddress(customer,key){
  const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',addressKey(key),iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(customer),'utf8'),cipher.final()]);
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function openAddress(value,key){
  const chunks=String(value).split('.');
  if(chunks.length!==4||chunks[0]!=='v1')throw Error('Encrypted customer record malformed');
  const iv=Buffer.from(chunks[1],'base64url');
  const tag=Buffer.from(chunks[2],'base64url');
  if(iv.length!==12||tag.length!==16)throw Error('Encrypted customer record invalid');
  const dec=createDecipheriv('aes-256-gcm',addressKey(key),iv);dec.setAuthTag(tag);
  return JSON.parse(Buffer.concat([dec.update(Buffer.from(chunks[3],'base64url')),dec.final()]).toString('utf8'));
}
function stringField(x,name,min,max,optional=false){
  if(optional&&(x===undefined||x===null||x===''))return '';
  if(typeof x!=='string')throw new ClientError('Champ invalide : '+name);
  const text=x.normalize('NFC').trim();
  if(text.length<min||text.length>max||/[\u0000-\u001f\u007f]/u.test(text))
    throw new ClientError('Champ invalide : '+name);
  return text;
}
export function validateCheckoutBody(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new ClientError('Commande invalide');
  const offerId=stringField(body.offerId,'modèle',4,64);
  if(!/^[a-z0-9-]+$/.test(offerId))throw new ClientError('Modèle invalide');
  const idempotencyKey=stringField(body.idempotencyKey,'référence de tentative',16,90);
  if(!/^[a-zA-Z0-9_-]+$/.test(idempotencyKey))throw new ClientError('Référence de tentative invalide');
  if(body.quantity!==1)throw new ClientError('Un seul exemplaire par commande pour le lancement');
  if(body.acceptTerms!==true)throw new ClientError('Veuillez accepter les conditions de vente');
  const customer={
    fullName:stringField(body.fullName,'nom',3,50),
    email:stringField(body.email,'courriel',5,120).toLowerCase(),
    address1:stringField(body.address1,'adresse',5,200),
    address2:stringField(body.address2,'complément',0,160,true),
    postalCode:stringField(body.postalCode,'code postal',5,5),
    city:stringField(body.city,'ville',2,50),
    region:stringField(body.region,'département ou région',2,50),
    countryCode:stringField(body.countryCode,'pays',2,2).toUpperCase(),
    phone:stringField(body.phone,'téléphone',0,20,true)
  };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))throw new ClientError('Courriel invalide');
  if(!/^\d{5}$/.test(customer.postalCode)||customer.countryCode!=='FR')
    throw new ClientError('Livraison limitée à la France métropolitaine');
  if(!/^\+?[\d ()-]{8,20}$/.test(customer.phone)&&customer.phone!=='')
    throw new ClientError('Téléphone invalide');
  // Leave non-metropolitan ZIPs disabled until the shipping quote supports them.
  if(/^97|^98/.test(customer.postalCode))throw new ClientError('Livraison outre-mer non encore disponible');
  return {offerId,idempotencyKey,customer,quantity:1};
}
export function checkoutFingerprint(order){
  return digest(JSON.stringify({offerId:order.offerId,quantity:order.quantity,customer:order.customer}));
}
export async function readJsonBody(req,max=4096){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))
    throw new ClientError('Content-Type application/json requis',415);
  let length=0;const chunks=[];
  for await(const chunk of req){length+=chunk.length;
    if(length>max)throw new ClientError('Requête trop volumineuse',413);
    chunks.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch{throw new ClientError('JSON invalide')}
}
export async function readWebhookBody(req,max=2048){
  const chunks=[];let len=0;
  for await(const chunk of req){len+=chunk.length;if(len>max)throw new ClientError('Webhook trop volumineux',413);chunks.push(chunk);}
  const raw=Buffer.concat(chunks).toString('utf8');
  const form=new URLSearchParams(raw);
  const values=form.getAll('id');
  if(values.length!==1||!/^[a-zA-Z0-9_]{10,85}$/.test(values[0])||!values[0].startsWith('tr_'))
    throw new ClientError('Webhook invalide');
  return values[0];
}
