'use strict';
/* Progressive enhancement on top of all 52 prerendered, crawlable cards. */
(() => {
  const $=id=>document.getElementById(id);
  const root=$('udGrid'),form=$('udFilters'),status=$('udCount'),empty=$('udEmpty');
  const compareStatus=$('udCompareStatus'),compareClear=$('udCompareClear'),compareTable=$('udCompareTable');
  if(!root||!form||!status||!empty||!compareStatus||!compareClear||!compareTable)return;
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
    movement:$('udMovement'),tier:$('udTier'),size:$('udSize')};
  let watches=new Map(),selected=[];
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
    const next=location.pathname+(query.size?'?'+query.toString():'')+location.hash;
    history.replaceState(null,'',next);
  };
  const render=()=>{
    const q=normalized(controls.q.value),brand=controls.brand.value,
      style=controls.style.value,movement=controls.movement.value,
      tier=controls.tier.value,size=controls.size.value;
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
        &&tokens.every(term=>normalized([p.brand,p.model,p.description,p.lead,p.caseText,p.glass,p.water].join(' ')).includes(term));
      card.hidden=!ok;
      if(ok)visible++;
    }
    status.textContent=visible+' modèle'+(visible===1?'':'s')+' sur '+cards.length;
    empty.hidden=visible!==0;
    persist();
  };
  const link=(label,url)=>{
    const a=node('a',label);a.href=url;return a;
  };
  const renderCompare=()=>{
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
    for(const card of cards)card.querySelector('button.ud-select')?.removeAttribute('hidden');
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
