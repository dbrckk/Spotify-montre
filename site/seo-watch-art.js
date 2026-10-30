'use strict';
/* Editorial vector watch images for product SEO pages. Never loads remote images. */
(() => {
  const nodes=document.querySelectorAll('.watch-vector[data-watch-id]');
  for(const mount of nodes){
    const {watchId:id,brand,model,tone}=mount.dataset;
    if(!/^[a-z0-9-]{4,64}$/.test(id||'')||!brand||!model)continue;
    // The original SVG renderer constructs DOM nodes without innerHTML and
    // clearly labels its work as an illustration rather than product photography.
    window.AtelierWatch?.render(mount,{id,brand,model,tone});
  }
})();
