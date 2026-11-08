import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadVerifiedPopularLinks} from './popular-verified-affiliate.mjs';
import {loadApprovedPopularPhotos} from './popular-photo-rights.mjs';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';

const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const exactId=/^[a-z0-9-]{4,64}$/;
const date=/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Single deterministic, PUBLIC statement of what the 52-watch editorial
 * catalogue actually knows. All money/stock/sale assertions fail closed:
 * documented ASIN != live offer; outbound click != attributed sale.
 * Existing validated research/permission loaders remain the authorities.
 */
export function buildCommercialRegistry({root,coreProducts,affiliates,coreAmazonLinks}){
  if(!Array.isArray(coreProducts)||coreProducts.length!==15||
      !(coreAmazonLinks instanceof Map)||!(affiliates?.links instanceof Map))
    throw Error('Commercial registry needs the validated 15-watch source and Amazon link map');
  const extra=read(join(root,'selection-populaires.json')).products;
  if(!Array.isArray(extra)||extra.length!==37)throw Error('Commercial registry expects 37 supplementary watches');
  const tracked=read(join(root,'affiliate-links.json'));
  const primaryEvidence=read(join(root,'../research/amazon-fr-exact-products.json'));
  const supplementalEvidence=read(join(root,'../research/amazon-fr-popular-verified.json'));
  if(primaryEvidence.version!==1||!date.test(primaryEvidence.checkedOn||'')||
      Object.keys(primaryEvidence.products||{}).length!==15||
      supplementalEvidence.version!==1||
      Object.keys(supplementalEvidence.verifiedProducts||{}).length!==14)
    throw Error('Commercial source snapshots are incomplete');
  if(affiliates.enabled!==tracked.enabled||affiliates.links.size!==Object.keys(tracked.links).length)
    throw Error('Commercial affiliate activation disagrees with the validated account state');

  const publishedPhotos=loadApprovedPopularPhotos({root,picks:extra});
  const exactSupplemental=loadVerifiedPopularLinks({
    root,picks:extra,affiliates,amazonPartnerTag:tracked.amazonPartnerTag
  });
  const awin=loadApprovedPartnerOffers({root,picks:extra});
  const knownIds=new Set([...coreProducts,...extra].map(p=>p.id));
  if(knownIds.size!==52)throw Error('Commercial model IDs cannot be duplicated');
  const knownPrimary=new Set(coreProducts.map(p=>p.id));
  const listedSupplemental=new Set(Object.keys(supplementalEvidence.verifiedProducts));
  if([...listedSupplemental].some(id=>!knownIds.has(id)||knownPrimary.has(id)))
    throw Error('Supplemental Amazon evidence must identify a real additional watch');

  // This is a different catalogue from the 52-item editorial collection.
  // The website has zero qualified direct-sale SKUs. Future activated supplier
  // SKUs must have their own reviewed commercial registry instead of silently
  // inheriting affiliate documentation.
  const directPath=join(root,'catalogue.json');
  if(existsSync(directPath)){
    const direct=read(directPath);
    if(!Array.isArray(direct.products)||direct.products.length!==0)
      throw Error('Qualified direct-sale SKUs require an explicit supplier/checkout integration');
  }
  const records=[];
  for(const p of [...coreProducts,...extra]){
    if(!exactId.test(p.id)||typeof p.officialUrl!=='string')
      throw Error('Unsafe catalogue identifier or missing vendor source');
    const vendor=new URL(p.officialUrl);
    if(vendor.protocol!=='https:'||vendor.username||vendor.password||vendor.port||vendor.hash)
      throw Error('Untrusted external watch source: '+p.id);
    const core=knownPrimary.has(p.id);
    const research=core?primaryEvidence.products[p.id]:supplementalEvidence.verifiedProducts[p.id]||null;
    if(core&&!research)throw Error('Missing core Amazon research record: '+p.id);
    const primary=core?coreAmazonLinks.get(p.id):null;
    const additional=core?null:exactSupplemental.get(p.id);
    const asin=core?(primary?.asin||null):(research?.asin||null);
    const affiliate=core?affiliates.links.get(p.id):additional;
    if((core?Boolean(primary):Boolean(research))!==Boolean(asin)||
      (affiliate&&(!asin||new URL(affiliate.url).pathname!=='/dp/'+asin)))
      throw Error('Commercial evidence ASIN/attribution mismatch: '+p.id);
    if(core&&primary&&(
      research.asin!==primary.asin||
      research.productUrl!=='https://www.amazon.fr/dp/'+asin||
      !['not_checked','unavailable_at_check'].includes(primary.availabilityAtCheck)))
      throw Error('Primary ASIN provenance mismatch: '+p.id);
    if(!core&&research&&additional&&(
      additional.asin!==research.asin||additional.verifiedAt!==research.verifiedAt))
      throw Error('Supplemental affiliate link differs from documented ASIN: '+p.id);
    if(!core&&Boolean(additional)!==(affiliates.enabled&&Boolean(research)))
      throw Error('Supplemental links fail closed when affiliate mode is disabled: '+p.id);
    const partner=core?null:awin.get(p.id)||null;
    const photo=core
      ?(p.photoReview?.publicUsageApproved===true&&
         p.photoReview.localUrl==='./assets/watches/'+p.id+'.webp')
      :publishedPhotos.has(p.id);
    const photoIndependentlyVerified=core
      ?p.photoReview?.permissionIndependentlyVerified===true
      :photo&&readPhotoProof(root,p.id);
    const observation=core?(primary?.availabilityAtCheck||'not_documented'):'not_documented';
    const purchasePath=affiliate?'documented_amazon_referral':
      partner?'documented_awin_referral':'external_source_only';
    const referralUrl=affiliate?.url||null;
    if(referralUrl){
      const uri=new URL(referralUrl);
      if(uri.protocol!=='https:'||uri.hostname!=='www.amazon.fr'||
         uri.pathname!=='/dp/'+asin||uri.searchParams.getAll('tag').length!==1||
         uri.searchParams.get('tag')!==tracked.amazonPartnerTag)
        throw Error('Paid Amazon destination does not match the exact sourced watch: '+p.id);
    }
    records.push({
      id:p.id,brand:p.brand,model:p.model,collection:core?'core':'supplemental',
      vendorSourceUrl:p.officialUrl,
      amazon:{
        asin,documented:asin!==null,
        sourceCheckedOn:asin?(core?primaryEvidence.checkedOn:research.verifiedAt):null,
        evidenceKind:asin?(core?'dated_model_match':research.evidenceType):null,
        observedAvailability:observation,
        currentAvailability:'not_verified',
        referralActive:Boolean(referralUrl),referralUrl,
        // The regional edition can differ from the canonical model.
        variantNote:core?null:additional?.marketplaceVariant||research?.marketplaceVariant||null
      },
      photo:{
        published:photo,
        permission:photo?'declared_by_owner_or_rights_source':'no_published_photo',
        independentlyVerified:photo&&photoIndependentlyVerified
      },
      partner:partner?{program:'awin',referralUrl:partner.url,sourceCheckedOn:partner.verifiedAt}:null,
      purchasePath,
      directSale:{eligible:false,reason:'no_qualified_supplier_offer_and_payment_checkout_inactive'},
      commission:{confirmed:false,evidence:'official_program_report_required'}
    });
  }
  const counts={
    total:records.length,core:15,supplemental:37,
    documentedAmazonAsins:records.filter(p=>p.amazon.documented).length,
    activeExactAmazonReferrals:records.filter(p=>p.amazon.referralActive).length,
    historicallyUnavailable:records.filter(p=>p.amazon.observedAvailability==='unavailable_at_check').length,
    activeAwinReferrals:records.filter(p=>p.partner!==null).length,
    imagePublished:records.filter(p=>p.photo.published).length,
    directSaleEligible:records.filter(p=>p.directSale.eligible).length
  };
  if(counts.total!==52||counts.documentedAmazonAsins!==13+Object.keys(supplementalEvidence.verifiedProducts).length||
     counts.historicallyUnavailable!==4||
     counts.activeExactAmazonReferrals!==affiliates.links.size+exactSupplemental.size||
     counts.activeAwinReferrals!==awin.size||counts.directSaleEligible!==0)
    throw Error('Commercial status counts contradict the two documented source catalogues');
  const registry={
    version:1,scope:'editorial_watch_purchase_evidence_not_live_offers',
    sourceFiles:[
      'selection-affiliation.json','selection-populaires.json',
      '../research/amazon-fr-exact-products.json',
      '../research/amazon-fr-popular-verified.json',
      'affiliate-links.json','popular-photo-rights.json',
      '../research/partner-affiliate-offers.json'
    ],
    notes:'ASIN matching and declared photo rights do not establish current price, stock, legal photo licence, eligible sale, or commission.',
    counts,products:records
  };
  writeFileSync(join(root,'commercial-registry.json'),JSON.stringify(registry,null,2)+'\n');
  return new Map(records.map(r=>[r.id,r]));
}

function readPhotoProof(root,id){
  const photo=read(join(root,'popular-photo-rights.json')).photos[id];
  return photo?.permissionIndependentlyVerified===true&&
    ['rights_holder_written_commercial_permission','site_original_photograph'].includes(photo.rightsBasis);
}
