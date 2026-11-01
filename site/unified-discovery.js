'use strict';
/* Progressive enhancement on top of all 52 prerendered, crawlable cards. */
(() => {
  const $=id=>document.getElementById(id);
  const root=$('udGrid'),form=$('udFilters'),status=$('udCount'),empty=$('udEmpty');
  const compareStatus=$('udCompareStatus'),compareClear=$('udCompareClear'),compareTable=$('udCompareTable');
  const tray=$('udCompareTray'),trayItems=$('udTrayItems'),trayCount=$('udTrayCount'),
    trayOpen=$('udTrayOpen'),trayClear=$('udTrayClear'),catalogue=document.querySelector('.ud-page');
  const viewTools=$('udViewTools'),viewCompact=$('udViewCompact'),viewLarge=$('udViewLarge');
  if(!root||!form||!status||!empty||!compareStatus||!compareClear||!compareTable
    ||!tray||!trayItems||!trayCount||!trayOpen||!trayClear||!catalogue
    ||!viewTools||!viewCompact||!viewLarge)return;
  const cards=[...root.querySelectorAll('article.ud-card[data-id]')];
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
    merchant:$('udMerchant')};
  let watches=new Map(),selected=[],view='grid';
  const validId=x=>typeof x==='string'&&/^[a-z0-9-]{4,64}$/.test(x);
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
      if(value&&(name==='q'||value!=='all'))query.set(name,value.slice(0,100));
    }
    if(selected.length)query.set('compare',selected.join(','));
    if(view==='large')query.set('view','large');
    const next=location.pathname+(query.size?'?'+query.toString():'')+location.hash;
    history.replaceState(null,'',next);
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
        &&(brand==='all'||p.brand===brand)
        &&(style==='all'||p.style===style)
        &&(movement==='all'||p.movement===movement)
        &&(tier==='all'||p.tier===tier)
        &&matchSize(p,size)
        &&(merchant==='all'||(p.merchantKind||'official')===merchant)
        &&(visual==='all'||(visual==='photo'&&Boolean(p.photoUrl))
          ||(visual==='no-photo'&&!p.photoUrl))
        &&tokens.every(term=>normalized([p.brand,p.model,p.description,p.lead,p.caseText,p.glass,p.water].join(' ')).includes(term));
      card.hidden=!ok;
      if(ok)visible++;
    }
    status.textContent=visible+' modèle'+(visible===1?'':'s')+' sur '+cards.length;
    empty.hidden=visible!==0;
    persist();
  };
  const changeView=mode=>{
    view=mode==='large'?'large':'grid';
    root.classList.toggle('ud-view-large',view==='large');
    viewCompact.setAttribute('aria-pressed',String(view==='grid'));
    viewLarge.setAttribute('aria-pressed',String(view==='large'));
    persist();
  };
  viewCompact.addEventListener('click',()=>changeView('grid'));
  viewLarge.addEventListener('click',()=>changeView('large'));
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
    if(selected.length<2){compareTable.replaceChildren();compareTable.hidden=true;persist();return}
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
      th.append(link(p.brand+' '+p.model,'./'+id+'.html'));
      const remove=node('button','Retirer','ud-compare-remove');
      remove.type='button';remove.setAttribute('aria-label','Retirer '+p.brand+' '+p.model);
      remove.addEventListener('click',()=>{selected=selected.filter(x=>x!==id);renderCompare()});
      th.append(remove);heading.append(th);
    }
    thead.append(heading);
    const tbody=node('tbody');
    for(const [label,resolve] of rows){
      const tr=node('tr'),th=node('th',label);th.scope='row';tr.append(th);
      for(const id of selected){const value=resolve(watches.get(id));tr.append(node('td',value||'Non documenté'))}
      tbody.append(tr);
    }
    table.append(caption,thead,tbody);compareTable.replaceChildren(table);compareTable.hidden=false;
    persist();
  };
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
    const btn=event.target.closest('button.ud-select[data-compare-id]');
    if(!btn)return;
    const id=btn.dataset.compareId;
    if(!watches.has(id))return;
    if(selected.includes(id))selected=selected.filter(x=>x!==id);
    else if(selected.length>=3){compareStatus.textContent='Trois modèles maximum. Retirez-en un avant d’en ajouter un quatrième.';return}
    else selected.push(id);
    renderCompare();
  });
  compareClear.addEventListener('click',()=>{selected=[];renderCompare()});
  trayClear.addEventListener('click',()=>{selected=[];renderCompare()});
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
  form.addEventListener('reset',()=>{requestAnimationFrame(render)});
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
    for(const card of cards){
      card.querySelector('button.ud-select')?.removeAttribute('hidden');
      if(window.AtelierPhoto?.open)
        card.querySelector('button.ud-zoom')?.removeAttribute('hidden');
    }
    changeView(params.get('view')==='large'?'large':'grid');
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
