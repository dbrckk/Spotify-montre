'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const grid=$('affGrid'),tabs=$('affTabs'),search=$('affSearch'),count=$('affResultCount'),savedCount=$('affSavedCount'),empty=$('affEmpty'),sort=$('affSort'),movementSelect=$('affMovement'),brandSelect=$('affBrand'),reset=$('affReset');
 if(!grid||!tabs||!search||!count||!savedCount||!empty)return;
 const levels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'},moves={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
 const approvedHosts=['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr','seikowatches.com','tissotwatches.com','hamiltonwatch.com'];
 let data=[],tier='all',query='',order='editorial',movement='all',brand='all',visible=[],saved=new Set(),compare=[];
 const KEY='atelier-montres-multibrand-favorites-v1';
 try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))saved=new Set(x.filter(y=>typeof y==='string'&&y.length<80))}catch(_){}
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&approvedHosts.some(x=>u.hostname===x||u.hostname.endsWith('.'+x))}catch(_){return false}};
 const valid=p=>p&&p.affiliateUrl===null&&p.merchantLinkStatus==='untracked_official'&&p.photoRights==='not_licensed'&&p.imageMode==='custom_vector_illustration'&&Object.hasOwn(levels,p.tier)&&typeof p.id==='string'&&typeof p.brand==='string'&&typeof p.model==='string'&&typeof p.description==='string'&&official(p.officialUrl);
 const word=p=>[p.brand,p.model,p.title,p.description,p.style,p.tier,p.movement,...(p.highlights||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const photoSources=p=>{const t=p?.photoReview,files=[];if(t?.localUrl==='./assets/watches/'+p.id+'.webp')files.push(t.localUrl+(typeof t.localSha256==='string'&&/^[a-f0-9]{64}$/.test(t.localSha256)?'?v='+t.localSha256.slice(0,12):''));if(typeof t?.url==='string'&&t.url.startsWith('https://'))files.push(t.url);return files;};
 const detail=id=>'./montre.html?id='+encodeURIComponent(id);
 const compareTray=$('affCompareTray'),compareLabel=$('affCompareLabel'),compareSelected=$('affCompareSelected'),compareNotice=$('affCompareNotice'),compareOpen=$('affCompareOpen'),compareClear=$('affCompareClear'),dialog=$('affCompareDialog'),compareBody=$('affCompareBody');
 let compareWarning='';
 function updateCompare(){
   compare=compare.filter(id=>data.some(p=>p.id===id));
   if(compareTray)compareTray.hidden=compare.length===0;
   if(compareLabel)compareLabel.textContent=compare.length+' montre'+(compare.length>1?'s':'')+' sélectionnée'+(compare.length>1?'s':'')+' · 3 maximum';
   if(compareOpen)compareOpen.disabled=compare.length<2;
   if(compareNotice)compareNotice.textContent=compareWarning||(compare.length===1?'Sélectionnez une deuxième montre pour comparer.':'');
   if(compareSelected){
     const chips=compare.map(id=>{
       const p=data.find(item=>item.id===id);
       const button=make('button','am-compare-selected-chip');
       button.type='button';
       button.setAttribute('aria-label','Retirer '+p.brand+' '+p.model+' de la comparaison');
       if(p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'){
         const img=make('img');img.src=p.photoReview.localUrl;img.alt='';img.width=40;img.height=40;img.decoding='async';
         button.append(img);
       }
       button.append(make('span','am-compare-chip-name',p.brand+' '+p.model),make('span','am-compare-chip-remove','×'));
       button.addEventListener('click',()=>{compare=compare.filter(value=>value!==id);compareWarning='';render()});
       return button;
     });
     compareSelected.replaceChildren(...chips);
   }
 }
 function card(p){
   const item=make('article','aff-card');
   const art=make('div','aff-illustration');art.dataset.tone=p.tone||'silver';
   const photo=p.photoReview,sources=photoSources(p);
   const vector=()=>{art.replaceChildren();if(window.AtelierWatch)window.AtelierWatch.render(art,p);art.append(make('span','aff-art-label','PHOTO INDISPONIBLE · FICHE FABRICANT'))};
   if(photo?.accuracy==='exact'&&sources.length){
     const img=make('img','aff-product-photo');img.alt=p.brand+' '+p.model+' — photographie authentique';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
     let sourceIndex=0;img.onerror=()=>{sourceIndex++;if(sourceIndex<sources.length)img.src=sources[sourceIndex];else vector()};
     art.append(img,make('span','aff-art-label','PHOTOGRAPHIE DU MODÈLE · '+photo.provider.toUpperCase()));
     const expand=make('button','aff-photo-expand');expand.type='button';expand.setAttribute('aria-label','Agrandir la photographie de '+p.brand+' '+p.model);expand.append(make('span','','⤢ Agrandir'));expand.addEventListener('click',()=>window.AtelierPhoto?.open(visible,p.id));art.append(expand);img.src=sources[0];
   }else vector();
   const body=make('div','aff-card-body');
   body.append(make('p','aff-card-brand',p.brand.toUpperCase()),make('h3','',p.model),make('p','am-card-title',p.title||''),make('p','aff-card-desc',p.story||p.description));
   const chips=make('div','aff-chips');chips.append(make('span','',levels[p.tier]),make('span','',moves[p.movement]||'Horlogerie'));body.append(chips);
   const specs=make('div','am-spec-line');for(const h of (p.highlights||[]).slice(0,3))specs.append(make('span','',h));body.append(specs);
   const actions=make('div','aff-card-actions');const link=make('a','','Découvrir la montre ↗');link.href=detail(p.id);
   const like=make('button','',saved.has(p.id)?'♥':'♡');like.type='button';like.setAttribute('aria-pressed',String(saved.has(p.id)));like.setAttribute('aria-label',(saved.has(p.id)?'Retirer des favoris : ':'Ajouter aux favoris : ')+p.model);
   like.addEventListener('click',()=>{saved.has(p.id)?saved.delete(p.id):saved.add(p.id);try{localStorage.setItem(KEY,JSON.stringify([...saved]))}catch(_){}render()});
   actions.append(link,like);body.append(actions);
   const compareWrap=make('div','am-card-footer');
   const maker=make('a','','Photos officielles ↗');maker.href=p.officialUrl;maker.target='_blank';maker.rel='noopener noreferrer nofollow';maker.setAttribute('aria-label','Voir '+p.model+' chez '+p.brand);
   const select=make('label','am-compare-check');const cb=make('input');cb.type='checkbox';cb.checked=compare.includes(p.id);cb.setAttribute('aria-label','Comparer '+p.model);
   cb.addEventListener('change',()=>{if(cb.checked&&!compare.includes(p.id)){if(compare.length>=3){cb.checked=false;compareWarning='Limite atteinte : retirez une montre avant d’en ajouter une autre.';updateCompare();return;}compare.push(p.id)}else compare=compare.filter(id=>id!==p.id);compareWarning='';updateCompare()});
   select.append(cb,document.createTextNode(' Comparer'));compareWrap.append(maker,select);body.append(compareWrap);
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
     if(p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'){
       const img=make('img');img.src=p.photoReview.localUrl;img.alt='';img.loading='lazy';img.decoding='async';img.width=120;img.height=120;
       img.onerror=()=>{img.remove();picture.append(make('span','am-recent-photo-missing','Photo indisponible'))};
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
   if(query.trim())active.push(['query','Recherche : '+query.trim()]);
   target.hidden=active.length===0;
   target.replaceChildren(...active.map(([key,label])=>{
     const b=make('button','am-filter-chip',label+' ×');b.type='button';b.setAttribute('aria-label','Supprimer le filtre '+label);
     b.addEventListener('click',()=>{
       if(key==='tier')tier='all';
       if(key==='brand'){brand='all';if(brandSelect)brandSelect.value='all'}
       if(key==='movement'){movement='all';if(movementSelect)movementSelect.value='all'}
       if(key==='query'){query='';search.value=''}
       render();
     });return b;
   }));
 }
 function render(){
   const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   visible=data.filter(p=>(tier==='all'||(tier==='favourites'?saved.has(p.id):p.tier===tier))&&(movement==='all'||p.movement===movement)&&(brand==='all'||p.brand===brand)&&word(p).includes(q));
   if(order==='brand')visible=visible.slice().sort((a,b)=>(a.brand+' '+a.model).localeCompare(b.brand+' '+b.model,'fr'));
   if(order==='name')visible=visible.slice().sort((a,b)=>a.model.localeCompare(b.model,'fr'));
   grid.replaceChildren(...visible.map(card));renderActiveFilters();renderRecentlyViewed();empty.hidden=visible.length>0;if(reset)reset.hidden=tier==='all'&&brand==='all'&&movement==='all'&&!query.trim()&&order==='editorial';
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
 if(brandSelect)brandSelect.addEventListener('change',()=>{brand=brandSelect.value;render()});
 if(reset)reset.addEventListener('click',()=>{tier='all';movement='all';brand='all';query='';order='editorial';search.value='';if(sort)sort.value='editorial';if(movementSelect)movementSelect.value='all';if(brandSelect)brandSelect.value='all';render();search.focus()});
 document.querySelectorAll('a[data-goto-tier]').forEach(a=>a.addEventListener('click',()=>{tier=a.dataset.gotoTier;render()}));
 function comparisonRows(selected){
   return [
     ['Gamme',p=>levels[p.tier]],
     ['Mouvement',p=>p.specs?.movement||moves[p.movement]||'Non confirmé'],
     ['Diamètre',p=>p.specs?.diameter||'À vérifier'],
     ['Verre',p=>p.specs?.glass||'À vérifier'],
     ['Étanchéité',p=>p.specs?.waterResistance||'À vérifier']
   ].map(([label,get])=>{
     const values=selected.map(get);
     return {label,values,different:new Set(values).size>1};
   });
 }
 function compareImage(p,cls){
   const sources=photoSources(p),img=make('img',cls);
   img.alt='Photographie '+p.brand+' '+p.model;img.decoding='async';img.loading='lazy';img.referrerPolicy='no-referrer';
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
  const initial=new URLSearchParams(location.search).get('compare');
  if(initial){compare=[...new Set(initial.split(',').slice(0,3))].filter(id=>data.some(p=>p.id===id));}
  if(brandSelect){for(const name of [...new Set(data.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'fr'))){const total=data.filter(p=>p.brand===name).length;const option=make('option','',name+' ('+total+')');option.value=name;brandSelect.append(option)}}
  const hero=$('heroWatch'),featured=data.find(p=>p.id==='citizen-tsuyosa');
  if(hero&&featured){
    const fallback=()=>{hero.replaceChildren();hero.classList.remove('am-hero-real');window.AtelierWatch?.render(hero,featured);const caption=document.querySelector('.am-hero-label small');if(caption)caption.textContent='Illustration de secours · photographie indisponible'};
    const sources=photoSources(featured);
    if(sources.length){const img=make('img','am-hero-real-photo');img.alt='Citizen Tsuyosa NJ0150-81X — photographie authentique';img.decoding='async';img.loading='eager';img.fetchPriority='high';img.referrerPolicy='no-referrer';let i=0;img.onerror=()=>{i++;if(i<sources.length)img.src=sources[i];else fallback()};hero.classList.add('am-hero-real');hero.replaceChildren(img);img.src=sources[0]}else fallback();
  }
  render();
  if(compare.length>=2)showComparison();
 }).catch(()=>{count.textContent='Catalogue temporairement indisponible';empty.hidden=false;grid.replaceChildren()});
})();