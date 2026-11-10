/**
 * Remove static references to photos whose publication permission was revoked.
 * No substitute photograph is created. Keep editorial links and model cards.
 * Only pure HTML rewriting: it never deletes assets or makes network requests.
 */
export function sanitizeWithdrawnMedia(html,products){
  const revoked=products.filter(p=>p.photoReview?.publicUsageApproved!==true);
  if(!revoked.length)return html;
  let out=html;
  let removedSocial=false;
  for(const product of revoked){
    if(!/^[a-z0-9-]{4,64}$/.test(product.id))throw Error('Invalid withdrawn model ID');
    const id=product.id;
    const path=new RegExp('assets/(?:watches|watch-responsive|watch-thumbs)/'+id+
      '(?:-(?:240|360|480|720|800|960))?\\.webp(?:\\?[^"\\s<>]*)?','i');
    const fallback='<span class="am-withdrawn-photo-fallback" role="img" aria-label="Photographie non publiée de '+
      escapeHtml(product.brand+' '+product.model)+'"><span class="am-withdrawn-photo-fallback-label">'+
      escapeHtml(product.brand)+'</span><strong>'+escapeHtml(product.model)+
      '</strong><small>Photographie exacte à consulter chez le fabricant</small></span>';
    out=out.replace(/<img\b[^>]*>/gi,tag=>path.test(tag)?fallback:tag);
    out=out.replace(/<source\b[^>]*>/gi,tag=>path.test(tag)?'':tag);
    out=out.replace(/<link\b[^>]*>/gi,tag=>path.test(tag)?'':tag);
    out=out.replace(/<meta\b[^>]*>/gi,tag=>{
      if(!path.test(tag))return tag;
      if(/\bproperty=["']og:image["']|\bname=["']twitter:image["']/i.test(tag))
        removedSocial=true;
      return '';
    });
    if(path.test(out))throw Error('Withdrawn image URL remains in static markup: '+id);
  }
  if(removedSocial){
    out=out.replace(/<meta\b[^>]*\bproperty=["']og:image:alt["'][^>]*>/gi,'');
    out=out.replace(/(<meta\b[^>]*\bname=["']twitter:card["'][^>]*content=["'])summary_large_image(["'][^>]*>)/gi,'$1summary$2');
  }
  return out;
}
function escapeHtml(value){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
