import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the real production tracker, without a browser or network requests.
// Only simulated outbound clicks are permitted; no user or order data exists.
const source=readFileSync(new URL('../site/analytics.js',import.meta.url),'utf8');
const affiliate=JSON.parse(readFileSync(new URL('../site/affiliate-links.json',import.meta.url),'utf8'));
const tag=source.match(/const ownerAmazonTag='([^']+)'/);
assert.equal(tag?.[1],affiliate.amazonPartnerTag,
  'Tracking script must use the exact active, owner-confirmed public Amazon.fr ID');
const primary=JSON.parse(readFileSync(new URL('../research/amazon-fr-exact-products.json',import.meta.url),'utf8')).products;
const supplemental=JSON.parse(readFileSync(new URL('../research/amazon-fr-popular-verified.json',import.meta.url),'utf8')).verifiedProducts;
const approvedAsins=Object.fromEntries([
  ...Object.entries(primary).filter(([,p])=>p.status==='matched_on_amazon_fr')
    .map(([id,p])=>[id,p.asin]),
  ...Object.entries(supplemental).map(([id,p])=>[id,p.asin])
]);
assert.equal(Object.keys(approvedAsins).length,27,
  '13 core and 14 documented supplemental ASINs, no inferred models');
const encoded=source.match(/const exactAmazonAsinByModel=Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(encoded,'A source-backed exact model-to-ASIN map is required in the production tracker');
const attributedAsins=JSON.parse(encoded[1]);
assert.deepEqual(attributedAsins,Object.fromEntries(Object.entries(approvedAsins)
  .sort(([a],[b])=>a.localeCompare(b))),
  'The browser attribution map must equal all 27 actual research ASINs');
const events=[];
let click,change;
const context={
  URL,
  window:{
    location:{origin:'https://atelier-montres-selection-fr.onrender.com'},
    umami:{track:name=>events.push(name)}
  },
  document:{addEventListener:(type,listener,opts)=>{
    assert.ok(['click','change'].includes(type),'Only categorical opt-in events may be registered');
    assert.equal(opts.capture,true);
    assert.equal(opts.passive,true);
    if(type==='click')click=listener;
    else change=listener;
  }}
};
runInNewContext(source,context,{timeout:1000,filename:'site/analytics.js'});
assert.equal(typeof click,'function','The real tracker must register a delegated click listener');
assert.equal(typeof change,'function','The tracker must register privacy-safe evidence-filter changes');

const trigger=({url,id='skmei-2056',placement='popular',kind='official',rel})=>{
  const names=kind==='official'?['data-merchant-official-id']:
    kind==='partner'?['data-partner-offer-id']:
      kind==='search'?['data-amazon-search-id']:['data-amazon-product'];
  const attrs=new Set(names);
  const el={
    href:url,
    rel:rel??(kind==='direct'&&new URL(url).searchParams.has('tag')
      ?'noopener noreferrer nofollow sponsored':'noopener noreferrer nofollow'),
    hasAttribute:name=>attrs.has(name),
    dataset:kind==='official'?{merchantOfficialId:id,merchantPlacement:placement}:
      kind==='partner'?{partnerOfferId:id,partnerPlacement:placement}:
        kind==='search'?{amazonSearchId:id,amazonPlacement:placement}:
          {amazonProduct:id,amazonPlacement:placement}
  };
  click({target:{closest:selector=>{
    assert.match(selector,/data-partner-offer-id/,
      'Merchant click listener should include approved partner offer attributes');
    return el;
  }}});
};

trigger({url:'https://www.shopskmei.com/product/skmei-2056-digital-sport-watch/'});
assert.deepEqual(events,['merchant:skmei-2056:popular'],'Brand/vendor clicks must be counted separately from sponsored referrals');
trigger({url:'https://paganidesign.com/products/pd-1776',id:'pagani-pd1776'});
assert.equal(events.at(-1),'merchant:pagani-pd1776:popular',
  'The newly verified Pagani seller product page must be an optional merchant intent event');
trigger({url:'https://paganidesign.com/fr/products/pagani-design-1701',id:'pagani-pd1701'});
assert.equal(events.at(-1),'merchant:pagani-pd1701:popular');
trigger({url:'https://www.addiesdivewatches.com/products/new-addiesdive-36mm-quartz-watch-vh31-movement-ad2030',id:'addiesdive-ad2030'});
assert.equal(events.at(-1),'merchant:addiesdive-ad2030:popular');
const awin=new URL('https://www.awin1.com/cread.php');
awin.searchParams.set('awinmid','94513');
awin.searchParams.set('awinaffid','123456');
awin.searchParams.set('ued','https://www.addiesdivewatches.com/products/new-addiesdive-36mm-quartz-watch-vh31-movement-ad2030');
trigger({url:awin.href,kind:'partner',id:'addiesdive-ad2030'});
assert.equal(events.at(-1),'awin:addiesdive-ad2030:popular',
  'Awin valid publisher-issued deep-link clicks must be distinguished from Amazon and manufacturer interest');
trigger({url:'https://www.amazon.fr/s?k=SKMEI%202056&tag=drackk04-21',kind:'search'});
assert.equal(events.at(-1),'amazon-search:skmei-2056','Old Amazon search event names must remain unchanged');
trigger({url:'https://www.amazon.fr/dp/B0DNK5TT6D?tag=drackk04-21',id:'addiesdive-ad2030',kind:'direct'});
assert.equal(events.at(-1),'amazon:addiesdive-ad2030:popular','Old Amazon product event names must remain unchanged');

trigger({url:'https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21',
  kind:'direct',placement:'showroom',id:'citizen-tsuyosa'});
assert.equal(events.at(-1),'amazon:citizen-tsuyosa:showroom',
  'Real exact-ASIN storefront referral needs a separate showroom event');
trigger({url:'https://www.amazon.fr/dp/B07B6ML1VJ?tag=drackk04-21',kind:'direct',
  placement:'showroom',id:'skmei-1257'});
assert.equal(events.at(-1),'amazon:skmei-1257:showroom',
  'New conversion landing must be measurable separately from older popular watch placements');
// An untagged exact Amazon product link is NOT a compensated referral.
trigger({url:'https://www.amazon.fr/dp/B0BG7VD5YL',
  kind:'direct',placement:'fiche',id:'citizen-tsuyosa'});
assert.equal(events.at(-1),'amazon-unpaid:citizen-tsuyosa:fiche',
  'Untracked manufacturer/editorial exits must not inflate affiliate clicks');
// Every source-backed Amazon ASIN must still generate exactly the right
// product-intent event with a correctly tagged, clearly disclosed link.
const beforeAll=events.length;
for(const [modelId,asin] of Object.entries(approvedAsins)){
  trigger({url:'https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21',
    kind:'direct',placement:'seo',id:modelId});
  assert.equal(events.at(-1),'amazon:'+modelId+':seo',
    'Documented ASIN must track only its own product ID: '+modelId);
}
assert.equal(events.length,beforeAll+27,'Exactly the 27 source-backed ASINs must be attributable');


// Optional on-site funnel events must never transmit free-text search terms,
// identifiers from visitors or arbitrary outbound URLs.
const beforeFunnel=events.length;
const site='https://atelier-montres-selection-fr.onrender.com';
const compareLink=site+'/montres/toutes-les-montres.html?compare=skmei-1251%2Cskmei-1257#comparer';
function compareClick({id='skmei-1251',attribute='data-compare-source',url=compareLink,ambiguous=false}={}){
  const datasetName={
    'data-compare-source':'compareSource',
    'data-focus-compare':'focusCompare',
    'data-affordable-compare':'affordableCompare'
  }[attribute];
  const names=new Set([attribute,...(ambiguous?['data-affordable-compare']:[])]);
  const el={href:url,dataset:{[datasetName]:id},hasAttribute:name=>names.has(name)};
  click({target:{closest:()=>el}});
}
compareClick();
assert.equal(events.at(-1),'compare:skmei-1251:fiche');
compareClick({attribute:'data-focus-compare'});
assert.equal(events.at(-1),'compare:skmei-1251:selection');
compareClick({attribute:'data-affordable-compare'});
assert.equal(events.at(-1),'compare:skmei-1251:accueil');
assert.equal(events.length,beforeFunnel+3,'Only documented same-site comparison exits count');
const beforeInvalid=events.length;
for(const input of [
  {url:'https://example.net/montres/toutes-les-montres.html?compare=skmei-1251,skmei-1257#comparer'},
  {url:site+'/montres/toutes-les-montres.html?compare=skmei-1257,skmei-2056#comparer'},
  {url:site+'/montres/toutes-les-montres.html?compare=skmei-1251,skmei-1257&email=foo#comparer'},
  {url:site+'/montres/toutes-les-montres.html?compare=skmei-1251,skmei-1251#comparer'},
  {url:site+'/montres/toutes-les-montres.html?compare=skmei-1251,skmei-1257#incorrect'},
  {id:'malicious:email'},
  {ambiguous:true}
])compareClick(input);
assert.equal(events.length,beforeInvalid,
  'Untrusted, mismatched, ambiguous or duplicate comparison IDs must never be tracked');

const proofForm={id:'am-pick-filters',elements:{namedItem:name=>({
  'photo-publiee':photoProof,'asin-documente':asinProof
})[name]}};
const photoProof={type:'checkbox',checked:false};
const asinProof={type:'checkbox',checked:false};
photoProof.form=proofForm;asinProof.form=proofForm;
photoProof.checked=true;
change({target:photoProof});
assert.equal(events.at(-1),'proof-filter:photo');
asinProof.checked=true;
change({target:asinProof});
assert.equal(events.at(-1),'proof-filter:both');
photoProof.checked=false;
change({target:photoProof});
assert.equal(events.at(-1),'proof-filter:both','Unchecking must not create a new conversion event');
asinProof.checked=false;
asinProof.checked=true;
change({target:asinProof});
assert.equal(events.at(-1),'proof-filter:asin');
const beforeBadProof=events.length;
change({target:{type:'search',value:'private free text',form:proofForm}});
change({target:{type:'checkbox',checked:true,form:{id:'unrelated-form'}}});
change({target:{type:'checkbox',checked:true,form:proofForm}});
assert.equal(events.length,beforeBadProof,'Raw search or unrelated form actions must never be tracked');
assert.equal(events.length,beforeFunnel+6,'Three compare and three evidence-category events only');

// An ASIN exists, but it belongs to a DIFFERENT watch. Ignore the event
// rather than misreport a qualified affiliate exit to the wrong product.
const mappedBefore=events.length;
trigger({url:'https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21',
  kind:'direct',placement:'showroom',id:'casio-mtp-1302'});
trigger({url:'https://www.amazon.fr/dp/B07B6ML1VJ?tag=drackk04-21',
  kind:'direct',placement:'popular',id:'addiesdive-ad2030'});
trigger({url:'https://www.amazon.fr/dp/B0BG7VD5YL',
  kind:'direct',placement:'fiche',id:'seiko-5'});
trigger({url:'https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21',
  kind:'direct',placement:'showroom',id:'unknown-watch'});
assert.equal(events.length,mappedBefore,
  'Cross-model Amazon ASINs and unknown IDs must not be counted as attributed commerce clicks');
trigger({url:'https://www.amazon.fr/dp/B0DNK5TT6D?tag=drackk04-21',
  kind:'direct',placement:'popular',id:'addiesdive-ad2030'});
assert.equal(events.at(-1),'amazon:addiesdive-ad2030:popular',
  'Valid supplemental direct ASIN attribution must still work after blocking cross-model tags');
const validBeforeForgery=events.length;
for(const [url,rel] of [
  ['https://www.amazon.fr/dp/B0BG7VD5YL?tag=someone-else-21',
   'noopener noreferrer nofollow sponsored'],
  ['https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21&tag=drackk04-21',
   'noopener noreferrer nofollow sponsored'],
  ['https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21&subtag=personal-data',
   'noopener noreferrer nofollow sponsored'],
  ['https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21',
   'noopener noreferrer nofollow'],
  ['https://www.amazon.fr/dp/B0BG7VD5YL',
   'noopener noreferrer nofollow sponsored']
])trigger({url,rel,kind:'direct',placement:'showroom',id:'citizen-tsuyosa'});
assert.equal(events.length,validBeforeForgery,
  'Wrong tag, duplicated tag, forbidden params and mismatched disclosure cannot count as paid');
trigger({url:'https://www.shopskmei.com/product/skmei-2056-digital-sport-watch/',
  kind:'official',placement:'showroom'});
assert.equal(events.at(-1),'merchant:skmei-2056:showroom',
  'Source fallback click tracking must preserve its new showroom attribution');
const count=events.length;
for(const url of [
  'https://www.shopskmei.com.evil.example/product/skmei-2056/',
  'http://www.shopskmei.com/product/skmei-2056/',
  'https://www.amazon.fr/dp/B0C7W5NNX2',
  'https://www.shopskmei.com:8443/product/skmei-2056/',
  'https://paganidesign.com.attacker.example/products/pd-1776',
  'http://paganidesign.com/products/pd-1776'
]){
  trigger({url});
}
for(const forged of [
  awin.href.replace('www.awin1.com','www.awin1.com.evil.example'),
  awin.href.replace('awinmid=94513','awinmid=10001'),
  awin.href.replace('awinaffid=123456','awinaffid=000000')
])trigger({url:forged,kind:'partner',id:'addiesdive-ad2030'});
trigger({url:'https://www.shopskmei.com/product/skmei-2056/',id:'_bad'});
trigger({url:'https://www.shopskmei.com/product/skmei-2056/',placement:'unauthorised'});
assert.equal(events.length,count,'Forged merchant targets, wrong hosts, paths and IDs must not become analytics events');

// Instrumentation is deliberately a no-op when Umami is not connected.
const quiet={...context,window:{},document:{addEventListener:(name,handler)=>{if(name==='click')handler({target:{closest:()=>({
  href:'https://www.shopskmei.com/product/skmei-2056/',
  hasAttribute:n=>n==='data-merchant-official-id',
  dataset:{merchantOfficialId:'skmei-2056',merchantPlacement:'popular'}
})}})}}};
assert.doesNotThrow(()=>runInNewContext(source,quiet,{timeout:1000}));
console.log('Merchant analytics OK: approved hosts, Amazon compatibility, silent opt-out, no navigation rewrite');
