'use strict';
(()=>{
  const status=document.getElementById('amOrderStatus');
  const details=document.getElementById('amOrderDetails');
  const refresh=document.getElementById('amOrderRefresh');
  const output=id=>document.getElementById(id);
  if(!status||!details||!refresh)return;
  const EXPECTED_COMMERCE_ORIGIN='https://atelier-montres-commerce-api.onrender.com';
  const stateNames={
    PAYMENT_CREATING:'Préparation du paiement — aucune confirmation reçue.',
    PAYMENT_PENDING:'Paiement en cours de validation par le prestataire.',
    PAYMENT_REVIEW:'Paiement à vérifier auprès du prestataire : aucune nouvelle tentative automatique.',
    PAYMENT_FAILED:'Paiement non confirmé. Aucune commande fournisseur n’a été déclenchée.',
    PAID:'Paiement confirmé. La commande fournisseur va être préparée.',
    SUPPLIER_SENDING:'Transmission sécurisée de votre commande au fournisseur.',
    SUPPLIER_SUBMITTED:'Le fournisseur a reçu la commande. Attente de la confirmation de règlement et de préparation.',
    SUPPLIER_PAID:'Fournisseur réglé : la préparation de votre montre est en cours.',
    SHIPPED:'Votre montre a été expédiée par le fournisseur.',
    DELIVERED:'La livraison est indiquée comme effectuée.',
    EXCEPTION:'Votre commande nécessite une intervention du vendeur. Le paiement ou la livraison est en cours de vérification.',
    REFUNDED:'La commande est indiquée comme remboursée.'
  };
  const query=new URLSearchParams(location.search);
  const orderId=query.get('commande');
  if(!/^ord_[a-f0-9]{40}$/.test(orderId||'')){
    status.textContent='Référence de commande invalide. Aucun statut de paiement n’est présumé.';
    return;
  }
  let token;
  try{token=sessionStorage.getItem('am_order_'+orderId)}catch{}
  if(!token||token.length<30){
    status.textContent='Suivi disponible uniquement depuis le navigateur qui a initié l’achat. Aucune confirmation de paiement n’est présumée.';
    return;
  }
  // Existing customer orders must remain traceable when the merchant pauses
  // NEW checkout. Status access is independently authenticated by the
  // backend with the order ID and private order token.
  async function requestJson(url,options={},timeoutMs=15000){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      return {response,data:await response.json()};
    }finally{clearTimeout(timeout)}
  }
  async function load(){
    refresh.disabled=true;
    try{
      const {response:configResponse,data:config}=await requestJson(
        './config.json',{cache:'no-store'},8000);
      if(!configResponse.ok)throw Error();
      // Sale mode is deliberately NOT checked here. An emergency checkout
      // shutdown must never revoke a customer's existing order-tracking path.
      const url=new URL(config.commerceApiUrl);
      if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||
        url.origin!==EXPECTED_COMMERCE_ORIGIN||url.search||url.hash||url.port)throw Error();
      const {response:result,data}=await requestJson(
        url.origin+'/api/orders/'+orderId,
        {headers:{'X-Order-Token':token},cache:'no-store'},15000);
      if(!result.ok)throw Error();
      if(data.orderId!==orderId||!Object.hasOwn(stateNames,data.status))throw Error();
      status.textContent=stateNames[data.status];
      output('amOrderProduct').textContent=String(data.product||'Modèle non disponible').slice(0,180);
      output('amOrderAmount').textContent=Number.isSafeInteger(data.amountCents)?
        new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(data.amountCents/100):'Non disponible';
      const eta=output('amOrderDelivery');
      if(eta)eta.textContent=Number.isSafeInteger(data.deliveryMinDays)
        &&Number.isSafeInteger(data.deliveryMaxDays)
        &&data.deliveryMinDays>0&&data.deliveryMaxDays>=data.deliveryMinDays
        ?data.deliveryMinDays+' à '+data.deliveryMaxDays+' jours ouvrés après paiement'
        :'Délai contractuel à confirmer avec le vendeur';
      const shipping=output('amOrderShipping');
      shipping.replaceChildren();
      if(typeof data.trackingNumber==='string'&&data.trackingNumber){
        const label=document.createElement('span');label.textContent=data.trackingNumber.slice(0,120);
        shipping.append(label);
        try{
          const u=new URL(data.trackingUrl);
          if(u.protocol==='https:'&&!u.username&&!u.password){
            const link=document.createElement('a');
            link.textContent=' · Suivre chez le transporteur ↗';
            link.href=u.href;link.rel='noopener noreferrer';link.target='_blank';shipping.append(link);
          }
        }catch{}
      }else shipping.textContent='Pas encore de numéro de suivi confirmé.';
      details.hidden=false;
      refresh.hidden=false;
    }catch{
      // Do not leave previous tracking details visible as if they had just
      // been confirmed during an API outage or a failed authentication.
      details.hidden=true;
      status.textContent='Suivi temporairement indisponible. Aucun nouvel état de paiement ou d’envoi n’est confirmé. Réessayez ou contactez Atelier Montres.';
      refresh.hidden=false;
    }finally{refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  load();
})();
