'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const grid=$('affGrid'),tabs=$('affTabs'),search=$('affSearch'),count=$('affResultCount'),savedCount=$('affSavedCount'),empty=$('affEmpty'),sort=$('affSort'),movementSelect=$('affMovement'),brandSelect=$('affBrand'),diameterSelect=$('affDiameter'),reset=$('affReset');
 if(!grid||!tabs||!search||!count||!savedCount||!empty)return;
 const levels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'},moves={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
 // Preserve a reader's choice across navigation and sessions; first-time
 // mobile visitors get a photographic gallery, desktop gets editorial cards.
 const viewGallery=$('affViewGallery'),viewDetails=$('affViewDetail');
 const VIEW_KEY='atelier-montres-catalogue-view-v1';
 // Account for the *actual* two-column mobile gallery instead of telling
 // browsers each thumbnail takes 92vw (which wastes image transfer bytes).
 // The expanded detail layout remains a full-width photo on narrow screens.
 const imageSizesForView=mode=>mode==='gallery'
   ?'(max-width: 350px) 92vw, (max-width: 760px) 46vw, (max-width: 980px) 31vw, 23vw'
   :'(max-width: 680px) 92vw, (max-width: 1040px) 46vw, 31vw';
 if(viewGallery&&viewDetails){
   let initial=null;
   try{const stored=localStorage.getItem(VIEW_KEY);if(stored==='gallery'||stored==='detail')initial=stored;}catch(_){}
   if(!initial)initial=window.matchMedia?.('(max-width: 620px)').matches?'gallery':'detail';
   const choose=mode=>{
     const selected=mode==='gallery'?'gallery':'detail';
     grid.dataset.view=selected;
     // The image candidates must track the actual current CSS presentation.
     // Updating sizes in place preserves favorite, comparison and focus state.
     grid.querySelectorAll('img.aff-product-photo[srcset]').forEach(img=>{
       img.sizes=imageSizesForView(selected);
     });
     viewGallery.setAttribute('aria-pressed',String(selected==='gallery'));
     viewDetails.setAttribute('aria-pressed',String(selected==='detail'));
   };
   choose(initial);
   for(const [button,mode] of [[viewGallery,'gallery'],[viewDetails,'detail']]){
     button.addEventListener('click',()=>{
       choose(mode);
       try{localStorage.setItem(VIEW_KEY,mode);}catch(_){}
     });
   }
 }
 const approvedHosts=['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr','seikowatches.com','tissotwatches.com','hamiltonwatch.com'];
 let data=[],tier='all',query='',order='editorial',movement='all',brand='all',diameter='all',visible=[],saved=new Set(),compare=[];
 const KEY='atelier-montres-multibrand-favorites-v1';
 const COMPARE_KEY='atelier-montres-comparison-v1';
 // The SEO build adds crawlable, richer product comparisons. Historical standalone snapshots stay compatible.
 const hasEditorialPages=Boolean(document.querySelector('.seo-guides'));
 try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))saved=new Set(x.filter(y=>typeof y==='string'&&y.length<80))}catch(_){}
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&approvedHosts.some(x=>u.hostname===x||u.hostname.endsWith('.'+x))}catch(_){return false}};
 const valid=p=>p&&p.affiliateUrl===null&&p.merchantLinkStatus==='untracked_official'&&p.photoRights==='permission_declared_by_site_owner'&&p.imageMode==='manufacturer_product_photo'&&Object.hasOwn(levels,p.tier)&&typeof p.id==='string'&&typeof p.brand==='string'&&typeof p.model==='string'&&typeof p.description==='string'&&official(p.officialUrl);
 const diameterMm=p=>{const match=/^(\d{1,2})(?:[,.](\d+))?\s*mm$/i.exec((p.specs?.diameter||'').trim());return match?Number(match[1]+'.'+(match[2]||'0')):null};
 const matchesDiameter=p=>{const n=diameterMm(p);return diameter==='all'||(diameter==='unknown'&&n===null)||(diameter==='compact'&&n!==null&&n<=38)||(diameter==='medium'&&n!==null&&n>38&&n<=40)};
 const diameterLabels={compact:'≤ 38 mm',medium:'38,1–40 mm',unknown:'Diamètre à confirmer'};
 // Use documented watch facts for multi-word queries, irrespective of
 // order, accents or the French decimal separator. No remote search service.
 const normalizeSearch=value=>String(value??'')
   .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
   .replace(/(\d)\s*[,\.]\s*(\d)/g,'$1.$2')
   .replace(/(\d+(?:\.\d+)?)\s*(mm|bar)\b/g,'$1$2')
   .replace(/[^a-z0-9.]+/g,' ').trim();
 const searchIndex=p=>normalizeSearch([
   p.brand,p.model,p.id,p.title,p.description,p.story,p.style,p.tier,p.movement,
   p.specs?.movement,p.specs?.diameter,p.specs?.caseSize,
   p.specs?.glass,p.specs?.waterResistance,...(p.highlights||[])
 ].filter(Boolean).join(' '));
 const matchesSearch=(p,raw)=>{
   const q=normalizeSearch(raw);if(!q)return true;
   // Model codes copied without their hyphens must still find the exact watch.
   const compactModel=normalizeSearch(p.model).replace(/[^a-z0-9]/g,'');
   const compactQuery=q.replace(/[^a-z0-9]/g,'');
   if(compactQuery.length>=5&&compactModel.includes(compactQuery))return true;
   const indexed=searchIndex(p);
   return q.split(/\s+/).every(part=>indexed.includes(part));
 };
 // No external image fallback: the signed-off same-origin WebP is the only
 // public photograph. Keep original vector fallback if the CDN is incomplete.
 const photoSources=p=>{
   const t=p?.photoReview;
   if(t?.publicUsageApproved!==true||t.localUrl!=='./assets/watches/'+p.id+'.webp')return [];
   return [t.localUrl+(typeof t.localSha256==='string'&&/^[a-f0-9]{64}$/i.test(t.localSha256)?'?v='+t.localSha256.slice(0,12):'')];
 };
 const caseLabel=p=>{
   if(p.specs?.diameter)return p.specs.diameter;
   const raw=p.specs?.caseSize;
   const match=typeof raw==='string'&&/^(?:\d{1,2}(?:[,.]\d+)?\s*×\s*)(\d{1,2}(?:[,.]\d+)?)\s*×\s*\d{1,2}(?:[,.]\d+)?\s*mm$/i.exec(raw.trim());
   return match?'Largeur '+match[1]+' mm':'Diamètre à vérifier';
 };
 const responsivePhotoSrcset=p=>{
   const review=p?.photoReview;
   if(review?.publicUsageApproved!==true||review.localUrl!=='./assets/watches/'+p.id+'.webp')return '';
   const w=review.localWidth;
   if(!Number.isInteger(w)||w<480)return '';
   const version=typeof review.localSha256==='string'&&/^[a-f0-9]{64}$/.test(review.localSha256)?'?v='+review.localSha256.slice(0,12):'';
   const images=[480,800].filter(size=>size<w).map(size=>'./assets/watch-responsive/'+p.id+'-'+size+'.webp'+version+' '+size+'w');
   if(!images.length)return '';
   images.push(review.localUrl+version+' '+w+'w');
   return images.join(', ');
 };
 // The product link carries only selected public filters. This lets a
 // visitor go search -> watch -> same results without cookies or a backend.
 // Product sharing itself remains canonical and omits this navigation state.
 const catalogueContext=()=>{
   const p=new URLSearchParams();
   if(tier!=='all')p.set('tier',tier);
   if(brand!=='all')p.set('brand',brand);
   if(movement!=='all')p.set('movement',movement);
   if(diameter!=='all')p.set('diameter',diameter);
   if(query.trim())p.set('q',query.trim().slice(0,100));
   if(order!=='editorial')p.set('sort',order);
   return p.toString();
 };
 const detail=id=>{
   const u=new URLSearchParams({id});
   const state=catalogueContext();
   if(state)u.set('from',state);
   return './montre.html?'+u.toString();
 };
 const compareTray=$('affCompareTray'),compareLabel=$('affCompareLabel'),compareSelected=$('affCompareSelected'),compareNotice=$('affCompareNotice'),compareOpen=$('affCompareOpen'),compareClear=$('affCompareClear'),dialog=$('affCompareDialog'),compareBody=$('affCompareBody');
 const replacementDialog=$('affCompareReplaceDialog');
 const replacementChoices=$('affReplaceChoices');
 const replacementIncoming=$('affReplaceIncoming');
 const replacementCancel=$('affReplaceCancel');
 let compareWarning='';
 function updateCompare(){
   compare=compare.filter(id=>data.some(p=>p.id===id)).slice(0,3);
   // Keep the short-list within this tab across detail pages and reloads.
   try{if(compare.length)sessionStorage.setItem(COMPARE_KEY,JSON.stringify(compare));else sessionStorage.removeItem(COMPARE_KEY)}catch(_){}
   // Keep shared links consistent after user removes or clears watches.
   if(location.search.includes('compare=')){
     const url=new URL(location.href);
     if(compare.length)url.searchParams.set('compare',compare.join(','));
     else url.searchParams.delete('compare');
     history.replaceState(history.state,'',url.pathname+url.search+url.hash);
   }
   if(compareTray)compareTray.hidden=compare.length===0;
   if(compareLabel)compareLabel.textContent=compare.length+' montre'+(compare.length>1?'s':'')+' sélectionnée'+(compare.length>1?'s':'')+' · 3 maximum';
   if(compareOpen)compareOpen.disabled=compare.length<2;
   if(compareNotice)compareNotice.textContent=compareWarning||(compare.length===3?'3/3 · Cochez une autre montre pour remplacer un modèle.':compare.length===1?'Sélectionnez une deuxième montre pour comparer.':'');
   if(compareSelected){
     const chips=compare.map(id=>{
       const p=data.find(item=>item.id===id);
       const button=make('button','am-compare-selected-chip');
       button.type='button';
       button.setAttribute('aria-label','Retirer '+p.brand+' '+p.model+' de la comparaison');
       if(p.photoReview?.publicUsageApproved===true&&p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'){
         const img=make('img');img.src=p.photoReview.localUrl;img.alt='';img.width=40;img.height=40;img.decoding='async';
         // A 40px comparison chip should not transfer a full-size watch photo.
         const candidates=responsivePhotoSrcset(p);
         if(candidates){img.srcset=candidates;img.sizes='40px';img.onerror=()=>{
           img.removeAttribute('srcset');img.removeAttribute('sizes');img.onerror=null;img.src=p.photoReview.localUrl;
         };}
         button.append(img);
       }
       button.append(make('span','am-compare-chip-name',p.brand+' '+p.model),make('span','am-compare-chip-remove','×'));
       button.addEventListener('click',()=>{compare=compare.filter(value=>value!==id);compareWarning='';render()});
       return button;
     });
     compareSelected.replaceChildren(...chips);
   }
 }
 function requestReplacement(incomingId){
   const incoming=data.find(p=>p.id===incomingId);
   if(!incoming||compare.includes(incomingId)||compare.length!==3)return;
   if(!replacementDialog||!replacementChoices||!replacementIncoming||typeof replacementDialog.showModal!=='function'){
     compareWarning='Limite atteinte : retirez une montre avant d’en ajouter une autre.';
     updateCompare();return;
   }
   replacementIncoming.textContent=incoming.brand+' '+incoming.model;
   const choices=compare.map((selectedId,position)=>{
     const selected=data.find(p=>p.id===selectedId);
     const choice=make('button','am-replace-choice');
     choice.type='button';
     choice.dataset.replaceId=selectedId;
     choice.setAttribute('aria-label','Remplacer '+selected.brand+' '+selected.model+' par '+incoming.brand+' '+incoming.model);
     if(selected.photoReview?.publicUsageApproved===true&&selected.photoReview.localUrl==='./assets/watches/'+selected.id+'.webp'){
       const img=make('img');img.alt='';img.loading='lazy';img.decoding='async';img.width=52;img.height=52;
       const variants=responsivePhotoSrcset(selected);
       if(variants){img.srcset=variants;img.sizes='52px';}
       img.onerror=()=>{
         if(img.hasAttribute('srcset')){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=selected.photoReview.localUrl;return;}
         img.remove();
       };
       img.src=selected.photoReview.localUrl;choice.append(img);
     }
     const label=make('span','am-replace-choice-text');
     label.append(make('span','am-replace-choice-label','Remplacer la montre '+(position+1)),make('strong','',selected.brand+' '+selected.model));
     choice.append(label,make('span','am-replace-choice-icon','↔'));
     choice.addEventListener('click',()=>{
       const slot=compare.indexOf(selectedId);
       if(slot<0||compare.includes(incomingId))return;
       // Replace exactly one slot; preserve the other two and session state.
       compare[slot]=incomingId;compareWarning='';
       replacementDialog.close();
       render();
       compareSelected?.querySelectorAll('.am-compare-selected-chip')[slot]?.focus();
     });
     return choice;
   });
   replacementChoices.replaceChildren(...choices);
   compareWarning='';
   updateCompare();
   replacementDialog.showModal();
   choices[0]?.focus();
 }
 if(replacementCancel)replacementCancel.addEventListener('click',()=>replacementDialog?.close());
 if(replacementDialog)replacementDialog.addEventListener('click',event=>{
   if(event.target===replacementDialog)replacementDialog.close();
 });
 function card(p){
   const item=make('article','aff-card');item.dataset.watchId=p.id;
   const art=make('div','aff-illustration');art.dataset.tone=p.tone||'silver';
   const photo=p.photoReview,sources=photoSources(p);
   const vector=()=>{art.replaceChildren();if(window.AtelierWatch)window.AtelierWatch.render(art,p);art.append(make('span','aff-art-label','ILLUSTRATION ORIGINALE · PHOTO CHEZ LE FABRICANT'))};
   if(photo?.accuracy==='exact'&&sources.length){
     const img=make('img','aff-product-photo');img.alt=p.brand+' '+p.model+' — photographie authentique';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
     if(Number.isInteger(photo?.localWidth)&&Number.isInteger(photo?.localHeight)){img.width=photo.localWidth;img.height=photo.localHeight;}
     const responsive=responsivePhotoSrcset(p);
     if(responsive){img.srcset=responsive;img.sizes=imageSizesForView(grid.dataset.view);}
     let sourceIndex=0;img.onerror=()=>{
       // A missing derivative must not hide a real watch on an older deployment.
       if(img.srcset){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=sources[0];return;}
       sourceIndex++;if(sourceIndex<sources.length)img.src=sources[sourceIndex];else vector();
     };
     art.append(img,make('span','aff-art-label','PHOTOGRAPHIE DU MODÈLE · '+photo.provider.toUpperCase()));
     const expand=make('button','aff-photo-expand');expand.type='button';expand.setAttribute('aria-label','Agrandir la photographie de '+p.brand+' '+p.model);expand.append(make('span','','⤢ Agrandir'));expand.addEventListener('click',()=>window.AtelierPhoto?.open(visible,p.id));art.append(expand);img.src=sources[0];
   }else vector();
   const body=make('div','aff-card-body');
   body.append(make('p','aff-card-brand',p.brand.toUpperCase()),make('h3','',p.model),make('p','am-card-title',p.title||''),make('p','aff-card-desc',p.story||p.description));
   // Distinct short facts for narrow photo-first gallery cards. Do not guess
   // dimensions absent from the verified manufacturer catalogue.
   const galleryFacts=make('div','am-gallery-facts');
   galleryFacts.append(make('span','',moves[p.movement]||'Mouvement à vérifier'));
   const caseFact=make('span','',caseLabel(p));
   if(!p.specs?.diameter&&p.specs?.caseSize){
     caseFact.title='Dimensions du boîtier (L × l × H) : '+p.specs.caseSize;
     caseFact.setAttribute('aria-label','Largeur documentée ; dimensions L × l × H : '+p.specs.caseSize);
   }
   galleryFacts.append(caseFact);
   body.append(galleryFacts);
   const chips=make('div','aff-chips');chips.append(make('span','',levels[p.tier]),make('span','',moves[p.movement]||'Horlogerie'));body.append(chips);
   const specs=make('div','am-spec-line');for(const h of (p.highlights||[]).slice(0,3))specs.append(make('span','',h));body.append(specs);
   const actions=make('div','aff-card-actions');const link=make('a','','Découvrir la montre ↗');link.href=detail(p.id);
   const like=make('button','',saved.has(p.id)?'♥':'♡');like.type='button';like.setAttribute('aria-pressed',String(saved.has(p.id)));like.setAttribute('aria-label',(saved.has(p.id)?'Retirer des favoris : ':'Ajouter aux favoris : ')+p.model);
   like.addEventListener('click',()=>{saved.has(p.id)?saved.delete(p.id):saved.add(p.id);try{localStorage.setItem(KEY,JSON.stringify([...saved]))}catch(_){}render()});
   actions.append(link,like);body.append(actions);
   const compareWrap=make('div','am-card-footer');
   const maker=make('a','','Photos officielles ↗');maker.href=p.officialUrl;maker.target='_blank';maker.rel='noopener noreferrer nofollow';maker.setAttribute('aria-label','Voir '+p.model+' chez '+p.brand);
   const select=make('label','am-compare-check');const cb=make('input');cb.type='checkbox';cb.checked=compare.includes(p.id);cb.setAttribute('aria-label','Comparer '+p.model);
   cb.addEventListener('change',()=>{if(cb.checked&&!compare.includes(p.id)){if(compare.length>=3){cb.checked=false;requestReplacement(p.id);return;}compare.push(p.id)}else compare=compare.filter(id=>id!==p.id);compareWarning='';updateCompare()});
   select.append(cb,document.createTextNode(' Comparer'));compareWrap.append(maker,select);body.append(compareWrap);
   if(hasEditorialPages){
     const analysis=make('a','am-card-seo-link','Lire la fiche détaillée →');
     analysis.href='./montres/'+encodeURIComponent(p.id)+'.html';
     body.append(analysis);
   }
   body.append(make('p','aff-card-foot','Modèle réel · Liens actuellement non rémunérés'));
   item.append(art,body);return item;
 }
 const recentlyKey='atelier-montres-recent-v1';
 function renderRecentlyViewed(){
   const section=$('affRecentlyViewed'),target=$('affRecentlyGrid');
   if(!section||!target)return;
   let ids=[];
   try{
     const previous=JSON.parse(localStorage.getItem(recentlyKey)||'[]');
     if(Array.isArray(previous))ids=[...new Set(previous.filter(id=>typeof id==='string'&&id.length<80))].slice(0,5);
   }catch(_){}
   const models=ids.map(id=>data.find(p=>p.id===id)).filter(Boolean);
   section.hidden=models.length===0;
   const nodes=models.map(p=>{
     const a=make('a','am-recent-card');
     a.href=detail(p.id);a.setAttribute('aria-label','Revoir '+p.brand+' '+p.model);
     const picture=make('span','am-recent-image');
     if(p.photoReview?.publicUsageApproved===true&&p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'){
       const img=make('img');img.src=p.photoReview.localUrl;img.alt='';img.loading='lazy';img.decoding='async';img.width=120;img.height=120;
       const candidates=responsivePhotoSrcset(p);
       if(candidates){img.srcset=candidates;img.sizes='120px';}
       img.onerror=()=>{
         // Fallback to the same authorized local original if a CDN still
         // serves an older snapshot without a derivative.
         if(img.hasAttribute('srcset')){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=p.photoReview.localUrl;return;}
         img.remove();picture.append(make('span','am-recent-photo-missing','Photo indisponible'));
       };
       picture.append(img);
     }else picture.append(make('span','am-recent-photo-missing','Voir le modèle'));
     const label=make('span','am-recent-name');
     label.append(make('small','',p.brand),make('strong','',p.model));
     a.append(picture,label);
     return a;
   });
   target.replaceChildren(...nodes);
 }
 if($('affRecentlyClear'))$('affRecentlyClear').addEventListener('click',()=>{
   try{localStorage.removeItem(recentlyKey)}catch(_){}
   renderRecentlyViewed();
 });
 window.addEventListener('pageshow',()=>{if(data.length)renderRecentlyViewed()});
 function renderActiveFilters(){
   const target=$('affActiveFilters');if(!target)return;
   const active=[];
   if(tier!=='all')active.push(['tier',tier==='favourites'?'Favoris':levels[tier]]);
   if(brand!=='all')active.push(['brand',brand]);
   if(movement!=='all')active.push(['movement',moves[movement]||movement]);
   if(diameter!=='all')active.push(['diameter',diameterLabels[diameter]]);
   if(query.trim())active.push(['query','Recherche : '+query.trim()]);
   target.hidden=active.length===0;
   target.replaceChildren(...active.map(([key,label])=>{
     const b=make('button','am-filter-chip',label+' ×');b.type='button';b.setAttribute('aria-label','Supprimer le filtre '+label);
     b.addEventListener('click',()=>{
       if(key==='tier')tier='all';
       if(key==='brand'){brand='all';if(brandSelect)brandSelect.value='all'}
       if(key==='movement'){movement='all';if(movementSelect)movementSelect.value='all'}
       if(key==='diameter'){diameter='all';if(diameterSelect)diameterSelect.value='all'}
       if(key==='query'){query='';search.value=''}
       render();
     });return b;
   }));
 }
 function render(){
   visible=data.filter(p=>(tier==='all'||(tier==='favourites'?saved.has(p.id):p.tier===tier))&&(movement==='all'||p.movement===movement)&&(brand==='all'||p.brand===brand)&&matchesDiameter(p)&&matchesSearch(p,query));
   if(order==='brand')visible=visible.slice().sort((a,b)=>(a.brand+' '+a.model).localeCompare(b.brand+' '+b.model,'fr'));
   if(order==='name')visible=visible.slice().sort((a,b)=>a.model.localeCompare(b.model,'fr'));
   if(order==='diameter-asc'||order==='diameter-desc')visible=visible.slice().sort((a,b)=>{const da=diameterMm(a),db=diameterMm(b);if(da===null)return db===null?0:1;if(db===null)return -1;return order==='diameter-asc'?da-db:db-da});
   grid.replaceChildren(...visible.map(card));renderActiveFilters();renderRecentlyViewed();empty.hidden=visible.length>0;if(reset)reset.hidden=tier==='all'&&brand==='all'&&movement==='all'&&diameter==='all'&&!query.trim()&&order==='editorial';
   savedCount.textContent=String([...saved].filter(id=>data.some(p=>p.id===id)).length);
   count.textContent=visible.length+' montre'+(visible.length>1?'s':'')+' sélectionnée'+(visible.length>1?'s':'');
   tabs.querySelectorAll('button[data-tier]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tier===tier)));
   updateCompare();
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-tier]');if(!b)return;tier=b.dataset.tier;render()});
 document.querySelectorAll('.am-mobile-nav a').forEach(a=>a.addEventListener('click',()=>{const menu=a.closest('details');if(menu)menu.open=false}));
 search.addEventListener('input',()=>{query=search.value.slice(0,100);render()});
 if(sort)sort.addEventListener('change',()=>{order=sort.value;render()});
 if(movementSelect)movementSelect.addEventListener('change',()=>{movement=movementSelect.value;render()});
 if(diameterSelect)diameterSelect.addEventListener('change',()=>{diameter=diameterSelect.value;render()});
 if(brandSelect)brandSelect.addEventListener('change',()=>{brand=brandSelect.value;render()});
 if(reset)reset.addEventListener('click',()=>{tier='all';movement='all';brand='all';diameter='all';query='';order='editorial';search.value='';if(sort)sort.value='editorial';if(movementSelect)movementSelect.value='all';if(brandSelect)brandSelect.value='all';if(diameterSelect)diameterSelect.value='all';render();search.focus()});
 document.querySelectorAll('a[data-goto-tier]').forEach(a=>a.addEventListener('click',()=>{tier=a.dataset.gotoTier;render()}));
 function comparisonRows(selected){
   return [
     ['Gamme',p=>levels[p.tier]],
     ['Mouvement',p=>p.specs?.movement||moves[p.movement]||'Non confirmé'],
     ['Taille du boîtier',p=>p.specs?.diameter?'Diamètre '+p.specs.diameter:p.specs?.caseSize?'L × l × H '+p.specs.caseSize:'À vérifier'],
     ['Verre',p=>p.specs?.glass||'À vérifier'],
     ['Étanchéité',p=>p.specs?.waterResistance||'À vérifier']
   ].map(([label,get])=>{
     const values=selected.map(get);
     return {label,values,different:new Set(values).size>1};
   });
 }
 function compareImage(p,cls){
   const sources=photoSources(p),img=make('img',cls);
   img.alt='Photographie autorisée de '+p.brand+' '+p.model;img.decoding='async';img.loading='lazy';img.referrerPolicy='no-referrer';
   if(sources.length){let pos=0;img.onerror=()=>{pos++;if(pos<sources.length)img.src=sources[pos];else img.remove()};img.src=sources[0]}
   return sources.length?img:null;
 }
 function showComparison(){
   if(!dialog||!compareBody||compare.length<2)return;
   const selected=compare.map(id=>data.find(p=>p.id===id)).filter(Boolean);
   if(selected.length<2)return;
   const rows=comparisonRows(selected);
   const table=make('table','am-compare-table'),head=make('thead'),tr=make('tr');
   tr.append(make('th','am-compare-criterion','Critère'));
   for(const p of selected){
     const th=make('th','am-compare-head');
     const image=compareImage(p,'am-compare-thumb');if(image)th.append(image);
     th.append(make('span','am-compare-name',p.brand+' '+p.model));tr.append(th);
   }
   head.append(tr);table.append(head);
   const tbody=make('tbody');
   for(const item of rows){
     const row=make('tr');row.append(make('th','am-compare-criterion',item.label));
     item.values.forEach(value=>row.append(make('td',item.different?'am-compare-different':'',value)));
     tbody.append(row);
   }
   const row=make('tr');row.append(make('th','am-compare-criterion','Fiche'));
   for(const p of selected){const td=make('td'),a=make('a','','Découvrir ↗');a.href=detail(p.id);td.append(a);row.append(td)}
   tbody.append(row);table.append(tbody);
   const mobile=make('div','am-compare-mobile');
   const guide=make('p','am-compare-mobile-hint','Faites glisser pour consulter chaque montre.');
   const track=make('div','am-compare-mobile-track');track.tabIndex=0;track.setAttribute('role','region');track.setAttribute('aria-label','Comparatif des montres, balayage horizontal');
   const slides=selected.map((p,index)=>{
     const card=make('article','am-compare-mobile-card');
     const header=make('div','am-compare-mobile-product');
     header.append(make('span','am-compare-mobile-counter',(index+1)+' / '+selected.length));
     const photo=compareImage(p,'am-compare-mobile-photo');if(photo)header.append(photo);
     header.append(make('h3','',p.brand+' '+p.model));card.append(header);
     const dl=make('dl','am-compare-mobile-specs');
     for(const item of rows){
       const line=make('div',item.different?'am-compare-mobile-diff':'');
       line.append(make('dt','',item.label),make('dd','',item.values[index]));dl.append(line);
     }
     card.append(dl);
     const link=make('a','am-compare-mobile-detail','Découvrir la fiche →');link.href=detail(p.id);card.append(link);
     return card;
   });
   track.append(...slides);
   const nav=make('div','am-compare-mobile-nav');
   const prev=make('button','','← Précédente'),next=make('button','','Suivante →'),position=make('span','am-compare-mobile-position','1 / '+slides.length);
   prev.type='button';next.type='button';prev.disabled=true;
   const select=i=>{
     const n=Math.min(slides.length-1,Math.max(0,i));
     track.scrollTo({left:slides[n].offsetLeft-slides[0].offsetLeft,behavior:'smooth'});
     position.textContent=(n+1)+' / '+slides.length;prev.disabled=n===0;next.disabled=n===slides.length-1;
   };
   prev.addEventListener('click',()=>select(Math.max(0,Math.round(track.scrollLeft/Math.max(1,slides[1]?.offsetLeft-slides[0].offsetLeft))-1)));
   next.addEventListener('click',()=>select(Math.min(slides.length-1,Math.round(track.scrollLeft/Math.max(1,slides[1]?.offsetLeft-slides[0].offsetLeft))+1)));
   track.addEventListener('scroll',()=>{
     const step=slides[1]?.offsetLeft-slides[0].offsetLeft||track.clientWidth;
     const i=Math.min(slides.length-1,Math.max(0,Math.round(track.scrollLeft/Math.max(1,step))));
     position.textContent=(i+1)+' / '+slides.length;prev.disabled=i===0;next.disabled=i===slides.length-1;
   },{passive:true});
   nav.append(prev,position,next);mobile.append(guide,track,nav);
   compareBody.replaceChildren(make('p','am-compare-diff-note','Les caractéristiques différentes sont mises en évidence. Aucune donnée de prix ou de stock n’est estimée.'),table,mobile);
   if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();
 }
 if(compareOpen)compareOpen.addEventListener('click',showComparison);
 if(compareClear)compareClear.addEventListener('click',()=>{compare=[];compareWarning='';render()});
 if($('affCompareShare'))$('affCompareShare').addEventListener('click',async()=>{
   if(compare.length<2)return;
   const url=new URL('./affiliation.html',location.href);url.searchParams.set('compare',compare.join(','));url.hash='montres';
   const button=$('affCompareShare'),label=button.textContent;
   try{
     if(navigator.share){await navigator.share({title:'Comparaison de montres — Atelier Montres',url:url.href});return}
     await navigator.clipboard.writeText(url.href);button.textContent='Lien copié ✓';
   }catch(e){if(e?.name==='AbortError')return;button.textContent='Copie indisponible'}
   setTimeout(()=>{button.textContent=label},2500);
 });
 if($('affCompareClose'))$('affCompareClose').addEventListener('click',()=>dialog.close());
 if(dialog)dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 fetch('./selection-affiliation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('data');return r.json()}).then(x=>{
  if(x?.version!==1||!Array.isArray(x.products)||x.products.length!==15||x.affiliateEnabled!==false)throw Error('invalid');
  data=x.products.filter(valid);if(data.length!==15)throw Error('incomplete catalogue');
  const params=new URLSearchParams(location.search);
  // A shared comparison URL always wins over an older selection in this tab.
  if(params.has('compare')){
   const initial=params.get('compare')||'';
   compare=[...new Set(initial.split(',').slice(0,3))].filter(id=>data.some(p=>p.id===id));
  }else{
   try{
    const stored=JSON.parse(sessionStorage.getItem(COMPARE_KEY)||'[]');
    if(Array.isArray(stored))compare=[...new Set(stored.filter(id=>typeof id==='string'))].filter(id=>data.some(p=>p.id===id)).slice(0,3);
   }catch(_){}
  }
  if(brandSelect){for(const name of [...new Set(data.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'fr'))){const total=data.filter(p=>p.brand===name).length;const option=make('option','',name+' ('+total+')');option.value=name;brandSelect.append(option)}}
  if(window.AtelierEditorial?.init)window.AtelierEditorial.init(data);
  else {
  const hero=$('heroWatch'),featured=data.find(p=>p.id==='citizen-tsuyosa');
  if(hero&&featured){
    const fallback=()=>{hero.replaceChildren();hero.classList.remove('am-hero-real');window.AtelierWatch?.render(hero,featured);const caption=document.querySelector('.am-hero-label small');if(caption)caption.textContent='Illustration originale de style · photo exacte chez le fabricant'};
    const sources=photoSources(featured);
    if(sources.length){const img=make('img','am-hero-real-photo');img.alt='Citizen Tsuyosa NJ0150-81X — photographie authentique';img.decoding='async';img.loading='eager';img.fetchPriority='high';img.referrerPolicy='no-referrer';let i=0;img.onerror=()=>{i++;if(i<sources.length)img.src=sources[i];else fallback()};hero.classList.add('am-hero-real');hero.replaceChildren(img);const caption=document.querySelector('.am-hero-label small');if(caption)caption.textContent='Photographie du modèle exact · source '+(photoSources(featured).length?featured.photoReview.provider:'fabricant');img.src=sources[0]}else fallback();
  }
  }
  render();
  if(compare.length>=2&&params.has('compare'))showComparison();
 }).catch(()=>{count.textContent='Catalogue temporairement indisponible';empty.hidden=false;grid.replaceChildren()});
})();