/**
 * Editorial conversion-readiness shortlist of documented, affordable styles.
 * This is not sales, price, quality, commission or availability ranking.
 * The 15 in-depth watches remain on the homepage; this focuses on the
 * additional 37 models that need product-to-merchant conversion work.
 */
export const commercialShortlist=Object.freeze([
  {id:'addiesdive-ad2030',intent:'Cadran épuré et boîtier compact',reason:'La référence AD2030 offre une silhouette sobre et un boîtier de 36 mm annoncé.',caution:'Vérifier le cadran bleu de la fiche Amazon, la variante du mouvement et le vendeur.'},
  {id:'pagani-pd1701',intent:'Chronographe au style sportif',reason:'Le modèle PD-1701 met en avant une présentation chronographe et le mouvement VK63 documenté.',caution:'La génération, le coloris et le bracelet peuvent varier selon le vendeur.'},
  {id:'skmei-2056',intent:'Montre numérique transparente',reason:'Un style numérique rétro et un boîtier transparent très distinctif.',caution:'Pas de fiche Amazon.fr achetable et vérifiée pour la variante proposée ; contrôler les résultats de recherche.'},
  {id:'skmei-2256',intent:'Montre analogique acier accessible',reason:'Une allure acier sobre avec guichet date, pour comparer un modèle analogique économique.',caution:'Les 3 bar annoncés ne conviennent pas à la natation ; confirmer la finition.'},
  {id:'skmei-2514',intent:'Style rétro numérique sur acier',reason:'Un design de montre numérique rétro avec bracelet acier documenté dans la fiche vendeur.',caution:'Confirmer les dimensions et la couleur du modèle exact avant commande.'},
  {id:'casio-f91w-1',intent:'Numérique minimaliste et classique',reason:'Une référence Casio à affichage digital très identifiable pour un usage quotidien simple.',caution:'Contrôler la variante régionale F-91W-1YER et la disponibilité chez le marchand.'},
  {id:'casio-ga-2100-1a1',intent:'G-SHOCK sport à cadran sombre',reason:'Un design analogique-numérique sportif et un cadran noir distinctif.',caution:'Contrôler le code régional GA-2100-1A1ER sur la fiche commerçant.'},
  {id:'casio-gw-m5610u-1',intent:'G-SHOCK solaire et radiopilotée',reason:'Une alternative sportive au style numérique avec fonctions solaires et radiopilotées documentées.',caution:'Vérifier la variante régionale GW-M5610U-1ER, l’expédition et la garantie.'},
  {id:'pagani-pd1776',intent:'Boîtier compact et style soigné',reason:'Un format compact et un mouvement quartz annoncé pour une montre habillée polyvalente.',caution:'La recherche Amazon n’atteste pas que la variante exacte est proposée.'},
  {id:'skmei-1874',intent:'Petit format à bracelet acier',reason:'Une alternative SKMEI de style compact et bracelet acier, pour comparer les proportions.',caution:'Vérifier la taille et le code modèle chez le vendeur avant d’acheter.'}
].map(x=>Object.freeze(x)));

/**
 * Render an accessible crawlable, internal-link-only priority list.
 * Every member must exist in the model source. Availability is never inferred.
 */
export function buildCommercialShortlist({picks,verifiedLinks,partnerOffers,partnerLink,approvedPhotos,affiliatesEnabled,link,e}){
  if(!(partnerOffers instanceof Map)||typeof partnerLink!=='function')throw Error('Partner links require approved registry and validated renderer');
  if(typeof link!=='function')throw Error('A validated outbound merchant link renderer is required');
  if(!Array.isArray(picks)||picks.length!==37)throw Error('Commercial shortlist requires the 37 documented supplemental watches');
  const byId=new Map(picks.map(p=>[p.id,p]));
  if(byId.size!==37||commercialShortlist.length!==10||
     new Set(commercialShortlist.map(p=>p.id)).size!==10)
    throw Error('Commercial shortlist ids are duplicate or malformed');
  const entries=commercialShortlist.map((item,index)=>{
    const watch=byId.get(item.id);
    if(!watch)throw Error('Commercial shortlist model missing from catalog: '+item.id);
    for(const field of ['intent','reason','caution']){
      if(typeof item[field]!=='string'||item[field].length<25||item[field].length>270)
        throw Error('Unusable commercial shortlist editorial field: '+item.id+'/'+field);
    }
    const photo=approvedPhotos.get(item.id);
    const direct=verifiedLinks.get(item.id);
    const partner=partnerOffers.get(item.id);
    const status=partner
      ?'Lien Awin généré pour une référence documentée · vérifier variante et disponibilité chez le marchand'
      :!affiliatesEnabled
        ?'Aucun lien Amazon.fr rémunéré actif · consulter les sources de cette référence'
        :direct
          ?'Fiche Amazon.fr correspondant au code modèle · variante, prix et stock à contrôler'
          :'Recherche Amazon.fr uniquement · modèle et disponibilité non garantis';
    // The first outbound option prioritises a documented, directly matching
    // Amazon listing only when affiliate links are enabled. Otherwise use
    // the existing model-specific vendor/manufacturer reference, never a
    // generic Amazon search disguised as an exact product.
    const merchantAction=affiliatesEnabled&&direct
      ?link(direct.url,'Consulter la fiche Amazon.fr · lien rémunéré',true,item.id,'product')
      :partner?partnerLink(watch)
        :link(watch.officialUrl,'Consulter la fiche chez le vendeur · lien non rémunéré',false,item.id,'official');
    const alternativePartner=affiliatesEnabled&&direct&&partner
      ?'<div class="am-focus-merchant">'+partnerLink(watch)+'</div>':'';
    const variantNotice=affiliatesEnabled&&direct?.marketplaceVariant
      ?'<p class="am-focus-variant"><strong>Variante de la fiche Amazon :</strong> '+e(direct.marketplaceVariant)+'</p>'
      :'';
    return '<li class="am-focus-item" data-focus-id="'+e(item.id)+'">'
      +'<div class="am-focus-visual'+(photo?' am-focus-with-photo':'')+'">'
      +(photo?'<img src="../'+e(photo.url)+'" alt="Montre '+e(watch.brand+' '+watch.model)+'" loading="lazy" decoding="async" width="380" height="260">':
        '<span class="am-focus-text-placeholder">Photographie du modèle sur la fiche de référence</span>')
      +'</div><div class="am-focus-body"><span class="am-focus-order">Sélection '+String(index+1).padStart(2,'0')+' / 10 · '+e(watch.tier==='essential'?'Gamme essentielle':'Gamme signature')+'</span>'
      +'<h3><a href="./'+e(item.id)+'.html">'+e(watch.brand+' '+watch.model)+'</a></h3>'
      +'<p class="am-focus-intent">'+e(item.intent)+'</p>'
      +'<p>'+e(item.reason)+'</p>'
      +'<p class="am-focus-caution"><strong>À vérifier :</strong> '+e(item.caution)+'</p>'
      +'<p class="am-focus-status">'+e(status)+'</p>'
      +variantNotice
      +'<div class="am-focus-actions"><a class="am-focus-detail" href="./'+e(item.id)+'.html">Voir les caractéristiques et les sources</a>'
      +'<div class="am-focus-merchant">'+merchantAction+'</div>'+alternativePartner+'</div>
      +'</div></li>';
  });
  const directCount=commercialShortlist.filter(p=>verifiedLinks.has(p.id)).length;
  // Affiliate-publication tests deliberately build with no paid links and
  // with photo permissions withdrawn. The shortlist must gracefully fall back
  // to honest source links rather than refuse a safety-focused build.
  const merchantExplanation=partnerOffers.size
    ?directCount+' modèles disposent d’une fiche Amazon.fr documentée ; '+partnerOffers.size+' référence(s) disposent aussi d’un lien Awin validé par le registre. Les autres possèdent une fiche vendeur. Aucune commission ni livraison n’est garantie.'
    :affiliatesEnabled
      ?directCount+' modèles disposent d’une fiche Amazon.fr documentée ; les autres possèdent une fiche vendeur, sans promesse de stock, de livraison en France ni de commission. Les recherches Amazon génériques restent identifiées comme telles sur chaque fiche détaillée.'
      :'Aucun lien Amazon.fr rémunéré n’est activé dans cette configuration ; les fiches documentaires et les sources restent accessibles.';
  return '<section id="selection-10-montres" class="am-commercial-focus" aria-labelledby="am-focus-heading">'
    +'<div class="am-focus-heading"><p class="eyebrow">10 modèles à étudier en priorité · sélection éditoriale</p>'
    +'<h2 id="am-focus-heading">Dix styles accessibles à comparer avant d’acheter.</h2>'
    +'<p>Une sélection guidée par la variété des styles, des fiches de référence et des photos disponibles. '
    +'Ce n’est ni un classement des ventes en France, ni une mesure de popularité, ni une promesse de meilleur prix. '
    +merchantExplanation+'</p></div>'
    +'<ol class="am-focus-list">'+entries.join('')+'</ol>'
    +'<p class="am-focus-endnote">Les images locales sont publiées sur la base d’autorisations déclarées par l’éditeur et non vérifiées indépendamment. Les références sans photo locale renvoient à leur fiche constructeur ou vendeur. Aucun prix, stock, livraison ni essai au poignet n’est inventé. <a href="./toutes-les-montres.html">Comparer l’ensemble des 52 montres</a>.</p>'
    +'</section>';
}
