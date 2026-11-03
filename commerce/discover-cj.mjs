#!/usr/bin/env node
import {discoverCjVariant} from './cj.mjs';

/**
 * One-query operator lookup. Compatible with GitHub Actions workflow_dispatch:
 * no local checkout, database, CJ wallet, Mollie key or customer address needed.
 * This is only discovery, never activation or a supplier order.
 */
async function main(){
  if(process.argv.length!==2)throw Error('Set CJ_VID and CJ_POSTAL_CODE in the environment');
  const vid=process.env.CJ_VID,postalCode=process.env.CJ_POSTAL_CODE||'75002';
  const accessToken=process.env.CJ_ACCESS_TOKEN;
  if(typeof accessToken!=='string'||accessToken.length<20)
    throw Error('CJ_ACCESS_TOKEN GitHub Actions secret is missing');
  const inspection=await discoverCjVariant({vid,postalCode,accessToken});
  const {variantName,variantSku,originCountry,productUsdCents,stockConfirmed,
    warehouseRows,shippingMethods,shippingMethodsAvailable,
    excludedIncompleteShippingOptions,notice}=inspection;
  const summary={
    kind:'cj_variant_read_only_discovery',
    vid,variantSku,variantName,originCountry,postalCode,
    productUsdCents,stockConfirmed,warehouseRows,
    shippingMethods,shippingMethodsAvailable:shippingMethodsAvailable||0,
    excludedIncompleteShippingOptions,
    supplierWalletChecked:false,productCategoryVerified:false,
    taxClassificationVerified:false,supplierOfferApproved:false,
    paymentCreated:false,cjOrderCreated:false,notice
  };
  console.log(JSON.stringify(summary,null,2));
  if(!stockConfirmed||!shippingMethods?.length){
    console.error('No verified stocked shipping option for this pilot postcode; skip this VID');
    process.exitCode=2;
  }
}
main().catch(error=>{
  const message=error?.message||'';
  // Supplier raw responses and accidental credentials must not reach public
  // GitHub Actions logs. All unexpected errors are deliberately generic.
  const safe=/^(Set CJ_VID|CJ_ACCESS_TOKEN GitHub|Provide exact CJ VID|CJ variant identity|CJ variant price|CJ inventory payload|CJ freight payload|CJ API|CJ-Access-Token)/;
  console.error(safe.test(message)?message:'CJ variant discovery failed; inspect account access and try again');
  process.exitCode=1;
});
