import {existsSync} from 'node:fs';
import {join} from 'node:path';

/**
 * The browser selects a locally generated WebP that matches the displayed
 * dimensions and device pixel ratio. Never add variants for unapproved images.
 * Derivatives are generated offline from SHA-256 checked original photos.
 * The full original remains available as fallback and for zoom.
 */
export function responsiveSrcset(root,product,prefix='../'){
  const photo=product?.photoReview;
  if(photo?.publicUsageApproved!==true||photo.localUrl!=='./assets/watches/'+product.id+'.webp')return '';
  const width=photo.localWidth;
  if(!Number.isInteger(width)||width<=0||!existsSync(join(root,'assets/watches',product.id+'.webp')))return '';
  const version=typeof photo.localSha256==='string'&&/^[a-f0-9]{64}$/.test(photo.localSha256)
    ?'?v='+photo.localSha256.slice(0,12):'';
  const variants=[480,800].filter(w=>w<width&&existsSync(join(root,'assets/watch-responsive',product.id+'-'+w+'.webp')));
  if(!variants.length)return '';
  return [...variants.map(w=>prefix+'assets/watch-responsive/'+product.id+'-'+w+'.webp'+version+' '+w+'w'),
    prefix+'assets/watches/'+product.id+'.webp'+version+' '+width+'w'].join(', ');
}
export function responsiveAttrs(root,product,{prefix='../',sizes,escape}){
  if(!sizes||typeof escape!=='function')throw Error('Responsive image needs descriptive sizes and HTML escaper');
  const set=responsiveSrcset(root,product,prefix);
  return set?' srcset="'+escape(set)+'" sizes="'+escape(sizes)+'"':'';
}

/**
 * The supplemental gallery has the same image needs as the 15 core watches.
 * Source legitimacy and exact model identity are checked upstream by
 * loadApprovedPopularPhotos; only use those approved records here.
 * Full originals remain available for zoom and as a fallback.
 */
export function responsivePopularAttrs(root,product,approved,{prefix='../',sizes,escape}){
  if(!sizes||typeof escape!=='function')throw Error('Popular image needs responsive sizes and escaper');
  const id=product?.id;
  if(typeof id!=='string'||!^[a-z0-9-]+$/.test(id)||
     approved?.url!=='assets/watches-popular/'+id+'.webp'||
     !Number.isInteger(approved.width)||approved.width<480)return '';
  const file=join(root,approved.url);
  if(!existsSync(file))return '';
  const candidates=[240,480].filter(width=>width<approved.width&&
    existsSync(join(root,'assets/popular-responsive',id+'-'+width+'.webp')));
  if(!candidates.length)return '';
  const srcset=[...candidates.map(width=>prefix+'assets/popular-responsive/'+id+'-'+width+'.webp '+width+'w'),
    prefix+approved.url+' '+approved.width+'w'].join(', ');
  return ' srcset="'+escape(srcset)+'" sizes="'+escape(sizes)+'"';
}
