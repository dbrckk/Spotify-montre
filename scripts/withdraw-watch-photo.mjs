#!/usr/bin/env node
/**
 * Emergency removal of an EXACT documented watch photo from source and
 * generated storefront. No sale, payment, order, email, hosting or CDN action.
 *
 * Apply only on a temporary branch/worktree; never on public main. The
 * operator must review and merge the resulting pull request after CI.
 */
import {readFileSync,writeFileSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const site=join(root,'site');
const load=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const save=(p,v)=>writeFileSync(join(root,p),JSON.stringify(v,null,2)+'\n');
const args=process.argv.slice(2);
const ix=args.indexOf('--id');
const id=ix>=0?args[ix+1]:null;
const applying=args.includes('--apply');
const conf=ix>=0?args[args.indexOf('--confirm')+1]:null;
const accept=new Set(['--id','--apply','--confirm']);
if(!/^[a-z0-9-]{4,64}$/.test(id||'')||
   args.filter(x=>x==='--id').length!==1||
   args.filter(x=>x==='--apply').length>1||
   args.filter(x=>x==='--confirm').length>1||
   args.some(x=>x.startsWith('--')&&!accept.has(x))||
   args.some(x=>!accept.has(x)&&x!==id&&x!==conf)||
   (applying?conf!=='RETIRER:'+id:args.includes('--confirm')))
  throw Error('Usage: --id <existing-id> [--apply --confirm RETIRER:<existing-id>]');
const core=load('site/selection-affiliation.json');
const extra=load('site/selection-populaires.json');
const rights=load('site/popular-photo-rights.json');
const blocks=load('site/photo-takedowns.json');
if(core.products.length!==15||extra.products.length!==37||blocks.version!==1||
   !Array.isArray(blocks.retired)||new Set(blocks.retired.map(x=>x.id)).size!==blocks.retired.length)
  throw Error('Source catalogue or takedown register invalid');
const target=core.products.find(p=>p.id===id)||extra.products.find(p=>p.id===id);
if(!target)throw Error('Unknown watch ID');
if(blocks.retired.some(x=>x.id===id))throw Error('Photo already retired: '+id);
const isCore=core.products.includes(target);
const photo=isCore?target.photoReview:rights.photos[id];
const published=isCore?photo?.publicUsageApproved===true:!!photo;
if(!published)throw Error('No published photo for '+id+'; nothing can be withdrawn');
const expected='site/assets/'+(isCore?'watches':'watches-popular')+'/'+id+'.webp';
const original=join(root,expected);
if(!existsSync(original))throw Error('Refusing incomplete source: '+expected);
const proof=isCore?photo.localSha256:photo.imageSha256;
if(!/^[a-f0-9]{64}$/i.test(proof||'')||
   createHash('sha256').update(readFileSync(original)).digest('hex')!==proof.toLowerCase())
  throw Error('Original image checksum mismatch; no mutation allowed');
const dirs=['watches','watches-popular','watch-responsive','popular-responsive','watch-thumbs'];
const media=dirs.flatMap(dir=>{
  const dirPath=join(site,'assets',dir);
  return existsSync(dirPath)?readdirSync(dirPath)
    .filter(n=>n===id+'.webp'||new RegExp('^'+id+'-\\d+\\.webp$').test(n))
    .map(name=>'site/assets/'+dir+'/'+name):[];
});
if(!media.includes(expected))throw Error('Photo not in allowed media inventory');
const result={id,brand:target.brand,model:target.model,kind:isCore?'core':'supplemental',
  publishedBefore:true,media,requiresManualMerge:true,cdnPurged:false,
  liveRemovalVerified:false,operation:applying?'source_and_static_artifacts_removed':'preview_only'};
if(!applying){
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  process.exit(0);
}
blocks.retired.push({id,kind:result.kind,recordedOn:new Date().toISOString().slice(0,10),
  reason:'rights_review_requested'});
blocks.retired.sort((a,b)=>a.id.localeCompare(b.id));
save('site/photo-takedowns.json',blocks);
if(isCore){
  target.photoReview={publicUsageApproved:false,licence:'withdrawn_pending_review',
    provider:target.brand,accuracy:'exact',permissionIndependentlyVerified:false};
  target.photoRights='withdrawn_pending_review';
  target.imageMode='illustration';
  save('site/selection-affiliation.json',core);
}else{
  delete rights.photos[id];
  save('site/popular-photo-rights.json',rights);
}
for(const path of media)rmSync(join(root,path),{force:true});

const command=(bin,argumentsList)=>{
  const p=spawnSync(bin,argumentsList,{cwd:root,encoding:'utf8',timeout:180000,
    env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/'}});
  if(p.status!==0)throw Error(bin+' '+argumentsList.join(' ')+' failed:\n'+(p.stderr||p.stdout).slice(-3500));
};
command(process.execPath,['scripts/build-seo.mjs']);
// Never publish an archive until every generated storefront file has been
// checked against the exact withdrawn model's media paths.

const prefix=new RegExp('assets/(?:watches|watches-popular|watch-responsive|popular-responsive|watch-thumbs)/'+id+'(?:-\\d+)?\\.webp');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(d=>
  d.isDirectory()?walk(join(dir,d.name)):d.isFile()?[join(dir,d.name)]:[]);
for(const file of walk(site)){
  if(file.endsWith('.webp')&&prefix.test(file.slice(file.indexOf('assets/'))))
    throw Error('Withdrawal incomplete, local media still present: '+file);
  if(/\.(?:html|js|json|css|xml)$/.test(file)){
    const data=readFileSync(file,'utf8');
    if(prefix.test(data))throw Error('Withdrawal incomplete, published asset referenced: '+file);
  }
}
command('python3',['scripts/build-shipstatic-bundle.py']);
const documents=readdirSync(join(root,'docs')).filter(n=>/^deploy-package-\d+\.json$/.test(n));
for(const name of documents){
  const data=readFileSync(join(root,'docs',name),'utf8');
  if(prefix.test(data))throw Error('Withdrawal incomplete, archive still embeds photo: '+name);
}
process.stdout.write(JSON.stringify({...result,sourceRemoved:true,sourceRebuilt:true,
  bundlesRebuilt:true,cdnPurged:false,liveRemovalVerified:false},null,2)+'\n');
