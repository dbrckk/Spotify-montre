import assert from 'node:assert/strict';
import {examineCjDetailedFreight} from './cj-detailed-freight.mjs';

const accessToken='t'.repeat(40);
const vid='74F64E7D-7D90-425D-AFB3-487D28B1D09F';
const canonicalPid='canonical-product-1234';
const oldCatalogPid='outdated-catalog-5678';
const sku='CJZBNSET00031-black';
const productSku='CJZBNSET00031';
const reply=data=>({ok:true,json:async()=>({code:200,result:true,data})});
const variant={pid:canonicalPid,vid,variantSku:sku,
  variantWeight:85.5,variantVolume:60000,variantSellPrice:'0.50'};
const product={pid:canonicalPid,productSku,productType:0,
  productProEnSet:['COMMON','BATTERY'],variants:[]};

const calls=[];
const fake=async(url,options)=>{
  const path=new URL(url).pathname;
  calls.push({path,options});
  assert.equal(options.headers['CJ-Access-Token'],accessToken);
  assert.equal(options.redirect,'error');
  if(path.endsWith('/product/variant/queryByVid')){
    assert.equal(new URL(url).searchParams.get('vid'),vid);
    return reply(variant);
  }
  if(path.endsWith('/product/query')){
    assert.equal(new URL(url).searchParams.get('pid'),canonicalPid);
    return reply(product);
  }
  if(path.endsWith('/product/stock/queryByVid')){
    assert.equal(new URL(url).searchParams.get('vid'),vid);
    return reply([{countryCode:'CN',vid,cjInventoryNum:4}]);
  }
  if(path.endsWith('/logistic/freightCalculateTip')){
    assert.equal(options.method,'POST');
    const body=JSON.parse(options.body);
    assert.equal(body.reqDTOS.length,1);
    const row=body.reqDTOS[0];
    assert.equal(row.srcAreaCode,'CN');
    assert.equal(row.destAreaCode,'FR');
    assert.equal(row.zip,'75002');
    assert.equal(row.weight,86,'ceil of supplier-declared 85.5g');
    assert.equal(row.volume,60,'supplier mm3 -> CJ tip cm3');
    assert.equal(row.totalGoodsAmount,0.5);
    assert.deepEqual(row.productProp,['COMMON','BATTERY']);
    assert.deepEqual(row.skuList,[sku]);
    assert.deepEqual(row.freightTrialSkuList,
      [{sku,skuQuantity:1,vid,skuWeight:86,skuVolume:60}]);
    assert.ok(!('shippingCustomerName' in row));
    return reply([
      {option:{enName:'CJPacket Postal'},totalPostageFee:'4.50',
        taxesFee:'0.50',clearanceOperationFee:'0.00',tariff:'0.00'},
      {option:{enName:'Missing duties'},totalPostageFee:'3.50',
        taxesFee:'0.50',clearanceOperationFee:'0.00'},
      {option:{enName:'Duplicated'},totalPostageFee:'4.00',
        taxesFee:'0.50',clearanceOperationFee:'0.00',tariff:'0.00'},
      {option:{enName:'Duplicated'},totalPostageFee:'5.00',
        taxesFee:'0.50',clearanceOperationFee:'0.00',tariff:'0.00'}
    ]);
  }
  throw Error('Unexpected supplier endpoint');
};

const result=await examineCjDetailedFreight({
  accessToken,vid,pid:oldCatalogPid,expectedVariantSku:sku,
  expectedProductSku:productSku,fetcher:fake
});
assert.equal(result.status,'detailed_quotes_observed');
assert.equal(result.pid,canonicalPid);
assert.equal(result.catalogPid,oldCatalogPid);
assert.equal(result.catalogPidMatched,false,'outdated PID is diagnostic only');
assert.equal(result.metadata.weightGrams,86);
assert.equal(result.metadata.supplierWeightGrams,85.5);
assert.equal(result.metadata.volumeCm3,60);
assert.equal(result.metadata.skuConfirmed,true);
assert.equal(result.detailedOptionsReturned,4);
assert.equal(result.possibleImportGaps,1);
assert.deepEqual(result.completeSupplierQuotes.map(x=>x.carrier),['CJPacket Postal']);
assert.equal(result.completeSupplierQuotes[0].landedUsdCents,500);
assert.equal(result.approvedForSale,false);
assert.equal(result.noCustomerOrder,true);
assert.equal(calls.length,4,'query VID, canonical product, stock and freight');
assert.deepEqual(calls.slice(0,2).map(x=>x.path.slice(-25)),
  ['/product/variant/queryByVid','/api2.0/v1/product/query'.slice(-25)]);
assert.ok(calls.every(x=>!/shopping|createOrder|listed|wallet/.test(x.path)));
assert.ok(!JSON.stringify(result).includes(accessToken));

// Reject a changed or unrelated exact variant before any second CJ read.
let changedSkuCalls=0;
await assert.rejects(examineCjDetailedFreight({
  accessToken,vid,expectedVariantSku:sku,fetcher:async()=>{
    changedSkuCalls++;
    return reply({...variant,variantSku:'different-SKU'});
  }
}),/CJ_DETAIL_VARIANT_SKU_MISMATCH/);
assert.equal(changedSkuCalls,1);

let wrongProductCalls=0;
await assert.rejects(examineCjDetailedFreight({
  accessToken,vid,expectedProductSku:productSku,
  fetcher:async(url)=>{
    wrongProductCalls++;
    if(url.includes('queryByVid'))return reply(variant);
    if(url.includes('/product/query'))return reply({...product,productSku:'another-product'});
    throw Error('Wrong product must never get shipping quote');
  }
}),/CJ_DETAIL_PRODUCT_SKU_MISMATCH/);
assert.equal(wrongProductCalls,2);

const missingWeightCalls=[];
const noWeight=await examineCjDetailedFreight({
  accessToken,vid,fetcher:async(url)=>{
    missingWeightCalls.push(url);
    if(url.includes('queryByVid'))return reply({...variant,variantWeight:null});
    if(url.includes('/product/query'))return reply(product);
    throw Error('Missing weight must never request stock/freight');
  }
});
assert.equal(noWeight.status,'missing_supplier_metadata');
assert.equal(noWeight.metadata.weightGrams,null);
assert.equal(missingWeightCalls.length,2);

const missingTariff=await examineCjDetailedFreight({
  accessToken,vid,fetcher:async(url)=>{
    if(url.includes('queryByVid'))return reply(variant);
    if(url.includes('/product/query'))return reply(product);
    if(url.includes('/stock/'))return reply([{vid,countryCode:'CN',cjInventoryNum:1}]);
    if(url.includes('/freightCalculateTip'))return reply([
      {option:{enName:'Carrier A'},totalPostageFee:'2.99',
        taxesFee:'0.19',clearanceOperationFee:'0.15'}
    ]);
    throw Error('Unexpected provider endpoint');
  }
});
assert.equal(missingTariff.status,'no_complete_detailed_quote');
assert.equal(missingTariff.possibleImportGaps,1);
assert.deepEqual(missingTariff.unpricedRoutes[0].missingImportFields,['tariff']);
assert.equal(missingTariff.completeSupplierQuotes.length,0);

const inconsistent=async(url)=>{
  if(url.includes('queryByVid'))return reply(variant);
  if(url.includes('/product/query'))return reply({...product,
    variants:[{vid,pid:'different-parent',variantSku:sku}]});
  throw Error('Wrong parent must not reach stock');
};
await assert.rejects(examineCjDetailedFreight({accessToken,vid,fetcher:inconsistent}),
  /CJ_DETAIL_PRODUCT_VARIANT_CONTRADICTION/);

await assert.rejects(examineCjDetailedFreight({accessToken,vid:'bad!',fetcher:fake}),
  /variant/);
await assert.rejects(examineCjDetailedFreight({accessToken:'short',vid,fetcher:fake}),
  /token/);
console.log('CJ canonical VID/PID shipping audit OK: SKU pins, strict customs, no orders');
