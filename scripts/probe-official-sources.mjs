#!/usr/bin/env node
/**
 * Run AFTER report-merchant-evidence.mjs --write-artifacts.
 * This probes at most 10 priority official manufacturer URL endpoints.
 */
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {probeOfficialSources} from './official-source-http-probe.mjs';

const root=resolve(import.meta.dirname,'..');
const planPath=join(root,'artifacts/merchant-evidence-action-plan.json');
const plan=JSON.parse(readFileSync(planPath,'utf8'));
if(plan.schemaVersion!==1||plan.kind!=='merchant-evidence-read-only-action-plan'||
   !Array.isArray(plan.rows)||plan.rows.length!==52)
  throw Error('Generate a validated 52-watch documentary action plan before probing');
const response=await probeOfficialSources({rows:plan.rows});
const counts=response.counts;
const needsReview=response.results.filter(p=>
  ['source_http_not_found','invalid_source_url','redirect_requires_manual_review',
    'redirect_without_location','redirect_limit'].includes(p.outcome));
const markdown=[
  '# Atelier Montres — disponibilité HTTP des pages source prioritaires',
  '',
  '> Contrôle externe ponctuel ('+response.checkedAt+') de **'+response.sampleSize+
    ' pages source officielles prioritaires**, pas des offres Amazon, ni des stocks.',
  '',
  '- HTTP 2xx : **'+(counts.reachable_http||0)+'** (réponse HTTP seulement ; référence exacte non confirmée).',
  '- HTTP 404/410 : **'+(counts.source_http_not_found||0)+'** (source à revoir manuellement).',
  '- Accès restreint / limitation : **'+(counts.restricted_or_rate_limited||0)+'** (statut indéterminé).',
  '- Autres problèmes réseau, redirections ou réponses : **'+
    (response.sampleSize-(counts.reachable_http||0)-
     (counts.source_http_not_found||0)-
     (counts.restricted_or_rate_limited||0))+'** (statut indéterminé).',
  '',
  '## Liens nécessitant une revue humaine de la destination',
  ...(needsReview.length?needsReview.map(p=>'- '+p.brand+' '+p.model+' ('+p.id+
    ') — '+p.outcome+' ; URL enregistrée : '+p.originalUrl):
    ['Aucune anomalie de destination confirmée dans cet échantillon.']),
  '',
  '**Attention :** Amazon, le prix, les stocks, la variante vendue, les taxes et les commissions n’ont pas été vérifiés. Les sites sources peuvent bloquer les robots ; un refus ne déclenche aucune modification de fiche.',
].join('\n')+'\n';
if(process.argv.includes('--write-artifacts')){
  const dir=join(root,'artifacts');
  mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'official-source-http-probe.json'),JSON.stringify(response,null,2)+'\n');
  writeFileSync(join(dir,'official-source-http-probe.md'),markdown);
}
if(process.argv.includes('--ci-summary')&&process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(response,null,2)+'\n');
else process.stdout.write(markdown);
