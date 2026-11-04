import {usdToCents,computeCjFreightCents,computeCjLandedCents} from './landed-cost.mjs';

const ROOT='https://developers.cjdropshipping.com/api2.0/v1';
const VALID_PROPERTIES=new Set([
  'COMMON','ELECTRONIC','BATTERY','IS_ELECTRICITY','HAVE_LIQUID',
  'HAVE_STIVE','HAVE_CREAM','HAVE_MAGNETISM','EDGE','NO_ENTRY','CLONE',
  'OVERSIZE','THIN','FLAT','Glasses','Clothes','Plant',
  'High Power Pure Battery','Alcoholic','Liquid Contains (Above 100ml)',
  'Highly Magnetic','Kitchen Knife','Long Blade','Ointment Patch',
  'Pressure Can','Drone','Laser','Flint Contains','Combustible',
  'Defensive Apparatus','Shaped Appearance','Powder (Within 500g)',
  'Special Product F','Large Size','Health Products','POD2.0',
  'POD3.0','PROOERTY'
]);
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{3,100}$/.test(value);
const name=value=>typeof value==='string'&&value.length>=3&&value.length<=50&&
  !/[\x00-\x1f\x7f]/.test(value)?value:null;
const absent=x=>x===undefined||x===null||x==='';
const validWeight=x=>{
  const value=(typeof x==='number'||typeof x==='string'&&
    /^(?:0|[1-9]\d{0,4})(?:\.\d{1,3})?$/.test(x))?Number(x):NaN;
  return Number.isFinite(value)&&value>0&&value<=50000?
    {supplierGrams:value,shippingGrams:Math.ceil(value)}:null;
};
// CJ variantVolume is stated in mm³; freightCalculateTip takes cm³.
const validVolume=x=>{
  const value=typeof x==='number'||typeof x==='string'&&
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,3})?$/.test(x)?Number(x):NaN;
  return Number.isFinite(value)&&value>0&&value<=1e12?value/1000:null;
};
async function read(path,token,fetcher,{method='GET',body}={}){
  const response=await fetcher(ROOT+path,{
    method,redirect:'error',
    headers:{'CJ-Access-Token':token,'Content-Type':'application/json',
      'Accept':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(12000)
  });
  if(!response?.ok)throw Error('CJ detailed read failed HTTP');
  const parsed=await response.json();
  if(parsed?.code!==200||parsed?.result!==true||parsed?.success===false)
    throw Error('CJ detailed read rejected');
  return parsed.data;
}
// No input URL, provider raw data or secrets are ever written to output.
export async function examineCjDetailedFreight({
  accessToken,vid,pid,expectedVariantSku,expectedProductSku,
  postalCode='75002',fetcher=fetch
}={}){
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ token unavailable');
  if(!validId(vid)||(pid!==undefined&&!validId(pid))||
    (expectedVariantSku!==undefined&&!validId(expectedVariantSku))||
    (expectedProductSku!==undefined&&!validId(expectedProductSku))||
    !/^[0-9]{5}$/.test(postalCode)||/^(97|98)/.test(postalCode))
    throw Error('CJ exact variant or French sample postcode invalid');
  if(typeof fetcher!=='function')throw Error('CJ fetch unavailable');
  // Pace REAL network traffic across variant, product, stock and freight. The
  // test fetcher is deliberately unpaced.
  let lastCall=0;
  const supplierFetch=fetcher===fetch?async(url,options)=>{
    const delay=1250-(Date.now()-lastCall);
    if(lastCall&&delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
    lastCall=Date.now();
    return fetcher(url,options);
  }:fetcher;

  // A search-result PID is not the identity authority for this exact VID.
  // Resolve the supplier's canonical parent from queryByVid FIRST.
  let variant;
  try{
    variant=await read('/product/variant/queryByVid?vid='+
      encodeURIComponent(vid),accessToken,supplierFetch);
  }catch{throw Error('CJ_DETAIL_VARIANT_READ_FAILED')}
  if(variant?.vid!==vid||!validId(variant?.pid))
    throw Error('CJ_DETAIL_VARIANT_ID_MISMATCH');
  if(expectedVariantSku!==undefined&&variant.variantSku!==expectedVariantSku)
    throw Error('CJ_DETAIL_VARIANT_SKU_MISMATCH');
  const canonicalPid=variant.pid;

  let product;
  try{
    product=await read('/product/query?pid='+encodeURIComponent(canonicalPid),
      accessToken,supplierFetch);
  }catch{throw Error('CJ_DETAIL_PRODUCT_READ_FAILED')}
  if(product?.pid!==canonicalPid)
    throw Error('CJ_DETAIL_PRODUCT_ID_MISMATCH');
  if(expectedProductSku!==undefined&&product?.productSku!==expectedProductSku)
    throw Error('CJ_DETAIL_PRODUCT_SKU_MISMATCH');
  // A product may omit variants in its summary. If it DOES include this VID,
  // the entries must not contradict the dedicated exact-variant endpoint.
  const duplicate=Array.isArray(product.variants)?
    product.variants.filter(v=>v?.vid===vid):[];
  if(duplicate.some(v=>(v.pid!==undefined&&v.pid!==canonicalPid)||
    (v.variantSku!==undefined&&v.variantSku!==variant.variantSku)))
    throw Error('CJ_DETAIL_PRODUCT_VARIANT_CONTRADICTION');
  const sku=variant.variantSku;
  const weight=validWeight(variant.variantWeight);
  const volumeCm3=validVolume(variant.variantVolume);
  const properties=product.productProEnSet;
  let itemCostUsdCents=null;
  try{itemCostUsdCents=usdToCents(variant.variantSellPrice)}catch{}
  const metadata={
    supplierWeightGrams:weight?.supplierGrams??null,
    weightGrams:weight?.shippingGrams??null,
    volumeCm3,
    supplierProperties:Array.isArray(properties)&&properties.length<=10&&
      properties.every(p=>typeof p==='string'&&VALID_PROPERTIES.has(p))?
      properties:null,
    skuConfirmed:validId(sku),
    priceConfirmed:Number.isSafeInteger(itemCostUsdCents)&&itemCostUsdCents>0
  };
  const base={kind:'cj_detailed_shipping_audit_read_only',
    pid:canonicalPid,catalogPid:pid??null,catalogPidMatched:pid===undefined?
      null:pid===canonicalPid,vid,postalCode,
    metadata,stockConfirmed:false,detailedOptionsReturned:0,
    completeSupplierQuotes:[],unpricedRoutes:[],
    possibleImportGaps:0,approvedForSale:false,
    noCustomerOrder:true,requiresMerchantAndTaxVerification:true};
  if(!metadata.supplierProperties?.length||!metadata.skuConfirmed||
    !weight||!metadata.priceConfirmed)
    return {...base,status:'missing_supplier_metadata'};
  let inventory;
  try{
    inventory=await read('/product/stock/queryByVid?vid='+
      encodeURIComponent(vid),accessToken,fetcher);
  }catch{throw Error('CJ_DETAIL_STOCK_READ_FAILED')}
  if(!Array.isArray(inventory))throw Error('CJ_DETAIL_STOCK_FORMAT_INVALID');
  const inStock=inventory.some(x=>x?.vid===vid&&x?.countryCode==='CN'&&
    Number.isInteger(x.cjInventoryNum)&&x.cjInventoryNum>=1);
  if(!inStock)return {...base,status:'stock_unavailable'};
  // Exact CJ-supplied SKU/weight/attributes/price only; merchant delivery
  // mode is not a consumer order. No customer fields or fake IOSS number.
  const skuTrial={sku,skuQuantity:1,vid,skuWeight:weight.shippingGrams,
    ...(volumeCm3!==null?{skuVolume:volumeCm3}:{})};
  const row={srcAreaCode:'CN',destAreaCode:'FR',zip:postalCode,
    weight:weight.shippingGrams,productProp:metadata.supplierProperties,
    ...(volumeCm3!==null?{volume:volumeCm3}:{}),
    skuList:[sku],
    freightTrialSkuList:[skuTrial],totalGoodsAmount:itemCostUsdCents/100};
  const productType=String(product.productType??'');
  if(productType==='5')row.trialCalculationType='1';
  let detailed;
  try{
    detailed=await read('/logistic/freightCalculateTip',accessToken,fetcher,{
      method:'POST',body:{reqDTOS:[row]}
    });
  }catch{throw Error('CJ_DETAIL_FREIGHT_READ_FAILED')}
  if(!Array.isArray(detailed))throw Error('CJ_DETAIL_FREIGHT_FORMAT_INVALID');
  const complete=[],unpriced=[];
  let possibleImportGaps=0;
  const seen=new Map();
  for(const item of detailed){
    const carrier=name(item?.option?.enName);
    if(!carrier)continue;
    const missing=['taxesFee','clearanceOperationFee','tariff']
      .filter(key=>absent(item?.[key]));
    if(missing.length)possibleImportGaps++;
    if(missing.length){
      if(unpriced.length<8)unpriced.push({carrier,
        missingImportFields:missing});
      continue;
    }
    try{
      const breakdown=computeCjFreightCents({
        logisticName:carrier,taxesFee:item.taxesFee,
        clearanceOperationFee:item.clearanceOperationFee,
        tariff:item.tariff,totalPostageFee:item.totalPostageFee,
        logisticPrice:item.wrapPostage??item.discountFee
      });
      const landedUsdCents=computeCjLandedCents(itemCostUsdCents,breakdown);
      const quote={carrier,landedUsdCents,
        shippingAndImportUsdCents:breakdown.freightAndImportUsdCents,
        taxesUsdCents:breakdown.taxesUsdCents,
        tariffUsdCents:breakdown.tariffUsdCents,
        clearanceUsdCents:breakdown.clearanceUsdCents,
        pricingMode:breakdown.mode};
      if(seen.has(carrier)){
        if(seen.get(carrier)?.landedUsdCents!==landedUsdCents)
          seen.set(carrier,null); // ambiguous carrier quote: fail closed
      }else seen.set(carrier,quote);
    }catch{
      if(unpriced.length<8)unpriced.push({carrier,
        missingImportFields:[],reason:'invalid_or_inconsistent_amount'});
    }
  }
  for(const entry of seen.values())if(entry)complete.push(entry);
  complete.sort((a,b)=>a.landedUsdCents-b.landedUsdCents);
  return {...base,status:complete.length?'detailed_quotes_observed':
    'no_complete_detailed_quote',
    stockConfirmed:true,detailedOptionsReturned:detailed.length,
    completeSupplierQuotes:complete.slice(0,12),unpricedRoutes:unpriced,
    possibleImportGaps};
}
