import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';
import {responsiveAttrs} from './responsive-images.mjs';

const allowedStyles=new Set(['sport','classic','minimal','retro','statement']);
const styleMap={sport:'sport',retro:'retro',compact:'minimal',steel:'classic',dress:'classic'};
const styleLabels={sport:'Sport',classic:'Élégant',minimal:'Minimaliste',retro:'Rétro',statement:'Audacieux'};
const tierLabels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
const movementLabels={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
const safePath=(id,folder)=>'./assets/'+folder+'/'+id+'.webp';
const exactNumericDiameter=(p)=>{
  // A rectangular width/height is NOT a round-case diameter.
  const input=p.case||'';
  const m=/\bdiam[eè]tre\s*(?:annonc[eé]\s*)?(?:de\s*)?(\d{1,2}(?:[,.]\d{1,2})?)\s*mm\b/i.exec(input);
  if(!m)return null;
  const mm=Number(m[1].replace(',','.'));
  return mm>=18&&mm<=65?mm:null;
};

export function buildUnifiedDiscovery({root,coreProducts,affiliates,amazonPartnerTag,pageHead,page,e,u}){
  const extras=JSON.parse(readFileSync(join(root,'selection-populaires.json'),'utf8')).products;
  if(coreProducts.length!==15||extras.length!==37)throw Error('Unified discovery: unexpected source catalogue coverage');
  const approvedPhotos=loadApprovedPopularPhotos({root,picks:extras});
  const directLinks=loadVerifiedPopularLinks({root,picks:extras,affiliates,amazonPartnerTag});
  const coreById=new Map(coreProducts.map(p=>[p.id,p]));
  const ids=new Set();
  const normalized=[];
  function add(item){
    if(ids.has(item.id)||!allowedStyles.has(item.style)||!Object.hasOwn(tierLabels,item.tier))
      throw Error('Unified discovery: duplicate ID or unknown style/tier '+item.id);
    if(!['quartz','eco-drive','automatic'].includes(item.movement)||!/^\.\/montres\/[a-z0-9-]+\.html$/.test(item.detailUrl))
      throw Error('Unified discovery: unsafe movement or detail route '+item.id);
    if(item.photoUrl!==null&&!/^\.\/assets\/(?:watches|watches-popular)\/[a-z0-9-]+\.webp$/.test(item.photoUrl))
      throw Error('Unified discovery: untrusted image '+item.id);
    if(!/^https:\/\/[^/]+/.test(item.officialUrl))throw Error('Unified discovery: official URL must use HTTPS');
    ids.add(item.id);normalized.push(item);
  }
  for(const p of coreProducts){
    const photo=p.photoReview?.publicUsageApproved===true &&
      p.photoReview.localUrl===safePath(p.id,'watches')?safePath(p.id,'watches'):null;
    const d=/^(\d{1,2}(?:[,.]\d{1,2})?)\s*mm$/i.exec(p.specs?.diameter?.trim()||'');
    const diameter=d?Number(d[1].replace(',','.')):null;
    const paid=affiliates.links.get(p.id);
    add({
      id:p.id,kind:'core',brand:p.brand,model:p.model,tier:p.tier,style:p.style,
      movement:p.movement,diameterMm:diameter,caseText:p.specs?.diameter||p.specs?.caseSize||'Dimensions non documentées',
      glass:p.specs?.glass||'Non documenté',water:p.specs?.waterResistance||'Non documenté',
      description:p.description,lead:p.story||p.description,caution:null,officialUrl:p.officialUrl,
      photoUrl:photo,detailUrl:'./montres/'+p.id+'.html',
      merchantUrl:paid?.url||null,merchantKind:paid?'direct':null
    });
  }
  for(const p of extras){
    const photo=approvedPhotos.get(p.id);
    const verified=directLinks.get(p.id);
    const movement=/automatique/i.test(p.movement)?'automatic':/solaire/i.test(p.movement)?'eco-drive':'quartz';
    add({
      id:p.id,kind:'supplemental',brand:p.brand,model:p.model,tier:p.tier,
      style:styleMap[p.style],movement,diameterMm:exactNumericDiameter(p),
      caseText:p.case,glass:p.glass,water:p.water,description:p.category,
      lead:p.lead,caution:p.caution,officialUrl:p.officialUrl,
      photoUrl:photo?safePath(p.id,'watches-popular'):null,
      detailUrl:'./montres/'+p.id+'.html',
      merchantUrl:affiliates.enabled?(verified?.url||'https://www.amazon.fr/s?k='+encodeURIComponent((p.brand+' '+p.model).slice(0,130))+'&tag='+encodeURIComponent(amazonPartnerTag)):null,
      merchantKind:!affiliates.enabled?null:verified?'direct':'search'
    });
  }
  if(normalized.length!==52||new Set(normalized.map(p=>p.id)).size!==52)
    throw Error('Unified discovery: expected 52 distinct exact references');
  // No remote image API, AI image, tracking ID or inferred offer in this feed.
  const feed={version:1,source:'verified_site_catalogues',total:normalized.length,
    coreCount:coreProducts.length,supplementalCount:extras.length,products:normalized};
  writeFileSync(join(root,'discovery-catalogue.json'),JSON.stringify(feed,null,2)+'\n');
  // An affiliate tag is verified upstream by affiliate-policy.mjs. Do not
  // second-guess it here: negative and multi-account fixtures use other tags.
  const photoMarkup=p=>p.photoUrl
    ?'<img src="../'+e(p.photoUrl.slice(2))+'"'
      +(p.kind==='core'?responsiveAttrs(root,coreById.get(p.id),{
        prefix:'../',sizes:'(max-width: 580px) 85vw, (max-width: 850px) 48vw, (max-width: 1220px) 31vw, 24vw',escape:e}):'')
      +' alt="Photographie du modèle '+e(p.brand+' '+p.model)+'" width="540" height="540" loading="lazy" decoding="async">'
    :'<span class="ud-art-fallback"><span class="ud-art-fallback-kicker">Fiche produit documentée</span><span class="ud-art-fallback-brand">'+e(p.brand)+'</span><strong>'+e(p.model)+'</strong><small>Aucune photographie publiée pour cette référence</small></span>';
  const card=p=>{
    const merchantType=p.merchantKind||'official';
    const merchantLabel={direct:'Fiche du modèle identifiée',search:'Recherche marchande · variante à confirmer',official:'Source externe · sans lien d’achat vérifié'}[merchantType];
    const merchant=p.merchantUrl
      ?'<a class="ud-merchant" target="_blank" rel="noopener noreferrer nofollow sponsored" data-amazon-'+(p.merchantKind==='direct'?'product':'search-id')+'="'+e(p.id)+'" data-amazon-placement="popular" href="'+e(p.merchantUrl)+'">'+(p.merchantKind==='direct'?'Voir cette référence sur Amazon.fr':'Rechercher sur Amazon.fr')+' · lien rémunéré</a>'
      :'<a class="ud-merchant ud-merchant-official" target="_blank" rel="noopener noreferrer nofollow" href="'+e(p.officialUrl)+'">Voir la fiche fournisseur</a>';
    return '<article class="ud-card" id="modele-'+e(p.id)+'" data-id="'+e(p.id)+'"'
      +' data-brand="'+e(p.brand)+'" data-tier="'+e(p.tier)+'" data-style="'+e(p.style)+'"'
      +' data-movement="'+e(p.movement)+'" data-merchant="'+merchantType+'" data-visual="'+(p.photoUrl?'photo':'no-photo')+'" data-search="'+e([p.brand,p.model,p.description,p.lead,p.caseText,p.movement].join(' '))+'">'
      +'<div class="ud-media '+(p.photoUrl?'ud-media-verified':'ud-media-no-photo')+'">'
      +'<a class="ud-photo" href="'+e(p.detailUrl.replace('./montres/','./'))+'">'+photoMarkup(p)+'</a>'
      +(p.photoUrl?'<button type="button" class="ud-zoom" data-zoom-id="'+e(p.id)+'" aria-label="Agrandir la photographie de '+e(p.brand+' '+p.model)+'" hidden><span aria-hidden="true">＋</span> Agrandir</button>':'')
      +'<span class="ud-visual-label">'+(p.photoUrl?'Photo du modèle':'Sans photo publiée')+'</span></div>'
      +'<div class="ud-card-main"><p class="ud-kicker">'+e(tierLabels[p.tier])+' · '+e(styleLabels[p.style])+'</p>'
      +'<p class="ud-merchant-kind">'+e(merchantLabel)+'</p>'
      +'<h2><a href="'+e(p.detailUrl.replace('./montres/','./'))+'">'+e(p.brand+' '+p.model)+'</a></h2>'
      +'<p class="ud-description">'+e(p.lead)+'</p>'
      +'<dl><div><dt>Mouvement</dt><dd>'+e(movementLabels[p.movement])+'</dd></div><div><dt>Boîtier</dt><dd>'+e(p.caseText)+'</dd></div></dl>'
      +'<div class="ud-actions"><a class="ud-details" href="'+e(p.detailUrl.replace('./montres/','./'))+'">Voir la fiche et les sources</a>'
      +merchant+'</div>'
      +'<button type="button" class="ud-select" data-compare-id="'+e(p.id)+'" aria-pressed="false" hidden>Ajouter à la comparaison</button>'
      +'</div></article>';
  };
  const path='montres/toutes-les-montres.html';
  const main='<div class="wrap ud-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / Les 52 montres</nav>'
    +'<header class="ud-heading"><span class="eyebrow">Un seul catalogue · 52 références réelles</span>'
    +'<h1>52 montres à découvrir et comparer.</h1><p>Des digitales SKMEI accessibles aux belles mécaniques. Explorez toutes nos références documentées, sans prix inventé ni classement commercial fictif.</p>'
    +'<p class="ud-disclosure">Atelier Montres est un guide indépendant : aucun achat ni paiement ici. Certains liens Amazon sont rémunérés ; une recherche Amazon ne garantit pas le modèle exact. Vérifiez toujours le vendeur, la variante et le tarif avant de commander.</p></header>'
    +'<form id="udFilters" class="ud-filters" role="search" aria-label="Affiner les 52 montres" hidden>'
    +'<label>Recherche<input id="udSearch" type="search" maxlength="100" placeholder="Marque, modèle, caractéristiques…"></label>'
    +'<label>Marque<select id="udBrand"><option value="all">Toutes les marques</option>'
    +[...new Set(normalized.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'fr')).map(brand=>'<option value="'+e(brand)+'">'+e(brand)+'</option>').join('')+'</select></label>'
    +'<label>Style<select id="udStyle"><option value="all">Tous les styles</option>'+Object.entries(styleLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Mouvement<select id="udMovement"><option value="all">Tous les mouvements</option>'+Object.entries(movementLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Gamme<select id="udTier"><option value="all">Toutes les gammes</option>'+Object.entries(tierLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Diamètre documenté<select id="udSize"><option value="all">Toutes les tailles</option><option value="compact">Jusqu’à 38 mm</option><option value="medium">38,1 à 40 mm</option><option value="large">Plus de 40 mm</option><option value="unknown">Non documenté</option></select></label>'
    +'<label>Photographies<select id="udVisual"><option value="all">Toutes les références</option><option value="photo">Avec photo du modèle</option><option value="no-photo">Sans photo publiée</option></select></label>'
    +'<label>Accès marchand<select id="udMerchant"><option value="all">Tous les accès</option><option value="direct">Fiche du modèle identifiée</option><option value="search">Recherche Amazon · modèle à confirmer</option><option value="official">Source externe sans lien d’achat vérifié</option></select></label>'
    +'<button type="reset">Effacer les filtres</button></form>'
    +'<div id="udViewTools" class="ud-view-tools" hidden><p>Affichage du catalogue</p>'
    +'<div role="group" aria-label="Taille des visuels"><button type="button" id="udViewCompact" aria-pressed="true">Grille</button>'
    +'<button type="button" id="udViewLarge" aria-pressed="false">Grands visuels</button></div></div>'
    +'<p class="ud-count" id="udCount" role="status" aria-live="polite">52 modèles sur 52</p>'
    +'<div class="ud-grid" id="udGrid">'+normalized.map(card).join('')+'</div>'
    +'<p id="udEmpty" hidden>Aucun résultat. Essayez une autre marque, un style différent ou effacez les filtres.</p>'
    +'<aside id="udCompareTray" class="ud-tray" aria-label="Votre sélection de montres" hidden>'
    +'<div class="ud-tray-heading"><strong>Votre comparaison</strong><span id="udTrayCount" aria-live="polite">Aucune montre sélectionnée</span></div>'
    +'<ul id="udTrayItems" class="ud-tray-items" aria-label="Montres sélectionnées"></ul>'
    +'<div class="ud-tray-actions"><a id="udTrayOpen" class="ud-tray-open" href="#comparer" hidden>Voir la comparaison</a>'
    +'<button type="button" id="udTrayClear">Tout effacer</button></div></aside>'
    +'<section id="comparer" class="ud-compare" aria-labelledby="udCompareTitle"><h2 id="udCompareTitle">Comparer jusqu’à trois montres</h2><p>Choisissez les modèles depuis les fiches ci-dessus. Les champs non documentés restent signalés comme tels.</p>'
    +'<p id="udCompareStatus" aria-live="polite">Sélectionnez au moins deux modèles.</p><button type="button" id="udCompareClear" hidden>Effacer la comparaison</button>'
    +'<div id="udCompareTable" role="region" tabindex="0" aria-label="Tableau de comparaison des montres" hidden></div></section>'
    +'<p class="ud-back"><a href="../conseiller.html">Utiliser le conseiller pour trouver trois suggestions</a> · <a href="./modeles-populaires.html">Voir les 37 modèles complémentaires</a></p></div>';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',name:'52 montres à découvrir et comparer',url:u(path),inLanguage:'fr-FR',
      description:'Comparateur de montres de marque, avec référence exacte, photos réelles autorisées et caractéristiques documentées.'},
    {'@type':'ItemList',numberOfItems:normalized.length,
      itemListElement:normalized.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}
  ]};
  writeFileSync(join(root,path),page(pageHead({title:'52 montres homme et femme à comparer | Atelier Montres',
    description:'Explorez 52 montres Casio, SKMEI, Citizen, Seiko et autres. Comparez style, mouvement, dimensions vérifiées et liens marchands sans faux prix.',path}),main,graph)
    .replace('</head>','<link rel="stylesheet" href="../unified-discovery.css"><link rel="stylesheet" href="../photo-zoom.css"><script defer src="../photo-zoom.js"></script><script defer src="../unified-discovery.js"></script></head>'));
  return {path,count:normalized.length,coreCount:coreProducts.length,supplementalCount:extras.length};
}
