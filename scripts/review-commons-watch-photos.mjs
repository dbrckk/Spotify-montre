#!/usr/bin/env node
/**
 * Fail-closed Commons photo research queue.
 *
 * All images here are UNPUBLISHED candidates. Their Commons licence may allow
 * commercial reuse with attribution/share-alike, but family-level model names
 * do not prove the precise catalogue variant. This tool cannot grant rights,
 * download files, add srcset entries, or mark a product as photographed.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const norm=value=>String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
const safeText=value=>typeof value==='string'&&value.length>=3&&value.length<=350
  &&!/[<>\r\n]/.test(value);
const licenses=new Map([
  ['CC-BY-SA-3.0','https://creativecommons.org/licenses/by-sa/3.0/'],
  ['CC-BY-SA-4.0','https://creativecommons.org/licenses/by-sa/4.0/'],
  ['CC-BY-4.0','https://creativecommons.org/licenses/by/4.0/'],
  ['CC0-1.0','https://creativecommons.org/publicdomain/zero/1.0/']
]);

export function reviewCommonsCandidates({catalogue,rights,register}){
  if(!Array.isArray(catalogue?.products)||catalogue.products.length!==37||
     new Set(catalogue.products.map(p=>p.id)).size!==37||
     rights?.version!==1||!rights.photos||typeof rights.photos!=='object'||
     register?.version!==1||register.policy!=='research_only_no_auto_publishing'||
     register.sourceType!=='Wikimedia_Commons_file_pages_not_manufacturer_packshots'||
     !/^20\d{2}-\d{2}-\d{2}$/.test(register.reviewedOn||'')||
     !Array.isArray(register.candidates)||register.candidates.length<1)
    throw Error('Invalid or incomplete exact-model Commons research registries');
  const models=new Map(catalogue.products.map(p=>[p.id,p]));
  const unpublished=catalogue.products.filter(p=>!rights.photos[p.id]).length;
  const candidates=[];
  const seen=new Set();
  for(const item of register.candidates){
    if(!item||typeof item!=='object'||Array.isArray(item))
      throw Error('Invalid Commons candidate record');
    const p=models.get(item.modelId);
    if(!p||seen.has(item.modelId)||
       item.catalogModel!==p.model)
      throw Error('Commons candidate is unknown, published, duplicated or mismatched: '+item.modelId);
    seen.add(item.modelId);
    if(item.identityStatus!=='family_only_exact_variant_not_verified'||
       item.publicationAllowed!==false||
       !safeText(item.candidateModel)||!safeText(item.creator)||!safeText(item.reason))
      throw Error('Candidate must remain an unpublished, unverified variant: '+item.modelId);
    if(norm(item.candidateModel)===norm(p.model))
      throw Error('Claim of precise SKU requires independent variant review: '+item.modelId);
    if(!licenses.has(item.license)||item.licenseUrl!==licenses.get(item.license))
      throw Error('Commercially incompatible or unverified Commons licence: '+item.modelId);
    if(!/^[0-9a-f]{40}$/.test(item.sourceSha1||''))
      throw Error('Exact Commons source revision SHA-1 must be recorded: '+item.modelId);
    let url;
    try{url=new URL(item.filePage)}catch{throw Error('Invalid Commons file URL: '+item.modelId)}
    const filePath=decodeURIComponent(url.pathname);
    if(url.protocol!=='https:'||url.hostname!=='commons.wikimedia.org'||
       url.port||url.username||url.password||url.search||url.hash||
       !/^\/wiki\/File:[A-Za-z0-9_()-]+\.(?:jpe?g|png|webp)$/i.test(filePath)||
       !norm(filePath).includes(norm(item.candidateModel)))
      throw Error('Untrusted Commons file page or irrelevant photo: '+item.modelId);
    candidates.push({
      modelId:item.modelId,catalogModel:p.model,candidateModel:item.candidateModel,
      filePage:item.filePage,creator:item.creator,license:item.license,
      licenseUrl:item.licenseUrl,sourceSha1:item.sourceSha1,
      identityStatus:item.identityStatus,reason:item.reason,publicationAllowed:false,
      alreadyPublishedFromIndependentSource:Boolean(rights.photos[item.modelId])
    });
  }
  const active=candidates.filter(c=>!c.alreadyPublishedFromIndependentSource).length;
  if(active>unpublished)
    throw Error('Commons research exceeds the actual no-photo catalogue');
  const published=Object.keys(rights.photos).length;
  return {reviewedOn:register.reviewedOn,models:catalogue.products.length,
    published,unpublished,possibleCandidates:active,
    publicationAllowed:0,usage:'RESEARCH_ONLY_NO_AUTO_PUBLICATION',
    note:'These photos have Commons licence claims, not proof of an exact retail variant. Commercial use of a CC BY-SA image requires attribution, licence links and share-alike compliance for adaptations; this manifest does not publish photos or certify authorship.',
    candidates};
}

export function markdownCommonsReview(report){
  const lines=[
    '### Wikimedia Commons: photo candidates — research only','',
    '- Photo coverage: **'+report.published+'/'+report.models+'** supplemental watches',
    '- Still without photo: **'+report.unpublished+'**',
    '- Family-level Creative Commons candidates: **'+report.possibleCandidates+'**',
    '- Cleared for publication: **0** (full product SKU not yet independently verified)','',
    '| Exact catalogue reference | Commons family-level candidate | Licence | Decision |',
    '| --- | --- | --- | --- |',
    ...report.candidates.filter(c=>!c.alreadyPublishedFromIndependentSource).map(c=>'| '+c.catalogModel+' | [Photo by '
      c.creator.replaceAll('|','/')+']('+c.filePage+') | ['+
      c.license+']('+c.licenseUrl+') | No publication: exact variant unverified |'),
    '',report.note,''
  ];
  return lines.join('\n');
}

if(process.argv[1]&&
   resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==1||!['--markdown','--json'].includes(args[0]))
    throw Error('Usage: node scripts/review-commons-watch-photos.mjs --markdown|--json');
  const report=reviewCommonsCandidates({
    catalogue:read('site/selection-populaires.json'),
    rights:read('site/popular-photo-rights.json'),
    register:read('research/commons-watch-photo-candidates.json')
  });
  process.stdout.write(args[0]==='--json'
    ?JSON.stringify(report,null,2)+'\n':markdownCommonsReview(report)+'\n');
}
