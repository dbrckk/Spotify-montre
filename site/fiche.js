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
   document.title=p.brand+' '+p.model+' — Atelier Montres';
   $('detailCrumb').textContent=p.brand+' '+p.model;
   $('detailTier').textContent=({essential:'Collection Essentielle',signature:'Collection Signature',prestige:'Collection Prestige'})[p.tier]||'Collection';
   $('detailBrand').textContent=p.brand;
   $('detailTitle').textContent=p.model;
   $('detailEditorial').textContent=p.title||'Notre sélection';
   $('detailStory').textContent=p.story||p.description;
   const art=$('detailArtwork'),photo=p.photoReview,photoLabel=$('detailPhotoLabel'),photoNote=$('detailPhotoNote');
   if(art){
     const sources=[];
     if(photo?.localUrl==='./assets/watches/'+p.id+'.webp')sources.push(photo.localUrl+(typeof photo.localSha256==='string'&&/^[a-f0-9]{64}$/.test(photo.localSha256)?'?v='+photo.localSha256.slice(0,12):''));
     if(photo?.accuracy==='exact'&&typeof photo.url==='string'&&photo.url.startsWith('https://'))sources.push(photo.url);
     const fallback=()=>{art.replaceChildren();art.classList.remove('am-real-photo-stage');window.AtelierWatch?.render(art,p);if(photoLabel)photoLabel.textContent='ILLUSTRATION DE SECOURS';if(photoNote)photoNote.textContent='Photo momentanément indisponible. Voir la photographie authentique chez le fabricant.'};
     if(sources.length){
       art.replaceChildren();art.classList.add('am-real-photo-stage');
       const img=node('img','am-real-product-photo');img.alt=p.brand+' '+p.model+' — photographie du modèle réel';img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';
       let index=0;img.onerror=()=>{index++;if(index<sources.length)img.src=sources[index];else fallback()};
       art.append(img);img.src=sources[0];
       if(photoLabel)photoLabel.textContent='PHOTOGRAPHIE DU MODÈLE · '+(photo.provider||p.brand).toUpperCase();
       if(photoNote)photoNote.textContent='Modèle original de '+p.brand+' · Référence '+p.model;
     }else fallback();
   }
   $('detailHighlights').replaceChildren(...(p.highlights||[]).map(t=>node('span','',t)));
   $('detailOfficial').href=p.officialUrl;
   $('detailOfficial').setAttribute('aria-label','Voir '+p.model+' sur le site officiel '+p.brand);
   const q=encodeURIComponent((p.brand+' '+p.model).slice(0,90));
   $('detailAmazon').href='https://www.amazon.fr/s?k='+q;
   $('detailEbay').href='https://www.ebay.fr/sch/i.html?_nkw='+q;
   const rows=[['Référence',p.model],['Maison',p.brand],['Type de mouvement',p.specs?.movement||'À confirmer sur la fiche fabricant'],['Diamètre du boîtier',p.specs?.diameter||'À confirmer'],['Verre',p.specs?.glass||'À confirmer'],['Étanchéité',p.specs?.waterResistance||'À confirmer'],['Stock marchand','Non synchronisé'],['Prix actuel','Voir le fabricant']];
   const list=$('detailSpecList');
   list.replaceChildren(...rows.map(([label,val])=>{const line=node('div');line.append(node('dt','',label),node('dd','',val));return line}));
   status.hidden=true;shell.hidden=false;
 }).catch(fail);
})();