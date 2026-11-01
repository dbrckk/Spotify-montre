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
    const el=event.target?.closest?.('a[data-amazon-product],a[data-amazon-search-id],a[data-merchant-official-id],a[data-partner-offer-id]');
    if(!el||typeof window.umami?.track!=='function')return;
    const official=el.hasAttribute('data-merchant-official-id');
    const search=el.hasAttribute('data-amazon-search-id');
    const partner=el.hasAttribute('data-partner-offer-id');
    if((official&&(search||partner||el.hasAttribute('data-amazon-product')))
       ||(partner&&(search||el.hasAttribute('data-amazon-product'))))return;
    const id=partner?el.dataset.partnerOfferId:official?el.dataset.merchantOfficialId:
      search?el.dataset.amazonSearchId:el.dataset.amazonProduct;
    const placement=partner?el.dataset.partnerPlacement:
      official?el.dataset.merchantPlacement:el.dataset.amazonPlacement;
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
    if(partner){
      if(target.hostname!=='www.awin1.com'||target.pathname!=='/cread.php'
        ||placement!=='popular')return;
      const qs=target.searchParams,keys=[...qs.keys()];
      if(keys.length!==new Set(keys).size||keys.some(key=>!['awinmid','awinaffid','ued','clickref','campaign'].includes(key))
        ||!['26009','94513'].includes(qs.get('awinmid'))
        ||!/^[1-9][0-9]{0,11}$/.test(qs.get('awinaffid')||''))return;
      let destination;
      try{destination=new URL(qs.get('ued'))}catch{return}
      if(destination.protocol!=='https:'||destination.username||destination.password
        ||destination.port||destination.hash||destination.search)return;
      if(qs.get('awinmid')==='94513'){
        if(!['www.addiesdivewatches.com','addiesdivewatches.com'].includes(destination.hostname)
          ||!destination.pathname.startsWith('/products/'))return;
      }else if(destination.hostname!=='www.aliexpress.com'
        ||!new RegExp('^/item/[0-9]{11,16}[.]html$').test(destination.pathname))return;
      try{window.umami.track('awin:'+id+':'+placement)}catch{/* Navigation must continue. */}
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
