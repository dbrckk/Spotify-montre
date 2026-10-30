'use strict';
/* Fully local UI: the recommendation logic reads only the public 15-watch catalogue. */
(() => {
 const engine=globalThis.AtelierAdvisorEngine;
 const form=document.getElementById('advisorForm'),results=document.getElementById('advisorResults'),status=document.getElementById('advisorStatus');
 const summary=document.getElementById('advisorSummary'),criteria=document.getElementById('advisorCriteria'),error=document.getElementById('advisorError'),reset=document.getElementById('advisorReset');
 if(!engine||!form||!results||!status||!summary||!criteria||!error||!reset)return;
 const node=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
 const read=()=>engine.choices(Object.fromEntries(new FormData(form).entries()));
 let catalogue=[];
 function photo(p,rank){
   const wrap=node('div','advisor-photo'),img=node('img'),missing=node('p','advisor-fallback','Illustration éditoriale, photo exacte chez le fabricant.');
   const chip=node('span','advisor-rank',String(rank+1).padStart(2,'0')+' / 03');
   const t=p.photoReview||{};
   const urls=[];
   if(t.publicUsageApproved===true&&t.localUrl==='./assets/watches/'+p.id+'.webp')urls.push(t.localUrl);
   if(t.publicUsageApproved===true&&typeof t.url==='string'&&t.url.startsWith('https://'))urls.push(t.url);
   img.alt='Photographie réelle de '+p.brand+' '+p.model;
   img.width=540;img.height=540;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
   let i=0;
   img.onerror=()=>{i++;if(i<urls.length)img.src=urls[i];else{wrap.classList.add('fallback');window.AtelierWatch?.render(wrap,p)}};
   wrap.append(img,missing,chip);
   if(urls.length)img.src=urls[0];else{img.remove();wrap.classList.add('fallback');window.AtelierWatch?.render(wrap,p);}
   return wrap;
 }
 function card(entry,i){
   const p=entry.product;
   const item=node('article','advisor-card'),body=node('div','advisor-card-body');
   const title=node('h3','',p.model);
   const brand=node('p','advisor-card-brand',p.brand.toUpperCase());
   const story=node('p','advisor-card-description',p.story||p.description);
   const match=node('div','advisor-match');
   const allMatched=entry.criteria>0&&entry.matched===entry.criteria;
   const matchLabel=entry.criteria===0?'POINT DE DÉPART':allMatched?'CORRESPOND À VOS CRITÈRES':entry.matched>0?'UNE AUTRE PISTE':'À DÉCOUVRIR';
   const matchText=entry.criteria===0?'Un modèle représentatif de sa gamme, sélectionné par la rédaction.':(entry.details.length?entry.details.join(' · '):'Un style différent, à explorer si vous souhaitez élargir vos critères.');
   match.append(node('span','advisor-match-label',matchLabel),node('p','',matchText));
   if(entry.sizeNote)match.append(node('p','advisor-size-warning',entry.sizeNote));
   const actions=node('div','advisor-card-actions');
   const detail=node('a','primary','Découvrir cette montre ↗');detail.href='./montre.html?id='+encodeURIComponent(p.id);
   const official=node('a','secondary','Voir chez '+p.brand+' ↗');official.href=p.officialUrl;official.target='_blank';official.rel='noopener noreferrer nofollow';
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
     const ids=recommendations.map(item=>item.product?.id).filter(id=>typeof id==='string'&&/^[a-z0-9-]{4,64}$/.test(id));
     compareLink.hidden=ids.length<2;
     if(ids.length>=2)compareLink.href='./affiliation.html?compare='+ids.map(encodeURIComponent).join(',')+'#montres';
   }
   status.textContent=recommendations.length+' montre'+(recommendations.length>1?'s':'')+' à explorer';
   criteria.textContent=active?active+' préférence'+(active>1?'s':'')+' retenue'+(active>1?'s':''):'Sélection de départ';
   summary.textContent=active?matches+' modèle'+(matches>1?'s':'')+' sur '+recommendations.length+' répond'+(matches>1?'ent':'')+' à tous vos critères. Les autres sont des alternatives proches.':'Notre sélection de départ, issue de trois gammes différentes.';
   error.hidden=true;updateAddress(choices);
 }
 form.addEventListener('change',()=>{if(catalogue.length)render()});
 reset.addEventListener('click',()=>{form.reset();if(catalogue.length)render();form.querySelector('input[name="tier"]')?.focus()});
 fetch('./selection-affiliation.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalogue indisponible');return r.json()}).then(data=>{
   if(data?.version!==1||data.affiliateEnabled!==false||!Array.isArray(data.products)||data.products.length!==15)throw Error('Catalogue invalide');
   catalogue=data.products.filter(p=>typeof p.id==='string'&&typeof p.officialUrl==='string'&&p.officialUrl.startsWith('https://'));
   if(catalogue.length!==15)throw Error('Références catalogue incomplètes');
   const params=new URLSearchParams(location.search),initial=engine.choices(Object.fromEntries(params));
   for(const key of ['tier','style','movement','size']){
     const field=form.elements.namedItem(key);
     if(field)field.value=initial[key];
   }
   const hero=document.getElementById('advisorHeroArt');const featured=catalogue.find(p=>p.id==='citizen-tsuyosa');
   if(hero&&featured){
     const review=featured.photoReview;
     if(review?.publicUsageApproved===true&&review.localUrl==='./assets/watches/'+featured.id+'.webp'){
       const heroPhoto=node('img','advisor-hero-photo');
       heroPhoto.src=review.localUrl;heroPhoto.alt=featured.brand+' '+featured.model+' — photographie du modèle';heroPhoto.width=540;heroPhoto.height=540;heroPhoto.decoding='async';heroPhoto.fetchPriority='high';
       heroPhoto.onerror=()=>{hero.replaceChildren();window.AtelierWatch?.render(hero,featured)};
       hero.replaceChildren(heroPhoto);
     }else window.AtelierWatch?.render(hero,featured);
   }
   render();
 }).catch(()=>{
   results.replaceChildren();status.textContent='Conseiller temporairement indisponible';
   error.hidden=false;
 });
})();
