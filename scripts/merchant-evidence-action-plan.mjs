/**
 * Read-only editorial action plan from the existing 52-watch registries.
 * "Documented ASIN" is NOT a live offer; "rights claimed" is NOT a licence.
 * Sorting is stable, inputs are checked, and no network or customer data is used.
 */
export function buildMerchantEvidenceActionPlan({
  coreProducts,extraProducts,photoRights,sourceReview,coreResearch
}){
  if(!Array.isArray(coreProducts)||coreProducts.length!==15||
     !Array.isArray(extraProducts)||extraProducts.length!==37||
     !photoRights||typeof photoRights!=='object'||
     !sourceReview||!Array.isArray(sourceReview.records)||
     !coreResearch||typeof coreResearch!=='object')
    throw Error('Evidence action plan requires complete source registers');
  const products=[...coreProducts.map(p=>({...p,collection:'core'})),
    ...extraProducts.map(p=>({...p,collection:'supplemental'}))];
  const ids=new Set(products.map(p=>p.id));
  if(ids.size!==52||sourceReview.records.length!==sourceReview.documentedAsins)
    throw Error('Evidence action plan requires 52 unique models and a consistent evidence register');
  const extraIds=new Set(extraProducts.map(p=>p.id));
  if(Object.keys(photoRights).some(id=>!extraIds.has(id)))
    throw Error('Photo register references an unknown supplemental model');
  const evidence=new Map(sourceReview.records.map(p=>[p.id,p]));
  if(evidence.size!==sourceReview.documentedAsins||
     [...evidence.keys()].some(id=>!ids.has(id)))
    throw Error('Evidence references an unknown or duplicated model');
  const safeUrl=value=>{
    try{const url=new URL(value);return url.protocol==='https:'&&
      !url.username&&!url.password&&!url.port?url.href:null;
    }catch{return null}
  };
  const rows=products.map(p=>{
    if(!/^[a-z0-9-]{4,64}$/.test(p.id||'')||
       typeof p.brand!=='string'||typeof p.model!=='string'||
       !safeUrl(p.officialUrl))
      throw Error('Incomplete model identity or official URL: '+String(p.id));
    const proof=evidence.get(p.id)||null;
    const corePhoto=p.collection==='core'?p.photoReview:null;
    const extraPhoto=p.collection==='supplemental'?photoRights[p.id]:null;
    const photoPublished=p.collection==='core'?
      corePhoto?.publicUsageApproved===true:Boolean(extraPhoto);
    const rightsClaim=photoPublished&&(p.collection==='core'?
      corePhoto?.permissionIndependentlyVerified===true:
      extraPhoto?.permissionIndependentlyVerified===true);
    const availability=proof?.collection==='core'?
      coreResearch[p.id]?.availabilityAtCheck:null;
    const historicallyUnavailable=availability==='unavailable_at_check';
    const comparatorOnly=proof?.evidenceKind==='amazon_fr_comparator_redirect';
    const expiresInDays=proof?sourceReview.reviewIntervalDays-proof.ageDays:null;
    const dueSoon=proof&&!proof.needsReview&&expiresInDays<=14;
    let merchantPriority,merchantAction;
    if(historicallyUnavailable){
      merchantPriority=1;
      merchantAction='Recontrôler cet ASIN : indisponibilité signalée à la date du contrôle, situation actuelle inconnue';
    }else if(proof?.needsReview){
      merchantPriority=1;
      merchantAction='Renouveler la correspondance modèle / ASIN avec une preuve externe datée';
    }else if(comparatorOnly){
      merchantPriority=2;
      merchantAction='Vérifier directement la fiche Amazon et la variante ; preuve actuelle issue de sources indirectes';
    }else if(dueSoon){
      merchantPriority=3;
      merchantAction='Préparer le recontrôle documentaire avant son échéance';
    }else if(!proof){
      merchantPriority=4;
      merchantAction='Rechercher une fiche marchande de la référence exacte ; ne pas promouvoir une recherche générique en offre';
    }else{
      merchantPriority=5;
      merchantAction='Conserver la preuve datée ; stock, prix et rémunération toujours inconnus';
    }
    return {
      id:p.id,brand:p.brand,model:p.model,tier:p.tier,collection:p.collection,
      modelUrl:'https://atelier-montres-selection-fr.onrender.com/montres/'+p.id+'.html',
      officialUrl:p.officialUrl,
      documentedAsin:proof?.asin||null,evidenceKind:proof?.evidenceKind||null,
      evidenceCheckedOn:proof?.checkedOn||null,ageDays:proof?.ageDays??null,
      daysUntilReview:expiresInDays,needsDocumentaryReview:proof?.needsReview||false,
      documentaryReviewSoon:Boolean(dueSoon),historicallyUnavailable,
      comparatorOnly,merchantPriority,merchantAction,
      photoPublished,rightsIndependentlyVerifiedClaim:Boolean(rightsClaim),
      photoAction:photoPublished
        ?'Recueillir et contrôler hors GitHub une autorisation écrite pour la photo exacte et son hébergement local'
        :'Rechercher une photographie autorisée du modèle exact, sinon conserver la fiche sans photo'
    };
  }).sort((a,b)=>a.merchantPriority-b.merchantPriority||
    Number(b.historicallyUnavailable)-Number(a.historicallyUnavailable)||
    (b.ageDays??-1)-(a.ageDays??-1)||a.id.localeCompare(b.id,'fr'));
  const totals={
    watches:rows.length,documentedAsins:rows.filter(p=>p.documentedAsin).length,
    noDocumentedAsin:rows.filter(p=>!p.documentedAsin).length,
    photosPublished:rows.filter(p=>p.photoPublished).length,
    photosMissing:rows.filter(p=>!p.photoPublished).length,
    independentRightsClaims:rows.filter(p=>p.rightsIndependentlyVerifiedClaim).length,
    historicallyUnavailable:rows.filter(p=>p.historicallyUnavailable).length,
    comparatorOnly:rows.filter(p=>p.comparatorOnly).length,
    documentaryDue:rows.filter(p=>p.needsDocumentaryReview).length,
    documentaryDueSoon:rows.filter(p=>p.documentaryReviewSoon).length
  };
  return {schemaVersion:1,kind:'merchant-evidence-read-only-action-plan',
    asOf:sourceReview.asOf,reviewIntervalDays:sourceReview.reviewIntervalDays,
    totals,rows,
    limitations:[
      'Documented ASIN matches are historical; no price, stock, seller or France delivery is checked here.',
      'Historical unavailability must not be presented as current stock status.',
      'Image hashes and permissions declared by the site owner are not independently authenticated licences.',
      'A paid click is not a purchase or a commission; no analytics or revenue evidence is inferred.',
      'This report never changes a merchant link, source date, photo, payment or listing.'
    ]};
}
