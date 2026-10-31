'use strict';
/* Shareable watch catalogue: filter state in URL, no server or tracking. */
(() => {
  const ready = () => {
    const brand = document.getElementById('affBrand');
    const movement = document.getElementById('affMovement');
    const diameter = document.getElementById('affDiameter');
    const sort = document.getElementById('affSort');
    const search = document.getElementById('affSearch');
    const tabs = document.getElementById('affTabs');
    const anchor = document.getElementById('affActiveFilters');
    if (!brand || !movement || !diameter || !sort || !search || !tabs || !anchor) return;

    const wrap = document.createElement('div');
    wrap.className = 'am-share-selection';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Partager cette sélection';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrap.append(button, status);
    anchor.after(wrap);

    const selectedTier = () => tabs.querySelector('[data-tier][aria-pressed="true"]')?.dataset.tier || 'all';
    const buildUrl = () => {
      const url = new URL('./affiliation.html', location.href);
      const tier = selectedTier();
      if (tier !== 'all') url.searchParams.set('tier', tier);
      if (brand.value !== 'all') url.searchParams.set('brand', brand.value);
      if (movement.value !== 'all') url.searchParams.set('movement', movement.value);
      if (diameter.value !== 'all') url.searchParams.set('diameter', diameter.value);
      if (search.value.trim()) url.searchParams.set('q', search.value.trim().slice(0, 100));
      if (sort.value !== 'editorial') url.searchParams.set('sort', sort.value);
      url.hash = 'montres';
      return url.href;
    };
    button.addEventListener('click', async () => {
      const url = buildUrl();
      try {
        if (navigator.share) {
          await navigator.share({title: 'Sélection de montres - Atelier Montres', url});
          status.textContent = 'Sélection partagée';
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          status.textContent = 'Lien de la sélection copié';
        } else {
          status.textContent = 'Lien à copier : ' + url;
        }
      } catch (err) {
        if (err?.name !== 'AbortError') status.textContent = 'Lien à copier : ' + url;
      }
    });

    // The catalogue creates brand options after the remote JSON has loaded.
    const params = new URLSearchParams(location.search);
    let applied = false;
    const hydrate = () => {
      if (applied || brand.options.length < 2) return;
      applied = true;
      observer.disconnect();
      const tier = params.get('tier');
      if (['essential','signature','prestige','favourites'].includes(tier)) {
        tabs.querySelector('[data-tier="' + tier + '"]')?.click();
      }
      const requestedBrand = params.get('brand');
      if (requestedBrand && [...brand.options].some(o => o.value === requestedBrand)) {
        brand.value = requestedBrand;
        brand.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const requestedMovement = params.get('movement');
      if (['quartz','automatic','eco-drive'].includes(requestedMovement)) {
        movement.value = requestedMovement;
        movement.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const requestedDiameter = params.get('diameter');
      if (['compact','medium','unknown'].includes(requestedDiameter)) {
        diameter.value = requestedDiameter;
        diameter.dispatchEvent(new Event('change', {bubbles:true}));
      }
      const q = params.get('q');
      if (q) {
        search.value = q.slice(0,100);
        search.dispatchEvent(new Event('input', {bubbles:true}));
      }
      const order = params.get('sort');
      if (['brand','name','diameter-asc','diameter-desc'].includes(order)) {
        sort.value = order;
        sort.dispatchEvent(new Event('change', {bubbles:true}));
      }
    };
    const observer = new MutationObserver(hydrate);
    observer.observe(brand,{childList:true});
    hydrate();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
