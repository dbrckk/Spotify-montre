import assert from 'node:assert/strict';
import {verifyCjOrderDetail} from './cj-status.mjs';

const id='ord_'+'a'.repeat(40);
const buyer={fullName:'Sample Buyer',address1:'12 Rue Exemple',address2:'',postalCode:'75002',
  city:'Paris',region:'Ile-de-France',countryCode:'FR'};
const order={id,supplier_order_id:'CJ12345678',supplier_vid:'sample-vid',
  supplier_max_usd_cents:2500,logistics_name:'Test Carrier',from_country_code:'CN'};
const detail={orderId:order.supplier_order_id,orderNum:'CJ987654',
  shippingCountryCode:'FR',shippingCustomerName:buyer.fullName,
  shippingAddress:buyer.address1,shippingCity:buyer.city,shippingZip:buyer.postalCode,
  currency:'USD',isSandbox:0,fromCountryCode:'CN',logisticName:order.logistics_name,
  orderAmount:'12.00',orderStatus:'SHIPPED',paymentDate:'2026-11-02 12:00:00',
  trackNumber:'TRACKED1234',
  productList:[{vid:order.supplier_vid,quantity:1,storeLineItemId:id}]};
const check=value=>verifyCjOrderDetail(order,value,buyer);
assert.equal(check(detail).next,'SHIPPED');
for(const value of [
  {...detail,shippingZip:undefined},
  {...detail,shippingZip:''},
  {...detail,shippingZip:'69002'},
  {...detail,shippingAddress2:'Another apartment'},
  {...detail,shippingProvince:'Another region'},
  {...detail,orderNum:id,productList:[{...detail.productList[0],storeLineItemId:'other-order'}]}
]){
  assert.throws(()=>check(value),/CJ fulfillment mismatch/);
}
const apartment={...buyer,address2:'Apt 12'};
assert.throws(()=>verifyCjOrderDetail(order,detail,apartment),/CJ fulfillment mismatch/);
assert.equal(verifyCjOrderDetail(order,{...detail,shippingAddress2:'Apt 12'},apartment).next,'SHIPPED');
assert.equal(check({...detail,orderNum:id,
  productList:[{vid:order.supplier_vid,quantity:1}]}).next,'SHIPPED');
console.log('CJ identity checks OK: postcode, apartment and contradictory merchant line blocked');
