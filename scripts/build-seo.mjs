import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {validateAffiliateConfig} from './affiliate-policy.mjs';
import {buildComparisonPages} from './build-comparisons.mjs';

(function buildSeo() {
  const site = new URL(process.env.PUBLIC_SITE_URL || 'https://atelier-montres-selection-fr.onrender.com/');
  if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash) throw new Error('PUBLIC_SITE_URL doit être une origine HTTPS terminée par /');
  const root = resolve(process.cwd(), 'site');
  const data = JSON.parse(readFileSync(join(root, 'selection-affiliation.json'), 'utf8'));
  if (data.version !== 1 || data.affiliateEnabled !== false || data.products.length !== 15 || new Set(data.products.map(p => p.id)).size !== 15) throw Error('Catalogue invalide ou statut affilié inattendu');
  const products = data.products;
  // Amazon.fr product catalogue: exact model matches, without compensation tracking.
  // Never publish a tagged research link while commercial approval is pending.
  const research = JSON.parse(readFileSync(resolve(process.cwd(),'research/amazon-fr-exact-products.json'),'utf8'));
  const productIds = new Set(products.map(p=>p.id));
  const entries = Object.entries(research.products || {});
  if (research.version !== 1 || research.marketplace !== 'amazon.fr' || entries.length !== products.length ||
      entries.some(([id])=>!productIds.has(id))) throw Error('Sources Amazon.fr incomplètes');
  const amazonLinks = new Map();
  for (const [id,item] of entries) {
    if (item.status === 'not_confirmed_on_amazon_fr') {
      if(item.asin !== null || item.productUrl !== null || item.affiliateUrl !== null) throw Error('ASIN non confirmé: '+id);
      continue;
    }
    if (item.status !== 'matched_on_amazon_fr' || !/^[A-Z0-9]{10}$/.test(item.asin || '') ||
        item.productUrl !== 'https://www.amazon.fr/dp/'+item.asin ||
        item.affiliateUrl !== item.productUrl+'?tag='+research.amazonPartnerTag ||
        item.commercialActivationApproved !== false) throw Error('Lien Amazon invalide: '+id);
    amazonLinks.set(id,{asin:item.asin,url:item.productUrl});
  }
  writeFileSync(join(root,'amazon-product-links.json'),JSON.stringify({
    version:1,checkedOn:research.checkedOn,
    links:Object.fromEntries(amazonLinks)
  },null,2)+'\n');
  const partners = validateAffiliateConfig(JSON.parse(readFileSync(join(root,'affiliate-links.json'),'utf8')),products.map(p=>p.id));
  if (partners.enabled) for (const id of partners.links.keys()) {
    const model=products.find(p=>p.id===id);
    if (model?.photoReview?.publicUsageApproved!==true) throw Error('Publication affiliée bloquée : droits commerciaux de la photographie à vérifier pour '+id);
  }
  const amazonStatement = 'En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises';
  const umamiId=(process.env.UMAMI_WEBSITE_ID||'').trim();
  if(umamiId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(umamiId)) {
    throw Error('UMAMI_WEBSITE_ID invalide : identifiant UUID du site Umami requis');
  }
  const umamiScripts=relative=>umamiId
    ? '<script defer src="https://cloud.umami.is/script.js" data-website-id="'+umamiId+'" data-domains="'+site.hostname+'" data-do-not-track="true"></script><script defer src="'+relative+'analytics.js"></script>'
    : '';
  const searchConsoleToken=(process.env.GOOGLE_SITE_VERIFICATION||'').trim();
  if(searchConsoleToken&&!/^[a-zA-Z0-9_.=-]{10,160}$/.test(searchConsoleToken)){
    throw Error('GOOGLE_SITE_VERIFICATION invalide : saisir uniquement le code content de la balise Google (sans HTML)');
  }
  const searchConsoleMeta=searchConsoleToken?'<meta name="google-site-verification" content="'+searchConsoleToken+'">':'';
  const e = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const u = path => new URL(path, site).href;
  const schema = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
  const pageHead = ({ title, description, path, type = 'article', image, illustration = false }) => `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1b2925"><meta name="robots" content="index,follow,max-image-preview:large"><title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(u(path))}"><meta property="og:type" content="${e(type)}"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Atelier Montres"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(u(path))}">${image ? `<meta property="og:image" content="${e(image)}">` : ''}<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../seo-guides.css">${illustration ? '<script defer src="../watch-illustrations.js"></script><script defer src="../seo-watch-art.js"></script>' : ""}${umamiScripts("../")}`;
  const header = `<a class="skip" href="#contenu">Aller au contenu</a><header class="top"><div class="wrap nav"><a class="logo" href="../index.html">✦ Atelier Montres</a><nav aria-label="Navigation principale"><a href="../index.html#montres">Les 15 montres</a><a href="../conseiller.html">Trouver ma montre</a><a href="./guide-choisir-montre.html">Guide d'achat</a><a href="./quartz-ou-automatique.html">Comparer les mouvements</a></nav></div></header>`;
  const footer = `<footer><div class="wrap"><strong>Atelier Montres</strong><p>Sélection éditoriale indépendante. Aucun achat ni paiement ne s'effectue sur ce site actuellement. ${partners.enabled ? 'Certains liens Amazon.fr sont rémunérés (mention « lien rémunéré » à proximité). '+amazonStatement : 'Les liens vers les fabricants ne sont pas rémunérés.'}</p><p><a href="../confidentialite.html">Vie privée</a> · <a href="../index.html#montres">Comparer les montres</a></p></div></footer>`;
  const page = (head, main, structured) => `<!doctype html><html lang="fr"><head>${head}<script type="application/ld+json">${schema(structured)}</script></head><body>${header}<main id="contenu">${main}</main>${footer}</body></html>\n`;
  const allLinks = () => products.map(p => `<li><a href="./montres/${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a><small>${e(p.description)}</small></li>`).join('');
  const movement = { quartz: 'quartz', automatic: 'automatique', 'eco-drive': 'solaire' };
  const category = { essential: 'Essentielle', signature: 'Signature', prestige: 'Prestige' };
  mkdirSync(join(root, 'montres'), { recursive: true });
  const comparisons=buildComparisonPages({root,products,amazonLinks,partners,pageHead,page,e,u,amazonStatement});
  for (const p of products) {
    if (!/^[a-z0-9-]{4,64}$/.test(p.id) || !/^https:\/\//.test(p.officialUrl)) throw Error('Référence ou lien fabricant invalide');
    const rel = 'montres/' + p.id + '.html';
    const name = p.brand + ' ' + p.model;
    const affiliate = partners.links.get(p.id);
    const amazon = amazonLinks.get(p.id);
    const title = name + ' : caractéristiques et alternatives | Atelier Montres';
    const desc = (name + ' : ' + (p.story || p.description) + ' Découvrez le mouvement, les caractéristiques confirmées et les modèles comparables.').slice(0, 180);
    const image = p.photoReview?.publicUsageApproved===true && p.photoReview?.localUrl === './assets/watches/' + p.id + '.webp' ? u('assets/watches/' + p.id + '.webp') : undefined;
    const specs = [['Mouvement', p.specs?.movement || movement[p.movement]], ['Diamètre', p.specs?.diameter], ['Verre', p.specs?.glass], ['Étanchéité', p.specs?.waterResistance]].filter(x => x[1]);
    const properties = specs.map(([key, value]) => ({ '@type': 'PropertyValue', name: key, value }));
    const related = products.filter(q => q.id !== p.id).sort((a,b) => Number(b.tier === p.tier) - Number(a.tier === p.tier) || Number(b.brand === p.brand) - Number(a.brand === p.brand)).slice(0,3);
    const compared = [p, ...related];
    const comparison = `<div class="comparison-scroll" role="region" aria-label="Comparatif des caractéristiques, tableau défilant horizontalement" tabindex="0"><table class="spec-matrix"><caption>Comparer quatre références de notre sélection</caption><thead><tr><th scope="col">Critère</th>${compared.map(q=>`<th scope="col"><a href="./${e(q.id)}.html">${e(q.brand)} ${e(q.model)}</a></th>`).join('')}</tr></thead><tbody>${[['Mouvement', q=>q.specs?.movement || movement[q.movement] || 'Non documenté'],['Diamètre', q=>q.specs?.diameter || 'À vérifier'],['Verre', q=>q.specs?.glass || 'À vérifier'],['Étanchéité', q=>q.specs?.waterResistance || 'À vérifier']].map(([label,fn])=>`<tr><th scope="row">${e(label)}</th>${compared.map(q=>`<td>${e(fn(q))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const deepComparisons=comparisons.comparisonsById.get(p.id)||[];
    const deepComparisonLinks=deepComparisons.length?
      '<h2>Comparaisons approfondies</h2><ul class="related">'+deepComparisons.map(c=>'<li><a href="./'+e(c.path.replace(/^montres\//,''))+'">'+e(c.title)+'</a><small>Comparaison avec une autre référence exacte, sans prix ni stock supposés.</small></li>').join('')+'</ul>':'';
    const main = `<div class="wrap"><nav class="crumb" aria-label="Fil d'Ariane"><a href="../index.html">Collection</a> / <a href="../index.html#montres">${e(category[p.tier])}</a> / ${e(name)}</nav><article class="watch" data-watch-id="${e(p.id)}"><div class="photo">${image ? `<img src="../assets/watches/${e(p.id)}.webp" alt="${e(name)} — photographie de la référence" width="1200" height="1200" fetchpriority="high">` : `<div class="watch-vector" data-watch-id="${e(p.id)}" data-brand="${e(p.brand)}" data-model="${e(p.model)}" data-tone="${e(p.tone || 'silver')}"><span>Illustration éditoriale du style ${e(name)}</span></div><small class="watch-vector-note">Illustration originale, non contractuelle · photo exacte chez le fabricant</small>`}</div><div class="intro"><span class="eyebrow">${e(category[p.tier])} · Montre ${e(movement[p.movement] || 'horlogère')}</span><h1>${e(name)}</h1><p class="subtitle">${e(p.title || p.description)}</p><p class="lead">${e(p.story || p.description)}</p><div class="tags">${(p.highlights || []).map(x=>`<span>${e(x)}</span>`).join('')}</div><p class="disclosure">Prix et disponibilité à vérifier auprès du vendeur. Atelier Montres ne vend pas ce modèle. ${affiliate ? 'Lien Amazon rémunéré : nous pouvons percevoir une commission sur les achats éligibles. '+amazonStatement : 'Nous ne recevons actuellement aucune commission pour ce modèle.'}</p>${affiliate ? `<a class="primary" data-amazon-product="${e(p.id)}" data-amazon-placement="seo" href="${e(affiliate.url)}" target="_blank" rel="noopener noreferrer nofollow sponsored">Voir ce modèle sur Amazon.fr · lien rémunéré ↗</a><a class="secondary" href="${e(p.officialUrl)}" target="_blank" rel="noopener noreferrer nofollow">Fiche fabricant ↗</a>` : `<a class="primary" href="${e(p.officialUrl)}" target="_blank" rel="noopener noreferrer nofollow">Consulter la fiche fabricant ↗</a>${amazon ? `<a class="secondary" data-amazon-product="${e(p.id)}" data-amazon-placement="seo" href="${e(amazon.url)}" target="_blank" rel="noopener noreferrer nofollow">Voir ce modèle sur Amazon.fr · sans lien rémunéré ↗</a>` : ''} `}<a class="secondary" href="../index.html#montres">Comparer avec les 14 autres modèles</a></div></article><section class="content"><h2>Ce qu'il faut savoir sur la ${e(name)}</h2><p>${e(p.description)}. Cette référence a été retenue pour sa place dans notre sélection ${e(category[p.tier].toLowerCase())}, en tenant compte de son identité visuelle et des caractéristiques publiées. Le choix dépend aussi du confort au poignet, du type de mouvement et des conditions proposées par le vendeur.</p><h2>Caractéristiques documentées</h2><dl>${specs.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><p>Ces indications sont fournies à titre informatif et doivent être confrontées à la documentation fabricant avant tout achat. Nous n'affichons ni tarif inventé, ni stock supposé, ni avis clients non vérifiés.</p><h2>Comparer avec des modèles proches</h2><p>Le tableau reprend uniquement les caractéristiques présentes dans notre sélection. Les informations absentes restent à vérifier sur le site du fabricant.</p>${comparison}${deepComparisonLinks}<h2>À comparer avant de choisir</h2><p>Privilégiez le diamètre adapté à votre poignet, le confort du bracelet et l'usage prévu. Une montre à quartz est généralement simple à utiliser ; une automatique demande de comprendre sa réserve de marche ; une solaire dépend de son système de recharge par la lumière.</p><ul class="related">${related.map(q=>`<li><a href="./${e(q.id)}.html">${e(q.brand + ' ' + q.model)}</a><span>${e(q.description)}</span></li>`).join('')}</ul><p><a href="./guide-choisir-montre.html">Consulter notre guide pour choisir une montre</a> · <a href="./quartz-ou-automatique.html">Quartz ou automatique ?</a> · <a href="./taille-boitier-montre.html">Quel diamètre de boîtier choisir ?</a></p><p><a href="../montre.html?id=${encodeURIComponent(p.id)}">Ouvrir la fiche interactive : favoris, photos et comparaison</a></p></section></div>`;
    const graph = { '@context':'https://schema.org', '@graph': [{ '@type':'Product', name, model:p.model, brand:{'@type':'Brand',name:p.brand}, description:p.story || p.description, url:u(rel), ...(image ? {image} : {}), additionalProperty: properties },{ '@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Collection',item:u('') },{ '@type':'ListItem',position:2,name, item:u(rel) }] }] };
    writeFileSync(join(root,rel),page(pageHead({title,description:desc,path:rel,image,type:'product',illustration:!image}),main,graph));
  }
  const guidePath='montres/guide-choisir-montre.html';
  const guideMain=`<div class="wrap editorial"><nav class="crumb"><a href="../index.html">Collection</a> / Guide d'achat</nav><p class="eyebrow">Le guide Atelier Montres</p><h1>Comment choisir une montre : mouvement, taille, style et budget</h1><p class="lead">Avant d'acheter une montre, comparez les caractéristiques vérifiables plutôt que de vous fier seulement à la photographie. Voici une méthode simple pour sélectionner une pièce adaptée à votre usage.</p><section class="content"><h2>1. Choisir le mouvement</h2><p><strong>Quartz :</strong> pratique pour le quotidien, il fonctionne grâce à un circuit électronique et une source d'énergie. <strong>Automatique :</strong> le remontage est assuré par les mouvements du poignet ; l'autonomie et la précision dépendent du calibre. <strong>Solaire :</strong> le système recharge un accumulateur grâce à la lumière. Vérifiez toujours les indications du constructeur.</p><h2>2. Adapter le boîtier au poignet</h2><p>Le diamètre seul ne détermine pas le confort. Mesurez aussi la longueur entre cornes, l'épaisseur, le poids et la souplesse du bracelet. Un boîtier compact peut mieux convenir à certains poignets, quel que soit le genre auquel une marque destine son modèle.</p><h2>3. Verre et étanchéité</h2><p>Le verre minéral et le saphir ne résistent pas de la même manière aux rayures ou aux chocs. L'étanchéité exprimée en bar ou en mètres ne doit pas être interprétée comme une profondeur de plongée garantie : respectez les préconisations exactes du fabricant.</p><h2>4. Comparer les prix sans s'y tromper</h2><p>Vérifiez la référence exacte, le vendeur, les conditions d'expédition, de garantie et de retour. Un produit visuellement proche peut cacher un mouvement ou un boîtier différent. Nous n'affichons aucun prix Amazon non synchronisé.</p><h2>5. Trouver son style</h2><p>Une montre de ville se distingue par sa sobriété, une plongeuse par son esprit utilitaire et une montre rétro par ses lignes vintage. Les modèles de notre sélection couvrent plusieurs styles et trois gammes éditoriales.</p><h2>Explorer les 15 références</h2><ul class="related">${products.map(p=>`<li><a href="./${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a><small>${e(p.description)}</small></li>`).join("")}</ul><p><a class="primary" href="../conseiller.html">Utiliser le conseiller de montres</a></p></section></div>`;
  writeFileSync(join(root,guidePath),page(pageHead({title:'Comment choisir une montre ? Guide quartz, automatique et taille | Atelier Montres',description:'Comment choisir une montre : quartz, automatique ou solaire, taille du boîtier, résistance à l’eau et conseils pour comparer 15 modèles authentiques.',path:guidePath}),guideMain,{'@context':'https://schema.org','@type':'Article',headline:'Comment choisir une montre',inLanguage:'fr-FR',author:{'@type':'Organization',name:'Atelier Montres'},mainEntityOfPage:u(guidePath)}));
  const editorialPaths = [
    'montres/quartz-ou-automatique.html',
    'montres/taille-boitier-montre.html',
    'montres/montres-automatiques.html'
  ];
  const specsList = list => list.map(p=>`<li><a href="./${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a><small>${e(p.story || p.description)}${p.specs?.diameter ? ' · '+e(p.specs.diameter):''}</small></li>`).join('');
  const editorial = [
    {
      path: editorialPaths[0],
      title: 'Quartz ou automatique : comment choisir sa montre ? | Atelier Montres',
      description: 'Quartz, automatique ou solaire : différences de fonctionnement, entretien et critères de choix illustrés par 15 références horlogères.',
      headline: 'Montre quartz ou automatique : les différences qui comptent',
      intro: 'Le bon mouvement dépend de votre usage : simplicité au quotidien, goût de la mécanique, ou recharge par la lumière. Comparez les principes sans confondre précision, autonomie et qualité de fabrication.',
      sections: `<h2>Quartz : la simplicité de l’électronique</h2><p>Un oscillateur à quartz piloté électroniquement régule l’heure. Selon le modèle, l’énergie provient d’une pile ou d’un dispositif rechargeable. Le quartz n’est pas un gage automatique de résistance aux chocs ni de verre saphir : vérifiez séparément le boîtier et la fiche fabricant.</p><h2>Automatique : une mécanique à porter</h2><p>Un rotor remonte le ressort moteur au gré des mouvements du poignet. La montre peut s'arrêter après une période sans mouvement ; la réserve de marche et la précision varient selon le calibre. Une automatique n'est pas nécessairement plus précise qu'une quartz. Son intérêt réside notamment dans son fonctionnement mécanique.</p><h2>Solaire : une source d'énergie différente</h2><p>Une montre solaire utilise la lumière pour alimenter et recharger son dispositif électronique. La Citizen Eco-Drive de notre sélection illustre ce fonctionnement. Les durées de charge et d'autonomie dépendent des instructions de la marque.</p><h2>Exemples à examiner</h2><h3>Montres quartz et solaires</h3><ul class="related">${specsList(products.filter(p=>p.movement==='quartz'||p.movement==='eco-drive'))}</ul><h3>Montres automatiques</h3><ul class="related">${specsList(products.filter(p=>p.movement==='automatic'))}</ul><h2>Décider selon son quotidien</h2><p>Vous souhaitez simplement mettre votre montre sans vous soucier du remontage ? Examinez les modèles quartz ou solaires. Vous appréciez un calibre mécanique et acceptez de le remonter ou de le régler après une pause ? Une automatique peut correspondre à cet usage. Pour comparer objectivement, regardez aussi le diamètre, le verre, l'étanchéité et les garanties du vendeur.</p>`
    },
    {
      path: editorialPaths[1],
      title: 'Taille de montre : choisir le diamètre du boîtier | Atelier Montres',
      description: 'Choisir une montre selon son diamètre : comparer les références documentées de 30,2 à 40 mm, sans se fier uniquement à la taille du poignet.',
      headline: 'Quelle taille de montre choisir pour son poignet ?',
      intro: 'Le confort au poignet ne se résume pas au diamètre inscrit dans une fiche technique. Comparez les dimensions disponibles et vérifiez l’essayage, l’épaisseur et la longueur entre cornes.',
      sections: `<h2>Le diamètre n’est qu’un premier repère</h2><p>Un boîtier peut paraître plus grand selon la largeur du cadran, la lunette et les cornes. La courbure du boîtier, le poids et la souplesse du bracelet influent également sur la sensation de confort. Une valeur isolée en millimètres ne suffit pas pour affirmer qu'un modèle conviendra à un tour de poignet donné.</p><h2>Dimensions confirmées dans notre sélection</h2><div class="comparison-scroll" role="region" tabindex="0" aria-label="Tableau des dimensions documentées"><table class="spec-matrix"><caption>Diamètre du boîtier selon les données du catalogue</caption><thead><tr><th scope="col">Modèle</th><th scope="col">Diamètre</th><th scope="col">Mouvement</th></tr></thead><tbody>${products.filter(p=>p.specs?.diameter).sort((a,b)=>parseFloat(a.specs.diameter.replace(',','.'))-parseFloat(b.specs.diameter.replace(',','.'))).map(p=>`<tr><th scope="row"><a href="./${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a></th><td>${e(p.specs.diameter)}</td><td>${e(p.specs.movement || movement[p.movement])}</td></tr>`).join('')}</tbody></table></div><h2>Comment prendre sa mesure ?</h2><p>Mesurez votre tour de poignet avec un ruban souple à l’endroit où vous souhaitez porter la montre. Vérifiez ensuite la longueur de corne à corne auprès du fabricant et, idéalement, essayez la référence ou une montre aux proportions comparables. Le réglage du bracelet et le passage sous la manche comptent également.</p><h2>Les informations non disponibles</h2><p>Certaines références de notre catalogue n'ont pas de diamètre confirmé dans nos données. Elles restent visibles dans le catalogue, mais nous ne leur attribuons aucune mesure estimée.</p><p><a href="./guide-choisir-montre.html">Revenir au guide d’achat général</a>.</p>`
    },
    {
      path: editorialPaths[2],
      title: 'Montres automatiques : 7 modèles à comparer | Atelier Montres',
      description: 'Comparez 7 montres automatiques Citizen, Orient, Seiko, Tissot et Hamilton : mouvements, diamètres documentés, verres et styles.',
      headline: 'Sept montres automatiques à examiner avant de choisir',
      intro: 'Notre sélection compte sept références mécaniques automatiques, allant de la Citizen à cœur ouvert à la Hamilton de style field watch. Plutôt qu’un classement artificiel, nous comparons les caractéristiques connues et les usages.',
      sections: `<h2>Des approches différentes de la montre automatique</h2><p>Une montre mécanique automatique fonctionne grâce à un ressort et à un ensemble de pièces en mouvement. Les différences entre modèles ne se limitent pas à la marque : proportions, cadran, lisibilité, choix du bracelet, verre et conditions d'entretien méritent une comparaison directe.</p><ul class="related">${specsList(products.filter(p=>p.movement==='automatic'))}</ul><h2>Comparer ce qui est réellement documenté</h2><div class="comparison-scroll" role="region" tabindex="0" aria-label="Tableau de comparaison des montres automatiques"><table class="spec-matrix"><caption>Caractéristiques confirmées ou à vérifier</caption><thead><tr><th scope="col">Modèle</th><th scope="col">Diamètre</th><th scope="col">Verre</th></tr></thead><tbody>${products.filter(p=>p.movement==='automatic').map(p=>`<tr><th scope="row"><a href="./${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a></th><td>${e(p.specs?.diameter || 'À vérifier')}</td><td>${e(p.specs?.glass || 'À vérifier')}</td></tr>`).join('')}</tbody></table></div><h2>Trois questions utiles avant un achat</h2><p><strong>Le style :</strong> préférez-vous une automatique sport chic, une montre habillée ou une field watch très lisible ? <strong>Les proportions :</strong> un boîtier de 38 mm n'a pas le même rendu qu'un 40 mm, surtout selon la géométrie des cornes. <strong>L’entretien :</strong> vérifiez les indications du fabricant pour le remontage, l'usage et le service du calibre. Nous ne publions ni prix, ni garantie, ni stock non vérifiés.</p><p><a href="./quartz-ou-automatique.html">Comprendre les différences entre quartz et automatique</a>.</p>`
    }
  ];
  for(const a of editorial){
    const html = `<div class="wrap editorial"><nav class="crumb"><a href="../index.html">Collection</a> / Guides horlogers</nav><p class="eyebrow">Le guide Atelier Montres</p><h1>${e(a.headline)}</h1><p class="lead">${e(a.intro)}</p><section class="content">${a.sections}<p><a class="primary" href="../index.html#montres">Explorer les 15 montres</a></p><p><a href="./guide-choisir-montre.html">Guide général</a> · <a href="./taille-boitier-montre.html">Tailles</a> · <a href="./montres-automatiques.html">Automatiques</a> · <a href="./quartz-ou-automatique.html">Mouvements</a></p></section></div>`;
    writeFileSync(join(root,a.path),page(pageHead({title:a.title,description:a.description,path:a.path}),html,{'@context':'https://schema.org','@type':'Article',headline:a.headline,inLanguage:'fr-FR',author:{'@type':'Organization',name:'Atelier Montres'},mainEntityOfPage:u(a.path)}));
  }
  const selection = `<section class="seo-links" aria-labelledby="seo-links-title"><div class="wrap"><p class="overline kicker">Explorer avant de choisir</p><h2 id="seo-links-title">Les 15 montres, modèle par modèle</h2><p>Des fiches éditoriales avec caractéristiques documentées et liens vers les fabricants. Aucun prix ou stock non vérifié.</p><ul>${allLinks()}</ul><p><a href="./montres/guide-choisir-montre.html">Notre guide pour choisir une montre : mouvements et tailles</a></p></div></section>`;
  const guideCards = `<section class="seo-guides" aria-labelledby="seo-guides-title"><div class="wrap"><p class="overline kicker">Conseils pour choisir</p><h2 id="seo-guides-title">Avant de choisir sa montre.</h2><p class="seo-guides-lead">Comparer un boîtier, comprendre le mouvement ou choisir une belle mécanique : trois guides pour affiner votre sélection à partir des informations documentées.</p><div class="seo-guide-grid"><article><span>01 / MOUVEMENT</span><h3>Quartz ou automatique ?</h3><p>Les différences de fonctionnement et d’entretien, illustrées par les modèles de notre collection.</p><a href="./montres/quartz-ou-automatique.html">Comparer les mouvements →</a></article><article><span>02 / PROPORTIONS</span><h3>Choisir le bon diamètre.</h3><p>Mesures confirmées, confort et proportions : comprendre ce qui compte vraiment au poignet.</p><a href="./montres/taille-boitier-montre.html">Consulter le guide des tailles →</a></article><article><span>03 / MÉCANIQUE</span><h3>${products.filter(p=>p.movement==='automatic').length} montres automatiques.</h3><p>Citizen, Orient, Seiko, Tissot et Hamilton : comparer leurs lignes et caractéristiques documentées.</p><a href="./montres/montres-automatiques.html">Découvrir les automatiques →</a></article></div></div></section>`;
  let collection = readFileSync(join(root,'affiliation.html'),'utf8');
  // Publishing twice must not duplicate canonical tags, structured data or internal links.
  collection=collection.replace(/<!-- AM_SEO_LINKS_START -->[\s\S]*?<!-- AM_SEO_LINKS_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_GUIDES_START -->[\s\S]*?<!-- AM_SEO_GUIDES_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_COMPARISONS_START -->[\s\S]*?<!-- AM_SEO_COMPARISONS_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_HEAD_START -->[\s\S]*?<!-- AM_SEO_HEAD_END -->/g,'');
  if (partners.enabled) {
    collection=collection.replace(/<div class="aff-disclosure">[\s\S]*?<\/div>/,'<div class="aff-disclosure"><strong>Transparence commerciale</strong><p>Certains modèles proposent un lien Amazon.fr clairement indiqué « lien rémunéré ». Les autres liens fabricants restent non rémunérés. Le paiement et les retours sont gérés par le vendeur externe. '+e(amazonStatement)+'</p></div>');
    collection=collection.replace('Liens actuellement non affiliés.','Liens Amazon rémunérés signalés au niveau des modèles concernés.');
    collection=collection.replace('Liens actuellement non rémunérés','Liens Amazon rémunérés signalés');
  }
  if (!collection.includes('<section class="faq" id="faq"')) throw Error('Point insertion SEO absent');
  collection=collection.replace('<section class="faq" id="faq"', '<!-- AM_SEO_LINKS_START -->' + selection + '<!-- AM_SEO_LINKS_END -->\n<section class="faq" id="faq"');
  collection=collection.replace('<section id="gammes"', '<!-- AM_SEO_GUIDES_START -->'+guideCards+'<!-- AM_SEO_GUIDES_END -->\n<!-- AM_SEO_COMPARISONS_START -->'+comparisons.comparisonCards+'<!-- AM_SEO_COMPARISONS_END -->\n<section id="gammes"');
  collection=collection.replace(/<title>[^<]+<\/title>/,'<title>Montres homme et femme : 15 modèles à comparer | Atelier Montres</title>');
  collection=collection.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Découvrez 15 montres Casio, Citizen, Seiko, Tissot et autres : modèles quartz, solaires et automatiques, illustrations originales, caractéristiques et comparatif indépendant.">');
  const homepage=u('');
  const headExtra=`${searchConsoleMeta}<link rel="canonical" href="${e(homepage)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Atelier Montres"><meta property="og:title" content="15 montres à comparer · Atelier Montres"><meta property="og:description" content="Sélection indépendante de 15 montres, fiches et guide d'achat."><meta property="og:url" content="${e(homepage)}"><meta name="twitter:card" content="summary"><link rel="stylesheet" href="./seo-guides.css">${umamiScripts("./")}<script type="application/ld+json">${schema({'@context':'https://schema.org','@graph':[{'@type':'WebSite',name:'Atelier Montres',url:homepage,inLanguage:'fr-FR'},{'@type':'ItemList',name:'15 montres à découvrir',numberOfItems:products.length,itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}]})}</script>`;
  collection=collection.replace('</head>','<!-- AM_SEO_HEAD_START -->'+headExtra+'<!-- AM_SEO_HEAD_END --></head>');
  writeFileSync(join(root,'index.html'),collection);
  writeFileSync(join(root,'affiliation.html'),collection);
  const paths=['','conseiller.html',guidePath,...editorialPaths,...comparisons.comparisonPaths,...products.map(p=>'montres/'+p.id+'.html')];
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(path=>`  <url><loc>${e(u(path))}</loc></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(join(root,'sitemap.xml'),xml);
  if (partners.enabled) {
    const privacyPath=join(root,'confidentialite.html');
    const currentPrivacy=readFileSync(privacyPath,'utf8');
    writeFileSync(privacyPath,currentPrivacy.replace('Ces liens ne sont actuellement pas rémunérés.','Certains liens Amazon.fr peuvent être rémunérés et sont signalés près du lien.'));
  }
  {
    const privacyPath=join(root,'confidentialite.html');
    const currentPrivacy=readFileSync(privacyPath,'utf8');
    const inactive="Nous n'avons pas installé de système de publicité ciblée, de cookies de suivi ou de régie analytique sur la page.";
    const active="Les visites et clics vers Amazon sont mesurés avec Umami Cloud (statistiques agrégées et anonymisées, sans cookies). Seuls la référence publique de la montre, l’emplacement du lien et des données techniques de navigation sont traités ; aucun nom, email, identifiant utilisateur ni donnée de commande n’est envoyé. Le paramètre Do Not Track est respecté. La conservation dépend du forfait Umami actif.";
    if(!currentPrivacy.includes(inactive)&&!currentPrivacy.includes(active))throw Error('Notice de vie privée obsolète');
    const updated=umamiId?currentPrivacy.replace(inactive,active):currentPrivacy.replace(active,inactive);
    if(updated!==currentPrivacy)writeFileSync(privacyPath,updated);
  }
  writeFileSync(join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${u('sitemap.xml')}\n`);
  // Rendering the site to Render's /site publish directory must not expose
  // downloaded manufacturer photos or private image URLs while rights are unknown.
  // The original research files remain in Git. This JSON is a deploy-only copy.
  for(const p of products){
    if(p.photoReview?.publicUsageApproved!==true){
      rmSync(join(root,'assets','watches',p.id+'.webp'),{force:true});
      const research=p.photoReview||{};
      p.photoReview={
        publicUsageApproved:false,
        licence:research.licence||'permission_required',
        provider:research.provider||p.brand,
        accuracy:research.accuracy||'exact'
      };
    }
  }
  writeFileSync(join(root,'selection-affiliation.json'),JSON.stringify(data,null,2)+'\n');
  // Internal photography review is research material, not a public product page.
  for(const name of ['revue-photo.html','revue-photo.js','revue-photo.css'])rmSync(join(root,name),{force:true});
  const manifest={siteUrl:homepage,productCount:products.length,paths:paths.map(u),affiliateActive:partners.enabled,affiliateCount:partners.links.size,checkoutActive:false,comparisonCount:comparisons.comparisonPaths.length,analyticsActive:Boolean(umamiId),analyticsProvider:umamiId?"umami":null,licensedImageCount:products.filter(p=>p.photoReview?.publicUsageApproved===true).length};
  writeFileSync(join(root,'seo-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('SEO build: '+products.length+' montres + '+(editorialPaths.length+1)+' guides + '+comparisons.comparisonPaths.length+' comparaisons, '+paths.length+' URLs sur '+homepage);
})();
