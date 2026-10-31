/* Atelier Montres — progressive-enhancement discovery of documentary watches.
 * Only local DOM filtering: no network requests, cookies, personal profiles or
 * invented availability. Without JS, all 13 editorial products remain visible.
 */
(() => {
  'use strict';
  const form=document.getElementById('am-pick-filters');
  const grid=document.getElementById('am-picks-list');
  if(!form||!grid)return;
  const cards=Array.from(grid.querySelectorAll('.am-pick-card[data-watch-id]'));
  const sections=Array.from(grid.querySelectorAll('.am-picks-tier'));
  const count=document.getElementById('am-pick-filter-count');
  const empty=document.getElementById('am-pick-filter-empty');
  const query=form.elements.namedItem('recherche');
  const style=form.elements.namedItem('style');
  const movement=form.elements.namedItem('mouvement');
  const tier=form.elements.namedItem('gamme');
  if(!cards.length||!sections.length||!count||!empty||!query||!style||!movement||!tier)return;
  const normalize=value=>String(value||'').toLocaleLowerCase('fr-FR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const haystack=new Map(cards.map(card=>[card,normalize(card.dataset.search||card.textContent)]));
  function apply(){
    const tokens=normalize(query.value).split(/\s+/).filter(Boolean);
    let shown=0;
    for(const card of cards){
      const matches=(!style.value||card.dataset.style===style.value)
        &&(!movement.value||card.dataset.movement===movement.value)
        &&(!tier.value||card.dataset.tier===tier.value)
        &&tokens.every(token=>haystack.get(card).includes(token));
      card.hidden=!matches;
      if(matches)shown++;
    }
    for(const section of sections){
      section.hidden=!Array.from(section.querySelectorAll('.am-pick-card')).some(card=>!card.hidden);
    }
    count.textContent=shown+' modèle'+(shown>1?'s':'')+' sur '+cards.length;
    empty.hidden=shown!==0;
  }
  form.hidden=false;
  form.addEventListener('input',apply);
  form.addEventListener('change',apply);
  form.addEventListener('reset',()=>queueMicrotask(apply));
  // Existing tier anchor links must always navigate to a visible section,
  // even after the shopper has narrowed the results to another tier.
  document.querySelectorAll('.am-picks-tier-nav a[href^="#gamme-"]').forEach(anchor=>{
    anchor.addEventListener('click',()=>{
      form.reset();
      apply();
    });
  });
  apply();
})();
