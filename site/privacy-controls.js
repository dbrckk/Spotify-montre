'use strict';
(() => {
  const panel=document.getElementById('amPrivacyControls');
  const checkbox=document.getElementById('amPrivacyConfirm');
  const button=document.getElementById('amPrivacyDelete');
  const count=document.getElementById('amPrivacyCount');
  const status=document.getElementById('amPrivacyStatus');
  if(!panel||!checkbox||!button||!count||!status)return;

  // Exact keys used by the editorial user interface, never a wildcard or
  // Storage.clear(). Do NOT delete payments or order-follow-up capabilities:
  // am_checkout_pending_v1_*, am_checkout_key_*, am_order_*.
  // A future storage key must be reviewed before it enters this allowlist.
  const localKeys=Object.freeze([
    'atelier-montres-multibrand-favorites-v1',
    'atelier-montres-catalogue-view-v1',
    'atelier-montres-recent-v1',
    'atelier-montres-unified-recent-v1',
    'atelier-style-favs-v1',
    'atelier-custom-concepts-v1',
    'atelier-sourcing-shortlist-v1'
  ]);
  const sessionKeys=Object.freeze([
    'atelier-montres-comparison-v1',
    'atelier-montres-catalogue-return-v1'
  ]);
  const stores=[{name:'local',access:()=>localStorage,keys:localKeys},
    {name:'session',access:()=>sessionStorage,keys:sessionKeys}];
  const read=()=>{
    let total=0;
    for(const store of stores)
      for(const key of store.keys)
        if(store.access().getItem(key)!==null)total++;
    return total;
  };
  const label=n=>n+' préférence'+(n===1?'':'s')+' enregistrée'+(n===1?'':'s')+' sur cet appareil';
  const sync=()=>{
    try{
      const n=read();
      count.textContent=label(n)+'.';
      button.disabled=!checkbox.checked||n===0;
      checkbox.disabled=n===0;
      return n;
    }catch{
      count.textContent='Impossible de consulter le stockage dans ce navigateur.';
      checkbox.disabled=true;
      button.disabled=true;
      status.textContent='Vous pouvez supprimer les données du site dans les paramètres de votre navigateur.';
      return null;
    }
  };

  // Hidden without JS. Exposes no form, cookies or external connections.
  panel.hidden=false;
  checkbox.addEventListener('change',sync);
  button.addEventListener('click',()=>{
    if(!checkbox.checked||button.disabled)return;
    let failed=0;
    for(const store of stores){
      for(const key of store.keys){
        try{
          const storage=store.access();
          storage.removeItem(key);
          if(storage.getItem(key)!==null)failed++;
        }catch{failed++}
      }
    }
    checkbox.checked=false;
    const left=sync();
    if(failed===0&&left===0){
      status.textContent='Préférences effacées sur cet appareil. Les commandes et leurs jetons de suivi sont conservés.';
    }else{
      status.textContent='Effacement incomplet : certaines préférences n’ont pas pu être supprimées. Vérifiez les réglages du navigateur.';
    }
  });
  sync();
})();
