import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {responsiveAttrs} from './responsive-images.mjs';

/**
 * Four hand-curated, source-led comparisons. Every factual value comes from
 * the same product catalogue used by the main storefront and static SEO pages.
 * No prices, availability, ratings or presumed photo licences are generated.
 */
export function buildComparisonPages({root,products,amazonLinks,partners,pageHead,page,e,u,amazonStatement}){
  const source=JSON.parse(readFileSync(join(root,'comparaisons-montres.json'),'utf8'));
  if(source?.version!==1||!Array.isArray(source.comparisons)||source.comparisons.length!==4)
    throw Error('Comparaisons éditoriales incomplètes');
  const byId=new Map(products.map(p=>[p.id,p]));
  const slugs=new Set(),pairs=new Set(),comparisonPaths=[],comparisonsById=new Map(),cards=[];
  const movement={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire (Eco-Drive)'};
  const safeText=v=>typeof v==='string'&&v.trim().length>=12&&v.length<=480;
  const display=p=>p.brand+' '+p.model;
  const key=v=>String(v).trim().toLocaleLowerCase('fr-FR').replace(/\s+/g,' ');
  const official=p=>{
    const url=new URL(p.officialUrl);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw Error('Lien fabricant non sûr: '+p.id);
    return '<a class="primary" target="_blank" rel="noopener noreferrer nofollow" href="'+e(url.href)+'">Voir la fiche officielle ↗</a>';
  };
  const amazon=p=>{
    const paid=partners.links.get(p.id),plain=amazonLinks.get(p.id);
    if(!paid&&!plain)return '';
    const url=paid?.url||plain.url;
    return '<a class="secondary" target="_blank" rel="'+(paid?'noopener noreferrer nofollow sponsored':'noopener noreferrer nofollow')+'" data-amazon-product="'+e(p.id)+'" data-amazon-placement="seo" href="'+e(url)+'">'+(paid?'Voir sur Amazon.fr · lien rémunéré':'Voir sur Amazon.fr · lien non rémunéré')+' ↗</a>';
  };
  const authorizedPhoto=p=>p.photoReview?.publicUsageApproved===true&&
    p.photoReview.localUrl==='./assets/watches/'+p.id+'.webp';
  const art=p=>authorizedPhoto(p)
    ? '<img class="headtohead-photo" src="../assets/watches/'+e(p.id)+'.webp"'+responsiveAttrs(root,p,{prefix:'../',sizes:'(max-width: 780px) 92vw, 440px',escape:e})+' alt="Photographie de '+e(display(p))+'" width="900" height="900" loading="lazy" decoding="async">'
    : '<div class="watch-vector" data-watch-id="'+e(p.id)+'" data-brand="'+e(p.brand)+'" data-model="'+e(p.model)+'" data-tone="'+e(p.tone||'silver')+'" role="img" aria-label="Illustration éditoriale du style '+e(display(p))+'"></div>';
  for(const pair of source.comparisons){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pair?.slug||'')||pair.slug.length>90||slugs.has(pair.slug))
      throw Error('Slug de comparaison absent, répété ou invalide');
    slugs.add(pair.slug);
    if(pair.left===pair.right||!byId.has(pair.left)||!byId.has(pair.right))
      throw Error('Paire de montres non vérifiée: '+pair.slug);
    const unique=[pair.left,pair.right].sort().join('|');
    if(pairs.has(unique))throw Error('Paire redondante: '+pair.slug);
    pairs.add(unique);
    for(const prop of ['title','description','intro','leftAdvice','rightAdvice','caution'])
      if(!safeText(pair[prop]))throw Error('Texte éditorial manquant: '+pair.slug+' / '+prop);
    if(pair.title.length>130||pair.description.length>190)throw Error('Meta trop longue: '+pair.slug);
    const left=byId.get(pair.left),right=byId.get(pair.right);
    const path='montres/comparer-'+pair.slug+'.html';
    comparisonPaths.push(path);
    for(const p of [left,right]){
      if(!comparisonsById.has(p.id))comparisonsById.set(p.id,[]);
      comparisonsById.get(p.id).push({path,title:pair.title});
    }
    const fields=[
      ['Mouvement',p=>p.specs?.movement||movement[p.movement]],
      ['Diamètre du boîtier',p=>p.specs?.diameter],
      ['Verre',p=>p.specs?.glass],
      ['Étanchéité annoncée',p=>p.specs?.waterResistance]
    ];
    const rows=fields.map(([label,get])=>{
      const a=get(left),b=get(right),different=Boolean(a&&b&&key(a)!==key(b));
      return '<tr'+(different?' class="comparison-different"':'')+'><th scope="row">'+e(label)+'</th><td>'+e(a||'À vérifier')+'</td><td>'+e(b||'À vérifier')+'</td></tr>';
    }).join('');
    const buyerCard=(p,why,i)=>{
      const compensation=partners.links.has(p.id);
      return '<article class="headtohead-watch"><div class="headtohead-watch-visual">'+art(p)+'</div><div class="headtohead-watch-body">'+
        '<span class="eyebrow">Modèle '+(i+1)+' · '+e(movement[p.movement]||'Horlogerie')+'</span>'+
        '<h2>'+e(display(p))+'</h2><p>'+e(why)+'</p>'+
        '<p class="headtohead-watch-evidence"><strong>Référence :</strong> '+e(p.model)+' · <a href="./'+e(p.id)+'.html">Lire sa fiche technique</a></p>'+
        '<div class="headtohead-watch-actions">'+official(p)+amazon(p)+'</div>'+
        '<p class="headtohead-watch-legal">Prix, stock, vendeur et conditions à vérifier sur le site tiers. '+
          (compensation?'Lien Amazon rémunéré : '+e(amazonStatement)+'.':'Aucune commission ne nous est actuellement versée pour ce modèle.')+'</p></div></article>';
    };
    const html=[
      '<div class="wrap editorial headtohead">',
      '<nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / <a href="../index.html#comparaisons">Comparaisons</a> / '+e(pair.title)+'</nav>',
      '<p class="eyebrow">Duel horloger · Références vérifiables</p><h1>'+e(pair.title)+'</h1>',
      '<p class="lead">'+e(pair.intro)+'</p>',
      '<p class="disclosure">Comparatif éditorial sans prix ni disponibilité synchronisés. Les photographies de modèles sont affichées sur déclaration d’autorisation du responsable du site ; vérifiez les fiches fabricants pour des visuels et données à jour.</p>',
      '<section class="headtohead-grid" aria-label="Les deux montres à comparer">',
        buyerCard(left,pair.leftAdvice,0),buyerCard(right,pair.rightAdvice,1),
      '</section>',
      '<section class="content headtohead-evidence" aria-labelledby="compare-specs">',
        '<h2 id="compare-specs">Les caractéristiques, face à face</h2>',
        '<p>Chaque ligne reprend les informations présentes dans notre catalogue, associées à la référence exacte. Une absence de donnée ne constitue pas un désavantage technique.</p>',
        '<div class="comparison-scroll" role="region" aria-label="Comparaison de deux montres, tableau défilant horizontalement" tabindex="0">',
          '<table class="spec-matrix"><caption>Caractéristiques documentées</caption><thead><tr><th scope="col">Critère</th><th scope="col">'+e(display(left))+'</th><th scope="col">'+e(display(right))+'</th></tr></thead><tbody>'+rows+'</tbody></table>',
        '</div>',
        '<h2>Quel modèle examiner en priorité ?</h2>',
        '<div class="headtohead-choice"><div><h3>'+e(display(left))+'</h3><p>'+e(pair.leftAdvice)+'</p></div>',
          '<div><h3>'+e(display(right))+'</h3><p>'+e(pair.rightAdvice)+'</p></div></div>',
        '<h2>Ce qu’il reste à vérifier</h2><p>'+e(pair.caution)+'</p>',
        '<p>Avant tout achat, contrôlez la référence, le vendeur, la garantie, le confort du bracelet et les conditions de retour. Une résistance à l’eau en bar n’est pas une profondeur de plongée garantie.</p>',
        '<p><a href="./taille-boitier-montre.html">Choisir le bon diamètre</a> · <a href="./quartz-ou-automatique.html">Comprendre les mouvements</a> · <a href="../index.html#comparaisons">Toutes nos comparaisons</a></p>',
        '<p><a class="primary" href="../conseiller.html">Trouver une montre selon vos critères ↗</a></p>',
      '</section></div>'
    ].join('');
    const title=pair.title+' | Atelier Montres';
    const schema={'@context':'https://schema.org','@graph':[
      {'@type':'Article',headline:pair.title,description:pair.description,inLanguage:'fr-FR',author:{'@type':'Organization',name:'Atelier Montres'},mainEntityOfPage:u(path)},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Atelier Montres',item:u('')},
        {'@type':'ListItem',position:2,name:'Comparaisons',item:u('')+'#comparaisons'},
        {'@type':'ListItem',position:3,name:pair.title,item:u(path)}
      ]},
      {'@type':'ItemList',numberOfItems:2,itemListElement:[left,right].map((p,i)=>({
        '@type':'ListItem',position:i+1,name:display(p),url:u('montres/'+p.id+'.html')
      }))}
    ]};
    writeFileSync(join(root,path),page(pageHead({title,description:pair.description,path,image:authorizedPhoto(left)?u('assets/watches/'+left.id+'.webp'):undefined,illustration:!authorizedPhoto(left)||!authorizedPhoto(right)}),html,schema));
    cards.push('<article><span>COMPARAISON · 2 MODÈLES</span><h3>'+e(pair.title)+'</h3>'+
      '<p>'+e(pair.intro)+'</p><a href="./'+e(path)+'">Voir le comparatif détaillé →</a></article>');
  }
  const comparisonCards='<section class="seo-guides headtohead-home" id="comparaisons" aria-labelledby="seo-duels-title">'+
    '<div class="wrap"><p class="overline kicker">Faire un choix éclairé</p><h2 id="seo-duels-title">Comparer deux montres, vraiment.</h2>'+
    '<p class="seo-guides-lead">Quatre duels avec leurs références exactes, leurs caractéristiques documentées et les points qui restent à vérifier avant un achat.</p>'+
    '<div class="seo-guide-grid">'+cards.join('')+'</div></div></section>';
  return {comparisonPaths,comparisonsById,comparisonCards};
}
