import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {responsivePopularAttrs} from './responsive-images.mjs';

// Conversion-friendly product landing pages without unlicensed watch images,
// invented Amazon ASINs, or unverifiable prices. The existing 15 core models
// continue to own the photo-backed interactive comparison experience.
export function buildPopularProductPages({root,products,coreProducts,affiliates,pageHead,page,e,u,link,tierNames,affiliateLink,partnerLink,partnerOffers,verifiedLinks,approvedPhotos,aiVisuals,comparisonLinks=new Map()}){
  // Recommendations are real, distinct watches from the same 37-model
  // source catalogue, not the old static 15-watch lists. Keep the merchant
  // verification registry separate: similarity does not imply product testing.
  const movementFamily=value=>/automatique/i.test(value)?'automatic'
    :/solaire|eco-drive/i.test(value)?'solar'
    :/numérique|digital/i.test(value)?'digital'
    :/chronographe/i.test(value)?'chrono':'quartz';
  const relatedWatches=p=>{
    // Editorial ranges are not live prices. Still, keep recommendations
    // within the same range so a budget shopper never gets a silent upgrade
    // from Essentielle to Prestige. The source catalogue contains at least
    // four alternatives in every range.
    const family=movementFamily(p.movement);
    const ranked=products.filter(q=>q.id!==p.id&&q.tier===p.tier).sort((a,b)=>{
      const score=q=>(q.style===p.style?8:0)
        +(q.brand===p.brand?6:0)
        +(movementFamily(q.movement)===family?4:0)
        +(approvedPhotos.has(q.id)?1:0);
      return score(b)-score(a)||a.id.localeCompare(b.id,'fr');
    });
    const picks=[];
    for(const q of ranked){
      if(picks.length===3)break;
      // Retain brand affinity, while always showing at least one other brand.
      if(picks.filter(x=>x.brand===q.brand).length>=2)continue;
      picks.push(q);
    }
    if(picks.length!==3||new Set(picks.map(q=>q.id)).size!==3
      ||picks.some(q=>q.id===p.id||q.tier!==p.tier)
      ||picks.every(q=>q.brand===p.brand))
      throw Error('Three distinct same-range, cross-brand suggestions required: '+p.id);
    return picks;
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
    const suggestions=relatedWatches(p);
    // Use only the four explicitly sourced factual fields; do not infer
    // numeric specifications, quality scores, stock, price or popularity.
    const comparison=[p,...suggestions];
    const comparisonRows=[
      ['Mouvement','movement'],['Boîtier','case'],['Verre','glass'],['Étanchéité','water']
    ];
    const comparisonTable='<p class="am-extra-factual-swipe-hint">Sur téléphone, faites glisser le tableau horizontalement pour comparer les quatre montres. Les critères restent visibles.</p>'
      +'<div class="am-extra-factual-scroll" role="region" tabindex="0" aria-label="Tableau comparatif des quatre références">'
      +'<table class="am-extra-factual-table"><caption>Caractéristiques documentées des quatre références</caption>'
      +'<thead><tr><th scope="col">Caractéristique</th>'
      +comparison.map(q=>'<th scope="col"><a href="./'+e(q.id)+'.html">'+e(q.brand+' '+q.model)+'</a>'+(q.id===p.id?'<small>Modèle consulté</small>':'')+'</th>').join('')
      +'</tr></thead><tbody>'
      +comparisonRows.map(([label,key])=>'<tr><th scope="row">'+e(label)+'</th>'
        +comparison.map(q=>'<td>'+e(q[key])+'</td>').join('')+'</tr>').join('')
      +'</tbody></table></div>';
    // All three IDs are drawn from this exact source-backed catalog.
    // Comparison remains available without JavaScript from a regular link.
    const compareIds=[p.id,...suggestions.slice(0,2).map(q=>q.id)];
    if(new Set(compareIds).size!==3||compareIds.some(id=>!products.some(q=>q.id===id)))
      throw Error('Invalid exact-model comparison trio: '+p.id);
    const compareUrl='./toutes-les-montres.html?compare='+compareIds.join(',')+'#comparer';
    const facts=keyFacts.map(([label,value])=>
      '<div class="am-extra-fact"><dt>'+e(label)+'</dt><dd>'+e(value)+'</dd></div>').join('');
    const direct=verifiedLinks.get(p.id);
    const alternatePartner=partnerOffers.get(p.id);
    const comparator=direct?.evidenceType==='amazon_fr_comparator_redirect';
    const merchantRoute=affiliates.enabled
      ?comparator?'comparator':direct?'asin':alternatePartner?'partner':'search'
      :alternatePartner?'partner':'official';
    const merchantFacts=affiliates.enabled
      ?'<dl class="am-extra-merchant-facts" aria-label="Informations à vérifier avant la visite marchande">'
        +'<div><dt>Destination prioritaire</dt><dd>'+(direct?'Page Amazon.fr · ASIN '+e(direct.asin)
          :alternatePartner?'Lien partenaire Awin · référence à vérifier'
            :'Fiche du modèle chez la marque ou le vendeur')+'</dd></div>'
        +'<div><dt>Code recherché</dt><dd>'+e(direct?.model||p.model)+'</dd></div>'
        +'<div><dt>Contrôle documentaire</dt><dd>'+e(direct?.verifiedAt||'Aucun ASIN exact documenté')+'</dd></div>'
        +'</dl>'
      :'';
    // Show only actual independently validated evidence links. These are
    // editorial sources, never revenue-tracked merchant destinations.
    if(comparator&&(!direct.comparisonUrl||!direct.corroborationUrl))
      throw Error('Source-backed Amazon referral lacks two audit links: '+p.id);
    const proofLedger=comparator
      ?'<div class="am-extra-proof-ledger" data-asin-proof-id="'+e(p.id)+'" role="group" aria-label="Preuves de correspondance du modèle Amazon">'
        +'<p class="am-extra-proof-overline">Traçabilité · contrôle documentaire du '+e(direct.verifiedAt.split('-').reverse().join('/'))+'</p>'
        +'<h3>Sur quoi repose la référence Amazon ?</h3>'
        +'<p class="am-extra-proof-identity"><span>Code associé : <strong>'+e(direct.model)+'</strong></span>'
        +'<span>ASIN : <code>'+e(direct.asin)+'</code></span></p>'
        +'<ol class="am-extra-proof-sources">'
        +'<li><span class="am-extra-proof-step">01 · Première source</span>'
        +'<a href="'+e(direct.comparisonUrl)+'" rel="noopener noreferrer nofollow" target="_blank">Consulter la fiche du comparateur <span aria-hidden="true">↗</span></a>'
        +'<small>Le comparateur associait cette référence à une redirection vers cet ASIN.</small></li>'
        +'<li><span class="am-extra-proof-step">02 · Corroboration indépendante</span>'
        +'<a href="'+e(direct.corroborationUrl)+'" rel="noopener noreferrer nofollow" target="_blank">Contrôler le code modèle et l’ASIN <span aria-hidden="true">↗</span></a>'
        +'<small>Une source distincte mentionne le même ASIN et la référence du fabricant.</small></li>'
        +'</ol>'
        +'<p class="am-extra-proof-warning">Ces deux liens prouvent un rapprochement documentaire, pas une offre actuelle. La page Amazon.fr n’a pas pu être consultée directement. Avant tout achat, vérifier la variante, le prix final, le stock et le vendeur sur Amazon.fr.</p>'
        +'</div>'
      :'';

    // An Amazon search is not an exact product offer: for the 23 models
    // without an ASIN, guide the visitor to the actual model source first.
    // Keep paid research links available and accurately labelled as optional.
    const amazonAction=affiliateLink(p);
    const awinAction=partnerLink(p);
    const officialAction=link(p.officialUrl,
      p.brand==='SKMEI'?'Voir le modèle exact chez le vendeur'
        :'Voir le modèle exact chez le fabricant',false,p.id,'official');
    const actionPriority=affiliates.enabled&&direct?'amazon':alternatePartner?'awin':'source';
    const actions=actionPriority==='amazon'?amazonAction+awinAction+officialAction
      :actionPriority==='awin'?awinAction+officialAction+amazonAction
      :officialAction+amazonAction;
    const source=link(p.marketEvidence.url,p.marketEvidence.label);
    const relatedItems=suggestions.map(q=>{
      const otherPhoto=approvedPhotos.get(q.id);
      const reason=q.brand===p.brand?'Même marque'
        :q.style===p.style?'Style proche'
        :movementFamily(q.movement)===movementFamily(p.movement)?'Mouvement comparable':'Autre approche';
      return '<li data-related-id="'+e(q.id)+'" data-related-reason="'+e(reason)+'" data-related-tier="'+e(q.tier)+'">'
        +'<a class="am-extra-related-thumb" href="./'+e(q.id)+'.html">'
        +(otherPhoto?'<img loading="lazy" decoding="async" width="'+otherPhoto.width+'" height="'+otherPhoto.height+'" src="../'+e(otherPhoto.url)+'"'
          +responsivePopularAttrs(root,q,otherPhoto,{prefix:'../',sizes:'(max-width: 650px) 42vw, (max-width: 950px) 26vw, 190px',escape:e})
          +' alt="Photographie de '+e(q.brand+' '+q.model)+'">'
          :'<span class="am-extra-related-fallback"><span>'+e(q.brand)+'</span><strong>'+e(q.model)+'</strong><small>Photo chez le vendeur</small></span>')
        +'</a><span class="am-extra-related-tier">Gamme '+e(tierNames[q.tier])+'</span><span class="am-extra-related-label">'+e(reason)+'</span>'
        +'<a class="am-extra-related-name" href="./'+e(q.id)+'.html">'+e(q.brand+' '+q.model)+'</a>'
        +'<span>'+e(q.movement)+' · '+e(q.case)+'</span></li>';
    }).join('');
    // Editorial comparison links are generated only for exact source-backed pairs.
    const duels=comparisonLinks.get(p.id)||[];
    const duelBlock=duels.length
      ?'<div class="am-extra-duels"><h3>Comparer avant de choisir</h3><div class="am-extra-duel-grid">'
        +duels.map(item=>'<div class="am-extra-duel-entry"><a href="./'+e(item.path.replace(/^montres\//,''))+'">'
          +e(item.title)+'</a><small>Face à '+e(item.other)+' · faits et limites documentés</small></div>').join('')
        +'</div></div>'
      :'';
    // Source-backed premium typographic reference: never imply that a model
    // photograph has been published, or draw an unverified watch silhouette.
    const referencePassport=photo?''
      :'<div class="am-extra-reference-passport" role="group" aria-label="Repères documentaires de '+e(name)+'">'
        +'<div class="am-extra-passport-head"><span>DOCUMENTATION / RÉFÉRENCE</span><span>ÉDITION ATELIER</span></div>'
        +'<dl class="am-extra-passport-facts">'
        +'<div><dt>Mouvement</dt><dd>'+e(p.movement)+'</dd></div>'
        +'<div><dt>Boîtier</dt><dd>'+e(p.case)+'</dd></div>'
        +'</dl>'
        +'<p>Présentation typographique uniquement. L’aspect exact de cette montre est à consulter sur la fiche officielle ci-dessous.</p>'
        +'</div>';
    const main='<div class="wrap am-extra-page">'
      +'<nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / <a href="./modeles-populaires.html">'+products.length+' modèles complémentaires</a> / '+e(name)+'</nav>'
      +'<article class="am-extra-product" data-popular-watch-id="'+e(p.id)+'" data-brand="'+e(p.brand)+'" data-model="'+e(p.model)+'" data-official-url="'+e(p.officialUrl)+'">'
      +'<div class="am-extra-hero">'
      +'<div class="am-extra-art am-pick-'+e(p.style)+(photo?' am-extra-art-with-photo':' am-extra-art-no-photo')+'" role="group" aria-label="'+(photo?'Photo du modèle exact, droits de publication déclarés':'Fiche documentaire typographique, aucune photographie de cette montre publiée ici')+'">'
      +(photo?'<div class="am-extra-photo-stage"><img class="am-extra-licensed-photo" src="../'+e(photo.url)+'"'
        +responsivePopularAttrs(root,p,photo,{prefix:'../',sizes:'(max-width: 760px) 78vw, (max-width: 1200px) 40vw, 520px',escape:e})
        +' width="'+photo.width+'" height="'+photo.height+'" alt="Montre '+e(name)+'" decoding="async" loading="eager">'
        +'<button type="button" class="am-extra-zoom" data-extra-zoom-id="'+e(p.id)+'" aria-label="Agrandir la photo du modèle '+e(name)+'" hidden>Agrandir la photo</button>'
        +'</div><div class="am-extra-photo-meta">':'')
      +'<span class="am-extra-art-kicker">'+e(p.category)+'</span><span class="am-extra-art-brand">'+e(p.brand)+'</span>'
      +'<span class="am-extra-art-model">'+e(p.model)+'</span>'
      +referencePassport
      +'<span class="am-extra-art-label">'+(photo?'Photo de marque · accord déclaré · '+e(photo.rightsHolder):'Une référence à découvrir · photographie exacte chez le vendeur ou la marque')+'</span>'
      +(!photo?'<div class="am-extra-official-photo"><span class="am-extra-photo-unavailable">Photo du modèle non publiée ici</span><a href="'+e(p.officialUrl)+'" target="_blank" rel="noopener noreferrer" aria-label="Voir les photos du modèle exact : '+e(name)+' sur la fiche officielle (nouvel onglet)">Voir les photos du modèle exact <span aria-hidden="true">↗</span></a><small>Sur le site de la marque ou du vendeur · référence à confirmer avant achat</small></div>':'')
      +(photo?'</div>':'')
      +'</div>'
      +'<div class="am-extra-intro"><p class="am-extra-overline">'+e(tierNames[p.tier])+' / '+e(category)+'</p>'
      +'<h1>'+e(name)+'</h1><p class="am-extra-subtitle">'+e(p.lead)+'</p>'
      +'<dl class="am-extra-facts">'+facts+'</dl>'
      +'<p class="am-extra-reference"><span>Référence à retrouver chez le marchand</span><strong>'+e(name)+'</strong></p>'
      +'<div class="am-ref-copy-tools" data-watch-ref-tools hidden><button type="button" class="am-ref-copy-button" data-watch-ref-copy="'+e(p.id)+'" hidden>Copier la référence</button><span class="am-ref-copy-status" role="status" aria-live="polite" data-watch-ref-status></span></div>'
      +'<p class="am-extra-approval">À vérifier auprès du vendeur : référence exacte, variante, prix, disponibilité, garantie et conditions de retour. Nous ne vendons pas directement ce produit.</p>'
      +(affiliates.enabled?'<div class="am-extra-link-status '+(direct?'am-extra-link-direct':'am-extra-link-search')+'" data-merchant-route="'+merchantRoute+'"><strong>'+(direct?'Fiche Amazon.fr correspondant au code modèle'
          :alternatePartner?'Lien partenaire documenté · vérifier la variante'
          :'Fiche du modèle à consulter avant toute recherche')+'</strong><span>'+(direct
          ?(comparator?'ASIN recoupé via un comparateur et une source indépendante ; fiche Amazon.fr non consultée directement. Vérifiez la variante, le vendeur et le stock.':'Lien associé à un ASIN documenté. Contrôlez la variante, le vendeur et le stock.')
          :alternatePartner?'Le lien Awin concerne cette référence documentée, sans garantir le stock ni la variante. La recherche Amazon.fr reste facultative.'
            :'Recherche Amazon.fr — modèle non garanti. Aucun ASIN exact établi : consultez d’abord la fiche fabricant ou vendeur, puis contrôlez tout résultat marchand.')+'</span>'
        +merchantFacts
        +(direct?.marketplaceVariant?'<span class="am-extra-merchant-variant"><strong>Variante de la fiche Amazon :</strong> '+e(direct.marketplaceVariant)+'</span>':'')
        +(comparator?'<span class="am-extra-proof-jump"><a href="#sources">Voir les deux sources de correspondance <span aria-hidden="true">↓</span></a></span>':'')+'</div>':'')
      +(!photo?'<p class="am-extra-seller-path"><strong>Étape 2 / Consulter les sources</strong> Les liens suivants ouvrent des sites externes. Une recherche marchand ne garantit ni la variante exacte, ni son stock.</p>':'')
      +'<div class="am-extra-actions" data-action-priority="'+actionPriority+'" role="group" aria-label="Sources et vendeurs pour '+e(name)+'">'+actions+'</div>'
      +'<div class="am-extra-local-tools" role="group" aria-label="Conserver ou partager cette montre" hidden>'
      +'<button type="button" class="am-extra-favorite" data-extra-favorite="'+e(p.id)+'" aria-pressed="false" hidden>♡ Ajouter aux favoris</button>'
      +'<button type="button" class="am-extra-share" data-extra-share="'+e(p.id)+'" hidden>Partager cette montre</button>'
      +'<a class="am-extra-saved-link" href="./toutes-les-montres.html?saved=1" hidden>Voir mes favoris</a>'
      +'<p class="am-extra-action-status" data-extra-action-status role="status" aria-live="polite"></p></div>'
      +'<a class="am-extra-compare-cta" href="'+e(compareUrl)+'" data-compare-source="'+e(p.id)+'">Comparer avec '+e(suggestions[0].brand+' '+suggestions[0].model)+' et '+e(suggestions[1].brand+' '+suggestions[1].model)+'</a>'
      +(affiliates.enabled
        ?'<p class="am-extra-disclosure">Lien rémunéré Amazon.fr : une commission peut nous être versée pour un achat éligible. '
          +(direct?'Correspondance du code modèle vérifiée le '+e(direct.verifiedAt)+(comparator?' via redirection du comparateur et source indépendante (Amazon.fr non consulté directement) ; prix, vendeur et disponibilité restent à contrôler lors de la visite.':' sur une fiche Amazon.fr ; prix, vendeur et disponibilité restent à contrôler lors de la visite.'):'Le lien ouvre des résultats de recherche pouvant inclure d’autres références ou variantes.')
          +' En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.</p>'
        :alternatePartner
          ?'<p class="am-extra-disclosure">Lien rémunéré Awin vers une référence documentée : une commission peut nous être versée en cas d’achat éligible, sans garantie de disponibilité ni de rémunération. La variante reste à contrôler chez le marchand.</p>'
          :'<p class="am-extra-disclosure">Aucun lien rémunéré actif pour ce modèle.</p>')
      +(affiliates.enabled&&alternatePartner
        ?'<p class="am-extra-disclosure">Lien Awin rémunéré alternatif : l’éligibilité et le taux de commission dépendent de l’annonceur ; prix, variante et livraison restent à vérifier.</p>'
        :'')
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
      +proofLedger
      +'<p>'+(photo?'L’éditeur déclare disposer de l’autorisation commerciale de la marque. Cette autorisation n’a pas été vérifiée indépendamment.':'Les photos sont consultables chez la marque ou le vendeur cité : nous ne les republions pas sans autorisation.')+' La mention de meilleures ventes, lorsqu’elle existe, n’atteste pas le classement de ce modèle sur Amazon.fr.</p></section>'
      +'<section id="comparables" class="am-extra-related" aria-labelledby="am-extra-related-heading">'
      +'<h2 id="am-extra-related-heading">Trois alternatives dans la même gamme</h2><p>Ces trois modèles appartiennent à la gamme éditoriale '+e(tierNames[p.tier])+'. La sélection rapproche styles, mouvements et marques à partir de données publiées, sans essai comparatif ni prix garanti. Seules les photos déclarées autorisées sont affichées.</p>'
      +'<ul>'+relatedItems+'</ul>'+duelBlock+comparisonTable+'<div class="am-extra-related-cta"><a class="am-extra-compare-cta" href="'+e(compareUrl)+'" data-compare-source="'+e(p.id)+'">Comparer ces références à cette montre</a>'
      +'<a href="./toutes-les-montres.html">Comparer les 52 montres</a></div></section>'
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
          // Only owner-declared, model-exact local photos are eligible for
          // product structured data. Never expose AI illustrations as photos.
          ...(photo?{image:[u(photo.url)]}:{}),
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
      .replace('</head>','<link rel="stylesheet" href="../popular-picks.css">'
        +(!photo?'<link rel="stylesheet" href="../extra-source-passport.css">':'')
        +(comparator?'<link rel="stylesheet" href="../merchant-proof-ledger.css">':'')
        +(photo?'<link rel="stylesheet" href="../photo-zoom.css"><script defer src="../photo-zoom.js"></script><script defer src="../extra-product-viewer.js"></script>':'')
        +'<link rel="stylesheet" href="../extra-factual-comparison.css"><link rel="stylesheet" href="../watch-reference-copy.css"><script defer src="../watch-reference-copy-v2.js"></script><script defer src="../unified-recent-history.js"></script><script defer src="../extra-product-actions.js"></script></head>');
    writeFileSync(join(root,path),html);
    paths.push(path);
  }
  return paths;
}
