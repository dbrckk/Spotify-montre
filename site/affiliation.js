'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const grid=$('affGrid'),tabs=$('affTabs'),search=$('affSearch'),count=$('affResultCount'),savedCount=$('affSavedCount'),empty=$('affEmpty'),sort=$('affSort');
 if(!grid||!tabs||!search||!count||!savedCount||!empty)return;
 const levels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'},moves={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
 const approvedHosts=['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr','seikowatches.com','tissotwatches.com','hamiltonwatch.com'];
 let data=[],tier='all',query='',order='editorial',saved=new Set(),compare=[];
 const KEY='atelier-montres-multibrand-favorites-v1';
 try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))saved=new Set(x.filter(y=>typeof y==='string'&&y.length<80))}catch(_){}
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const official=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&approvedHosts.some(x=>u.hostname===x||u.hostname.endsWith('.'+x))}catch(_){return false}};
 const valid=p=>p&&p.affiliateUrl===null&&p.merchantLinkStatus==='untracked_official'&&p.photoRights==='not_licensed'&&p.imageMode==='custom_vector_illustration'&&Object.hasOwn(levels,p.tier)&&typeof p.id==='string'&&typeof p.brand==='string'&&typeof p.model==='string'&&typeof p.description==='string'&&official(p.officialUrl);
 const word=p=>[p.brand,p.model,p.title,p.description,p.style,p.tier,p.movement,...(p.highlights||[])].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const detail=id=>'./montre.html?id='+encodeURIComponent(id);
 const compareTray=$('affCompareTray'),compareLabel=$('affCompareLabel'),compareOpen=$('affCompareOpen'),compareClear=$('affCompareClear'),dialog=$('affCompareDialog'),compareBody=$('affCompareBody');
 function updateCompare(){
   compare=compare.filter(id=>data.some(p=>p.id===id));
   if(compareTray)compareTray.hidden=compare.length===0;
   if(compareLabel)compareLabel.textContent=compare.length+' montre'+(compare.length>1?'s':'')+' à comparer (3 max)';
   if(compareOpen)compareOpen.disabled=compare.length<2;
 }
 function card(p){
   const item=make('article','aff-card');
   const art=make('div','aff-illustration');art.dataset.tone=p.tone||'silver';
   const photo=p.photoReview;
   if(photo&&photo.accuracy==='exact'){
     const img=make('img','aff-product-photo');img.src=photo.url;img.alt=p.brand+' '+p.model+' — photographie du modèle';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
     img.onerror=()=>{img.remove();if(window.AtelierWatch)window.AtelierWatch.render(art,p);art.append(make('span','aff-art-label','ILLUSTRATION DE SECOURS'))};
     art.append(img);
     art.append(make('span','aff-art-label','PHOTO DU MODÈLE · SOURCE '+photo.provider.toUpperCase()));
   }else{if(window.AtelierWatch)window.AtelierWatch.render(art,p);art.append(make('span','aff-art-label','ILLUSTRATION ORIGINALE'))}
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
   cb.addEventListener('change',()=>{if(cb.checked&&!compare.includes(p.id)){if(compare.length>=3){cb.checked=false;return;}compare.push(p.id)}else compare=compare.filter(id=>id!==p.id);updateCompare()});
   select.append(cb,document.createTextNode(' Comparer'));compareWrap.append(maker,select);body.append(compareWrap);
   body.append(make('p','aff-card-foot','Modèle réel · Liens actuellement non rémunérés'));
   item.append(art,body);return item;
 }
 function render(){
   const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   let visible=data.filter(p=>(tier==='all'||(tier==='favourites'?saved.has(p.id):p.tier===tier))&&word(p).includes(q));
   if(order==='brand')visible=visible.slice().sort((a,b)=>(a.brand+' '+a.model).localeCompare(b.brand+' '+b.model,'fr'));
   if(order==='name')visible=visible.slice().sort((a,b)=>a.model.localeCompare(b.model,'fr'));
   grid.replaceChildren(...visible.map(card));empty.hidden=visible.length>0;
   savedCount.textContent=String([...saved].filter(id=>data.some(p=>p.id===id)).length);
   count.textContent=visible.length+' montre'+(visible.length>1?'s':'')+' sélectionnée'+(visible.length>1?'s':'');
   tabs.querySelectorAll('button[data-tier]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tier===tier)));
   updateCompare();
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-tier]');if(!b)return;tier=b.dataset.tier;render()});
 search.addEventListener('input',()=>{query=search.value.slice(0,100);render()});
 if(sort)sort.addEventListener('change',()=>{order=sort.value;render()});
 document.querySelectorAll('a[data-goto-tier]').forEach(a=>a.addEventListener('click',()=>{tier=a.dataset.gotoTier;render()}));
 function showComparison(){
   if(!dialog||!compareBody||compare.length<2)return;
   const selected=compare.map(id=>data.find(p=>p.id===id)).filter(Boolean);
   const table=make('table','am-compare-table'),head=make('thead'),tr=make('tr');
   tr.append(make('th','','Critère'));
   for(const p of selected)tr.append(make('th','',p.brand+' '+p.model));
   head.append(tr);table.append(head);
   const tbody=make('tbody');
   const rows=[['Gamme',p=>levels[p.tier]],['Mouvement',p=>p.specs?.movement||moves[p.movement]||'Non confirmé'],['Diamètre',p=>p.specs?.diameter||'À vérifier'],['Verre',p=>p.specs?.glass||'À vérifier'],['Étanchéité',p=>p.specs?.waterResistance||'À vérifier']];
   for(const [label,fn] of rows){const row=make('tr');row.append(make('th','',label));for(const p of selected)row.append(make('td','',fn(p)));tbody.append(row)}
   const row=make('tr');row.append(make('th','','Fiche'));for(const p of selected){const td=make('td'),a=make('a','','Découvrir ↗');a.href=detail(p.id);td.append(a);row.append(td)}tbody.append(row);table.append(tbody);
   compareBody.replaceChildren(table);if(typeof dialog.showModal==='function')dialog.showModal();
 }
 if(compareOpen)compareOpen.addEventListener('click',showComparison);
 if(compareClear)compareClear.addEventListener('click',()=>{compare=[];render()});
 if($('affCompareClose'))$('affCompareClose').addEventListener('click',()=>dialog.close());
 if(dialog)dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 fetch('./selection-affiliation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('data');return r.json()}).then(x=>{
  if(x?.version!==1||!Array.isArray(x.products)||x.products.length!==15||x.affiliateEnabled!==false)throw Error('invalid');
  data=x.products.filter(valid);if(data.length!==15)throw Error('incomplete catalogue');
  if($('heroWatch'))window.AtelierWatch?.render($('heroWatch'),data.find(p=>p.id==='citizen-tsuyosa'));
  render();
 }).catch(()=>{count.textContent='Catalogue temporairement indisponible';empty.hidden=false;grid.replaceChildren()});
})();