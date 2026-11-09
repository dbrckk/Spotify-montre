#!/usr/bin/env node
/**
 * R1 evidence register — source inventory only.
 * No network, no private documents, no personal identities, no claims of
 * authenticated trademark/photo permissions or commercial eligibility.
 */
import {readFileSync,appendFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const json=path=>JSON.parse(read(path));
const core=json('site/selection-affiliation.json').products;
const extra=json('site/selection-populaires.json').products;
const photoRegister=json('site/popular-photo-rights.json').photos;
const affiliate=json('site/affiliate-links.json');
const awin=json('research/partner-affiliate-offers.json');
const legal=read('site/informations-legales.html');
const ids=new Set([...core,...extra].map(w=>w.id));
if(core.length!==15||extra.length!==37||ids.size!==52)
  throw Error('R1 photo audit requires 52 distinct documented watches');
if(Object.keys(photoRegister).some(id=>!ids.has(id)||!extra.some(p=>p.id===id)))
  throw Error('Photo evidence references unknown or core-only model');

const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const published=[];
const unpublished=[];
const photoRows=[...core.map(p=>{
  const item=p.photoReview||{};
  const isPublished=item.publicUsageApproved===true;
  if(isPublished&&(!sha(item.localSha256)||item.localUrl!=='./assets/watches/'+p.id+'.webp'
    ||typeof item.source!=='string'||!item.source.startsWith('https://')))
    throw Error('Missing core photo source/hash for '+p.id);
  return {id:p.id,brand:p.brand,model:p.model,collection:'core',
    photoPublished:isPublished,sourcePage:isPublished?item.source:null,
    photoPath:isPublished?item.localUrl:null,imageSha256:isPublished?item.localSha256:null,
    rightsBasis:isPublished?(item.licence||'owner_declaration'):null,
    rightsHolder:isPublished?(item.provider||p.brand):null,
    registryClaimsIndependentVerification:isPublished&&item.permissionIndependentlyVerified===true};
}),...extra.map(p=>{
  const item=photoRegister[p.id];
  if(item&&(!sha(item.imageSha256)||item.file!=='assets/watches-popular/'+p.id+'.webp'
    ||typeof item.sourcePage!=='string'||!item.sourcePage.startsWith('https://')
    ||item.rightsHolder!==p.brand))
    throw Error('Missing supplemental photo evidence or unexpected holder for '+p.id);
  return {id:p.id,brand:p.brand,model:p.model,collection:'supplemental',
    photoPublished:!!item,sourcePage:item?.sourcePage||null,
    photoPath:item?.file||null,imageSha256:item?.imageSha256||null,
    rightsBasis:item?.rightsBasis||null,rightsHolder:item?.rightsHolder||null,
    registryClaimsIndependentVerification:!!item&&item.permissionIndependentlyVerified===true};
})].map(row=>({
  ...row,
  // A source declaration or even a recorded hash cannot authenticate the
  // underlying contract. That sign-off must remain human and external.
  legalSignOff:'EXTERNAL_PROOF_REQUIRED',
  nextAction:row.photoPublished
    ?'Conserver hors GitHub la permission écrite ou le contrat couvrant cette image exacte, l’affiliation, l’hébergement local, le territoire et la durée ; faire contrôler les droits.'
    :'Obtenir une photo du modèle exact avec droit de publication documenté, sinon conserver la présentation sans photo.'
}));
for(const row of photoRows)(row.photoPublished?published:unpublished).push(row);
const brands=[...new Set(photoRows.map(row=>row.brand))].sort((a,b)=>a.localeCompare(b,'fr'))
  .map(brand=>({brand,total:photoRows.filter(row=>row.brand===brand).length,
    published:published.filter(row=>row.brand===brand).length,
    missing:unpublished.filter(row=>row.brand===brand).length,
    sourceVerificationClaims:published.filter(row=>row.brand===brand&&row.registryClaimsIndependentVerification).length}));
const legalIdentityIncomplete=/Informations d'identification incomplètes|n'ont pas encore été fournis pour publication/.test(legal);
const legalNoIndex=/<meta name="robots" content="noindex,follow">/.test(legal);
const result={
  schemaVersion:1,reportKind:'r1-evidence-register-source-only',
  provenance:'GitHub files only; no external photo agreements, identities, affiliate dashboards or financial records accessed',
  totals:{models:photoRows.length,published:published.length,unpublished:unpublished.length,
    registryClaimsIndependentPhotoVerification:published.filter(p=>p.registryClaimsIndependentVerification).length,
    authenticatedPhotoPermissions:null},
  legal:{publisherIdentification:legalIdentityIncomplete?'BLOCKED':'EXTERNAL_PROOF_REQUIRED',
    pageNoIndex:legalNoIndex,reviewRequired:true,
    missingExternalInputs:['Véritable identité et statut de l’éditeur','Coordonnées professionnelles applicables',
      'Immatriculation et fiscalité selon le statut','Relecture RGPD, affiliation et informations d’hébergement']},
  partners:{amazonApprovedBySource:affiliate.approved===true,
    amazonRevenueIndependentlyConfirmed:null,
    awinPublisherApprovedBySource:awin.publisherApproved===true,
    awinOffersInSource:Object.keys(awin.offers||{}).length,
    cjExactLandedQuoteConfirmed:null},
  brands,photos:photoRows,
  release:{r1LegallySignedOff:false,monetizationConfirmed:false,directSaleApproved:false},
  caveats:['Droit déclaré != licence indépendante vérifiée. Les pièces de preuve restent privées.',
    'Les valeurs null représentent des informations inconnues, pas des zéros.',
    'Une empreinte SHA-256 d’image prouve l’intégrité, jamais une autorisation de reproduction.',
    'Ce rapport ne retire ni publie de photos et ne modifie aucune offre.']
};
const csvValue=x=>'"'+String(x??'').replaceAll('"','""').replace(/[\r\n]+/g,' ')+'"';
const csvColumns=['id','brand','model','collection','photoPublished','sourcePage',
  'photoPath','imageSha256','rightsBasis','rightsHolder','registryClaimsIndependentVerification',
  'legalSignOff','nextAction'];
const csv=[csvColumns.join(','),...photoRows.map(p=>csvColumns.map(k=>csvValue(p[k])).join(','))].join('\n')+'\n';
const markdown=[
  '# Atelier Montres — registre R1 des preuves à réunir',
  '',
  '> Inventaire technique **en lecture seule**, pas une validation juridique, commerciale ou des licences.',
  '',
  '- '+photoRows.length+' modèles ; '+published.length+' photographies publiées ; '+unpublished.length+' sans photo locale.',
  '- '+result.totals.registryClaimsIndependentPhotoVerification+' déclarations de vérification indépendante dans les registres ; **preuve externe non consultée**.',
  '- Identité éditeur : **'+result.legal.publisherIdentification+'** ; blocage R1 maintenu.',
  '- Awin : '+result.partners.awinOffersInSource+' offres dans le dépôt ; revenus Amazon non vérifiés.',
  '',
  '| Marque | Modèles | Photos publiées | Sans photo | Déclarations vérifiées dans le registre |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...brands.map(b=>'| '+b.brand+' | '+b.total+' | '+b.published+' | '+b.missing+' | '+b.sourceVerificationClaims+' |'),
  '',
  '## Actions vérifiables',
  '1. Contacter les ayants droit par marque, en fournissant les références et les URLs sources dans l’export CSV. Demander un accord couvrant chaque fichier et son usage commercial sur ce site.',
  '2. Conserver les contrats et pièces nominatives **hors du dépôt public** ; faire contrôler périmètre, durée, territoire, révocation et éventuels droits de tiers.',
  '3. Compléter les informations légales avec des données réelles et examiner les obligations applicables au statut de l’éditeur.',
  '4. Prouver séparément l’éligibilité des programmes et les commissions réellement versées : ce rapport n’en atteste aucune.',
  '',
  'Exporter la liste des 52 modèles : `npm run compliance:r1:csv`. Vérifier sa cohérence : `npm run compliance:r1:check`.',
  '',
  '**R1 non validé.** Ne pas activer l’achat direct sur cette base.'
].join('\n').replaceAll('`','`')+'\n';
const modes=['--json','--csv'].filter(flag=>process.argv.includes(flag));
if(modes.length>1)throw Error('Choose one output mode');
if(modes[0]==='--json')process.stdout.write(JSON.stringify(result,null,2)+'\n');
else if(modes[0]==='--csv')process.stdout.write(csv);
else process.stdout.write(markdown);
if(process.argv.includes('--ci-summary')&&process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
