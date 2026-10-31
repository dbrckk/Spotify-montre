import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Exact-model photo publisher. The licence basis is explicit:
 *  - rights_holder_written_commercial_permission: recorded document hash
 *  - site_original_photograph: photo created by the publisher
 *  - site_owner_attested_brand_authorization: owner asserts brand approval,
 *    not independently verified and never represented as a written licence.
 *
 * All allowed entries require a trusted source, exact-model local WebP,
 * checksum, and known catalogue ID. Never cache Amazon advertising images.
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
    const documented=['rights_holder_written_commercial_permission','site_original_photograph'].includes(item.rightsBasis);
    const attested=item.rightsBasis==='site_owner_attested_brand_authorization';
    if(!documented&&!attested)throw Error('Watch photo permission basis unknown: '+id);
    if(typeof item.rightsHolder!=='string'||item.rightsHolder.length<3||
      item.scope!=='commercial_affiliate_website_display_and_local_hosting'||
      !/^20\d{2}-\d{2}-\d{2}$/.test(item.approvedOn||'')||
      !Number.isFinite(Date.parse(item.approvedOn))||
      !/^[a-f0-9]{64}$/i.test(item.imageSha256||''))
      throw Error('Missing scope, date or image checksum for '+id);
    if(documented&&!/^[a-f0-9]{64}$/i.test(item.permissionEvidenceSha256||''))
      throw Error('Written commercial authorization requires document hash: '+id);
    if(attested&&(item.attestationSource!=='site_owner_declaration_2026-10-31'
        ||item.rightsHolder!==picks.find(p=>p.id===id)?.brand
        ||item.permissionIndependentlyVerified!==false))
      throw Error('Site owner brand attestation is incomplete or misrepresented: '+id);
    const model=picks.find(p=>p.id===id);
    if(typeof item.sourcePage!=='string'||item.sourcePage!==model.officialUrl||
       typeof item.sourceImageUrl!=='string'||!item.sourceImageUrl.startsWith('https://'))
       throw Error('Cannot match image to a trustworthy exact-model product page: '+id);
    if(item.file!=='assets/watches-popular/'+id+'.webp')
      throw Error('Only exact-model local WebP can be published: '+id);
    const target=join(root,item.file);
    if(!existsSync(target))throw Error('Licensed photo missing: '+id);
    const bytes=readFileSync(target);
    if(bytes.length<8000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'
      ||createHash('sha256').update(bytes).digest('hex')!==item.imageSha256.toLowerCase())
      throw Error('Licensed watch photo invalid or hash changed: '+id);
    approved.set(id,Object.freeze({url:item.file,rightsHolder:item.rightsHolder,rightsBasis:item.rightsBasis,sourcePage:item.sourcePage}));
  }
  if(existsSync(directory)){
    for(const file of readdirSync(directory)){
      if(!file.endsWith('.webp')||!approved.has(file.slice(0,-5)))
        throw Error('Unlicensed or unregistered watch photo present in public assets: '+file);
    }
  }
  return approved;
}
