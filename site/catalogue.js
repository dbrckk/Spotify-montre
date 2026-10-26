'use strict';
(() => {
  const grid = document.getElementById('catalogCards');
  const loading = document.getElementById('catalogStatus');
  const empty = document.getElementById('catalogEmpty');
  const error = document.getElementById('catalogError');
  const filters = document.getElementById('catalogFilters');
  if (!grid || !loading || !empty || !error || !filters) return;
  const accepted = new Set(['sport','classic','minimal']);
  const isValidImage = (input) => {
    try {
      const url = new URL(input);
      return url.protocol === 'https:' && !url.username && !url.password && !url.hostname.endsWith('.invalid');
    } catch (_) {return false;}
  };
  const validItem = (p) => {
    if (!p || typeof p !== 'object' || p.status !== 'approved' || p.publicationReady !== true ||
      p.sellerVerified !== true || p.imageRightsConfirmed !== true || p.complianceReviewed !== true) return false;
    if (!/^[a-z0-9-]{3,64}$/.test(p.id||'') || typeof p.title !== 'string' ||
      p.title.trim().length < 4 || p.title.length > 120 || !accepted.has(p.family)) return false;
    if (!Number.isSafeInteger(p.priceCents) || p.priceCents < 100 ||
      p.currency !== 'EUR' || typeof p.description !== 'string' || p.description.length < 12 ||
      p.description.length > 500 || typeof p.imageUrl !== 'string' || !isValidImage(p.imageUrl)) return false;
    return typeof p.sku === 'string' && p.sku.trim().length > 1;
  };
  const node = (tag, cls, content) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content !== undefined) el.textContent = content;
    return el;
  };
  let listed = [], active = 'all';
  const render = () => {
    const visible = listed.filter(p => active === 'all' || p.family === active);
    grid.replaceChildren(...visible.map(p => {
      const card = node('article','catalog-product');
      const image = node('img');
      image.src = p.imageUrl;
      image.alt = 'Montre ' + p.title + ' — photo fournisseur autorisée';
      image.loading = 'lazy';
      image.decoding = 'async';
      const body = node('div','catalog-product-body');
      const title = node('h3','',p.title);
      const desc = node('p','',p.description);
      body.append(node('p','catalog-product-type',p.family === 'sport' ? 'Sport chic' : p.family === 'classic' ? 'Classique' : 'Minimaliste'));
      body.append(title,desc,node('p','catalog-price',new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(p.priceCents/100)));
      body.append(node('p','catalog-info','Référence : '+p.sku+' • Achat indisponible tant que la caisse intégrée n’est pas validée.'));
      card.append(image,body);
      return card;
    }));
    loading.textContent=visible.length+' modèle'+(visible.length===1?'':'s')+' confirmé'+(visible.length===1?'':'s')+' dans cette catégorie.';
  };
  filters.addEventListener('click',(e)=>{
    const button=e.target.closest('button[data-category]');
    if(!button)return;
    active=button.dataset.category;
    for(const item of filters.querySelectorAll('button[data-category]')) {
      const current=item===button;
      item.classList.toggle('is-active',current);
      item.setAttribute('aria-pressed',String(current));
    }
    render();
  });
  Promise.all([
    fetch('./config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('config');return r.json();}),
    fetch('./catalogue.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('catalogue');return r.json();})
  ]).then(([config,catalogue])=>{
    if (!catalogue || catalogue.version !== 1 || !Array.isArray(catalogue.products) ||
      catalogue.currency !== 'EUR') throw Error('invalid catalogue');
    if (config?.status !== 'open' || config?.checkoutMode !== 'embedded' ||
       catalogue.storefrontMode !== 'open') {
      loading.textContent='Collection non commercialisée.';
      empty.hidden=false;
      return;
    }
    listed=catalogue.products.filter(validItem);
    if (!listed.length) {
      loading.textContent='Aucune référence confirmée pour le moment.';
      empty.hidden=false;
      return;
    }
    filters.hidden=false;
    render();
  }).catch(()=>{
    loading.textContent='Catalogue indisponible.';
    error.hidden=false;
  });
})();
