import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildPopularProductPages} from './build-popular-product-pages.mjs';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';

// Curated discovery intentionally stays outside the 15-watch comparator until
// individual Amazon ASINs and licensed exact-model images are validated.
// This prevents an invented product match or silently unlicensed photograph.
export function buildPopularPicks({root,existingProducts,affiliates,amazonPartnerTag,pageHead,page,e,u}){
  const source=JSON.parse(readFileSync(join(root,'selection-populaires.json'),'utf8'));
  const picks=source.products;
  const known=new Set(existingProducts.map(p=>p.id));
  const tiers=['essential','signature','prestige'];
  const tierNames={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
  const permittedHosts=['casio.com','citizenwatch.eu','orientwatch.fr','tissotwatches.com','seikowatches.com','hamiltonwatch.com'];
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
    ||!Array.isArray(picks)||picks.length!==13)throw Error('Supplemental product catalog invalid');
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
  const link=(href,txt,commercial=false,id='',kind='search')=>'<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer nofollow'+(commercial?' sponsored':'')+'"'
    +(commercial?' data-amazon-'+(kind==='product'?'product':'search-id')+'="'+e(id)+'" data-amazon-placement="popular"':'')
    +'>'+e(txt)+'</a>';
  const verifiedLinks=loadVerifiedPopularLinks({root,picks,affiliates,amazonPartnerTag});
  const affiliateLink=p=>{
    if(!affiliates.enabled)return '';
    const direct=verifiedLinks.get(p.id);
    return direct
      ?link(direct.url,'Voir le modèle exact sur Amazon.fr · lien rémunéré',true,p.id,'product')
      :link(amazonSearch(p),'Rechercher sur Amazon.fr · lien rémunéré',true,p.id,'search');
  };
  const detailPaths=buildPopularProductPages({root,products:picks,coreProducts:existingProducts,affiliates,amazonPartnerTag,pageHead,page,e,u,link,amazonSearch,tierNames,affiliateLink,verifiedLinks});
  const card=(p,front=false)=>{
    const claim=p.marketEvidence.kind==='editorial'?'Sélection éditoriale':p.marketEvidence.kind==='manufacturer_bestseller'?'Signal marque':'Signal distributeur';
    return '<article class="am-pick-card am-pick-'+e(p.style)+'" id="pick-'+e(p.id)+'">'
      +'<div class="am-pick-visual" role="group" aria-label="Repère graphique non contractuel, sans photographie du modèle"><span class="am-pick-visual-top">'+e(p.category)+'</span>'
      +'<span class="am-pick-visual-name">'+e(p.brand)+'</span><span class="am-pick-visual-ref">'+e(p.model)+'</span>'
      +'<span class="am-pick-visual-caption">Repère graphique · photo exacte chez le fabricant</span></div>'
      +'<div class="am-pick-content"><p class="am-pick-kicker"><span>'+e(tierNames[p.tier])+'</span><span>'+e(claim)+'</span></p>'
      +'<h3><a class="am-pick-detail-link" href="'+(front?'./montres/':'./')+e(p.id)+'.html">'+e(p.brand+' '+p.model)+'</a></h3>'
      +'<p class="am-pick-lead">'+e(p.lead)+'</p>'
      +'<dl class="am-pick-specs"><div><dt>Mouvement</dt><dd>'+e(p.movement)+'</dd></div><div><dt>Boîtier</dt><dd>'+e(p.case)+'</dd></div><div><dt>Verre</dt><dd>'+e(p.glass)+'</dd></div><div><dt>Étanchéité</dt><dd>'+e(p.water)+'</dd></div></dl>'
      +(front?'':'<p class="am-pick-caution"><strong>Avant achat :</strong> '+e(p.caution)+'</p>')
      +'<div class="am-pick-actions">'
      +affiliateLink(p)
      +link(p.officialUrl,'Photos et fiche fabricant')
      +'</div><p class="am-pick-source">Pourquoi ici ? '+link(p.marketEvidence.url,p.marketEvidence.label)+'</p>'
      +'<p class="am-pick-note">'+(verifiedLinks.has(p.id)?'Lien vers une fiche Amazon.fr correspondant à la référence documentée. Vérifiez la variante, le vendeur, le prix et la disponibilité lors de la visite.':'La recherche Amazon peut présenter des variantes ou d’autres produits. Vérifier la référence exacte, le vendeur et le prix avant de commander.')+'</p>'
      +'</div></article>';
  };
  const featuredIds=['casio-ga-2100-1a1','casio-la-20wh-4a1','citizen-tsuyosa-37-blue','casio-edifice-efr-s108d','tissot-gentleman-auto','seiko-presage-srpe43'];
  const featured=featuredIds.map(id=>picks.find(p=>p.id===id));
  if(featured.some(p=>!p))throw Error('Featured model not in source catalog');
  const globalDisclaimer='Ces références complètent les 15 modèles du comparateur. Certaines figurent sur des pages de meilleures ventes de fabricants ou de distributeurs ; ce ne sont pas les meilleures ventes mesurées sur Amazon.fr. Aucun tarif, stock, note ou volume de ventes n’est déduit de ces sources. Les photographies des nouveautés restent chez les fabricants tant que leur réutilisation n’est pas autorisée.';
  const affiliateNote=affiliates.enabled?'Les liens Amazon portent notre identifiant Partenaires. Une fiche directe dispose d’une correspondance de référence documentée ; les autres liens mènent à une recherche. Aucun lien ne garantit la disponibilité, le tarif ou l’approbation définitive de notre compte.':'Aucun lien Amazon rémunéré n’est activé.';
  const teaser='<section class="am-picks" id="modeles-populaires" aria-labelledby="am-picks-title"><div class="wrap">'
    +'<div class="am-picks-heading"><p class="overline kicker">01 · MODÈLES COMPLÉMENTAIRES</p>'
    +'<h2 id="am-picks-title">Des références remarquées, au-delà des 15 montres comparées.</h2>'
    +'<p>G-SHOCK, modèles compacts, automatiques et signatures horlogères : nouvelles idées de montres, choisies à partir des références exactes et des sources fabricants.</p>'
    +'</div><div class="am-picks-grid">'+featured.map(p=>card(p,true)).join('')+'</div>'
    +'<p class="am-picks-disclaimer">'+e(globalDisclaimer)+' '+e(affiliateNote)+'</p>'
    +'<a class="am-picks-more" href="./montres/modeles-populaires.html">Voir les 13 modèles supplémentaires, par gamme →</a>'
    +'</div></section>';
  const sections=tiers.map(t=>'<section class="am-picks-tier" aria-label="Gamme '+e(tierNames[t])+'">'
    +'<h2 id="gamme-'+e(t)+'">Gamme '+e(tierNames[t])+'</h2>'
    +'<div class="am-picks-grid">'+picks.filter(p=>p.tier===t).map(p=>card(p)).join('')+'</div></section>').join('');
  const path='montres/modeles-populaires.html';
  const main='<div class="wrap am-picks-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / Modèles complémentaires</nav>'
    +'<header class="am-picks-intro"><p class="eyebrow">Tendances documentées · '+e(source.reviewedOn)+'</p>'
    +'<h1>13 montres supplémentaires : modèles repérés et choix de style.</h1>'
    +'<p class="lead">Des références identifiées dans des listes de meilleures ventes propres à certains vendeurs ou marques, ainsi que des alternatives choisies pour leur design. Notre sélection est éditoriale, pas un classement des ventes françaises ou Amazon.</p>'
    +'<p>'+e(globalDisclaimer)+'</p><p>'+e(affiliateNote)+'</p>'
    +'<nav class="am-picks-tier-nav" aria-label="Choisir une gamme">'
    +tiers.map(t=>'<a href="#gamme-'+e(t)+'">'+e(tierNames[t])+'</a>').join('')
    +'</nav></header>'+sections
    +'<aside class="am-picks-method"><h2>Comment ces montres sont-elles sélectionnées ?</h2>'
    +'<p>Chaque code de modèle et chaque caractéristique sont rapprochés de la fiche du fabricant. Les mentions « meilleures ventes » décrivent uniquement la liste citée, à la date du '+e(source.reviewedOn)+'. Elles ne constituent pas des données de ventes Amazon ni un palmarès national.</p>'
    +'<p>Nous n’affichons pas de photographie d’un modèle sans autorisation de reproduction, ni de prix Amazon non synchronisé. Les recherches Amazon.fr sont explicitement annoncées comme telles et peuvent mener à plusieurs variantes. Seules les références contrôlées sur une fiche Amazon.fr disposent d’un lien direct. Pour comparer directement des modèles aux photographies locales déjà documentées, <a href="../index.html#montres">revenir aux 15 montres du comparateur</a>.</p></aside></div>';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',name:'13 modèles de montres complémentaires',url:u(path),inLanguage:'fr-FR',description:'Sélection éditoriale fondée sur des sources fabricants et des listes de meilleures ventes distinctes. Aucun classement Amazon revendiqué.'},
    {'@type':'ItemList',numberOfItems:picks.length,itemListElement:picks.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}
  ]};
  writeFileSync(join(root,path),page(pageHead({title:'13 montres à découvrir : G-SHOCK, Citizen, Seiko, Tissot | Atelier Montres',description:'13 montres supplémentaires sélectionnées par catégorie et source : G-SHOCK, montres compactes, automatiques et modèles habillés, avec recherche Amazon clairement signalée.',path}),main,graph).replace('</head>','<link rel="stylesheet" href="../popular-picks.css"></head>'));
  return {path,detailPaths,teaser,count:picks.length,featuredCount:featured.length,searchLinks:affiliates.enabled?picks.length-verifiedLinks.size:0,directLinks:verifiedLinks.size};
}
