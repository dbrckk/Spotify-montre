import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const programIds=Object.freeze({'aliexpress-fr':26009,addiesdive:94513});
const allowedKeys=new Set(['awinmid','awinaffid','ued','clickref','campaign']);
const idPattern=/^[a-z0-9-]{4,64}$/;
const datePattern=/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const safeHttps=(input)=>{
  if(typeof input!=='string'||input.length>2048)throw Error('Unsafe partner URL length');
  let url;
  try{url=new URL(input)}catch{throw Error('Invalid partner URL')}
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)
    throw Error('Partner URLs must be absolute HTTPS with no credentials, port or fragment');
  return url;
};

/**
 * Affiliate programmes require both owner-confirmed account approval and an
 * actually issued, product-specific publisher URL. No link is generated from
 * guessed publisher IDs, and no commission or stock is claimed.
 *
 * Returns Map<catalogueId,{url,provider,program,variant,verifiedAt,advertiserId}>.
 */
export function loadApprovedPartnerOffers({root,picks}){
  const data=JSON.parse(readFileSync(join(root,'../research/partner-affiliate-offers.json'),'utf8'));
  const programs=data.programs||{};
  if(data.version!==1||typeof data.enabled!=='boolean'
    ||typeof data.publisherApproved!=='boolean'
    ||!programs||typeof programs!=='object'||Array.isArray(programs)
    ||Object.keys(programs).length!==2
    ||!data.offers||typeof data.offers!=='object'||Array.isArray(data.offers))
    throw Error('Invalid Awin programme registry');
  for(const [name,advertiserId] of Object.entries(programIds)){
    if(!programs[name]||programs[name].advertiserId!==advertiserId
      ||typeof programs[name].joined!=='boolean')
      throw Error('Awin advertiser identity or programme status mismatch: '+name);
  }
  const offers=Object.entries(data.offers);
  const known=new Map(picks.map(p=>[p.id,p]));
  if(known.size!==37||offers.length>37)throw Error('Invalid partner programme catalog coverage');
  if(!data.enabled){
    if(data.publisherId!==null||data.publisherApproved||offers.length
      ||Object.values(programs).some(p=>p.joined))
      throw Error('Disabled partner registry may not contain active publisher data or affiliate offers');
    return new Map();
  }
  if(!data.publisherApproved||!Number.isSafeInteger(data.publisherId)||data.publisherId<1)
    throw Error('Publisher account approval and positive integer publisher ID required');
  if(!offers.length)throw Error('Active Awin programme registry cannot contain zero offers');

  const published=new Map();
  for(const [id,offer] of offers){
    const watch=known.get(id);
    if(!idPattern.test(id)||!watch||!offer||typeof offer!=='object'||Array.isArray(offer))
      throw Error('Unknown or invalid Awin watch ID: '+id);
    const program=offer.program;
    const registered=programs[program];
    if(!Object.hasOwn(programIds,program)||!registered?.joined
      ||registered.advertiserId!==programIds[program])
      throw Error('Awin advertiser programme is not confirmed joined: '+id);
    if(program==='addiesdive'&&(watch.brand!=='ADDIESDIVE'||id!=='addiesdive-ad2030'))
      throw Error('ADDIESDIVE programme cannot promote another brand: '+id);
    if(program==='aliexpress-fr'&&watch.brand!=='SKMEI')
      throw Error('AliExpress FR candidate must be a documented SKMEI model: '+id);
    if(offer.issuedInPublisherAccount!==true||offer.modelAndVariantConfirmed!==true
      ||typeof offer.variant!=='string'||offer.variant.length<8||offer.variant.length>180
      ||!datePattern.test(offer.verifiedAt||'')
      ||!Number.isFinite(Date.parse(offer.verifiedAt))
      ||Date.parse(offer.verifiedAt)>Date.now())
      throw Error('Missing publisher-issued exact variant evidence or date: '+id);

    const destination=safeHttps(offer.destinationUrl);
    if(destination.search||destination.hash)
      throw Error('Awin deep-link destination must be clean of campaign tracking: '+id);
    if(program==='addiesdive'&&destination.href!==watch.officialUrl)
      throw Error('ADDIESDIVE destination must equal catalogued exact model URL: '+id);
    if(program==='aliexpress-fr'&&!(destination.hostname==='www.aliexpress.com'
      &&/^\/item\/\d{11,16}\.html$/.test(destination.pathname)))
      throw Error('AliExpress FR destination must be a specific item URL, not a search/category: '+id);

    const link=safeHttps(offer.trackingUrl);
    if(link.hostname!=='www.awin1.com'||link.pathname!=='/cread.php'
      ||!link.search)throw Error('Awin tracking URL must be an official LinkBuilder deep link: '+id);
    const fields=[...link.searchParams.keys()];
    if(fields.length!==new Set(fields).size||fields.some(x=>!allowedKeys.has(x)))
      throw Error('Duplicate or unsupported Awin tracking parameters: '+id);
    if(link.searchParams.get('awinmid')!==String(registered.advertiserId)
      ||link.searchParams.get('awinaffid')!==String(data.publisherId)
      ||link.searchParams.get('ued')!==destination.href)
      throw Error('Awin publisher, advertiser or destination mismatch: '+id);
    if(link.searchParams.get('clickref')&&!/^[a-zA-Z0-9_-]{1,48}$/.test(link.searchParams.get('clickref')))
      throw Error('Unsafe Awin campaign click reference: '+id);
    if(link.searchParams.get('campaign')&&!/^[a-zA-Z0-9_-]{1,48}$/.test(link.searchParams.get('campaign')))
      throw Error('Unsafe Awin campaign name: '+id);
    published.set(id,Object.freeze({url:link.href,provider:'awin',program,
      verifiedAt:offer.verifiedAt,variant:offer.variant,
      advertiserId:registered.advertiserId}));
  }
  return published;
}
