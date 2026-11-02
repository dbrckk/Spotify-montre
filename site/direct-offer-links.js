'use strict';
/* Only attach direct purchase links to verified, live-priced offers from our API. */
(()=>{
  const script=document.currentScript;
  if(!script?.src)return;
  const base=new URL('./',script.src);
  const staticLink=new URL('acheter.html',base);
  const acceptedHost=u=>u.protocol==='https:'&&u.pathname==='/'&&!u.search&&!u.hash&&
    !u.username&&!u.password&&!u.port&&u.hostname.endsWith('.onrender.com');
  let offerMap=null;
  const euro=c=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100);
  const offerLink=(id,item)=>{
    const a=document.createElement('a');
    a.className='am-direct-card-link';
    a.href=staticLink.href+'?modele='+encodeURIComponent(id);
    a.textContent='Acheter sur Atelier Montres · '+euro(item.amountCents)+' TTC';
    a.setAttribute('aria-label','Acheter '+item.label+' sur Atelier Montres, '+euro(item.amountCents)+' TTC, livraison annoncée incluse');
    return a;
  };
  const enrich=()=>{
    if(!offerMap)return;
    for(const card of document.querySelectorAll('.ud-card[data-id],.aff-card[data-watch-id]')){
      const id=card.dataset.id||card.dataset.watchId;
      if(!offerMap.has(id)||card.querySelector('.am-direct-card-link'))continue;
      const anchor=card.querySelector('.ud-actions,.aff-card-actions');
      if(!anchor)continue;
      anchor.append(offerLink(id,offerMap.get(id)));
    }
  };
  async function init(){
    try{
      const response=await fetch(new URL('config.json',base),{cache:'no-store'});
      if(!response.ok)return;
      const config=await response.json();
      if(config?.checkoutMode!=='active')return;
      const api=new URL(config.commerceApiUrl);
      if(!acceptedHost(api))return;
      const offersResponse=await fetch(api.origin+'/api/offers',{cache:'no-store'});
      if(!offersResponse.ok)return;
      const data=await offersResponse.json();
      if(data.checkoutEnabled!==true||!Array.isArray(data.offers))return;
      offerMap=new Map(data.offers.filter(o=>o&&/^[a-z0-9-]{4,64}$/.test(o.id||'')&&
        Number.isSafeInteger(o.amountCents)&&o.amountCents>0&&
        typeof o.label==='string'&&o.label.length>3).map(o=>[o.id,o]));
      enrich();
      const gallery=document.getElementById('affGrid');
      if(gallery)new MutationObserver(enrich).observe(gallery,{childList:true});
    }catch{
      // Fail closed: the editorial/affiliate links remain intact; no false buy buttons.
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
