'use strict';
/* Independent supplementary product pages use the same local-only
   favourites as the 15-watch gallery and the unified 52-watch catalogue.
   Never modifies merchant links, prices or checkout state. */
(() => {
  const article=document.querySelector('article.am-extra-product[data-popular-watch-id]');
  if(!article)return;
  const id=article.dataset.popularWatchId;
  const brand=article.dataset.brand,model=article.dataset.model;
  const tools=article.querySelector('.am-extra-local-tools');
  const favorite=tools?.querySelector('[data-extra-favorite]');
  const share=tools?.querySelector('[data-extra-share]');
  const status=tools?.querySelector('[data-extra-action-status]');
  const savedLink=tools?.querySelector('.am-extra-saved-link');
  if(!tools||!favorite||!share||!status||
    typeof id!=='string'||!/^[a-z0-9-]{4,64}$/.test(id)||
    favorite.dataset.extraFavorite!==id||share.dataset.extraShare!==id||
    !brand||!model||article.querySelector('h1')?.textContent?.trim()!==brand+' '+model||
    !location.pathname.endsWith('/'+id+'.html'))return;

  const key='atelier-montres-multibrand-favorites-v1';
  const validId=value=>typeof value==='string'&&/^[a-z0-9-]{4,64}$/.test(value);
  const read=()=>{
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(parsed)
        ?[...new Set(parsed.filter(validId))].slice(0,100):[];
    }catch{return null}
  };
  const announce=text=>{status.textContent=text;};
  const sync=()=>{
    const ids=read();
    if(!ids){favorite.hidden=true;return}
    favorite.hidden=false;
    const saved=ids.includes(id);
    favorite.setAttribute('aria-pressed',String(saved));
    favorite.textContent=saved?'♥ Enregistrée dans mes favoris':'♡ Ajouter aux favoris';
    // Keep the accessible name identical to the visible button label.
    // Screen readers encounter the exact model in the adjacent H1.
    favorite.removeAttribute('aria-label');
  };
  if(read()!==null){
    if(savedLink)savedLink.hidden=false;
    favorite.addEventListener('click',()=>{
      const ids=read();
      if(!ids){favorite.hidden=true;announce('Favoris indisponibles sur cet appareil.');return}
      const saved=ids.includes(id);
      if(!saved&&ids.length>=100){
        announce('La limite de 100 montres enregistrées est atteinte.');
        return;
      }
      const next=saved?ids.filter(value=>value!==id):[...ids,id];
      try{
        localStorage.setItem(key,JSON.stringify(next));
      }catch{
        announce('Impossible d’enregistrer ce favori sur cet appareil.');
        return;
      }
      sync();
      announce(saved?'Montre retirée des favoris.':'Montre enregistrée. Retrouvez-la dans le catalogue.');
    });
    sync();
  }
  window.addEventListener('pageshow',sync);
  window.addEventListener('storage',event=>{
    if(event.key===key)sync();
  });

  const canonical=new URL('./'+id+'.html',location.href).href;
  tools.hidden=false;
  share.hidden=false;
  share.addEventListener('click',async()=>{
    const title=brand+' '+model+' — Atelier Montres';
    const promptCopy=()=>{
      let field=tools.querySelector('[data-extra-copy-link]');
      if(!field){
        field=document.createElement('input');
        field.type='url';
        field.readOnly=true;
        field.className='am-extra-copy-link';
        field.setAttribute('aria-label','Lien de cette montre à copier');
        field.dataset.extraCopyLink='';
        tools.append(field);
      }
      field.value=canonical;
      field.hidden=false;
      field.focus();
      field.select();
      announce('Sélectionnez et copiez ce lien pour partager la montre.');
    };
    if(typeof navigator.share==='function'){
      try{
        await navigator.share({title,url:canonical});
        announce('Fiche partagée.');
        return;
      }catch(error){
        if(error?.name==='AbortError')return;
      }
    }
    try{
      if(typeof navigator.clipboard?.writeText!=='function')throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(canonical);
      announce('Lien de cette montre copié.');
    }catch{promptCopy()}
  });
})();
