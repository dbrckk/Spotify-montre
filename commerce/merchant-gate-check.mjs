import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {storefrontCheckoutPermitted,
  readStorefrontCheckoutPermit} from './merchant-gate.mjs';

const backend='https://atelier-montres-commerce-api.onrender.com/';
const live=JSON.parse(readFileSync(new URL('../site/config.json',import.meta.url),'utf8'));
assert.equal(live.checkoutMode,'inactive',
  'the live repository must remain prelaunch while CJ and PSP are unverified');
assert.equal(readStorefrontCheckoutPermit(backend),false,
  'a correctly configured payment backend must not bypass a disabled site');

const approved={...live,checkoutMode:'active',commerceApiUrl:backend};
assert.equal(storefrontCheckoutPermitted(approved,backend),true,
  'future activation requires an explicit exact backend match');
assert.equal(readStorefrontCheckoutPermit(backend,{
  read:()=>JSON.stringify(approved)}),true);

for(const config of [
  {...approved,checkoutMode:'inactive'},
  {...approved,checkoutMode:'preview'},
  {...approved,checkoutMode:null},
  {...approved,commerceApiUrl:'http://atelier-montres-commerce-api.onrender.com/'},
  {...approved,commerceApiUrl:'https://other-store-api.onrender.com/'},
  {...approved,commerceApiUrl:'https://user:pass@atelier-montres-commerce-api.onrender.com/'},
  {...approved,commerceApiUrl:backend+'api/checkout'},
  {...approved,commerceApiUrl:backend+'?enabled=true'},
  {...approved,commerceApiUrl:backend+'#checkout'},
  {...approved,commerceApiUrl:null},
  {...approved,commerceApiUrl:42},
  {},
  null,
  []
]){
  assert.equal(storefrontCheckoutPermitted(config,backend),false,
    'malformed, incomplete or inactive storefront must fail closed');
}
assert.equal(storefrontCheckoutPermitted(approved,backend.slice(0,-1)),false,
  'backend URL without a trailing slash breaks merchant webhook construction');
assert.equal(storefrontCheckoutPermitted(approved,
  'https://another-payments.onrender.com/'),false);
assert.equal(readStorefrontCheckoutPermit(backend,{read:()=>'{invalid'}),false);
assert.equal(readStorefrontCheckoutPermit(backend,{read:()=>{
  throw Error('read failed with private path');
}}),false);
assert.equal(readStorefrontCheckoutPermit(backend,{
  read:()=>JSON.stringify({checkoutMode:'active'})}),false);

// Ensure future refactors cannot make API payment creation or supplier POST
// succeed solely on env configuration while the website remains inactive.
const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
assert.match(server,/const merchantReady=\(\)=>enabled&&readStorefrontCheckoutPermit\(backendUrl\)/);
assert.match(server,/readStorefrontCheckoutPermit\(backendUrl\)&&\s+merchantPublicationPermitted\(\)/,
  'A seller must publish and version-pin verified legal documents before charging anyone');
assert.match(server,/if\(!merchantReady\(\)\)[\s\S]{0,200}throw new ClientError\('Vente directe désactivée/);
assert.match(server,/authorizeBeforeDebit:async\(\)=>\{[\s\S]{0,350}if\(!merchantReady\(\)\)/);
console.log('Storefront/backend checkout interlock OK: prelaunch refuses all payments and CJ orders');
