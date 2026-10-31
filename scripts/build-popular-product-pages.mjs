import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Conversion-friendly product landing pages without unlicensed watch images,
// invented Amazon ASINs, or unverifiable prices. The existing 15 core models
// continue to own the photo-backed interactive comparison experience.
export function buildPopularProductPages({root,products,coreProducts,affiliates,pageHead,page,e,u,link,tierNames,affiliateLink,verifiedLinks,approvedPhotos,aiVisuals}){
  const byId=new Map(coreProducts.map(p=>[p.id,p]));
  const related={
    sport:['casio-mdv107','seiko-5','hamilton-khaki'],
    retro:['casio-a168wa','casio-mtp-b145','swatch-clearly'],
    compact:['casio-ltp1302','orient-bambino','casio-a168wa'],
    steel:['citizen-tsuyosa','tissot-prx-quartz','seiko-sharp'],
    dress:['orient-bambino','citizen-openheart','hamilton-khaki']
  };
  const paths=[];
  for(const p of products){
    const name=p.brand+' '+p.model;
    const photo=approvedPhotos.get(p.id);
    const ai=aiVisuals.get(p.id);
    const path='montres/'+p.id+'.html';
    const keyFacts=[
      ['Mouvement',p.movement],
      ['Boîtier',p.case],
      ['Verre',p.glass],
      ['Étanchéité',p.water]
    ];
    const category=p.marketEvidence.kind==='manufacturer_bestseller'
      ?'Signal présenté par le fabricant':p.marketEvidence.kind==='retailer_bestseller'
        ?'Référence signalée par un distributeur':'Choix de la rédaction';
    const ranking=p.marketEvidence.kind==='editorial'
      ?'Ce modèle est proposé comme une alternative de style, et non comme une meilleure vente mesurée.'
      :'Le signal de popularité provient uniquement de la source citée. Il ne s’agit pas d’un classement Amazon.fr ni d’un volume de ventes nationales.';
    const suggestions=(related[p.style]||[]).map(id=>byId.get(id));
    if(suggestions.length!==3||suggestions.some(x=>!x))throw Error('Missing source-backed core comparison for '+p.id);
    const facts=keyFacts.map(([label,value])=>
      '<div class="am-extra-fact"><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>').join('');
    const direct=verifiedLinks.get(p.id);
    const actions=affiliateLink(p)
      +link(p.officialUrl,p.brand==='SKMEI'?'Voir les photos et la fiche vendeur':'Voir les vraies photos et la fiche constructeur');
    const source=link(p.marketEvidence.url,p.marketEvidence.label);
    const relatedItems=suggestions.map(q=>
      '<li><a href="./'+e(q.id)+'.html"><strong>'+e(q.brand+' '+q.model)+'</strong></a>'
      +'<span>'+e(q.description||q.title||'Consulter ses caractéristiques')+'</span></li>'
    ).join('');
    const main='<div class="wrap am-extra-page">'
      +'<nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / <a href="./modeles-populaires.html">'+products.length+' modèles complémentaires</a> / '+e(name)+'</nav>'
      +'<article class="am-extra-product" data-popular-watch-id="'+e(p.id)+'">'
      +'<div class="am-extra-hero">'
      +'<div class="am-extra-art am-pick-'+e(p.style)+'" role="group" aria-label="'+(photo?'Photo du modèle exact, droits de publication déclarés':'Composition graphique non contractuelle, sans photographie de cette montre')+'">'
      +(photo?'<img class="am-extra-licensed-photo" src="../'+e(photo.url)+'" alt="Montre '+e(name)+'" decoding="async" loading="eager">':'')
      +'<span class="am-extra-art-kicker">'+e(p.category)+'</span><span class="am-extra-art-brand">'+e(p.brand)+'</span>'
      +'<span class="am-extra-art-model">'+e(p.model)+'</span>'
      +(!photo&&p.brand==='SKMEI'?'<span class="am-budget-watch am-budget-watch-large" aria-hidden="true"><span class="am-budget-dial"></span></span>':'')
      +'<span class="am-extra-art-label">'+(photo?'Photo de marque · accord déclaré · '+e(photo.rightsHolder):'Une référence à découvrir · photographie exacte chez le vendeur ou la marque')+'</span>'
      +'</div>'
      +'<div class="am-extra-intro"><p class="am-extra-overline">'+e(tierNames[p.tier])+' / '+e(category)+'</p>'
      +'<h1>'+e(name)+'</h1><p class="am-extra-subtitle">'+e(p.lead)+'</p>'
      +'<dl class="am-extra-facts">'+facts+'</dl>'
      +'<p class="am-extra-approval">À vérifier auprès du vendeur : référence exacte, variante, prix, disponibilité, garantie et conditions de retour. Nous ne vendons pas directement ce produit.</p>'
      +'<div class="am-extra-actions">'+actions+'</div>'
      +(affiliates.enabled
        ?'<p class="am-extra-disclosure">Lien rémunéré Amazon.fr : une commission peut nous être versée pour un achat éligible. '
          +(direct?'Correspondance du code modèle vérifiée le '+e(direct.verifiedAt)+' sur une fiche Amazon.fr ; prix, vendeur et disponibilité restent à contrôler lors de la visite.':'Le lien ouvre des résultats de recherche pouvant inclure d’autres références ou variantes.')
          +' En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.</p>'
        :'<p class="am-extra-disclosure">Aucun lien rémunéré actif pour ce modèle.</p>')
      +'</div></div>'
      +(ai?'<section class="am-ai-editorial" id="vue-ia" aria-labelledby="am-ai-title"><div class="am-ai-editorial-media"><img src="'+e(ai.url)+'" loading="lazy" decoding="async" width="768" height="768" alt="Illustration artistique IA inspirée de la SKMEI '+e(p.model)+' ; aspect non contractuel"><span class="am-ai-editorial-stamp">Interprétation IA · non contractuelle</span></div><div class="am-ai-editorial-copy"><p class="am-extra-overline">Studio créatif · Atelier Montres</p><h2 id="am-ai-title">Une interprétation artistique de la '+e(name)+'</h2><p>Ce visuel a été créé par intelligence artificielle pour présenter l’esprit de la collection. Il ne s’agit pas d’une photographie du produit : la forme du cadran, les inscriptions, les finitions ou les couleurs peuvent différer de la montre vendue.</p><p>Pour vérifier le modèle exact, consultez la photographie du produit présentée en haut de cette fiche et '+link(p.officialUrl,'la fiche vendeur de la référence '+p.model)+'.</p></div></section>':'')
      +'<nav class="am-extra-local-nav" aria-label="Rubriques de cette montre"><a href="#essentiel">Notre regard</a><a href="#sources">Sources</a><a href="#comparables">Autres modèles</a><a href="#verifications">Avant achat</a></nav>'
      +'<section id="essentiel" class="am-extra-editorial" aria-label="Notre analyse documentaire">'
      +'<p class="am-extra-overline">Analyse documentaire · sans essai au poignet</p>'
      +'<h2>Pourquoi considérer cette '+e(p.brand)+' ?</h2>'
      +'<div class="am-extra-editorial-grid"><div><span class="am-extra-index" aria-hidden="true">01</span>'
      +'<h3>Son intérêt</h3><p>'+e(p.lead)+'</p></div>'
      +'<div><span class="am-extra-index" aria-hidden="true">02</span><h3>Ce qu’il faut contrôler</h3><p>'+e(p.caution)+'</p></div></div></section>'
      +'<section id="sources" class="am-extra-provenance" aria-label="Origine des informations"><h2>Des informations vérifiables</h2>'
      +'<p>'+e(ranking)+'</p><p><strong>Pourquoi cette référence ?</strong> '+source+'</p>'
      +'<p><strong>Caractéristiques et photos exactes :</strong> '+link(p.officialUrl,(p.brand==='SKMEI'?'Fiche du vendeur SKMEI':'Site officiel '+p.brand))+'</p>'
      +'<p>'+(photo?'L’éditeur déclare disposer de l’autorisation commerciale de la marque. Cette autorisation n’a pas été vérifiée indépendamment.':'Les photos sont consultables chez la marque ou le vendeur cité : nous ne les republions pas sans autorisation.')+' La mention de meilleures ventes, lorsqu’elle existe, n’atteste pas le classement de ce modèle sur Amazon.fr.</p></section>'
      +'<section id="comparables" class="am-extra-related" aria-labelledby="am-extra-related-heading">'
      +'<h2 id="am-extra-related-heading">Trois autres montres à examiner</h2><p>Ces références de notre sélection principale disposent de fiches documentées et de photographies locales déclarées autorisées. Elles constituent des pistes de comparaison, non un classement.</p>'
      +'<ul>'+relatedItems+'</ul><a href="../index.html#montres">Comparer les 15 références principales</a></section>'
      +'<section id="verifications" class="am-extra-checks"><h2>Avant de commander</h2>'
      +'<ol><li>Confirmer le code '+e(p.model)+' et la couleur auprès du vendeur : une fiche de recherche peut afficher d’autres variantes.</li>'
      +'<li>Vérifier les dimensions du boîtier, le réglage et les matériaux sur la fiche de référence de '+e(p.brand)+'.</li>'
      +'<li>Lire la garantie, les modalités de retour, le vendeur réel et le tarif final directement chez le commerçant.</li></ol>'
      +'<p>Aucun prix, disponibilité, livraison ou avis client n’est certifié par Atelier Montres pour ce modèle.</p></section>'
      +'<p class="am-extra-return"><a href="./modeles-populaires.html">← Revenir aux '+products.length+' montres complémentaires</a></p>'
      +'</article></div>';
    const graph={
      '@context':'https://schema.org','@graph':[
        {'@type':'Product',name,model:p.model,brand:{'@type':'Brand',name:p.brand},url:u(path),
          description:p.lead,
          additionalProperty:keyFacts.map(([name,value])=>({'@type':'PropertyValue',name,value}))},
        {'@type':'BreadcrumbList',itemListElement:[
          {'@type':'ListItem',position:1,name:'Atelier Montres',item:u('')},
          {'@type':'ListItem',position:2,name:'Modèles complémentaires',item:u('montres/modeles-populaires.html')},
          {'@type':'ListItem',position:3,name,item:u(path)}
        ]}
      ]
    };
    const description=(name+' : '+p.lead+' Caractéristiques, sources fabricant et conseils avant achat.').slice(0,185);
    const html=page(pageHead({title:name+' : caractéristiques et photos fabricant | Atelier Montres',
      description,path,type:'product'}),main,graph)
      .replace('</head>','<link rel="stylesheet" href="../popular-picks.css"></head>');
    writeFileSync(join(root,path),html);
    paths.push(path);
  }
  return paths;
}
