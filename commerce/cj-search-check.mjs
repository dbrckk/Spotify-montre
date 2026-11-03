import assert from 'node:assert/strict';
import {searchCjWatchCandidates} from './cj-search.mjs';

const token='x'.repeat(40);
const p1='aabbcc11223344',p2='aabbcc11223355',p3='aabbcc11223366';
const v1='vid112233445566',v2='vid112233445577';
const response=data=>({
  ok:true,json:async()=>({code:200,result:true,data})
});
const calls=[];
const fake=async(url,options)=>{
  calls.push({url,method:options.method});
  assert.ok(url.startsWith('https://developers.cjdropshipping.com/api2.0/v1/'));
  assert.equal(options.headers['CJ-Access-Token'],token);
  assert.equal(options.redirect,'error');
  if(url.includes('/product/listV2?')){
    const query=new URL(url).searchParams;
    assert.equal(query.get('keyWord'),'SKMEI');
    assert.equal(query.get('countryCode'),'CN');
    assert.equal(query.get('page'),'1');
    assert.equal(query.get('size'),'12');
    return response({pageSize:12,pageNumber:1,totalRecords:3,
      content:[{productList:[
        {id:p1,nameEn:'SKMEI digital wrist watch men',
         sku:'SKMEI-001',threeCategoryName:'Watches',listedNum:13},
        {id:p2,nameEn:'SKMEI sport watch waterproof',
         sku:'SKMEI-002',threeCategoryName:'Watches',listedNum:8},
        {id:p3,nameEn:'SKMEI replacement watch strap',
         sku:'SKMEI-003',threeCategoryName:'Watch Accessories',listedNum:55}
      ]}]});
  }
  if(url.includes('/product/variant/query?')){
    const pid=new URL(url).searchParams.get('pid');
    if(pid===p1)return response([
      {pid,vid:v1,variantNameEn:'Black',variantSku:'SKMEI-001-B',variantSellPrice:'7.50'},
      {pid,vid:'vpricehigh112233',variantSellPrice:'9.80'}]);
    if(pid===p2)return response([
      {pid,vid:v2,variantNameEn:'Blue',variantSku:'SKMEI-002-U',variantSellPrice:10.5}]);
  }
  if(url.includes('/product/variant/queryByVid?')){
    const vid=new URL(url).searchParams.get('vid');
    return response({vid,variantSku:'SKU-'+vid,variantNameEn:'Watch '+vid,
      variantSellPrice:vid===v1?'7.50':'10.50'});
  }
  if(url.includes('/product/stock/queryByVid?')){
    const vid=new URL(url).searchParams.get('vid');
    return response([{vid,countryCode:'CN',cjInventoryNum:vid===v1?7:0},
      {vid,countryCode:'US',cjInventoryNum:1000}]);
  }
  if(url.endsWith('/logistic/freightCalculate')){
    assert.equal(options.method,'POST');
    const body=JSON.parse(options.body);
    assert.equal(body.endCountryCode,'FR');
    assert.equal(body.zip,'75002');
    assert.deepEqual(body.products,[{quantity:1,vid:v1}]);
    return response([
      {logisticName:'PostNL',totalPostageFee:'3.00',
       taxesFee:'0.45',clearanceOperationFee:'0.15',tariff:'0.00'},
      {logisticName:'Incomplete Customs',totalPostageFee:'2.00',
       taxesFee:'0.45',clearanceOperationFee:'0.15'}
    ]);
  }
  throw Error('Unexpected or unsafe CJ endpoint: '+url);
};
const report=await searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:token,fetcher:fake
});
assert.equal(report.kind,'cj_watch_search_read_only');
assert.equal(report.merchantApproval,false);
assert.equal(report.noCustomerOrders,true);
assert.equal(report.findings.length,2);
assert.equal(report.findings[0].pid,p1);
assert.equal(report.findings[0].vid,v1);
assert.equal(report.findings[0].state,'sample_shipping_available');
assert.equal(report.findings[0].productUsdCents,750);
assert.equal(report.findings[0].shippingMethods[0].landedUsdCents,1050);
assert.equal(report.findings[0].excludedIncompleteShippingOptions,1);
assert.equal(report.findings[0].approvedForSale,false);
assert.equal(report.findings[1].pid,p2);
assert.equal(report.findings[1].state,'not_ready');
assert.equal(report.findings[1].stockConfirmed,false);
assert.deepEqual(report.findings[1].shippingMethods,[]);
assert.equal(calls.length,8,'one list, two variant lists, two identity + stock, one freight');
assert.ok(calls.every(c=>!c.url.includes('/shopping/')&&
  !c.url.includes('/addToMyProduct')&&
  !c.url.includes('/sourcing/create')),
  'Discovery must not place or fund any order');

for(const keyword of ['',' x','x;curl something','a'.repeat(60)]){
  await assert.rejects(searchCjWatchCandidates({
    keyword,postalCode:'75002',accessToken:token,fetcher:fake
  }),/keyword/);
}
for(const postalCode of ['97100','98000','abcd0','7500']){
  await assert.rejects(searchCjWatchCandidates({
    keyword:'SKMEI',postalCode,accessToken:token,fetcher:fake
  }),/postcode/);
}
await assert.rejects(searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:'invalid',fetcher:fake
}),/CJ-Access-Token/);
assert.equal(calls.length,8,'Invalid input must not call CJ');

await assert.rejects(searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:token,
  fetcher:async()=>response({list:[{id:p1}]})
}),/listV2 response format unsupported/);
const missing=await searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:token,
  fetcher:async()=>response({content:[{productList:[]}]})
});
assert.equal(missing.findings.length,0);
assert.equal(missing.merchantApproval,false);
const printed=JSON.stringify(report);
assert.ok(!printed.includes(token));
console.log('CJ keyword discovery OK: authentic API shape, cost/stock/French freight, 8 bounded reads, no order writes, no secrets');
