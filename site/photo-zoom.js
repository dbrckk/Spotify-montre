'use strict';
/* One locally sourced, keyboard- and touch-accessible photographic viewer. */
(() => {
  if (window.AtelierPhoto) return;
  const el=(tag,cls,label)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(label!==undefined)n.textContent=label;
    return n;
  };
  let items=[],index=0,loaded=false,expanded=false,initialTouch=null;
  const dialog=el('dialog','am-photo-dialog');
  dialog.id='amPhotoDialog';
  dialog.setAttribute('aria-label','Visionneuse de photographies des montres');
  const top=el('div','am-photo-top'),meta=el('div','am-photo-meta');
  const kicker=el('p','am-photo-kicker','LA COLLECTION · PHOTO AUTHENTIQUE');
  const title=el('h2','am-photo-title');
  const close=el('button','am-photo-close','×');
  close.type='button';close.setAttribute('aria-label','Fermer la photo');
  meta.append(kicker,title);top.append(meta,close);
  const canvas=el('div','am-photo-canvas');
  const photo=el('img','am-photo-large');
  photo.alt='';photo.decoding='async';photo.loading='eager';
  const message=el('p','am-photo-status','Chargement de la photographie…');
  message.setAttribute('role','status');
  canvas.append(photo,message);
  const bottom=el('div','am-photo-bottom');
  const prev=el('button','am-photo-prev','← Précédente');
  const next=el('button','am-photo-next','Suivante →');
  const zoom=el('button','am-photo-zoom','Agrandir ×2');
  const position=el('span','am-photo-position');
  const link=el('a','am-photo-official','Fiche fabricant ↗');
  link.target='_blank';link.rel='noopener noreferrer nofollow';
  for(const b of [prev,next,zoom]) b.type='button';
  bottom.append(prev,position,next,zoom,link);
  const note=el('p','am-photo-note','Photographies des références exactes · images et tarifs non contractuels.');
  dialog.append(top,canvas,bottom,note);
  const source=p=>{
    const t=p.photoReview||{};
    if(t.localUrl==='./assets/watches/'+p.id+'.webp')return t.localUrl;
    if(typeof t.url==='string'&&t.url.startsWith('https://'))return t.url;
    return null;
  };
  const render=()=>{
    const p=items[index];
    if(!p)return;
    const url=source(p);
    title.textContent=p.brand+' · '+p.model;
    position.textContent=(index+1)+' / '+items.length;
    prev.disabled=items.length<2;next.disabled=items.length<2;
    expanded=false;canvas.classList.remove('am-photo-expanded');
    zoom.textContent='Agrandir ×2';zoom.disabled=!url;
    photo.hidden=true;loaded=false;message.hidden=false;
    message.textContent=url?'Chargement de la photographie…':'Photographie indisponible. Consultez le fabricant.';
    photo.alt='Photographie authentique de '+p.brand+' '+p.model;
    if(url){photo.onload=()=>{loaded=true;photo.hidden=false;message.hidden=true};
      photo.onerror=()=>{loaded=false;photo.hidden=true;message.hidden=false;message.textContent='Photo indisponible. Voir la fiche fabricant.'};
      photo.src=url;
    }else photo.removeAttribute('src');
    const raw=p.officialUrl;
    try{const u=new URL(raw);link.href=u.protocol==='https:'?u.href:'#'}catch(_){link.href='#'}
  };
  const navigate=delta=>{if(items.length<2)return;index=(index+delta+items.length)%items.length;render()};
  close.addEventListener('click',()=>dialog.close());
  prev.addEventListener('click',()=>navigate(-1));
  next.addEventListener('click',()=>navigate(1));
  zoom.addEventListener('click',()=>{if(!loaded)return;expanded=!expanded;canvas.classList.toggle('am-photo-expanded',expanded);zoom.textContent=expanded?'Réduire ×1':'Agrandir ×2'});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'){event.preventDefault();navigate(-1)}
    if(event.key==='ArrowRight'){event.preventDefault();navigate(1)}
  });
  canvas.addEventListener('touchstart',event=>{if(event.touches.length===1)initialTouch=event.touches[0].clientX},{passive:true});
  canvas.addEventListener('touchend',event=>{
    if(initialTouch===null||expanded||!event.changedTouches.length){initialTouch=null;return}
    const delta=event.changedTouches[0].clientX-initialTouch;initialTouch=null;
    if(Math.abs(delta)>65)navigate(delta>0?-1:1);
  },{passive:true});
  dialog.addEventListener('close',()=>{photo.onload=null;photo.onerror=null;expanded=false;canvas.classList.remove('am-photo-expanded')});
  document.body.append(dialog);
  window.AtelierPhoto={
    open(collection,id){
      if(!Array.isArray(collection)||!collection.length)return;
      items=collection.filter(p=>p&&typeof p.id==='string'&&typeof p.brand==='string'&&typeof p.model==='string');
      if(!items.length)return;
      index=Math.max(0,items.findIndex(p=>p.id===id));
      render();
      if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();
    }
  };
})();
