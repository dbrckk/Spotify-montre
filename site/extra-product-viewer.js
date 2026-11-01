'use strict';
/* Progressive enhancement for fact-checked supplemental watch photographs.
 * No remote photos, missing-license placeholders or AI illustrations are
 * passed to the shared image viewer. The page remains usable without JS.
 */
(() => {
  const article=document.querySelector('article.am-extra-product[data-popular-watch-id]');
  if(!article||!window.AtelierPhoto?.open)return;
  const button=article.querySelector('button.am-extra-zoom[data-extra-zoom-id]');
  const image=article.querySelector('img.am-extra-licensed-photo');
  const id=article.dataset.popularWatchId;
  if(!button||!image||typeof id!=='string'||!/^[a-z0-9-]{4,64}$/.test(id)
    ||button.dataset.extraZoomId!==id
    ||image.getAttribute('src')!=='../assets/watches-popular/'+id+'.webp')return;
  const brand=article.dataset.brand,model=article.dataset.model;
  if(!brand||!model||article.querySelector('h1')?.textContent?.trim()!==brand+' '+model)return;
  let official;
  try{
    official=new URL(article.dataset.officialUrl);
    if(official.protocol!=='https:'||official.username||official.password)return;
  }catch{return}
  const watch={id,brand,model,officialUrl:official.href,
    photoReview:{publicUsageApproved:true,localUrl:'./assets/watches-popular/'+id+'.webp'}};
  button.hidden=false;
  button.addEventListener('click',()=>{
    // A source-registered exact-model local picture, never the editorial AI
    // artwork displayed separately on some SKMEI pages.
    window.AtelierPhoto?.open([watch],id,{assetPrefix:'../'});
  });
})();
