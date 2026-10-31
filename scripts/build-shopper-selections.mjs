import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Search-intent collections assembled only from the documented 52-watch
// catalogue. Core watches may use previously approved local photographs;
// supplemental watches remain typographic until commercial image rights exist.
const selections=[
  {
    slug:'montres-femme-accessibles',label:'Montres femme',title:'Montres femme accessibles : six styles à comparer',
    description:'Montres femme sélectionnées par leur style, format et fiches vérifiables : Casio, SKMEI, Curren et Pagani Design. Photos autorisées ou liens fabricants, sans faux prix.',
    headline:'Six montres femme au style soigné, sans achat à l’aveugle.',
    intro:'Petits formats, cadrans lumineux, bracelets acier ou cuir : cette sélection rassemble des montres féminines aux silhouettes distinctes. Une référence est ici pour son design documenté, pas pour un classement de ventes nationales.',
    adviceTitle:'Choisir une montre femme sans se tromper',
    advice:[
      'Comparer la largeur et les dimensions du boîtier quand elles sont documentées, plutôt que de transformer la largeur d’une montre rectangulaire en diamètre.',
      'Choisir le bracelet selon les usages : acier pour un look polyvalent, cuir pour un style habillé, résine pour une montre numérique légère.',
      'Vérifier l’intitulé exact du modèle et sa couleur chez le commerçant. Une recherche Amazon peut proposer plusieurs références différentes.'
    ],
    ids:['casio-ltp1302','skmei-1874','casio-la-20wh-4a1','casio-ltp-1234pgl-7a','curren-cur210','pagani-pd1776']
  },
  {
    slug:'montres-homme-style-accessible',label:'Montres homme',title:'Montres homme : six beaux modèles accessibles à comparer',
    description:'Montres homme au design attractif : Casio, SKMEI, ADDIESDIVE et Pagani Design. Comparatif éditorial de références exactes, tailles et types de mouvements.',
    headline:'Six montres homme qui privilégient l’allure et l’utilité.',
    intro:'Digitales rétro, cadran texturé, acier, chronographe ou montre sportive : ces six pistes permettent de choisir un style sans confondre apparence et qualité prouvée. Les caractéristiques annoncées restent rattachées aux sources du modèle.',
    adviceTitle:'Les critères qui comptent au quotidien',
    advice:[
      'Vérifier les dimensions réelles et le poids : une montre de 42 mm n’aura pas le même équilibre qu’un boîtier de 36 mm.',
      'Séparer le mouvement quartz pratique du chronographe et de la mécanique automatique. Les bracelets et verres varient selon les références.',
      'Contrôler le marchand, la garantie et les frais de livraison. Aucun prix ni disponibilité ne sont garantis sur cette page.'
    ],
    ids:['casio-mtp-1302','casio-a168wa','casio-mdv107','skmei-2256','addiesdive-ad2030','pagani-pd1701']
  },
  {
    slug:'montres-automatiques-selection',label:'Montres automatiques',title:'Montres automatiques : six références pour choisir son style',
    description:'Sélection de montres automatiques Citizen, Orient, Seiko et Pagani Design : mouvements, dimensions, styles et liens vers les caractéristiques exactes.',
    headline:'Six automatiques, du cadran classique à l’acier sportif.',
    intro:'Une montre automatique fonctionne grâce au mouvement du poignet et à son ressort moteur. Cette sélection montre six approches : habillée, sportive, acier intégré ou compacte. Les modèles ne sont ni testés au poignet ni classés par ventes.',
    adviceTitle:'Avant de choisir une automatique',
    advice:[
      'Le remontage, la réserve de marche et la précision quotidienne peuvent différer selon le calibre; consulter la notice de chaque référence.',
      'Vérifier la hauteur du boîtier, le poids et l’entretien prévu, notamment pour un port quotidien ou occasionnel.',
      'Ne pas déduire une qualité de mouvement d’une photographie : le verre, l’étanchéité et la garantie doivent être documentés séparément.'
    ],
    ids:['orient-bambino','citizen-tsuyosa','seiko-5','orient-bambino-38-cream','citizen-tsuyosa-37-blue','pagani-pd1751']
  }
];
const escapeAttributes=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function buildShopperSelections({root,coreProducts,picks,partners,verifiedPopularLinks,amazonSearch,pageHead,page,e,u}){
  const all=new Map();
  coreProducts.forEach(p=>all.set(p.id,{product:p,core:true}));
  picks.forEach(p=>{
    if(all.has(p.id))throw Error('Duplicated shopper selection ID '+p.id);
    all.set(p.id,{product:p,core:false});
  });
  const coreLinks=partners.links;
  const card=(id)=>{
    const match=all.get(id);
    if(!match)throw Error('Missing shopper collection watch '+id);
    const {product:p,core}=match;
    const name=p.brand+' '+p.model;
    const photo=core && p.photoReview?.publicUsageApproved===true
      &&p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp';
    const facts=core
      ?[p.description,p.specs?.movement||p.movement,p.specs?.diameter||p.specs?.caseSize||'Dimensions non documentées']
      :[p.category,p.movement,p.case];
    const link='../montres/'+e(p.id)+'.html';
    const factList=facts.filter(Boolean).map(x=>'<li>'+e(x)+'</li>').join('');
    const stage=photo
      ?'<img src="../assets/watches/'+e(p.id)+'.webp" loading="lazy" decoding="async" alt="Montre '+e(name)+'">'
      :'<span class="am-shopper-art-brand">'+e(p.brand)+'</span><strong>'+e(p.model)+'</strong><span class="am-shopper-art-note">Repère graphique · photo exacte chez le fabricant ou vendeur</span>';
    const paidCore=core?coreLinks.get(p.id):null;
    const paidPopular=!core?verifiedPopularLinks.get(p.id):null;
    const destination=paidCore?.url||paidPopular?.url||(!core&&partners.enabled?amazonSearch(p):null);
    const commercial=Boolean(destination)&&partners.enabled;
    const direct=Boolean(paidCore||paidPopular);
    const action=destination?
      '<a class="am-shopper-action" href="'+e(destination)+'" target="_blank" rel="noopener noreferrer nofollow'+(commercial?' sponsored':'')+'" data-amazon-'+(direct?'product':'search-id')+'="'+e(p.id)+'" data-amazon-placement="popular">'+(direct?'Voir la fiche Amazon.fr':'Recherche Amazon.fr')+' · lien rémunéré</a>'
      :'<a class="am-shopper-action" href="'+e(p.officialUrl)+'" target="_blank" rel="noopener noreferrer nofollow">Consulter le fabricant</a>';
    const explanation=direct
      ?'Correspondance de référence Amazon documentée. Prix, vendeur et stock à confirmer.'
      :commercial?'Recherche Amazon : d’autres modèles peuvent apparaître. Contrôler le code exact avant achat.':'Lien non rémunéré vers la fiche de référence.';
    return '<article class="am-shopper-card" data-shopper-watch="'+e(id)+'">'
      +'<div class="am-shopper-art'+(photo?' am-shopper-real-photo':'')+'" aria-label="'+(photo?'Photographie locale du modèle exact, droits déclarés':'Repère graphique, non contractuel')+'">'+stage+'</div>'
      +'<div class="am-shopper-card-body"><p class="am-shopper-card-label">'+(core?'Collection photographiée':'Sélection complémentaire')+'</p>'
      +'<h2><a href="'+link+'">'+e(name)+'</a></h2><ul>'+factList+'</ul>'
      +'<div class="am-shopper-actions">'+action+'<a class="am-shopper-detail" href="'+link+'">Voir les caractéristiques et sources</a></div>'
      +'<p class="am-shopper-disclosure">'+e(explanation)+'</p></div></article>';
  };
  const nav='<nav class="am-shopper-nav" aria-label="Sélections par type de montre">'
    +selections.map(s=>'<a href="./'+e(s.slug)+'.html">'+e(s.label)+'</a>').join('')+'</nav>';
  const paths=[];
  for(const selected of selections){
    if(selected.ids.length<4||new Set(selected.ids).size!==selected.ids.length)throw Error('Invalid curated selection '+selected.slug);
    const path='montres/'+selected.slug+'.html';
    const items=selected.ids.map(card).join('');
    const advice=selected.advice.map(t=>'<li>'+e(t)+'</li>').join('');
    const affiliateNote=partners.enabled?
      'Certains liens Amazon.fr sont rémunérés. Un lien direct indique une correspondance de référence documentée; un lien de recherche peut afficher des variantes. En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.':
      'Aucun lien rémunéré n’est actif dans cette sélection.';
    const main='<div class="wrap am-shopper-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="./modeles-populaires.html">Les montres</a> / '+e(selected.label)+'</nav>'
      +'<header class="am-shopper-heading"><p class="eyebrow">Sélection éditoriale · références traçables</p>'
      +'<h1>'+e(selected.headline)+'</h1><p class="lead">'+e(selected.intro)+'</p>'
      +'<p class="am-shopper-method-note">Les modèles sont choisis pour leurs usages et leur esthétique, et non pour des ventes Amazon prétendument mesurées. Aucun prix, disponibilité ou avis n’est inventé.</p>'
      +nav+'</header>'
      +'<div class="am-shopper-grid">'+items+'</div>'
      +'<section class="am-shopper-guide"><h2>'+e(selected.adviceTitle)+'</h2><ol>'+advice+'</ol></section>'
      +'<aside class="am-shopper-endnote"><p>'+e(affiliateNote)+'</p>'
      +'<p>Les photographies locales des modèles principaux sont publiées selon une autorisation déclarée par l’éditeur, non contrôlée indépendamment. Les nouveaux modèles sans autorisation sont représentés par un repère graphique : leurs véritables photos figurent sur les fiches de référence.</p>'
      +'<a href="./modeles-populaires.html">Parcourir les 37 modèles complémentaires</a></aside></div>';
    const schema={'@context':'https://schema.org','@graph':[
      {'@type':'CollectionPage',name:selected.title,url:u(path),description:selected.description,inLanguage:'fr-FR'},
      {'@type':'ItemList',numberOfItems:selected.ids.length,itemListElement:selected.ids.map((id,i)=>{
        const p=all.get(id).product;
        return {'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+id+'.html')};
      })}
    ]};
    writeFileSync(join(root,path),page(pageHead({title:selected.title+' | Atelier Montres',description:selected.description,path}),main,schema)
      .replace('</head>','<link rel="stylesheet" href="../shopper-selections.css"></head>'));
    paths.push(path);
  }
  return {
    paths,
    navHome:'<nav class="am-shopper-nav am-shopper-nav-home" aria-label="Découvrir les sélections">'
      +selections.map(s=>'<a href="./montres/'+e(s.slug)+'.html">'+e(s.label)+'</a>').join('')+'</nav>',
    navPopular:nav
  };
}
