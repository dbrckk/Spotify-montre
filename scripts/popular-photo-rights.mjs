import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Publication is fail-closed. A visible third-party image requires explicit
 * commercial reproduction rights from its rights holder, tied to the exact
 * model and bytes. A site owner's approval to edit the website is not a
 * copyright licence and cannot enable a photograph.
 */
export function loadApprovedPopularPhotos({root,picks}){
  const data=JSON.parse(readFileSync(join(root,'popular-photo-rights.json'),'utf8'));
  if(data.version!==1||data.policy!=='commercial_rights_holder_license_required'
    ||!data.photos||typeof data.photos!=='object'||Array.isArray(data.photos))
    throw Error('Invalid supplemental watch photo rights registry');
  const directory=join(root,'assets','watches-popular');
  const ids=new Set(picks.map(p=>p.id));
  const approved=new Map();
  for(const [id,item] of Object.entries(data.photos)){
    if(!ids.has(id)||!item||typeof item!=='object'||Array.isArray(item))
      throw Error('Unexpected photo rights declaration for '+id);
    if(item.rightsBasis!=='rights_holder_written_commercial_permission'&&item.rightsBasis!=='site_original_photograph')
      throw Error('Watch photo cannot be published without explicit commercial rights: '+id);
    if(typeof item.rightsHolder!=='string'||item.rightsHolder.length<3||
      item.scope!=='commercial_affiliate_website_display_and_local_hosting'||
      !/^20\d{2}-\d{2}-\d{2}$/.test(item.approvedOn||'')||
      !Number.isFinite(Date.parse(item.approvedOn))||
      !/^[a-f0-9]{64}$/i.test(item.permissionEvidenceSha256||'')||
      !/^[a-f0-9]{64}$/i.test(item.imageSha256||''))
      throw Error('Missing scope, permission proof or image checksum for '+id);
    if(item.file!=='assets/watches-popular/'+id+'.webp')
      throw Error('Only exact-model local WebP can be published: '+id);
    const target=join(root,item.file);
    if(!existsSync(target))throw Error('Licensed photo missing: '+id);
    const bytes=readFileSync(target);
    if(bytes.length<8000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'
      ||createHash('sha256').update(bytes).digest('hex')!==item.imageSha256.toLowerCase())
      throw Error('Licensed watch photo invalid or hash changed: '+id);
    approved.set(id,Object.freeze({url:item.file,rightsHolder:item.rightsHolder}));
  }
  if(existsSync(directory)){
    for(const file of readdirSync(directory)){
      if(!file.endsWith('.webp')||!approved.has(file.slice(0,-5)))
        throw Error('Unlicensed or unregistered watch photo present in public assets: '+file);
    }
  }
  return approved;
}
