import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Three evidence-led, crawlable search-intent collections.
 * We deliberately do not create combinatorial filter URLs or rephrase the
 * existing automatic-watch guide into near-duplicate SEO pages.
 */
export function buildSearchCollections({root,products,amazonLinks,partners,pageHead,page,e,u}){
  const byId=new Map(products.map(p=>[p.id,p]));
  const fmtMovement={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
  const diameter=p=>{
    const v=p.specs?.diameter||'';
    const match=/^(\d{1,2})(?:[,.](\d{1,2}))?\s*mm$/i.exec(v.trim());
    return match?Number(match[1]+'.'+(match[2]||'0')):null;
  };
  const sourcesFor=p=>p.photoReview?.publicUsageApproved===true&&
    p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp';
  const groups=[
    {
      slug:'montres-quartz',
      heading:'Montres à quartz : sept modèles à comparer',
      title:'Montres quartz : 7 modèles Casio, Swatch et Tissot | Atelier Montres',
      description:'Montres à quartz : comparez 7 références exactes Casio, Swatch et Tissot. Cadrans, diamètres documentés et différences avec les automatiques.',
      audience:'Sélection quartz',
      subhead:'Pour celles et ceux qui privilégient la simplicité au quotidien',
      intro:'Une montre à quartz régule l’heure grâce à un oscillateur électronique. Dans cette sélection, les silhouettes vont d’une Casio rétro numérique à une Tissot PRX au bracelet intégré. Le mouvement ne suffit pas à départager deux montres : le diamètre, le verre et l’étanchéité doivent être vérifiés séparément.',
      predicate:p=>p.movement==='quartz',
      narrative:`<h2>Quartz : pourquoi choisir ce mouvement ?</h2>
      <p>Le quartz est généralement pratique lorsque l’on souhaite porter sa montre sans se préoccuper du remontage mécanique. Une pile ou une source d’énergie spécifique l’alimente selon le modèle. Il ne garantit pas à lui seul la résistance aux rayures, aux chocs ou à l’eau.</p>
      <h2>Sept esthétiques différentes, pas sept prix supposés</h2>
      <p>Parmi nos références, les Casio A168WA-1 et MTP-B145D-2A2V évoquent deux interprétations du rétro, tandis que la Tissot PRX Quartz privilégie des lignes de bracelet intégrées. La Casio LTP-1302PD-7A1V possède un diamètre documenté de 30,2 mm ; le modèle MTP-1302PD-2A2V mesure 38,5 mm. Une taille non renseignée n’est pas estimée.</p>
      <h2>Quartz, automatique ou solaire ?</h2>
      <p>Une montre automatique tire son énergie du ressort remonté par les mouvements du poignet ; une solaire recharge son accumulateur à la lumière. Le bon choix dépend de votre préférence d’entretien, de style et de mouvement. Pour comprendre les différences : <a href="./quartz-ou-automatique.html">guide quartz ou automatique</a>.</p>`,
      expected:7
    },
    {
      slug:'montres-casio',
      heading:'Montres Casio : cinq références pour comparer les styles',
      title:'Montres Casio : 5 références, tailles et styles | Atelier Montres',
      description:'Comparez 5 montres Casio : MTP-1302, MTP-B145, A168WA, MDV-107 et LTP-1302. Photos réelles, quartz, taille et liens fabricant.',
      audience:'Collection Casio indépendante',
      subhead:'Du numérique rétro au boîtier inspiré de la plongée',
      intro:'Casio propose des esthétiques très différentes sous une même marque. Cette sélection indépendante réunit cinq références exactes, toutes à quartz dans notre catalogue, sans prétendre représenter l’ensemble de la gamme actuelle.',
      predicate:p=>p.brand==='Casio',
      narrative:`<h2>Une collection Casio aux usages différents</h2>
      <p>La Casio A168WA-1 revendique un affichage numérique rétro, la MDV-107-1A1V une allure de plongeuse et la MTP-B145D-2A2V une silhouette d’acier compacte. La MTP-1302PD-2A2V mise sur un cadran turquoise ; la LTP-1302PD-7A1V se distingue par un format réduit. Ce sont des différences de conception et de style, pas des notes de qualité ou de fiabilité.</p>
      <h2>Comparer les dimensions documentées</h2>
      <p>Notre catalogue confirme 35 mm pour la MTP-B145D-2A2V, 38,5 mm pour la MTP-1302PD-2A2V et 30,2 mm pour la LTP-1302PD-7A1V. Les dimensions de l’A168WA-1 et de la MDV-107-1A1V ne sont pas enregistrées ici et doivent être vérifiées sur leur fiche fabricant. L’épaisseur et l’entre-cornes comptent autant que le diamètre pour le confort.</p>
      <h2>Comment vérifier la bonne référence Casio ?</h2>
      <p>Comparez systématiquement le code complet du modèle, notamment le suffixe de variante, avant un achat chez un vendeur tiers. Un cadran ressemblant ne suffit pas à identifier une montre. Les liens ci-dessous renvoient à nos fiches détaillées et aux pages fabricant exactes. Notre sélection n’est pas une boutique Casio officielle.</p>`,
      expected:5
    },
    {
      slug:'montres-petit-boitier',
      heading:'Montres à petit boîtier : trois modèles de 38 mm ou moins',
      title:'Montre petit boîtier : 30,2, 35 et 38 mm | Atelier Montres',
      description:'Trois montres à petit boîtier : Casio 30,2 mm, Casio 35 mm, Hamilton 38 mm. Comparez mouvements, verres et proportions documentées.',
      audience:'Sélection de boîtiers compacts',
      subhead:'Trois diamètres renseignés, sans déduire la taille du poignet',
      intro:'Un diamètre contenu peut être une piste pour rechercher une montre discrète, mais il ne permet pas à lui seul de garantir le confort. Cette sélection reprend uniquement les trois références de 38 mm ou moins dont la mesure figure dans notre catalogue.',
      predicate:p=>{const d=diameter(p);return d!==null&&d<=38},
      narrative:`<h2>Trois diamètres exacts à comparer</h2>
      <p>La Casio LTP-1302PD-7A1V mesure 30,2 mm, la Casio MTP-B145D-2A2V 35 mm et la Hamilton Khaki Field Auto H70455133 38 mm selon les données documentées dans notre sélection. Le tableau ci-dessous sépare la taille des autres caractéristiques, qui ne découlent jamais automatiquement du diamètre.</p>
      <h2>La montre compacte n’est pas réservée à un genre</h2>
      <p>Un boîtier de taille réduite peut convenir à différents poignets et styles. La forme des cornes, leur longueur, l’épaisseur, le poids et le bracelet changent la perception d’une montre. Nous ne faisons pas de correspondance automatique entre 35 mm et un tour de poignet particulier. Un essayage ou les mesures complètes du fabricant sont préférables.</p>
      <h2>Quartz compact ou mécanique compacte ?</h2>
      <p>Les deux Casio de ce groupe sont à quartz ; la Hamilton Khaki Field Auto est une automatique. Le choix dépend aussi de votre usage et de votre intérêt pour l’entretien mécanique. Pour comprendre le rôle du diamètre et des autres mesures : <a href="./taille-boitier-montre.html">guide des tailles de montres</a>.</p>`,
      expected:3
    }
  ];
  const paths=[],byProduct=new Map();
  const navigation=groups.map(g=>({path:'montres/'+g.slug+'.html',label:g.audience,heading:g.heading}));
  for(const g of groups){
    const list=products.filter(g.predicate);
    if(list.length!==g.expected||new Set(list.map(p=>p.id)).size!==list.length)
      throw Error('Collection éditoriale incomplète ou source modifiée : '+g.slug);
    const rel='montres/'+g.slug+'.html';paths.push(rel);
    for(const p of list){const current=byProduct.get(p.id)||[];current.push({path:rel,label:g.audience});byProduct.set(p.id,current)}
    const visual=list.map(p=>{
      const allowed=sourcesFor(p);
      const photo=allowed?'<img src="../assets/watches/'+e(p.id)+'.webp" alt="'+e(p.brand+' '+p.model)+' — photographie de la référence" width="380" height="380" loading="lazy" decoding="async">':
        '<div class="seo-collection-missing">Photo disponible auprès du fabricant</div>';
      const affiliate=partners.links.get(p.id),amazon=amazonLinks.get(p.id);
      const outbound=affiliate
        ?'<a class="seo-collection-merchant" href="'+e(affiliate.url)+'" target="_blank" rel="nofollow sponsored noopener noreferrer" data-amazon-product="'+e(p.id)+'" data-amazon-placement="category">Voir sur Amazon.fr · lien rémunéré ↗</a>'
        :amazon?'<a class="seo-collection-merchant" href="'+e(amazon.url)+'" target="_blank" rel="nofollow noopener noreferrer">Voir sur Amazon.fr · lien non rémunéré ↗</a>':'';
      return '<article class="seo-collection-card" data-watch-id="'+e(p.id)+'"><a class="seo-collection-picture" href="./'+e(p.id)+'.html" aria-label="Voir la fiche de '+e(p.brand+' '+p.model)+'">'+photo+'</a><div class="seo-collection-card-copy"><p class="seo-collection-maker">'+e(p.brand)+'</p><h2><a href="./'+e(p.id)+'.html">'+e(p.model)+'</a></h2><p>'+e(p.story||p.description)+'</p><dl><div><dt>Mouvement</dt><dd>'+e(p.specs?.movement||fmtMovement[p.movement]||'À vérifier')+'</dd></div><div><dt>Diamètre</dt><dd>'+e(p.specs?.diameter||'Non renseigné')+'</dd></div></dl><div class="seo-collection-actions"><a href="./'+e(p.id)+'.html">Comparer cette montre ↗</a><a href="'+e(p.officialUrl)+'" target="_blank" rel="nofollow noopener noreferrer">Fiche fabricant ↗</a>'+outbound+'</div></div></article>';
    }).join('');
    const matrixRows=list.map(p=>'<tr><th scope="row"><a href="./'+e(p.id)+'.html">'+e(p.brand+' '+p.model)+'</a></th><td>'+e(p.specs?.movement||fmtMovement[p.movement]||'À vérifier')+'</td><td>'+e(p.specs?.diameter||'Non renseigné')+'</td><td>'+e(p.specs?.glass||'Non renseigné')+'</td><td>'+e(p.specs?.waterResistance||'Non renseigné')+'</td></tr>').join('');
    const other=groups.filter(q=>q.slug!==g.slug).map(q=>'<li><a href="./'+e(q.slug)+'.html">'+e(q.heading)+'</a></li>').join('');
    const main='<div class="wrap editorial seo-collection"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / '+e(g.audience)+'</nav><p class="eyebrow">Atelier Montres · '+e(g.audience)+'</p><h1>'+e(g.heading)+'</h1><p class="lead">'+e(g.intro)+'</p><p class="disclosure">Sélection indépendante. Les photos des modèles proviennent de sources déclarées autorisées par l’éditeur. Les prix, stocks et garanties sont à vérifier chez le vendeur ; aucune vente ni paiement n’a lieu sur Atelier Montres. Les liens rémunérés sont identifiés à côté des modèles concernés.</p><section class="seo-collection-overview" aria-labelledby="models-title"><h2 id="models-title">'+list.length+' références réelles à explorer</h2><p>'+e(g.subhead)+'. Chaque carte renvoie à la fiche détaillée et à la documentation du fabricant.</p><div class="seo-collection-grid">'+visual+'</div></section><section class="content seo-collection-evidence"><h2>Caractéristiques des modèles de cette sélection</h2><p>Les valeurs ci-dessous proviennent du catalogue documenté. Une mesure absente n’est jamais estimée : vérifiez les données sur le site du fabricant.</p><div class="comparison-scroll" role="region" tabindex="0" aria-label="Tableau des montres et caractéristiques"><table class="spec-matrix"><caption>Comparaison factuelle des '+list.length+' montres</caption><thead><tr><th scope="col">Modèle</th><th scope="col">Mouvement</th><th scope="col">Diamètre</th><th scope="col">Verre</th><th scope="col">Étanchéité</th></tr></thead><tbody>'+matrixRows+'</tbody></table></div>'+g.narrative+'<h2>Poursuivre la comparaison</h2><p>Les modèles cités ne représentent pas l’intégralité des collections des fabricants. Notre <a href="../conseiller.html">conseiller de montres</a> peut comparer d’autres critères, notamment le mouvement et la taille.</p><ul class="related">'+other+'</ul><p><a class="primary" href="../index.html#montres">Voir les 15 montres de la sélection</a></p></section></div>';
    const image=list.find(sourcesFor);
    const structured={'@context':'https://schema.org','@graph':[
      {'@type':'CollectionPage',name:g.heading,description:g.intro,inLanguage:'fr-FR',url:u(rel),mainEntity:{'@id':u(rel)+'#selection'}},
      {'@type':'ItemList','@id':u(rel)+'#selection',name:g.heading,numberOfItems:list.length,itemListElement:list.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Collection',item:u('')},
        {'@type':'ListItem',position:2,name:g.heading,item:u(rel)}
      ]}
    ]};
    writeFileSync(join(root,rel),page(pageHead({title:g.title,description:g.description,path:rel,image:image?u('assets/watches/'+image.id+'.webp'):undefined}),main,structured));
  }
  const homeCards='<section class="seo-search-collections" id="collections" aria-labelledby="seo-collections-title"><div class="wrap"><p class="overline kicker">Explorer par style et critères</p><h2 id="seo-collections-title">Quel type de montre recherchez-vous ?</h2><p>Des sélections indépendantes avec les vraies références, leurs photographies et uniquement les caractéristiques documentées. Sans tarif ni classement inventés.</p><div class="seo-search-collection-grid">'+groups.map((g,i)=>'<article><span>0'+(i+1)+' / '+e(g.audience.toUpperCase())+'</span><h3>'+e(g.heading)+'</h3><p>'+e(g.intro)+'</p><a href="./montres/'+e(g.slug)+'.html">Explorer les modèles →</a></article>').join('')+'</div></div></section>';
  return {paths,byProduct,homeCards,navigation};
}
