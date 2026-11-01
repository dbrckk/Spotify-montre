import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {validateAffiliateConfig} from './affiliate-policy.mjs';
import {buildComparisonPages} from './build-comparisons.mjs';
import {buildSearchCollections} from './build-search-collections.mjs';
import {buildEditorialPolicy} from './build-editorial-policy.mjs';
import {buildPopularPicks} from './build-popular-picks.mjs';
import {buildUnifiedDiscovery} from './build-unified-discovery.mjs';
import {responsiveSrcset,responsiveAttrs} from './responsive-images.mjs';

(function buildSeo() {
  const site = new URL(process.env.PUBLIC_SITE_URL || 'https://atelier-montres-selection-fr.onrender.com/');
  if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash) throw new Error('PUBLIC_SITE_URL doit être une origine HTTPS terminée par /');
  const root = resolve(process.cwd(), 'site');
  const data = JSON.parse(readFileSync(join(root, 'selection-affiliation.json'), 'utf8'));
  if (data.version !== 1 || data.affiliateEnabled !== false || data.products.length !== 15 || new Set(data.products.map(p => p.id)).size !== 15) throw Error('Catalogue invalide ou statut affilié inattendu');
  const products = data.products;
  // Editorial copy is authored independently; only documented catalogue fields
  // are rendered as numeric facts. Do not infer diameter from case width.
  const editorialData=JSON.parse(readFileSync(join(root,'editorial-insights.json'),'utf8'));
  const editorialFactKeys=new Set(['diameter','caseSize','movement','glass','waterResistance']);
  if(editorialData.version!==1||!editorialData.products||
     Object.keys(editorialData.products).length!==products.length)throw Error('Couverture des synthèses éditoriales incomplète');
  for(const product of products){
    const insight=editorialData.products[product.id];
    if(!insight || !['strength','usage','caution'].every(k=>typeof insight[k]==='string'&&insight[k].length>=45&&insight[k].length<=480)
      || !Array.isArray(insight.facts)||insight.facts.length<2||insight.facts.length>4
      || new Set(insight.facts).size!==insight.facts.length
      || insight.facts.some(k=>!editorialFactKeys.has(k)||typeof product.specs?.[k]!=='string'||!product.specs[k].trim())){
      throw Error('Synthèse produit non vérifiable : '+product.id);
    }
  }
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
  if (partners.enabled) for (const [id,affiliate] of partners.links) {
    const verified=amazonLinks.get(id);
    const destination=new URL(affiliate.url);
    if(!verified||destination.hostname!=='www.amazon.fr'||destination.pathname!=='/dp/'+verified.asin)
      throw Error('Lien rémunéré bloqué : la référence Amazon doit correspondre au modèle confirmé '+id);
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
  const pageHead = ({ title, description, path, type = 'article', image, illustration = false, photoZoom = false }) => `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1b2925"><meta name="robots" content="index,follow,max-image-preview:large"><title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(u(path))}"><meta property="og:type" content="${e(type)}"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Atelier Montres"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(u(path))}">${image ? `<meta property="og:image" content="${e(image)}">` : ''}<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../seo-guides.css">${photoZoom ? '<link rel="stylesheet" href="../photo-zoom.css">' : ''}<link rel="stylesheet" href="../premium-system.css">${photoZoom ? '<script defer src="../photo-zoom.js"></script><script defer src="../seo-product-photo.js"></script>' : ''}${illustration ? '<script defer src="../watch-illustrations.js"></script><script defer src="../seo-watch-art.js"></script>' : ""}${umamiScripts("../")}`;
  const header = `<a class="skip" href="#contenu">Aller au contenu</a><header class="top"><div class="wrap nav"><a class="logo" href="../index.html">✦ Atelier Montres</a><nav aria-label="Navigation principale"><a href="./toutes-les-montres.html">Catalogue · 52 montres</a><a href="../conseiller.html">Trouver ma montre</a><a href="./guide-choisir-montre.html">Guide d'achat</a><a href="./quartz-ou-automatique.html">Comparer les mouvements</a><a href="./methode-selection.html">Notre méthode</a></nav></div></header>`;
  const footer = `<footer><div class="wrap"><strong>Atelier Montres</strong><p>Sélection éditoriale indépendante. Aucun achat ni paiement ne s'effectue sur ce site actuellement. ${partners.enabled ? 'Certains liens Amazon.fr sont rémunérés (mention « lien rémunéré » à proximité). '+amazonStatement : 'Les liens vers les fabricants ne sont pas rémunérés.'}</p><p><a href="../informations-legales.html">Informations légales</a> · <a href="../confidentialite.html">Vie privée</a> · <a href="./methode-selection.html">Notre méthode</a> · <a href="./toutes-les-montres.html">Explorer les 52 montres</a></p></div></footer>`;
  const page = (head, main, structured) => `<!doctype html><html lang="fr"><head>${head}<script type="application/ld+json">${schema(structured)}</script></head><body>${header}<main id="contenu">${main}</main>${footer}</body></html>\n`;
  const allLinks = () => products.map(p => `<li><a href="./montres/${e(p.id)}.html">${e(p.brand)} ${e(p.model)}</a><small>${e(p.description)}</small></li>`).join('');
  const movement = { quartz: 'quartz', automatic: 'automatique', 'eco-drive': 'solaire' };
  const category = { essential: 'Essentielle', signature: 'Signature', prestige: 'Prestige' };
  mkdirSync(join(root, 'montres'), { recursive: true });
  const comparisons=buildComparisonPages({root,products,amazonLinks,partners,pageHead,page,e,u,amazonStatement});
  const collections=buildSearchCollections({root,products,amazonLinks,partners,pageHead,page,e,u});
  const editorialPolicy=buildEditorialPolicy({root,data,products,amazonLinks,partners,pageHead,page,e,u});
  const popularPicks=buildPopularPicks({root,existingProducts:products,affiliates:partners,amazonPartnerTag:JSON.parse(readFileSync(join(root,'affiliate-links.json'),'utf8')).amazonPartnerTag,pageHead,page,e,u});
  const unified=buildUnifiedDiscovery({root,coreProducts:products,affiliates:partners,amazonPartnerTag:JSON.parse(readFileSync(join(root,'affiliate-links.json'),'utf8')).amazonPartnerTag,pageHead,page,e,u});
  for (const p of products) {
    if (!/^[a-z0-9-]{4,64}$/.test(p.id) || !/^https:\/\//.test(p.officialUrl)) throw Error('Référence ou lien fabricant invalide');
    const rel = 'montres/' + p.id + '.html';
    const name = p.brand + ' ' + p.model;
    const affiliate = partners.links.get(p.id);
    const amazon = amazonLinks.get(p.id);
    const movementSearchLabel={quartz:'quartz',automatic:'automatique','eco-drive':'solaire'}[p.movement]||'horlogère';
    const diameterLabel=p.specs?.diameter?' '+p.specs.diameter:'';
    // Search snippets only use exact model identifiers and documented facts.
    const title=name+' : montre '+movementSearchLabel+diameterLabel+' | Atelier Montres';
    const metaFacts=[p.specs?.diameter,p.specs?.caseSize?'dimensions '+p.specs.caseSize:null,p.specs?.glass?'verre '+p.specs.glass.toLowerCase():null,p.specs?.waterResistance?'étanchéité '+p.specs.waterResistance:null].filter(Boolean);
    const desc=(name+' : '+(p.description||p.story)+'. '+(metaFacts.length?'Caractéristiques : '+metaFacts.join(', ')+'. ':'')+'Comparez les modèles et les liens fabricant.').slice(0,195);
    const image = p.photoReview?.publicUsageApproved===true && p.photoReview?.localUrl === './assets/watches/' + p.id + '.webp' ? u('assets/watches/' + p.id + '.webp') : undefined;
    const specs = [['Mouvement', p.specs?.movement || movement[p.movement]], ['Diamètre', p.specs?.diameter], ['Dimensions L × l × H', p.specs?.caseSize], ['Verre', p.specs?.glass], ['Étanchéité', p.specs?.waterResistance]].filter(x => x[1]);
    const properties = specs.map(([key, value]) => ({ '@type': 'PropertyValue', name: key, value }));
    // A consistent overview across every indexable product page. Missing
    // specifications must remain explicitly unknown, never inferred.
    const quickFacts=[
      ['Mouvement',p.specs?.movement||({quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire · Eco-Drive'}[p.movement]||null)],
      p.specs?.diameter?['Diamètre',p.specs.diameter]:p.specs?.caseSize?['Dimensions du boîtier',p.specs.caseSize]:['Diamètre',null],
      ['Verre',p.specs?.glass||null],
      ['Étanchéité',p.specs?.waterResistance||null]
    ].map(([label,value])=>'<div class="watch-quickfact"><dt>'+e(label)+'</dt><dd'+(!value?' class="watch-fact-unknown"':'')+'>'+e(value||'Non documenté')+'</dd></div>').join('');

    const insight=editorialData.products[p.id];
    const editorialLabels={diameter:'Diamètre',caseSize:'Dimensions L × l × H',movement:'Mouvement',glass:'Verre',waterResistance:'Étanchéité'};
    const editorialFacts=insight.facts.map(key=>
      '<li><span>'+e(editorialLabels[key])+'</span><strong>'+e(p.specs[key])+'</strong></li>'
    ).join('');
    const decisionSection='<section class="watch-decision" id="avis-editorial" aria-labelledby="decision-title-'+e(p.id)+'">'
      +'<div class="watch-decision-heading"><p class="eyebrow">Le regard Atelier · analyse documentaire</p>'
      +'<h2 id="decision-title-'+e(p.id)+'">Faut-il considérer cette '+e(p.brand)+' ?</h2>'
      +'<p>Trois repères pour décider, sans prétendre avoir essayé ce modèle au poignet.</p></div>'
      +'<div class="watch-decision-grid">'
      +'<article><span class="watch-decision-index" aria-hidden="true">01</span><h3>Ce qui la distingue</h3><p>'+e(insight.strength)+'</p></article>'
      +'<article><span class="watch-decision-index" aria-hidden="true">02</span><h3>À qui elle peut parler</h3><p>'+e(insight.usage)+'</p></article>'
      +'<article><span class="watch-decision-index" aria-hidden="true">03</span><h3>Point à contrôler</h3><p>'+e(insight.caution)+'</p></article>'
      +'</div><div class="watch-decision-evidence"><strong>Repères publiés pour cette référence</strong>'
      +'<ul>'+editorialFacts+'</ul><p><a href="#caracteristiques">Voir les caractéristiques et leur provenance ↓</a></p></div>'
      +'</section>';
    const related = products.filter(q => q.id !== p.id).sort((a,b) => Number(b.tier === p.tier) - Number(a.tier === p.tier) || Number(b.brand === p.brand) - Number(a.brand === p.brand)).slice(0,3);
    const compared = [p, ...related];
    const comparison = `<div class="comparison-scroll" role="region" aria-label="Comparatif des caractéristiques, tableau défilant horizontalement" tabindex="0"><table class="spec-matrix"><caption>Comparer quatre références de notre sélection</caption><thead><tr><th scope="col">Critère</th>${compared.map(q=>`<th scope="col"><a href="./${e(q.id)}.html">${e(q.brand)} ${e(q.model)}</a></th>`).join('')}</tr></thead><tbody>${[['Mouvement', q=>q.specs?.movement || movement[q.movement] || 'Non documenté'],['Taille du boîtier', q=>q.specs?.diameter?'Diamètre '+q.specs.diameter:q.specs?.caseSize?'L × l × H '+q.specs.caseSize:'À vérifier'],['Verre', q=>q.specs?.glass || 'À vérifier'],['Étanchéité', q=>q.specs?.waterResistance || 'À vérifier']].map(([label,fn])=>`<tr><th scope="row">${e(label)}</th>${compared.map(q=>`<td>${e(fn(q))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const deepComparisons=comparisons.comparisonsById.get(p.id)||[];
    const collectionLinks=(collections.byProduct.get(p.id)||[]).map(c=>'<a href="./'+e(c.path.replace(/^montres\//,''))+'">'+e(c.label)+'</a>').join(' · ');
    const deepComparisonLinks=deepComparisons.length?
      '<h2>Comparaisons approfondies</h2><ul class="related">'+deepComparisons.map(c=>'<li><a href="./'+e(c.path.replace(/^montres\//,''))+'">'+e(c.title)+'</a><small>Comparaison avec une autre référence exacte, sans prix ni stock supposés.</small></li>').join('')+'</ul>':'';
    // Buyer checks are generated from confirmed catalog attributes, not
    // ratings, fabricated prices, claims of comfort or inferred water resistance.
    const purchaseChecks=[
      'Vérifiez le code exact '+p.model+' sur la fiche du vendeur : une variante proche n’est pas forcément identique.',
      p.specs?.diameter
        ? 'Diamètre documenté : '+p.specs.diameter+'. Vérifiez aussi la longueur entre cornes, l’épaisseur et le bracelet.'
        : p.specs?.caseSize
           ? 'Dimensions L × l × H indiquées : '+p.specs.caseSize+'. Il ne s’agit pas d’un diamètre. Vérifiez le porté auprès du fabricant.'
           : 'Diamètre non renseigné dans notre sélection : contrôlez les dimensions auprès du fabricant.',
      p.specs?.waterResistance
        ? 'Étanchéité indiquée : '+p.specs.waterResistance+'. Respectez les usages prévus par la marque, sans en déduire une profondeur de plongée.'
        : 'Étanchéité non renseignée ici : consultez la fiche constructeur avant toute exposition à l’eau.',
      p.movement==='automatic'
        ? 'Mouvement automatique : vérifiez les informations sur la réserve de marche, le remontage et l’entretien.'
        : p.movement==='eco-drive'
          ? 'Mouvement solaire : renseignez-vous sur la recharge à la lumière et les conditions de stockage.'
          : 'Mouvement à quartz : consultez la notice sur l’alimentation et le remplacement éventuel de la pile.'
    ];
    const purchaseSection='<section class="seo-buying-checks" aria-label="Points à vérifier avant achat"><h2 id="avant-achat">Vérifications avant achat : '+e(name)+'</h2><ul>'
      +purchaseChecks.map(line=>'<li>'+e(line)+'</li>').join('')
      +'</ul><p>Ces repères ne remplacent ni la notice du fabricant ni les conditions du vendeur.</p></section>';
    // Technical specifications never imply permission to reproduce photos.
    const review=p.specReview;
    const audited=review?.sourceKind==='manufacturer_exact_reference'
      &&review.sourceUrl===p.officialUrl&&/^\d{4}-\d{2}-\d{2}$/.test(review.verifiedOn)
      &&Array.isArray(review.verifiedFields)&&review.verifiedFields.length>0;
    const factNames={diameter:'diamètre',caseSize:'dimensions L × l × H',movement:'mouvement',glass:'verre',waterResistance:'étanchéité'};
    const sourcedFacts=audited?review.verifiedFields.map(k=>factNames[k]).filter(Boolean):[];
    const reviewedDate=audited?new Date(review.verifiedOn+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';
    const sourceEvidence='<aside class="watch-evidence" aria-label="Provenance des caractéristiques">'
      +(audited
        ?'<strong>Caractéristiques constructeur recoupées le '+e(reviewedDate)+'</strong><p>Éléments contrôlés pour cette référence : '+e(sourcedFacts.join(', '))+'. Les autres informations et la licence des photographies ne sont pas couvertes par ce contrôle.</p>'
        :'<strong>Caractéristiques à confirmer sur la source officielle</strong><p>Nous ne revendiquons pas de vérification récente de chaque mesure. Consultez la documentation du modèle avant de commander.</p>')
      +'<a href="'+e(p.officialUrl)+'" target="_blank" rel="noopener noreferrer nofollow">Consulter la fiche fabricant ↗</a></aside>';
    const relatedCards='<ul class="related seo-related-products">'+related.map(q=>{
      const approved=q.photoReview?.publicUsageApproved===true&&q.photoReview.localUrl==='./assets/watches/'+q.id+'.webp';
      const relatedResponsive=approved?responsiveAttrs(root,q,{prefix:'../',sizes:'(max-width: 460px) 92vw, (max-width: 780px) 45vw, 300px',escape:e}):'';
      const picture=approved
        ? '<img class="seo-related-photo" src="../assets/watches/'+e(q.id)+'.webp"'+relatedResponsive+' width="'+(Number.isInteger(q.photoReview.localWidth)?q.photoReview.localWidth:1200)+'" height="'+(Number.isInteger(q.photoReview.localHeight)?q.photoReview.localHeight:1200)+'" loading="lazy" decoding="async" alt="'+e(q.brand+' '+q.model)+' — photographie du modèle">'
        : '<span class="seo-related-photo-placeholder">Photo à consulter chez le fabricant</span>';
      const facts=[q.specs?.diameter,q.specs?.movement||movement[q.movement]].filter(Boolean);
      return '<li><a href="./'+e(q.id)+'.html"><span class="seo-related-visual">'+picture+'</span><strong>'+e(q.brand+' '+q.model)+'</strong></a><small>'+e(facts.join(' · ')||q.description)+'</small></li>';
    }).join('')+'</ul>';
    // Show a real image detail viewer without inventing additional angles.
    // An ordinary link to the exact local WebP stays useful without JavaScript.
    const photoZoomLink=image
      ?'<a class="watch-photo-zoom" href="../assets/watches/'+e(p.id)+'.webp" target="_blank" rel="noopener noreferrer"'
        +' data-watch-id="'+e(p.id)+'" data-watch-brand="'+e(p.brand)+'" data-watch-model="'+e(p.model)+'"'
        +' data-watch-official="'+e(p.officialUrl)+'" aria-label="Agrandir la photographie de '+e(name)+'">'
        +'<span aria-hidden="true">⤢</span> Agrandir la photographie</a>'
      :'';
    const main = `<div class="wrap"><nav class="crumb" aria-label="Fil d'Ariane"><a href="../index.html">Collection</a> / <a href="../index.html#montres">${e(category[p.tier])}</a> / ${e(name)}</nav><article class="watch watch-product" data-watch-id="${e(p.id)}"><div class="photo watch-photo">${image ? `<img src="../assets/watches/${e(p.id)}.webp"${responsiveAttrs(root,p,{prefix:'../',sizes:'(max-width: 760px) 92vw, 540px',escape:e})} alt="${e(name)} — photographie de la référence" width="${Number.isInteger(p.photoReview?.localWidth)?p.photoReview.localWidth:1200}" height="${Number.isInteger(p.photoReview?.localHeight)?p.photoReview.localHeight:1200}" decoding="async" fetchpriority="high">` : `<div class="watch-vector" data-watch-id="${e(p.id)}" data-brand="${e(p.brand)}" data-model="${e(p.model)}" data-tone="${e(p.tone || 'silver')}"><span>Illustration éditoriale du style ${e(name)}</span></div><small class="watch-vector-note">Illustration originale, non contractuelle · photo exacte chez le fabricant</small>`}<div class="watch-photo-caption"><span>01 / 01</span><span>${image ? "Photographie du modèle exact" : "Illustration éditoriale"}</span></div>${photoZoomLink}</div><div class="intro"><span class="eyebrow">${e(category[p.tier])} · Montre ${e(movement[p.movement] || 'horlogère')}</span><h1>${e(name)}</h1><p class="subtitle">${e(p.title || p.description)}</p><p class="lead">${e(p.story || p.description)}</p><section class="watch-facts" aria-label="Caractéristiques essentielles"><p class="watch-facts-caption">LES INFORMATIONS ESSENTIELLES</p><dl>${quickFacts}</dl></section><div class="tags">${(p.highlights || []).map(x=>`<span>${e(x)}</span>`).join('')}</div><p class="disclosure">Prix et disponibilité à vérifier auprès du vendeur. Atelier Montres ne vend pas ce modèle. ${affiliate ? 'Lien Amazon rémunéré : nous pouvons percevoir une commission sur les achats éligibles. '+amazonStatement : 'Nous ne recevons actuellement aucune commission pour ce modèle.'}</p><div class="watch-actions">${affiliate ? `<a class="primary" data-amazon-product="${e(p.id)}" data-amazon-placement="seo" href="${e(affiliate.url)}" target="_blank" rel="noopener noreferrer nofollow sponsored">Voir ce modèle sur Amazon.fr · lien rémunéré ↗</a><a class="secondary" href="${e(p.officialUrl)}" target="_blank" rel="noopener noreferrer nofollow">Fiche fabricant ↗</a>` : `<a class="primary" href="${e(p.officialUrl)}" target="_blank" rel="noopener noreferrer nofollow">Consulter la fiche fabricant ↗</a>${amazon ? `<a class="secondary" data-amazon-product="${e(p.id)}" data-amazon-placement="seo" href="${e(amazon.url)}" target="_blank" rel="noopener noreferrer nofollow">Voir ce modèle sur Amazon.fr · sans lien rémunéré ↗</a>` : ''} `}<a class="secondary" href="../index.html#montres">Comparer avec les 14 autres modèles</a></div></div></article><nav class="watch-section-nav" aria-label="Accès rapide aux rubriques"><a href="#avis-editorial">L’essentiel</a><a href="#caracteristiques">Caractéristiques</a><a href="#comparatif">Comparer</a><a href="#avant-achat">Avant achat</a><a href="#modeles-proches">Modèles proches</a></nav>${decisionSection}<section class="content"><h2 id="caracteristiques">Caractéristiques documentées</h2><dl>${specs.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${sourceEvidence}<p>Ces indications sont fournies à titre informatif et doivent être confrontées à la documentation fabricant avant tout achat. Nous n'affichons ni tarif inventé, ni stock supposé, ni avis clients non vérifiés.</p><h2 id="comparatif">Comparer avec des modèles proches</h2><p>Le tableau reprend uniquement les caractéristiques présentes dans notre sélection. Les informations absentes restent à vérifier sur le site du fabricant.</p>${comparison}${deepComparisonLinks}${collectionLinks?'<h2>Explorer les sélections associées</h2><p>'+collectionLinks+'</p>':''}${purchaseSection}<h2 id="modeles-proches">Trois modèles à comparer également</h2><p>Ces trois références offrent des points de comparaison supplémentaires, sans supposer leur prix ou leur disponibilité.</p>${relatedCards}<p><a href="./guide-choisir-montre.html">Consulter notre guide pour choisir une montre</a> · <a href="./quartz-ou-automatique.html">Quartz ou automatique ?</a> · <a href="./taille-boitier-montre.html">Quel diamètre de boîtier choisir ?</a></p><p><a href="../montre.html?id=${encodeURIComponent(p.id)}">Ouvrir la fiche interactive : favoris, photos et comparaison</a></p></section></div>`;
    const graph = { '@context':'https://schema.org', '@graph': [{ '@type':'Product', name, model:p.model, brand:{'@type':'Brand',name:p.brand}, description:p.story || p.description, url:u(rel), ...(image ? {image} : {}), additionalProperty: properties },{ '@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Collection',item:u('') },{ '@type':'ListItem',position:2,name, item:u(rel) }] }] };
    writeFileSync(join(root,rel),page(pageHead({title,description:desc,path:rel,image,type:'product',illustration:!image,photoZoom:!!image}),main,graph));
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
  collection=collection.replace(/<!-- AM_POPULAR_PICKS_START -->[\s\S]*?<!-- AM_POPULAR_PICKS_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_COMPARISONS_START -->[\s\S]*?<!-- AM_SEO_COMPARISONS_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_CATEGORIES_START -->[\s\S]*?<!-- AM_SEO_CATEGORIES_END -->\s*/g,'');
  collection=collection.replace(/<!-- AM_SEO_HEAD_START -->[\s\S]*?<!-- AM_SEO_HEAD_END -->/g,'');
  collection=collection.replace(/<!-- AM_EDITORIAL_POLICY_START -->[\s\S]*?<!-- AM_EDITORIAL_POLICY_END -->\s*/g,'');
  if (partners.enabled) {
    collection=collection.replace(/<div class="aff-disclosure">[\s\S]*?<\/div>/,'<div class="aff-disclosure"><strong>Transparence commerciale</strong><p>Certains modèles proposent un lien Amazon.fr clairement indiqué « lien rémunéré ». Les autres liens fabricants restent non rémunérés. Le paiement et les retours sont gérés par le vendeur externe. '+e(amazonStatement)+'</p></div>');
    collection=collection.replace('Liens actuellement non affiliés.','Liens Amazon rémunérés signalés au niveau des modèles concernés.');
    collection=collection.replace('Liens actuellement non rémunérés','Liens Amazon rémunérés signalés');
  }
  if (!collection.includes('<section class="faq" id="faq"')) throw Error('Point insertion SEO absent');
  collection=collection.replace('<section class="faq" id="faq"','<!-- AM_EDITORIAL_POLICY_START -->'+editorialPolicy.teaser+'<!-- AM_EDITORIAL_POLICY_END -->\n<section class="faq" id="faq"');
  collection=collection.replace('<section class="faq" id="faq"', '<!-- AM_SEO_LINKS_START -->' + selection + '<!-- AM_SEO_LINKS_END -->\n<section class="faq" id="faq"');
  // Repeated SEO builds must never duplicate the unified-catalogue CTA.
  collection=collection.replace(/<!-- AM_UNIFIED_DISCOVERY_START -->[\s\S]*?<!-- AM_UNIFIED_DISCOVERY_END -->/g,'');
  collection=collection.replace('<section class="aff-advisor-teaser" aria-labelledby="advisorTeaserTitle">',
    '<!-- AM_UNIFIED_DISCOVERY_START --><div class="wrap" style="padding-block:16px"><a class="button" href="./montres/toutes-les-montres.html">Explorer et comparer les 52 montres documentées →</a></div><!-- AM_UNIFIED_DISCOVERY_END --><section class="aff-advisor-teaser" aria-labelledby="advisorTeaserTitle">');
  collection=collection.replace('<section class="am-editorial-gallery" id="amEditorialGallery"', '<!-- AM_POPULAR_PICKS_START -->'+popularPicks.teaser+'<!-- AM_POPULAR_PICKS_END -->\n<section class="am-editorial-gallery" id="amEditorialGallery"');
  collection=collection.replace('<section class="am-editorial" id="histoire"', '<!-- AM_SEO_GUIDES_START -->'+guideCards+'<!-- AM_SEO_GUIDES_END -->\n<!-- AM_SEO_CATEGORIES_START -->'+collections.homeCards+'<!-- AM_SEO_CATEGORIES_END -->\n<!-- AM_SEO_COMPARISONS_START -->'+comparisons.comparisonCards+'<!-- AM_SEO_COMPARISONS_END -->\n<section class="am-editorial" id="histoire"');
  collection=collection.replace(/<title>[^<]+<\/title>/,'<title>52 montres homme et femme à découvrir | Atelier Montres</title>');
  collection=collection.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Comparez 52 montres Casio, SKMEI, Citizen, Seiko, Tissot et autres : photos des modèles exacts disponibles, styles, mouvements et guides pour choisir.">');
  const homepage=u('');
  // Feature the original, owner-declared exact product photograph before
  // client-side catalogue JavaScript, improving early image discovery and LCP.
  const firstPhoto=products.find(p=>p.id==='citizen-tsuyosa');
  const firstPhotoApproved=firstPhoto?.photoReview?.publicUsageApproved===true&&
    firstPhoto.photoReview.localUrl==='./assets/watches/citizen-tsuyosa.webp';
  const firstPhotoSrc=firstPhotoApproved?'./assets/watches/citizen-tsuyosa.webp'+
    (typeof firstPhoto.photoReview.localSha256==='string'&&/^[a-f0-9]{64}$/i.test(firstPhoto.photoReview.localSha256)
      ?'?v='+firstPhoto.photoReview.localSha256.slice(0,12):''):'';
  const firstPhotoUrl=firstPhotoApproved?u('assets/watches/citizen-tsuyosa.webp'):undefined;
  const firstPhotoResponsive=firstPhotoApproved?responsiveSrcset(root,firstPhoto,'./'):'';
  const photoPreload=firstPhotoSrc?'<link rel="preload" as="image" fetchpriority="high" href="'+e(firstPhotoSrc)+'"'+(firstPhotoResponsive?' imagesrcset="'+e(firstPhotoResponsive)+'" imagesizes="(max-width: 760px) 92vw, 520px"':'')+'>':'';
  const socialImage=firstPhotoUrl?'<meta property="og:image" content="'+e(firstPhotoUrl)+'"><meta property="og:image:alt" content="Citizen Tsuyosa NJ0150-81X — photographie de la montre au cadran vert"><meta name="twitter:image" content="'+e(firstPhotoUrl)+'">':'';
  const headExtra=`${searchConsoleMeta}${photoPreload}<link rel="canonical" href="${e(homepage)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:site_name" content="Atelier Montres"><meta property="og:title" content="52 montres à découvrir · Atelier Montres"><meta property="og:description" content="52 montres documentées à découvrir, dont 15 comparées en profondeur. Casio, SKMEI, Citizen, ADDIESDIVE et autres marques."><meta property="og:url" content="${e(homepage)}">${socialImage}<meta name="twitter:card" content="${firstPhotoUrl?'summary_large_image':'summary'}"><link rel="stylesheet" href="./seo-guides.css"><link rel="stylesheet" href="./popular-picks.css">${umamiScripts("./")}<script type="application/ld+json">${schema({'@context':'https://schema.org','@graph':[{'@type':'WebSite',name:'Atelier Montres',url:homepage,inLanguage:'fr-FR'},{'@type':'ItemList',name:'15 montres comparées en profondeur parmi 52 références',numberOfItems:products.length,itemListElement:products.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}]})}</script>`;
  collection=collection.replace('</head>','<!-- AM_SEO_HEAD_START -->'+headExtra+'<!-- AM_SEO_HEAD_END --></head>');
  if(firstPhotoSrc){
    const emptyHero='<div class="am-hero-watch" id="heroWatch" role="img" aria-label="Photographie de Citizen Tsuyosa NJ0150-81X"></div>';
    const heroWithPhoto='<div class="am-hero-watch" id="heroWatch" role="img" aria-label="Photographie de Citizen Tsuyosa NJ0150-81X"><img class="am-hero-real-photo" src="'+e(firstPhotoSrc)+'"'+responsiveAttrs(root,firstPhoto,{prefix:'./',sizes:'(max-width: 760px) 92vw, 520px',escape:e})+' alt="Citizen Tsuyosa NJ0150-81X — montre automatique au cadran vert" width="520" height="520" decoding="async" fetchpriority="high"></div>';
    if(collection.includes(emptyHero))collection=collection.replace(emptyHero,heroWithPhoto);
    else if(!collection.includes(heroWithPhoto)){
      // Existing generated HTML may contain an older responsive srcset when
      // assets are refreshed or a minimal test fixture omits derivatives.
      // Regenerate only the exact expected Citizen cover, never arbitrary HTML.
      const previous=/\<div class="am-hero-watch" id="heroWatch" role="img" aria-label="Photographie de Citizen Tsuyosa NJ0150-81X"\>\<img class="am-hero-real-photo"[^>]*\>\<\/div\>/;
      if(!previous.test(collection))throw Error('Public hero photo insertion point missing or unexpectedly modified');
      collection=collection.replace(previous,heroWithPhoto);
    }
    // On the second SEO build, preserve exactly the first injected image.
    // A developer build must be safe when repeated against the same directory.
  }
  // The advisor is an indexable, useful decision aid. Keep its canonical URL,
  // social preview and WebPage semantics consistent with the deployed origin.
  // The delimited block makes repeated builds idempotent.
  const advisorFile=join(root,'conseiller.html');
  // Some affiliate test fixtures intentionally ship only a minimal storefront.
  // Enrich the adviser when present; full published-site validation requires it.
  if(existsSync(advisorFile)) {
  let advisor=readFileSync(advisorFile,'utf8');
  advisor=advisor.replace(/<!-- AM_ADVISOR_SEO_START -->[\s\S]*?<!-- AM_ADVISOR_SEO_END -->/g,'');
  if(!advisor.includes('</head>')||!advisor.includes('<h1>')) throw Error('Conseiller : structure HTML introuvable');
  const advisorTitle='Trouver sa montre : conseiller en 4 critères | Atelier Montres';
  const advisorDescription='Conseiller gratuit parmi 52 montres réelles : style, mouvement, gamme et diamètre documenté, sans tarifs ni disponibilité inventés.';
  advisor=advisor.replace(/<title>[^<]+<\/title>/,'<title>'+e(advisorTitle)+'</title>');
  const advisorSeo='<!-- AM_ADVISOR_SEO_START -->'
    +'<link rel="canonical" href="'+e(u('conseiller.html'))+'">'
    +'<meta property="og:type" content="website">'
    +'<meta property="og:locale" content="fr_FR">'
    +'<meta property="og:site_name" content="Atelier Montres">'
    +'<meta property="og:title" content="'+e(advisorTitle)+'">'
    +'<meta property="og:description" content="'+e(advisorDescription)+'">'
    +'<meta property="og:url" content="'+e(u('conseiller.html'))+'">'
    +'<meta name="twitter:card" content="summary">'
    +'<script type="application/ld+json">'+schema({
      '@context':'https://schema.org','@type':'WebPage',name:advisorTitle,
      description:advisorDescription,url:u('conseiller.html'),inLanguage:'fr-FR',
      isPartOf:{'@type':'WebSite',name:'Atelier Montres',url:homepage}
    })+'</script><!-- AM_ADVISOR_SEO_END -->';
  advisor=advisor.replace('</head>',advisorSeo+'</head>');
  writeFileSync(advisorFile,advisor);
  }
  writeFileSync(join(root,'index.html'),collection);
  writeFileSync(join(root,'affiliation.html'),collection);
  const paths=['','conseiller.html',unified.path,editorialPolicy.path,popularPicks.path,...popularPicks.shopperPaths,...popularPicks.detailPaths,guidePath,...editorialPaths,...collections.paths,...comparisons.comparisonPaths,...products.map(p=>'montres/'+p.id+'.html')];
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
  const manifest={siteUrl:homepage,unifiedCount:unified.count,unifiedPath:unified.path,productCount:products.length,popularAdditionalCount:popularPicks.count,popularDetailCount:popularPicks.detailPaths.length,popularAffiliateSearchLinks:popularPicks.searchLinks,popularAffiliateDirectLinks:popularPicks.directLinks,paths:paths.map(u),affiliateActive:partners.enabled,affiliateCount:partners.links.size,checkoutActive:false,comparisonCount:comparisons.comparisonPaths.length,categoryCount:collections.paths.length,analyticsActive:Boolean(umamiId),analyticsProvider:umamiId?"umami":null,licensedImageCount:products.filter(p=>p.photoReview?.publicUsageApproved===true).length,photoPermissionEvidenceStatus:'owner_declared_not_independently_verified'};
  writeFileSync(join(root,'seo-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('SEO build: '+unified.count+' montres au catalogue unifié (dont '+products.length+' historiques) ; '+products.length+' montres + '+(editorialPaths.length+1)+' guides + '+comparisons.comparisonPaths.length+' comparaisons + '+collections.paths.length+' collections + méthode de sélection, '+paths.length+' URLs sur '+homepage);
})();
