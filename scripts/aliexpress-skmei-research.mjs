import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const selected=new Map([['skmei-2056','2056'],['skmei-2256','2256'],['skmei-2514','2514']]);
const itemRe=/^1[0-9]{12,15}$/;
const dateRe=/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const dateValid=(date)=>dateRe.test(date||'')&&Number.isFinite(Date.parse(date))&&Date.parse(date)<=Date.now();
const canonical=itemId=>'https://www.aliexpress.com/item/'+itemId+'.html';

/**
 * Records where a candidate was found, not that the item is purchasable.
 * An independent merchant/France/variant review must be added manually and
 * audited before a candidate can be connected to an approved Awin offer.
 * This module never fetches websites, builds a paid link, or publishes prices.
 */
export function loadAliExpressSkmeiResearch({root,picks}){
  const data=JSON.parse(readFileSync(join(root,'../research/aliexpress-skmei-candidates.json'),'utf8'));
  if(data.version!==1||data.marketplace!=='aliexpress.com'
    ||data.policy!=='research_only_until_variant_fr_shipping_and_awin_approval_verified'
    ||!dateValid(data.reviewedOn)
    ||!data.products||typeof data.products!=='object'||Array.isArray(data.products)
    ||Object.keys(data.products).length!==3
    ||[...selected.keys()].some(id=>!Object.hasOwn(data.products,id)))
    throw Error('Invalid AliExpress SKMEI research registry');
  const known=new Map(picks.map(p=>[p.id,p]));
  const used=new Set();
  const products=new Map();
  for(const [id,model] of selected){
    const entry=data.products[id],source=known.get(id);
    if(!entry||typeof entry!=='object'||source?.brand!=='SKMEI'
      ||source.model!==model||entry.brand!=='SKMEI'||entry.model!==model
      ||!Array.isArray(entry.candidates)||entry.candidates.length>15)
      throw Error('Research model identity mismatch: '+id);
    const candidates=new Map();
    for(const candidate of entry.candidates){
      if(!candidate||typeof candidate!=='object'||!itemRe.test(candidate.itemId||'')
        ||used.has(candidate.itemId)||!dateValid(candidate.sourceObservedOn)
        ||typeof candidate.listingTitle!=='string'||candidate.listingTitle.length<25
        ||candidate.listingTitle.length>250||!candidate.listingTitle.includes(model))
        throw Error('Untraceable AliExpress product research candidate: '+id);
      used.add(candidate.itemId);
      const evidence=new URL(candidate.sourceUrl);
      if(evidence.protocol!=='https:'||evidence.username||evidence.password||
        evidence.port||evidence.hash||evidence.search||
        !['fr.pricearchive.org','ms.pricearchive.org','pt.pricearchive.org'].includes(evidence.hostname)||
        evidence.pathname!=='/aliexpress.com/item/'+candidate.itemId)
        throw Error('AliExpress research citation must identify the specific indexed item: '+id);
      if(!['third_party_index_only','merchant_reviewed_exact_variant_fr'].includes(candidate.status))
        throw Error('Unknown AliExpress evidence status: '+id);
      const ready=candidate.status==='merchant_reviewed_exact_variant_fr';
      const review=candidate.review;
      if(!ready&&review!==null)throw Error('Unreviewed candidate cannot assert verification: '+id);
      if(ready){
        if(!review||typeof review!=='object'||Array.isArray(review)
          ||!dateValid(review.checkedOn)
          ||Date.now()-Date.parse(review.checkedOn)>1000*60*60*24*30
          ||review.modelConfirmed!==model
          ||typeof review.variant!=='string'||review.variant.length<10||review.variant.length>180
          ||typeof review.sellerName!=='string'||review.sellerName.length<3
          ||review.franceShippingConfirmed!==true
          ||review.franceCheckoutConfirmed!==true
          ||review.awinEligibilityConfirmed!==true
          ||review.merchantProductUrl!==canonical(candidate.itemId)
          ||typeof review.evidenceNote!=='string'||review.evidenceNote.length<90)
          throw Error('Missing fresh primary merchant variant, France shipping and Awin eligibility review: '+id);
      }
      candidates.set(candidate.itemId,Object.freeze({
        itemId:candidate.itemId,
        productUrl:canonical(candidate.itemId),
        sourceUrl:candidate.sourceUrl,
        sourceObservedOn:candidate.sourceObservedOn,
        status:candidate.status,
        review:ready?Object.freeze({...review}):null
      }));
    }
    products.set(id,Object.freeze({id,model,candidates}));
  }
  return products;
}
