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
   const art=$('detailArtwork'),photo=p.photoReview,photoLabel=$('detailPhotoLabel'),photoNote=$('detailPhotoNote'),zoomButton=$('detailPhotoZoom');
   if(art){
     const sources=[];
     if(photo?.publicUsageApproved===true&&photo?.localUrl==='./assets/watches/'+p.id+'.webp')sources.push(photo.localUrl+(typeof photo.localSha256==='string'&&/^[a-f0-9]{64}$/.test(photo.localSha256)?'?v='+photo.localSha256.slice(0,12):''));
     if(photo?.publicUsageApproved===true&&photo?.accuracy==='exact'&&typeof photo.url==='string'&&photo.url.startsWith('https://'))sources.push(photo.url);
     const fallback=()=>{art.replaceChildren();art.classList.remove('am-real-photo-stage');window.AtelierWatch?.render(art,p);if(zoomButton)zoomButton.hidden=true;if(photoLabel)photoLabel.textContent='ILLUSTRATION ÉDITORIALE ORIGINALE';if(photoNote)photoNote.textContent='Illustration stylisée, non contractuelle. Voir la photo exacte chez le fabricant.'};
     if(sources.length){
       art.replaceChildren();art.classList.add('am-real-photo-stage');
       const img=node('img','am-real-product-photo');img.alt=p.brand+' '+p.model+' — photographie du modèle réel';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
       let index=0;img.onload=()=>{if(zoomButton)zoomButton.hidden=false};img.onerror=()=>{index++;if(index<sources.length)img.src=sources[index];else fallback()};
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
   const rows=[['Référence',p.model],['Maison',p.brand],['Type de mouvement',p.specs?.movement||'À confirmer sur la fiche fabricant'],['Diamètre du boîtier',p.specs?.diameter||'À confirmer'],['Verre',p.specs?.glass||'À confirmer'],['Étanchéité',p.specs?.waterResistance||'À confirmer'],['Stock marchand','Non synchronisé'],['Prix actuel','Voir le fabricant']];
   const list=$('detailSpecList');
   list.replaceChildren(...rows.map(([label,val])=>{const line=node('div');line.append(node('dt','',label),node('dd','',val));return line}));

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
         img.width=320;img.height=320;img.onerror=()=>{img.remove();frame.append(node('span','detail-related-empty','Voir la fiche officielle'))};img.src=imageUrl;
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