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
  const value=typeof x==='string'&&/^\d+(?:\.0+)?$/.test(x)?
    Number(x):x;
  return Number.isSafeInteger(value)&&value>=1&&value<=50000?value:null;
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
  accessToken,vid,pid,postalCode='75002',fetcher=fetch
}={}){
  if(typeof accessToken!=='string'||accessToken.length<20||/\s/.test(accessToken))
    throw Error('CJ token unavailable');
  if(!validId(vid)||!validId(pid)||!/^[0-9]{5}$/.test(postalCode)||
    /^(97|98)/.test(postalCode))
    throw Error('CJ exact variant or French sample postcode invalid');
  if(typeof fetcher!=='function')throw Error('CJ fetch unavailable');
  // Product Details GET is authoritative for the exact variant's shipping
  // properties and weight. NEVER substitute a generic assumed watch weight.
  const product=await read('/product/query?pid='+encodeURIComponent(pid),
    accessToken,fetcher);
  if(product?.pid!==pid||!Array.isArray(product?.variants))
    throw Error('CJ product identity or variants unavailable');
  const variant=product.variants.find(item=>item?.vid===vid&&item?.pid===pid);
  if(!variant)throw Error('CJ exact variant not found in supplier product');
  const sku=variant.variantSku;
  const weight=validWeight(variant.variantWeight);
  const properties=product.productProEnSet;
  let itemCostUsdCents=null;
  try{itemCostUsdCents=usdToCents(variant.variantSellPrice)}catch{}
  const metadata={
    weightGrams:weight,
    supplierProperties:Array.isArray(properties)&&properties.length<=10&&
      properties.every(p=>typeof p==='string'&&VALID_PROPERTIES.has(p))?
      properties:null,
    skuConfirmed:validId(sku),
    priceConfirmed:Number.isSafeInteger(itemCostUsdCents)&&itemCostUsdCents>0
  };
  const base={kind:'cj_detailed_shipping_audit_read_only',pid,vid,postalCode,
    metadata,stockConfirmed:false,detailedOptionsReturned:0,
    completeSupplierQuotes:[],unpricedRoutes:[],
    possibleImportGaps:0,approvedForSale:false,
    noCustomerOrder:true,requiresMerchantAndTaxVerification:true};
  if(!metadata.supplierProperties?.length||!metadata.skuConfirmed||
    !weight||!metadata.priceConfirmed)
    return {...base,status:'missing_supplier_metadata'};
  const inventory=await read('/product/stock/queryByVid?vid='+
    encodeURIComponent(vid),accessToken,fetcher);
  if(!Array.isArray(inventory))throw Error('CJ inventory format unavailable');
  const inStock=inventory.some(x=>x?.vid===vid&&x?.countryCode==='CN'&&
    Number.isInteger(x.cjInventoryNum)&&x.cjInventoryNum>=1);
  if(!inStock)return {...base,status:'stock_unavailable'};
  // Exact CJ-supplied SKU/weight/attributes/price only; merchant delivery
  // mode is not a consumer order. No customer fields or fake IOSS number.
  const skuTrial={sku,skuQuantity:1,vid,skuWeight:weight};
  const row={srcAreaCode:'CN',destAreaCode:'FR',zip:postalCode,
    weight,productProp:metadata.supplierProperties,skuList:[sku],
    freightTrialSkuList:[skuTrial],totalGoodsAmount:itemCostUsdCents/100};
  const productType=String(product.productType??'');
  if(productType==='5')row.trialCalculationType='1';
  const detailed=await read('/logistic/freightCalculateTip',accessToken,fetcher,{
    method:'POST',body:{reqDTOS:[row]}
  });
  if(!Array.isArray(detailed))throw Error('CJ detailed freight format unsupported');
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
