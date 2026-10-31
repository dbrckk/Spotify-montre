import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * An explicit, independently sourced list of exact product-page matches.
 * This is separate from the 15-watch comparator and its owner-declared photo
 * permissions. No scraped image, stock, price or rating is ever republished.
 *
 * One mismatch makes the whole static build fail, rather than silently
 * advertising a different variant under a trusted model description.
 */
export function loadVerifiedPopularLinks({root,picks,affiliates,amazonPartnerTag}){
  const src=JSON.parse(readFileSync(join(root,'../research/amazon-fr-popular-verified.json'),'utf8'));
  if(src.version!==1||src.marketplace!=='amazon.fr'
    ||src.standard!=='amazon_fr_exact_model_listing_title_and_ASIN'
    ||!src.verifiedProducts||typeof src.verifiedProducts!=='object'
    ||Array.isArray(src.verifiedProducts))throw Error('Invalid exact popular Amazon.fr research registry');
  const known=new Map(picks.map(p=>[p.id,p]));
  const results=new Map();
  const asins=new Set();
  const records=Object.entries(src.verifiedProducts);
  if(records.length>picks.length)throw Error('Verified Amazon.fr links exceed researched watches');
  for(const [id,item] of records){
    const p=known.get(id);
    if(!p||!item||typeof item!=='object'||Array.isArray(item))
      throw Error('Unknown or malformed exact Amazon.fr model '+id);
    if(item.brand!==p.brand||item.canonicalModel!==p.model)
      throw Error('Exact Amazon.fr brand or manufacturer code mismatch: '+id);
    // Strict, model-specific regional suffixes. Do not infer other variants.
    const regionalEquivalents={
      'casio-gw-m5610u-1':'GW-M5610U-1ER',
      'casio-f91w-1':'F-91W-1YER',
      'casio-a168wg-9':'A168WG-9EF'
    };
    if(item.marketplaceModel!==p.model&&item.marketplaceModel!==regionalEquivalents[id])
      throw Error('Unverified regional edition or variant: '+id);
    if(!/^[A-Z0-9]{10}$/.test(item.asin||'')||asins.has(item.asin))
      throw Error('Invalid or reused exact Amazon.fr ASIN: '+id);
    asins.add(item.asin);
    if(!/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.verifiedAt||'')
      ||!Number.isFinite(Date.parse(item.verifiedAt)))
      throw Error('Missing valid source verification date: '+id);
    if(item.evidenceType!=='amazon_fr_product_page'
      ||typeof item.evidenceListingTitle!=='string'
      ||!item.evidenceListingTitle.toLowerCase().includes(item.marketplaceModel.toLowerCase())
      ||!item.evidenceListingTitle.toLowerCase().includes(p.brand.split(' ')[0].toLowerCase()))
      throw Error('Exact Amazon.fr product title and model not substantiated: '+id);
    if(typeof item.evidenceNote!=='string'||item.evidenceNote.length<80)
      throw Error('Evidence limitations must be documented: '+id);
    let evidence;
    try{evidence=new URL(item.evidenceUrl)}catch{throw Error('Invalid Amazon.fr source URL: '+id)}
    if(evidence.protocol!=='https:'||evidence.hostname!=='www.amazon.fr'
      ||evidence.username||evidence.password||evidence.port||evidence.hash||evidence.search
      ||!evidence.pathname.endsWith('/dp/'+item.asin))
      throw Error('Amazon.fr evidence URL must contain same exact ASIN: '+id);
    if(affiliates.enabled){
      if(!/^[a-z0-9][a-z0-9-]{1,48}-21$/i.test(amazonPartnerTag||''))
        throw Error('Missing owner-confirmed Amazon.fr attribution tag: '+id);
      results.set(id,Object.freeze({
        asin:item.asin,model:item.marketplaceModel,
        url:'https://www.amazon.fr/dp/'+item.asin+'?tag='+encodeURIComponent(amazonPartnerTag),
        verifiedAt:item.verifiedAt,
        source:item.evidenceUrl
      }));
    }
  }
  return results;
}
