import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const idPattern=/^[a-z0-9-]{4,64}$/;
export function readPhotoTakedowns(root){
  const manifest=JSON.parse(readFileSync(join(root,'photo-takedowns.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.retired))
    throw Error('Invalid permanent photo takedown registry');
  const ids=new Set();
  for(const item of manifest.retired){
    if(!item||!idPattern.test(item.id||'')||
       !['core','supplemental'].includes(item.kind)||
       !/^20\d{2}-\d{2}-\d{2}$/.test(item.recordedOn||'')||
       item.reason!=='rights_review_requested'||ids.has(item.id))
      throw Error('Invalid or duplicate photo retirement');
    ids.add(item.id);
  }
  return manifest.retired;
}

const directories=['watches','watches-popular','watch-responsive','popular-responsive','watch-thumbs'];
export function assertPhotoTakedownSources(root,core,extras){
  const withdrawn=readPhotoTakedowns(root);
  if(!withdrawn.length)return;
  const rights=JSON.parse(readFileSync(join(root,'popular-photo-rights.json'),'utf8')).photos;
  for(const item of withdrawn){
    const p=(item.kind==='core'?core:extras).find(p=>p.id===item.id);
    if(!p)throw Error('Takedown does not reference exact catalogue model: '+item.id);
    if(item.kind==='core'&&p.photoReview?.publicUsageApproved!==false)
      throw Error('Retired core photograph still approved: '+item.id);
    if(item.kind==='supplemental'&&rights[item.id])
      throw Error('Retired supplemental photograph still registered: '+item.id);
    for(const folder of directories){
      const path=join(root,'assets',folder);
      if(!existsSync(path))continue;
      if(readdirSync(path).some(f=>f===item.id+'.webp'||
         new RegExp('^'+item.id+'-\\d+\\.webp$').test(f)))
        throw Error('Retired media must be physically deleted: '+item.id);
    }
  }
}

const htmlMedia=id=>new RegExp('assets/(?:watches|watches-popular|watch-responsive|popular-responsive|watch-thumbs)/'+id+'(?:-\\d+)?\\.webp');
export function maskRetiredStaticPhotos(root){
  const retired=readPhotoTakedowns(root);
  if(!retired.length)return 0;
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>
    e.isDirectory()?walk(join(dir,e.name)):e.isFile()?[join(dir,e.name)]:[]);
  let replaced=0;
  for(const file of walk(root).filter(x=>x.endsWith('.html'))){
    let html=readFileSync(file,'utf8');
    for(const item of retired){
      const pattern=htmlMedia(item.id);
      if(!pattern.test(html))continue;
      html=html.replace(/<(?:img|source|meta|link)\b[^>]*>/g,tag=>{
        if(!pattern.test(tag))return tag;
        replaced++;
        return /^<img\b/.test(tag)
          ?'<span class="am-photo-withdrawn" role="img" aria-label="Photographie non disponible">Photographie retirée · consulter la référence chez le fabricant</span>'
          :'';
      });
      if(pattern.test(html))throw Error('Retired photo still appears outside safe image tags: '+file+' / '+item.id);
    }
    writeFileSync(file,html);
  }
  return replaced;
}
