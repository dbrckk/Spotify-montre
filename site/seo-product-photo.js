'use strict';
/* Progressive-enhancement bridge for independently indexable watch pages.
   Without JS the visible link still opens the exact local source photograph. */
(() => {
  const trigger=document.querySelector('a.watch-photo-zoom[data-watch-id]');
  if(!trigger)return;
  const {watchId:id,watchBrand:brand,watchModel:model,watchOfficial:officialUrl}=trigger.dataset;
  const photoPath='../assets/watches/'+id+'.webp';
  const image=trigger.closest('.watch-photo')?.querySelector('img');
  if(!/^[a-z0-9-]{4,64}$/.test(id||'')||
     !brand||!model||brand.length>100||model.length>150||
     image?.getAttribute('src')!==photoPath||trigger.getAttribute('href')!==photoPath)return;
  // The manufacturer page is emitted from the validated product catalogue;
  // reject DOM-manipulated off-domain links before passing one to the viewer.
  const manufacturers=['casio.com','swatch.com','citizenwatch.eu','orientwatch.fr',
    'seikowatches.com','tissotwatches.com','hamiltonwatch.com'];
  try{
    const url=new URL(officialUrl);
    if(url.protocol!=='https:'||!manufacturers.some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))return;
  }catch{return}
  trigger.addEventListener('click',event=>{
    // If the optional lightbox could not load, keep the native image link.
    if(typeof window.AtelierPhoto?.open!=='function')return;
    event.preventDefault();
    window.AtelierPhoto.open([{
      id,brand,model,officialUrl,
      photoReview:{publicUsageApproved:true,localUrl:'./assets/watches/'+id+'.webp'}
    }],id,{assetPrefix:'../'});
  });
})();
