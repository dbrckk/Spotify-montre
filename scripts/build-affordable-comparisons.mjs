import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';

/**
 * Four independent buyer-decision pages, based exclusively on the 37-watch
 * manufacturer/seller catalogue and separately reviewed Amazon ASIN register.
 * No store API, invented prices, stock, reviews or undeclared product photos.
 */
export function buildAffordableComparisons({root,affiliates,amazonPartnerTag,pageHead,page,e,u}){
  const source=JSON.parse(readFileSync(join(root,'comparaisons-accessibles.json'),'utf8'));
  const products=JSON.parse(readFileSync(join(root,'selection-populaires.json'),'utf8')).products;
  if(source.version!==1||!/^20\d{2}-\d{2}-\d{2}$/.test(source.reviewedOn||'')
    ||!Array.isArray(source.comparisons)||source.comparisons.length!==4
    ||products.length!==37)throw Error('Affordable editorial comparison source is incomplete');
  const models=new Map(products.map(p=>[p.id,p]));
  const photos=loadApprovedPopularPhotos({root,picks:products});
  const exactLinks=loadVerifiedPopularLinks({root,picks:products,affiliates,amazonPartnerTag});
  const names=p=>p.brand+' '+p.model;
  const slugs=new Set(),uniquePairs=new Set(),paths=[],byModel=new Map(),cards=[];
  const fieldNames=[
    ['Mouvement',p=>p.movement],
    ['Dimensions du boîtier',p=>p.case],
    ['Verre annoncé',p=>p.glass],
    ['Étanchéité annoncée',p=>p.water]
  ];
  const external=p=>{
    const url=new URL(p.officialUrl);
    if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)
      throw Error('Unsafe watch manufacturer destination: '+p.id);
    return url.href;
  };
  const photo=p=>{
    const record=photos.get(p.id);
    return record
      ?'<img class="am-duel-product-photo" src="../'+e(record.url)+'" alt="Photographie du modèle '+e(names(p))+'" width="440" height="440" loading="lazy" decoding="async">'
      :'<span class="am-duel-photo-fallback"><strong>'+e(p.brand)+'</strong><small>Photographie exacte à consulter chez le fabricant</small></span>';
  };
  const merchant=p=>{
    const match=exactLinks.get(p.id);
    if(!match)return '<a class="am-duel-merchant" href="'+e(external(p))+'" data-merchant-official-id="'+e(p.id)+'" data-merchant-placement="seo" target="_blank" rel="noopener noreferrer nofollow">Consulter la fiche du fabricant · non rémunéré</a>';
    return '<a class="am-duel-merchant" href="'+e(match.url)+'" data-amazon-product="'+e(p.id)+'" data-amazon-placement="seo" target="_blank" rel="noopener noreferrer nofollow sponsored">Voir la fiche Amazon.fr documentée · lien rémunéré</a>';
  };
  const evidence=p=>{
    const match=exactLinks.get(p.id);
    if(!match)return '<p class="am-duel-source-status"><strong>Aucune fiche Amazon exacte confirmée.</strong> Consultez la source fabricant ; une recherche Amazon n’est pas une offre de ce modèle.</p>';
    const comparator=match.evidenceType==='amazon_fr_comparator_redirect';
    return '<p class="am-duel-source-status"><strong>ASIN '+e(match.asin)+' · correspondance documentée le '+e(match.verifiedAt)+'</strong>'
      +(comparator?' · Recoupement par comparateur, Amazon.fr non consulté directement.':' · Correspondance de modèle enregistrée ; la fiche peut évoluer.')
      +' Prix, stock et vendeur non vérifiés en temps réel.</p>'
      +(match.marketplaceVariant?'<p class="am-duel-variant"><strong>Variante de la fiche Amazon :</strong> '+e(match.marketplaceVariant)+'</p>':'');
  };
  for(const pair of source.comparisons){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pair.slug||'')||slugs.has(pair.slug)
      ||pair.slug.length>75)throw Error('Duplicate or invalid comparison slug');
    slugs.add(pair.slug);
    const left=models.get(pair.left),right=models.get(pair.right);
    if(!left||!right||left.id===right.id)throw Error('Comparison must reference two real distinct supplemental watches: '+pair.slug);
    const unique=[left.id,right.id].sort().join('|');
    if(uniquePairs.has(unique))throw Error('Duplicate exact-watch comparison: '+unique);
    uniquePairs.add(unique);
    for(const field of ['eyebrow','title','description','intro','leftAdvice','rightAdvice','caution']){
      if(typeof pair[field]!=='string'||pair[field].trim().length<22||pair[field].length>800)
        throw Error('Missing original editorial decision copy: '+pair.slug+'/'+field);
    }
    if(pair.title.length>120||pair.description.length>185)
      throw Error('SEO title or description too long: '+pair.slug);
    const path='montres/comparer-'+pair.slug+'.html';
    paths.push(path);
    for(const model of [left,right]){
      if(!byModel.has(model.id))byModel.set(model.id,[]);
      byModel.get(model.id).push({path,title:pair.title,other: names(model.id===left.id?right:left)});
    }
    const compareHref='./toutes-les-montres.html?compare='+left.id+','+right.id+'#comparer';
    const rows=fieldNames.map(([name,fn])=>'<tr><th scope="row">'+e(name)+'</th><td>'+e(fn(left))+'</td><td>'+e(fn(right))+'</td></tr>').join('');
    const watchCard=(p,advice,index)=>'<article class="am-duel-model" data-duel-model="'+e(p.id)+'">'
      +'<div class="am-duel-product-stage">'+photo(p)+'</div>'
      +'<div class="am-duel-product-copy"><p class="eyebrow">Option '+(index+1)+' · '+e(p.category)+'</p><h2>'+e(names(p))+'</h2>'
      +'<p>'+e(advice)+'</p>'+evidence(p)
      +'<div class="am-duel-product-actions"><a class="am-duel-details" href="./'+e(p.id)+'.html">Caractéristiques et sources de '+e(p.model)+'</a>'+merchant(p)+'</div>'
      +'</div></article>';
    const main='<div class="wrap editorial am-duel-page" data-affordable-duel="'+e(pair.slug)+'">'
      +'<nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / <a href="../index.html#duels-accessibles">Duels accessibles</a> / '+e(pair.title)+'</nav>'
      +'<p class="eyebrow">'+e(pair.eyebrow)+'</p><h1>'+e(pair.title)+'</h1>'
      +'<p class="lead">'+e(pair.intro)+'</p>'
      +'<p class="disclosure">Analyse documentaire des caractéristiques annoncées par la marque ou le vendeur, sans essai physique. Photographes et licences non vérifiés indépendamment : seules les photos dont la diffusion est déclarée autorisée sont présentes. Le paiement se déroule uniquement chez le marchand tiers.</p>'
      +'<section class="am-duel-models" aria-label="Deux modèles et accès aux fiches">'+watchCard(left,pair.leftAdvice,0)+watchCard(right,pair.rightAdvice,1)+'</section>'
      +'<section class="content am-duel-decision" aria-labelledby="am-duel-facts">'
      +'<h2 id="am-duel-facts">Les différences documentées</h2>'
      +'<p>Ces données reprennent strictement les fiches des références indiquées. Des dimensions en longueur × largeur ne constituent pas un diamètre de boîtier. Les caractéristiques absentes restent non documentées.</p>'
      +'<div class="comparison-scroll" role="region" tabindex="0" aria-label="Tableau de comparaison des deux références exactes">'
      +'<table class="spec-matrix"><caption>Comparaison factuelle</caption><thead><tr><th scope="col">Critère</th><th scope="col">'+e(names(left))+'</th><th scope="col">'+e(names(right))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<h2>À qui correspond chaque approche ?</h2><div class="am-duel-choices"><article><h3>'+e(names(left))+'</h3><p>'+e(pair.leftAdvice)+'</p></article><article><h3>'+e(names(right))+'</h3><p>'+e(pair.rightAdvice)+'</p></article></div>'
      +'<h2>Ce qui doit être vérifié avant toute commande</h2><p>'+e(pair.caution)+'</p>'
      +'<p>Vérifiez toujours la variante expédiée, les matériaux, la notice d’étanchéité, l’identité du vendeur, les frais de livraison en France et les modalités de retour. Aucune commission, remise ou disponibilité n’est présumée.</p>'
      +'<div class="am-duel-bottom-actions"><a class="primary" href="'+e(compareHref)+'">Comparer ces deux modèles dans le catalogue interactif</a><a class="secondary" href="./toutes-les-montres.html">Explorer les 52 montres</a></div>'
      +'<p><a href="./methode-selection.html">Notre méthode de sélection</a> · <a href="../informations-legales.html">Transparence commerciale et informations légales</a></p>'
      +'</section></div>';
    const structured={'@context':'https://schema.org','@graph':[
      {'@type':'Article',headline:pair.title,description:pair.description,inLanguage:'fr-FR',
        author:{'@type':'Organization',name:'Atelier Montres'},mainEntityOfPage:u(path)},
      {'@type':'ItemList',numberOfItems:2,itemListElement:[left,right].map((p,i)=>({
        '@type':'ListItem',position:i+1,name:names(p),url:u('montres/'+p.id+'.html')}))},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Atelier Montres',item:u('')},
        {'@type':'ListItem',position:2,name:'Duels accessibles',item:u('')+'#duels-accessibles'},
        {'@type':'ListItem',position:3,name:pair.title,item:u(path)}
      ]}
    ]};
    const preferred=photos.get(left.id)||photos.get(right.id);
    const html=page(pageHead({title:pair.title+' | Atelier Montres',description:pair.description,path,
      image:preferred?u(preferred.url):undefined}),main,structured)
      .replace('</head>','<link rel="stylesheet" href="../affordable-comparisons.css"></head>');
    writeFileSync(join(root,path),html);
    const thumb=p=>photos.has(p.id)
      ?'<img src="./'+e(photos.get(p.id).url)+'" alt="Montre '+e(names(p))+'" width="180" height="180" loading="lazy" decoding="async">'
      :'<span class="am-duel-card-no-photo">'+e(p.brand)+'<small>Visuel chez le fabricant</small></span>';
    cards.push('<article class="am-duel-promo-card" data-duel-promo="'+e(pair.slug)+'">'
      +'<div class="am-duel-promo-visual"><span>'+thumb(left)+'</span><b aria-hidden="true">VS</b><span>'+thumb(right)+'</span></div>'
      +'<div class="am-duel-promo-text"><p class="eyebrow">'+e(pair.eyebrow)+'</p><h3>'+e(pair.title)+'</h3>'
      +'<p>'+e(pair.intro)+'</p><a href="./'+e(path)+'">Comparer ces deux montres</a></div></article>');
  }
  const homeCards='<section class="am-duel-promo" id="duels-accessibles" aria-labelledby="am-duels-heading">'
    +'<div class="wrap"><p class="overline kicker">Comparer pour mieux choisir</p>'
    +'<h2 id="am-duels-heading">Quatre duels de montres accessibles.</h2>'
    +'<p class="am-duel-promo-lead">Digitales sport ou rétro, boîtier compact ou heure mondiale, cadran épuré ou chronographe : des choix expliqués avec les fiches exactes et leurs limites. Aucun prix ni classement des ventes supposés.</p>'
    +'<div class="am-duel-promo-grid">'+cards.join('')+'</div>'
    +'<p class="am-duel-promo-caveat">Les montres sont présentées à titre éditorial. Les photos publiées reposent sur les autorisations déclarées par l’éditeur, non vérifiées indépendamment. Les liens commerciaux sont identifiés et ne garantissent pas la disponibilité.</p>'
    +'</div></section>';
  return {paths,byModel,homeCards,count:paths.length};
}
