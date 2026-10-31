'use strict';
(() => {
 const $=id=>document.getElementById(id),status=$('detailStatus'),shell=$('detailShell'),error=$('detailError');
 if(!status||!shell||!error)return;
 const id=new URLSearchParams(location.search).get('id');
 const known=['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr','seikowatches.com','tissotwatches.com','hamiltonwatch.com'];
 const safeOfficial=url=>{try{const u=new URL(url);return u.protocol==='https:'&&known.some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}catch(_){return false}};
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 const fail=()=>{status.textContent='Référence non vérifiée.';error.hidden=false;shell.hidden=true};
 if(!id||!/^[a-z0-9-]{4,64}$/.test(id)){fail();return}
 fetch('./selection-affiliation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Not available');return r.json()}).then(x=>{
   if(x?.version!==1||!Array.isArray(x.products)||x.affiliateEnabled!==false)throw Error('Invalid feed');
   const p=x.products.find(t=>t.id===id);
   if(!p||!safeOfficial(p.officialUrl)||p.affiliateUrl!==null||p.merchantLinkStatus!=='untracked_official')throw Error('Invalid model');
   // Keep a short device-local browsing history. No cookies or remote tracking.
   try{
     const key='atelier-montres-recent-v1';
     const stored=JSON.parse(localStorage.getItem(key)||'[]');
     const ids=Array.isArray(stored)?stored.filter(v=>typeof v==='string'&&v.length<80):[];
     localStorage.setItem(key,JSON.stringify([p.id,...ids.filter(v=>v!==p.id)].slice(0,5)));
   }catch(_){}
   document.title=p.brand+' '+p.model+' — Atelier Montres';
   // Accurate product discovery metadata: no invented price, offer, rating or stock.
   const summary=[p.brand,p.model,p.title||'',p.story||p.description||''].filter(Boolean).join(' · ').slice(0,300);
   let description=document.querySelector('meta[name="description"]');
   if(!description){description=node('meta');description.name='description';document.head.append(description)}
   description.content=summary;
   const canonical=new URL('./montre.html',location.href);
   canonical.searchParams.set('id',p.id);
   canonical.hash='';
   const structured={
     '@context':'https://schema.org',
     '@type':'Product',
     name:p.brand+' '+p.model,
     brand:{'@type':'Brand',name:p.brand},
     model:p.model,
     description:(p.story||p.description||'').slice(0,500),
     url:canonical.href,
     image:p.photoReview?.publicUsageApproved===true&&p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'?[new URL(p.photoReview.localUrl,location.href).href]:undefined,
     additionalProperty:[
       { '@type':'PropertyValue',name:'Mouvement',value:p.specs?.movement||p.movement },
       { '@type':'PropertyValue',name:'Collection',value:p.tier }
     ]
   };
   const jsonLd=node('script');jsonLd.type='application/ld+json';jsonLd.id='detailProductStructuredData';
   jsonLd.textContent=JSON.stringify(structured);document.head.append(jsonLd);
   $('detailCrumb').textContent=p.brand+' '+p.model;
   $('detailTier').textContent=({essential:'Collection Essentielle',signature:'Collection Signature',prestige:'Collection Prestige'})[p.tier]||'Collection';
   $('detailBrand').textContent=p.brand;
   $('detailTitle').textContent=p.model;
   $('detailEditorial').textContent=p.title||'Notre sélection';
   $('detailStory').textContent=p.story||p.description;
   const movementName={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire · Eco-Drive'};
   const essentialFacts=[
     ['Mouvement',p.specs?.movement||movementName[p.movement]||null],
     p.specs?.diameter?['Diamètre',p.specs.diameter]:p.specs?.caseSize?['Dimensions du boîtier',p.specs.caseSize]:['Diamètre',null],
     ['Verre',p.specs?.glass||null],
     ['Étanchéité',p.specs?.waterResistance||null]
   ];
   const essentials=$('detailEssentials');
   if(essentials)essentials.replaceChildren(...essentialFacts.map(([label,value])=>{
     const line=node('div','detail-fact');
     const term=node('dt','',label),definition=node('dd',value?'':'detail-fact-unverified',value||'Non documenté');
     line.append(term,definition);return line;
   }));

   const art=$('detailArtwork'),photo=p.photoReview,photoLabel=$('detailPhotoLabel'),photoNote=$('detailPhotoNote'),zoomButton=$('detailPhotoZoom');
   if(art){
     const sources=[];
     if(photo?.publicUsageApproved===true&&photo?.localUrl==='./assets/watches/'+p.id+'.webp')sources.push(photo.localUrl+(typeof photo.localSha256==='string'&&/^[a-f0-9]{64}$/.test(photo.localSha256)?'?v='+photo.localSha256.slice(0,12):''));
     // The local approved image is the only public source; never call a third-party host.
     const fallback=()=>{art.replaceChildren();art.classList.remove('am-real-photo-stage');window.AtelierWatch?.render(art,p);if(zoomButton)zoomButton.hidden=true;if(photoLabel)photoLabel.textContent='ILLUSTRATION ÉDITORIALE ORIGINALE';if(photoNote)photoNote.textContent='Illustration stylisée, non contractuelle. Voir la photo exacte chez le fabricant.'};
     if(sources.length){
       art.replaceChildren();art.classList.add('am-real-photo-stage');
       const img=node('img','am-real-product-photo');img.alt=p.brand+' '+p.model+' — photographie du modèle réel';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
       const localWidth=Number(photo.localWidth);
       const localVersion=typeof photo.localSha256==='string'&&/^[a-f0-9]{64}$/.test(photo.localSha256)?'?v='+photo.localSha256.slice(0,12):'';
       if(Number.isInteger(localWidth)&&localWidth>480){
         const variants=[480,800].filter(w=>w<localWidth).map(w=>'./assets/watch-responsive/'+p.id+'-'+w+'.webp'+localVersion+' '+w+'w');
         img.srcset=[...variants,photo.localUrl+localVersion+' '+localWidth+'w'].join(', ');
         img.sizes='(max-width:620px) 300px, (max-width:970px) 340px, 470px';
       }
       if(Number.isInteger(localWidth)&&localWidth>0&&Number.isInteger(Number(photo.localHeight))&&Number(photo.localHeight)>0){
         img.width=localWidth;img.height=Number(photo.localHeight);
       }
       img.fetchPriority='high';
       // On an image error, retry the local original after an unavailable responsive variant.
       img.onload=()=>{if(zoomButton)zoomButton.hidden=false};
       img.onerror=()=>{
         if(img.hasAttribute('srcset')){
           img.removeAttribute('srcset');img.removeAttribute('sizes');
           img.src=sources[0];return;
         }
         fallback();
       };
       art.append(img);img.src=sources[0];
       if(photoLabel)photoLabel.textContent='PHOTOGRAPHIE DU MODÈLE · '+(photo.provider||p.brand).toUpperCase();
       if(photoNote)photoNote.textContent='Modèle original de '+p.brand+' · Référence '+p.model;
     }else fallback();
   }
   $('detailHighlights').replaceChildren(...(p.highlights||[]).map(t=>node('span','',t)));
   const compareLink=$('detailCompare');if(compareLink){
     let selections=[];
     try{
       const stored=JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')||'[]');
       if(Array.isArray(stored))selections=[...new Set(stored.filter(id=>typeof id==='string'&&x.products.some(t=>t.id===id&&safeOfficial(t.officialUrl))))].slice(0,3);
     }catch(_){}
     if(!selections.includes(p.id)&&selections.length<3)selections.push(p.id);
     const url=new URL('./affiliation.html',location.href);
     url.searchParams.set('compare',selections.join(','));url.hash='montres';compareLink.href=url.href;
     if(selections.length>1)compareLink.textContent='⇄ Reprendre la comparaison ('+selections.length+')';
   }
   $('detailOfficial').href=p.officialUrl;
   $('detailOfficial').setAttribute('aria-label','Voir '+p.model+' sur le site officiel '+p.brand);
   const q=encodeURIComponent((p.brand+' '+p.model).slice(0,90));
   $('detailAmazon').href='https://www.amazon.fr/s?k='+q;
   $('detailEbay').href='https://www.ebay.fr/sch/i.html?_nkw='+q;
   const rows=[['Référence',p.model],['Maison',p.brand],['Type de mouvement',p.specs?.movement||'À confirmer sur la fiche fabricant'],['Diamètre du boîtier',p.specs?.diameter||'À confirmer'],...(p.specs?.caseSize?[['Dimensions L × l × H',p.specs.caseSize]]:[]),['Verre',p.specs?.glass||'À confirmer'],['Étanchéité',p.specs?.waterResistance||'À confirmer'],['Stock marchand','Non synchronisé'],['Prix actuel','Voir le fabricant']];
   const list=$('detailSpecList');
   list.replaceChildren(...rows.map(([label,val])=>{const line=node('div');line.append(node('dt','',label),node('dd','',val));return line}));
    const evidence=$('detailEvidence');
    if(evidence){
      const review=p.specReview;
      const audited=review?.sourceKind==='manufacturer_exact_reference'&&review?.sourceUrl===p.officialUrl
        &&/^\d{4}-\d{2}-\d{2}$/.test(review.verifiedOn)
        &&Array.isArray(review.verifiedFields)&&review.verifiedFields.length>0&&safeOfficial(review.sourceUrl);
      evidence.replaceChildren();
      const title=node('strong','',audited?'Source vérifiée pour cette référence':'Source et données à confirmer');
      const note=node('p','',audited
        ?'Caractéristiques recoupées avec la fiche officielle le '+new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(review.verifiedOn+'T12:00:00Z'))+'. Cette vérification ne concerne pas les droits de reproduction des photos.'
        :'Les caractéristiques non documentées sont à confirmer sur le site du fabricant.');
      const a=node('a','',audited?'Consulter la source fabricant ↗':'Vérifier la fiche fabricant ↗');
      a.href=audited?review.sourceUrl:p.officialUrl;a.target='_blank';a.rel='noopener noreferrer nofollow';
      evidence.append(title,note,a);
    }

   // Local-first discovery: never present prices, inventory or affiliate commissions we cannot verify.
   const all=x.products.filter(t=>t&&typeof t.id==='string'&&typeof t.model==='string'&&safeOfficial(t.officialUrl));
   if(zoomButton)zoomButton.addEventListener('click',()=>window.AtelierPhoto?.open(all,p.id));
   const index=all.findIndex(t=>t.id===p.id);
   const adjacent=$('detailAdjacent');
   if(adjacent&&index>=0){
     const mk=(t,label)=>{const a=node('a','detail-adjacent-link');a.href='./montre.html?id='+encodeURIComponent(t.id);a.append(node('span','',label),node('strong','',t.brand+' '+t.model));return a};
     adjacent.replaceChildren();
     if(index>0)adjacent.append(mk(all[index-1],'← Modèle précédent'));
     if(index<all.length-1)adjacent.append(mk(all[index+1],'Modèle suivant →'));
   }
   const relatedGrid=$('detailRelatedGrid');
   if(relatedGrid){
     const score=q=>(q.tier===p.tier?6:0)+(q.brand===p.brand?4:0)+(q.movement===p.movement?3:0)+(q.style===p.style?1:0);
     const suggestions=all.filter(q=>q.id!==p.id).sort((a,b)=>score(b)-score(a)).slice(0,3);
     const cards=suggestions.map(q=>{
       const a=node('a','detail-related-card');a.href='./montre.html?id='+encodeURIComponent(q.id);
       const frame=node('span','detail-related-photo');const imageUrl=q.photoReview?.localUrl;
       if(q.photoReview?.publicUsageApproved===true&&imageUrl==='./assets/watches/'+q.id+'.webp'){
         const img=node('img');img.alt='Photographie de '+q.brand+' '+q.model;img.loading='lazy';img.decoding='async';
         img.width=Number.isInteger(q.photoReview.localWidth)?q.photoReview.localWidth:320;
         img.height=Number.isInteger(q.photoReview.localHeight)?q.photoReview.localHeight:320;
         const width=q.photoReview.localWidth;
         const version=typeof q.photoReview.localSha256==='string'&&/^[a-f0-9]{64}$/.test(q.photoReview.localSha256)?'?v='+q.photoReview.localSha256.slice(0,12):'';
         if(Number.isInteger(width)&&width>480){
           const variants=[480,800].filter(w=>w<width).map(w=>'./assets/watch-responsive/'+q.id+'-'+w+'.webp'+version+' '+w+'w');
           img.srcset=[...variants,imageUrl+version+' '+width+'w'].join(', ');
           img.sizes='(max-width:470px) 86vw, (max-width:760px) 46vw, 320px';
         }
         img.onerror=()=>{
           if(img.hasAttribute('srcset')){
             img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=imageUrl;return;
           }
           img.remove();frame.append(node('span','detail-related-empty','Voir la fiche officielle'));
         };
         img.src=imageUrl+version;
         frame.append(img);
       }else{window.AtelierWatch?.render(frame,q);frame.append(node('span','detail-related-empty','Illustration éditoriale'))}
       const reason=q.brand===p.brand?'Même maison horlogère':q.movement===p.movement?'Même type de mouvement':q.tier===p.tier?'Même gamme':'Autre style à explorer';
       a.append(frame,node('span','detail-related-brand',q.brand),node('strong','detail-related-model',q.model),node('span','detail-related-why',reason),node('span','detail-related-action','Découvrir ce modèle ↗'));
       return a;
     });
     relatedGrid.replaceChildren(...cards);
   }
   const fav=$('detailFavorite'),key='atelier-montres-multibrand-favorites-v1';
   if(fav){
     let ids=[];
     try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))ids=stored.filter(v=>typeof v==='string'&&v.length<80)}catch(_){}
     const update=()=>{const checked=ids.includes(p.id);fav.textContent=checked?'♥ Retirer des favoris':'♡ Ajouter aux favoris';fav.setAttribute('aria-pressed',String(checked))};
     fav.addEventListener('click',()=>{
       ids=ids.includes(p.id)?ids.filter(value=>value!==p.id):[...ids,p.id];
       try{localStorage.setItem(key,JSON.stringify(ids))}catch(_){}
       update();
     });
     update();
   }
   const share=$('detailShare');
   if(share)share.addEventListener('click',async()=>{
     const url=new URL('./montre.html?id='+encodeURIComponent(p.id),location.href).href;
     const text=p.brand+' '+p.model+' — Atelier Montres';
     if(navigator.share){try{await navigator.share({title:text,url});return}catch(e){if(e.name==='AbortError')return}}
     try{await navigator.clipboard.writeText(url);share.textContent='Lien copié ✓'}catch(_){share.textContent='Partager : '+p.model}
   });
   document.querySelectorAll('.am-mobile-nav a').forEach(a=>a.addEventListener('click',()=>{const menu=a.closest('details');if(menu)menu.open=false}));

   status.hidden=true;shell.hidden=false;
 }).catch(fail);
})();