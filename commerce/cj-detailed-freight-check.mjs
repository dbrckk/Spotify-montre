import assert from 'node:assert/strict';
import {examineCjDetailedFreight} from './cj-detailed-freight.mjs';

const accessToken='t'.repeat(40);
const pid='sampleproductid12345',vid='samplevariantid12345';
const sku='CJZBNSET00031-black';
const answer=data=>({ok:true,json:async()=>({code:200,result:true,data})});
const product={pid,productType:0,productProEnSet:['COMMON','BATTERY'],
  variants:[{pid,vid,variantSku:sku,variantWeight:85,
    variantSellPrice:'0.50'}]};
const seen=[];
const fake=async(url,options)=>{
  seen.push({url,options});
  assert.equal(options.headers['CJ-Access-Token'],accessToken);
  assert.equal(options.redirect,'error');
  const endpoint=new URL(url).pathname;
  if(endpoint.endsWith('/product/query')){
    assert.equal(new URL(url).searchParams.get('pid'),pid);
    return answer(product);
  }
  if(endpoint.endsWith('/product/stock/queryByVid')){
    return answer([{countryCode:'CN',vid,cjInventoryNum:4}]);
  }
  if(endpoint.endsWith('/logistic/freightCalculateTip')){
    assert.equal(options.method,'POST');
    const row=JSON.parse(options.body).reqDTOS[0];
    assert.equal(row.srcAreaCode,'CN');
    assert.equal(row.destAreaCode,'FR');
    assert.equal(row.zip,'75002');
    assert.equal(row.weight,85);
    assert.equal(row.totalGoodsAmount,0.5);
    assert.deepEqual(row.productProp,['COMMON','BATTERY']);
    assert.deepEqual(row.skuList,[sku]);
    assert.deepEqual(row.freightTrialSkuList,
      [{sku,skuQuantity:1,vid,skuWeight:85}]);
    assert.ok(!('shippingCustomerName' in row));
    return answer([
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
const result=await examineCjDetailedFreight({accessToken,vid,pid,fetcher:fake});
assert.equal(result.status,'detailed_quotes_observed');
assert.equal(result.stockConfirmed,true);
assert.equal(result.metadata.weightGrams,85);
assert.equal(result.metadata.skuConfirmed,true);
assert.equal(result.detailedOptionsReturned,4);
assert.equal(result.possibleImportGaps,1);
assert.deepEqual(result.completeSupplierQuotes.map(x=>x.carrier),['CJPacket Postal']);
assert.equal(result.completeSupplierQuotes[0].landedUsdCents,500);
assert.equal(result.approvedForSale,false);
assert.equal(result.noCustomerOrder,true);
assert.equal(seen.length,3);
assert.ok(seen.every(x=>!/shopping|createOrder|listed|wallet/.test(x.url)));
assert.ok(!JSON.stringify(result).includes(accessToken));

let metadataReads=0;
const noWeight=await examineCjDetailedFreight({accessToken,vid,pid,
  fetcher:async()=>{
    metadataReads++;
    return answer({...product,variants:[{...product.variants[0],variantWeight:0}]});
  }
});
assert.equal(noWeight.status,'missing_supplier_metadata');
assert.equal(metadataReads,1,'Do not request freight with guessed weight');
assert.equal(noWeight.completeSupplierQuotes.length,0);

const missingTariff=await examineCjDetailedFreight({accessToken,vid,pid,
  fetcher:async(url)=>{
    if(url.includes('/product/query'))return answer(product);
    if(url.includes('/stock/'))return answer([{vid,countryCode:'CN',cjInventoryNum:1}]);
    if(url.includes('/freightCalculateTip'))return answer([
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

await assert.rejects(examineCjDetailedFreight({accessToken,vid:'invalid!',pid,fetcher:fake}),
  /variant/);
await assert.rejects(examineCjDetailedFreight({accessToken:'short',vid,pid,fetcher:fake}),
  /token/);
console.log('CJ detailed freight audit OK: exact supplier weight/properties, all-in quotes only, no orders');
