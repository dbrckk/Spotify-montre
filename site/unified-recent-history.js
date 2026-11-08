'use strict';
/* Private, opt-in-by-navigation recent models across the 52 public SEO pages.
 * Source identity comes from the article, never the URL or an external host.
 * The record contains only model IDs; it stays on the visitor's device.
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
  const render=()=>{
    const ids=read();
    list.replaceChildren();
    if(!ids){section.hidden=true;return;}
    for(const id of ids){
      const card=cards.get(id);
      if(!card)continue;
      const a=document.createElement('a');
      a.href='./'+id+'.html';
      a.className='am-unified-recent-link';
      a.textContent=card.dataset.brand+' '+card.dataset.model;
      a.setAttribute('aria-label','Revoir '+a.textContent);
      list.append(a);
    }
    section.hidden=!list.childElementCount;
  };
  clear.addEventListener('click',()=>{
    try{localStorage.removeItem(key);}catch{return;}
    render();
  });
  window.addEventListener('pageshow',render);
  window.addEventListener('storage',event=>{if(event.key===key)render();});
  render();
})();
