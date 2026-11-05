'use strict';
/**
 * Optional privacy-minimal outbound intent events (Amazon and approved
 * watch brand/vendor links). Only included when UMAMI_WEBSITE_ID is configured.
 * No cookies, visitor identifiers, link rewriting or delayed navigation.
 */
(() => {
  const idPattern=/^[a-z0-9-]{4,64}$/;
  const asinPattern=/^\/dp\/[A-Z0-9]{10}$/;
  // Public tracking ID, never a credential. CI enforces its consistency with
  // the owner-confirmed Amazon.fr registry. Unrelated IDs are not our clicks.
  const ownerAmazonTag='drackk04-21';
  const placements=new Set(['catalogue','fiche','seo','popular','showroom']);
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
    const keys=[...target.searchParams.keys()];
    const sponsored=el.rel?.split(/\s+/).includes('sponsored')===true;
    const tags=target.searchParams.getAll('tag');
    const hasTag=tags.length>0;
    if(search){
      // Amazon searches are separate from exact product exits and never
      // constitute proof of a commission or of an Amazon product match.
      if(placement!=='popular'||target.pathname!=='/s'||
        target.searchParams.getAll('k').length!==1||
        tags.length!==1||tags[0]!==ownerAmazonTag||
        keys.length!==new Set(keys).size||
        keys.some(key=>!['k','tag'].includes(key)))return;
      try {window.umami.track('amazon-search:'+id)}catch{/* best effort */}
      return;
    }
    if(!asinPattern.test(target.pathname)||keys.length!==new Set(keys).size||
      keys.some(key=>!['tag','th','psc'].includes(key)))return;
    let trackingName;
    if(hasTag){
      // Only our own affiliate tag with an explicit "sponsored" disclosure
      // is counted as a paid exit. Wrong tags are ignored rather than counted
      // under a misleading monetization metric.
      if(tags.length!==1||tags[0]!==ownerAmazonTag||!sponsored)return;
      trackingName='amazon:'+id+':'+placement; // preserve historical paid series
    }else{
      if(sponsored)return; // inconsistent link attribution
      // Unpaid product exits remain useful but cannot inflate paid activity.
      trackingName='amazon-unpaid:'+id+':'+placement;
    }
    if(trackingName.length>55)return;
    try {window.umami.track(trackingName)}catch{/* Navigation cannot depend on analytics. */}
  },{capture:true,passive:true});
})();
