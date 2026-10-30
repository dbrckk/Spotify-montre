'use strict';
/* Deterministic editorial recommendation engine — no network, no tracking, no prices invented. */
(function(scope){
 const tierNames={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
 const movementNames={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire Eco-Drive'};
 const styleNames={sport:'Sport chic',classic:'Élégance classique',minimal:'Épuré',retro:'Vintage',statement:'Audacieux'};
 const sizeNames={compact:'Boîtier jusqu’à 38 mm',medium:'Boîtier de 38,1 à 40 mm'};
 const diameterMm=p=>{
  const raw=p?.specs?.diameter;
  if(typeof raw!=='string')return null;
  const match=/^(\d{1,2})(?:[,.](\d{1,2}))?\s*mm$/i.exec(raw.trim());
  if(!match)return null;
  const n=Number(match[1]+'.'+(match[2]||'0'));
  return Number.isFinite(n)&&n>0&&n<=65?n:null;
 };
 const isSizeMatch=(diameter,size)=>diameter!==null&&(size==='compact'?diameter<=38:size==='medium'?diameter>38&&diameter<=40:false);
 const allowed={tier:new Set(['all',...Object.keys(tierNames)]),movement:new Set(['all',...Object.keys(movementNames)]),style:new Set(['all',...Object.keys(styleNames)]),size:new Set(['all',...Object.keys(sizeNames)])};
 function choices(input){
  const v=input&&typeof input==='object'?input:{};
  return {tier:allowed.tier.has(v.tier)?v.tier:'all',style:allowed.style.has(v.style)?v.style:'all',movement:allowed.movement.has(v.movement)?v.movement:'all',size:allowed.size.has(v.size)?v.size:'all'};
 }
 function score(p,c,index){
  const details=[];
  let total=0,exact=0,sizeNote='';
  if(c.tier!=='all'){if(p.tier===c.tier){total+=8;exact++;details.push('Gamme '+tierNames[p.tier])}else total-=3}
  if(c.style!=='all'){if(p.style===c.style){total+=7;exact++;details.push(styleNames[p.style])}else if((c.style==='classic'&&p.style==='minimal')||(c.style==='minimal'&&p.style==='classic')){total+=2}else total-=2}
  if(c.movement!=='all'){if(p.movement===c.movement){total+=7;exact++;details.push(movementNames[p.movement])}else total-=3}
  if(c.size!=='all'){
   const n=diameterMm(p);
   if(n===null){total-=2;sizeNote='Diamètre non renseigné : à vérifier chez le fabricant.'}
   else if(isSizeMatch(n,c.size)){total+=8;exact++;details.push('Diamètre '+p.specs.diameter)}
   else{total-=3;sizeNote='Diamètre '+p.specs.diameter+' : différent de votre préférence de taille.'}
  }
  const selected=Number(c.tier!=='all')+Number(c.style!=='all')+Number(c.movement!=='all')+Number(c.size!=='all');
  return {product:p,score:total,matched:exact,criteria:selected,details,index,sizeNote};
 }
 function recommend(products,selection,limit=3){
  if(!Array.isArray(products))return [];
  const c=choices(selection),allEmpty=c.tier==='all'&&c.style==='all'&&c.movement==='all'&&c.size==='all';
  const valid=products.filter(p=>p&&typeof p.id==='string'&&Object.hasOwn(tierNames,p.tier)&&Object.hasOwn(styleNames,p.style)&&Object.hasOwn(movementNames,p.movement));
  if(allEmpty){
    const preferred=['casio-mtp-1302','citizen-tsuyosa','tissot-prx-auto'];
    const selected=preferred.map(id=>valid.find(p=>p.id===id)).filter(Boolean);
    const remaining=valid.filter(p=>!selected.includes(p));
    return selected.concat(remaining).slice(0,Math.max(0,Math.min(15,limit))).map((p,i)=>({product:p,score:0,matched:0,criteria:0,details:['Choix de la rédaction'],index:i,sizeNote:''}));
  }
  return valid.map((p,i)=>score(p,c,i)).sort((a,b)=>b.matched-a.matched||b.score-a.score||a.index-b.index).slice(0,Math.max(0,Math.min(15,limit)));
 }
 scope.AtelierAdvisorEngine=Object.freeze({recommend,choices,tierNames,movementNames,styleNames,sizeNames,diameterMm});
})(globalThis);
