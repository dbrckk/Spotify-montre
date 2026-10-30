/**
 * Rules for turning verified Amazon.fr Special Links into published CTAs.
 * These values are public; credentials/payment tokens must never be committed.
 * One invalid link aborts the whole build before any storefront is published.
 */
export function validateAffiliateConfig(config, productIds) {
  const fail = reason => { throw new Error('Affiliate config rejected: ' + reason); };
  if (!config || typeof config !== 'object' || Array.isArray(config) || config.version !== 1) fail('schema version');
  if (typeof config.enabled !== 'boolean' || typeof config.approved !== 'boolean') fail('activation flags');
  if (!config.links || typeof config.links !== 'object' || Array.isArray(config.links)) fail('links map');
  const entries=Object.entries(config.links);
  if (config.enabled === false) {
    if (config.approved !== false || config.amazonPartnerTag !== null || entries.length) fail('inactive configuration must be empty');
    return Object.freeze({enabled:false,links:new Map()});
  }
  // Amazon France reviews a new application only after the initial eligible
  // sales. An enrolled applicant must be able to publish genuine Special Links
  // without falsely claiming the *final* account approval.
  const pendingEnrollment=config.approved===false&&
    config.enrollmentStatus==='registered_pending_review'&&
    config.ownerConfirmedEnrollment===true&&
    config.specialLinksCreatedInAccount===true;
  // The operating policies explicitly allow an enrolled partner to CREATE
  // their own tagged Special Links. The owner confirmed both their tracking
  // ID and the listed storefront, but Amazon's final review remains unknown.
  const selfCreatedOnSite=config.approved===false&&
    config.enrollmentStatus==='enrolled_approval_unverified'&&
    config.ownerConfirmedEnrollment===true&&
    config.ownerConfirmedTrackingId===true&&
    config.ownerConfirmedSiteListed===true&&
    config.specialLinksCreatedOnSite===true&&
    config.specialLinksCreatedInAccount!==true;
  if(config.approved!==true&&!pendingEnrollment&&!selfCreatedOnSite)
    fail('no confirmed enrollment/owned tag and attributable Special Links');
  if(config.approved===true&&config.enrollmentStatus&&config.enrollmentStatus!=='approved')fail('final account approval contradicts enrollment status');
  const tag=config.amazonPartnerTag;
  if (typeof tag !== 'string' || !/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(tag)) fail('invalid Amazon.fr tag');
  const ids=new Set(productIds);
  if (entries.length===0) fail('no approved product links');
  const links=new Map();
  for (const [id,item] of entries) {
    if (!ids.has(id)) fail('unknown product '+id);
    if (!item || typeof item!=='object' || Array.isArray(item)) fail('invalid link for '+id);
    if (item.provider!=='amazon.fr' || item.productMatchConfirmed!==true || item.linkApproved!==true) fail('link not verified for '+id);
    if (typeof item.verifiedAt!=='string' || !/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.verifiedAt) || !Number.isFinite(Date.parse(item.verifiedAt))) fail('missing verification date for '+id);
    if (typeof item.asin!=='string' || !/^[A-Z0-9]{10}$/.test(item.asin)) fail('invalid ASIN for '+id);
    let url;
    try { url=new URL(item.url); } catch { fail('invalid URL for '+id); }
    if (url.protocol!=='https:' || !['www.amazon.fr','amazon.fr'].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port || url.hash) fail('non-approved Amazon.fr destination for '+id);
    if (!['/dp/'+item.asin,'/gp/product/'+item.asin].includes(url.pathname)) fail('ASIN/path mismatch for '+id);
    if (url.searchParams.getAll('tag').length!==1 || url.searchParams.get('tag')!==tag) fail('wrong Partner tag for '+id);
    if ([...url.searchParams.keys()].some(k=>!['tag','th','psc'].includes(k))) fail('unexpected query field for '+id);
    links.set(id,Object.freeze({url:url.href,provider:'Amazon.fr',verifiedAt:item.verifiedAt}));
  }
  return Object.freeze({enabled:true,approved:config.approved===true,
    enrollmentStatus:selfCreatedOnSite?'enrolled_approval_unverified':pendingEnrollment?'registered_pending_review':'approved',
    links});
}
