#!/usr/bin/env node
/**
 * Retire ONE exact published watch image from a review branch, never from main.
 * Preview is read-only; applying requires a precise manual confirmation.
 * This does not purge the CDN, merge a PR, or claim rights compliance.
 */
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {sanitizeWithdrawnMedia} from './sanitize-withdrawn-media.mjs';

const root=resolve(import.meta.dirname,'..');
const site=join(root,'site');
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const save=(path,object)=>writeFileSync(join(root,path),JSON.stringify(object,null,2)+'\n');
const args=process.argv.slice(2);
const idPos=args.indexOf('--id'),confirmPos=args.indexOf('--confirm');
const id=idPos>=0?args[idPos+1]:'';
const apply=args.includes('--apply');
const confirm=confirmPos>=0?args[confirmPos+1]:null;
const flags=['--id','--apply','--confirm'];
if(!/^[a-z0-9-]{4,64}$/.test(id)||
   args.filter(x=>x==='--id').length!==1||
   args.filter(x=>x==='--apply').length>1||
   args.filter(x=>x==='--confirm').length>1||
   args.some(x=>x.startsWith('--')&&!flags.includes(x))||
   args.some(x=>!x.startsWith('--')&&x!==id&&x!==confirm)||
   (apply?confirm!=='RETIRER:'+id:confirm!==null))
  throw Error('Usage: --id <catalogue-id> [--apply --confirm RETIRER:<catalogue-id>]');

const core=read('site/selection-affiliation.json');
const extras=read('site/selection-populaires.json');
const rights=read('site/popular-photo-rights.json');
const ledgerPath='site/photo-takedowns.json';
const ledger=existsSync(join(root,ledgerPath))?read(ledgerPath):{version:1,retired:[]};
if(core.products?.length!==15||extras.products?.length!==37||rights.version!==1||
   !rights.photos||ledger.version!==1||!Array.isArray(ledger.retired)||
   new Set(ledger.retired.map(x=>x.id)).size!==ledger.retired.length)
  throw Error('Invalid photo registries or catalogue scope');

const main=core.products.find(p=>p.id===id);
const extra=extras.products.find(p=>p.id===id);
if(Boolean(main)===Boolean(extra))throw Error('Unknown or ambiguous watch ID: '+id);
if(ledger.retired.some(x=>x.id===id))throw Error('Already retired: '+id);
const kind=main?'core':'supplemental';
const product=main||extra;
const record=main?main.photoReview:rights.photos[id];
if(main?record?.publicUsageApproved!==true:!record||extra.photoPublicationBlocked===true)
  throw Error('No currently published photo to retire: '+id);

const expected='site/assets/'+(main?'watches':'watches-popular')+'/'+id+'.webp';
const original=join(root,expected);
const hash=main?record.localSha256:record.imageSha256;
if(!existsSync(original)||!/^[a-f0-9]{64}$/i.test(hash||''))
  throw Error('Missing signed-off source or SHA-256 for '+id);
const bytes=readFileSync(original);
if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||
   createHash('sha256').update(bytes).digest('hex')!==hash.toLowerCase())
  throw Error('Source checksum mismatch; refusing to alter files: '+id);

const folders=['watches','watch-responsive','watch-thumbs','watches-popular','popular-responsive'];
const media=[];
for(const folder of folders){
  const directory=join(site,'assets',folder);
  if(!existsSync(directory))continue;
  for(const filename of readdirSync(directory)){
    if(filename===id+'.webp'||new RegExp('^'+id+'-(?:240|360|480|720|800|960)\\.webp$').test(filename))
      media.push('site/assets/'+folder+'/'+filename);
  }
}
if(!media.includes(expected))throw Error('Exact original missing from removal inventory');
const status={
  id,kind,brand:product.brand,model:product.model,
  operation:apply?'branch_source_removal':'preview_only',
  media,sourceSha256:hash.toLowerCase(),requiresReview:true,
  liveRemovalVerified:false,cdnPurged:false
};
if(!apply){
  process.stdout.write(JSON.stringify(status,null,2)+'\n');
  process.exit(0);
}

// Never run this mutating action against a checked-out production branch.
// A temporary, git-free integration fixture must explicitly opt in.
const git=spawnSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'});
if(process.env.AM_WITHDRAWAL_SANDBOX!=='1'&&
   (git.status!==0||!git.stdout.trim()||['main','master'].includes(git.stdout.trim())))
  throw Error('Apply only from a dedicated, named review branch; not main');
if(git.status===0&&['main','master'].includes(git.stdout.trim()))
  throw Error('Refusing to modify main even with sandbox flag');

ledger.retired.push({id,kind,sourceSha256:hash.toLowerCase(),media:[...media],
  recordedOn:new Date().toISOString().slice(0,10),reason:'publication_rights_review'});
ledger.retired.sort((a,b)=>a.id.localeCompare(b.id));
save(ledgerPath,ledger);
if(main){
  main.photoRights='publication_withdrawn';
  main.imageMode='editorial_illustration';
  main.photoReview={
    publicUsageApproved:false,licence:'permission_withdrawn',
    provider:product.brand,accuracy:'exact',permissionIndependentlyVerified:false
  };
  save('site/selection-affiliation.json',core);
}else{
  extra.photoPublicationBlocked=true;
  delete rights.photos[id];
  save('site/selection-populaires.json',extras);
  save('site/popular-photo-rights.json',rights);
}
for(const path of media)rmSync(join(root,path));

function execute(command,argumentsList){
  const result=spawnSync(command,argumentsList,{cwd:root,encoding:'utf8',timeout:180000,
    env:{...process.env,PUBLIC_SITE_URL:'https://atelier-montres-selection-fr.onrender.com/'},
    maxBuffer:24*1024*1024});
  if(result.status!==0)throw Error('Build/validation failed: '+command+' '+argumentsList.join(' ')+
    '\n'+(result.stdout+'\n'+result.stderr).slice(-6000));
}
// Three noindex source-only review assets are removed by the SEO publisher.
// Keep them in the *repository* for future npm test runs, but the packager
// excludes them and Render removes them when building the deployed site.
const privateReviewNames=['revue-photo.html','revue-photo.js','revue-photo.css'];
const privateReviewSources=privateReviewNames.map(name=>{
  const path=join(site,name);
  return [path,existsSync(path)?readFileSync(path):null];
});
execute(process.execPath,['scripts/validate-photo-review.mjs']);
execute(process.execPath,['scripts/build-seo.mjs']);
// Historical published HTML (not only SEO-generated product pages) can still
// contain an image. Replace exact-model tags with a visible no-photo notice.
for(const file of walk(site).filter(path=>path.endsWith('.html'))){
  const html=readFileSync(file,'utf8');
  const sanitized=sanitizeWithdrawnMedia(html,[{...product,photoReview:{publicUsageApproved:false}}]);
  if(html!==sanitized)writeFileSync(file,sanitized);
}
execute(process.execPath,['scripts/validate-gallery-v9.mjs']);
execute(process.execPath,['scripts/validate-seo.mjs']);
execute('python3',['scripts/build-shipstatic-bundle.py']);
execute('python3',['-m','unittest','discover','-s','scripts','-p','test_photo_package_gate.py','-q']);

const pathPattern=new RegExp('assets/(?:watches|watch-responsive|watch-thumbs|watches-popular|popular-responsive)/'+
  id+'(?:-(?:240|360|480|720|800|960))?\\.webp','i');
function walk(directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>
    entry.isDirectory()?walk(join(directory,entry.name)):entry.isFile()?[join(directory,entry.name)]:[]);
}
for(const file of walk(site)){
  if(file.endsWith('.webp')&&pathPattern.test(relative(site,file).replaceAll('\\','/')))
    throw Error('Retired image survived: '+file);
  if(/\.(?:html|css|js|json|xml)$/.test(file)&&pathPattern.test(readFileSync(file,'utf8')))
    throw Error('Retired image referenced in generated site: '+file);
}
for(const file of walk(join(root,'docs')).filter(f=>/deploy-package-\d+\.json$/.test(f)))
  if(pathPattern.test(readFileSync(file,'utf8')))
    throw Error('Retired image remains inside deploy package: '+file);
const manifest=read('docs/deploy-package-manifest.json');
if(manifest.totalModels!==52||!existsSync(join(site,'montres',id+'.html')))
  throw Error('A catalogue page was lost during photo removal: '+id);
// Restore repository-only review fixtures AFTER public-output and package checks.
// The production build deletes them again; never expose them in published HTML.
for(const [file,bytes] of privateReviewSources)if(bytes!==null)writeFileSync(file,bytes);
process.stdout.write(JSON.stringify({...status,sourceRemoved:true,
  pagesRebuilt:true,packageValidated:true},null,2)+'\n');
