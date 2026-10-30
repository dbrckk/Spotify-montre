'use strict';
/* Verified Amazon.fr product matches first; compensated links only when authorised. */
(() => {
  const statement='En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises';
  const code=/^[A-Z0-9]{10}$/;
  const watchId=/^[a-z0-9-]{4,64}$/;
  const isAmazon=(url,asin,tag)=>{
    try {
      const u=new URL(url);
      if(u.protocol!=='https:'||u.hostname!=='www.amazon.fr'||u.username||u.password||u.port||u.hash||
         u.pathname!=='/dp/'+asin)return false;
      if(tag===null)return u.search==='';
      return u.searchParams.getAll('tag').length===1 &&
        u.searchParams.get('tag')===tag &&
        [...u.searchParams.keys()].every(k=>k==='tag'||k==='th'||k==='psc');
    } catch {return false}
  };
  const get=async(path)=>{
    try {const r=await fetch(path,{cache:'no-store'});return r.ok?await r.json():null}
    catch {return null}
  };
  async function init() {
    const home=document.getElementById('affGrid'),detail=document.getElementById('detailShell');
    if(!home&&!detail)return;
    const [catalog,config,feed]=await Promise.all([
      get('./amazon-product-links.json'),get('./affiliate-links.json'),get('./selection-affiliation.json')
    ]);
    if(!Array.isArray(feed?.products)||feed.products.length!==15)return;
    const models=new Map(feed.products.filter(p=>watchId.test(p?.id||'')).map(p=>[p.id,p]));
    const plain=new Map();
    if(catalog?.version===1&&catalog.links&&!Array.isArray(catalog.links)) {
      for(const [id,entry] of Object.entries(catalog.links)) {
        if(!models.has(id)||!code.test(entry?.asin||'')||!isAmazon(entry.url,entry.asin,null))continue;
        plain.set(id,entry.url);
      }
    }
    const paid=new Map();
    if(config?.version===1&&config.enabled===true&&config.approved===true&&
       typeof config.amazonPartnerTag==='string'&&/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(config.amazonPartnerTag)&&
       config.links&&!Array.isArray(config.links)) {
      const entries=Object.entries(config.links);
      if(entries.length&&entries.every(([id,item])=>
          models.get(id)?.photoReview?.publicUsageApproved===true &&
          item?.provider==='amazon.fr'&&item.productMatchConfirmed===true&&item.linkApproved===true &&
          code.test(item.asin||'')&&isAmazon(item.url,item.asin,config.amazonPartnerTag)&&
          plain.get(id)==='https://www.amazon.fr/dp/'+item.asin)) {
        for(const [id,item] of entries)paid.set(id,item.url);
      }
    }
    const makeLink=(url,compensated,cls)=>{
      const a=document.createElement('a');
      a.className=cls;a.href=url;a.target='_blank';
      a.rel=compensated?'noopener noreferrer nofollow sponsored':'noopener noreferrer nofollow';
      a.textContent=compensated?'Voir sur Amazon.fr · lien rémunéré ↗':'Voir sur Amazon.fr · lien non rémunéré ↗';
      return a;
    };
    function hydrateGrid() {
      for(const card of home?.querySelectorAll('.aff-card[data-watch-id]:not([data-affiliate-hydrated])')||[]) {
        card.dataset.affiliateHydrated='true';
        const id=card.dataset.watchId;
        const url=paid.get(id)||plain.get(id);
        if(!url)continue;
        const compensated=paid.has(id);
        const actions=card.querySelector('.aff-card-actions');
        if(!actions)continue;
        actions.append(makeLink(url,compensated,'am-affiliate-cta'));
        const foot=card.querySelector('.aff-card-foot');
        if(foot)foot.textContent=compensated?
          'Fiche Amazon vérifiée · lien rémunéré':
          'Fiche Amazon vérifiée · lien non rémunéré';
        const note=document.createElement('small');note.className='am-affiliate-note';
        note.textContent=compensated?
          statement+'. Le paiement et les retours se font chez Amazon ou le vendeur indiqué.':
          'Prix et disponibilité à vérifier sur Amazon.fr. Aucun paiement n’est encaissé ici.';
        actions.after(note);
      }
    }
    if(home) {
      hydrateGrid();
      new MutationObserver(hydrateGrid).observe(home,{childList:true});
    }
    function hydrateDetail() {
      if(!detail||detail.hidden||detail.dataset.affiliateHydrated==='true')return;
      const id=new URLSearchParams(location.search).get('id');
      const url=paid.get(id)||plain.get(id);
      if(!url)return;
      const compensated=paid.has(id);
      detail.dataset.affiliateHydrated='true';
      const amazon=document.getElementById('detailAmazon');
      if(amazon) {
        amazon.href=url;
        amazon.rel=compensated?'noopener noreferrer nofollow sponsored':'noopener noreferrer nofollow';
        amazon.textContent=compensated?'Voir sur Amazon.fr · lien rémunéré ↗':'Voir ce modèle sur Amazon.fr ↗';
      }
      const sub=detail.querySelector('.detail-sub');
      if(sub)sub.textContent=compensated?
        'Lien Amazon rémunéré. Consultez prix, disponibilité et vendeur chez Amazon.':
        'Fiche Amazon vérifiée, lien non rémunéré. Vérifiez le prix, la disponibilité et le vendeur.';
      if(compensated) {
        const official=document.getElementById('detailOfficial');
        if(official)official.before(makeLink(url,true,'button detail-cta am-affiliate-detail'));
        if(amazon)amazon.hidden=true; // One clear paid call-to-action, not duplicate exits.
        const msg=detail.querySelector('.detail-disclosure');
        if(msg)msg.textContent='Lien rémunéré : '+statement+'. Aucun paiement n’est encaissé par Atelier Montres.';
        const footer=document.querySelector('.footer-inner>div>p');
        if(footer)footer.textContent='Sélection multimarque · certains liens Amazon rémunérés clairement signalés.';
      }
    }
    if(detail) {
      hydrateDetail();
      new MutationObserver(hydrateDetail).observe(detail,{attributes:true,attributeFilter:['hidden']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
