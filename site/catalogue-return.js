'use strict';
/* Return from a genuine catalogue journey to its validated, exact filters.
 * Works with 52-watch catalogue and 37 complementary editorial watches.
 * Never redirects off-site or appends search queries to canonical product URLs.
 * A directly opened SEO product sheet receives no invented back-link. */
(() => {
  const article=document.querySelector(
    'main article.watch-product[data-watch-id], main article.am-extra-product[data-popular-watch-id]');
  const breadcrumb=article?.closest('main')?.querySelector('nav.crumb');
  if(!article||!breadcrumb)return;

  const mainPath='/montres/toutes-les-montres.html';
  const extraPath='/montres/modeles-populaires.html';
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
  const allowedExtra={
    tier:['essential','signature','prestige'],
    style:['sport','steel','dress','retro','compact'],
    movement:['automatic','quartz','solar'],
    photo:['1'],
    asin:['1']
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
    if(!source||![mainPath,extraPath].includes(source.pathname)
      ||source.search.length>850)return null;
    const isExtra=source.pathname===extraPath;
    const whitelist=isExtra?allowedExtra:allowed;
    const clean=new URL(source.pathname,location.origin);
    for(const [name,value] of source.searchParams){
      if(source.searchParams.getAll(name).length!==1)continue;
      if(name==='q'){
        const limit=isExtra?80:100;
        if(value.length>0&&value.length<=limit)clean.searchParams.set(name,value);
      }else if(!isExtra&&name==='brand'){
        if(value.length>0&&value.length<=48&&/^[\p{L}\p{N} &.'-]+$/u.test(value))
          clean.searchParams.set(name,value);
      }else if(!isExtra&&name==='compare'){
        const ids=value.split(',');
        if(ids.length>=2&&ids.length<=3&&new Set(ids).size===ids.length
          &&ids.every(validWatchId))clean.searchParams.set(name,value);
      }else if(Object.hasOwn(whitelist,name)&&whitelist[name].includes(value)){
        clean.searchParams.set(name,value);
      }
    }
    clean.hash=isExtra?'#am-pick-filter-count':'#udCount';
    return clean;
  };
  const from=insideOrigin(document.referrer);
  let back=from?catalogueLocation(from.href):null;
  if(back){
    try{sessionStorage.setItem(key,JSON.stringify({href:back.href,time:Date.now()}));}catch(_){}
  }else if(from&&/^\/montres\/[a-z0-9-]{4,64}\.html$/.test(from.pathname)){
    // Keep one last validated selection while navigating between product
    // sheets. The most recent real catalogue entry wins.
    try{
      const saved=JSON.parse(sessionStorage.getItem(key)||'null');
      if(saved&&Number.isFinite(saved.time)&&Date.now()-saved.time>=0
        &&Date.now()-saved.time<=maxAge&&typeof saved.href==='string')
        back=catalogueLocation(saved.href);
    }catch(_){}
  }
  if(!back)return;

  const extra=back.pathname===extraPath;
  const holder=document.createElement('div');
  holder.className='am-catalogue-return';
  const link=document.createElement('a');
  link.href=back.href;
  link.textContent=back.search?'← Retour à ma sélection'
    :extra?'← Retour aux 37 montres':'← Retour aux 52 montres';
  link.setAttribute('aria-label',back.search
    ?'Revenir à ma sélection filtrée dans le catalogue des '+(extra?'37':'52')+' montres'
    :'Revenir au catalogue des '+(extra?'37':'52')+' montres');
  holder.append(link);
  breadcrumb.after(holder);
})();
