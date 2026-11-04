import assert from 'node:assert/strict';
import {discoverCjVariant,obtainCjAccessToken} from './cj.mjs';

// Strictly local synthetic CJ responses. No live supplier key or purchase.
const vid='12345678901234567',token='t'.repeat(40);
const authKey='CJUserNum@api@'+'x'.repeat(40);
let authCalls=0;
const issued=await obtainCjAccessToken({apiKey:authKey,fetcher:async(url,options)=>{
  authCalls++;
  assert.ok(url.endsWith('/authentication/getAccessToken'));
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'error');
  assert.equal(JSON.parse(options.body).apiKey,authKey);
  return {ok:true,json:async()=>({code:200,result:true,data:{accessToken:token}})};
}});
assert.equal(issued,token);
assert.equal(authCalls,1);
await assert.rejects(obtainCjAccessToken({apiKey:authKey+' ',fetcher:async()=>{
  authCalls++;throw Error('API should not have been called');
}}),/CJ API key unavailable/);
await assert.rejects(obtainCjAccessToken({apiKey:authKey,
  fetcher:async()=>({ok:true,json:async()=>({code:401,result:false,message:'private'})})
}),/CJ account did not authorize/);
const calls=[];
const reply=data=>({ok:true,json:async()=>({code:200,result:true,data})});
const fake=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body});
  assert.equal(options.headers['CJ-Access-Token'],token);
  if(url.includes('/product/variant/queryByVid'))
    return reply({vid,variantSku:'SKMEI-SAMPLE',variantNameEn:'Synthetic test watch',
      variantSellPrice:'11.30'});
  if(url.includes('/product/stock/queryByVid'))
    return reply([{vid,countryCode:'CN',cjInventoryNum:3},
      {vid,countryCode:'US',cjInventoryNum:100}]);
  if(url.endsWith('/logistic/freightCalculate')){
    const body=JSON.parse(options.body);
    assert.equal(body.endCountryCode,'FR');
    assert.equal(body.zip,'75002');
    assert.deepEqual(body.products,[{vid,quantity:1}]);
    return reply([
      {logisticName:'PostNL',totalPostageFee:'4.40',
        taxesFee:'0.85',clearanceOperationFee:'0.45',tariff:'0.00'},
      {logisticName:'Air Complete',logisticPrice:'4.00',
        taxesFee:'0.80',clearanceOperationFee:'0.20',tariff:'0.20'},
      {logisticName:'Missing customs',totalPostageFee:'3.00',
        taxesFee:'0.80',clearanceOperationFee:'0.20'},
      {logisticName:'Conflicted',totalPostageFee:'5.00',
        taxesFee:'0.80',clearanceOperationFee:'0.20',tariff:'0.00'},
      {logisticName:'Conflicted',totalPostageFee:'6.00',
        taxesFee:'0.80',clearanceOperationFee:'0.20',tariff:'0.00'}
    ]);
  }
  throw Error('Unexpected CJ endpoint');
};
const result=await discoverCjVariant({
  vid,postalCode:'75002',accessToken:token,fetcher:fake});
assert.equal(result.stockConfirmed,true);
assert.equal(result.productUsdCents,1130);
assert.equal(result.approvedForSale,false);
assert.equal(result.sampleOnly,true);
assert.equal(result.shippingMethodsAvailable,2);
assert.deepEqual(result.shippingMethods.map(x=>x.logisticsName),['PostNL','Air Complete']);
assert.equal(result.shippingMethods[0].landedUsdCents,1570);
assert.equal(result.shippingMethods[1].landedUsdCents,1650);
assert.equal(result.excludedIncompleteShippingOptions,2);
assert.deepEqual(calls.map(x=>x.method),['GET','GET','POST']);
assert.ok(calls.every(x=>!x.url.includes('createOrder')),'No CJ purchase endpoints');

let zeroCalls=0;
const noStock=async(url,options)=>{
  zeroCalls++;
  if(url.includes('/stock/'))return reply([{vid,countryCode:'CN',cjInventoryNum:0}]);
  if(url.includes('/variant/'))return reply({vid,variantSellPrice:'11.30'});
  throw Error('Freight should never be requested with zero stock');
};
const unavailable=await discoverCjVariant({
  vid,postalCode:'75002',accessToken:token,fetcher:noStock});
assert.equal(unavailable.stockConfirmed,false);
assert.deepEqual(unavailable.shippingMethods,[]);
assert.equal(zeroCalls,2,'Do not spend CJ freight points on out-of-stock variants');
for(const postcode of ['97100','98000','7500','FR75002']){
  await assert.rejects(discoverCjVariant({
    vid,postalCode:postcode,accessToken:token,fetcher:fake
  }),/metropolitan French/);
}
await assert.rejects(discoverCjVariant({
  vid:'foo;curl',postalCode:'75002',accessToken:token,fetcher:fake
}),/exact CJ VID/);
await assert.rejects(discoverCjVariant({
  vid,postalCode:'75002',accessToken:'invalid',fetcher:fake
}),/CJ-Access-Token unavailable/);
assert.equal(calls.length,3,'Bad user inputs cannot call supplier');
// Real CJ freightCalculate documents a simplified route response that may
// supply logisticPrice without taxes/clearance/tariff. It must be visible in
// diagnostics, NEVER accepted as fully landed cost or a purchasable route.
const simpleCalls=[];
const baseOnly=async(url,options)=>{
  simpleCalls.push({url,method:options.method});
  if(url.includes('/variant/queryByVid'))
    return reply({vid,variantSellPrice:'0.50'});
  if(url.includes('/stock/queryByVid'))
    return reply([{vid,countryCode:'CN',cjInventoryNum:12}]);
  if(url.endsWith('/logistic/freightCalculate'))
    return reply(Array.from({length:13},(_,i)=>({
      logisticName:'Carrier '+i,logisticPrice:'3.25',
      logisticAging:'7-15'
    })));
  throw Error('Unexpected supplier endpoint');
};
const baseOnlyAudit=await discoverCjVariant({
  vid,postalCode:'75002',accessToken:token,fetcher:baseOnly
});
assert.equal(baseOnlyAudit.stockConfirmed,true);
assert.equal(baseOnlyAudit.shippingMethods.length,0,
  'Simple carriage is not a valid paid checkout quote');
assert.equal(baseOnlyAudit.excludedIncompleteShippingOptions,13);
assert.deepEqual(baseOnlyAudit.shippingQuoteDiagnostics,{
  optionsReturned:13,missingImportFields:13,missingShippingRate:0,
  invalidCarrier:0,invalidAmounts:0,conflictingCarrierRates:0
});
assert.equal(baseOnlyAudit.shippingRouteSamples.length,8);
assert.equal(baseOnlyAudit.shippingRouteSamples[0].baseShippingUsdCents,325);
assert.deepEqual(baseOnlyAudit.shippingRouteSamples[0].missingImportFields,
  ['taxesFee','clearanceOperationFee','tariff']);
assert.equal(simpleCalls.length,3);
assert.ok(!simpleCalls.some(x=>/shopping|createOrderV2/.test(x.url)));
assert.equal(result.shippingQuoteDiagnostics.optionsReturned,5);
assert.equal(result.shippingMethods.length,2,'Existing complete routes must still work');

// A catalog PID may be stale even when queryByVid resolves the exact VID.
// Its canonical parent is authoritative: never query inventory or rates when
// the requested catalog association differs.
const mismatchReads=[];
const parentMismatch=await discoverCjVariant({
  vid,expectedPid:'wrong-catalog-pid',postalCode:'75002',accessToken:token,
  fetcher:async(url,options)=>{
    mismatchReads.push(new URL(url).pathname);
    assert.equal(options.method,'GET');
    assert.ok(url.includes('/product/variant/queryByVid'));
    return reply({vid,pid:'canonical-supplier-pid',variantSellPrice:'2.15',
      variantSku:'CJZBNSET00031-black'});
  }
});
assert.equal(parentMismatch.state,'catalog_identity_mismatch');
assert.equal(parentMismatch.catalogPidMatched,false);
assert.equal(parentMismatch.canonicalPid,'canonical-supplier-pid');
assert.equal(parentMismatch.stockChecked,false);
assert.equal(parentMismatch.stockConfirmed,false);
assert.deepEqual(parentMismatch.shippingMethods,[]);
assert.equal(parentMismatch.approvedForSale,false);
assert.equal(mismatchReads.length,1,'Bad parent pairing must not spend CJ stock/freight points');
await assert.rejects(discoverCjVariant({
  vid,expectedPid:'bad pid!',postalCode:'75002',accessToken:token,fetcher:fake
}),/exact CJ VID/);
assert.equal(mismatchReads.length,1);

console.log('CJ discovery OK: real-API read shapes, safe tax-inclusive shipping, stock, no order writes and early reject');
