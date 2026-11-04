import {discoverCjVariant} from './cj.mjs';
import {usdToCents} from './landed-cost.mjs';

const CJ_ROOT='https://developers.cjdropshipping.com/api2.0/v1';
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(value);
const safeLabel=(value,max=130)=>typeof value==='string'&&
  value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value)?value:null;

// A single shared pacer covers list, variant, stock and freight calls.
// CJ accounts can be limited to one call per second. Fake CI responses
// bypass sleeps without ever accessing a real provider.
export function paceCjReads(fetcher=fetch){
  if(typeof fetcher!=='function')throw Error('Invalid read-only CJ fetcher');
  if(fetcher!==fetch)return fetcher;
  let last=0;
  return async(url,options)=>{
    const remaining=1200-(Date.now()-last);
    if(last&&remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
    last=Date.now();
    return fetcher(url,options);
  };
}
async function readCjJson(path,token,fetcher){
  if(typeof token!=='string'||token.length<20||/\s/.test(token))
    throw Error('CJ-Access-Token unavailable');
  const response=await fetcher(CJ_ROOT+path,{
    method:'GET',redirect:'error',
    headers:{'CJ-Access-Token':token,'Accept':'application/json'},
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw Error('CJ read-only API returned HTTP error');
  const result=await response.json();
  if(result?.code!==200||result?.result!==true||result?.success===false)
    throw Error('CJ read-only API did not confirm success');
  return result.data;
}
function extractCatalogProducts(data){
  // Official listV2 response: data.content[].productList[].
  // Do not mistake incomplete or changed payloads for verified catalog data.
  if(!data||!Array.isArray(data.content))
    throw Error('CJ listV2 response format unsupported');
  const all=[];
  for(const group of data.content){
    if(!group||!Array.isArray(group.productList))
      throw Error('CJ listV2 product group missing');
    for(const row of group.productList){
      const pid=row?.id;
      if(!validId(pid))continue;
      const name=safeLabel(row.nameEn,180);
      if(!name)continue;
      all.push({pid,name,sku:safeLabel(row.sku,100),
        category:safeLabel(row.threeCategoryName,130),
        listedNum:Number.isSafeInteger(row.listedNum)&&row.listedNum>=0?
          row.listedNum:null});
    }
  }
  return all;
}
/**
 * Bounded, read-only, from-account CJ shortlist, designed for Android.
 * 1 listV2 + up to 2 variant/query + up to 4*(variant/stock/freight) = 15
 * provider requests in the worst case. A second VID is inspected only when
 * the cheaper one is not deliverable to the pilot French postcode.
 * Everything is explicitly a sample, NOT an approved ecommerce offer.
 */
export async function searchCjWatchCandidates({
  keyword='SKMEI',postalCode='75002',accessToken,fetcher=fetch,maxProducts=2
}={}){
  if(typeof keyword!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{2,49}$/.test(keyword))
    throw Error('CJ search keyword must be 3-50 plain characters');
  if(typeof postalCode!=='string'||!/^[0-9]{5}$/.test(postalCode)||
    /^(?:97|98)/.test(postalCode))
    throw Error('CJ sample postcode must be in metropolitan France');
  if(!Number.isInteger(maxProducts)||maxProducts<1||maxProducts>2)
    throw Error('CJ product search limit must be one or two');
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ-Access-Token unavailable');
  const supplierFetcher=paceCjReads(fetcher);
  const list=await readCjJson('/product/listV2?'+new URLSearchParams({
    page:'1',size:'12',keyWord:keyword,countryCode:'CN'
  }),accessToken,supplierFetcher);
  const seen=new Set();
  const words=keyword.trim().toLowerCase().split(/\s+/);
  // This is a narrow exploratory watch shortlist, NOT a test for
  // manufacturer authenticity, unit quality or sales volumes.
  const matches=extractCatalogProducts(list).filter(p=>{
    if(seen.has(p.pid))return false;
    seen.add(p.pid);
    const haystack=(p.name+' '+(p.sku||'')).toLowerCase();
    return words.every(word=>haystack.includes(word))&&
      /watch|wrist|montre|digital/i.test(p.name+' '+(p.category||''))&&
      !/strap|band\b|replacement|charger|battery|repair/i.test(p.name);
  });
  const findings=[];
  for(const product of matches.slice(0,maxProducts)){
    const raw=await readCjJson('/product/variant/query?'+new URLSearchParams({
      pid:product.pid
    }),accessToken,supplierFetcher);
    if(!Array.isArray(raw))throw Error('CJ variants response format unsupported');
    const variants=raw.flatMap(row=>{
      if(row?.pid!==product.pid||!validId(row?.vid))return [];
      let price;
      try{price=usdToCents(row.variantSellPrice)}catch{return []}
      if(price<=0||price>50000)return [];
      return [{vid:row.vid,variantSku:safeLabel(row.variantSku,100),
        variantName:safeLabel(row.variantNameEn,180),price}];
    }).sort((a,b)=>a.price-b.price||a.vid.localeCompare(b.vid));
    if(!variants.length){
      findings.push({...product,state:'no_usable_variant',
        listedVariants:0,variantsChecked:0,approvedForSale:false});
      continue;
    }
    // Cheapest does not mean deliverable. Check the next *distinct* affordable
    // VID only if the first has no CN stock or complete French freight. Never
    // inspect more than two VIDs for one product; conserve CJ points.
    const distinct=[];
    const seenVids=new Set();
    for(const candidate of variants){
      if(seenVids.has(candidate.vid))continue;
      seenVids.add(candidate.vid);
      distinct.push(candidate);
      if(distinct.length===2)break;
    }
    let choice=null,firstChecked=null,firstStocked=null;
    let variantsChecked=0;
    for(const candidate of distinct){
      const quote=await discoverCjVariant({vid:candidate.vid,
        postalCode,accessToken,fetcher:supplierFetcher});
      variantsChecked++;
      const observed={candidate,quote};
      if(!firstChecked)firstChecked=observed;
      if(quote.stockConfirmed&&!firstStocked)firstStocked=observed;
      if(quote.stockConfirmed&&quote.shippingMethods.length){
        choice=observed;
        break;
      }
    }
    // If neither VID is deliverable, retain the stocked candidate when one
    // exists, but label it NOT READY. Do not imply the entire product is
    // unavailable: only these two supplier variants were inspected.
    const {candidate:selection,quote:inspected}=choice||firstStocked||firstChecked;
    // queryByVid is authoritative for exact variant identity and current unit
    // cost: a stale variant-list label must not overwrite this evidence.
    findings.push({...product,state:choice?'sample_shipping_available':'not_ready',
      vid:selection.vid,
      variantSku:inspected.variantSku||selection.variantSku,
      variantName:inspected.variantName||selection.variantName,
      productUsdCents:inspected.productUsdCents,
      stockConfirmed:inspected.stockConfirmed,
      shippingMethods:inspected.shippingMethods,
      excludedIncompleteShippingOptions:inspected.excludedIncompleteShippingOptions,
      listedVariants:variants.length,
      variantsChecked,
      otherVariantsNotChecked:variants.length>variantsChecked,
      approvedForSale:false});
  }
  return {kind:'cj_watch_search_read_only',keyword,postalCode,
    supplierResultsInspected:matches.length,
    maxProducts,findings,quoteIsPostcodeSampleOnly:true,
    merchantApproval:false,
    supplierWalletVerified:false,
    productAuthenticityVerified:false,
    gpsrComplianceVerified:false,
    noCustomerOrders:true,
    note:'Supplier query only: at most two variants per product for one postcode. Other variants may exist. No merchant price, legal approval, sales rank, availability guarantee or checkout activation.'};
}
