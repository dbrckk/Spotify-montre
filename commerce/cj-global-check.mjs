import assert from 'node:assert/strict';
import {scanCjWatchCatalog,CJ_GLOBAL_SEARCH_PLAN} from './cj-global.mjs';

const accessToken='t'.repeat(40);
const response=data=>({ok:true,json:async()=>({code:200,result:true,data})});
let nextProduct=0;
const pidToName=new Map();
const calls=[];
const fake=async(url,options)=>{
  const parsed=new URL(url);
  const path=parsed.pathname.replace('/api2.0/v1','');
  calls.push({path,method:options.method});
  assert.equal(options.headers['CJ-Access-Token'],accessToken);
  assert.equal(options.redirect,'error');
  if(path==='/product/listV2'){
    const keyword=parsed.searchParams.get('keyWord');
    assert.equal(parsed.searchParams.get('size'),'60');
    assert.equal(parsed.searchParams.get('countryCode'),'CN');
    assert.ok(Number(parsed.searchParams.get('page'))>=1);
    const pid='sampleproduct'+(++nextProduct);
    pidToName.set(pid,keyword+' watch');
    return response({content:[{productList:[{
      id:pid,nameEn:pidToName.get(pid),sku:'WATCH-'+pid,
      threeCategoryName:'Watches',listedNum:10
    }]}]});
  }
  if(path==='/product/variant/query'){
    const pid=parsed.searchParams.get('pid');
    assert.ok(pidToName.has(pid));
    return response([{pid,vid:'VID-'+pid,variantSku:'SKU-'+pid,
      variantNameEn:'Black dial',variantSellPrice:'8.50'}]);
  }
  if(path==='/product/variant/queryByVid'){
    const vid=parsed.searchParams.get('vid');
    assert.ok(vid.startsWith('VID-sampleproduct'));
    return response({vid,variantSku:'SKU-'+vid,
      variantNameEn:'Black dial',variantSellPrice:'8.50'});
  }
  if(path==='/product/stock/queryByVid'){
    const vid=parsed.searchParams.get('vid');
    return response([{vid,countryCode:'CN',cjInventoryNum:8}]);
  }
  if(path==='/logistic/freightCalculate'){
    assert.equal(options.method,'POST');
    assert.equal(JSON.parse(options.body).zip,'75002');
    return response([{logisticName:'Tracked Post',totalPostageFee:'3.00',
      taxesFee:'0.50',tariff:'0.00',clearanceOperationFee:'0.00'}]);
  }
  throw Error('Unexpected endpoint '+path);
};

const report=await scanCjWatchCatalog({accessToken,fetcher:fake});
assert.equal(report.kind,'cj_global_watch_search_read_only');
assert.equal(report.status,'shipping_samples_found');
assert.equal(report.searchesCompleted,5,'Search must include different segments before stopping');
assert.equal(report.shippableSamples.length,5);
assert.equal(report.distinctProductsChecked,5);
assert.equal(report.pointsAttempted,450,'5 real sample searches with 90 CJ points each');
assert.equal(report.apiCallsAttempted,calls.length);
assert.equal(report.maxPoints,2500);
assert.equal(report.merchantApproval,false);
assert.equal(report.noCustomerOrders,true);
assert.equal(report.exhaustive,false);
assert.equal(report.shippableSamples[0].shippingMethods[0].landedUsdCents,1150);
assert.ok(!JSON.stringify(report).includes(accessToken),'No credentials in public results');
assert.ok(calls.every(x=>!x.path.startsWith('/shopping/')&&
  !x.path.startsWith('/listed/')),'No order or publication call');
assert.deepEqual(report.searches.map(x=>x.keyword),
  CJ_GLOBAL_SEARCH_PLAN.slice(0,5).map(x=>x.keyword));

nextProduct=0;
calls.length=0;
const bounded=await scanCjWatchCatalog({accessToken,fetcher:fake,maxPoints:250,
  targetShippable:5});
assert.equal(bounded.searchesCompleted,1);
assert.equal(bounded.pointsAttempted,90);
assert.equal(bounded.exhaustedByBudget,true);
assert.equal(calls.length,5);

const attemptedUnsafe=scanCjWatchCatalog({accessToken,fetcher:fake,
  searcher:async({fetcher})=>{
    await fetcher('https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2',{
      method:'POST',redirect:'error',headers:{'CJ-Access-Token':accessToken}
    });
    return {findings:[]};
  }});
await assert.rejects(attemptedUnsafe,/non-read-only API/);

const wrongHost=scanCjWatchCatalog({accessToken,fetcher:fake,
  searcher:async({fetcher})=>{
    await fetcher('https://malicious.example.com/api2.0/v1/product/listV2',{
      method:'GET',redirect:'error',headers:{'CJ-Access-Token':accessToken}
    });
    return {findings:[]};
  }});
await assert.rejects(wrongHost,/non-CJ host/);
for(const maxPoints of [0,2511,NaN]){
  await assert.rejects(scanCjWatchCatalog({accessToken,fetcher:fake,maxPoints}),
    /budget/);
}
await assert.rejects(scanCjWatchCatalog({accessToken:'invalid',fetcher:fake}),
  /CJ-Access-Token/);
console.log('CJ global scan OK: multi-segment sample, hard point cap, no credential leak, no write endpoints');
