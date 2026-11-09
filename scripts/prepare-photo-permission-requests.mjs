#!/usr/bin/env node
/**
 * Brand-scoped UNSENT photo permission requests. Read-only; no addresses,
 * network, emails or claims of legal/photo-rights clearance.
 */
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const source=spawnSync(process.execPath,
  [join(root,'scripts/report-r1-evidence.mjs'),'--json'],
  {cwd:root,encoding:'utf8',timeout:15000});
if(source.status!==0||source.stderr)
  throw Error('R1 source inventory not available');
const evidence=JSON.parse(source.stdout);
if(evidence.reportKind!=='r1-evidence-register-source-only'||evidence.photos.length!==52)
  throw Error('Invalid source evidence coverage');

const groupName=brand=>/^Casio(?: Edifice| G-SHOCK)?$/i.test(brand)?'Casio':brand;
const map=new Map();
for(const p of evidence.photos){
  if(!/^https:\/\//.test(p.modelPage||'')||p.legalSignOff!=='EXTERNAL_PROOF_REQUIRED')
    throw Error('Invalid exact-model source or unexpected sign-off: '+p.id);
  const name=groupName(p.brand);
  if(!map.has(name))map.set(name,{brand:name,displayedBrands:new Set(),photos:[]});
  const g=map.get(name);
  g.displayedBrands.add(p.brand);
  g.photos.push(p);
}
const groups=[...map.values()].map(g=>({
  brand:g.brand,
  displayedBrands:[...g.displayedBrands].sort((a,b)=>a.localeCompare(b,'fr')),
  photos:g.photos.sort((a,b)=>a.model.localeCompare(b.model,'fr')),
  total:g.photos.length,
  published:g.photos.filter(p=>p.photoPublished).length,
  missing:g.photos.filter(p=>!p.photoPublished).length
})).sort((a,b)=>a.brand.localeCompare(b.brand,'fr'));
if(groups.reduce((n,g)=>n+g.total,0)!==52||groups.reduce((n,g)=>n+g.published,0)!==40)
  throw Error('R1 photo baseline changed; review the original evidence register');

const args=process.argv.slice(2);
const valid=new Set(['--list','--all','--brand','--json']);
if(args.some(a=>a.startsWith('--')&&!valid.has(a)))throw Error('Unknown option');
const count=s=>args.filter(a=>a===s).length;
if([...valid].some(x=>count(x)>1))throw Error('Duplicated option');
if(['--list','--all','--brand'].filter(x=>args.includes(x)).length>1)
  throw Error('Select one request mode');
const bi=args.indexOf('--brand');
const input=bi<0?null:args[bi+1];
if(bi>=0&&(!input||input.startsWith('--')||!input.trim()))
  throw Error('Use --brand followed by a known brand');
const allowedArgs=new Set([...valid]);
if(input)allowedArgs.add(input);
if(args.some(a=>!allowedArgs.has(a)))throw Error('Unexpected argument');
const selected=input
  ?groups.filter(g=>[g.brand,...g.displayedBrands].some(name=>
    name.localeCompare(input.trim(),'fr',{sensitivity:'base'})===0))
  :args.includes('--all')?groups:null;
if(input&&selected.length!==1)throw Error('Unknown brand; use --list');
if(args.includes('--json')&&!selected)throw Error('--json needs --all or --brand');

const draft=g=>{
  const lines=[
    '## '+g.brand+' — '+g.total+' références, '+g.published+' photos publiées',
    '',
    '**Brouillon non envoyé.** Vérifier les coordonnées du destinataire habilité avant tout contact.',
    '',
    '**Objet :** Demande de confirmation écrite — visuels '+g.brand+' — Atelier Montres',
    '',
    'Bonjour,',
    '',
    'Nous souhaitons documenter une autorisation écrite vérifiable pour les visuels du site https://atelier-montres-selection-fr.onrender.com/. L’exploitant a déclaré disposer d’accords avec des marques, mais les justificatifs n’ont pas été vérifiés indépendamment. Ce message ne présume ni de votre qualité d’ayant droit ni de l’existence d’une licence signée.',
    '',
    'Merci de confirmer, si vous êtes habilité à le faire, les fichiers précis couverts, l’usage éditorial et affilié, l’hébergement local, la conversion WebP et le redimensionnement, le territoire, la durée, les crédits exigés, la révocation et les éventuels droits de photographes, agences ou distributeurs.',
    '',
    '### Images déjà publiées — justificatifs demandés',
    ''
  ];
  for(const p of g.photos.filter(p=>p.photoPublished)){
    lines.push('- **'+p.brand+' '+p.model+'** (§'+p.id+'§)',
      '  - Référence fabricant/vendeur : '+p.modelPage,
      '  - Source photo déclarée : '+p.sourcePage,
      '  - Fichier local : §'+p.photoPath+'§',
      '  - SHA-256 image : §'+p.imageSha256+'§',
      '  - Base déclarée (non vérifiée indépendamment) : §'+p.rightsBasis+'§',
      '');
  }
  const missing=g.photos.filter(p=>!p.photoPublished);
  if(missing.length){
    lines.push('### Modèles sans photographie sur notre site — droit préalable à demander','');
    for(const p of missing)lines.push('- **'+p.brand+' '+p.model+'** (§'+p.id+'§) — '+p.modelPage);
    lines.push('','Pour ces références, aucune nouvelle photo ne sera ajoutée sans source exacte et autorisation documentée.','');
  }
  lines.push('Pouvez-vous nous transmettre vos conditions écrites ou le contact du titulaire compétent ?',
    '',
    'Cordialement,',
    'Équipe éditoriale Atelier Montres',
    '',
    '> À traiter hors GitHub : conserver la réponse dans un espace privé et vérifier indépendamment l’identité du signataire, le mandat et les usages autorisés. Une réponse n’active pas automatiquement un droit ni le jalon R1.',
    '');
  return lines.join('\n').replaceAll('§','§');
};
const list=[
  '# Atelier Montres — demandes de droits photo R1 (non envoyées)','',
  '> Source publique, brouillons seulement. Aucun contact effectué ni droit vérifié.',
  '',
  '| Marque | Modèles | Photos publiées | Sans photo |',
  '| --- | ---: | ---: | ---: |',
  ...groups.map(g=>'| '+g.brand+' | '+g.total+' | '+g.published+' | '+g.missing+' |'),
  '',
  'Casio, Edifice et G-SHOCK sont regroupés sans présumer de la propriété juridique de chaque image.',
  'Exemple : §npm run compliance:r1:requests -- --brand "SKMEI"§.',
  'Export total : §npm run compliance:r1:requests -- --all§.',
  ''
].join('\n').replaceAll('§','§');
if(!selected)process.stdout.write(list.replaceAll('§','§').replaceAll('§',String.fromCharCode(96))+'\n');
else if(args.includes('--json'))process.stdout.write(JSON.stringify({
  schemaVersion:1,reportKind:'unsent-photo-rights-requests',
  automaticSending:false,legalClearanceConfirmed:false,
  totalModels:selected.reduce((n,g)=>n+g.total,0),
  totalPublished:selected.reduce((n,g)=>n+g.published,0),
  packets:selected.map(g=>({...g,transmitted:false,legalClearanceConfirmed:false,
    draft:draft(g).replaceAll('§',String.fromCharCode(96))}))
},null,2)+'\n');
else process.stdout.write('# Atelier Montres — brouillons NON envoyés\n\n'
  +selected.map(g=>draft(g).replaceAll('§',String.fromCharCode(96))).join('\n---\n\n')+'\n');
