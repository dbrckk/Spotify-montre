'use strict';
/* Restore an actual local catalogue selection on all 52 SEO product sheets.
 * The destination is ALWAYS the internal 52-watch catalogue: no open redirects,
 * off-site tracking, invented offers, or dependency on a user account.
 * Directly opened product URLs retain their clean, indexable presentation. */
(() => {
  const article=document.querySelector(
    'main article.watch-product[data-watch-id], main article.am-extra-product[data-popular-watch-id]');
  const breadcrumb=article?.closest('main')?.querySelector('nav.crumb');
  if(!article||!breadcrumb)return;

  const catalogPath='/montres/toutes-les-montres.html';
  const key='atelier-montres-catalogue-return-v1';
  const maxAge=30*60*1000;
  const allowed={
    tier:['essential','signature','prestige'],
    style:['sport','classic','minimal','retro','statement'],
    movement:['quartz','automatic','eco-drive'],
    size:['compact','medium','large','unknown'],
    visual:['photo','no-photo'],
    merchant:['direct','awin','search','official'],
    sort:['essential','direct','photo','alpha','editorial'],
    view:['grid','large'],
    saved:['1'],
    prefTier:['essential','signature','prestige'],
    prefStyle:['sport','classic','minimal','retro','statement'],
    prefMovement:['quartz','automatic','eco-drive'],
    prefSize:['compact','medium','large','unknown']
  };
  const validWatchId=id=>/^[a-z0-9-]{4,64}$/.test(id);
  const insideOrigin=input=>{
    try{
      const url=new URL(input);
      return url.origin===location.origin&&url.protocol===location.protocol?url:null;
    }catch{return null}
  };
  const catalogueLocation=input=>{
    const source=insideOrigin(input);
    if(!source||source.pathname!==catalogPath||source.search.length>850)return null;
    const clean=new URL(catalogPath,location.origin);
    for(const [name,value] of source.searchParams){
      if(source.searchParams.getAll(name).length!==1)continue;
      if(name==='q'){
        if(value.length>0&&value.length<=100)clean.searchParams.set(name,value);
      }else if(name==='brand'){
        if(value.length>0&&value.length<=48&&/^[\p{L}\p{N} &.'-]+$/u.test(value))
          clean.searchParams.set(name,value);
      }else if(name==='compare'){
        const ids=value.split(',');
        if(ids.length<=3&&new Set(ids).size===ids.length&&ids.every(validWatchId))
          clean.searchParams.set(name,value);
      }else if(Object.hasOwn(allowed,name)&&allowed[name].includes(value)){
        clean.searchParams.set(name,value);
      }
    }
    clean.hash='#udCount';
    return clean;
  };
  const from=insideOrigin(document.referrer);
  let back=from?.pathname===catalogPath?catalogueLocation(from.href):null;
  if(back){
    try{sessionStorage.setItem(key,JSON.stringify({href:back.href,time:Date.now()}));}catch(_){}
  }else if(from&&/^\/montres\/[a-z0-9-]{4,64}\.html$/.test(from.pathname)){
    // The visitor may inspect related watch sheets while retaining their
    // original local filters. A direct entry without catalogue context never
    // creates this link.
    try{
      const saved=JSON.parse(sessionStorage.getItem(key)||'null');
      if(saved&&Number.isFinite(saved.time)&&Date.now()-saved.time>=0
        &&Date.now()-saved.time<=maxAge&&typeof saved.href==='string')
        back=catalogueLocation(saved.href);
    }catch(_){}
  }
  if(!back)return;

  const holder=document.createElement('div');
  holder.className='am-catalogue-return';
  const link=document.createElement('a');
  link.href=back.href;
  link.textContent=back.search?'← Retour à ma sélection':'← Retour aux 52 montres';
  link.setAttribute('aria-label',back.search
    ?'Revenir à ma sélection filtrée dans le catalogue des 52 montres'
    :'Revenir au catalogue des 52 montres');
  holder.append(link);
  breadcrumb.after(holder);
})();
