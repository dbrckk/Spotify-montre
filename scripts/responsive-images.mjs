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
