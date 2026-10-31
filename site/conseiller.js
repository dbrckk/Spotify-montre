'use strict';
/* One validated 52-watch public source. No prices, user tracking or back end. */
(() => {
 const engine=globalThis.AtelierAdvisorEngine;
 const form=document.getElementById('advisorForm'),results=document.getElementById('advisorResults'),status=document.getElementById('advisorStatus');
 const summary=document.getElementById('advisorSummary'),criteria=document.getElementById('advisorCriteria'),error=document.getElementById('advisorError'),reset=document.getElementById('advisorReset');
 if(!engine||!form||!results||!status||!summary||!criteria||!error||!reset)return;
 const node=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
 const read=()=>engine.choices(Object.fromEntries(new FormData(form).entries()));
 let catalogue=[];
 function photo(p,rank){
   const wrap=node('div','advisor-photo'),img=node('img');
   const missing=node('p','advisor-fallback','Photographie non disponible ici ; consultez la fiche du vendeur.');
   const chip=node('span','advisor-rank',String(rank+1).padStart(2,'0')+' / 03');
   const photoUrl=p.photoUrl;
   const safe=typeof photoUrl==='string'
     &&new RegExp('^\\./assets/(?:watches|watches-popular)/'+p.id+'\\.webp$').test(photoUrl);
   img.alt='Photographie du modèle '+p.brand+' '+p.model;
   img.width=540;img.height=540;img.loading='lazy';img.decoding='async';
   img.onerror=()=>{
     img.remove();wrap.classList.add('fallback');
     // A stylised stand-in must never be described as a real model photo.
     if(p.kind==='core')window.AtelierWatch?.render(wrap,p);
   };
   wrap.append(img,missing,chip);
   if(safe)img.src=photoUrl;
   else{img.remove();wrap.classList.add('fallback');if(p.kind==='core')window.AtelierWatch?.render(wrap,p)}
   return wrap;
 }
 function card(entry,i){
   const p=entry.product;
   const item=node('article','advisor-card'),body=node('div','advisor-card-body');
   const title=node('h3','',p.model);
   const brand=node('p','advisor-card-brand',p.brand.toUpperCase());
   const story=node('p','advisor-card-description',p.lead||p.description);
   const match=node('div','advisor-match');
   const allMatched=entry.criteria>0&&entry.matched===entry.criteria;
   const matchLabel=entry.criteria===0?'POINT DE DÉPART':allMatched?'CORRESPOND À VOS CRITÈRES':entry.matched>0?'UNE AUTRE PISTE':'À DÉCOUVRIR';
   const matchText=entry.criteria===0?'Un modèle représentatif de sa gamme, sélectionné par la rédaction.':(entry.details.length?entry.details.join(' · '):'Un style différent, à explorer si vous souhaitez élargir vos critères.');
   match.append(node('span','advisor-match-label',matchLabel),node('p','',matchText));
   if(entry.sizeNote)match.append(node('p','advisor-size-warning',entry.sizeNote));
   const actions=node('div','advisor-card-actions');
   const detail=node('a','primary','Voir la fiche complète ↗');
   detail.href=p.detailUrl;
   const official=node('a','secondary','Voir chez '+p.brand+' ↗');
   official.href=p.officialUrl;official.target='_blank';official.rel='noopener noreferrer nofollow';
   actions.append(detail,official);
   body.append(brand,title,story,match,actions);
   item.append(photo(p,i),body);
   return item;
 }
 function updateAddress(c){
   try{
     const query=new URLSearchParams();
     for(const key of ['tier','style','movement','size'])if(c[key]!=='all')query.set(key,c[key]);
     const next=location.pathname+(query.size?'?'+query.toString():'')+location.hash;
     history.replaceState(null,'',next);
   }catch(_){}
 }
 function render(){
   const choices=read(),recommendations=engine.recommend(catalogue,choices,3);
   const active=[choices.tier,choices.style,choices.movement,choices.size].filter(x=>x!=='all').length;
   const matches=recommendations.filter(x=>x.criteria>0&&x.matched===x.criteria).length;
   results.replaceChildren(...recommendations.map(card));
   const compareLink=document.getElementById('advisorCompare');
   if(compareLink){
     const ids=recommendations.map(item=>item.product?.id)
       .filter(id=>typeof id==='string'&&/^[a-z0-9-]{4,64}$/.test(id));
     compareLink.hidden=ids.length<2;
     if(ids.length>=2)compareLink.href='./montres/toutes-les-montres.html?compare='+ids.map(encodeURIComponent).join(',')+'#comparer';
   }
   status.textContent=recommendations.length+' montre'+(recommendations.length>1?'s':'')+' à explorer parmi '+catalogue.length;
   criteria.textContent=active?active+' préférence'+(active>1?'s':'')+' retenue'+(active>1?'s':''):'Sélection de départ';
   summary.textContent=active?matches+' modèle'+(matches>1?'s':'')+' sur '+recommendations.length+' répond'+(matches>1?'ent':'')+' à tous vos critères. Les autres sont des alternatives proches.':'Notre sélection de départ, issue de plusieurs gammes.';
   error.hidden=true;updateAddress(choices);
 }
 form.addEventListener('change',()=>{if(catalogue.length)render()});
 reset.addEventListener('click',()=>{form.reset();if(catalogue.length)render();form.querySelector('input[name="tier"]')?.focus()});
 fetch('./discovery-catalogue.json',{cache:'no-store'}).then(r=>{
   if(!r.ok)throw Error('Catalogue indisponible');return r.json();
 }).then(data=>{
   if(data?.version!==1||data?.total!==52||data.coreCount!==15||data.supplementalCount!==37
     ||!Array.isArray(data.products)||data.products.length!==52)
     throw Error('Catalogue incomplet');
   if(new Set(data.products.map(p=>p.id)).size!==52||
     data.products.some(p=>typeof p.id!=='string'||!/^[a-z0-9-]{4,64}$/.test(p.id)
       ||typeof p.officialUrl!=='string'||!p.officialUrl.startsWith('https://')
       ||p.detailUrl!=='./montres/'+p.id+'.html'))
     throw Error('Références incohérentes');
   catalogue=data.products;
   const params=new URLSearchParams(location.search),initial=engine.choices(Object.fromEntries(params));
   for(const key of ['tier','style','movement','size']){
     const field=form.elements.namedItem(key);
     if(field)field.value=initial[key];
   }
   const hero=document.getElementById('advisorHeroArt');
   const featured=catalogue.find(p=>p.id==='citizen-tsuyosa');
   if(hero&&featured){
     if(featured.photoUrl==='./assets/watches/citizen-tsuyosa.webp'){
       const img=node('img','advisor-hero-photo');img.src=featured.photoUrl;
       img.alt='Citizen Tsuyosa — photographie de la référence exacte';
       img.width=540;img.height=540;img.decoding='async';img.fetchPriority='high';
       img.onerror=()=>{hero.replaceChildren();window.AtelierWatch?.render(hero,featured)};
       hero.replaceChildren(img);
     }else window.AtelierWatch?.render(hero,featured);
   }
   render();
 }).catch(()=>{
   results.replaceChildren();status.textContent='Conseiller temporairement indisponible';
   error.hidden=false;
 });
})();
