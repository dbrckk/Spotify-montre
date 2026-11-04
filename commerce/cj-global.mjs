import {paceCjReads,searchCjWatchCandidates} from './cj-search.mjs';

// Interleave broad searches and segments rather than spending the entire budget
// on one brand or the first CJ results page. No claim of exhaustive coverage.
export const CJ_GLOBAL_SEARCH_PLAN=Object.freeze([
  {keyword:'watch',page:1},
  {keyword:'digital watch',page:1},
  {keyword:'quartz watch',page:1},
  {keyword:'sport watch',page:1},
  {keyword:'women watch',page:1},
  {keyword:'SKMEI',page:1},
  {keyword:'automatic watch',page:1},
  {keyword:'watch',page:2},
  {keyword:'men watch',page:1},
  {keyword:'wrist watch',page:1},
  {keyword:'digital watch',page:2},
  {keyword:'quartz watch',page:2},
  {keyword:'watch',page:3},
  {keyword:'watch',page:4}
]);

// Official CJ 2026 API point rules: listV2=50, every other lookup=10.
// Two products and at most three different VIDs per page:
// 50 + 2*(10 + 3*(10+10+10)) = 250 points reserved per page.
// Actual usage is lower when the variant has no stock or an early match succeeds.
const POINTS_BY_PATH=new Map([
  ['/product/listV2',50],
  ['/product/variant/query',10],
  ['/product/variant/queryByVid',10],
  ['/product/stock/queryByVid',10],
  ['/logistic/freightCalculate',10]
]);
export const CJ_MAX_POINTS_PER_PAGE=250;
const ROOT='https://developers.cjdropshipping.com/api2.0/v1';

// Convert supplier failures into fixed labels for public Actions logs.
// Never expose a CJ response body, request URL, token, or raw error text.
export function classifyCjDiscoveryFailure(error){
  const message=typeof error?.message==='string'?error.message:'';
  const http=/^CJ supplier HTTP (\d{3})$/.exec(message);
  if(http){
    const status=Number(http[1]);
    if(status===401||status===403)return 'supplier_auth';
    if(status===429)return 'supplier_rate_limit';
    if(status>=500)return 'supplier_server';
    return 'supplier_http';
  }
  if(/^(CJ read-only API returned HTTP error|CJ API returned HTTP error)/.test(message))
    return 'supplier_http';
  if(/^(CJ read-only API did not confirm success|CJ API did not confirm success)/.test(message))
    return 'supplier_rejected';
  if(/^(CJ listV2 response format unsupported|CJ listV2 product group missing|CJ variants response format unsupported|CJ inventory payload invalid|CJ variant identity does not match requested VID|CJ variant price is not available)/.test(message))
    return 'supplier_schema';
  if(error?.name==='TimeoutError'||error?.name==='AbortError')
    return 'supplier_timeout';
  if(error?.name==='TypeError'&&/fetch failed/.test(message))
    return 'supplier_network';
  return null;
}

/**
 * A budgeted and read-only cross-category catalog search.
 * CJ credentials remain strictly on the GitHub Actions runner.
 * No result can approve a listing, publish a price, charge a wallet or place an order.
 */
export async function scanCjWatchCatalog({
  accessToken,postalCode='75002',fetcher=fetch,
  searcher=searchCjWatchCandidates,plan=CJ_GLOBAL_SEARCH_PLAN,
  maxPoints=2500,targetShippable=4,onProgress=()=>{}
}={}){
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ-Access-Token unavailable');
  if(typeof postalCode!=='string'||!/^\d{5}$/.test(postalCode)||
    /^(97|98)/.test(postalCode))
    throw Error('CJ sample postcode must be in metropolitan France');
  if(!Number.isSafeInteger(maxPoints)||maxPoints<250||maxPoints>2500)
    throw Error('CJ global search points budget out of range');
  if(!Number.isInteger(targetShippable)||targetShippable<1||targetShippable>5)
    throw Error('CJ shippable candidate target out of range');
  if(!Array.isArray(plan)||plan.length<1||plan.length>20||plan.some(x=>
    typeof x?.keyword!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{2,49}$/.test(x.keyword)||
    !Number.isInteger(x.page)||x.page<1||x.page>1000))
    throw Error('CJ global search plan invalid');
  if(typeof fetcher!=='function'||typeof searcher!=='function'||
    typeof onProgress!=='function')
    throw Error('CJ search interface unavailable');
  const paced=paceCjReads(fetcher);
  let pointsAttempted=0,apiCallsAttempted=0,lastEndpoint=null;
  const guardedRead=async(url,options)=>{
    const parsed=new URL(url);
    if(parsed.origin!=='https://developers.cjdropshipping.com'||
      !parsed.pathname.startsWith('/api2.0/v1/'))
      throw Error('CJ discovery refused non-CJ host');
    const endpoint=parsed.pathname.slice('/api2.0/v1'.length);
    const cost=POINTS_BY_PATH.get(endpoint);
    if(cost===undefined)throw Error('CJ discovery refused non-read-only API');
    const expectedMethod=endpoint==='/logistic/freightCalculate'?'POST':'GET';
    if(options?.method!==expectedMethod||
      options?.redirect!=='error'||
      options?.headers?.['CJ-Access-Token']!==accessToken)
      throw Error('CJ discovery refused unexpected request method or credentials');
    if(pointsAttempted+cost>maxPoints)
      throw Error('CJ global search points budget exceeded');
    pointsAttempted+=cost;
    apiCallsAttempted++;
    lastEndpoint=endpoint;
    const response=await paced(url,options);
    if(!response?.ok&&Number.isInteger(response?.status)&&
      response.status>=400&&response.status<=599)
      throw Error('CJ supplier HTTP '+response.status);
    return response;
  };

  const seenProducts=new Set();
  const findings=[];
  const searches=[];
  const failedSearches=[];
  let exhaustedByBudget=false,stoppedBySupplier=false;
  for(const step of plan){
    // Reserve the entire worst-case cost of a page before starting. A page
    // can NEVER exhaust the remaining budget halfway through a VID check.
    if(pointsAttempted+CJ_MAX_POINTS_PER_PAGE>maxPoints){
      exhaustedByBudget=true;break;
    }
    let result;
    try{
      lastEndpoint=null;
      result=await searcher({
        keyword:step.keyword,page:step.page,pageSize:60,
        maxProducts:2,maxVariants:3,excludePids:seenProducts,
        postalCode,accessToken,fetcher:guardedRead
      });
    }catch(error){
      const reason=classifyCjDiscoveryFailure(error);
      // Programming errors and blocked write endpoints must stay fatal.
      if(!reason)throw error;
      failedSearches.push({keyword:step.keyword,page:step.page,
        endpoint:lastEndpoint,reason});
      onProgress({event:'supplier_failure',keyword:step.keyword,page:step.page,
        reason,endpoint:lastEndpoint,pointsAttempted});
      // Authentication/rate-limit problems should not consume more CJ points.
      if(reason==='supplier_auth'||reason==='supplier_rate_limit'||
        failedSearches.length>=3){
        stoppedBySupplier=true;break;
      }
      continue;
    }
    if(!Array.isArray(result?.findings)||
      result.findings.length>2||
      result.findings.some(x=>typeof x?.pid!=='string'))
      throw Error('CJ discovery returned invalid search results');
    searches.push({keyword:step.keyword,page:step.page,
      inspectedProducts:result.findings.length});
    for(const product of result.findings){
      if(seenProducts.has(product.pid))continue;
      seenProducts.add(product.pid);
      findings.push({...product,searchKeyword:step.keyword,searchPage:step.page});
    }
    onProgress({event:'search_complete',keyword:step.keyword,page:step.page,
      inspectedProducts:result.findings.length,pointsAttempted,
      shippableCount:findings.filter(x=>x.state==='sample_shipping_available'&&
        x.stockConfirmed&&Array.isArray(x.shippingMethods)&&x.shippingMethods.length).length});
    // Cover several segments before stopping, even if the very first search
    // happens to return shippable watches.
    if(searches.length>=5&&findings.filter(x=>
      x.state==='sample_shipping_available'&&x.stockConfirmed&&
      Array.isArray(x.shippingMethods)&&x.shippingMethods.length).length>=targetShippable)
      break;
  }
  const shippable=findings.filter(x=>x.state==='sample_shipping_available'&&
    x.stockConfirmed&&Array.isArray(x.shippingMethods)&&x.shippingMethods.length)
    .sort((a,b)=>a.shippingMethods[0].landedUsdCents-
      b.shippingMethods[0].landedUsdCents);
  return {
    kind:'cj_global_watch_search_read_only',
    status:failedSearches.length?'partial_supplier_errors':
      shippable.length?'shipping_samples_found':'no_confirmed_shipping_sample',
    postalCode,
    searches,failedSearches,searchesAttempted:searches.length+failedSearches.length,
    searchesCompleted:searches.length,
    searchesPlanned:plan.length,
    distinctProductsChecked:findings.length,
    shippableSamples:shippable,
    otherSamples:findings.filter(x=>!shippable.includes(x)).slice(0,5),
    pointsAttempted,apiCallsAttempted,maxPoints,
    exhaustedByBudget,stoppedBySupplier,
    exhaustive:false,
    quoteIsPostcodeSampleOnly:true,
    merchantApproval:false,supplierWalletVerified:false,
    productAuthenticityVerified:false,gpsrComplianceVerified:false,
    noCustomerOrders:true,
    note:'Broad, bounded CJ sample; incomplete coverage is NOT proof that watches are unavailable. Listing counts are not sales. No order, customer payment, supplier debit or product publication.'
  };
}
