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
  const placements=new Set(['catalogue','fiche','seo']);
  document.addEventListener('click',event=>{
    const el=event.target?.closest?.('a[data-amazon-product]');
    if(!el||typeof window.umami?.track!=='function')return;
    const id=el.dataset.amazonProduct;
    const placement=el.dataset.amazonPlacement;
    if(!idPattern.test(id||'')||!placements.has(placement))return;
    let target;
    try {target=new URL(el.href)}catch{return}
    if(target.protocol!=='https:'||target.hostname!=='www.amazon.fr'||target.username||
       target.password||target.port||!asinPattern.test(target.pathname))return;
    // One event per click; the event name itself identifies the watch/placement.
    // No visitor properties means lower usage of Umami's free event quota.
    const name='amazon:'+id+':'+placement;
    if(name.length>50)return;
    try {window.umami.track(name)}catch{/* An analytics outage must never block navigation. */}
  },{capture:true,passive:true});
})();
