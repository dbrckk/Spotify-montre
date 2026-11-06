'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const status=$('amDirectStatus'),offers=$('amDirectOffers'),form=$('amDirectForm');
  if(!status||!offers||!form)return;
  const prelaunch=$('amDirectPrelaunch');
  const commerce=$('amDirectCommerce');
  const heading=$('amDirectHeading');
  const lead=$('amDirectLead');
  const unavailable=$('amDirectUnavailable');
  const show=(message,error=false)=>{status.textContent=message;status.dataset.error=String(error)};
  const showPrelaunch=(message,error=false)=>{
    form.hidden=true;
    if(prelaunch)prelaunch.hidden=true;
    if(commerce)commerce.hidden=true;
    if(unavailable)unavailable.hidden=true;
    show(message,error);
  };
  // Bound the whole response, including JSON, to avoid an endless loading state.
  // Aborting a POST does not prove the server stopped processing it; the
  // persisted idempotency key below is deliberately retained on uncertainty.
  async function requestJson(url,options={},timeoutMs=12000){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      return {response,data:await response.json()};
    }finally{clearTimeout(timeout)}
  }
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
      const {response,data}=await requestJson('./config.json',{cache:'no-store'},8000);
      if(!response.ok)throw Error('Configuration unavailable');
      config=data;
    }catch{return showPrelaunch('La disponibilité des achats directs ne peut pas être vérifiée actuellement.',true)}
    if(config.checkoutMode!=='active'||!(api=validHost(config.commerceApiUrl))){
      return showPrelaunch('Aucun paiement direct n’est actuellement ouvert. Découvrez les modèles présentés ci-dessous.');
    }
    try{
      const {response,data}=await requestJson(api+'/api/offers',{cache:'no-store'},20000);
      if(!response.ok)throw Error('Offers unavailable');
      list=Array.isArray(data.offers)?data.offers.filter(x=>
        typeof x.id==='string'&&/^[a-z0-9-]{4,64}$/.test(x.id)&&
        typeof x.amountCents==='number'&&Number.isSafeInteger(x.amountCents)&&x.amountCents>0
        &&typeof x.label==='string'&&
        Number.isSafeInteger(x.deliveryMinDays)&&x.deliveryMinDays>=1&&
        Number.isSafeInteger(x.deliveryMaxDays)&&x.deliveryMaxDays>=x.deliveryMinDays&&x.deliveryMaxDays<=120):[];
      if(!data.checkoutEnabled||!list.length)return showPrelaunch('Aucune montre n’est actuellement disponible en achat direct. Découvrez notre sélection de modèles documentés.');
      const params=new URLSearchParams(location.search);
      const selected=params.get('modele');
      // An exact product deep link must never silently select another watch.
      // A valid global offer list alone does not authorize this requested SKU.
      if(params.has('modele')&&!list.some(x=>x.id===selected)){
        if(commerce)commerce.hidden=true;
        form.hidden=true;
        if(unavailable)unavailable.hidden=false;
        return show('Cette référence n’est pas disponible en achat direct.',true);
      }
      const elements=list.map(item=>{
        const el=document.createElement('option');
        el.value=item.id;
        el.textContent=item.label+' — '+euro(item.amountCents)+' TTC';
        return el
      });
      offers.replaceChildren(...elements);
      if(list.some(x=>x.id===selected))offers.value=selected;
      if(prelaunch)prelaunch.hidden=true;
      if(unavailable)unavailable.hidden=true;
      if(commerce)commerce.hidden=false;
      if(heading){
        const emphasis=document.createElement('em');
        emphasis.textContent='chez Atelier Montres.';
        heading.replaceChildren('Achetez votre montre ',emphasis);
      }
      if(lead)lead.textContent='Votre commande est passée auprès d’Atelier Montres. Choisissez une offre vérifiée, renseignez l’adresse de livraison et consultez le prix TTC avant le paiement sécurisé. Le suivi de votre commande restera disponible ici.';
      form.hidden=false;show('Le prix TTC de la montre sélectionnée est indiqué ci-dessous. Les frais et délais sont précisés avant validation.');
      updatePrice();
    }catch{return showPrelaunch('Le service marchand ne répond pas. Aucun paiement n’a été demandé.',true)}
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
      const {response,data:result}=await requestJson(api+'/api/checkout',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},30000);
      if(!response.ok)throw Error(result.error||'La commande n’a pas pu être préparée.');
      if(!/^ord_[a-f0-9]{40}$/.test(result.orderId||'')||
        typeof result.orderToken!=='string'||result.orderToken.length<30)
        throw Error('Réponse de commande invalide');
      if(result.kind==='status'&&result.status==='PAYMENT_CREATING'){
        // The other concurrent request is still preparing Mollie checkout.
        // Keep this attempt key so a manual retry can recover that payment.
        show('Le paiement est en cours de préparation. Réessayez avec le même bouton dans quelques instants : aucun second paiement ne sera créé.');
        button.disabled=false;
        return;
      }
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
      if(error?.name==='AbortError')
        show('La réponse du paiement prend trop de temps. Votre tentative est conservée : réessayez avec le même bouton pour récupérer cette commande sans créer de deuxième paiement.',true);
      else
        show(error?.message||'Impossible de commencer le paiement.',true);
      button.disabled=false;
    }
  });
  init();
})();
