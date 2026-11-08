'use strict';
/*
 * Copy only a catalogued watch's actual displayed manufacturer reference.
 * No merchant link rewriting, stock checking, third-party APIs or tracking.
 * Hidden controls are revealed only after the DOM/model identity matches.
 */
(() => {
  const tools=[...document.querySelectorAll('[data-watch-ref-tools]')];
  const idPattern=/^[a-z0-9-]{4,64}$/;
  for(const group of tools){
    const article=group.closest('article.ud-card[data-id],article.am-extra-product[data-popular-watch-id],article.watch.watch-product[data-watch-id]');
    const button=group.querySelector('button[data-watch-ref-copy]');
    const status=group.querySelector('[data-watch-ref-status]');
    if(!article||!button||!status||!article.contains(group))continue;
    const isCard=article.matches('article.ud-card[data-id]');
    const isCore=article.matches('article.watch.watch-product[data-watch-id]');
    const id=isCard?article.dataset.id:isCore?article.dataset.watchId:article.dataset.popularWatchId;
    const brand=article.dataset.brand,model=article.dataset.model;
    const heading=article.querySelector(isCard?'h2':'h1');
    if(!idPattern.test(id||'')||button.dataset.watchRefCopy!==id
      ||typeof brand!=='string'||!brand.trim()
      ||typeof model!=='string'||!model.trim()
      ||heading?.textContent?.trim()!==brand+' '+model)continue;
    const reference=brand+' '+model;
    button.setAttribute('aria-label','Copier la référence '+reference);
    button.hidden=false;
    group.hidden=false;

    button.addEventListener('click',async()=>{
      status.textContent='';
      const existing=group.querySelector('input[data-watch-ref-manual]');
      if(existing)existing.hidden=true;
      try{
        if(typeof navigator.clipboard?.writeText!=='function')
          throw Error('Clipboard not available');
        await navigator.clipboard.writeText(reference);
        status.textContent='Référence copiée. Vérifiez le modèle et la variante chez le marchand.';
      }catch(_){
        // Browser permissions can block clipboard on Android/WebViews:
        // expose a selectable, read-only field instead of pretending success.
        let field=group.querySelector('input[data-watch-ref-manual]');
        if(!field){
          field=document.createElement('input');
          field.type='text';
          field.readOnly=true;
          field.className='am-ref-copy-manual';
          field.dataset.watchRefManual='';
          field.setAttribute('aria-label','Référence de montre à sélectionner et copier');
          group.append(field);
        }
        field.value=reference;
        field.hidden=false;
        field.focus();
        field.select();
        status.textContent='Copie automatique indisponible : sélectionnez et copiez la référence affichée.';
      }
    });
  }
})();
