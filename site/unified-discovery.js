'use strict';
/* Progressive enhancement on top of all 52 prerendered, crawlable cards. */
(() => {
  const $=id=>document.getElementById(id);
  const root=$('udGrid'),form=$('udFilters'),status=$('udCount'),empty=$('udEmpty');
  const compareStatus=$('udCompareStatus'),compareClear=$('udCompareClear'),compareTable=$('udCompareTable');
  const decisionForm=$('udDecisionForm'),decisionReset=$('udDecisionReset');
  const decisionEngine=window.AtelierAdvisorEngine;
  const tray=$('udCompareTray'),trayItems=$('udTrayItems'),trayCount=$('udTrayCount'),
    trayOpen=$('udTrayOpen'),trayClear=$('udTrayClear'),catalogue=document.querySelector('.ud-page');
  const viewTools=$('udViewTools'),viewCompact=$('udViewCompact'),viewLarge=$('udViewLarge');
  const favoriteTools=$('udFavoriteTools'),savedToggle=$('udSavedToggle'),
    savedCount=$('udSavedCount'),savedButtonLabel=$('udSavedButtonLabel');
  if(!root||!form||!status||!empty||!compareStatus||!compareClear||!compareTable
    ||!tray||!trayItems||!trayCount||!trayOpen||!trayClear||!catalogue
    ||!viewTools||!viewCompact||!viewLarge||!favoriteTools||!savedToggle||!savedCount||!savedButtonLabel)return;
  const cards=[...root.querySelectorAll('article.ud-card[data-id]')];
  const editorialOrder=new Map(cards.map((card,index)=>[card.dataset.id,index]));
  const node=(tag,text,cls)=>{
    const el=document.createElement(tag);
    if(text!==undefined&&text!==null)el.textContent=String(text);
    if(cls)el.className=cls;
    return el;
  };
  const normalized=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const controls={q:$('udSearch'),brand:$('udBrand'),style:$('udStyle'),
    movement:$('udMovement'),tier:$('udTier'),size:$('udSize'),visual:$('udVisual'),
    merchant:$('udMerchant'),sort:$('udSort')};
  const activeFilters=$('udActiveFilters'),activePills=$('udActiveFilterPills'),
    clearActive=$('udClearActiveFilters');
  const filterNames={q:'Recherche',brand:'Marque',style:'Style',movement:'Mouvement',
    tier:'Gamme',size:'Taille',visual:'Photo',merchant:'Marchand'};
  let watches=new Map(),selected=[],view='grid',currentSort=null,saved=new Set(),savedOnly=false;
  const validId=x=>typeof x==='string'&&/^[a-z0-9-]{4,64}$/.test(x);
  // Shared with the 15-watch comparison gallery: a watch saved on either
  // page must remain saved across the entire 52-watch catalogue.
  const FAVORITES_KEY='atelier-montres-multibrand-favorites-v1';
  const loadSaved=()=>{
    try{
      const values=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
      return Array.isArray(values)?new Set(values.filter(validId).slice(0,100)):new Set();
    }catch(_){return new Set()}
  };
  const matchSize=(p,value)=>{
    if(value==='all')return true;
    const n=p?.diameterMm;
    if(value==='unknown')return n===null;
    if(typeof n!=='number'||!Number.isFinite(n))return false;
    if(value==='compact')return n<=38;
    if(value==='medium')return n>38&&n<=40;
    if(value==='large')return n>40;
    return false;
  };
  const params=new URLSearchParams(location.search);
  const prefKeys=['tier','style','movement','size'];
  const prefParam=key=>'pref'+key[0].toUpperCase()+key.slice(1);
  const prefControls={
    tier:$('udPrefTier'),style:$('udPrefStyle'),
    movement:$('udPrefMovement'),size:$('udPrefSize')
  };
  let decisionPrefs=decisionEngine?.choices(Object.fromEntries(
    prefKeys.map(key=>[key,params.get(prefParam(key))||'all'])))||null;
  if(decisionPrefs)for(const key of prefKeys){
    if(prefControls[key])prefControls[key].value=decisionPrefs[key];
  }
  const resetDecision=()=>{
    if(decisionEngine)decisionPrefs=decisionEngine.choices({});
    for(const key of prefKeys)if(prefControls[key])prefControls[key].value='all';
  };
  saved=loadSaved();
  savedOnly=params.get('saved')==='1';
  for(const [key,control] of Object.entries(controls)){
    const value=params.get(key);
    if(!value)continue;
    if(key==='q')control.value=value.slice(0,100);
    else if([...control.options].some(o=>o.value===value))control.value=value;
  }
  const persist=()=>{
    const query=new URLSearchParams();
    for(const [name,control] of Object.entries(controls)){
      const value=control.value;
      if(value&&(name==='q'||value!=='all')&&(name!=='sort'||value!=='essential'))
        query.set(name,value.slice(0,100));
    }
    if(selected.length)query.set('compare',selected.join(','));
    if(selected.length&&decisionPrefs){
      for(const key of prefKeys)if(decisionPrefs[key]!=='all')
        query.set(prefParam(key),decisionPrefs[key]);
    }
    if(savedOnly)query.set('saved','1');
    if(view==='large')query.set('view','large');
    const next=location.pathname+(query.size?'?'+query.toString():'')+location.hash;
    history.replaceState(null,'',next);
  };
  const reorderCards=mode=>{
    if(currentSort===mode)return;
    const tiers={essential:0,signature:1,prestige:2};
    // A verified deep link should always rank ahead of a generic search.
    const merchants={direct:0,awin:1,search:2,official:3};
    const rank=(p)=>merchants[p.merchantKind||'official'];
    const ordered=[...cards].sort((a,b)=>{
      const left=watches.get(a.dataset.id),right=watches.get(b.dataset.id);
      const original=editorialOrder.get(left.id)-editorialOrder.get(right.id);
      if(mode==='essential')return tiers[left.tier]-tiers[right.tier]
        ||Number(Boolean(right.photoUrl))-Number(Boolean(left.photoUrl))
        ||rank(left)-rank(right)||original;
      if(mode==='direct')return rank(left)-rank(right)
        ||tiers[left.tier]-tiers[right.tier]||original;
      if(mode==='photo')return Number(Boolean(right.photoUrl))-Number(Boolean(left.photoUrl))
        ||tiers[left.tier]-tiers[right.tier]||original;
      if(mode==='alpha')return (left.brand+' '+left.model).localeCompare(right.brand+' '+right.model,'fr')||original;
      return original;
    });
    root.replaceChildren(...ordered);
    currentSort=mode;
  };
  // The visible query must find exact references typed without punctuation,
  // e.g. "MDV107", "PD1701" or "skmei1251", as well as normal French text.
  const matchesText=(p,terms)=>{
    if(!terms.length)return true;
    const source=normalized([p.brand,p.model,p.id,p.description,p.lead,
      p.caseText,p.glass,p.water].filter(Boolean).join(' '));
    const compactModel=normalized([p.brand,p.model].join(' ')).replace(/\s+/g,'');
    const compactReference=normalized([p.model,p.id].join(' ')).replace(/\s+/g,'');
    return terms.every(term=>source.includes(term)
      ||compactModel.includes(term)||compactReference.includes(term));
  };
  let activeFilterSignature='';
  const updateActiveFilters=()=>{
    if(!activeFilters||!activePills||!clearActive)return;
    const items=Object.entries(filterNames).flatMap(([key,label])=>{
      const control=controls[key],value=control.value.trim();
      if(!value||value==='all')return [];
      const selected=control.tagName==='SELECT'
        ?control.selectedOptions[0]?.textContent||value:value;
      return [{key,label,value:selected}];
    });
    if(savedOnly)items.push({key:'saved',label:'Favoris',value:'uniquement'});
    activeFilters.hidden=items.length===0;
    // Keep a pressed pill attached through blur/change. Replacing it during
    // the pointer sequence can swallow the click on Android/mobile browsers.
    const signature=JSON.stringify(items);
    if(signature===activeFilterSignature)return;
    activeFilterSignature=signature;
    const chips=items.map(({key,label,value})=>{
      const chip=node('button',label+' : '+value+' ×','ud-filter-chip');
      chip.type='button';
      chip.dataset.removeFilter=key;
      chip.setAttribute('aria-label','Retirer le filtre '+label+' : '+value);
      return chip;
    });
    activePills.replaceChildren(...chips);
  };
  activePills?.addEventListener('click',event=>{
    const chip=event.target.closest('button[data-remove-filter]');
    if(!chip)return;
    const key=chip.dataset.removeFilter;
    if(key==='saved')savedOnly=false;
    else if(Object.hasOwn(filterNames,key))
      controls[key].value=key==='q'?'':'all';
    render();
    // Removing the pressed chip must not strand keyboard focus on <body>.
    (key==='saved'?savedToggle:controls[key])?.focus({preventScroll:true});
  });
  clearActive?.addEventListener('click',()=>{
    for(const key of Object.keys(filterNames))
      controls[key].value=key==='q'?'':'all';
    savedOnly=false;
    render();
    controls.q.focus({preventScroll:true});
  });
  const updateSavedUI=()=>{
    const count=cards.filter(card=>saved.has(card.dataset.id)).length;
    savedCount.textContent=String(count);
    savedToggle.setAttribute('aria-pressed',String(savedOnly));
    savedButtonLabel.textContent=savedOnly?'Voir toutes les montres':'Voir mes favoris';
    for(const card of cards){
      const button=card.querySelector('button.ud-save');
      if(!button)continue;
      const active=saved.has(card.dataset.id);
      const p=watches.get(card.dataset.id);
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label','Favoris : '+(active?'retirer ':'ajouter ')+(p?.brand||'')+' '+(p?.model||''));
      const heart=button.querySelector('.ud-save-heart');
      const word=button.querySelector('.ud-save-word');
      if(heart)heart.textContent=active?'♥':'♡';
      if(word)word.textContent='Favoris';
    }
  };
  const render=()=>{
    const q=normalized(controls.q.value),brand=controls.brand.value,
      style=controls.style.value,movement=controls.movement.value,
      tier=controls.tier.value,size=controls.size.value,visual=controls.visual.value,
      merchant=controls.merchant.value;
    const tokens=q.split(' ').filter(Boolean);
    let visible=0;
    for(const card of cards){
      const p=watches.get(card.dataset.id);
      const ok=Boolean(p)
        &&(!savedOnly||saved.has(p.id))
        &&(brand==='all'||p.brand===brand)
        &&(style==='all'||p.style===style)
        &&(movement==='all'||p.movement===movement)
        &&(tier==='all'||p.tier===tier)
        &&matchSize(p,size)
        &&(merchant==='all'||(p.merchantKind||'official')===merchant)
        &&(visual==='all'||(visual==='photo'&&Boolean(p.photoUrl))
          ||(visual==='no-photo'&&!p.photoUrl))
        &&matchesText(p,tokens);
      card.hidden=!ok;
      if(ok)visible++;
    }
    reorderCards(controls.sort.value);
    status.textContent=visible+' modèle'+(visible===1?'':'s')+' sur '+cards.length
      +(savedOnly?' · Mes favoris':'');
    empty.textContent=savedOnly?'Aucun favori ne correspond à ces critères. Enregistrez des montres avec le cœur, ou affichez tout le catalogue.'
      :'Aucun résultat. Essayez une autre marque, un style différent ou effacez les filtres.';
    empty.hidden=visible!==0;
    updateSavedUI();
    updateActiveFilters();
    persist();
  };
  // Narrow Android screens benefit from photographs large enough to inspect
  // without opening every detail sheet. Respect a user-controlled preference;
  // a URL view parameter can override it for a shared catalogue link.
  const VIEW_KEY='atelier-montres-catalogue-view-v1';
  const storedView=()=>{
    try{
      const value=localStorage.getItem(VIEW_KEY);
      return value==='grid'||value==='large'?value:null;
    }catch(_){return null}
  };
  const changeView=(mode,remember=false)=>{
    view=mode==='large'?'large':'grid';
    root.classList.toggle('ud-view-large',view==='large');
    viewCompact.setAttribute('aria-pressed',String(view==='grid'));
    viewLarge.setAttribute('aria-pressed',String(view==='large'));
    if(remember){
      try{localStorage.setItem(VIEW_KEY,view)}catch(_){}
    }
    persist();
  };
  viewCompact.addEventListener('click',()=>changeView('grid',true));
  viewLarge.addEventListener('click',()=>changeView('large',true));
  savedToggle.addEventListener('click',()=>{
    savedOnly=!savedOnly;
    render();
  });
  const link=(label,url)=>{
    const a=node('a',label);a.href=url;return a;
  };
  const updateTray=()=>{
    // No-JS browsing remains untouched: the dock is revealed only after the
    // verified 52-watch JSON has been loaded and a real ID is selected.
    tray.hidden=selected.length===0;
    catalogue.classList.toggle('ud-has-tray',selected.length>0);
    trayCount.textContent=selected.length===1
      ?'1 sur 3 · ajoutez une deuxième montre'
      :selected.length+' sur 3 modèles sélectionnés';
    trayOpen.hidden=selected.length<2;
    trayOpen.textContent=selected.length>=2
      ?'Comparer '+selected.length+' montres':'Voir la comparaison';
    const nodes=selected.map(id=>{
      const p=watches.get(id),li=node('li',null,'ud-tray-item');
      if(!p)return li;
      li.append(node('span',p.brand+' '+p.model,'ud-tray-name'));
      const remove=node('button','×','ud-tray-remove');
      remove.type='button';remove.dataset.trayRemove=id;
      remove.setAttribute('aria-label','Retirer '+p.brand+' '+p.model+' de la comparaison');
      li.append(remove);return li;
    });
    trayItems.replaceChildren(...nodes);
  };
  const renderCompare=()=>{
    updateTray();
    compareStatus.textContent=selected.length===0?'Sélectionnez au moins deux modèles.'
      :selected.length===1?'Une montre choisie ; ajoutez-en une deuxième.'
      :selected.length+' montres choisies. Les informations inconnues sont affichées comme « Non documenté ».';
    compareClear.hidden=selected.length===0;
    for(const card of cards){
      const button=card.querySelector('button.ud-select');
      if(!button)continue;
      const active=selected.includes(card.dataset.id);
      button.setAttribute('aria-pressed',String(active));
      button.textContent=active?'Retirer de la comparaison':'Ajouter à la comparaison';
    }
    if(selected.length<2){
      if(decisionForm)decisionForm.hidden=true;
      compareTable.replaceChildren();compareTable.hidden=true;persist();return;
    }
    if(decisionForm&&decisionEngine)decisionForm.hidden=false;
    const decisionEntries=decisionEngine&&decisionPrefs
      ?decisionEngine.recommend(selected.map(id=>watches.get(id)),decisionPrefs,3):[];
    const scored=new Map(decisionEntries.map(entry=>[entry.product.id,entry]));
    const activeCriteria=decisionEntries[0]?.criteria||0;
    const rows=[
      ['Mouvement',p=>({quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'})[p.movement]],
      ['Boîtier',p=>p.caseText],
      ['Diamètre du boîtier rond',p=>p.diameterMm===null?'Non documenté':p.diameterMm+' mm'],
      ['Verre',p=>p.glass],
      ['Étanchéité',p=>p.water],
      ['Style',p=>({sport:'Sport',classic:'Élégant',minimal:'Minimaliste',retro:'Rétro',statement:'Audacieux'})[p.style]]
    ];
    const table=node('table',null,'ud-matrix'),caption=node('caption','Comparaison de '+selected.length+' références documentées');
    const thead=node('thead'),heading=node('tr'),title=node('th','Critère');
    title.scope='col';heading.append(title);
    for(const id of selected){
      const p=watches.get(id),th=node('th');th.scope='col';
      // Only show an exact-model photograph already approved and stored
      // locally. Never silently substitute a different watch or remote image.
      const expected='./assets/'+(p.kind==='core'?'watches':'watches-popular')+'/'+p.id+'.webp';
      if(p.photoUrl===expected){
        const visual=node('div',null,'ud-matrix-photo');
        const img=node('img');
        img.src='../assets/'+(p.kind==='core'?'watches':'watches-popular')+'/'+p.id+'.webp';
        img.alt='Photographie du modèle '+p.brand+' '+p.model;
        img.loading='lazy';img.decoding='async';img.width=180;img.height=180;
        img.onerror=()=>visual.remove();
        visual.append(img);th.append(visual);
      }
      th.append(link(p.brand+' '+p.model,'./'+id+'.html'));
      const evaluation=scored.get(id);
      if(activeCriteria&&evaluation){
        const note=node('span',evaluation.matched+' / '+evaluation.criteria+
          ' critères concordants','ud-decision-score');
        note.dataset.match=evaluation.matched===evaluation.criteria?'exact'
          :evaluation.matched?'partial':'none';
        note.title=[...evaluation.details,evaluation.sizeNote].filter(Boolean).join(' · ')
          ||'Aucun critère vérifié parmi vos préférences';
        th.append(note);
        if(evaluation.details.length)
          th.append(node('small',evaluation.details.join(' · '),'ud-decision-reasons'));
        if(evaluation.sizeNote)
          th.append(node('small',evaluation.sizeNote,'ud-decision-warning'));
      }
      const remove=node('button','Retirer','ud-compare-remove');
      remove.type='button';remove.setAttribute('aria-label','Retirer '+p.brand+' '+p.model);
      remove.addEventListener('click',()=>{selected=selected.filter(x=>x!==id);renderCompare()});
      th.append(remove);heading.append(th);
    }
    thead.append(heading);
    const tbody=node('tbody');
    let differingCount=0;
    for(const [label,resolve] of rows){
      const values=selected.map(id=>resolve(watches.get(id))||'Non documenté');
      // Never treat unavailable measurements as an actual difference.
      const verified=values.filter(value=>value!=='Non documenté');
      const differing=new Set(verified).size>1;
      if(differing)differingCount++;
      const tr=node('tr'),th=node('th',label);th.scope='row';
      if(differing)tr.classList.add('ud-matrix-diff');
      tr.append(th);
      for(const value of values)tr.append(node('td',value));
      tbody.append(tr);
    }
    const hint=node('p',
      differingCount
        ?differingCount+' caractéristique'+(differingCount>1?'s':'')+
          ' différenciant vos montres. Les valeurs inconnues ne sont jamais considérées comme une différence.'
        :'Aucune différence documentée entre ces modèles sur les critères présentés.',
      'ud-matrix-hint');
    hint.id='udCompareHint';
    table.append(caption,thead,tbody);
    const summaries=[hint];
    if(activeCriteria){
      const exact=decisionEntries.filter(e=>e.matched===e.criteria).length;
      const count=selected.length;
      const text=exact===0
        ?'Aucune des '+count+' montres ne répond à toutes vos '+activeCriteria+
          ' préférences. Les modèles restent des alternatives, et les données inconnues ne sont pas des correspondances.'
        :exact+' montre'+(exact>1?'s':'')+' sur '+count+
          ' répond'+(exact>1?'ent':'')+' à toutes vos '+activeCriteria+
          ' préférences documentées.';
      const result=node('p',text,'ud-decision-result');
      result.id='udDecisionResult';
      result.dataset.status=exact?'matched':'none';
      result.setAttribute('aria-live','polite');
      summaries.unshift(result);
    }
    compareTable.replaceChildren(...summaries,table);compareTable.hidden=false;
    persist();
  };
  decisionForm?.addEventListener('submit',event=>event.preventDefault());
  decisionForm?.addEventListener('change',()=>{
    if(!decisionEngine)return;
    decisionPrefs=decisionEngine.choices(Object.fromEntries(
      prefKeys.map(key=>[key,prefControls[key]?.value||'all'])));
    renderCompare();
  });
  decisionReset?.addEventListener('click',()=>{resetDecision();renderCompare()});
  root.addEventListener('click',event=>{
    const zoom=event.target.closest('button.ud-zoom[data-zoom-id]');
    if(zoom){
      const id=zoom.dataset.zoomId,p=watches.get(id);
      if(!p?.photoUrl||!window.AtelierPhoto?.open)return;
      const photos=[...watches.values()].filter(q=>q.photoUrl
        &&q.photoUrl==='./assets/'+(q.kind==='core'?'watches':'watches-popular')+'/'+q.id+'.webp')
        .map(q=>({id:q.id,brand:q.brand,model:q.model,officialUrl:q.officialUrl,
          photoReview:{publicUsageApproved:true,localUrl:q.photoUrl}}));
      window.AtelierPhoto.open(photos,id,{assetPrefix:'../'});
      return;
    }
    const favourite=event.target.closest('button.ud-save[data-save-id]');
    if(favourite){
      const id=favourite.dataset.saveId;
      if(!watches.has(id))return;
      if(saved.has(id))saved.delete(id);else saved.add(id);
      try{localStorage.setItem(FAVORITES_KEY,JSON.stringify([...saved]))}catch(_){}
      render();
      return;
    }
    const btn=event.target.closest('button.ud-select[data-compare-id]');
    if(!btn)return;
    const id=btn.dataset.compareId;
    if(!watches.has(id))return;
    if(selected.includes(id))selected=selected.filter(x=>x!==id);
    else if(selected.length>=3){compareStatus.textContent='Trois modèles maximum. Retirez-en un avant d’en ajouter un quatrième.';return}
    else selected.push(id);
    renderCompare();
  });
  compareClear.addEventListener('click',()=>{selected=[];resetDecision();renderCompare()});
  trayClear.addEventListener('click',()=>{selected=[];resetDecision();renderCompare()});
  trayItems.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-tray-remove]');
    if(!btn||!selected.includes(btn.dataset.trayRemove))return;
    selected=selected.filter(id=>id!==btn.dataset.trayRemove);
    renderCompare();
  });
  trayOpen.addEventListener('click',()=>{
    if(selected.length<2)return;
    // The native anchor scrolls to the real comparison. Focusing its scroll
    // region makes keyboard and screen-reader navigation immediately useful.
    compareTable.focus({preventScroll:true});
  });
  form.addEventListener('input',render);
  form.addEventListener('change',render);
  form.addEventListener('reset',()=>{requestAnimationFrame(()=>{savedOnly=false;render()})});
  // Returning from a 15-watch detail page through the Android back button
  // can restore the page from bfcache; refresh favourites without reloading.
  window.addEventListener('pageshow',()=>{
    saved=loadSaved();
    if(watches.size)render();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==FAVORITES_KEY)return;
    saved=loadSaved();
    if(watches.size)render();
  });
  fetch('../discovery-catalogue.json',{cache:'no-store'}).then(r=>{
    if(!r.ok)throw Error('Catalogue indisponible');return r.json();
  }).then(data=>{
    if(data?.version!==1||data.total!==52||!Array.isArray(data.products)||data.products.length!==52)
      throw Error('Catalogue incomplet');
    watches=new Map(data.products.filter(p=>validId(p.id)).map(p=>[p.id,p]));
    if(watches.size!==52||cards.length!==52||cards.some(c=>!watches.has(c.dataset.id)))
      throw Error('Les fiches visibles ne correspondent pas aux références documentées');
    form.hidden=false;
    viewTools.hidden=false;
    favoriteTools.hidden=false;
    for(const card of cards){
      card.querySelector('button.ud-save')?.removeAttribute('hidden');
      card.querySelector('button.ud-select')?.removeAttribute('hidden');
      if(window.AtelierPhoto?.open)
        card.querySelector('button.ud-zoom')?.removeAttribute('hidden');
    }
    const requestedView=params.get('view');
    const selectedView=requestedView==='grid'||requestedView==='large'
      ?requestedView
      :storedView()||(window.matchMedia('(max-width: 420px)').matches?'large':'grid');
    changeView(selectedView);
    const initial=params.get('compare')?.split(',').filter(validId)||[];
    selected=[...new Set(initial)].filter(x=>watches.has(x)).slice(0,3);
    render();renderCompare();
    if(selected.length>=2&&location.hash==='#comparer')$('comparer')?.scrollIntoView();
  }).catch(()=>{
    // Progressive enhancement: all 52 static cards remain available. Never
    // display a broken filter or non-functioning compare button.
    root.querySelectorAll('.ud-card').forEach(c=>{c.hidden=false});
    status.textContent='52 modèles à consulter · filtres momentanément indisponibles';
  });
})();
