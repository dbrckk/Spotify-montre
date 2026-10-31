import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Editorial concepts are not packshots and never enter Product.image schema.
 * Keep source-authenticated real photographs as the primary imagery.
 * URLs are exact CDN assets uploaded by the store owner; no scraped URL
 * or external user-controlled host can be introduced into the static pages.
 */
export function loadPopularAiVisuals({root,picks}){
  const registry=JSON.parse(readFileSync(join(root,'popular-ai-visuals.json'),'utf8'));
  if(registry.version!==1||registry.policy!=='editorial_only_keep_real_exact_model_packshots_primary'
    ||!registry.visuals||typeof registry.visuals!=='object'||Array.isArray(registry.visuals))
    throw Error('Invalid editorial AI imagery registry');
  const known=new Map(picks.map(p=>[p.id,p]));
  const result=new Map();
  for(const [id,item] of Object.entries(registry.visuals)){
    const p=known.get(id);
    if(!p||p.brand!=='SKMEI'||item?.brand!==p.brand||item?.model!==p.model)
      throw Error('AI artwork is not associated with a known exact SKMEI reference: '+id);
    if(item.kind!=='ai_generated_editorial_visual_not_exact_product_photo'
       ||item.publishedAs!=='illustration_ia_non_contractuelle'
       ||item.source!=='original_assistant_image_generation_2026-10-31'
       ||item.approval!=='site_owner_explicitly_requested_generated_images_2026-11-01'
       ||!Number.isInteger(item.width)||item.width!==768||item.height!==768
       ||!/^[a-f0-9]{64}$/.test(item.originalFileSha256||''))
      throw Error('AI artwork origin, approval, label or size is not documented: '+id);
    const url=new URL(item.url);
    if(url.protocol!=='https:'||url.hostname!=='cdn.shopify.com'
       ||url.username||url.password||url.port||url.hash
       ||url.pathname!=='/s/files/1/1053/8378/8892/files/atelier-'+id+'-concept-ai.webp'
       ||!/^v=\d{10}$/.test(url.search.slice(1)))
      throw Error('AI artwork URL is not an owner-hosted exact-model asset: '+id);
    result.set(id,Object.freeze({url:url.href,width:768,height:768}));
  }
  if(result.size!==9)throw Error('All nine SKMEI original artworks must be present');
  return result;
}
