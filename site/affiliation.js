'use strict';
(() => {
 const $=(id)=>document.getElementById(id);
 const grid=$('affGrid'),tabs=$('affTabs'),search=$('affSearch'),count=$('affResultCount'),savedCount=$('affSavedCount'),empty=$('affEmpty');
 if(!grid||!tabs||!search||!count||!savedCount||!empty)return;
 let data=[],tier='all',query='',saved=new Set();
 const KEY='atelier-montres-multibrand-favorites-v1';
 try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))saved=new Set(x.filter(y=>typeof y==='string'&&y.length<80))}catch(_){}
 const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 const levels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
 const movement={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire Eco-Drive'};
 const valid=(p)=>p&&typeof p.id==='string'&&p.id.length<90&&Object.hasOwn(levels,p.tier)&&typeof p.brand==='string'&&typeof p.model==='string'&&typeof p.description==='string'&&typeof p.officialUrl==='string'&&p.affiliateUrl===null&&p.merchantLinkStatus==='untracked_official'&&p.photoRights==='not_licensed';
 const official=(url)=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr','seikowatches.com','tissotwatches.com','hamiltonwatch.com'].some(x=>u.hostname===x||u.hostname.endsWith('.'+x));}catch(_){return false}};
 function card(p){
  const item=node('article','aff-card');
  const art=node('div','aff-illustration');art.dataset.tone=p.tone||'silver';art.setAttribute('role','img');art.setAttribute('aria-label','Illustration décorative générique, différente de la véritable montre '+p.model);
  const band=node('div','aff-band');const face=node('div','aff-case');face.append(node('span'));art.append(band,face,node('span','aff-art-label','ILLUSTRATION DE STYLE'));
  const body=node('div','aff-card-body');body.append(node('p','aff-card-brand',p.brand),node('h3','',p.model),node('p','aff-card-desc',p.description));
  const chips=node('div','aff-chips');chips.append(node('span','',levels[p.tier]),node('span','',movement[p.movement]||'Horlogerie'));body.append(chips);
  const actions=node('div','aff-card-actions');
  const a=node('a','','Voir la fiche officielle ↗');a.href=p.officialUrl;a.target='_blank';a.rel='noopener noreferrer nofollow';a.setAttribute('aria-label','Voir les photos officielles et les détails de '+p.model+' chez '+p.brand);
  const like=node('button','',saved.has(p.id)?'♥':'♡');like.type='button';like.setAttribute('aria-pressed',String(saved.has(p.id)));like.setAttribute('aria-label',(saved.has(p.id)?'Retirer des favoris : ':'Ajouter aux favoris : ')+p.model);
  like.addEventListener('click',()=>{saved.has(p.id)?saved.delete(p.id):saved.add(p.id);try{localStorage.setItem(KEY,JSON.stringify([...saved]))}catch(_){}render()});
  actions.append(a,like);body.append(actions,node('p','aff-card-foot','Fiche fabricant · Aucun lien rémunéré actif · Prix à vérifier'));item.append(art,body);return item;
 }
 function render(){
  const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visible=data.filter(p=>(tier==='all'||(tier==='favourites'?saved.has(p.id):p.tier===tier))&&[p.brand,p.model,p.description,p.style].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
  grid.replaceChildren(...visible.map(card));empty.hidden=visible.length>0;savedCount.textContent=String([...saved].filter(id=>data.some(p=>p.id===id)).length);
  count.textContent=visible.length+' modèle'+(visible.length===1?'':'s')+' présenté'+(visible.length===1?'':'s');
  tabs.querySelectorAll('button[data-tier]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tier===tier)));
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-tier]');if(!b)return;tier=b.dataset.tier;render()});
 search.addEventListener('input',()=>{query=search.value.slice(0,80);render()});
 document.querySelectorAll('a[data-goto-tier]').forEach(a=>a.addEventListener('click',()=>{tier=a.dataset.gotoTier;render()}));
 fetch('./selection-affiliation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalogue indisponible');return r.json()}).then(x=>{
  if(x?.version!==1||!Array.isArray(x.products)||x.products.length!==15||x.affiliateEnabled!==false)throw Error('Configuration non validée');
  data=x.products.filter(p=>valid(p)&&official(p.officialUrl));
  if(data.length!==15)throw Error('Références incomplètes');
  render();
 }).catch(()=>{count.textContent='Catalogue momentanément indisponible';empty.hidden=false;grid.replaceChildren()});
})();
