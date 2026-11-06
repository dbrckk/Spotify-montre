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
    a.setAttribute('aria-label',a.textContent+' — '+item.label);
    return a;
  };
  const enrich=()=>{
    if(!offerMap)return;
    const cards=document.querySelectorAll([
      '.ud-card[data-id]','.aff-card[data-watch-id]',
      '.watch-product[data-watch-id]','.am-extra-product[data-popular-watch-id]',
      '.home-product-card[data-watch-id]','#detailShell'
    ].join(','));
    for(const card of cards){
      const id=card.id==='detailShell'
        ?new URLSearchParams(location.search).get('id')
        :card.dataset.id||card.dataset.watchId||card.dataset.popularWatchId;
      if(!offerMap.has(id)||card.querySelector('.am-direct-card-link'))continue;
      const anchor=card.querySelector([
        '.ud-actions','.aff-card-actions','.watch-actions',
        '.am-extra-actions','.home-product-body','.detail-shops'
      ].join(','));
      if(!anchor)continue;
      // Direct merchant purchases take priority over external referrals, but
      // only when an actual qualified offer was returned by the live API.
      // All other watches retain their pre-existing editorial/partner links.
      const buy=offerLink(id,offerMap.get(id));
      if(card.classList.contains('home-product-card')){
        // Keep the model name, photo and short description at the top;
        // place the real buy action immediately before editorial details.
        const details=anchor.querySelector('a[href*="montre.html?id="]');
        if(details)anchor.insertBefore(buy,details);
        else anchor.append(buy);
      }else anchor.prepend(buy);
      if(card.classList.contains('watch-product')){
        const notice=card.querySelector('.disclosure');
        if(notice)notice.textContent=notice.textContent.replace(
          'Atelier Montres ne vend pas ce modèle.',
          'Cette référence est aussi proposée à la vente directement par Atelier Montres.'
        );
      }
      if(card.classList.contains('am-extra-product')){
        const notice=card.querySelector('.am-extra-approval');
        if(notice)notice.textContent=notice.textContent.replace(
          'Nous ne vendons pas directement ce produit.',
          'Une commande directe est possible auprès d’Atelier Montres au prix TTC affiché.'
        );
      }
      if(card.id==='detailShell'){
        const notice=card.querySelector('.detail-commerce p');
        if(notice)notice.textContent='Achat direct disponible auprès d’Atelier Montres au prix TTC indiqué. Stock et livraison sont revérifiés avant toute demande de paiement.';
        const info=card.querySelector('.detail-buyer-guide>p');
        if(info)info.textContent='Pour l’achat direct, Atelier Montres est votre vendeur et gère le suivi, les garanties et les retours. Les liens partenaires ci-dessus constituent des achats séparés auprès d’autres vendeurs.';
      }
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
        typeof o.label==='string'&&o.label.length>3&&
        Number.isSafeInteger(o.deliveryMinDays)&&o.deliveryMinDays>=1&&
        Number.isSafeInteger(o.deliveryMaxDays)&&o.deliveryMaxDays>=o.deliveryMinDays&&o.deliveryMaxDays<=120).map(o=>[o.id,o]));
      if(offerMap.size){
        // A valid direct offer changes the merchant role only for that route;
        // static affiliate-era guidance must not contradict the new checkout.
        const answer=document.getElementById('homePurchaseAnswer');
        if(answer)answer.textContent='Lorsqu’une fiche affiche « Acheter sur Atelier Montres » et un prix TTC, vous commandez auprès de notre boutique, avec paiement sécurisé et suivi ici. Pour les autres références, le paiement et la livraison sont gérés par le marchand du lien externe.';
        for(const p of document.querySelectorAll('footer p')){
          if(p.textContent.includes("Aucun achat ni paiement ne s'effectue sur ce site actuellement.")){
            p.textContent=p.textContent.replace("Aucun achat ni paiement ne s'effectue sur ce site actuellement.",
              'Certaines montres sont achetables directement sur Atelier Montres, uniquement si un prix TTC et un bouton de commande sont affichés. Les autres achats se font chez le vendeur partenaire.');
          }
        }
        const navigation=document.querySelector('.home-nav-buy');
        if(navigation){
          navigation.href=staticLink.href;
          navigation.textContent='Acheter sur notre site';
        }
        const note=document.querySelector('.home-hero-note');
        if(note)note.textContent='Certaines références sont vendues directement par Atelier Montres. Les autres achats ont lieu chez les vendeurs indiqués sur les fiches.';
      }
      enrich();
      const gallery=document.getElementById('affGrid');
      if(gallery)new MutationObserver(enrich).observe(gallery,{childList:true});
      const detail=document.getElementById('detailShell');
      if(detail)new MutationObserver(enrich).observe(detail,{childList:true,subtree:true});
    }catch{
      // Fail closed: the editorial/affiliate links remain intact; no false buy buttons.
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
