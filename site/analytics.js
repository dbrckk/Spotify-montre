'use strict';
/**
 * Optional privacy-minimal outbound intent events (Amazon and approved
 * watch brand/vendor links). Only included when UMAMI_WEBSITE_ID is configured.
 * No cookies, visitor identifiers, link rewriting or delayed navigation.
 */
(() => {
  const idPattern=/^[a-z0-9-]{4,64}$/;
  const asinPattern=/^\/dp\/[A-Z0-9]{10}$/;
  const placements=new Set(['catalogue','fiche','seo','popular']);
  // An exact host allowlist prevents counting arbitrary destinations as
  // approved watch merchants; tracking still never proves an affiliate sale.
  const merchantHosts=new Set([
    'www.shopskmei.com','shopskmei.com','skmei-egy.com','www.skmei-egy.com',
    'www.casio.com','www.citizenwatch.eu','citizenwatch.eu',
    'fr.citizenwatch.eu','www.orientwatch.fr','www.tissotwatches.com',
    'www.seikowatches.com','www.hamiltonwatch.com',
    'www.addiesdivewatches.com','www.paganidesignwatch.com',
    'paganidesign.com','www.paganidesign.com',
    'www.currenwatches.com','www.montre.com','www.swatch.com'
  ]);
  document.addEventListener('click',event=>{
    const el=event.target?.closest?.('a[data-amazon-product],a[data-amazon-search-id],a[data-merchant-official-id]');
    if(!el||typeof window.umami?.track!=='function')return;
    const official=el.hasAttribute('data-merchant-official-id');
    const search=el.hasAttribute('data-amazon-search-id');
    if(official&&(search||el.hasAttribute('data-amazon-product')))return;
    const id=official?el.dataset.merchantOfficialId:
      search?el.dataset.amazonSearchId:el.dataset.amazonProduct;
    const placement=official?el.dataset.merchantPlacement:el.dataset.amazonPlacement;
    if(!idPattern.test(id||'')||!placements.has(placement))return;
    let target;
    try {target=new URL(el.href)}catch{return}
    if(target.protocol!=='https:'||target.username||
       target.password||target.port||target.hash)return;
    if(official){
      if(!merchantHosts.has(target.hostname)||!target.pathname.startsWith('/'))return;
      try {window.umami.track('merchant:'+id+':'+placement)}catch{/* Navigation must continue. */}
      return;
    }
    if(target.hostname!=='www.amazon.fr')return;
    if(search){
      // Results-list referrals must never be confused with verified ASINs.
      if(placement!=='popular'||target.pathname!=='/s'||target.searchParams.getAll('k').length!==1
        ||target.searchParams.getAll('tag').length!==1
        ||!/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(target.searchParams.get('tag')||'')
        ||[...target.searchParams.keys()].some(key=>!['k','tag'].includes(key)))return;
    }else if(!asinPattern.test(target.pathname))return;
    // Aggregated event name only; no visitor IDs, order data or search terms.
    const name=search?'amazon-search:'+id:'amazon:'+id+':'+placement;
    if(name.length>55)return;
    try {window.umami.track(name)}catch{/* Analytics failure never blocks an outbound click. */}
  },{capture:true,passive:true});
})();
