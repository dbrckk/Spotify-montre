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
  if(!root||!grid||!status||!filters)return;

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
  let catalog=[],selected='all',featured=null;
  function render(){
    const shown=selected==='all'?catalog:catalog.filter(({product})=>product.tier===selected);
    // Preserve exact product intent from /acheter.html?modele=..., but keep
    // other independently verified references available for comparison.
    const ordered=featured&&selected==='all'?[...shown].sort((a,b)=>
      Number(b.product.id===featured)-Number(a.product.id===featured)):shown;
    const cards=ordered.map(({product:p,offer,availabilityAtCheck,checkedOn})=>{
      const card=element('article','am-partner-card');
      card.dataset.watchId=p.id;
      if(p.id===featured)card.dataset.featured='true';
      const cover=element('a','am-partner-cover');
      cover.href='./montre.html?id='+encodeURIComponent(p.id);
      cover.setAttribute('aria-label','Découvrir '+p.brand+' '+p.model);
      const photo=element('img');
      photo.alt=p.brand+' '+p.model+' — photographie de la référence';
      photo.src=p.photoReview.localUrl+'?v='+p.photoReview.localSha256.slice(0,12);
      photo.loading='lazy';photo.decoding='async';
      photo.width=440;photo.height=440;
      cover.append(photo);
      const content=element('div','am-partner-card-content');
      content.append(element('span','am-partner-tier',tierLabel[p.tier]+' / '+p.brand));
      const title=element('h3','am-partner-name',p.model);
      content.append(title);
      if(p.id===featured)content.append(element('span','am-partner-featured',
        'Votre modèle recherché'));
      const actions=element('div','am-partner-actions');
      const previousUnavailable=availabilityAtCheck==='unavailable_at_check';
      const purchase=link(offer.url,previousUnavailable
        ? 'Consulter la fiche Amazon.fr · stock à vérifier'
        : 'Voir la référence sur Amazon.fr','am-partner-buy');
      purchase.target='_blank';
      purchase.rel='noopener noreferrer nofollow sponsored';
      purchase.dataset.amazonProduct=p.id;
      purchase.dataset.amazonPlacement='showroom';
      const detail=link('./montre.html?id='+encodeURIComponent(p.id),
        'Comparer la montre','am-partner-detail');
      actions.append(purchase,detail);
      content.append(actions);
      const date=checkedOn.split('-').reverse().join('/');
      content.append(element('p','am-partner-card-note',previousUnavailable
        ? 'Lien rémunéré · Indisponible lors du contrôle du '+date+
          '. Situation actuelle inconnue : vérifiez auprès du vendeur.'
        : 'Lien rémunéré · Disponibilité non vérifiée au '+date+
          '. Prix, variante, vendeur et stock à contrôler chez Amazon.fr.'));
      card.append(cover,content);
      return card;
    });
    grid.replaceChildren(...cards);
    const focusVisible=featured&&shown.some(x=>x.product.id===featured);
    const selectedProduct=focusVisible?catalog.find(x=>x.product.id===featured)?.product:null;
    status.textContent=shown.length+' modèle'+(shown.length===1?'':'s')+
      ' avec référence Amazon.fr documentée'+(shown.length===1?'':'s')+
      ' · disponibilité actuelle non garantie'+
      (selectedProduct?' · '+selectedProduct.brand+' '+selectedProduct.model+' affiché en premier.':'.');
    for(const button of filters.querySelectorAll('button[data-tier]')){
      button.setAttribute('aria-pressed',String(button.dataset.tier===selected));
    }
  }
  async function init(){
    try{
      const [config,known,feed]=await Promise.all([
        readJson('./affiliate-links.json'),
        readJson('./amazon-product-links.json'),
        readJson('./selection-affiliation.json')
      ]);
      catalog=entries(config,known,feed);
      if(!catalog.length)throw Error('Aucune correspondance partenaire validée');
      const requested=new URLSearchParams(location.search).get('modele');
      if(idPattern.test(requested||'')&&catalog.some(x=>x.product.id===requested))
        featured=requested;
      filters.hidden=false;
      filters.addEventListener('click',event=>{
        const button=event.target.closest?.('button[data-tier]');
        if(!button||!Object.hasOwn({...tierLabel,all:'Toutes'},button.dataset.tier))return;
        selected=button.dataset.tier;
        render();
      });
      render();
      if(featured)root.scrollIntoView({block:'start',behavior:'auto'});
    }catch{
      grid.replaceChildren();
      filters.hidden=true;
      status.textContent='Les liens d’achat partenaires ne sont pas vérifiables actuellement. Vous pouvez toujours comparer les modèles dans le catalogue.';
    }
  }
  init();
})();