'use strict';
/* Optional Amazon.fr partner links; no tracking, redirects, cookies or outbound requests except visitor clicks. */
(() => {
  async function init() {
    const home=document.getElementById('affGrid'),detail=document.getElementById('detailShell');
    if(!home&&!detail)return;
    let config;
    try {
      const response=await fetch('./affiliate-links.json',{cache:'no-store'});
      if(!response.ok) return;
      config=await response.json();
    } catch { return; }
    if(!config || config.version!==1 || config.enabled!==true || config.approved!==true ||
      typeof config.amazonPartnerTag!=='string' || !/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(config.amazonPartnerTag) ||
      !config.links || typeof config.links!=='object' || Array.isArray(config.links)) return;
    const validated=new Map();
    for(const [id,value] of Object.entries(config.links)) {
      if(!/^[a-z0-9-]{4,64}$/.test(id) || !value || value.provider!=='amazon.fr' ||
         value.productMatchConfirmed!==true || value.linkApproved!==true ||
         !/^[A-Z0-9]{10}$/.test(value.asin||'')) return;
      try {
        const url=new URL(value.url);
        if(url.protocol!=='https:' || !['amazon.fr','www.amazon.fr'].includes(url.hostname.toLowerCase()) ||
           url.username || url.password || url.port || url.hash ||
           !['/dp/'+value.asin,'/gp/product/'+value.asin].includes(url.pathname) ||
           url.searchParams.getAll('tag').length!==1 ||
           url.searchParams.get('tag')!==config.amazonPartnerTag ||
           [...url.searchParams.keys()].some(k=>!['tag','th','psc'].includes(k)))return;
        validated.set(id,url.href);
      } catch { return; }
    }
    if(!validated.size) return;
    try {
      const res=await fetch('./selection-affiliation.json',{cache:'no-store'});
      if(!res.ok)return;
      const feed=await res.json();
      if(!Array.isArray(feed.products))return;
      for(const id of validated.keys()){
        if(feed.products.find(p=>p.id===id)?.photoReview?.publicUsageApproved!==true)return;
      }
    } catch { return; }
    const disclosure='En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises';
    window.AtelierAffiliatesActive=true;
    const link=(url,cls)=>{
      const a=document.createElement('a');a.href=url;a.className=cls;
      a.target='_blank';a.rel='noopener noreferrer nofollow sponsored';
      a.textContent='Voir sur Amazon.fr · lien rémunéré ↗';return a;
    };
    const hydrateGrid=()=>{
      for(const card of home?.querySelectorAll('.aff-card[data-watch-id]:not([data-affiliate-hydrated])')||[]) {
        card.dataset.affiliateHydrated='true';
        const url=validated.get(card.dataset.watchId);
        if(!url)continue;
        const actions=card.querySelector('.aff-card-actions');
        if(!actions)continue;
        actions.append(link(url,'am-affiliate-cta'));
        const foot=card.querySelector('.aff-card-foot');
        if(foot)foot.textContent='Modèle réel · Lien Amazon rémunéré identifié ci-dessus';
        const note=document.createElement('small');
        note.className='am-affiliate-note';note.textContent=disclosure+' Le paiement et les retours sont assurés par le vendeur externe.';
        actions.after(note);
      }
    };
    if(home){
      hydrateGrid();
      new MutationObserver(hydrateGrid).observe(home,{childList:true});
    }
    const hydrateDetail=()=>{
      if(!detail||detail.hidden||detail.dataset.affiliateHydrated==='true')return;
      const id=new URLSearchParams(location.search).get('id');
      const url=validated.get(id);
      if(!url)return;
      detail.dataset.affiliateHydrated='true';
      const official=document.getElementById('detailOfficial');
      if(official)official.before(link(url,'button detail-cta am-affiliate-detail'));
      const message=detail.querySelector('.detail-disclosure');
      if(message)message.textContent='Lien Amazon rémunéré : '+disclosure+' Aucun paiement n’est encaissé par Atelier Montres.';
      const footer=document.querySelector('.footer-inner>div>p');
      if(footer)footer.textContent='Sélection multimarque · certains liens Amazon rémunérés clairement signalés.';
    };
    if(detail){
      hydrateDetail();
      new MutationObserver(hydrateDetail).observe(detail,{attributes:true,attributeFilter:['hidden']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
