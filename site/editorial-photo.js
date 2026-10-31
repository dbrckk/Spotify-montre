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
  // Match the catalogue's SHA-versioned, locally generated WebP derivatives.
  // Never request a derivative for an unapproved or too-small original.
  const responsive=(p)=>{
    const t=p?.photoReview,w=t?.localWidth;
    if(t?.publicUsageApproved!==true||t.localUrl!=='./assets/watches/'+p.id+'.webp'||
       !Number.isInteger(w)||w<=480)return '';
    const version=typeof t.localSha256==='string'&&/^[a-f0-9]{64}$/i.test(t.localSha256)
      ?'?v='+t.localSha256.slice(0,12):'';
    const variants=[480,800].filter(size=>size<w).map(size=>
      './assets/watch-responsive/'+p.id+'-'+size+'.webp'+version+' '+size+'w');
    return [...variants,t.localUrl+version+' '+w+'w'].join(', ');
  };
  const applyResponsive=(img,p,sizes)=>{
    const set=responsive(p);
    if(set){img.srcset=set;img.sizes=sizes;}
    if(Number.isInteger(p.photoReview?.localWidth)&&Number.isInteger(p.photoReview?.localHeight)){
      img.width=p.photoReview.localWidth;img.height=p.photoReview.localHeight;
    }
  };
  const tryOriginal=(img,url,onFailure)=>{
    if(img.hasAttribute('srcset')){
      img.removeAttribute('srcset');img.removeAttribute('sizes');
      img.src=url;return;
    }
    onFailure();
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
          // The 200px local WebP is a faithful downscale of the same watch.
          // The original high-resolution photograph is still used in the hero,
          // product page and full-screen photo viewer.
          const thumbnail='./assets/watch-thumbs/'+item.id+'.webp';
          const img=node('img');img.alt='';img.width=65;img.height=65;
          img.loading='eager';img.decoding='async';
          let triedOriginal=false;
          img.onerror=()=>{
            if(!triedOriginal){triedOriginal=true;img.src=url;return;}
            img.remove();
            pic.append(node('span','am-hero-option-fallback',item.name.slice(0,2).toUpperCase()));
          };
          pic.append(img);img.src=thumbnail;
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
        const show=img=>{
          if(token!==request)return;
          if(!img.naturalWidth){fallback();return}
          stage.classList.add('am-hero-real');
          stage.removeAttribute('aria-busy');
          if(stage.firstElementChild!==img)stage.replaceChildren(img);
          if(provenance)provenance.textContent='Photographie du modèle exact · '+(p.id==='orient-bambino'?'vue du fond du boîtier':(p.photoReview.provider||p.brand));
          if(zoom){zoom.hidden=false;zoom.setAttribute('aria-label','Agrandir '+p.brand+' '+p.model);zoom.onclick=()=>openViewer(catalogue,p.id);}
        };
        // Render injects the genuine Citizen photo directly into static HTML,
        // before JavaScript loads. Reuse it without blanking an already-visible
        // LCP image or downloading it a second time.
        const existing=stage.querySelector('img.am-hero-real-photo');
        if(existing&&existing.getAttribute('src')===url){
          existing.onload=()=>show(existing);
          existing.onerror=fallback;
          if(existing.complete)show(existing);
          return;
        }
        const img=node('img','am-hero-real-photo');
        img.alt=p.brand+' '+p.model+' — photographie de la référence réelle';
        img.decoding='async';img.loading='eager';
        img.referrerPolicy='no-referrer';if(i===0)img.fetchPriority='high';
        img.onload=()=>show(img);
        applyResponsive(img,p,'(max-width: 680px) 84vw, (max-width: 940px) 78vw, 520px');
        img.onerror=()=>tryOriginal(img,url,fallback);
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
      applyResponsive(image,p,'(max-width: 680px) 82vw, (max-width: 940px) 46vw, 32vw');
      image.alt='Photographie de '+p.brand+' '+p.model+' — référence exacte';
      image.onerror=()=>tryOriginal(image,url,()=>{
        image.remove();const fallback=node('div','am-story-photo-fallback','Photographie indisponible');
        media.prepend(fallback);zoom.hidden=true;
      });
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
