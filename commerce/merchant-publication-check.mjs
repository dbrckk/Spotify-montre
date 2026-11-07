import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {inspectMerchantPublication,merchantPublicationPermitted,hasValidMerchantSiren} from './merchant-publication.mjs';
import {merchantConfigurationChecks} from './readiness.mjs';

const current=inspectMerchantPublication();
assert.equal(current.ready,false,'The real store has no complete signed merchant documentation');
assert.equal(current.bundleSha256,null,'Never pin incomplete public documents');
assert.ok(current.blockers.some(x=>x.includes('conditions-generales-vente.html')),
  'Missing consumer terms must prevent payment activation');
assert.equal(merchantPublicationPermitted({
  MERCHANT_LEGAL_VERIFIED:'true',
  MERCHANT_LEGAL_BUNDLE_SHA256:'a'.repeat(64)
}),false,'The real incomplete documents cannot be approved through an env toggle');

const fixtures={
  'informations-legales.html':
    '<!doctype html><html lang="fr"><head><title>Informations légales</title></head>'+
    '<body><h1>Éditeur</h1><p>Données fictives exclusivement dans le test CI :'+
    ' SIREN 732 829 320, contact@merchant.test, adresse artificielle du marchand.'+
    ' La conformité réelle exige la vérification des coordonnées.</p></body></html>'+
    ' '.repeat(350),
  'confidentialite.html':
    '<!doctype html><html lang="fr"><head><title>Confidentialité</title></head>'+
    '<body><h1>Données des commandes</h1><p>Adresse du client et coordonnées de'+
    ' livraison transmises au fournisseur pour les commandes. Ceci est une'+
    ' fiction locale pour la validation CI uniquement.</p></body></html>'+
    ' '.repeat(350),
  'conditions-generales-vente.html':
    '<!doctype html><html lang="fr"><head><title>CGV</title></head>'+
    '<body><h1>Conditions générales de vente</h1><p>Le vendeur présente les'+
    ' prix TTC en euros. Livraison : délais contractuels. Rétractation : modalités'+
    ' légales. Garantie légale de conformité, retours et contact après-vente.'+
    ' Document synthétique strictement fictif utilisé uniquement en CI.'+
    '</p></body></html>'+' '.repeat(350),
  'acheter.html':
    '<!doctype html><html lang="fr"><head><title>Acheter</title></head>'+
    '<body><main><h1>Commande</h1><label><input type="checkbox">'+
    ' Je confirme avoir lu les <a href="./conditions-generales-vente.html">'+
    'conditions générales de vente</a>.</label></main></body></html>'+
    ' '.repeat(350)
};
const fixtureRead=url=>{
  const name=new URL(url).pathname.split('/').pop();
  if(!Object.hasOwn(fixtures,name))throw Error('unknown file');
  return fixtures[name];
};
// Check digit validation prevents a syntactically plausible but fabricated
// registration number from satisfying the live checkout publication gate.
assert.equal(hasValidMerchantSiren('SIREN 732 829 320'),true);
assert.equal(hasValidMerchantSiren('SIRET 732 829 320 00074'),true);
for(const invalid of ['SIREN 123 456 789','SIREN 000 000 000',
  'SIREN 732 829 321','SIREN not-provided']){
  assert.equal(hasValidMerchantSiren(invalid),false);
}
const invalidRegistration=fixtures['informations-legales.html'].replace(
  'SIREN 732 829 320','SIREN 123 456 789');
const invalidReader=url=>new URL(url).pathname.endsWith('informations-legales.html')
  ?invalidRegistration:fixtureRead(url);
assert.ok(inspectMerchantPublication({read:invalidReader}).blockers.includes(
  'informations-legales.html:siren_checksum_invalid'));
const inspected=inspectMerchantPublication({read:fixtureRead});
assert.equal(inspected.ready,true,'Complete isolated test documents pass structural checks');
assert.match(inspected.bundleSha256,/^[0-9a-f]{64}$/);
const approved={
  MERCHANT_LEGAL_VERIFIED:'true',MERCHANT_LEGAL_BUNDLE_SHA256:inspected.bundleSha256
};
assert.equal(merchantPublicationPermitted(approved,{read:fixtureRead}),true,
  'Both explicit operator approval and exact document fingerprint are required');
for(const env of [
  {...approved,MERCHANT_LEGAL_VERIFIED:'false'},
  {...approved,MERCHANT_LEGAL_VERIFIED:undefined},
  {...approved,MERCHANT_LEGAL_BUNDLE_SHA256:undefined},
  {...approved,MERCHANT_LEGAL_BUNDLE_SHA256:'a'.repeat(64)},
  {...approved,MERCHANT_LEGAL_BUNDLE_SHA256:'invalid'}
]){
  assert.equal(merchantPublicationPermitted(env,{read:fixtureRead}),false,
    'Unsigned or unapproved terms cannot enable a payment');
}
const mutate=(name,content)=>{
  const read=url=>{
    const key=new URL(url).pathname.split('/').pop();
    return key===name?content:fixtureRead(url);
  };
  assert.equal(merchantPublicationPermitted(approved,{read}),false,
    'A changed public document must require re-approval: '+name);
};
for(const [name,content] of Object.entries(fixtures))
  mutate(name,content+'\n<!-- changed after review -->');
mutate('acheter.html',fixtures['acheter.html'].replace(
  './conditions-generales-vente.html','./informations-legales.html'));
mutate('informations-legales.html',fixtures['informations-legales.html']+
  '<p>Informations identification incomplètes</p>');
mutate('confidentialite.html',fixtures['confidentialite.html']+
  '<p>Il n’encaisse aucun paiement et ne prend aucune commande.</p>');
mutate('conditions-generales-vente.html',
  '<!doctype html><h1>Projet en préparation</h1>'+' '.repeat(400));
assert.equal(merchantPublicationPermitted(approved,{
  read:()=>{throw Error('secret local file path') }
}),false);
const config={checkoutMode:'active',
  commerceApiUrl:'https://atelier-montres-commerce-api.onrender.com/'};
assert.equal(merchantConfigurationChecks(approved,config,{read:fixtureRead})
  .merchant_publication_pinned_and_verified,true);
assert.equal(merchantConfigurationChecks({},config,{read:fixtureRead})
  .merchant_publication_pinned_and_verified,false);
const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
assert.match(server,/const merchantReady=\(\)=>enabled&&readStorefrontCheckoutPermit\(backendUrl\)&&\s+merchantPublicationPermitted\(\)/,
  'Legal publications must gate actual checkout and supplier POST');
const cli=spawnSync(process.execPath,[new URL('./merchant-publication.mjs',import.meta.url).pathname],{
  encoding:'utf8'
});
assert.equal(cli.status,1,'Current real documentation must fail closed');
const summary=JSON.parse(cli.stdout);
assert.equal(summary.merchantPublicationApproved,false);
assert.equal(summary.merchantDocumentsReady,false);
assert.ok(!cli.stdout.includes('contact@merchant.test'));
console.log('Merchant publication gate OK: exact documents, approval, hash pinning, fail closed');
