import {readFileSync} from 'node:fs';

// This is a SECOND independent kill switch. Render COMMERCE_ENABLED must be
// true AND the public site's committed config must allow checkout. A forged
// Origin header or valid PSP credentials cannot override an inactive site.
export function storefrontCheckoutPermitted(config,commercePublicUrl){
  if(!config||typeof config!=='object'||Array.isArray(config)||
    config.checkoutMode!=='active')return false;
  // The storefront must explicitly name the exact commercial backend. Do not
  // let a mismatched public API URL be used with a separate payment account.
  if(typeof config.commerceApiUrl!=='string'||
    typeof commercePublicUrl!=='string')return false;
  try{
    const a=new URL(config.commerceApiUrl),b=new URL(commercePublicUrl);
    for(const url of [a,b]){
      if(url.protocol!=='https:'||url.username||url.password||
        url.search||url.hash||url.pathname!=='/'||
        url.port||url.hostname.length<4)return false;
    }
    // The configured server return/webhook URL needs its trailing slash for
    // /api/... concatenation; never silently normalize a broken env value.
    return commercePublicUrl.endsWith('/')&&a.origin===b.origin;
  }catch{return false;}
}

/** Read fresh on every checkout gate check to fail closed on a site freeze,
 * including if the config goes missing or is temporarily corrupt. Never
 * emit config contents, secrets or file-system error messages.
 */
export function readStorefrontCheckoutPermit(commercePublicUrl,{
  file=new URL('../site/config.json',import.meta.url),
  read=readFileSync
}={}){
  try{
    const config=JSON.parse(read(file,'utf8'));
    return storefrontCheckoutPermitted(config,commercePublicUrl);
  }catch{return false;}
}
