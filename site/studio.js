'use strict';
(() => {
  const $=(x)=>document.getElementById(x);
  const cards=$('studioResults'), status=$('studioStatus'), count=$('studioCount'),summary=$('studioSummary'),copy=$('studioCopy'),copyStatus=$('studioCopyStatus'),empty=$('studioEmpty'),form=$('studioCalc'),unit=$('studioUnitCost'),budget=$('studioBudgetStatus');
  if(!cards||!status||!count||!summary||!copy||!form||!unit||!budget)return;
  let candidates=[],selected=new Set(),active='all';
  const KEY='atelier-sourcing-shortlist-v1';
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))selected=new Set(saved.filter(x=>typeof x==='string'))}catch(_){ }
  const node=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
  const money=(v,c)=>{try{return new Intl.NumberFormat('fr-FR',{style:'currency',currency:c,maximumFractionDigits:2}).format(v)}catch(_){return String(v)+' '+c}};
  const accepted=new Set(['classic','sport','minimal']);
  const valid=(x)=>x&&x.status==='research_only'&&typeof x.id==='string'&&accepted.has(x.family)&&typeof x.supplier==='string'&&typeof x.model==='string'&&Number.isFinite(x.price?.from)&&Number.isFinite(x.price?.to)&&x.price.to>=x.price.from&&['EUR','USD'].includes(x.price.currency)&&Number.isInteger(x.minimumOrderQuantity)&&x.minimumOrderQuantity>0&&Array.isArray(x.issues)&&x.issues.length>=2&&typeof x.sourceUrl==='string'&&x.sourceUrl.startsWith('https://');
  function render() {
    const visible=candidates.filter(c=>active==='all'||(active==='shortlist'?selected.has(c.id):c.family===active));
    cards.replaceChildren(...visible.map(c=>{
      const box=node('article','studio-card');
      box.append(node('span','studio-card-flag','À vérifier — ne pas commander sans devis'));
      box.append(node('h3','',c.supplier));
      box.append(node('p','studio-model',c.model));
      const price=node('p','studio-price',money(c.price.from,c.price.currency)+' – '+money(c.price.to,c.price.currency));
      price.append(node('small','','Tarifs d’annonce, hors importation et livraison'));
      box.append(price);
      const dl=node('dl');
      for(const [name,value] of [['Commande minimale',c.minimumOrderQuantity+' pièce'+(c.minimumOrderQuantity>1?'s':'')],['Marque propre',c.branding]]) {
        const wrap=node('div');wrap.append(node('dt','',name),node('dd','',value));dl.append(wrap);
      }
      box.append(dl);
      const issues=node('div','studio-issues');issues.append(node('strong','','À obtenir avant validation'));
      const ul=node('ul');
      for(const issue of c.issues.slice(0,5))ul.append(node('li','',issue));
      issues.append(ul);box.append(issues);
      const actions=node('div','studio-card-actions');
      const link=node('a','','Voir la fiche fournisseur');
      link.href=c.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';link.title='Ouvrir l’annonce sur le site du fournisseur';
      const button=node('button','',selected.has(c.id)?'✓ Retirer de la liste':'Ajouter à la shortlist');
      button.type='button';button.setAttribute('aria-pressed',String(selected.has(c.id)));
      button.addEventListener('click',()=>{
        selected.has(c.id)?selected.delete(c.id):selected.add(c.id);
        try{localStorage.setItem(KEY,JSON.stringify([...selected]))}catch(_){}
        copyStatus.textContent='';render();
      });
      actions.append(link,button);box.append(actions);
      return box;
    }));
    empty.hidden=visible.length!==0;
    count.textContent=String(selected.size);
    const chosen=candidates.filter(c=>selected.has(c.id));
    summary.textContent=chosen.length?chosen.map(c=>c.supplier).join(' · '):'Sélectionnez des fournisseurs à consulter.';
    status.textContent=visible.length+' offre'+(visible.length>1?'s':'')+' étudiée'+(visible.length>1?'s':'');
    copy.disabled=chosen.length===0;
    document.querySelectorAll('.studio-filters button').forEach(b=>{const yes=b.dataset.filter===active;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))});
  }
  document.querySelectorAll('.studio-filters button').forEach(b=>b.addEventListener('click',()=>{active=b.dataset.filter;render()}));
  copy.addEventListener('click',async()=>{
    const list=candidates.filter(c=>selected.has(c.id));
    if(!list.length)return;
    const txt='Fournisseurs Atelier Montres — vérifications nécessaires\n'+list.map(c=>'- '+c.supplier+' | '+c.model+' | '+c.sourceUrl).join('\n');
    try{await navigator.clipboard.writeText(txt);copyStatus.textContent='Shortlist copiée.'}catch(_){copyStatus.textContent='Copie impossible sur cet appareil : '+list.map(c=>c.supplier).join(', ')}
  });
  const currency=(x)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(x);
  function calculate(){
    const values=Object.fromEntries(new FormData(form).entries());
    const quantity=Number(values.quantity),price=Number(values.unitPrice),shipping=Number(values.freight),taxes=Number(values.taxes),extras=Number(values.extras);
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||![price,shipping,taxes,extras].every(v=>Number.isFinite(v)&&v>=0&&v<=1e5)){
      unit.textContent='—';budget.textContent='Corrigez les montants et la quantité.';return;
    }
    const total=price*quantity+shipping+taxes+extras;
    const landed=total/quantity;
    unit.textContent=currency(landed);
    budget.textContent=(landed<=20?'Dans l’objectif de 20 €':'Au-dessus de l’objectif de 20 €')+' • Total du lot : '+currency(total)+'. Estimation, non devis.';
  }
  form.addEventListener('input',calculate);calculate();
  fetch('./fournisseurs.json',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw Error('feed');return r.json()})
    .then(data=>{
      if(data?.version!==1||!Array.isArray(data.candidates))throw Error('schema');
      candidates=data.candidates.filter(valid);
      selected=new Set([...selected].filter(id=>candidates.some(c=>c.id===id)));
      render();
    })
    .catch(()=>{status.textContent='Données fournisseurs indisponibles.';empty.hidden=false});
})();
