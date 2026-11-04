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
// Regression: the cheapest price can refer to a variant with NO CN stock,
// while the second cheapest exact VID is genuinely shippable to France.
const cheaper='firstvid88990000',deliverable='secondvid88990000';
const fallbackCalls=[];
const fallbackSupplier=async(url,options)=>{
  const path=new URL(url).pathname;
  fallbackCalls.push({path,method:options.method});
  assert.equal(options.headers['CJ-Access-Token'],token);
  assert.equal(options.redirect,'error');
  if(path.endsWith('/product/listV2'))return response({content:[{productList:[{
    id:p1,nameEn:'SKMEI wrist watch',sku:'SKMEI-1251',threeCategoryName:'Watches'
  }]}]});
  if(path.endsWith('/product/variant/query'))return response([
    {pid:p1,vid:cheaper,variantSku:'SK-1251-A',variantSellPrice:'5.00'},
    {pid:p1,vid:deliverable,variantSku:'SK-1251-B',variantSellPrice:'7.00'},
    // The same VID appears twice in some supplier catalogs: do not spend
    // an extra CJ lookup for this duplicate.
    {pid:p1,vid:deliverable,variantSku:'SK-1251-B',variantSellPrice:'7.00'}
  ]);
  if(path.endsWith('/product/variant/queryByVid')){
    const vid=new URL(url).searchParams.get('vid');
    return response({vid,variantSku:vid===deliverable?'SK-1251-B':'SK-1251-A',
      variantNameEn:vid===deliverable?'Black watch':'Blue watch',
      variantSellPrice:vid===deliverable?'7.00':'5.00'});
  }
  if(path.endsWith('/product/stock/queryByVid')){
    const vid=new URL(url).searchParams.get('vid');
    return response([{vid,countryCode:'CN',cjInventoryNum:vid===deliverable?14:0}]);
  }
  if(path.endsWith('/logistic/freightCalculate')){
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body).products,[{vid:deliverable,quantity:1}]);
    return response([{logisticName:'France Tracked',totalPostageFee:'3.50',
      taxesFee:'0.50',tariff:'0.00',clearanceOperationFee:'0.00'}]);
  }
  throw Error('Unexpected search endpoint: '+path);
};
const rescued=await searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:token,
  fetcher:fallbackSupplier,maxProducts:1
});
assert.equal(rescued.findings.length,1);
assert.equal(rescued.findings[0].state,'sample_shipping_available');
assert.equal(rescued.findings[0].vid,deliverable);
assert.equal(rescued.findings[0].listedVariants,3);
assert.equal(rescued.findings[0].variantsChecked,2);
assert.equal(rescued.findings[0].otherVariantsNotChecked,true);
assert.equal(rescued.findings[0].productUsdCents,700);
assert.equal(rescued.findings[0].shippingMethods[0].landedUsdCents,1050);
assert.equal(rescued.findings[0].approvedForSale,false);
assert.equal(fallbackCalls.length,7,'one list, one variants, first VID 2 reads, second VID 3 reads');
assert.ok(fallbackCalls.every(c=>!/shopping|createOrderV2/.test(c.path)));

const unavailableCalls=[];
const noInventory=async(url,options)=>{
  const path=new URL(url).pathname;unavailableCalls.push(path);
  if(path.endsWith('/product/listV2'))return response({content:[{productList:[{
    id:p1,nameEn:'SKMEI wrist watch',sku:'SKMEI-1251',threeCategoryName:'Watches'
  }]}]});
  if(path.endsWith('/product/variant/query'))return response([
    {pid:p1,vid:cheaper,variantSellPrice:'5.00'},
    {pid:p1,vid:deliverable,variantSellPrice:'7.00'}
  ]);
  if(path.endsWith('/product/variant/queryByVid')){
    const vid=new URL(url).searchParams.get('vid');
    return response({vid,variantSellPrice:vid===cheaper?'5.00':'7.00'});
  }
  if(path.endsWith('/product/stock/queryByVid')){
    const vid=new URL(url).searchParams.get('vid');
    return response([{vid,countryCode:'CN',cjInventoryNum:0}]);
  }
  throw Error('No-stock search must never request freight or orders');
};
const noStock=await searchCjWatchCandidates({
  keyword:'SKMEI',postalCode:'75002',accessToken:token,
  fetcher:noInventory,maxProducts:1
});
assert.equal(noStock.findings[0].state,'not_ready');
assert.equal(noStock.findings[0].stockConfirmed,false);
assert.equal(noStock.findings[0].variantsChecked,2);
assert.equal(noStock.findings[0].approvedForSale,false);
assert.equal(unavailableCalls.length,6);
assert.ok(!unavailableCalls.some(path=>/freightCalculate|shopping/.test(path)));

console.log('CJ keyword discovery OK: real API payload contract, bounded second-VID fallback, no fake availability or writes');
