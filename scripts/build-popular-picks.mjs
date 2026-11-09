import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildPopularProductPages} from './build-popular-product-pages.mjs';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadPopularAiVisuals} from './popular-ai-visuals.mjs';
import {buildShopperSelections} from './build-shopper-selections.mjs';
import {buildCommercialShortlist,commercialShortlist} from './build-commercial-shortlist.mjs';
import {responsivePopularAttrs} from './responsive-images.mjs';

// Curated discovery intentionally stays outside the 15-watch comparator until
// individual Amazon ASINs and licensed exact-model images are validated.
// This prevents an invented product match or silently unlicensed photograph.
export function buildPopularPicks({root,existingProducts,affiliates,amazonPartnerTag,pageHead,page,e,u,comparisonLinks=new Map(),commercialRegistry}){
  const source=JSON.parse(readFileSync(join(root,'selection-populaires.json'),'utf8'));
  const picks=source.products;
  if(!(commercialRegistry instanceof Map)||commercialRegistry.size!==52||
    picks.some(p=>!commercialRegistry.has(p.id)))
    throw Error('Supplemental pages require validated commercial model evidence');
  const known=new Set(existingProducts.map(p=>p.id));
  const tiers=['essential','signature','prestige'];
  const tierNames={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
  const permittedHosts=['casio.com','citizenwatch.eu','orientwatch.fr','tissotwatches.com','seikowatches.com','hamiltonwatch.com','shopskmei.com','skmei-egy.com','addiesdivewatches.com','paganidesignwatch.com','paganidesign.com','currenwatches.com'];
  const evidenceHosts=['montre.com',...permittedHosts];
  const validHost=(url,hosts)=>{
    try{
      const u=new URL(url);
      return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash
        &&hosts.some(host=>u.hostname===host||u.hostname.endsWith('.'+host));
    }catch{return false}
  };
  if(source.version!==1||source.photoRights!=='not_cleared'
    ||source.amazonProductAsins!=='partly_verified_exact_listings'
    ||!/^(20)\d{2}-\d{2}-\d{2}$/.test(source.reviewedOn)
    ||!Array.isArray(picks)||picks.length<13||picks.length>40)throw Error('Supplemental product catalog invalid');
  for(const p of picks){
    if(!p||!/^[a-z0-9-]{4,64}$/.test(p.id)||known.has(p.id))throw Error('Popular watch ID duplicate or malformed');
    known.add(p.id);
    if(!tiers.includes(p.tier)||!['retro','sport','compact','steel','dress'].includes(p.style))throw Error('Unknown watch merchandising style: '+p.id);
    for(const key of ['brand','model','category','movement','case','glass','water','lead','caution']){
      if(typeof p[key]!=='string'||p[key].trim().length<3||p[key].length>450)throw Error('Incomplete or oversize watch fact: '+p.id+'/'+key);
    }
    if(!validHost(p.officialUrl,permittedHosts))throw Error('Missing trustworthy manufacturer page: '+p.id);
    const evidence=p.marketEvidence;
    if(!evidence||!['manufacturer_bestseller','retailer_bestseller','editorial'].includes(evidence.kind)
       ||typeof evidence.label!=='string'||evidence.label.length<15||evidence.label.length>180
       ||!validHost(evidence.url,evidenceHosts))throw Error('Missing specific source for selected watch: '+p.id);
  }
  if(tiers.some(t=>picks.filter(p=>p.tier===t).length<3))throw Error('All three ranges need at least three additional references');
  if(affiliates.enabled&&!/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(amazonPartnerTag||''))throw Error('Amazon tag missing or malformed');
  // Amazon explicitly permits tagged links to product search result lists.
  // Never call such an outbound link a verified exact product or an ASIN.
  const amazonSearch=p=>'https://www.amazon.fr/s?k='
    +encodeURIComponent((p.brand+' '+p.model).slice(0,130))
    +'&tag='+encodeURIComponent(amazonPartnerTag);
  const link=(href,txt,commercial=false,id='',kind='search',placement='popular')=>'<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer nofollow'+(commercial?' sponsored':'')+'"'
    +(commercial&&kind!=='partner'?' data-amazon-'+(kind==='product'?'product':'search-id')+'="'+e(id)+'" data-amazon-placement="'+e(placement)+'"':'')
    +(commercial&&kind==='partner'?' data-partner-offer-id="'+e(id)+'" data-partner-placement="'+e(placement)+'"':'')
    +(kind==='official'&&!commercial?' data-merchant-official-id="'+e(id)+'" data-merchant-placement="'+e(placement)+'"':'')
    +'>'+e(txt)+'</a>';
  const verifiedLinks=loadVerifiedPopularLinks({root,picks,affiliates,amazonPartnerTag});
  const partnerOffers=loadApprovedPartnerOffers({root,picks});
  const approvedPhotos=loadApprovedPopularPhotos({root,picks});
  const aiVisuals=loadPopularAiVisuals({root,picks});
  const shopper=buildShopperSelections({root,coreProducts:existingProducts,picks,partners:affiliates,verifiedPopularLinks:verifiedLinks,approvedPopularPhotos:approvedPhotos,amazonSearch,pageHead,page,e,u});
  const partnerLink=p=>{
    const offer=partnerOffers.get(p.id);
    return offer?link(offer.url,'Voir cette référence via Awin · lien rémunéré',true,p.id,'partner'):'';
  };
  const commercialFocus=buildCommercialShortlist({picks,verifiedLinks,partnerOffers,partnerLink,approvedPhotos,affiliatesEnabled:affiliates.enabled,link,e,commercialRegistry});
  const affiliateLink=p=>{
    if(!affiliates.enabled)return '';
    const direct=verifiedLinks.get(p.id);
    return direct
      ?link(direct.url,direct.evidenceType==='amazon_fr_comparator_redirect'
        ?'Consulter l’ASIN recoupé sur Amazon.fr · lien rémunéré'
        :'Consulter la fiche Amazon.fr documentée · lien rémunéré',true,p.id,'product')
      :link(amazonSearch(p),'Rechercher sur Amazon.fr · référence à vérifier · lien rémunéré',true,p.id,'search');
  };
  const detailPaths=buildPopularProductPages({root,products:picks,coreProducts:existingProducts,affiliates,amazonPartnerTag,pageHead,page,e,u,link,amazonSearch,tierNames,affiliateLink,partnerLink,partnerOffers,verifiedLinks,approvedPhotos,aiVisuals,comparisonLinks});
  const movementKind=p=>p.movement.startsWith('Automatique')?'automatic':p.movement.startsWith('Quartz solaire')?'solar':'quartz';
  const card=(p,front=false)=>{
    const photo=approvedPhotos.get(p.id);
    const ai=aiVisuals.get(p.id);
    const claim=p.marketEvidence.kind==='editorial'?'Sélection éditoriale':p.marketEvidence.kind==='manufacturer_bestseller'?'Signal marque':'Signal distributeur';
    const listing=verifiedLinks.get(p.id);
    // This is a documented mapping, NOT an inspected live Amazon offer.
    // Do not turn a comparator redirect or a generic search into stock proof.
    const merchantRoute=affiliates.enabled
      ?listing?.evidenceType==='amazon_fr_comparator_redirect'?'comparator'
        :listing?'asin':'search'
      :partnerOffers.has(p.id)?'partner':'official';
    const merchantTitle=merchantRoute==='comparator'?'ASIN recoupé via sources tierces'
      :merchantRoute==='asin'?'Fiche Amazon.fr documentée'
      :merchantRoute==='search'?'Recherche Amazon.fr, offre non identifiée'
      :merchantRoute==='partner'?'Référence chez un partenaire':'Fiche de référence constructeur';
    const merchantNote=listing
      ?'ASIN '+listing.asin+' · contrôle documentaire '+listing.verifiedAt
        +' · variante, prix et stock à vérifier'
      :merchantRoute==='search'
        ?'Aucun ASIN exact documenté ici ; vérifier le code modèle dans les résultats.'
        :'Le prix, la variante et la disponibilité restent à vérifier auprès du vendeur.';
    const merchantGuide='<div class="am-pick-merchant-guide" data-merchant-route="'+merchantRoute+'">'
      +'<span class="am-pick-merchant-eyebrow">Avant de suivre le lien</span>'
      +'<strong>'+e(merchantTitle)+'</strong><small>'+e(merchantNote)+'</small></div>';
    return '<article class="am-pick-card am-pick-'+e(p.style)+(verifiedLinks.has(p.id)?' am-pick-direct':'')+'" id="pick-'+e(p.id)+'"'
      +' data-pick-id="'+e(p.id)+'" data-pick-tier="'+e(p.tier)+'" data-pick-style="'+e(p.style)+'"'
      +' data-pick-movement="'+movementKind(p)+'" data-pick-photo="'+(photo?'yes':'no')+'"'
      +' data-pick-match="'+(verifiedLinks.has(p.id)?'yes':'no')+'"'
      +' data-pick-search="'+e([p.brand,p.model,p.category,p.movement,p.lead].join(' '))+'">'
      +'<div class="am-pick-visual" role="group" aria-label="'+(photo?'Photographie de la référence exacte · autorisation déclarée':'Repère graphique non contractuel, sans photographie du modèle')+'"><span class="am-pick-visual-top">'+e(p.category)+'</span>'
      +(photo?'<img class="am-pick-licensed-photo" loading="lazy" decoding="async" width="'+photo.width+'" height="'+photo.height+'" alt="Montre '+e(p.brand+' '+p.model)+'" src="'+(front?'./':'../')+e(photo.url)+'"'
        +responsivePopularAttrs(root,p,photo,{
          prefix:front?'./':'../',
          sizes:'(max-width:650px) 43vw, (max-width:1020px) 23vw, 16vw',
          escape:e
        })+'>':'')
      +'<span class="am-pick-visual-name">'+e(p.brand)+'</span><span class="am-pick-visual-ref">'+e(p.model)+'</span>'
      +(!photo&&p.brand==='SKMEI'?'<span class="am-budget-watch" aria-hidden="true"><span class="am-budget-dial"></span></span>':'')
      +'<span class="am-pick-visual-caption">'+(photo?'Photo de marque · accord déclaré · '+e(photo.rightsHolder):'Repère graphique · photo exacte chez le vendeur ou la marque')+'</span></div>'
      +'<div class="am-pick-content"><p class="am-pick-kicker"><span>'+e(tierNames[p.tier])+'</span><span>'+e(claim)+'</span></p>'
      +(verifiedLinks.has(p.id)?'<p class="am-pick-exact">'+(verifiedLinks.get(p.id)?.evidenceType==='amazon_fr_comparator_redirect'
        ?'Référence et ASIN recoupés via comparateur · fiche Amazon.fr non consultée directement · prix et stock à vérifier'
        :'Fiche de référence Amazon.fr identifiée · prix et stock à vérifier')
        +(verifiedLinks.get(p.id)?.marketplaceVariant?' · Variante : '+e(verifiedLinks.get(p.id).marketplaceVariant):'')+'</p>':'')
      +'<h3><a class="am-pick-detail-link" href="'+(front?'./montres/':'./')+e(p.id)+'.html">'+e(p.brand+' '+p.model)+'</a></h3>'
      +(ai?'<figure class="am-pick-ai-preview"><img loading="lazy" decoding="async" width="768" height="768" src="'+e(ai.url)+'" alt="Interprétation artistique générée par IA de la montre '+e(p.brand+' '+p.model)+' ; visuel non contractuel"><figcaption><strong>Création IA</strong> · interprétation non contractuelle. La photo produit réelle figure au-dessus.</figcaption></figure>':'')
      +'<p class="am-pick-lead">'+e(p.lead)+'</p>'
      +'<dl class="am-pick-specs"><div><dt>Mouvement</dt><dd>'+e(p.movement)+'</dd></div><div><dt>Boîtier</dt><dd>'+e(p.case)+'</dd></div><div><dt>Verre</dt><dd>'+e(p.glass)+'</dd></div><div><dt>Étanchéité</dt><dd>'+e(p.water)+'</dd></div></dl>'
      +merchantGuide
      +(front?'':'<p class="am-pick-caution"><strong>Avant achat :</strong> '+e(p.caution)+'</p>')
      +'<div class="am-pick-actions">'
      +affiliateLink(p)
      +partnerLink(p)
      +link(p.officialUrl,p.brand==='SKMEI'?'Photos et fiche vendeur':'Photos et fiche fabricant',false,p.id,'official')
      +'</div><p class="am-pick-source">Pourquoi ici ? '+link(p.marketEvidence.url,p.marketEvidence.label)+'</p>'
      +'<p class="am-pick-note">'+(verifiedLinks.has(p.id)?'Lien vers une fiche Amazon.fr correspondant à la référence documentée. Vérifiez la variante, le vendeur, le prix et la disponibilité lors de la visite.':'La recherche Amazon peut présenter des variantes ou d’autres produits. Vérifier la référence exacte, le vendeur et le prix avant de commander.')+'</p>'
      +'</div></article>';
  };
  // Premium, source-backed shopping path near the very top of the homepage.
  // All displayed references exist in the 37-watch research catalogue. These
  // are editorial affordable-style choices, NOT asserted prices/bestsellers.
  // The default product action must remain usable with JavaScript disabled.
  const affordableIds=['skmei-1257','skmei-1251','addiesdive-ad2030','pagani-pd1701'];
  const affordable=affordableIds.map(id=>picks.find(p=>p.id===id));
  if(affordable.some(p=>!p)||new Set(affordableIds).size!==4)
    throw Error('Affordable showroom must contain four distinct researched watches');
  if(affiliates.enabled&&affordable.some(p=>!verifiedLinks.has(p.id)))
    throw Error('Affordable merchant showroom requires four documented exact ASIN destinations');
  // Pairs use exact local catalogue IDs; they compare factual sources rather
  // than claiming identical quality or a measured sales/price ranking.
  const affordablePairs={
    'skmei-1257':'skmei-1251',
    'skmei-1251':'skmei-1257',
    'addiesdive-ad2030':'pagani-pd1701',
    'pagani-pd1701':'addiesdive-ad2030'
  };
    const affordableCard=p=>{
    const photo=approvedPhotos.get(p.id);
    const direct=verifiedLinks.get(p.id);
    const viaComparator=direct?.evidenceType==='amazon_fr_comparator_redirect';
    const other=affordable.find(q=>q.id===affordablePairs[p.id]);
    if(!other||other.id===p.id)throw Error('Affordable comparison must use a distinct actual watch model: '+p.id);
    const compareLink='./montres/toutes-les-montres.html?compare='+encodeURIComponent(p.id+','+other.id)+'#comparer';
    const label=viaComparator?'ASIN recoupé via comparateur'
      :direct?'Fiche Amazon.fr documentée':'Référence et vendeur documentés';
    const merchant=direct
      ?link(direct.url,'Voir la fiche Amazon.fr · lien rémunéré',true,p.id,'product','showroom')
      :link(p.officialUrl,'Voir la fiche de la marque · lien non rémunéré',false,p.id,'official','showroom');
    return '<article class="am-affordable-card" data-affordable-id="'+e(p.id)+'"'
      +' data-affordable-proof="'+(viaComparator?'comparator':direct?'listing':'source')+'">'
      +'<a class="am-affordable-media" href="./montres/'+e(p.id)+'.html" aria-label="Voir la fiche de '+e(p.brand+' '+p.model)+'">'
      +(photo?'<img src="./'+e(photo.url)+'" alt="Montre '+e(p.brand+' '+p.model)+' — photo du modèle"'
        +' width="440" height="440" loading="lazy" decoding="async">'
        :'<span class="am-affordable-no-photo"><strong>'+e(p.brand)+'</strong><small>Photo exacte sur la fiche vendeur</small></span>')
      +'</a><div class="am-affordable-body"><span class="am-affordable-category">'+e(p.category)+'</span>'
      +'<h3><a href="./montres/'+e(p.id)+'.html">'+e(p.brand+' '+p.model)+'</a></h3>'
      +'<p class="am-affordable-lead">'+e(p.lead)+'</p>'
      +'<p class="am-affordable-proof">'+e(label)+'</p>'
      +(direct?.marketplaceVariant?'<p class="am-affordable-variant"><strong>Variante à contrôler :</strong> '
        +e(direct.marketplaceVariant)+'</p>':'')
      +(viaComparator?'<p class="am-affordable-comparator">La page Amazon.fr n’a pas été consultée directement : référence et ASIN recoupés via des sources tierces.</p>':'')
      +'<div class="am-affordable-actions"><a class="am-affordable-detail" href="./montres/'+e(p.id)+'.html">Caractéristiques et sources</a>'
      +'<a class="am-affordable-compare" href="'+e(compareLink)+'" data-affordable-compare="'+e(p.id)+'">Comparer avec '+e(other.brand+' '+other.model)+'</a>'
      +merchant+'</div></div></article>';
  };
  const budgetShowcase='<section class="am-affordable" id="selection-accessible" aria-labelledby="amAffordableTitle">'
    +'<div class="wrap"><div class="am-affordable-header"><div>'
    +'<p class="am-affordable-eyebrow">Montres accessibles · sélection éditoriale</p>'
    +'<h2 id="amAffordableTitle">Quatre styles à découvrir, sans détour.</h2>'
    +'</div><p>Deux digitales SKMEI, une ADDIESDIVE au cadran épuré et un chronographe Pagani Design.'
    +' Des photographies des modèles et des références marchandes documentées, sans prix, stock ni classement de ventes inventés.</p></div>'
    +'<p class="am-affordable-swipe">Sur téléphone, glissez horizontalement pour découvrir les quatre modèles.</p>'
    +'<div class="am-affordable-grid" role="region" tabindex="0" aria-label="Galerie de quatre montres accessibles ; défilement horizontal sur mobile">'+affordable.map(affordableCard).join('')+'</div>'
    +'<div class="am-affordable-footer"><p>Les liens Amazon.fr peuvent être rémunérés. Une correspondance ASIN ne garantit pas le prix, le vendeur,'
    +' la livraison ni la variante en stock. Les droits de publication des photos reposent sur les déclarations de l’éditeur,'
    +' non vérifiées indépendamment.</p>'
    +'<a href="#duels-accessibles">Quatre comparaisons pour choisir entre les modèles</a>'
    +'<a href="./montres/montres-skmei.html">Explorer les dix modèles SKMEI</a>'
    +'<a href="./montres/toutes-les-montres.html?merchant=direct&sort=direct">Voir les références avec fiche Amazon identifiée</a></div>'
    +'</div></section>';
  const featuredIds=['casio-gw-m5610u-1','skmei-2056','skmei-2256','casio-ga-2100-1a1','skmei-1257','casio-f91w-1','addiesdive-ad2030','pagani-pd1701'];
  const featured=featuredIds.map(id=>picks.find(p=>p.id===id));
  if(featured.some(p=>!p))throw Error('Featured model not in source catalog');
  const photoDisclaimer=approvedPhotos.size
    ?approvedPhotos.size+' photographies de modèles supplémentaires sont publiées sur la base d’autorisations déclarées par l’éditeur, non vérifiées indépendamment. Les autres photos restent consultables sur les sites sources.'
    :'Aucune photographie supplémentaire n’est publiée sans déclaration de droits de reproduction; les photos exactes restent sur les sites sources.';
  const globalDisclaimer='Ces références complètent les 15 modèles du comparateur. Certaines figurent sur des pages de meilleures ventes de fabricants ou de distributeurs ; ce ne sont pas les meilleures ventes mesurées sur Amazon.fr. Aucun tarif, stock, note ou volume de ventes n’est déduit de ces sources. '+photoDisclaimer+'';
  const affiliateNote=(affiliates.enabled
    ?'Les liens Amazon portent notre identifiant Partenaires. Une fiche directe dispose d’une correspondance de référence documentée ; les autres liens mènent à une recherche. Aucun lien ne garantit la disponibilité, le tarif ou l’approbation définitive de notre compte.'
    :'Aucun lien Amazon rémunéré n’est activé.')
    +(partnerOffers.size?' Des liens Awin rémunérés supplémentaires sont explicitement identifiés sur '+partnerOffers.size+' référence(s), sans garantie d’achat ou de commission.':'');
  const teaser='<section class="am-picks" id="modeles-populaires" aria-labelledby="am-picks-title"><div class="wrap">'
    +'<div class="am-picks-heading"><p class="overline kicker">01 · MODÈLES COMPLÉMENTAIRES</p>'
    +'<h2 id="am-picks-title">Des références remarquées, au-delà des 15 montres comparées.</h2>'
    +'<p>SKMEI, Curren et ADDIESDIVE à petit budget, Casio et Pagani Design : huit pistes pour explorer nos '+picks.length+' montres documentées, dont des Casio, ADDIESDIVE et Pagani Design avec fiche Amazon.fr correspondant à la référence documentée (variante à vérifier). Aucun prix ni stock annoncé.</p>'
    +'</div>'+shopper.navHome+'<p class="am-focus-promo">10 montres pour choisir sans confusion : '
    +(affiliates.enabled?commercialShortlist.filter(x=>verifiedLinks.has(x.id)).length+' références avec ASIN Amazon.fr documenté et '
      +(commercialShortlist.length-commercialShortlist.filter(x=>verifiedLinks.has(x.id)).length)+' alternatives à explorer chez le vendeur. '
      :'sources fabricant et fiches documentaires accessibles, sans liens Amazon rémunérés actifs. ')
    +'<a href="./montres/modeles-populaires.html#selection-10-montres">Comparer les 10 modèles selon les preuves disponibles</a>. '
    +'Ni stock actuel, ni classement de ventes, ni commission garantie.</p><div class="am-picks-grid">'
    +featured.map(p=>card(p,true)).join('')+'</div>'
    +'<p class="am-picks-disclaimer">'+e(globalDisclaimer)+' '+e(affiliateNote)+'</p>'
    +'<a class="am-picks-more" href="./montres/modeles-populaires.html">Voir les '+picks.length+' modèles supplémentaires, par gamme →</a>'
    +'</div></section>';
  const sections=tiers.map(t=>'<section class="am-picks-tier" aria-label="Gamme '+e(tierNames[t])+'">'
    +'<h2 id="gamme-'+e(t)+'">Gamme '+e(tierNames[t])+'</h2>'
    +'<div class="am-picks-grid">'+picks.filter(p=>p.tier===t).map(p=>card(p)).join('')+'</div></section>').join('');
  const filters='<form class="am-pick-filters" id="am-pick-filters" role="search" aria-label="Filtrer les '+picks.length+' montres complémentaires" hidden>'
    +'<div class="am-pick-filter-fields">'
    +'<label class="am-pick-filter-field" for="am-filter-query"><span>Marque, modèle ou usage</span><input id="am-filter-query" name="recherche" type="search" placeholder="Ex. solaire, Tsuyosa, sport" maxlength="80" autocomplete="off"></label>'
    +'<label class="am-pick-filter-field" for="am-filter-tier"><span>Gamme</span><select id="am-filter-tier" name="gamme"><option value="">Toutes les gammes</option><option value="essential">Essentielle</option><option value="signature">Signature</option><option value="prestige">Prestige</option></select></label>'
    +'<label class="am-pick-filter-field" for="am-filter-style"><span>Style</span><select id="am-filter-style" name="style"><option value="">Tous les styles</option><option value="sport">Sport / robuste</option><option value="steel">Acier / sport chic</option><option value="dress">Habillée</option><option value="retro">Rétro</option><option value="compact">Compacte / colorée</option></select></label>'
    +'<label class="am-pick-filter-field" for="am-filter-movement"><span>Mouvement</span><select id="am-filter-movement" name="mouvement"><option value="">Tous les mouvements</option><option value="automatic">Automatique</option><option value="quartz">Quartz</option><option value="solar">Solaire</option></select></label>'
    +'</div><fieldset class="am-pick-filter-proofs"><legend>Afficher uniquement</legend>'
    +'<label class="am-pick-proof-option" for="am-filter-photo"><input type="checkbox" id="am-filter-photo" name="photo-publiee"><span>Avec photo réelle publiée du modèle</span></label>'
    +'<label class="am-pick-proof-option" for="am-filter-match"><input type="checkbox" id="am-filter-match" name="asin-documente"><span>Avec correspondance Amazon.fr documentée</span></label>'
    +'<p class="am-pick-filter-explainer">Une correspondance de référence ne garantit ni la variante disponible, ni le vendeur, ni le tarif.</p>'
    +'</fieldset><div class="am-pick-filter-footer"><output id="am-pick-filter-count" for="am-filter-query am-filter-tier am-filter-style am-filter-movement am-filter-photo am-filter-match" aria-live="polite" aria-atomic="true">'+picks.length+' modèles sur '+picks.length+'</output>'
    +'<button type="reset">Effacer les filtres</button></div></form>';
  const emptyMessage='<p id="am-pick-filter-empty" class="am-pick-filter-empty" role="status" hidden>Aucun modèle ne correspond à ces critères. Effacez un filtre ou essayez une autre référence.</p>';
  const path='montres/modeles-populaires.html';
  const main='<div class="wrap am-picks-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / Modèles complémentaires</nav>'
    +'<header class="am-picks-intro"><p class="eyebrow">Tendances documentées · '+e(source.reviewedOn)+'</p>'
    +'<h1>'+picks.length+' montres supplémentaires : modèles repérés et choix de style.</h1>'
    +'<p class="lead">Des références identifiées dans des listes de meilleures ventes propres à certains vendeurs ou marques, ainsi que des alternatives choisies pour leur design. Notre sélection est éditoriale, pas un classement des ventes françaises ou Amazon.</p>'
    +'<p>'+e(globalDisclaimer)+'</p><p>'+e(affiliateNote)+'</p>'
    +'<nav class="am-picks-tier-nav" aria-label="Choisir une gamme"><a href="#pick-skmei-2056">SKMEI · petit budget</a>'
    +tiers.map(t=>'<a href="#gamme-'+e(t)+'">'+e(tierNames[t])+'</a>').join('')
    +'</nav>'+shopper.navPopular+'</header>'+commercialFocus+filters+'<div id="am-picks-list">'+sections+'</div>'+emptyMessage
    +'<aside class="am-picks-method"><h2>Comment ces montres sont-elles sélectionnées ?</h2>'
    +'<p>Chaque code de modèle et caractéristique sont rapprochés de la fiche de la marque ou du distributeur cité. Les mentions « meilleures ventes » décrivent uniquement la liste citée, à la date du '+e(source.reviewedOn)+'. Elles ne constituent pas des données de ventes Amazon ni un palmarès national.</p>'
    +'<p>Nous n’affichons pas de photographie d’un modèle sans autorisation de reproduction, ni de prix Amazon non synchronisé. Les recherches Amazon.fr sont explicitement annoncées comme telles et peuvent mener à plusieurs variantes. Seules les références contrôlées sur une fiche Amazon.fr disposent d’un lien direct. Pour comparer directement des modèles aux photographies locales déjà documentées, <a href="../index.html#montres">revenir aux 15 montres du comparateur</a>.</p></aside></div>';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',name:picks.length+' modèles de montres complémentaires',url:u(path),inLanguage:'fr-FR',description:'Sélection éditoriale fondée sur des sources fabricants et des listes de meilleures ventes distinctes. Aucun classement Amazon revendiqué.'},
    {'@type':'ItemList',numberOfItems:picks.length,itemListElement:picks.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}
  ]};
  writeFileSync(join(root,path),page(pageHead({title:picks.length+' montres à découvrir : SKMEI, Casio, ADDIESDIVE, Pagani | Atelier Montres',description:picks.length+' montres sourcées, dont SKMEI accessibles : rétro, sport, acier, quartz et automatiques. Recherches Amazon signalées.',path}),main,graph).replace('</head>','<link rel="stylesheet" href="../popular-picks.css"><script defer src="../popular-filters.js"></script></head>'));
  return {path,detailPaths,shopperPaths:shopper.paths,teaser,budgetShowcase,count:picks.length,featuredCount:featured.length,searchLinks:affiliates.enabled?picks.length-verifiedLinks.size:0,directLinks:verifiedLinks.size,partnerAffiliateLinks:partnerOffers.size};
}
