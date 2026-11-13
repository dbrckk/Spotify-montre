#!/usr/bin/env node
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {buildSourceEvidenceReview} from './source-evidence-review.mjs';
import {buildMerchantEvidenceActionPlan} from './merchant-evidence-action-plan.mjs';

const root=resolve(import.meta.dirname,'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const core=read('site/selection-affiliation.json').products;
const extra=read('site/selection-populaires.json').products;
const coreResearch=read('research/amazon-fr-exact-products.json').products;
const supplemental=read('research/amazon-fr-popular-verified.json').verifiedProducts;
const photoRights=read('site/popular-photo-rights.json').photos;
const asOfArgument=process.argv.find(a=>a.startsWith('--as-of='));
const asOf=asOfArgument?asOfArgument.slice('--as-of='.length):
  new Date().toISOString().slice(0,10);
const review=buildSourceEvidenceReview({coreResearch,supplemental,
  catalogIds:new Set([...core,...extra].map(p=>p.id)),asOf});
const plan=buildMerchantEvidenceActionPlan({
  coreProducts:core,extraProducts:extra,photoRights,sourceReview:review,coreResearch
});
const csvFields=['id','brand','model','tier','collection','modelUrl','officialUrl',
  'documentedAsin','evidenceKind','evidenceCheckedOn','ageDays',
  'daysUntilReview','needsDocumentaryReview','documentaryReviewSoon',
  'historicallyUnavailable','comparatorOnly','merchantPriority','merchantAction',
  'photoPublished','rightsIndependentlyVerifiedClaim','photoAction'];
const csvCell=v=>'"'+String(v??'').replaceAll('"','""').replace(/[\r\n]+/g,' ')+'"';
const csv=[csvFields.join(','),...plan.rows.map(r=>csvFields.map(f=>csvCell(r[f])).join(','))].join('\n')+'\n';
const t=plan.totals;
const important=plan.rows.filter(p=>p.merchantPriority<=2);
const markdown=[
 '# Atelier Montres — vérifications marchandes à effectuer',
 '',
 '> État documentaire au **'+plan.asOf+'** ; ceci ne certifie ni prix, ni stock, ni livraison, ni ventes, ni droits de reproduction. **Aucun statut marchand n’est modifié automatiquement.**',
 '',
 '- **'+t.watches+'** montres ; **'+t.documentedAsins+'** correspondances ASIN historiques ; **'+t.noDocumentedAsin+'** sans ASIN documenté.',
 '- **'+t.historicallyUnavailable+'** fiches historiquement signalées indisponibles (**ne prouve pas le stock actuel**) ; **'+t.comparatorOnly+'** rapprochements indirects par comparateur.',
 '- **'+t.documentaryDue+'** correspondances ayant atteint '+plan.reviewIntervalDays+' jours ; **'+t.documentaryDueSoon+'** bientôt à recontrôler sous 14 jours.',
 '- **'+t.photosPublished+'** photos locales ; **'+t.photosMissing+'** références sans photo ; **'+t.independentRightsClaims+'** mentions de vérification indépendante dans le registre. Les licences restent à justifier hors dépôt.',
 '',
 '## Priorité de recontrôle marchand (documentaire, non commerciale)',
 '',
 '| Référence | Priorité | Preuve | Prochaine action |',
 '| --- | --- | --- | --- |',
 ...important.map(p=>'| '+p.brand+' '+p.model+' (`'+p.id+'`) | P'+p.merchantPriority+
   ' | '+(p.documentedAsin||'Aucune')+' · '+(p.evidenceCheckedOn||'sans date')+
   ' | '+p.merchantAction.replaceAll('|','/').replaceAll('\n',' ')+' |'),
 '',
 '## Photos manquantes (ne jamais substituer une autre référence)',
 ...plan.rows.filter(p=>!p.photoPublished).map(p=>'- '+p.brand+' '+p.model+' (`'+p.id+'`)'+
   (p.documentedAsin?' · ASIN documenté '+p.documentedAsin:'')),
 '',
 '**Pour agir** : télécharger le CSV détaillé de 52 lignes dans les artifacts du workflow GitHub, vérifier chaque source et variante manuellement, puis mettre à jour les registres avec une preuve réellement datée. Les dates existantes ne sont jamais prolongées par ce rapport.'
].join('\n')+'\n';
if(process.argv.includes('--write-artifacts')){
  const folder=join(root,'artifacts');
  mkdirSync(folder,{recursive:true});
  writeFileSync(join(folder,'merchant-evidence-action-plan.json'),JSON.stringify(plan,null,2)+'\n');
  writeFileSync(join(folder,'merchant-evidence-action-plan.csv'),csv);
  writeFileSync(join(folder,'merchant-evidence-action-plan.md'),markdown);
}
if(process.argv.includes('--ci-summary')&&process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(plan,null,2)+'\n');
else if(process.argv.includes('--csv'))process.stdout.write(csv);
else process.stdout.write(markdown);
