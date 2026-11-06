'use strict';
/**
 * Independent partner purchase gateway. This page never creates a merchant
 * checkout, guesses prices/stock or constructs an affiliate URL.
 * Every compensated link is taken from the owner-reviewed registry and must
 * match the independently generated exact-ASIN registry.
 */
(()=>{
  const root=document.getElementById('amPartnerSelection');
  const grid=document.getElementById('amPartnerCards');
  const status=document.getElementById('amPartnerStatus');
  const filters=document.getElementById('amPartnerFilters');
  const retry=document.getElementById('amPartnerRetry');
  const unmatched=document.getElementById('amPartnerUnmatched');
  const unmatchedLink=document.getElementById('amPartnerUnmatchedLink');
  const search=document.getElementById('amPartnerSearch');
  const empty=document.getElementById('amPartnerEmpty');
  if(!root||!grid||!status||!filters||!retry||!unmatched||!unmatchedLink||
     !search||!empty)return;

  const idPattern=/^[a-z0-9-]{4,64}$/;
  const asinPattern=/^[A-Z0-9]{10}$/;
  const tierLabel={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
  const safeText=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=100;
  const validUrl=(value,asin,tag)=>{
    try{
      const u=new URL(value);
      return u.protocol==='https:'&&u.hostname==='www.amazon.fr'&&
        u.pathname==='/dp/'+asin&&!u.username&&!u.password&&!u.port&&!u.hash&&
        u.searchParams.getAll('tag').length===1&&u.searchParams.get('tag')===tag&&
        [...u.searchParams.keys()].length===new Set(u.searchParams.keys()).size&&
        [...u.searchParams.keys()].every(k=>['tag','th','psc'].includes(k));
    }catch{return false}
  };
  const enrollmentConfirmed=config=>config?.approved===true&&
    (!config.enrollmentStatus||config.enrollmentStatus==='approved')||
    config?.approved===false&&config.enrollmentStatus==='registered_pending_review'&&
    config.ownerConfirmedEnrollment===true&&config.specialLinksCreatedInAccount===true||
    config?.approved===false&&config.enrollmentStatus==='enrolled_approval_unverified'&&
    config.ownerConfirmedEnrollment===true&&config.ownerConfirmedTrackingId===true&&
    config.ownerConfirmedSiteListed===true&&config.specialLinksCreatedOnSite===true&&
    config.specialLinksCreatedInAccount!==true;
  async function readJson(path){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try{
      const res=await fetch(path,{cache:'no-store',signal:controller.signal});
      if(!res.ok)throw Error('Source indisponible');
      return await res.json();
    }finally{clearTimeout(timer)}
  }
  const element=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const link=(href,label,className)=>{
    const a=element('a',className,label);a.href=href;return a;
  };
  const entries=(config,known,feed)=>{
    if(config?.version!==1||config.enabled!==true||!enrollmentConfirmed(config)||
      !/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(config.amazonPartnerTag||'')||
      !config.links||Array.isArray(config.links)||typeof config.links!=='object'||
      known?.version!==1||!known.links||Array.isArray(known.links)||
      typeof known.checkedOn!=='string'||!/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/.test(known.checkedOn)||
      !Array.isArray(feed?.products)||feed.products.length!==15)return [];
    const models=new Map(feed.products.filter(p=>idPattern.test(p?.id||'')).map(p=>[p.id,p]));
    const links=Object.entries(config.links);
    if(!links.length||links.length>models.size)return [];
    const valid=links.every(([id,item])=>{
      const p=models.get(id);
      return p&&Object.hasOwn(tierLabel,p.tier)&&safeText(p.brand)&&safeText(p.model)&&
        p.photoReview?.publicUsageApproved===true&&
        p.photoReview.localUrl==='./assets/watches/'+id+'.webp'&&
        p.photoReview.localSha256&&/^[a-f0-9]{64}$/.test(p.photoReview.localSha256)&&
        item?.provider==='amazon.fr'&&item.productMatchConfirmed===true&&
        item.linkApproved===true&&asinPattern.test(item.asin||'')&&
        validUrl(item.url,item.asin,config.amazonPartnerTag)&&
        item.verifiedAt===known.checkedOn&&
        known.links[id]?.asin===item.asin&&
        known.links[id]?.url==='https://www.amazon.fr/dp/'+item.asin&&
        ['not_checked','unavailable_at_check'].includes(known.links[id]?.availabilityAtCheck);
    });
    // One forged or contradictory commercial reference invalidates the set.
    if(!valid)return [];
    const paid=new Map(links.map(([id,item])=>[id,item]));
    return feed.products.filter(p=>paid.has(p.id)).map(p=>({
      product:p,offer:paid.get(p.id),
      availabilityAtCheck:known.links[p.id].availabilityAtCheck,
      checkedOn:known.checkedOn
    }));
  };
  // The additional 37 editorial models already have an independently
  // generated commercial proof registry. Only their exact, authorized Amazon
  // product matches may join the purchase showroom; generic searches and
  // merely proposed partner accounts are never promoted as exact offers.
  const supplementalEntries=(discovery,proof,config,core)=>{
    if(discovery?.version!==1||discovery.source!=='verified_site_catalogues'||
       discovery.total!==52||discovery.coreCount!==15||discovery.supplementalCount!==37||
       !Array.isArray(discovery.products)||discovery.products.length!==52||
       proof?.version!==1||proof.scope!=='editorial_watch_purchase_evidence_not_live_offers'||
       proof.counts?.total!==52||!Array.isArray(proof.products)||proof.products.length!==52)
      return [];
    const commercial=new Map(proof.products.map(item=>[item.id,item]));
    const allIds=new Set(discovery.products.map(item=>item.id));
    if(commercial.size!==52||allIds.size!==52)return [];
    const coreIds=new Set(core.map(item=>item.product.id));
    const sourceExtras=proof.products.filter(item=>
      item.collection==='supplemental'&&item.amazon?.referralActive===true);
    const extras=discovery.products.filter(item=>
      item.kind==='supplemental'&&item.merchantKind==='direct');
    if(!extras.length||extras.length>37||extras.length!==sourceExtras.length||
       proof.counts.activeExactAmazonReferrals!==core.length+extras.length)return [];
    const ready=extras.every(item=>{
      const match=commercial.get(item.id);
      const offer=match?.amazon;
      const verifiedPhoto=Boolean(item.photoUrl);
      return idPattern.test(item.id||'')&&!coreIds.has(item.id)&&
        safeText(item.brand)&&safeText(item.model)&&
        Object.hasOwn(tierLabel,item.tier)&&
        item.detailUrl==='./montres/'+item.id+'.html'&&
        item.commercialStatus==='documented_amazon_referral'&&
        (!verifiedPhoto||item.photoUrl==='./assets/watches-popular/'+item.id+'.webp')&&
        match?.collection==='supplemental'&&match.brand===item.brand&&
        match.model===item.model&&match.vendorSourceUrl===item.officialUrl&&
        match.photo?.published===verifiedPhoto&&
        match.directSale?.eligible===false&&match.commission?.confirmed===false&&
        offer?.referralActive===true&&offer.referralUrl===item.merchantUrl&&
        offer.currentAvailability==='not_verified'&&
        offer.observedAvailability==='not_documented'&&
        asinPattern.test(offer.asin||'')&&
        validUrl(item.merchantUrl,offer.asin,config.amazonPartnerTag)&&
        offer.sourceCheckedOn===item.sourceCheckedOn&&
        /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.sourceCheckedOn||'')&&
        ['amazon_fr_product_page','amazon_fr_comparator_redirect'].includes(item.merchantEvidenceType)&&
        offer.evidenceKind===item.merchantEvidenceType&&
        (offer.variantNote||null)===(item.marketplaceVariant||null)&&
        (!item.marketplaceVariant||(safeText(item.marketplaceVariant)||
          typeof item.marketplaceVariant==='string'&&
          item.marketplaceVariant.length<=240));
    });
    if(!ready)return [];
    return extras.map(p=>({
      product:p,offer:{url:p.merchantUrl},
      kind:'supplemental',detailUrl:p.detailUrl,photoUrl:p.photoUrl,
      availabilityAtCheck:'not_checked',checkedOn:p.sourceCheckedOn,
      evidenceType:p.merchantEvidenceType,variant:p.marketplaceVariant||null
    }));
  };
  let catalog=[],selected='all',query='',featured=null,loading=false,expanded=false;
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  function render(){
    const terms=normalize(query).split(' ').filter(Boolean);
    const shown=catalog.filter(({product})=>{
      if(selected!=='all'&&product.tier!==selected)return false;
      if(!terms.length)return true;
      const label=normalize([product.brand,product.model,product.id].join(' '));
      const compact=label.replace(/\s+/g,'');
      return terms.every(term=>label.includes(term)||compact.includes(term));
    });
    // Preserve exact product intent from /acheter.html?modele=..., but keep
    // other independently verified references available for comparison.
    const ordered=featured&&selected==='all'?[...shown].sort((a,b)=>
      Number(b.product.id===featured)-Number(a.product.id===featured)):shown;
    const cards=ordered.map(({product:p,offer,availabilityAtCheck,checkedOn,
      kind,detailUrl,photoUrl,evidenceType,variant})=>{
      const card=element('article','am-partner-card');
      card.dataset.watchId=p.id;
      if(p.id===featured)card.dataset.featured='true';
      const cover=element('a','am-partner-cover');
      const productDetail=detailUrl||'./montre.html?id='+encodeURIComponent(p.id);
      cover.href=productDetail;
      // Let the real photo alt text or the honest no-photo caption become
      // the accessible name. A shorter aria-label would hide visible text
      // from speech input and violate WCAG label-in-name.
      const picture=photoUrl===undefined
        ?p.photoReview.localUrl+'?v='+p.photoReview.localSha256.slice(0,12)
        :photoUrl;
      if(picture){
        const photo=element('img');
        photo.alt=p.brand+' '+p.model+' — photographie de la référence';
        photo.src=picture;
        photo.loading='lazy';photo.decoding='async';
        photo.width=440;photo.height=440;
        cover.append(photo);
      }else{
        const figure=element('span','am-partner-no-photo');
        figure.append(element('span','',p.brand),element('strong','',p.model),
          element('small','',''));
        figure.lastChild.textContent='Aucune photographie publiée pour cette référence';
        cover.append(figure);
      }
      const content=element('div','am-partner-card-content');
      content.append(element('span','am-partner-tier',tierLabel[p.tier]+' / '+p.brand));
      const title=element('h3','am-partner-name',p.model);
      content.append(title);
      if(p.id===featured)content.append(element('span','am-partner-featured',
        'Votre modèle recherché'));
      const actions=element('div','am-partner-actions');
      const previousUnavailable=availabilityAtCheck==='unavailable_at_check';
      const viaComparison=evidenceType==='amazon_fr_comparator_redirect';
      const purchase=link(offer.url,previousUnavailable
        ? 'Consulter la fiche Amazon.fr · stock à vérifier'
        : viaComparison
          ? 'Consulter l’ASIN sur Amazon.fr · modèle à confirmer'
          : 'Voir la référence sur Amazon.fr','am-partner-buy');
      purchase.target='_blank';
      purchase.rel='noopener noreferrer nofollow sponsored';
      purchase.dataset.amazonProduct=p.id;
      purchase.dataset.amazonPlacement='showroom';
      const detail=link(productDetail,
        'Consulter la fiche et les caractéristiques','am-partner-detail');
      actions.append(purchase,detail);
      content.append(actions);
      const date=checkedOn.split('-').reverse().join('/');
      const note=kind==='supplemental'
        ?viaComparison
          ?'Lien rémunéré · ASIN recoupé via comparateur le '+date+
            '. Page Amazon.fr non consultée directement : référence, prix, vendeur et stock à confirmer.'
          :'Lien rémunéré · ASIN documenté le '+date+
            '. Disponibilité, variante, prix total et vendeur à vérifier sur Amazon.fr.'
        :previousUnavailable
          ?'Lien rémunéré · Indisponible lors du contrôle du '+date+
            '. Situation actuelle inconnue : vérifiez auprès du vendeur.'
          :'Lien rémunéré · Disponibilité non vérifiée au '+date+
            '. Prix, variante, vendeur et stock à contrôler chez Amazon.fr.';
      content.append(element('p','am-partner-card-note',note));
      if(variant)content.append(element('p','am-partner-variant',
        'Variante de la fiche Amazon.fr à vérifier : '+variant));
      card.append(cover,content);
      return card;
    });
    grid.replaceChildren(...cards);
    empty.hidden=shown.length!==0;
    const focusVisible=featured&&shown.some(x=>x.product.id===featured);
    const selectedProduct=focusVisible?catalog.find(x=>x.product.id===featured)?.product:null;
    const unmatchedRequested=Boolean(expanded&&featured&&
      !catalog.some(x=>x.product.id===featured));
    unmatched.hidden=!unmatchedRequested;
    if(unmatchedRequested)unmatchedLink.href=
      './montres/toutes-les-montres.html?q='+encodeURIComponent(featured);
    status.textContent=shown.length+' modèle'+(shown.length===1?'':'s')+
      ' avec référence Amazon.fr documentée'+(shown.length===1?'':'s')+
      ' · disponibilité actuelle non garantie'+
      (selectedProduct?' · '+selectedProduct.brand+' '+selectedProduct.model+' affiché en premier.':'.');
    for(const button of filters.querySelectorAll('button[data-tier]')){
      button.setAttribute('aria-pressed',String(button.dataset.tier===selected));
    }
  }
  // Install handlers once. Retrying a failed network request must never
  // attach a second filter listener or reuse stale paid destinations.
  filters.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-tier]');
    if(!button||!Object.hasOwn({...tierLabel,all:'Toutes'},button.dataset.tier))return;
    selected=button.dataset.tier;
    render();
  });
  search.addEventListener('input',()=>{
    query=search.value.slice(0,70);
    render();
  });
  retry.addEventListener('click',()=>{void init()});
  async function init(){
    if(loading)return;
    loading=true;
    expanded=false;
    unmatched.hidden=true;
    retry.hidden=true;
    retry.disabled=true;
    status.textContent='Vérification des références partenaires…';
    try{
      const [config,known,feed]=await Promise.all([
        readJson('./affiliate-links.json'),
        readJson('./amazon-product-links.json'),
        readJson('./selection-affiliation.json')
      ]);
      const verified=entries(config,known,feed);
      if(!verified.length)throw Error('Aucune correspondance partenaire validée');
      catalog=verified;
      const requested=new URLSearchParams(location.search).get('modele');
      featured=idPattern.test(requested||'')?requested:null;
      filters.hidden=false;
      render();
      if(featured&&catalog.some(x=>x.product.id===featured))
        root.scrollIntoView({block:'start',behavior:'auto'});
      // Non-critical enhancement. Show thirteen verified core references
      // immediately; if either supplemental proof is unavailable or altered,
      // do not add any unsubstantiated merchant destination.
      try{
        const [discovery,proof]=await Promise.all([
          readJson('./discovery-catalogue.json'),
          readJson('./commercial-registry.json')
        ]);
        const extras=supplementalEntries(discovery,proof,config,verified);
        if(extras.length){
          catalog=[...verified,...extras];
          render();
          if(featured&&extras.some(x=>x.product.id===featured))
            root.scrollIntoView({block:'start',behavior:'auto'});
        }
      }catch{/* Keep the thirteen validated models; never invent a product exit. */}
      expanded=true;
      render();
    }catch{
      // Fail closed: no previously displayed checkout exits may survive
      // a failed refresh or a tampered source.
      catalog=[];
      featured=null;
      grid.replaceChildren();
      filters.hidden=true;
      empty.hidden=true;
      unmatched.hidden=true;
      status.textContent='Les références partenaires ne sont pas vérifiables actuellement. Réessayez ou consultez les fiches du catalogue.';
      retry.hidden=false;
    }finally{
      loading=false;
      retry.disabled=false;
    }
  }
  void init();
})();