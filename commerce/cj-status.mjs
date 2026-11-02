import {usdToCents} from './landed-cost.mjs';

/**
 * CJ getOrderDetail returns a CJ orderId, a possibly different orderNum,
 * and independent merchant references on productList[].storeLineItemId.
 * A delivery status is trustworthy only if every identity and quantity
 * matches the persisted internal order, not by comparing the two IDs.
 *
 * Official contract:
 * https://developers.cjdropshipping.com/en/api/api2/api/shopping.html#1-7-query-order-get
 */
const normalizeAddress=s=>typeof s==='string'?s.normalize('NFC')
  .trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-FR'):null;

export function verifyCjOrderDetail(order,detail,customer){
  const invalid=message=>{throw Error('CJ fulfillment mismatch: '+message)};
  if(!order||!detail||typeof detail!=='object'||Array.isArray(detail))
    invalid('missing order or detail');
  if(!/^ord_[a-f0-9]{40}$/.test(order.id||''))
    invalid('merchant order id');
  if(!order.supplier_order_id||String(detail.orderId||'')!==String(order.supplier_order_id))
    invalid('CJ order id');
  if(detail.shippingCountryCode!=='FR'||customer?.countryCode!=='FR')
    invalid('shipping destination country');
  // A CJ order delivered to another address can never be called fulfilled.
  // Compare the exact shipping snapshot with our encrypted customer record.
  if(!normalizeAddress(customer.fullName)||!normalizeAddress(customer.address1)||
    !normalizeAddress(customer.city)||
    normalizeAddress(detail.shippingCustomerName)!==normalizeAddress(customer.fullName)||
    normalizeAddress(detail.shippingAddress)!==normalizeAddress(customer.address1)||
    normalizeAddress(detail.shippingCity)!==normalizeAddress(customer.city))
    invalid('shipping recipient or delivery address');
  if(detail.shippingZip&&detail.shippingZip!==customer.postalCode)
    invalid('recipient postal code');
  if(detail.isSandbox!==0)
    invalid('sandbox or unverified live order');
  if(detail.currency!=='USD')
    invalid('supplier currency');
  if(!Array.isArray(detail.productList)||detail.productList.length!==1)
    invalid('product lines');
  const line=detail.productList[0];
  if(line?.vid!==order.supplier_vid||line.quantity!==1)
    invalid('variant and quantity');
  if(line.storeLineItemId!==order.id&&line.orderNumber!==order.id&&detail.orderNum!==order.id)
    invalid('original merchant order reference');
  if(typeof detail.logisticName==='string'&&detail.logisticName!==order.logistics_name)
    invalid('logistics method changed');
  if(typeof detail.fromCountryCode==='string'&&detail.fromCountryCode!==order.from_country_code)
    invalid('shipping warehouse changed');
  if(typeof detail.orderAmount!=='string'&&typeof detail.orderAmount!=='number')
    invalid('supplier cost missing');
  const actualCostUsdCents=usdToCents(detail.orderAmount,'CJ detail orderAmount');
  if(actualCostUsdCents>order.supplier_max_usd_cents)
    invalid('supplier actual cost over ceiling');
  const supplierStatus=String(detail.orderStatus||'').toUpperCase();
  if(!['CREATED','IN_CART','UNPAID','PENDING','PROCESSING','UNSHIPPED',
    'SHIPPED','DELIVERED','CANCELLED'].includes(supplierStatus))
    invalid('unknown CJ order status');
  if(detail.disputeId||detail.disputeOpenedId)
    invalid('supplier dispute requires manual review');
  const paid=typeof detail.paymentDate==='string'&&detail.paymentDate.length>=10;
  const tracking=typeof detail.trackNumber==='string'
    &&/^[a-zA-Z0-9_-]{6,120}$/.test(detail.trackNumber)
      ?detail.trackNumber:null;
  const trackingUrl=typeof detail.trackingUrl==='string'
    ?(()=>{try{
      const u=new URL(detail.trackingUrl);
      return u.protocol==='https:'&&!u.username&&!u.password&&u.port===''&&
        !u.hash&&detail.trackingUrl.length<=450?u.href:null
    }catch{return null}})():null;
  let next=null;
  if(supplierStatus==='CANCELLED')next='EXCEPTION';
  else if(paid){
    if(supplierStatus==='DELIVERED'&&tracking)next='DELIVERED';
    else if(supplierStatus==='SHIPPED'&&tracking)next='SHIPPED';
    else if(['UNSHIPPED','PENDING','PROCESSING','SHIPPED','DELIVERED'].includes(supplierStatus))
      next='SUPPLIER_PAID';
  }
  return {supplierStatus,next,tracking,trackingUrl,actualCostUsdCents};
}
