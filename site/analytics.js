'use strict';
/**
 * Optional Umami event instrumentation.
 * The build only includes this script when UMAMI_WEBSITE_ID is explicitly
 * configured. No cookies, local storage, user identifiers or extra requests.
 * The Amazon destination is never rewritten or delayed.
 */
(() => {
  const idPattern=/^[a-z0-9-]{4,64}$/;
  const asinPattern=/^\/dp\/[A-Z0-9]{10}$/;
  const placements=new Set(['catalogue','fiche','seo','popular']);
  document.addEventListener('click',event=>{
    const el=event.target?.closest?.('a[data-amazon-product],a[data-amazon-search-id]');
    if(!el||typeof window.umami?.track!=='function')return;
    const search=el.hasAttribute('data-amazon-search-id');
    const id=search?el.dataset.amazonSearchId:el.dataset.amazonProduct;
    const placement=el.dataset.amazonPlacement;
    if(!idPattern.test(id||'')||!placements.has(placement))return;
    let target;
    try {target=new URL(el.href)}catch{return}
    if(target.protocol!=='https:'||target.hostname!=='www.amazon.fr'||target.username||
       target.password||target.port||target.hash)return;
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
