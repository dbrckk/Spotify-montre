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
  },
  {
    slug:'montres-skmei',label:'Montres SKMEI',kind:'skmei',
    title:'Montres SKMEI : 10 modèles numériques, acier et chronographe',
    description:'Comparez 10 montres SKMEI documentées : 2056, 2256, 2514 et autres modèles numériques, analogiques et hybrides. Photos de modèles, boîtiers et limites à vérifier.',
    headline:'Montres SKMEI : dix références, trois approches du design.',
    intro:'La sélection SKMEI de notre catalogue rassemble dix références exactes : quatre montres numériques, deux hybrides analogiques-numériques, trois analogiques et un chronographe. L’objectif est de comparer leur présentation et les spécifications annoncées sans prétendre disposer de mesures de ventes ni d’un essai au poignet.',
    adviceTitle:'Comparer les montres SKMEI avant l’achat',
    advice:[
      'Numérique ou hybride : vérifier l’affichage, les boutons, le rétroéclairage et les fonctions sur la fiche officielle de la variante retenue.',
      'La SKMEI 2056 est annoncée avec un boîtier résine de 35 mm ; la 2514 utilise un format rectangulaire mesuré 35,2 × 37,7 × 9,3 mm. Ces mesures ne sont pas nécessairement des diamètres ronds comparables.',
      'Une recherche Amazon.fr n’est pas une offre exacte. Lire le code de modèle, la variante, le prix final et les conditions de retour directement chez le marchand.'
    ],
    insights:[
      ['Numérique rétro','Les références 1251, 1257, 2056 et 2514 se distinguent par leur affichage numérique et leur silhouette. Le choix est d’abord une question de boîtier et de lisibilité recherchée, sans classement de durabilité.'],
      ['Mixte et chronographe','Les 1220 et 2471 combinent aiguilles et affichage numérique ; la 9156 est décrite comme un chronographe quartz. Une ressemblance esthétique ne signifie pas que les fonctions ou matériaux soient identiques.'],
      ['Provenance des photos et des offres','Les photographies publiées sont fondées sur les autorisations déclarées par le propriétaire du site, non vérifiées indépendamment. Une variante ou la disponibilité sur Amazon.fr n’est pas garantie par nos liens de recherche.']
    ],
    compareIds:['skmei-2056','skmei-2256','skmei-9156'],
    ids:['skmei-1251','skmei-1257','skmei-2056','skmei-2514','skmei-9156','skmei-9353','skmei-1874','skmei-2471','skmei-1220','skmei-2256']
  },
  {
    slug:'montres-pagani-design',label:'Pagani Design',kind:'pagani',
    title:'Montres Pagani Design : 3 modèles PD1701, PD1751 et PD1776',
    description:'Trois Pagani Design à comparer : PD1701 chronographe quartz VK63, PD1751 automatique NH35 annoncé et PD1776 quartz VH65 annoncé, avec dimensions et sources.',
    headline:'Pagani Design : trois montres, trois mouvements annoncés.',
    intro:'Le catalogue comporte trois montres Pagani Design : la PD1701 au style chronographe sportif, la PD1751 automatique compacte et la PD1776 aux proportions plus petites. Les calibres, le saphir et les dimensions mentionnés dans les fiches sont ceux annoncés par les vendeurs ; ils ne constituent pas des essais ni des certifications indépendantes.',
    adviceTitle:'Quelle Pagani Design regarder en premier ?',
    advice:[
      'La PD1701 présente un chronographe quartz VK63 annoncé et un boîtier de 40 mm annoncé ; vérifier la référence exacte et les variantes sur le site vendeur.',
      'La PD1751 est décrite avec un mouvement automatique NH35 annoncé et un format de 36 mm annoncé : vérifier la réserve de marche, la hauteur et la garantie.',
      'La PD1776 présente un mouvement quartz VH65 et un boîtier annoncé de 32 mm. Le choix dépend surtout du format et du style recherché ; les données vendeur doivent être recontrôlées.'
    ],
    insights:[
      ['Chronographe quartz PD1701','Le chronographe et les trois compteurs constituent son signe distinctif. Vérifier les fonctions du calibre VK63, le type de verre et la variante réellement proposée chez le marchand.'],
      ['Automatique PD1751','Cette référence met en avant un mouvement NH35 annoncé. Un mouvement automatique nécessite une approche différente de l’entretien ; les données du vendeur font foi pour la référence exacte.'],
      ['Format compact PD1776','Le cadran coloré et le format annoncé de 32 mm distinguent cette montre. Ce modèle n’est pas interchangeable avec la PD1701 ou la PD1751 malgré la marque commune.']
    ],
    compareIds:['pagani-pd1701','pagani-pd1751','pagani-pd1776'],
    ids:['pagani-pd1701','pagani-pd1751','pagani-pd1776']
  },
  {
    slug:'montres-numeriques',label:'Montres numériques',kind:'digital',
    title:'Montres numériques : 12 Casio et SKMEI, digitales et hybrides',
    description:'Comparez 12 montres numériques et analogiques-numériques Casio et SKMEI : types d’affichage, fonctions annoncées, boîtiers et fiches produit documentées.',
    headline:'Montres numériques : douze références digitales et hybrides.',
    intro:'Douze montres de notre catalogue proposent un affichage numérique, seul ou accompagné d’aiguilles. Cette sélection regroupe des références SKMEI, Casio et Casio G-SHOCK : elle ne confond pas une montre intégralement digitale avec un modèle hybride analogique-numérique.',
    adviceTitle:'Digital, analogique-numérique : comment départager les modèles ?',
    advice:[
      'Commencer par le type d’affichage : les modèles SKMEI 1220 et 2471 sont hybrides, alors que les Casio F-91W, A158WEA et A168WG sont décrites comme numériques.',
      'Lire les fonctions annoncées sur la fiche du fabricant : alarme, chronomètre, rétroéclairage et double fuseau ne sont pas acquis pour toutes les montres numériques.',
      'Contrôler l’étanchéité, les dimensions et le bracelet de la variante exacte avant tout achat. Aucun classement de ventes, de fiabilité ou de prix n’est supposé.'
    ],
    insights:[
      ['Les numériques classiques','Casio F-91W, A158WEA, A168WG et les modèles SKMEI numériques privilégient un affichage par chiffres. Les tailles et les finitions varient entre les références documentées.'],
      ['Le format hybride','Les SKMEI 1220 et 2471 associent aiguilles et écran numérique. Les comparer uniquement à des digitales classiques serait insuffisant : ergonomie et boîtier doivent aussi être considérés.'],
      ['Des usages différents','Une montre numérique rétro et une montre sportive Casio G-SHOCK peuvent répondre à des attentes différentes. La catégorie est fondée sur l’affichage, pas sur une résistance aux chocs garantie pour tous les modèles.']
    ],
    compareIds:['skmei-2056','casio-f91w-1','skmei-2471'],
    ids:['skmei-1251','skmei-1257','skmei-2056','skmei-2514','skmei-2471','skmei-1220','casio-a158wea-1','casio-la-20wh-4a1','casio-f91w-1','casio-a168wg-9','casio-dw5600rl-1','casio-ae1200wh-1av']
  }
 ];
const escapeAttributes=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

export function buildShopperSelections({root,coreProducts,picks,partners,verifiedPopularLinks,approvedPopularPhotos,amazonSearch,pageHead,page,e,u}){
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
    const photo=core
      ?(p.photoReview?.publicUsageApproved===true && p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp'
        ?'../assets/watches/'+p.id+'.webp':null)
      :(approvedPopularPhotos.get(id)?'../'+approvedPopularPhotos.get(id).url:null);
    const facts=core
      ?[p.description,p.specs?.movement||p.movement,p.specs?.diameter||p.specs?.caseSize||'Dimensions non documentées']
      :[p.category,p.movement,p.case];
    const link='../montres/'+e(p.id)+'.html';
    const factList=facts.filter(Boolean).map(x=>'<li>'+e(x)+'</li>').join('');
    const stage=photo
      ?'<img src="'+e(photo)+'" loading="lazy" decoding="async" alt="Montre '+e(name)+'">'
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
      +'<div class="am-shopper-art'+(photo?' am-shopper-real-photo':'')+'" role="group" aria-label="'+(photo?'Photographie locale du modèle exact, droits déclarés':'Repère graphique, non contractuel')+'">'+stage+'</div>'
      +'<div class="am-shopper-card-body"><p class="am-shopper-card-label">'+(core?'Collection photographiée':'Sélection complémentaire')+'</p>'
      +'<h2><a href="'+link+'">'+e(name)+'</a></h2><ul>'+factList+'</ul>'
      +'<div class="am-shopper-actions">'+action+'<a class="am-shopper-detail" href="'+link+'">Voir les caractéristiques et sources</a></div>'
      +'<p class="am-shopper-disclosure">'+e(explanation)+'</p></div></article>';
  };
  const nav='<nav class="am-shopper-nav" aria-label="Sélections par type de montre">'
    +selections.map(s=>'<a href="./'+e(s.slug)+'.html">'+e(s.label)+'</a>').join('')+'</nav>';
  const paths=[];
  for(const selected of selections){
    const min=selected.kind==='pagani'?3:4;
    if(selected.ids.length<min||new Set(selected.ids).size!==selected.ids.length)
      throw Error('Invalid curated selection '+selected.slug);
    if(selected.kind){
      const expected=[...all.values()].map(x=>x.product)
        .filter(p=>selected.kind==='skmei'?p.brand==='SKMEI'
          :selected.kind==='pagani'?p.brand==='Pagani Design'
          :selected.kind==='digital'?/numérique|digital/i.test(p.movement):false)
        .map(p=>p.id).sort();
      if(expected.length!==selected.ids.length||
        expected.some((id,i)=>id!==[...selected.ids].sort()[i]))
        throw Error('Brand/display collection out of sync with verified source catalogue: '+selected.slug);
    }
    const path='montres/'+selected.slug+'.html';
    const items=selected.ids.map(card).join('');
    const advice=selected.advice.map(t=>'<li>'+e(t)+'</li>').join('');
    const special=Boolean(selected.kind);
    const compareIds=selected.compareIds||[];
    if(special&&(compareIds.length!==3||new Set(compareIds).size!==3||
        compareIds.some(id=>!selected.ids.includes(id))))
      throw Error('Invalid source-backed three-way comparison in '+selected.slug);
    const compareHref='./toutes-les-montres.html?compare='+compareIds.join(',')+'#comparer';
    const compareCta=special?'<a class="am-shopper-compare" href="'+e(compareHref)+
      '" data-shopper-compare="'+e(selected.slug)+'">Comparer ces trois références dans le tableau complet</a>':'';
    const insightHtml=special
      ?'<section class="am-shopper-insights" aria-label="Conseils spécifiques à cette sélection"><h2>Comprendre les différences entre ces références</h2><div class="am-shopper-insight-grid">'+
         selected.insights.map(([title,text])=>'<article><h3>'+e(title)+'</h3><p>'+e(text)+'</p></article>').join('')+
         '</div></section>':'';
    const factualHtml=special?'<section class="am-shopper-matrix" id="am-shopper-matrix" aria-labelledby="am-shopper-matrix-title"><h2 id="am-shopper-matrix-title">Caractéristiques documentées des '+selected.ids.length+' modèles</h2>'+
      '<p>Cette comparaison reprend les descriptions fabricant ou vendeur citées dans les fiches. Les données non renseignées ne sont pas estimées.</p>'+
      '<div class="comparison-scroll" role="region" tabindex="0" aria-label="Tableau comparatif des références"><table class="spec-matrix">'+
      '<caption>'+e(selected.label)+' : caractéristiques selon les sources du catalogue</caption><thead><tr>'+
      '<th scope="col">Modèle</th><th scope="col">Mouvement annoncé</th><th scope="col">Boîtier</th><th scope="col">Verre</th><th scope="col">Étanchéité</th></tr></thead><tbody>'+
      selected.ids.map(id=>{
        const item=all.get(id),p=item.product;
        const movement=item.core?(p.specs?.movement||p.movement):p.movement;
        const size=item.core?(p.specs?.diameter||p.specs?.caseSize):p.case;
        const glass=item.core?p.specs?.glass:p.glass;
        const water=item.core?p.specs?.waterResistance:p.water;
        return '<tr data-matrix-watch="'+e(id)+'"><th scope="row"><a href="./'+e(id)+'.html">'+e(p.brand+' '+p.model)+'</a></th>'+
          [movement,size,glass,water].map(v=>'<td>'+e(v||'Non documenté')+'</td>').join('')+'</tr>';
      }).join('')+'</tbody></table></div>'+compareCta+'</section>':'';
    const affiliateNote=partners.enabled?
      'Certains liens Amazon.fr sont rémunérés. Un lien direct indique une correspondance de référence documentée; un lien de recherche peut afficher des variantes. En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises.':
      'Aucun lien rémunéré n’est actif dans cette sélection.';
    const main='<div class="wrap am-shopper-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="./modeles-populaires.html">Les montres</a> / '+e(selected.label)+'</nav>'
      +'<header class="am-shopper-heading"><p class="eyebrow">Sélection éditoriale · références traçables</p>'
      +'<h1>'+e(selected.headline)+'</h1><p class="lead">'+e(selected.intro)+'</p>'
      +'<p class="am-shopper-method-note">Les modèles sont choisis pour leurs usages et leur esthétique, et non pour des ventes Amazon prétendument mesurées. Aucun prix, disponibilité ou avis n’est inventé.</p>'
      +nav+'</header>'
      +(special?'<div class="am-shopper-intent-nav"><a href="#am-shopper-matrix">Voir le tableau des '+selected.ids.length+' références</a>'+compareCta+'</div>':'')
      +'<div class="am-shopper-grid">'+items+'</div>'
      +factualHtml+insightHtml
      +'<section class="am-shopper-guide"><h2>'+e(selected.adviceTitle)+'</h2><ol>'+advice+'</ol></section>'
      +'<aside class="am-shopper-endnote"><p>'+e(affiliateNote)+'</p>'
      +'<p>Les photographies locales sont publiées sur la base d’autorisations déclarées par l’éditeur, non vérifiées indépendamment. Pour les références sans photo enregistrée, un repère graphique est conservé; leurs véritables photos figurent sur les fiches de référence.</p>'
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
