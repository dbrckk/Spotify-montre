'use strict';
/*
 * Eight recent exact-model references, stored only on the visitor's device.
 * Premium source-derived thumbnails and a direct path to the existing factual
 * comparison. Never fetch third-party images or infer prices/availability.
 */
(() => {
  const key='atelier-montres-unified-recent-v1';
  const valid=id=>typeof id==='string'&&/^[a-z0-9-]{4,64}$/.test(id);
  const read=()=>{
    try{
      const raw=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(raw)?[...new Set(raw.filter(valid))].slice(0,8):[];
    }catch{return null;}
  };
  const article=document.querySelector('main article.watch-product[data-watch-id],main article.am-extra-product[data-popular-watch-id]');
  if(article){
    const id=article.dataset.watchId||article.dataset.popularWatchId;
    const brand=article.dataset.brand,model=article.dataset.model;
    if(!valid(id)||!brand||!model||article.querySelector('h1')?.textContent?.trim()!==brand+' '+model
      ||location.pathname!=='/montres/'+id+'.html')return;
    const ids=read();
    if(ids===null)return;
    try{localStorage.setItem(key,JSON.stringify([id,...ids.filter(x=>x!==id)].slice(0,8)));}catch{}
    return;
  }
  const grid=document.querySelector('#udGrid');
  const section=document.querySelector('[data-unified-recent]');
  const list=section?.querySelector('[data-unified-recent-list]');
  const clear=section?.querySelector('[data-unified-recent-clear]');
  if(!grid||!section||!list||!clear)return;
  const cards=new Map([...grid.querySelectorAll('article.ud-card[data-id]')]
    .filter(card=>valid(card.dataset.id)&&card.dataset.brand&&card.dataset.model
      &&card.querySelector('h2')?.textContent?.trim()===card.dataset.brand+' '+card.dataset.model)
    .map(card=>[card.dataset.id,card]));
  if(cards.size!==52)return;

  const text=(tag,value,cls)=>{
    const element=document.createElement(tag);
    if(value!==null)element.textContent=value;
    if(cls)element.className=cls;
    return element;
  };
  // Permit only the exact source image from this model and local, generated
  // responsive derivatives. Never copy arbitrary image URLs out of the DOM.
  const localAsset=(raw,id)=>{
    try{
      const url=new URL(raw,location.href);
      if(url.origin!==location.origin||url.hash||url.username||url.password)return false;
      // The build appends a SHA-256 cache key to approved responsive WebPs.
      // Keep only that exact syntax; arbitrary URLs and query strings remain blocked.
      if(url.search&&!/^\?v=[a-f0-9]{12}$/.test(url.search))return false;
      return url.pathname==='/assets/watches/'+id+'.webp'
        ||url.pathname==='/assets/watches-popular/'+id+'.webp'
        ||new RegExp('^/assets/(?:watch-responsive|popular-responsive)/'+id+'-[0-9]+\\.webp$').test(url.pathname);
    }catch{return false;}
  };
  const photoFor=(card,id)=>{
    if(card.dataset.visual!=='photo')return null;
    const source=card.querySelector('.ud-photo img');
    if(!source||!localAsset(source.getAttribute('src'),id))return null;
    const img=document.createElement('img');
    img.src=source.getAttribute('src');
    const originalSet=source.getAttribute('srcset')||'';
    if(originalSet){
      const candidates=originalSet.split(',').map(piece=>piece.trim().split(/\s+/));
      if(candidates.every(parts=>parts.length===2&&/^[1-9][0-9]*w$/.test(parts[1])
        &&localAsset(parts[0],id)))img.srcset=originalSet;
    }
    img.sizes='(max-width: 700px) 140px, 220px';
    img.width=220;
    img.height=160;
    img.loading='lazy';
    img.decoding='async';
    img.alt=''; // Adjacent exact-model text labels the whole linked card.
    return img;
  };

  const actions=text('div',null,'am-unified-recent-compare');
  actions.hidden=true;
  const message=text('p','', 'am-unified-recent-compare-status');
  message.setAttribute('role','status');
  message.setAttribute('aria-live','polite');
  const compareLink=text('a','Comparer les montres','am-unified-recent-compare-link');
  compareLink.hidden=true;
  const reset=text('button','Réinitialiser la sélection','am-unified-recent-reset');
  reset.type='button';
  actions.append(message,compareLink,reset);
  list.after(actions);
  let chosen=[];

  const updateCompare=()=>{
    chosen=chosen.filter(id=>cards.has(id)&&list.querySelector('[data-recent-watch-id="'+id+'"]'));
    for(const button of list.querySelectorAll('button[data-recent-compare-id]')){
      const id=button.dataset.recentCompareId;
      const selected=chosen.includes(id);
      button.setAttribute('aria-pressed',String(selected));
      button.textContent=selected?'Retirer de la comparaison':'Sélectionner pour comparer';
      const card=cards.get(id);
      button.setAttribute('aria-label',button.textContent+' '
        +(card?.dataset.brand||'')+' '+(card?.dataset.model||''));
    }
    actions.hidden=chosen.length===0;
    message.textContent=chosen.length===1?'Une montre choisie. Sélectionnez-en une deuxième.'
      :chosen.length+' montres sélectionnées sur 3 maximum.';
    compareLink.hidden=chosen.length<2;
    if(chosen.length>=2){
      compareLink.href='?compare='+chosen.join(',')+'#comparer';
      compareLink.textContent='Comparer '+chosen.length+' montres';
    }else compareLink.removeAttribute('href');
  };

  const render=()=>{
    const ids=read();
    list.replaceChildren();
    if(!ids){chosen=[];actions.hidden=true;section.hidden=true;return;}
    for(const id of ids){
      const card=cards.get(id);
      if(!card)continue;
      const item=text('article',null,'am-unified-recent-item');
      item.dataset.recentWatchId=id;
      const link=text('a',null,'am-unified-recent-link');
      link.href='./'+id+'.html';
      const media=text('span',null,'am-unified-recent-media');
      const photo=photoFor(card,id);
      if(photo){
        media.append(photo);
        media.append(text('span','Photo du modèle','am-unified-recent-visual-label'));
      }else{
        media.classList.add('am-unified-recent-media-fallback');
        const fallback=text('span',null,'am-unified-recent-fallback');
        fallback.append(text('small','PHOTO NON PUBLIÉE'),
          text('strong',card.dataset.brand),text('span','Voir la fiche de la marque'));
        media.append(fallback);
      }
      const details=text('span',null,'am-unified-recent-info');
      const range=card.querySelector('.ud-tier-pill')?.textContent?.trim()||'Sélection documentée';
      details.append(text('small',range,'am-unified-recent-range'),
        text('strong',card.dataset.brand+' '+card.dataset.model,'am-unified-recent-name'),
        text('span','Voir la fiche et les sources','am-unified-recent-see'));
      link.append(media,details);
      const pick=text('button','Sélectionner pour comparer','am-unified-recent-pick');
      pick.type='button';
      pick.dataset.recentCompareId=id;
      pick.setAttribute('aria-pressed','false');
      item.append(link,pick);
      list.append(item);
    }
    section.hidden=!list.childElementCount;
    updateCompare();
  };
  list.addEventListener('click',event=>{
    const button=event.target.closest('button[data-recent-compare-id]');
    if(!button||!list.contains(button))return;
    const id=button.dataset.recentCompareId;
    if(!cards.has(id)||!list.querySelector('[data-recent-watch-id="'+id+'"]'))return;
    if(chosen.includes(id))chosen=chosen.filter(value=>value!==id);
    else if(chosen.length<3)chosen.push(id);
    else{
      actions.hidden=false;
      message.textContent='Trois montres maximum. Retirez-en une avant d’en ajouter une autre.';
      return;
    }
    updateCompare();
  });
  reset.addEventListener('click',()=>{chosen=[];updateCompare();});
  clear.addEventListener('click',()=>{
    try{localStorage.removeItem(key);}catch{return;}
    chosen=[];
    render();
  });
  window.addEventListener('pageshow',render);
  window.addEventListener('storage',event=>{if(event.key===key)render();});
  render();
})();
