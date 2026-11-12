import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';
import {responsiveAttrs,responsivePopularAttrs} from './responsive-images.mjs';

const allowedStyles=new Set(['sport','classic','minimal','retro','statement']);
const styleMap={sport:'sport',retro:'retro',compact:'minimal',steel:'classic',dress:'classic'};
const styleLabels={sport:'Sport',classic:'Élégant',minimal:'Minimaliste',retro:'Rétro',statement:'Audacieux'};
const tierLabels={essential:'Essentielle',signature:'Signature',prestige:'Prestige'};
const movementLabels={quartz:'Quartz',automatic:'Automatique','eco-drive':'Solaire'};
const safePath=(id,folder)=>'./assets/'+folder+'/'+id+'.webp';
const exactNumericDiameter=(p)=>{
  // A rectangular width/height is NOT a round-case diameter.
  const input=p.case||'';
  const m=/\bdiam[eè]tre\s*(?:annonc[eé]\s*)?(?:de\s*)?(\d{1,2}(?:[,.]\d{1,2})?)\s*mm\b/i.exec(input);
  if(!m)return null;
  const mm=Number(m[1].replace(',','.'));
  return mm>=18&&mm<=65?mm:null;
};

export function buildUnifiedDiscovery({root,coreProducts,affiliates,amazonPartnerTag,pageHead,page,e,u,commercialRegistry}){
  if(!(commercialRegistry instanceof Map)||commercialRegistry.size!==52)
    throw Error('Unified catalogue requires a complete commercial proof registry');
  const extras=JSON.parse(readFileSync(join(root,'selection-populaires.json'),'utf8')).products;
  if(coreProducts.length!==15||extras.length!==37)throw Error('Unified discovery: unexpected source catalogue coverage');
  const approvedPhotos=loadApprovedPopularPhotos({root,picks:extras});
  const directLinks=loadVerifiedPopularLinks({root,picks:extras,affiliates,amazonPartnerTag});
  const partnerOffers=loadApprovedPartnerOffers({root,picks:extras});
  const coreById=new Map(coreProducts.map(p=>[p.id,p]));
  const ids=new Set();
  const normalized=[];
  function add(item){
    if(ids.has(item.id)||!allowedStyles.has(item.style)||!Object.hasOwn(tierLabels,item.tier))
      throw Error('Unified discovery: duplicate ID or unknown style/tier '+item.id);
    if(!['quartz','eco-drive','automatic'].includes(item.movement)||!/^\.\/montres\/[a-z0-9-]+\.html$/.test(item.detailUrl))
      throw Error('Unified discovery: unsafe movement or detail route '+item.id);
    if(item.photoUrl!==null&&!/^\.\/assets\/(?:watches|watches-popular)\/[a-z0-9-]+\.webp$/.test(item.photoUrl))
      throw Error('Unified discovery: untrusted image '+item.id);
    if(!/^https:\/\/[^/]+/.test(item.officialUrl))throw Error('Unified discovery: official URL must use HTTPS');
    ids.add(item.id);normalized.push(item);
  }
  for(const p of coreProducts){
    const photo=p.photoReview?.publicUsageApproved===true &&
      p.photoReview.localUrl===safePath(p.id,'watches')?safePath(p.id,'watches'):null;
    const d=/^(\d{1,2}(?:[,.]\d{1,2})?)\s*mm$/i.exec(p.specs?.diameter?.trim()||'');
    const diameter=d?Number(d[1].replace(',','.')):null;
    const paid=affiliates.links.get(p.id);
    const evidence=commercialRegistry.get(p.id);
    if(!evidence||evidence.collection!=='core'||
       (evidence.amazon.referralUrl||null)!==(paid?.url||null)||
       evidence.photo.published!==Boolean(photo)||
       evidence.directSale.eligible!==false)
      throw Error('Core commercial proof mismatch: '+p.id);
    add({
      id:p.id,kind:'core',brand:p.brand,model:p.model,tier:p.tier,style:p.style,
      movement:p.movement,diameterMm:diameter,caseText:p.specs?.diameter||p.specs?.caseSize||'Dimensions non documentées',
      glass:p.specs?.glass||'Non documenté',water:p.specs?.waterResistance||'Non documenté',
      description:p.description,lead:p.story||p.description,caution:null,officialUrl:p.officialUrl,
      photoUrl:photo,detailUrl:'./montres/'+p.id+'.html',
      merchantUrl:evidence.amazon.referralUrl,merchantKind:evidence.amazon.referralActive?'direct':null,
      marketplaceVariant:null,merchantEvidenceType:null,
      commercialStatus:evidence.purchasePath,observedAvailability:evidence.amazon.observedAvailability,
      sourceCheckedOn:evidence.amazon.sourceCheckedOn
    });
  }
  for(const p of extras){
    const photo=approvedPhotos.get(p.id);
    const verified=directLinks.get(p.id);
    const partner=partnerOffers.get(p.id);
    const evidence=commercialRegistry.get(p.id);
    if(!evidence||evidence.collection!=='supplemental'||
       evidence.photo.published!==Boolean(photo)||
       evidence.amazon.referralActive!==Boolean(verified)||
       (evidence.partner?.referralUrl||null)!==(partner?.url||null)||
       evidence.amazon.asin!==(verified?.asin||(!affiliates.enabled?evidence.amazon.asin:null))||
       evidence.directSale.eligible!==false)
      throw Error('Supplemental commercial proof mismatch: '+p.id);
    const movement=/automatique/i.test(p.movement)?'automatic':/solaire/i.test(p.movement)?'eco-drive':'quartz';
    add({
      id:p.id,kind:'supplemental',brand:p.brand,model:p.model,tier:p.tier,
      style:styleMap[p.style],movement,diameterMm:exactNumericDiameter(p),
      caseText:p.case,glass:p.glass,water:p.water,description:p.category,
      lead:p.lead,caution:p.caution,officialUrl:p.officialUrl,
      photoUrl:photo?safePath(p.id,'watches-popular'):null,
      detailUrl:'./montres/'+p.id+'.html',
      // Exact deep links take priority over generic marketplace searches.
      // Awin can operate independently of the Amazon affiliate programme.
      merchantUrl:evidence.amazon.referralUrl||partner?.url||
        (affiliates.enabled?'https://www.amazon.fr/s?k='+encodeURIComponent((p.brand+' '+p.model).slice(0,130))+'&tag='+encodeURIComponent(amazonPartnerTag):null),
      merchantKind:evidence.amazon.referralActive?'direct':partner?'awin':affiliates.enabled?'search':null,
      marketplaceVariant:verified?.marketplaceVariant||null,
      partnerVariant:partner?.variant||null,
      merchantEvidenceType:verified?.evidenceType||null,
      commercialStatus:evidence.purchasePath,observedAvailability:evidence.amazon.observedAvailability,
      sourceCheckedOn:partner&&!evidence.amazon.referralActive?partner.verifiedAt:evidence.amazon.sourceCheckedOn
    });
  }
  if(normalized.length!==52||new Set(normalized.map(p=>p.id)).size!==52)
    throw Error('Unified discovery: expected 52 distinct exact references');
  // No remote image API, AI image, tracking ID or inferred offer in this feed.
  const feed={version:1,source:'verified_site_catalogues',total:normalized.length,
    coreCount:coreProducts.length,supplementalCount:extras.length,products:normalized};
  writeFileSync(join(root,'discovery-catalogue.json'),JSON.stringify(feed,null,2)+'\n');
  // An affiliate tag is verified upstream by affiliate-policy.mjs. Do not
  // second-guess it here: negative and multi-account fixtures use other tags.
  const photoMarkup=p=>p.photoUrl
    ?'<img src="../'+e(p.photoUrl.slice(2))+'"'
      +(p.kind==='core'?responsiveAttrs(root,coreById.get(p.id),{
        prefix:'../',sizes:'auto, (max-width: 480px) 90vw, (max-width: 650px) 46vw, (max-width: 850px) 46vw, (max-width: 1220px) 30vw, 23vw',escape:e})
        :responsivePopularAttrs(root,p,approvedPhotos.get(p.id),{
          prefix:'../',sizes:'auto, (max-width: 480px) 90vw, (max-width: 650px) 46vw, (max-width: 850px) 46vw, (max-width: 1220px) 30vw, 23vw',escape:e}))
      +' alt="Photographie du modèle '+e(p.brand+' '+p.model)+'" width="'+(approvedPhotos.get(p.id)?.width||540)+'" height="'+(approvedPhotos.get(p.id)?.height||540)+'" loading="lazy" decoding="async">'
    :'<span class="ud-art-fallback"><span class="ud-art-fallback-kicker">Fiche produit documentée</span><span class="ud-art-fallback-brand">'+e(p.brand)+'</span><strong>'+e(p.model)+'</strong><small>Aucune photographie publiée pour cette référence</small></span>';
  const card=p=>{
    const merchantType=p.merchantKind||'official';
    const observedDate=p.sourceCheckedOn?p.sourceCheckedOn.split('-').reverse().join('/'):null;
    const evidenceMessage=p.observedAvailability==='unavailable_at_check'
      ?'Indisponible lors du contrôle du '+observedDate+' · stock actuel inconnu'
      :p.commercialStatus==='documented_amazon_referral'
        ?'ASIN Amazon.fr documenté'+(observedDate?' le '+observedDate:'')+' · stock actuel non vérifié'
        :p.commercialStatus==='documented_awin_referral'
          ?'Lien partenaire documenté'+(observedDate?' le '+observedDate:'')+' · stock actuel non vérifié'
          :'Référence vendeur · aucune offre exacte rémunérée active';
    // A compact buyer-facing marker is derived from the same validated
    // merchantKind as the destination. It never claims stock, price or seller.
    const merchantMarker={
      direct:'Fiche Amazon associée',
      awin:'Variante partenaire associée',
      search:'Recherche Amazon uniquement',
      official:'Référence à vérifier à la source'
    }[merchantType];
    if(!merchantMarker)throw Error('Unsupported catalogue merchant state: '+p.id);
    const merchantLabel=p.merchantEvidenceType==='amazon_fr_comparator_redirect'
      ?'Référence et ASIN recoupés via comparateur'
      :{direct:'Fiche du modèle identifiée',awin:'Variante partenaire identifiée',search:'Recherche marchande · variante à confirmer',official:'Source externe · sans lien d’achat vérifié'}[merchantType];
    const merchant=p.merchantUrl
      ?p.merchantKind==='awin'
        ?'<a class="ud-merchant" target="_blank" rel="noopener noreferrer nofollow sponsored" aria-label="'+e('Voir cette variante chez le partenaire via Awin — '+p.brand+' '+p.model+' ; contrôler stock, livraison et prix')+'" data-partner-offer-id="'+e(p.id)+'" data-partner-placement="popular" href="'+e(p.merchantUrl)+'">Voir chez le partenaire via Awin · lien rémunéré</a>'
        :'<a class="ud-merchant" target="_blank" rel="noopener noreferrer nofollow sponsored" aria-label="'+e((p.merchantKind==='direct'?'Voir cette référence sur Amazon.fr · lien rémunéré':'Rechercher sur Amazon.fr · lien rémunéré')+' — '+p.brand+' '+p.model+(p.merchantKind==='direct'?' ; fiche marchande identifiée':' ; vérifier la variante avant achat'))+'" data-amazon-'+(p.merchantKind==='direct'?'product':'search-id')+'="'+e(p.id)+'" data-amazon-placement="popular" href="'+e(p.merchantUrl)+'">'+(p.merchantKind==='direct'?'Voir cette référence sur Amazon.fr':'Rechercher sur Amazon.fr')+' · lien rémunéré</a>'
      :'';
    // Every one of the 52 model cards must offer its model-specific source
    // rather than forcing visitors to rely on a generic Amazon search.
    // Neither link describes stock, shipping to France or an approved sale.
    const sourceLabel='Vérifier la référence chez la marque ou le vendeur';
    const source='<a class="ud-source" target="_blank" rel="noopener noreferrer nofollow"'
      +' data-merchant-official-id="'+e(p.id)+'" data-merchant-placement="popular"'
      +' aria-label="'+e(sourceLabel+' — '+p.brand+' '+p.model)+'"'
      +' href="'+e(p.officialUrl)+'">'+e(sourceLabel)+'</a>';
    const actions=p.merchantKind==='search'?source+merchant:merchant+source;
    const variant=p.merchantKind==='direct'&&p.marketplaceVariant
      ?'<p class="ud-exact-variant"><strong>Variante Amazon à vérifier :</strong> '+e(p.marketplaceVariant)+'</p>':'';
    const partnerVariant=p.merchantKind==='awin'&&p.partnerVariant
      ?'<p class="ud-exact-variant"><strong>Variante partenaire à vérifier :</strong> '+e(p.partnerVariant)+'</p>':'';
    const redirectProof=p.merchantEvidenceType==='amazon_fr_comparator_redirect'
      ?'<p class="ud-redirect-proof">ASIN recoupé via comparateur et catalogue tiers ; page Amazon.fr non consultée directement. Vérifier le produit avant commande.</p>':'';

    return '<article class="ud-card" id="modele-'+e(p.id)+'" data-id="'+e(p.id)+'"'
      +' data-brand="'+e(p.brand)+'" data-model="'+e(p.model)+'" data-tier="'+e(p.tier)+'" data-style="'+e(p.style)+'"'
      +' data-movement="'+e(p.movement)+'" data-merchant="'+merchantType+'" data-commerce-status="'+e(p.commercialStatus)+'" data-visual="'+(p.photoUrl?'photo':'no-photo')+'" data-search="'+e([p.brand,p.model,p.description,p.lead,p.caseText,p.movement].join(' '))+'">'
      +'<div class="ud-media '+(p.photoUrl?'ud-media-verified':'ud-media-no-photo')+'">'
      +'<a class="ud-photo" href="'+e(p.detailUrl.replace('./montres/','./'))+'">'+photoMarkup(p)+'</a>'
      +(!p.photoUrl?'<a class="ud-photo-official" data-official-photo-id="'+e(p.id)+'" href="'+e(p.officialUrl)+'" target="_blank" rel="noopener noreferrer nofollow" aria-label="Voir les photos du modèle exact '+e(p.brand+' '+p.model)+' chez la marque ou le vendeur (nouvel onglet)">Voir les photos du modèle exact <span aria-hidden="true">↗</span></a>':'')
      +'<button type="button" class="ud-save" data-save-id="'+e(p.id)+'" aria-pressed="false" aria-label="Favoris : ajouter '+e(p.brand+' '+p.model)+'" hidden><span class="ud-save-heart" aria-hidden="true">♡</span><span class="ud-save-word">Favoris</span></button>'
      +(p.photoUrl?'<button type="button" class="ud-zoom" data-zoom-id="'+e(p.id)+'" aria-label="Agrandir la photographie de '+e(p.brand+' '+p.model)+'" hidden><span aria-hidden="true">＋</span> Agrandir</button>':'')
      +'<span class="ud-visual-label">'+(p.photoUrl?'Photo du modèle':'Sans photo publiée')+'</span></div>'
      +'<div class="ud-card-main"><p class="ud-trust-marker" data-merchant-confidence="'+e(merchantType)+'"><span class="ud-trust-dot" aria-hidden="true"></span>'+e(merchantMarker)+'</p><p class="ud-kicker"><span class="ud-tier-pill">Gamme '+e(tierLabels[p.tier])+'</span><span class="ud-card-style">'+e(styleLabels[p.style])+'</span></p>'
      +'<h2><a href="'+e(p.detailUrl.replace('./montres/','./'))+'">'+e(p.brand+' '+p.model)+'</a></h2>'
      +'<div class="am-ref-copy-tools" data-watch-ref-tools hidden><button type="button" class="am-ref-copy-button" data-watch-ref-copy="'+e(p.id)+'" hidden>Copier la référence</button><span class="am-ref-copy-status" role="status" aria-live="polite" data-watch-ref-status></span></div>'
      +'<p class="ud-description">'+e(p.lead)+'</p>'
      +'<dl><div><dt>Mouvement</dt><dd>'+e(movementLabels[p.movement])+'</dd></div><div><dt>Boîtier</dt><dd>'+e(p.caseText)+'</dd></div></dl>'
      +'<div class="ud-offer-context" role="group" aria-label="Informations du vendeur et de la référence">'
      +'<p class="ud-merchant-kind">'+e(merchantLabel)+'</p>'
      +'<p class="ud-commercial-proof">'+e(evidenceMessage)+'</p>'
      +variant+partnerVariant+redirectProof
      +'</div>'
      +'<div class="ud-actions"><a class="ud-details" href="'+e(p.detailUrl.replace('./montres/','./'))+'">Voir la fiche et les sources</a>'
      +actions+'</div>'
      +'<button type="button" class="ud-select" data-compare-id="'+e(p.id)+'" aria-pressed="false" hidden>Ajouter à la comparaison</button>'
      +'</div></article>';
  };
  // The curated showcase remains a six-model collection even if an owner
  // withdraws a photograph. Choose still-approved exact model photos first.
  // Missing photos never become generated counterfeit product images.
  const featureIds=['skmei-2056','skmei-2514','addiesdive-ad2030',
    'pagani-pd1701','casio-mtp-1302','citizen-tsuyosa'];
  const preferred=featureIds.map(id=>normalized.find(p=>p.id===id)).filter(Boolean);
  const candidates=[
    ...preferred.filter(p=>p.photoUrl),
    ...normalized.filter(p=>p.photoUrl&&['direct','awin'].includes(p.merchantKind)),
    ...normalized.filter(p=>p.photoUrl),
    ...preferred,
    ...normalized
  ];
  const featured=[];
  const selected=new Set();
  for(const p of candidates){
    if(selected.has(p.id))continue;
    selected.add(p.id);featured.push(p);
    if(featured.length===6)break;
  }
  if(featured.length!==6||featured.some(p=>!p.detailUrl||!p.officialUrl))
    throw Error('Editorial showcase requires six real, documented watches');
  const availablePaid=normalized.filter(p=>p.photoUrl&&p.merchantKind==='direct').length;
  if(affiliates.enabled&&availablePaid>=3&&featured.filter(p=>p.merchantKind==='direct').length<3)
    throw Error('Showcase must retain three documented merchant listings when available');
  const featureCard=p=>{
    const direct=p.merchantKind==='direct';
    const awin=p.merchantKind==='awin';
    const paid=direct||awin;
    const target=paid?p.merchantUrl:p.officialUrl;
    const rel=paid?'noopener noreferrer nofollow sponsored':'noopener noreferrer nofollow';
    const tracking=direct?'data-amazon-product="'+e(p.id)+'" data-amazon-placement="popular"'
      :awin?'data-partner-offer-id="'+e(p.id)+'" data-partner-placement="popular"'
        :'data-merchant-official-id="'+e(p.id)+'" data-merchant-placement="popular"';
    const kind=direct?'Fiche marchande identifiée':awin?'Variante partenaire identifiée':'Fiche du fabricant';
    const exit=direct?'Consulter sur Amazon.fr · lien rémunéré':awin?'Voir chez le partenaire via Awin · lien rémunéré':'Voir chez la marque · lien non rémunéré';
    const detail=p.detailUrl.replace('./montres/','./');
    const visual=p.photoUrl?'../'+p.photoUrl.slice(2):null;
    const featureSizes='(max-width: 365px) 88vw, (max-width: 660px) 33vw, (max-width: 1100px) 44vw, 29vw';
    // Reuse the approved source registry and all available 240–960px WebPs.
    // Never hard-code source widths or publish nonexistent derivatives.
    const popularAttrs=p.kind==='supplemental'
      ?responsivePopularAttrs(root,p,approvedPhotos.get(p.id),{
        prefix:'../',sizes:featureSizes,escape:e}):'';
    return '<article class="ud-feature-card" data-feature-id="'+e(p.id)+'">'
      +'<a class="ud-feature-photo" href="'+e(detail)+'" aria-label="Découvrir '+e(p.brand+' '+p.model)+'">'
      +(visual
        ?'<img src="'+e(visual)+'"'
          +(p.kind==='core'?responsiveAttrs(root,coreById.get(p.id),{
            prefix:'../',sizes:featureSizes,escape:e}):popularAttrs)
          +' width="540" height="540" loading="lazy" decoding="async" alt="Photographie du modèle '+e(p.brand+' '+p.model)+'">'
        :'<span class="ud-art-fallback"><span class="ud-art-fallback-brand">'+e(p.brand)+'</span><strong>'+e(p.model)+'</strong><small>Photo exacte non publiée</small></span>')
      +'</a>'
      +'<div class="ud-feature-info"><span class="ud-feature-type">'+e(styleLabels[p.style])+' · '+e(tierLabels[p.tier])+'</span>'
      +'<h3><a href="'+e(detail)+'">'+e(p.brand+' '+p.model)+'</a></h3>'
      +'<p class="ud-feature-lead">'+e(p.lead)+'</p>'
      +'<span class="ud-feature-proof">'+e(kind)+'</span>'
      +'<div class="ud-feature-actions"><a class="ud-feature-detail" href="'+e(detail)+'">Voir les détails</a>'
      +'<a class="ud-feature-exit" href="'+e(target)+'" rel="'+rel+'" target="_blank" '+tracking+'>'+e(exit)+'</a></div>'
      +'</div></article>';
  };
  const showroom='<section class="ud-showroom" aria-labelledby="udSpotlightTitle">'
    +'<div class="ud-showroom-heading"><div><span class="ud-showroom-kicker">La sélection de l’atelier</span>'
    +'<h2 id="udSpotlightTitle">Six pièces à découvrir en premier.</h2></div>'
    +'<p>Rétro digital, cadran travaillé ou chronographe : six références choisies pour leur style et leurs caractéristiques documentées, sans classement de ventes inventé.</p></div>'
    +'<div class="ud-feature-grid">'+featured.map(featureCard).join('')+'</div>'
    +'<p class="ud-showroom-note">Les photographies publiées correspondent aux modèles indiqués, sous réserve des droits déclarés par l’éditeur ; les autres modèles restent sans photo. Une fiche marchande identifiée ne garantit ni le stock ni la variante disponible. Les liens rémunérés sont signalés. Les achats partenaires sont conclus chez le vendeur externe ; une commande directe n’est possible que si un prix TTC et une disponibilité vérifiés sont explicitement affichés sur Atelier Montres.</p>'
    +'</section>';
  // Offer four genuine, source-backed comparisons before the 52-card grid.
  // The static editorial article always works; the live table link is
  // progressively revealed only after the validated catalogue JSON loads.
  const sourcePairs=JSON.parse(readFileSync(join(root,'comparaisons-montres.json'),'utf8'));
  if(sourcePairs.version!==1||sourcePairs.comparisons?.length!==4)
    throw Error('Four documented editorial comparisons are required');
  const comparePairs='<section class="ud-pair-starters" aria-labelledby="udPairStartersTitle">'
    +'<div class="ud-pair-starters-heading"><div><span>Face à face · modèles documentés</span>'
    +'<h2 id="udPairStartersTitle">Comparez directement deux montres.</h2></div>'
    +'<p>Quatre confrontations rédigées à partir des références exactes : aucun prix ni classement de ventes supposé.</p></div>'
    +'<div class="ud-pair-starters-list">'+sourcePairs.comparisons.map((pair,index)=>{
      const left=normalized.find(p=>p.id===pair.left),right=normalized.find(p=>p.id===pair.right);
      if(!left||!right||left.id===right.id||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pair.slug)||
        !String(pair.title||'').trim())throw Error('Invalid factual pair: '+pair.slug);
      return '<article class="ud-pair-starter" data-pair-slug="'+e(pair.slug)+'">'
        +'<span class="ud-pair-starter-index">DUEL '+String(index+1).padStart(2,'0')+'</span>'
        +'<h3>'+e(pair.title)+'</h3>'
        +'<p>'+e(left.brand+' '+left.model)+' <span aria-hidden="true">/</span> '+e(right.brand+' '+right.model)+'</p>'
        +'<div class="ud-pair-starter-actions"><a class="ud-pair-starter-static" href="./comparer-'+e(pair.slug)+'.html">Lire le comparatif documenté</a>'
        +'<a class="ud-pair-starter-interactive" data-ud-pair-interactive hidden href="?compare='+e(left.id+','+right.id)+'#comparer">Tableau interactif <span aria-hidden="true">↗</span></a></div>'
        +'</article>';
    }).join('')+'</div>'
    +'<p class="ud-pair-starters-note">Les comparatifs restent accessibles sans JavaScript. Le tableau interactif se débloque uniquement quand les données des 52 références sont chargées.</p>'
    +'</section>';
  const shortcuts='<nav class="ud-discovery-links" aria-label="Parcourir la collection selon votre envie">'
    +'<a href="?brand=SKMEI#udCount"><span>01 / Marque</span><strong>Découvrir SKMEI ↗</strong></a>'
    +'<a href="?movement=automatic#udCount"><span>02 / Mouvement</span><strong>Automatiques ↗</strong></a>'
    +'<a href="?size=compact#udCount"><span>03 / Proportions</span><strong>Petits boîtiers ↗</strong></a>'
    +'<a href="?visual=photo#udCount"><span>04 / Photographies</span><strong>Modèles photographiés ↗</strong></a>'
    +'</nav>';
  // Editorial entrypoints are derived from the exact 52-model feed and
  // reuse the same deep-linking filters as the existing catalogue controls.
  // These ranges are NOT price brackets: actual prices and stock are external.
  const tierDescriptions={
    essential:{headline:'Les essentiels',detail:'Des lignes utiles, sportives ou sobres pour trouver votre style.'},
    signature:{headline:'Le style signature',detail:'Des designs plus affirmés et des détails qui se remarquent.'},
    prestige:{headline:'L’esprit prestige',detail:'Des références à explorer pour leur caractère horloger.'}
  };
  const tierCards=Object.entries(tierDescriptions).map(([tier,copy],index)=>{
    const count=normalized.filter(p=>p.tier===tier).length;
    if(count===0)throw Error('Editorial tier has no watch references: '+tier);
    return '<a class="ud-tier-shortcut" data-tier-shortcut="'+tier+'" href="?tier='+tier+'#udCount">'
      +'<span class="ud-tier-shortcut-index">COLLECTION '+String(index+1).padStart(2,'0')+'</span>'
      +'<strong>'+e(copy.headline)+'</strong><span class="ud-tier-shortcut-desc">'+e(copy.detail)+'</span>'
      +'<span class="ud-tier-shortcut-footer">'+count+' modèle'+(count===1?'':'s')+' à découvrir <span aria-hidden="true">↗</span></span>'
      +'</a>';
  }).join('');
  const tierNavigation='<section class="ud-tier-navigation" aria-labelledby="udTierTitle">'
    +'<div class="ud-tier-navigation-head"><div><span class="ud-tier-navigation-eyebrow">Une collection, trois univers</span>'
    +'<h2 id="udTierTitle">Choisissez votre univers.</h2></div>'
    +'<p>Du quotidien aux pièces de caractère : trouvez un style qui vous correspond, puis comparez les références réelles.</p></div>'
    +'<nav class="ud-tier-shortcuts" aria-label="Explorer les trois gammes de montres">'+tierCards+'</nav>'
    +'<p class="ud-tier-disclaimer">Les gammes sont des repères éditoriaux, pas des fourchettes de prix. Prix, variante, stock et conditions d’achat sont à vérifier chez le vendeur.</p>'
    +'</section>';

  // Each shortcut is backed by the exact same commercial status as its watch
  // cards. No partner is created or promoted when its documented count is 0.
  const merchantPaths=[
    {kind:'direct',eyebrow:'Fiche associée à une référence',title:'Voir les fiches Amazon identifiées',
      description:'Code modèle et fiche marchande associés dans nos sources. Vérifiez la variante et le vendeur.'},
    {kind:'awin',eyebrow:'Partenaire documenté',title:'Voir les références partenaires',
      description:'Variante référencée par un partenaire ; stock et conditions restent à contrôler.'},
    {kind:'search',eyebrow:'Recherche, pas une offre exacte',title:'Explorer les recherches Amazon',
      description:'Les résultats peuvent montrer plusieurs montres. Comparez d’abord les codes modèles.'},
    {kind:'official',eyebrow:'Sans lien marchand rémunéré',title:'Consulter les sources fabricant',
      description:'Fiches de référence à vérifier auprès des marques ou distributeurs.'}
  ];
  const merchantCounts=new Map(merchantPaths.map(({kind})=>[kind,0]));
  for(const product of normalized){
    const kind=product.merchantKind||'official';
    if(!merchantCounts.has(kind))throw Error('Unsupported customer purchase path: '+kind);
    merchantCounts.set(kind,merchantCounts.get(kind)+1);
  }
  if([...merchantCounts.values()].reduce((sum,n)=>sum+n,0)!==normalized.length)
    throw Error('Merchant shortcuts cannot omit an exact watch');
  const merchantShortcuts=merchantPaths.filter(({kind})=>merchantCounts.get(kind)>0)
    .map(({kind,eyebrow,title,description})=>{
      const count=merchantCounts.get(kind);
      return '<a class="ud-path-link" data-merchant-path="'+kind+'" href="?merchant='+kind+'#udCount">'
        +'<span class="ud-path-icon" aria-hidden="true">↗</span>'
        +'<span class="ud-path-eyebrow">'+e(eyebrow)+'</span>'
        +'<strong>'+e(title)+'</strong>'
        +'<span class="ud-path-description">'+e(description)+'</span>'
        +'<span class="ud-path-count">'+count+' référence'+(count===1?'':'s')+' à consulter</span>'
        +'</a>';
    }).join('');
  const merchantNavigation='<section class="ud-paths" aria-labelledby="udPathsHeading">'
    +'<div class="ud-paths-header"><div><span>Vos prochaines étapes</span><h2 id="udPathsHeading">Comment consulter une montre chez un marchand ?</h2></div>'
    +'<p>Choisissez un niveau de correspondance documenté. Les liens suivants filtrent les mêmes 52 références, sans prix ni disponibilité inventés.</p></div>'
    +'<nav class="ud-path-links" aria-label="Explorer selon le type de lien marchand">'
    +merchantShortcuts+'</nav>'
    +'<p class="ud-paths-disclosure">Une fiche associée ne prouve ni stock ni prix actuel. Une recherche Amazon ne garantit pas le modèle exact. Les liens rémunérés sont identifiés sur chaque carte ; les achats externes sont conclus chez le marchand.</p>'
    +'</section>';
  const path='montres/toutes-les-montres.html';
  const main='<div class="wrap ud-page"><nav class="crumb" aria-label="Fil d’Ariane"><a href="../index.html">Accueil</a> / Les 52 montres</nav>'
    +'<header class="ud-heading" aria-labelledby="udCollectionTitle"><span class="eyebrow">Atelier Montres · Collection homme et femme</span>'
    +'<h1 id="udCollectionTitle">52 montres. Trouvez celle qui vous ressemble.</h1>'
    +'<p class="ud-heading-lead">Du digital sportif à la mécanique élégante, découvrez des montres sélectionnées pour leur style. Comparez les mouvements, les proportions et les détails qui comptent pour vous.</p>'
    +'<div class="ud-heading-actions"><a class="ud-heading-primary" href="#udCount">Explorer les 52 montres <span aria-hidden="true">↘</span></a><a class="ud-heading-secondary" href="../conseiller.html">Me guider dans mon choix <span aria-hidden="true">↗</span></a></div>'
    +'<ul class="ud-heading-highlights" aria-label="Les avantages du catalogue"><li>52 modèles à comparer</li><li>Caractéristiques documentées</li><li>Photos de modèle quand disponibles</li></ul>'
    +'<p class="ud-disclosure"><strong>Avant votre achat :</strong> consultez le prix, la disponibilité et les conditions de livraison chez le marchand. Certains liens partenaires peuvent nous rémunérer. Une recherche Amazon ne garantit pas le modèle exact : vérifiez la référence auprès du vendeur.</p></header>'
    +shortcuts+comparePairs+showroom+tierNavigation+merchantNavigation
    +'<div class="ud-favorite-tools" id="udFavoriteTools" hidden><div><strong>Votre sélection, à votre rythme.</strong><p>Gardez vos modèles préférés sur cet appareil, puis comparez-les parmi les 52 montres.</p></div><button id="udSavedToggle" type="button" aria-pressed="false"><span aria-hidden="true">♡</span> <span id="udSavedButtonLabel">Voir mes favoris</span> <span class="ud-favorite-total">(<span id="udSavedCount">0</span>)</span></button></div>'
    +'<form id="udFilters" class="ud-filters" role="search" aria-label="Affiner les 52 montres" hidden>'
    +'<label>Recherche<input id="udSearch" type="search" maxlength="100" placeholder="Marque, modèle, caractéristiques…"></label>'
    +'<label>Marque<select id="udBrand"><option value="all">Toutes les marques</option>'
    +[...new Set(normalized.map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'fr')).map(brand=>'<option value="'+e(brand)+'">'+e(brand)+'</option>').join('')+'</select></label>'
    +'<label>Style<select id="udStyle"><option value="all">Tous les styles</option>'+Object.entries(styleLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Mouvement<select id="udMovement"><option value="all">Tous les mouvements</option>'+Object.entries(movementLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Gamme<select id="udTier"><option value="all">Toutes les gammes</option>'+Object.entries(tierLabels).map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label>'
    +'<label>Diamètre documenté<select id="udSize"><option value="all">Toutes les tailles</option><option value="compact">Jusqu’à 38 mm</option><option value="medium">38,1 à 40 mm</option><option value="large">Plus de 40 mm</option><option value="unknown">Non documenté</option></select></label>'
    +'<label>Photographies<select id="udVisual"><option value="all">Toutes les références</option><option value="photo">Avec photo du modèle</option><option value="no-photo">Sans photo publiée</option></select></label>'
    +'<label>Accès marchand<select id="udMerchant"><option value="all">Tous les accès</option><option value="direct">Fiche Amazon du modèle identifiée</option><option value="awin">Variante partenaire Awin identifiée</option><option value="search">Recherche Amazon · modèle à confirmer</option><option value="official">Source externe sans lien d’achat vérifié</option></select></label>'
    +'<label>Afficher en premier<select id="udSort"><option value="essential">Gamme essentielle · prix à vérifier</option><option value="direct">Fiches marchandes identifiées</option><option value="photo">Modèles avec photographie</option><option value="alpha">Marque A à Z</option><option value="editorial">Ordre éditorial initial</option></select></label>'
    +'<button type="reset">Effacer les filtres</button></form>'
    +'<div id="udActiveFilters" class="ud-active-filters" role="group" aria-label="Filtres actifs" hidden>'
    +'<strong>Votre recherche</strong><div id="udActiveFilterPills" class="ud-active-filter-pills"></div>'
    +'<button type="button" id="udClearActiveFilters" class="ud-clear-active">Effacer les critères</button></div>'
    +'<div id="udViewTools" class="ud-view-tools" hidden><p>Affichage du catalogue</p>'
    +'<div role="group" aria-label="Taille des visuels"><button type="button" id="udViewCompact" aria-pressed="true">Grille</button>'
    +'<button type="button" id="udViewLarge" aria-pressed="false">Grands visuels</button></div></div>'
    +'<section class="am-unified-recent" data-unified-recent aria-labelledby="udRecentHeading" hidden><div class="am-unified-recent-head"><div><h2 id="udRecentHeading">Vos dernières montres consultées</h2><p>Historique privé sur cet appareil · huit références maximum</p></div><button type="button" class="am-unified-recent-clear" data-unified-recent-clear>Effacer l’historique</button></div><nav class="am-unified-recent-list" aria-label="Montres consultées récemment" data-unified-recent-list></nav></section>'
    +'<p class="ud-count" id="udCount" role="status" aria-live="polite">52 modèles sur 52</p>'
    +'<div class="ud-grid" id="udGrid">'+normalized.map(card).join('')+'</div>'
    // 52 cards form a long mobile catalogue: give shoppers a no-JS escape
    // back to the live results count and a direct route to comparison.
    +'<nav class="ud-results-end" aria-label="Suite du catalogue">'
    +'<p id="udResultsEndSummary">Vous avez parcouru les 52 références de cette sélection.</p>'
    +'<div class="ud-results-end-actions"><a href="#udCount">↑ Revenir aux résultats et aux filtres</a>'
    +'<a href="#comparer">Comparer mes montres sélectionnées ↓</a></div></nav>'
    +'<p id="udEmpty" hidden>Aucun résultat. Essayez une autre marque, un style différent ou effacez les filtres.</p>'
    +'<aside id="udCompareTray" class="ud-tray" aria-label="Votre sélection de montres" hidden>'
    +'<div class="ud-tray-heading"><strong>Votre comparaison</strong><span id="udTrayCount" aria-live="polite">Aucune montre sélectionnée</span></div>'
    +'<ul id="udTrayItems" class="ud-tray-items" aria-label="Montres sélectionnées"></ul>'
    +'<div class="ud-tray-actions"><a id="udTrayOpen" class="ud-tray-open" href="#comparer" hidden>Voir la comparaison</a>'
    +'<button type="button" id="udTrayClear">Tout effacer</button></div></aside>'
    +'<section id="comparer" class="ud-compare" aria-labelledby="udCompareTitle"><h2 id="udCompareTitle">Comparer jusqu’à trois montres</h2><p>Choisissez les modèles depuis les fiches ci-dessus. Les champs non documentés restent signalés comme tels.</p>'
    +'<p id="udCompareStatus" aria-live="polite">Sélectionnez au moins deux modèles.</p><button type="button" id="udCompareClear" hidden>Effacer la comparaison</button>'
    +'<form id="udDecisionForm" class="ud-decision-form" aria-label="Critères personnels pour comparer les montres" hidden>'
    +'<div class="ud-decision-heading"><h3>Ce qui compte pour vous</h3><p>Comparez les faits aux préférences du conseiller. Gamme = sélection éditoriale, pas un prix. Une dimension inconnue ne correspond jamais par défaut.</p></div>'
    +'<div class="ud-decision-controls">'
    +'<label for="udPrefTier">Gamme<select id="udPrefTier" name="tier"><option value="all">Indifférent</option><option value="essential">Essentielle</option><option value="signature">Signature</option><option value="prestige">Prestige</option></select></label>'
    +'<label for="udPrefStyle">Style<select id="udPrefStyle" name="style"><option value="all">Indifférent</option><option value="sport">Sport</option><option value="classic">Classique</option><option value="minimal">Minimaliste</option><option value="retro">Rétro</option><option value="statement">Audacieux</option></select></label>'
    +'<label for="udPrefMovement">Mouvement<select id="udPrefMovement" name="movement"><option value="all">Indifférent</option><option value="quartz">Quartz</option><option value="automatic">Automatique</option><option value="eco-drive">Solaire</option></select></label>'
    +'<label for="udPrefSize">Boîtier rond<select id="udPrefSize" name="size"><option value="all">Indifférent</option><option value="compact">Jusqu’à 38 mm</option><option value="medium">38,1 à 40 mm</option></select></label>'
    +'</div><button type="button" id="udDecisionReset" class="ud-decision-reset">Effacer mes préférences</button></form>'
    +'<div id="udCompareTable" role="region" tabindex="0" aria-label="Tableau de comparaison des montres" hidden></div></section>'
    +'<p class="ud-back"><a href="../conseiller.html">Utiliser le conseiller pour trouver trois suggestions</a> · <a href="./modeles-populaires.html">Voir les 37 modèles complémentaires</a></p></div>';
  const graph={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage',name:'52 montres à découvrir et comparer',url:u(path),inLanguage:'fr-FR',
      description:'Comparateur de montres de marque, avec référence exacte, photos réelles autorisées et caractéristiques documentées.'},
    {'@type':'ItemList',numberOfItems:normalized.length,
      itemListElement:normalized.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.brand+' '+p.model,url:u('montres/'+p.id+'.html')}))}
  ]};
  writeFileSync(join(root,path),page(pageHead({title:'52 montres homme et femme à comparer | Atelier Montres',
    description:'Explorez 52 montres Casio, SKMEI, Citizen, Seiko et autres. Comparez style, mouvement, dimensions vérifiées et liens marchands sans faux prix.',path}),main,graph)
    .replace('</head>','<link rel="stylesheet" href="../unified-discovery.css"><link rel="stylesheet" href="../watch-reference-copy.css"><script defer src="../watch-reference-copy-v2.js"></script><link rel="stylesheet" href="../unified-recent-history.css"><script defer src="../unified-recent-history.js"></script><link rel="stylesheet" href="../unified-trust-markers.css"><link rel="stylesheet" href="../unified-tier-finish.css"><link rel="stylesheet" href="../unified-shopper-paths.css"><link rel="stylesheet" href="../photo-zoom.css"><script defer src="../photo-zoom.js"></script><link rel="stylesheet" href="../direct-offer-links.css"><link rel="stylesheet" href="../editorial-atelier-2026.css"><script defer src="../conseiller-engine.js"></script><script defer src="../unified-discovery.js"></script><script defer src="../direct-offer-links.js"></script></head>'));
  return {path,count:normalized.length,coreCount:coreProducts.length,supplementalCount:extras.length};
}
