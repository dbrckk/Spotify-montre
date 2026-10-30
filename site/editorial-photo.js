'use strict';
/**
 * Atelier Montres — original photographic editorial experience.
 * References: Tissot's product-gallery clarity; Chrono24's photographic
 * discovery; 60fps.design motion restraint (ideas only, no copied assets).
 * Uses ONLY the existing model-specific WebP assets with owner-declared rights.
 * No generated substitute pretending to be a manufacturer's packshot.
 */
(() => {
  const featured=[
    {id:'citizen-tsuyosa',name:'Tsuyosa',theme:'jade',note:'Un vert de cadran qui ne passe pas inaperçu.',kicker:'01 · SPORT CHIC'},
    {id:'tissot-prx-quartz',name:'PRX Quartz',theme:'blue',note:'Lignes intégrées, allure graphique et mouvement quartz.',kicker:'02 · DESIGN'},
    {id:'orient-bambino',name:'Bambino 38',theme:'ivory',note:'Une vue du fond de boîte laisse découvrir sa mécanique.',kicker:'03 · CLASSIQUE'},
    {id:'casio-mtp-b145',name:'MTP-B145',theme:'steel',note:'Un format compact et une silhouette sans détour.',kicker:'04 · ESSENTIEL'}
  ];
  const editorial=[
    {id:'seiko-5',label:'Mécanique sportive',index:'01',description:'Automatique et cadran lisible : une référence pensée pour le quotidien.'},
    {id:'orient-bambino',label:'La mécanique côté fond',index:'02',description:'Une photographie réelle du dos du boîtier : découvrez le mécanisme visible de cette Bambino.'},
    {id:'tissot-prx-quartz',label:'Design intégré',index:'03',description:'Une silhouette seventies revisitée dans une montre quartz contemporaine.'}
  ];
  const node=(tag,cls,content)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(content!==undefined)e.textContent=content;
    return e;
  };
  const local=p=>{
    const t=p?.photoReview;
    if(!p||!t||t.publicUsageApproved!==true||
      t.localUrl!=='./assets/watches/'+p.id+'.webp')return null;
    // The catalogue is verified separately; do not load arbitrary remote URLs.
    return t.localUrl+(typeof t.localSha256==='string'&&/^[a-f0-9]{64}$/i.test(t.localSha256)
      ?'?v='+t.localSha256.slice(0,12):'');
  };
  const vector=(target,p)=>{
    target.replaceChildren();
    target.classList.remove('am-hero-real');
    target.removeAttribute('aria-busy');
    window.AtelierWatch?.render(target,p);
  };
  const openViewer=(catalogue,id)=>window.AtelierPhoto?.open(catalogue,id);
  function init(catalogue){
    if(!Array.isArray(catalogue)||!catalogue.length)return;
    const byId=new Map(catalogue.map(p=>[p.id,p]));
    const stage=document.getElementById('heroWatch');
    const picker=document.getElementById('heroVariants');
    const number=document.getElementById('heroEditorialIndex');
    const title=document.getElementById('heroEditorialTitle');
    const provenance=document.getElementById('heroEditorialSource');
    const zoom=document.getElementById('heroEditorialZoom');
    const featuredLink=document.getElementById('heroEditorialLink');
    const line=document.getElementById('heroEditorialNote');
    const scene=document.querySelector('.am-hero-art');
    const curated=featured.map(entry=>({...entry,product:byId.get(entry.id)})).filter(x=>x.product);
    let request=0;
    if(stage&&picker&&curated.length){
      const controls=curated.map((item,i)=>{
        const b=node('button','am-hero-option');
        b.type='button';
        b.dataset.watchId=item.id;
        b.setAttribute('aria-label','Afficher la photographie de '+item.product.brand+' '+item.product.model);
        b.setAttribute('aria-pressed','false');
        const pic=node('span','am-hero-option-photo');
        const url=local(item.product);
        if(url){
          const img=node('img');img.src=url;img.alt='';img.width=65;img.height=65;
          img.loading='eager';img.decoding='async';
          img.onerror=()=>{img.remove();pic.append(node('span','am-hero-option-fallback',item.name.slice(0,2).toUpperCase()))};
          pic.append(img);
        } else pic.append(node('span','am-hero-option-fallback',item.name.slice(0,2).toUpperCase()));
        b.append(pic,node('span','am-hero-option-name',item.name));
        b.addEventListener('click',()=>select(i));
        b.addEventListener('keydown',event=>{
          if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
          event.preventDefault();
          const next=event.key==='Home'?0:event.key==='End'?controls.length-1:
            (i+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length;
          controls[next].focus();select(next);
        });
        return b;
      });
      picker.replaceChildren(...controls);
      const select=i=>{
        const entry=curated[i],p=entry.product;
        if(!p)return;
        const token=++request;
        controls.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
        if(number)number.textContent=String(i+1).padStart(2,'0')+' / '+String(curated.length).padStart(2,'0');
        if(title)title.textContent=p.brand.toUpperCase()+' / '+entry.name.toUpperCase();
        if(line)line.textContent=entry.note;
        if(featuredLink){featuredLink.href='./montre.html?id='+encodeURIComponent(p.id);featuredLink.textContent='Explorer '+p.brand+' '+entry.name+' ↗';}
        if(scene)scene.dataset.editorialTone=entry.theme;
        stage.setAttribute('aria-label','Photographie de '+p.brand+' '+p.model);
        const url=local(p);
        const fallback=()=>{
          if(token!==request)return;
          vector(stage,p);
          if(provenance)provenance.textContent='Illustration originale · photographie indisponible';
          if(zoom)zoom.hidden=true;
        };
        if(!url){fallback();return}
        const img=node('img','am-hero-real-photo');
        img.alt=p.brand+' '+p.model+' — photographie de la référence réelle';
        img.decoding='async';img.loading='eager';
        img.referrerPolicy='no-referrer';if(i===0)img.fetchPriority='high';
        img.onload=()=>{
          if(token!==request)return;
          stage.classList.add('am-hero-real');
          stage.removeAttribute('aria-busy');
          stage.replaceChildren(img);
          if(provenance)provenance.textContent='Photographie du modèle exact · '+(p.id==='orient-bambino'?'vue du fond du boîtier':(p.photoReview.provider||p.brand));
          if(zoom){zoom.hidden=false;zoom.setAttribute('aria-label','Agrandir '+p.brand+' '+p.model);zoom.onclick=()=>openViewer(catalogue,p.id);}
        };
        img.onerror=fallback;
        stage.setAttribute('aria-busy','true');
        stage.replaceChildren(node('span','am-hero-loading','Chargement de la photographie…'));
        if(zoom)zoom.hidden=true;
        img.src=url;
      };
      select(0);
    }
    const section=document.getElementById('amEditorialGallery');
    const target=document.getElementById('amEditorialGrid');
    if(!section||!target)return;
    const cards=[];
    for(const item of editorial){
      const p=byId.get(item.id),url=local(p);
      if(!p||!url)continue;
      const card=node('article','am-story-card');
      card.dataset.watchId=p.id;
      const media=node('div','am-story-media');
      const image=node('img','am-story-img');
      image.src=url;image.loading='lazy';image.decoding='async';
      image.width=680;image.height=760;
      image.alt='Photographie de '+p.brand+' '+p.model+' — référence exacte';
      image.onerror=()=>{image.remove();const fallback=node('div','am-story-photo-fallback','Photographie indisponible');media.prepend(fallback);zoom.hidden=true};
      const zoom=node('button','am-story-zoom','Agrandir ↗');
      zoom.type='button';
      zoom.setAttribute('aria-label','Voir la photographie de '+p.brand+' '+p.model+' en grand');
      zoom.addEventListener('click',()=>openViewer(catalogue,p.id));
      media.append(image,zoom);
      const copy=node('div','am-story-copy');
      const top=node('p','am-story-kicker',item.index+' / '+item.label.toUpperCase());
      const name=node('h3','',p.brand+' '+p.model);
      const desc=node('p','am-story-desc',item.description);
      const link=node('a','am-story-link','Découvrir le modèle ↗');
      link.href='./montre.html?id='+encodeURIComponent(p.id);
      const movementLabel={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
      const factual=node('p','am-story-fact',[
        p.specs?.diameter||'Diamètre à vérifier',
        p.specs?.movement||movementLabel[p.movement]||'Mouvement à vérifier'
      ].join(' · '));
      copy.append(top,name,desc,factual,link);
      card.append(media,copy);cards.push(card);
    }
    if(cards.length){
      target.replaceChildren(...cards);
      section.hidden=false;
    }
  }
  window.AtelierEditorial=Object.freeze({init});
})();
