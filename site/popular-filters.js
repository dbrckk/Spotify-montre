/* Atelier Montres — URL-shareable, source-backed watch filters.
 * All 37 static cards remain crawlable and visible without JavaScript.
 * Search text is never sent to a server by this script; copying/sharing an
 * explicit URL is a visitor action, not a background analytics event. */
(() => {
  'use strict';
  const form=document.getElementById('am-pick-filters');
  const grid=document.getElementById('am-picks-list');
  if(!form||!grid)return;
  const cards=[...grid.querySelectorAll('.am-pick-card[data-pick-id]')];
  const sections=[...grid.querySelectorAll('.am-picks-tier')];
  const count=document.getElementById('am-pick-filter-count');
  const empty=document.getElementById('am-pick-filter-empty');
  const query=form.elements.namedItem('recherche');
  const style=form.elements.namedItem('style');
  const movement=form.elements.namedItem('mouvement');
  const tier=form.elements.namedItem('gamme');
  const photoOnly=form.elements.namedItem('photo-publiee');
  const matchOnly=form.elements.namedItem('asin-documente');
  const share=document.getElementById('am-pick-share');
  const shareStatus=document.getElementById('am-pick-share-status');
  const manual=document.getElementById('am-pick-share-manual');
  const active=document.getElementById('am-pick-active');
  const activeChips=document.getElementById('am-pick-active-chips');
  const clearActive=document.getElementById('am-pick-active-clear');
  if(!cards.length||!sections.length||!count||!empty||!query||!style||
    !movement||!tier||!photoOnly||!matchOnly||!share||!shareStatus||!manual
    ||!active||!activeChips||!clearActive)return;

  const allowed={
    tier:new Set(['essential','signature','prestige']),
    style:new Set(['sport','steel','dress','retro','compact']),
    movement:new Set(['automatic','quartz','solar'])
  };
  const normalize=value=>String(value||'').toLocaleLowerCase('fr-FR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const haystack=new Map(cards.map(card=>[card,normalize(card.dataset.pickSearch||card.textContent)]));
  const initial=location.search.length<=850?new URLSearchParams(location.search):new URLSearchParams();
  const unique=name=>initial.getAll(name).length===1?initial.get(name):null;
  const savedQuery=unique('q');
  if(savedQuery&&savedQuery.length<=80)query.value=savedQuery;
  for(const [name,control] of [['tier',tier],['style',style],['movement',movement]]){
    const value=unique(name);
    if(value&&allowed[name].has(value))control.value=value;
  }
  photoOnly.checked=unique('photo')==='1';
  matchOnly.checked=unique('asin')==='1';

  const chipControls={
    q:{label:'Recherche',control:query},
    tier:{label:'Gamme',control:tier},
    style:{label:'Style',control:style},
    movement:{label:'Mouvement',control:movement},
    photo:{label:'Photo réelle',control:photoOnly},
    asin:{label:'Référence Amazon',control:matchOnly}
  };
  let previousChips='';
  const updateChips=()=>{
    const selected=Object.entries(chipControls).flatMap(([key,{label,control}])=>{
      const value=key==='photo'||key==='asin'
        ?(control.checked?'Oui':''):control.value.trim();
      if(!value)return [];
      const display=control.tagName==='SELECT'
        ?control.selectedOptions[0]?.textContent||value:value;
      return [{key,label,display}];
    });
    active.hidden=selected.length===0;
    const signature=JSON.stringify(selected);
    // Keep a pressed chip alive through the blur/change/click sequence.
    if(signature===previousChips)return;
    previousChips=signature;
    const buttons=selected.map(({key,label,display})=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='am-pick-chip';
      button.dataset.removeFilter=key;
      button.textContent=label+' : '+display+' ×';
      button.setAttribute('aria-label','Retirer le filtre '+label+' : '+display);
      return button;
    });
    activeChips.replaceChildren(...buttons);
  };
  const selectionUrl=()=>{
    const url=new URL(location.pathname,location.origin);
    const search=query.value.trim();
    if(search)url.searchParams.set('q',search.slice(0,80));
    if(tier.value&&allowed.tier.has(tier.value))url.searchParams.set('tier',tier.value);
    if(style.value&&allowed.style.has(style.value))url.searchParams.set('style',style.value);
    if(movement.value&&allowed.movement.has(movement.value))url.searchParams.set('movement',movement.value);
    if(photoOnly.checked)url.searchParams.set('photo','1');
    if(matchOnly.checked)url.searchParams.set('asin','1');
    return url;
  };
  const apply=(updateUrl=true)=>{
    const tokens=normalize(query.value).split(/\s+/).filter(Boolean);
    let shown=0;
    for(const card of cards){
      const matches=(!style.value||card.dataset.pickStyle===style.value)
        &&(!movement.value||card.dataset.pickMovement===movement.value)
        &&(!tier.value||card.dataset.pickTier===tier.value)
        &&(!photoOnly.checked||card.dataset.pickPhoto==='yes')
        &&(!matchOnly.checked||card.dataset.pickMatch==='yes')
        &&tokens.every(token=>haystack.get(card).includes(token));
      card.hidden=!matches;
      if(matches)shown++;
    }
    for(const section of sections){
      section.hidden=![...section.querySelectorAll('.am-pick-card')].some(card=>!card.hidden);
    }
    count.textContent=shown+' modèle'+(shown>1?'s':'')+' sur '+cards.length;
    empty.hidden=shown!==0;
    updateChips();
    if(updateUrl){
      const url=selectionUrl();
      history.replaceState(null,'',url.pathname+url.search+location.hash);
      shareStatus.textContent='';
      manual.hidden=true;
    }
  };

  activeChips.addEventListener('click',event=>{
    const button=event.target.closest('button[data-remove-filter]');
    if(!button||!Object.hasOwn(chipControls,button.dataset.removeFilter))return;
    const {control}=chipControls[button.dataset.removeFilter];
    if(control.type==='checkbox')control.checked=false;
    else control.value='';
    apply();
    control.focus({preventScroll:true});
  });
  clearActive.addEventListener('click',()=>{
    form.reset();
    query.focus({preventScroll:true});
  });
  form.hidden=false;
  share.hidden=false;
  form.addEventListener('input',()=>apply());
  form.addEventListener('change',()=>apply());
  form.addEventListener('reset',event=>{
    // Reset is explicit: do not depend on browser reset event ordering.
    event.preventDefault();
    query.value='';
    style.value='';
    movement.value='';
    tier.value='';
    photoOnly.checked=false;
    matchOnly.checked=false;
    apply();
  });
  // Existing tier shortcuts should reveal every section before navigating.
  document.querySelectorAll('.am-picks-tier-nav a[href^="#gamme-"]').forEach(anchor=>{
    anchor.addEventListener('click',()=>form.reset());
  });
  share.addEventListener('click',async()=>{
    const url=selectionUrl();
    url.hash='#am-pick-filter-count';
    const address=url.href;
    manual.hidden=true;
    shareStatus.textContent='';
    if(typeof navigator.share==='function'){
      try{
        await navigator.share({title:'Ma sélection · Atelier Montres',url:address});
        shareStatus.textContent='Sélection partagée.';
        return;
      }catch(err){
        if(err?.name==='AbortError'){
          shareStatus.textContent='Partage annulé.';
          return;
        }
      }
    }
    try{
      if(typeof navigator.clipboard?.writeText==='function'){
        await navigator.clipboard.writeText(address);
        shareStatus.textContent='Lien de sélection copié.';
        return;
      }
    }catch(_){}
    manual.value=address;
    manual.hidden=false;
    manual.focus({preventScroll:true});
    manual.select();
    shareStatus.textContent='Copiez le lien sélectionné pour partager ces critères.';
  });
  // Never replace history on initial load: unknown incoming campaign params
  // are not read by the filters and must not silently cause a tracked event.
  apply(false);
})();
