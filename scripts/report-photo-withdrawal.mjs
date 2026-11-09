#!/usr/bin/env node
/**
 * R1 watch-photo withdrawal impact: READ-ONLY. Never changes published
 * photographs, registry declarations, partner links, deployment or CDN.
 */
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const site=join(root,'site');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const core=read('site/selection-affiliation.json').products;
const extra=read('site/selection-populaires.json').products;
const rights=read('site/popular-photo-rights.json').photos;
const watches=[...core.map(p=>({
  id:p.id,brand:p.brand,model:p.model,kind:'core',
  published:p.photoReview?.publicUsageApproved===true,
  registry:'site/selection-affiliation.json',
  source:p.photoReview?.source||p.officialUrl
})),...extra.map(p=>({
  id:p.id,brand:p.brand,model:p.model,kind:'supplemental',
  published:!!rights[p.id],
  registry:'site/popular-photo-rights.json',
  source:rights[p.id]?.sourcePage||p.officialUrl
}))];
if(watches.length!==52||new Set(watches.map(p=>p.id)).size!==52)
  throw Error('Unexpected catalogue scope');
if(Object.keys(rights).some(id=>!extra.some(p=>p.id===id)))
  throw Error('Rights register references an unknown watch');

const walk=dir=>existsSync(dir)?readdirSync(dir,{withFileTypes:true})
  .flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):
    entry.isFile()?[join(dir,entry.name)]:[]):[];
const files=walk(site);
const mediaDirs='(?:watches|watches-popular|watch-responsive|popular-responsive|watch-thumbs)';
const media=files.map(f=>relative(root,f).replaceAll('\\','/'))
  .filter(p=>new RegExp('^site/assets/'+mediaDirs+'/').test(p));
const texts=[...files.filter(p=>/\.(?:html|js|json|css|xml)$/.test(p)),
  ...walk(join(root,'docs')).filter(p=>/deploy-package-\d+\.json$/.test(p))]
  .map(p=>({path:relative(root,p).replaceAll('\\','/'),text:readFileSync(p,'utf8')}));
const records=watches.map(w=>{
  if(!/^[a-z0-9-]{4,64}$/.test(w.id))throw Error('Invalid identifier');
  const suffix=new RegExp('/'+w.id+'(?:-\\d+)?\\.webp$');
  const assets=media.filter(p=>suffix.test(p)).sort();
  const expected='site/assets/'+(w.kind==='core'?'watches':'watches-popular')+'/'+w.id+'.webp';
  if(w.published&&!assets.includes(expected))
    throw Error('Published photo missing: '+w.id);
  if(!w.published&&assets.length)
    throw Error('Orphaned photo media for unpublished watch: '+w.id);
  const pattern=new RegExp('assets/'+mediaDirs+'/'+w.id+'(?:-\\d+)?\\.webp');
  const refs=texts.filter(x=>pattern.test(x.text)).map(x=>x.path).sort();
  return {...w,sourceAsset: w.published?expected:null,
    assets,referencingFiles:refs,
    blockers:[
      w.kind==='core'
        ?'The main-catalogue photo flag and validators must be adapted before deletion'
        :'The supplemental photo registry entry and automatic source resync must be prevented from restoring the removed image',
      'Delete the original, thumbnails and responsive variants without affecting other watches',
      'Rebuild catalogue pages, collections, asset manifests and deployment packages',
      'Verify rendered pages and direct image URLs on the actual host, including CDN caches',
      'Document the rights-holder complaint, independent review and deployment proof privately'
    ],
    executed:false,rightsClearanceConfirmed:false,liveRemovalConfirmed:false,
    cdnInvalidationConfirmed:null
  };
});
const args=process.argv.slice(2);
const options=new Set(['--list','--all','--id','--json']);
if(args.some(a=>a.startsWith('--')&&!options.has(a)))throw Error('Unknown option');
const n=x=>args.filter(y=>y===x).length;
if([...options].some(x=>n(x)>1))throw Error('Duplicate option');
if(['--list','--all','--id'].filter(x=>args.includes(x)).length>1)
  throw Error('Conflicting modes');
const ix=args.indexOf('--id');
const id=ix<0?null:args[ix+1];
if(ix>=0&&(!id||!/^[a-z0-9-]{4,64}$/.test(id)))throw Error('Invalid watch id');
if(args.some(x=>!options.has(x)&&x!==id))throw Error('Unexpected argument');
const selected=id?records.filter(x=>x.id===id):args.includes('--all')?records:null;
if(id&&!selected.length)throw Error('Unknown watch id');
if(args.includes('--json')&&!selected)throw Error('--json requires --id or --all');

if(selected){
  if(args.includes('--json'))process.stdout.write(JSON.stringify({
    version:1,kind:'photo-withdrawal-impact-read-only',changesApplied:false,
    realRemovalConfirmed:false,records:selected
  },null,2)+'\n');
  else for(const r of selected){
    process.stdout.write('# Impact du retrait photo : '+r.brand+' '+r.model+'\n\n'+
      'Statut : '+(r.published?'photo publiée':'pas de photo publiée')+
      '. Aucune suppression effectuée.\n'+
      'Registre : '+r.registry+'\n\nFichiers locaux à retirer :\n'+
      r.assets.map(p=>'- '+p).join('\n')+'\n\n'+
      'Pages et archives faisant référence au média :\n'+
      r.referencingFiles.map(p=>'- '+p).join('\n')+'\n\n'+
      'Points bloquants :\n'+r.blockers.map((b,i)=>(i+1)+'. '+b).join('\n')+
      '\n\nCette analyse ne constitue pas une preuve de retrait en production.\n');
  }
}else{
  process.stdout.write('# Cartographie des retraits photo : lecture seule\n\n'+
    '| Modèle | Photo | Fichiers médias | Références |\n| --- | --- | ---: | ---: |\n'+
    records.map(r=>'| '+r.brand+' '+r.model+' | '+(r.published?'publiée':'absente')+
      ' | '+r.assets.length+' | '+r.referencingFiles.length+' |').join('\n')+
    '\n\nPour voir le plan précis : npm run compliance:photo:impact -- --id skmei-1251.\n'+
    'Un retrait doit être validé et publié séparément, puis contrôlé chez Render.\n');
}
