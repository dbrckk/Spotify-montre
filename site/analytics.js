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
  // Public, source-backed model-to-ASIN allowlist. It is checked against both
  // independent research registries in CI. Do not credit clicks for a product
  // whose destination differs from the model identified in the event.
  const exactAmazonAsinByModel=Object.freeze({
    "addiesdive-ad2030": "B0DNK5TT6D",
    "casio-a158wea-1": "B000GAYQJ0",
    "casio-a168wa": "B01D6XLV5A",
    "casio-a168wg-9": "B002LAS086",
    "casio-ae1200wh-1av": "B0099M2IWI",
    "casio-dw5600rl-1": "B0DN6LT6FX",
    "casio-f91w-1": "B000J34HN4",
    "casio-ga-2100-1a1": "B07WGJ1JNW",
    "casio-gw-m5610u-1": "B09BCPP68Q",
    "casio-la-20wh-4a1": "B077YZHF21",
    "casio-ltp1302": "B0039UT5HC",
    "casio-mdv107": "B09TV2TZY9",
    "casio-mtp-1302": "B0BRPD1FTX",
    "casio-mtp-b145": "B0CJRNV2XS",
    "citizen-openheart": "B0CSPHFBY4",
    "citizen-tsuyosa": "B0BG7VD5YL",
    "hamilton-khaki": "B001QT1LWK",
    "orient-bambino": "B0DR39WLP9",
    "pagani-pd1701": "B0C7QC653D",
    "seiko-5": "B07WGML3VN",
    "seiko-sharp": "B08HR9PC4K",
    "skmei-1251": "B072JTCP5H",
    "skmei-1257": "B07B6ML1VJ",
    "swatch-clearly": "B0C3WQ8YXJ",
    "tissot-le-locle-white": "B01N7FXE80",
    "tissot-gentleman-auto": "B07XTVQ3W7",
    "tissot-prx-quartz": "B08TB1MF6F"
  });
  const placements=new Set(['catalogue','fiche','seo','popular','showroom','comparison']);
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
    const el=event.target?.closest?.('a[data-amazon-product],a[data-amazon-search-id],a[data-merchant-official-id],a[data-partner-offer-id],a[data-compare-source],a[data-focus-compare],a[data-affordable-compare]');
    if(!el||typeof window.umami?.track!=='function')return;
    const compareFields=[
      ['data-compare-source','compareSource','fiche'],
      ['data-focus-compare','focusCompare','selection'],
      ['data-affordable-compare','affordableCompare','accueil']
    ].filter(([attr])=>el.hasAttribute(attr));
    if(compareFields.length){
      if(compareFields.length!==1||el.hasAttribute('data-amazon-product')
        ||el.hasAttribute('data-amazon-search-id')
        ||el.hasAttribute('data-merchant-official-id')
        ||el.hasAttribute('data-partner-offer-id'))return;
      const [,field,placement]=compareFields[0],modelId=el.dataset[field];
      if(!idPattern.test(modelId||''))return;
      let destination;
      try{destination=new URL(el.href)}catch{return}
      // Only explicitly linked local comparison journeys count:
      // never track arbitrary URLs, search text or unvalidated model IDs.
      if(destination.origin!==window.location?.origin
        ||destination.pathname!=='/montres/toutes-les-montres.html'
        ||destination.hash!=='#comparer'
        ||[...destination.searchParams.keys()].join(',')!=='compare')return;
      const models=destination.searchParams.get('compare')?.split(',')||[];
      if(models.length<2||models.length>3
        ||new Set(models).size!==models.length
        ||!models.includes(modelId)
        ||!models.every(model=>idPattern.test(model)))return;
      try{window.umami.track('compare:'+modelId+':'+placement)}catch{/* Navigation must continue. */}
      return;
    }
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
        ||!['popular','comparison'].includes(placement))return;
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
      if(!['popular','comparison'].includes(placement)||target.pathname!=='/s'||
        target.searchParams.getAll('k').length!==1||
        tags.length!==1||tags[0]!==ownerAmazonTag||
        keys.length!==new Set(keys).size||
        keys.some(key=>!['k','tag'].includes(key)))return;
      try {window.umami.track('amazon-search:'+id+(placement==='comparison'?':comparison':''))}catch{/* best effort */}
      return;
    }
    if(!asinPattern.test(target.pathname)||keys.length!==new Set(keys).size||
      keys.some(key=>!['tag','th','psc'].includes(key)))return;
    if(!Object.hasOwn(exactAmazonAsinByModel,id)||
       target.pathname!=='/dp/'+exactAmazonAsinByModel[id])return;
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

  // A filter activation is a category-only signal. Never transmit raw text
  // search queries, selected URL parameters, user identifiers, or form values.
  document.addEventListener('change',event=>{
    if(typeof window.umami?.track!=='function')return;
    const input=event.target,form=input?.form;
    if(!input||input.type!=='checkbox'||!input.checked
      ||form?.id!=='am-pick-filters')return;
    const photo=form.elements?.namedItem?.('photo-publiee');
    const asin=form.elements?.namedItem?.('asin-documente');
    if(!photo||!asin||(input!==photo&&input!==asin)
      ||photo.type!=='checkbox'||asin.type!=='checkbox')return;
    const intent=photo.checked&&asin.checked?'both':photo.checked?'photo':'asin';
    try{window.umami.track('proof-filter:'+intent)}catch{/* Filtering must continue. */}
  },{capture:true,passive:true});
})();
