'use strict';
(()=>{
 const products=[
 {id:'atelier-emeraude',name:'Émeraude',tone:'green',style:'Signature sport chic',detail:'Cadran vert profond, bracelet intégré à maillons. Notre premier choix pour une montre affirmée mais équilibrée.',case:'Acier à vérifier',movement:'Quartz à confirmer',brand:'Logo discret à 12 h'},
 {id:'atelier-glacier',name:'Glacier',tone:'blue',style:'Lumineuse et moderne',detail:'Cadran bleu glacier, finition argentée et indices simples. Une ligne contemporaine et polyvalente.',case:'Acier à vérifier',movement:'Quartz à confirmer',brand:'Couleur et logo usine'},
 {id:'atelier-minuit',name:'Minuit',tone:'black',style:'Luxe discret',detail:'Noir profond, boîtier fin et lignes sobres pour une pièce facile à porter en toutes circonstances.',case:'Métal et revêtement à vérifier',movement:'Quartz à confirmer',brand:'Logo ton sur ton'}
 ];
 const container=document.getElementById('brandModels');
 if(!container)return;
 const key='atelier-custom-concepts-v1';
 let selected=new Set();
 try{const x=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(x))selected=new Set(x.filter(t=>products.some(p=>p.id===t)))}catch(_){}
 const node=(tag,cls,val)=>{const d=document.createElement(tag);if(cls)d.className=cls;if(val!==undefined)d.textContent=val;return d};
 function render(){
   container.replaceChildren(...products.map(p=>{
     const card=node('article','brand-model');
     const art=node('div','brand-model-art');art.dataset.tone=p.tone;art.setAttribute('role','img');art.setAttribute('aria-label','Illustration du concept '+p.name+', pas un produit réel');
     const strap=node('div','brand-mini-band'),dial=node('div','brand-mini-case');
     dial.append(node('span','','A · M'));art.append(strap,dial,node('span','brand-mini-mark','CONCEPT • MARQUE PROVISOIRE'));
     const body=node('div','brand-model-text');
     body.append(node('small','',p.style),node('h3','',p.name),node('p','',p.detail));
     const dl=node('dl');
     for(const [label,val] of [['Boîtier',p.case],['Mouvement',p.movement],['Personnalisation',p.brand]]){const row=node('div');row.append(node('dt','',label),node('dd','',val));dl.append(row)}
     body.append(dl);
     const btn=node('button','',selected.has(p.id)?'✓ Style retenu':'♡ Garder ce style en favori');
     btn.type='button';btn.setAttribute('aria-pressed',String(selected.has(p.id)));
     btn.addEventListener('click',()=>{selected.has(p.id)?selected.delete(p.id):selected.add(p.id);try{localStorage.setItem(key,JSON.stringify([...selected]))}catch(_){}render()});
     body.append(btn);card.append(art,body);return card;
   }));
 }
 render();
})();