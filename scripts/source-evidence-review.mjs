/**
 * Deterministic documentary evidence-review queue.
 * A source date is NOT live inventory, seller verification or a commission.
 */
const exactDay=value=>{
  if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))
    throw Error('Documentary evidence date must be YYYY-MM-DD');
  const ms=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)
    throw Error('Invalid documentary evidence calendar date: '+value);
  return ms;
};
export function buildSourceEvidenceReview({coreResearch,supplemental,catalogIds,
  asOf=new Date().toISOString().slice(0,10),reviewIntervalDays=45}){
  if(!Number.isSafeInteger(reviewIntervalDays)||reviewIntervalDays<1||reviewIntervalDays>365)
    throw Error('Review window must be a positive number of days');
  const todayMs=exactDay(asOf);
  if(!coreResearch||typeof coreResearch!=='object'||
    !supplemental||typeof supplemental!=='object'||
    !(catalogIds instanceof Set)||catalogIds.size!==52)
    throw Error('Review queue needs complete independent catalog registries');
  const records=[
    ...Object.entries(coreResearch).filter(([,p])=>p?.status==='matched_on_amazon_fr')
      .map(([id,p])=>({id,asin:p.asin,checkedOn:p.checkedOn,
        evidenceKind:'dated_model_match',collection:'core'})),
    ...Object.entries(supplemental)
      .map(([id,p])=>({id,asin:p?.asin,checkedOn:p?.verifiedAt,
        evidenceKind:p?.evidenceType,collection:'supplemental'}))
  ];
  if(new Set(records.map(p=>p.id)).size!==records.length||
     records.some(p=>!catalogIds.has(p.id)||!/^B[0-9A-Z]{9}$/.test(p.asin||'')||
       !['dated_model_match','amazon_fr_comparator_redirect',
         'amazon_fr_product_page'].includes(p.evidenceKind)))
    throw Error('Evidence queue cannot contain unknown, duplicated or invalid ASINs');
  const reviewed=records.map(p=>{
    const ms=exactDay(p.checkedOn);
    if(ms>todayMs)throw Error('Documentary source date in the future: '+p.id);
    const ageDays=Math.floor((todayMs-ms)/86400000);
    return {...p,ageDays,needsReview:ageDays>=reviewIntervalDays};
  }).sort((a,b)=>b.ageDays-a.ageDays||a.id.localeCompare(b.id,'fr'));
  return {
    asOf,reviewIntervalDays,documentedAsins:reviewed.length,
    dueCount:reviewed.filter(p=>p.needsReview).length,
    notes:'Source/ASIN matching dates only; never live prices, stock, seller, paid sale or account approval.',
    records:reviewed
  };
}
