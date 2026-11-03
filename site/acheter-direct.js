'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const status=$('amDirectStatus'),offers=$('amDirectOffers'),form=$('amDirectForm');
  if(!status||!offers||!form)return;
  const show=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error)};
  const euro=c=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100);
  let api='',list=[];
  function validHost(raw){
    try{const u=new URL(raw);return u.protocol==='https:'&&u.pathname==='/'&&!u.search&&!u.hash
      &&!u.username&&!u.password&&u.port===''&&u.hostname.endsWith('.onrender.com')?u.origin:null}
    catch{return null}
  }
  const orderKey=id=>'am_checkout_key_'+id;
  const newKey=()=>crypto.randomUUID().replaceAll('-','');
  async function init(){
    let config;
    try{
      const response=await fetch('./config.json',{cache:'no-store'});
      if(!response.ok)throw Error();
      config=await response.json();
    }catch{return show('Le service de commande est momentanément indisponible.',true)}
    if(config.checkoutMode!=='active'||!(api=validHost(config.commerceApiUrl))){
      return show('La vente directe est en préparation. Notre catalogue et les liens partenaires restent disponibles.');
    }
    try{
      const response=await fetch(api+'/api/offers',{cache:'no-store'});
      if(!response.ok)throw Error();
      const data=await response.json();
      list=Array.isArray(data.offers)?data.offers.filter(x=>
        typeof x.id==='string'&&/^[a-z0-9-]{4,64}$/.test(x.id)&&
        typeof x.amountCents==='number'&&Number.isSafeInteger(x.amountCents)&&x.amountCents>0
        &&typeof x.label==='string'&&
        Number.isSafeInteger(x.deliveryMinDays)&&x.deliveryMinDays>=1&&
        Number.isSafeInteger(x.deliveryMaxDays)&&x.deliveryMaxDays>=x.deliveryMinDays&&x.deliveryMaxDays<=120):[];
      if(!data.checkoutEnabled||!list.length)return show('Aucune montre n’est actuellement disponible en achat direct. Les liens partenaires restent accessibles.');
      const selected=new URLSearchParams(location.search).get('modele');
      const elements=list.map(item=>{
        const el=document.createElement('option');
        el.value=item.id;
        el.textContent=item.label+' — '+euro(item.amountCents)+' TTC';
        return el
      });
      offers.replaceChildren(...elements);
      if(list.some(x=>x.id===selected))offers.value=selected;
      form.hidden=false;show('Le prix TTC de la montre sélectionnée est indiqué ci-dessous. Les frais et délais sont précisés avant validation.');
      updatePrice();
    }catch{return show('Le service marchand ne répond pas. Aucun paiement n’a été demandé.',true)}
  }
  const price=$('amDirectPrice');
  const delivery=$('amDirectDelivery');
  function updatePrice(){
    const item=list.find(x=>x.id===offers.value);
    if(item&&price)price.textContent=euro(item.amountCents)+' TTC';
    if(delivery)delivery.textContent=item?
      'Délai de livraison annoncé : '+item.deliveryMinDays+' à '+item.deliveryMaxDays+
      ' jours ouvrés après confirmation du paiement.':'Délai non vérifié';
  }
  offers.addEventListener('change',()=>{updatePrice();});
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const item=list.find(x=>x.id===offers.value);
    if(!item||!api)return;
    const button=$('amDirectSubmit');button.disabled=true;
    show('Vérification de la commande et préparation du paiement sécurisé…');
    const payload={offerId:item.id,quantity:1,acceptTerms:form.elements.acceptTerms.checked};
    for(const key of ['fullName','email','address1','address2','postalCode','city','region','phone'])
      payload[key]=String(form.elements[key]?.value||'');
    payload.countryCode='FR';
    let attempt=sessionStorage.getItem(orderKey(item.id));
    if(!attempt){attempt=newKey();sessionStorage.setItem(orderKey(item.id),attempt);}
    payload.idempotencyKey=attempt;
    try{
      const response=await fetch(api+'/api/checkout',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'La commande n’a pas pu être préparée.');
      if(!/^ord_[a-f0-9]{40}$/.test(result.orderId||'')||
        typeof result.orderToken!=='string'||result.orderToken.length<30)
        throw Error('Réponse de commande invalide');
      let destination;
      if(result.kind==='status'){
        // Never attempt another charge for an order already in progress or paid.
        destination=new URL('./commande.html?commande='+encodeURIComponent(result.orderId),location.href);
      }else if(result.kind==='payment'||result.kind===undefined){
        const url=new URL(result.checkoutUrl);
        if(url.protocol!=='https:'||!['www.mollie.com','checkout.mollie.com'].includes(url.hostname)
          ||url.username||url.password)throw Error('Lien de paiement invalide');
        destination=url;
      }else throw Error('Statut de commande non reconnu');
      sessionStorage.setItem('am_order_'+result.orderId,result.orderToken);
      sessionStorage.removeItem(orderKey(item.id));
      window.location.assign(destination.href);
    }catch(error){
      show(error.message||'Impossible de commencer le paiement.',true);
      button.disabled=false;
    }
  });
  init();
})();
