import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Source-backed editorial policy, not a claim of physical watch testing.
 * Facts come directly from the live catalog and verified link configuration.
 * Generated as a real, indexable AboutPage with helpful selection criteria.
 */
export function buildEditorialPolicy({root,data,products,amazonLinks,partners,pageHead,page,e,u}){
  const path='montres/methode-selection.html';
  const count=products.length;
  const brands=[...new Set(products.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'fr'));
  const sourced=products.filter(p=>p.photoReview?.publicUsageApproved===true&&p.photoReview?.localUrl==='./assets/watches/'+p.id+'.webp').length;
  const diameters=products.filter(p=>Boolean(p.specs?.diameter)).length;
  const confirmedAmazon=[...amazonLinks.keys()].length;
  if(count!==15||!brands.length||confirmedAmazon>count||sourced>count||diameters>count)throw Error('Données de méthode éditoriale incohérentes');
  const title='Notre méthode : sélectionner et comparer 15 montres | Atelier Montres';
  const description='Découvrez comment Atelier Montres sélectionne ses références exactes, documente les caractéristiques, traite les données manquantes et signale les liens Amazon.';
  const selectionDate=/^\d{4}-\d{2}-\d{2}$/.test(data.selectionDate||'')?data.selectionDate:'date non renseignée';
  const brandItems=brands.map(b=>'<li>'+e(b)+'</li>').join('');
  const modelLinks=products.map(p=>'<li><a href="./'+e(p.id)+'.html">'+e(p.brand+' '+p.model)+'</a></li>').join('');
  const main=[
    '<div class="wrap editorial seo-method">',
      '<nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Collection</a> / Méthode éditoriale</nav>',
      '<p class="eyebrow">Transparence et fiabilité des informations</p>',
      '<h1>Comment nous sélectionnons les montres</h1>',
      '<p class="lead">Notre rôle est de faciliter la comparaison de références précises avant un achat chez un marchand externe. Nous publions des données traçables, séparons les caractéristiques confirmées des informations manquantes et ne prétendons pas avoir testé physiquement les montres.</p>',
      '<p class="seo-method-credit"><strong>Publication :</strong> Atelier Montres, nom de ce site éditorial indépendant. <strong>Sélection enregistrée le :</strong> '+e(selectionDate)+'.</p>',
      '<div class="seo-method-stats" aria-label="Périmètre de la sélection">',
        '<div><strong>'+count+'</strong><span>références documentées</span></div>',
        '<div><strong>'+brands.length+'</strong><span>marques présentes</span></div>',
        '<div><strong>'+diameters+'</strong><span>diamètres renseignés</span></div>',
        '<div><strong>'+confirmedAmazon+'</strong><span>références Amazon.fr identifiées</span></div>',
      '</div>',
      '<section class="content">',
        '<h2>1. Nous partons de la référence exacte</h2>',
        '<p>Chaque modèle du catalogue possède un identifiant de marque, un code de référence complet et un lien vers la fiche de son fabricant. Nous évitons de confondre les variantes visuellement proches : un suffixe peut désigner un cadran, un bracelet ou une configuration différente. Notre sélection n’a pas vocation à représenter tout le catalogue d’une marque.</p>',
        '<p>Marques présentes dans cette sélection :</p><ul class="seo-method-brands">'+brandItems+'</ul>',
        '<h2>2. Nous n’inventons pas les données absentes</h2>',
        '<p>Les caractéristiques présentées proviennent des informations enregistrées pour la référence : type de mouvement, diamètre du boîtier, verre et étanchéité lorsque ces données sont disponibles. À défaut, les fiches affichent « À vérifier » ou « Non renseigné ». Une taille ou une étanchéité supposée ne devient pas un fait simplement parce qu’un modèle ressemble à un autre.</p>',
        '<p>La présence d’une mesure ne garantit pas le confort. L’épaisseur, la longueur entre cornes et le bracelet peuvent modifier le rendu au poignet. Le guide <a href="./taille-boitier-montre.html">choisir la taille de sa montre</a> explique les précautions utiles.</p>',
        '<h2>3. Les photos ne prouvent pas un essai en conditions réelles</h2>',
        '<p>'+sourced+' photographies locales correspondent à des modèles identifiés dans le catalogue et sont publiées sur la base d’une autorisation déclarée par le responsable du site. Cette déclaration ne constitue pas une vérification juridique indépendante des droits d’image. Nos pages ne présentent pas de mesures de précision réalisées au laboratoire, de résultats de tests de résistance, ni d’essais longue durée.</p>',
        '<p>Pour les détails qui influencent un achat, consultez systématiquement la documentation originale de la marque, disponible depuis chaque fiche. Une photo de fabricant n’est pas une preuve de confort au poignet.</p>',
        '<h2>4. Nos comparatifs servent à choisir, pas à attribuer des notes fictives</h2>',
        '<p>Nous rapprochons les modèles selon leurs caractéristiques réellement décrites : mouvement, proportions, style et autres spécifications enregistrées. Nous n’attribuons pas de score de fiabilité, de meilleure vente ou de satisfaction client sans données indépendantes. Les tableaux indiquent quand une information manque.</p>',
        '<p>Consultez les collections <a href="./montres-casio.html">Casio</a>, <a href="./montres-quartz.html">quartz</a> ou <a href="./montres-petit-boitier.html">petits boîtiers</a>, ainsi que le <a href="./quartz-ou-automatique.html">guide quartz ou automatique</a>.</p>',
        '<h2>5. Notre relation avec les marchands</h2>',
        '<p>Atelier Montres ne vend pas directement les modèles présentés et ne reçoit aucun paiement de commande. Le catalogue recense '+confirmedAmazon+' correspondances de références sur Amazon.fr. Lorsque le partenariat est activé pour une fiche, le lien est explicitement intitulé « lien rémunéré » et porte l’attribut <code>rel="sponsored"</code> ; les autres liens sont identifiés séparément. '+(partners.enabled?'Certains liens Amazon sont actuellement rémunérés.':'L’activation commerciale dépend de la configuration des partenariats.')+'</p>',
        '<p>Les prix, stocks, frais de livraison, délais, garanties et conditions de retour doivent être vérifiés directement auprès du vendeur au moment de l’achat. Nous ne publions pas de prix ou de stock synchronisé non vérifié.</p>',
        '<h2>6. Comment utiliser nos fiches pour un achat</h2>',
        '<ol class="seo-method-steps"><li>Identifiez votre usage et le type de mouvement souhaité.</li><li>Comparez uniquement les caractéristiques documentées, notamment le diamètre et l’étanchéité.</li><li>Ouvrez la fiche officielle du fabricant pour confirmer la variante exacte.</li><li>Vérifiez ensuite le prix, le vendeur, la garantie et les retours avant de payer chez le marchand.</li></ol>',
        '<h2>Les quinze références couvertes</h2>',
        '<ul class="related seo-method-products">'+modelLinks+'</ul>',
        '<p><a class="primary" href="../conseiller.html">Utiliser le conseiller de montres</a> <a class="secondary" href="./guide-choisir-montre.html">Lire le guide d’achat</a></p>',
      '</section>',
    '</div>'
  ].join('');
  const structured={
    '@context':'https://schema.org','@graph':[
      {'@type':'AboutPage',name:title,description,url:u(path),inLanguage:'fr-FR',isPartOf:{'@type':'WebSite',name:'Atelier Montres',url:u('')}},
      {'@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Collection',item:u('')},
        {'@type':'ListItem',position:2,name:'Méthode éditoriale',item:u(path)}
      ]}
    ]
  };
  writeFileSync(join(root,path),page(pageHead({title,description,path,type:'website'}),main,structured));
  const teaser='<section class="seo-method-teaser" aria-labelledby="seo-method-title"><div class="wrap"><p class="eyebrow">Comment comparer en confiance</p><h2 id="seo-method-title">Une sélection expliquée, sans promesses inventées.</h2><p>'+count+' références exactes et '+brands.length+' marques : découvrez d’où viennent les informations, pourquoi certaines dimensions restent à vérifier et comment sont signalés les liens rémunérés.</p><a href="./'+e(path)+'">Découvrir notre méthode éditoriale →</a></div></section>';
  return {path,teaser};
}
