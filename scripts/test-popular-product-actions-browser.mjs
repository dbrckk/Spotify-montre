import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Local-only verification. Do not follow merchant links or invoke payments.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Supplemental product browser tests must run on localhost');
const picks=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
const rights=JSON.parse(readFileSync('site/popular-photo-rights.json','utf8')).photos;
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
assert.equal(picks.length,37);
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.match(html,/src="\.\.\/extra-product-actions\.js"/);
  assert.ok(html.includes('data-extra-favorite="'+p.id+'"'));
  assert.ok(html.includes('data-extra-share="'+p.id+'"'));
  assert.ok(html.includes('href="./toutes-les-montres.html?saved=1"'));
  const proof=rights[p.id];
  if(proof){
    assert.ok(!html.includes('href="../extra-source-passport.css"'),
      'Approved photo should not download the no-photo editorial CSS: '+p.id);
    assert.ok(!html.includes('class="am-extra-reference-passport"'),
      'Real approved photographs should not be replaced by an editorial passport: '+p.id);
    assert.ok(!html.includes('class="am-extra-art-no-photo"'),
      'Photographed product must not use the no-photo treatment: '+p.id);
    const hero=html.match(/<img class="am-extra-licensed-photo"[^>]+>/)?.[0]||'';
    assert.ok(hero,'Published exact-model photograph missing: '+p.id);
    assert.ok(html.includes('class="am-extra-photo-stage"')&&
      html.includes('class="am-extra-photo-meta"'),
      'Verified watch must have an unobstructed photo stage and separate metadata: '+p.id);
    assert.ok(hero.includes('width="'+proof.width+'"')&&
      hero.includes('height="'+proof.height+'"'),'Original aspect dimensions missing: '+p.id);
    for(const size of [240,360,480,720,960].filter(size=>size<proof.width))
      assert.ok(hero.includes('popular-responsive/'+p.id+'-'+size+'.webp '+size+'w'),
        'Detailed watch hero must expose the verified '+size+'px WebP: '+p.id);
    assert.ok(hero.includes('watches-popular/'+p.id+'.webp '+proof.width+'w'),
      'Full-size original must remain eligible on detail '+p.id);
  }else{
    assert.ok(html.includes('href="../extra-source-passport.css"'),
      'Source-backed no-photo design must load its uniquely named CSS asset: '+p.id);
    assert.ok(html.includes('am-extra-art-no-photo'),
      'No-photo product must receive the source-first studio art direction: '+p.id);
    assert.equal((html.match(/class="am-extra-reference-passport"/g)||[]).length,1,
      'One factual reference panel required per unphotographed product: '+p.id);
    assert.equal((html.match(/class="am-extra-seller-path"/g)||[]).length,1,
      'Commercial exits must be distinguished from official photos: '+p.id);
    assert.ok(html.includes('<dt>Mouvement</dt><dd>'+escapeHtml(p.movement)+'</dd>'),
      'Editorial passport movement must match the exact source field: '+p.id);
    assert.ok(html.includes('<dt>Boîtier</dt><dd>'+escapeHtml(p.case)+'</dd>'),
      'Editorial passport case description must remain documented: '+p.id);
    assert.ok(!html.includes('class="am-budget-dial"'),
      'Do not simulate an unsupported product dial on a no-photo model: '+p.id);
    assert.ok(!html.includes('class="am-extra-licensed-photo"'),
      'Do not publish unapproved watch photography: '+p.id);
    assert.ok(!html.includes('class="am-extra-photo-stage"'),
      'An unphotographed watch must keep its honest typographic fallback: '+p.id);
    assert.ok(html.includes('class="am-extra-photo-unavailable"'),
      'Missing explicit photo-unavailable disclosure: '+p.id);
    const photoLink=html.match(/<a href="([^"]+)" target="_blank" rel="noopener noreferrer" aria-label="Voir les photos du modèle exact : [^"]+ sur la fiche officielle \(nouvel onglet\)">Voir les photos du modèle exact/);
    assert.ok(photoLink,'Missing source-first exact-model photo CTA: '+p.id);
    assert.equal(photoLink[1],p.officialUrl.replaceAll('&','&amp;'),
      'Photo CTA must link to the documented manufacturer or seller URL: '+p.id);
  }
}
// Comparator proof is the only trusted reason to publish two external
// documentary sources. Other exact links are NOT silently given fake proof.
const research=JSON.parse(readFileSync('research/amazon-fr-popular-verified.json','utf8')).verifiedProducts;
const documented=Object.entries(research)
  .filter(([,r])=>r.evidenceType==='amazon_fr_comparator_redirect');
assert.equal(documented.length,6,'Six different model/ASIN comparator proofs are currently substantiated');
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  const proof=research[p.id];
  const comparator=proof?.evidenceType==='amazon_fr_comparator_redirect';
  if(!comparator){
    assert.ok(!html.includes('data-asin-proof-id='),
      'Never invent independent corroboration for '+p.id);
    assert.ok(!html.includes('href="../merchant-proof-ledger.css"'),
      'Unrelated product pages must not download the audit-ledger CSS: '+p.id);
    continue;
  }
  assert.equal((html.match(/data-asin-proof-id=/g)||[]).length,1);
  assert.ok(html.includes('data-asin-proof-id="'+p.id+'"'));
  assert.ok(html.includes('href="../merchant-proof-ledger.css"'));
  assert.ok(html.includes('<code>'+proof.asin+'</code>'));
  assert.ok(html.includes('Code associé : <strong>'+escapeHtml(proof.marketplaceModel)+'</strong>'));
  assert.ok(html.includes('href="'+escapeHtml(proof.comparisonUrl)+'"'),
    'Published comparator URL must exactly match research: '+p.id);
  assert.ok(html.includes('href="'+escapeHtml(proof.corroborationUrl)+'"'),
    'Corroboration URL must exactly match separately approved source: '+p.id);
  assert.ok(html.includes('href="#sources">Voir les deux sources de correspondance'),
    'Purchaser should find the auditable evidence before leaving: '+p.id);
  assert.equal((html.match(/class="am-extra-proof-step"/g)||[]).length,2);
  assert.ok(html.includes('La page Amazon.fr n’a pas pu être consultée directement'),
    'Do not present a comparator redirect as a live stock check: '+p.id);
}
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  // Source transparency remains readable and usable on a 393px phone.
  // Do not follow external merchant or evidence links in automated checks.
  const auditPhone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await auditPhone.goto(new URL('/montres/casio-la-20wh-4a1.html',base).href,
      {waitUntil:'domcontentloaded'});
    const card=auditPhone.locator('.am-extra-proof-ledger');
    await card.scrollIntoViewIfNeeded();
    assert.ok(await card.isVisible());
    assert.equal(await card.getAttribute('data-asin-proof-id'),'casio-la-20wh-4a1');
    assert.equal(await card.locator('.am-extra-proof-sources a').count(),2);
    for(const link of await card.locator('.am-extra-proof-sources a').all()){
      assert.equal(await link.getAttribute('target'),'_blank');
      assert.equal(await link.getAttribute('rel'),'noopener noreferrer nofollow',
        'Editorial evidence must never be labelled a paid checkout exit');
      const bounds=await link.boundingBox();
      assert.ok(bounds&&bounds.height>=44,'Source CTA should be touch-accessible on Android');
    }
    const geometry=await auditPhone.evaluate(()=>{
      const el=document.querySelector('.am-extra-proof-ledger');
      const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,width:r.width,client:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth,columns:getComputedStyle(el.querySelector('.am-extra-proof-sources')).gridTemplateColumns};
    });
    assert.ok(geometry.left>=-1&&geometry.right<=393&&geometry.width>=280,
      'Provenance ledger must fit phone without clipped source URLs: '+JSON.stringify(geometry));
    assert.ok(geometry.scroll<=geometry.client+2,
      'Buyer-facing provenance block must not create horizontal scrolling');
    await card.screenshot({path:'artifacts/atelier-asin-proof-ledger-393.png'});
  }finally{await auditPhone.close();}
  // Verify the honest fallback is actually usable at mobile viewport width.
  const officialFallbackPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await officialFallbackPage.goto(new URL('/montres/casio-f91w-1.html',base).href,{waitUntil:'domcontentloaded'});
    const cta=officialFallbackPage.locator('.am-extra-official-photo>a');
    await cta.waitFor({state:'visible'});
    assert.equal(await cta.getAttribute('href'),'https://www.casio.com/fr/watches/casio/product.F-91W-1/');
    assert.equal(await cta.getAttribute('target'),'_blank');
    assert.equal(await cta.getAttribute('rel'),'noopener noreferrer');
    const bounds=await cta.boundingBox();
    assert.ok(bounds&&bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=393,
      'Mobile exact-model photo CTA must fit the screen and offer a 44px touch target');

    const passport=officialFallbackPage.locator('.am-extra-reference-passport');
    assert.equal(await passport.isVisible(),true,
      'No-photo model must display source-backed technical facts in the hero');
    const fallbackModel=picks.find(p=>p.id==='casio-f91w-1');
    assert.ok(fallbackModel,'Documented Casio F-91W-1 missing');
    assert.ok((await passport.innerText()).includes(fallbackModel.movement));
    assert.ok((await passport.innerText()).includes(fallbackModel.case));
    assert.equal(await officialFallbackPage.locator('.am-extra-seller-path').isVisible(),true);
    const studio=await officialFallbackPage.locator('.am-extra-art-no-photo').boundingBox();
    const panel=await passport.boundingBox();
    assert.ok(studio&&panel&&panel.width>250&&panel.x>=studio.x-2
      &&panel.x+panel.width<=studio.x+studio.width+2,
      'No-photo editorial passport must remain within the mobile studio');
    const pageBounds=await officialFallbackPage.evaluate(()=>({
      width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    assert.ok(pageBounds.scroll<=pageBounds.width+2,
      'Source-first hero must not overflow on Android: '+JSON.stringify(pageBounds));
    await officialFallbackPage.locator('.am-extra-art-no-photo').screenshot({
      path:'artifacts/atelier-no-photo-editorial-393.png'
    });
    assert.equal(await officialFallbackPage.locator('.am-extra-licensed-photo').count(),0,
      'No fabricated F-91W photograph may appear');
  }finally{await officialFallbackPage.close();}
  for(const width of [360,393,1366]){
    const context=await browser.newContext({viewport:{width,height:870},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    await context.addInitScript(()=>{
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
        window.__lastSharedProduct=data;
      }});
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    // A genuine watch photo must be entirely separate from its caption.
    // The older dark overlay obscured the bottom portion of the packshot.
    const studio=await page.evaluate(()=>{
      const stage=document.querySelector('.am-extra-photo-stage');
      const art=document.querySelector('.am-extra-art-with-photo');
      const image=stage?.querySelector('img.am-extra-licensed-photo');
      const meta=document.querySelector('.am-extra-photo-meta');
      const zoom=stage?.querySelector('button.am-extra-zoom');
      if(!stage||!art||!image||!meta||!zoom)return null;
      const s=stage.getBoundingClientRect(),i=image.getBoundingClientRect(),
        m=meta.getBoundingClientRect(),a=art.getBoundingClientRect(),
        z=zoom.getBoundingClientRect();
      return {
        stageInsideArt:s.left>=a.left-2&&s.right<=a.right+2,
        photoInsideStage:i.left>=s.left-2&&i.right<=s.right+2&&i.top>=s.top-2&&i.bottom<=s.bottom+2,
        metaAfterStage:m.top>=s.bottom-2&&m.left>=a.left-2&&m.right<=a.right+2,
        photoFit:getComputedStyle(image).objectFit,
        studioBg:getComputedStyle(stage).backgroundImage,
        captionText:meta.textContent.trim(),
        zoomVisible:!zoom.hidden&&z.width>=44&&z.height>=44,
        client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
      };
    });
    assert.ok(studio?.stageInsideArt&&studio.photoInsideStage&&studio.metaAfterStage,
      'Real watch photograph must remain unoccluded in the studio: '+width+' '+JSON.stringify(studio));
    assert.equal(studio.photoFit,'contain','Do not crop exact-model product photos');
    assert.ok(studio.captionText.includes('SKMEI')&&studio.captionText.includes('1251'),
      'Photo provenance and actual model must remain visible');
    assert.ok(studio.zoomVisible,'Photo zoom needs a visible 44px touch target');
    assert.ok(studio.scroll<=studio.client+2,'Studio layout must not overflow on '+width);
    if(width===393||width===1366)
      await page.locator('.am-extra-hero').screenshot({path:'artifacts/atelier-watch-studio-'+width+'.png'});

    if(width===393){
      const image=page.locator('.am-extra-licensed-photo');
      await image.waitFor({state:'visible'});
      await image.evaluate(node=>node.decode());
      const actual=await image.evaluate(node=>({
        path:new URL(node.currentSrc).pathname,
        width:node.naturalWidth,height:node.naturalHeight
      }));
      assert.ok(['/assets/popular-responsive/skmei-1251-360.webp',
         '/assets/popular-responsive/skmei-1251-480.webp'].includes(actual.path),
         'Android product sheet must download a lightweight exact-model WebP: '+actual.path);
      // With a width-descriptor srcset, naturalWidth can be density-adjusted:
      // assert successful decode and the exact requested derivative instead.
      assert.ok(actual.width>0&&actual.height>0,
        'Mobile product photo failed to decode: '+JSON.stringify(actual));
    }
    const actions=page.locator('.am-extra-local-tools');
    await actions.waitFor({state:'visible'});
    const favorite=actions.locator('[data-extra-favorite]');
    const share=actions.locator('[data-extra-share]');
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.ok(await favorite.isVisible());
    assert.ok(await share.isVisible());
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),
      ['skmei-1251']);
    assert.match(await actions.locator('[data-extra-action-status]').innerText(),/enregistrée/);
    await share.click();
    const shared=await page.evaluate(()=>window.__lastSharedProduct);
    assert.equal(shared.url,new URL('/montres/skmei-1251.html',base).href);
    assert.match(shared.title,/SKMEI 1251/);
    assert.equal(new URL(shared.url).search,'');
    await actions.locator('.am-extra-saved-link').click();
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('#udSavedCount').innerText(),'1');
    assert.equal(await page.locator('.ud-card:visible').count(),1);
    assert.ok(await page.locator('#modele-skmei-1251').isVisible());
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    await actions.waitFor({state:'visible'});
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),[]);

    const dimension=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      width:document.documentElement.clientWidth
    }));
    assert.ok(dimension.scroll<=dimension.width+2,
      'Supplemental product action overflow: '+JSON.stringify(dimension));
    assert.deepEqual(errors,[]);
    await context.close();
  }

  // High-density Android screens must not jump straight from a 480px card
  // image to the full 1080px SKMEI original. Full original stays for zoom.
  const dense=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,deviceScaleFactor:3,locale:'fr-FR'});
  try{
    const page=await dense.newPage();
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    const photo=page.locator('.am-extra-photo-stage img.am-extra-licensed-photo');
    await photo.waitFor({state:'visible'});
    await photo.evaluate(image=>image.decode());
    const selection=await photo.evaluate(image=>({
      path:new URL(image.currentSrc).pathname,
      width:image.naturalWidth,height:image.naturalHeight,
      renderedWidth:Math.round(image.getBoundingClientRect().width)
    }));
    assert.equal(selection.path,'/assets/popular-responsive/skmei-1251-960.webp',
      'Dense Android must select 960px optimized exact-model WebP: '+JSON.stringify(selection));
    assert.ok(selection.width>0&&selection.height>0);
    assert.ok(await page.locator('button.am-extra-zoom').isVisible(),
      'Original zoom remains available when optimized display image loads');
  }finally{await dense.close();}

  const noScript=await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(new URL('/montres/skmei-1251.html',base).href);
  assert.ok(await noScript.locator('.am-extra-photo-stage img').isVisible(),
    'Real photo must display without JavaScript');
  assert.ok(await noScript.locator('.am-extra-photo-meta').isVisible(),
    'Photo caption must display without JavaScript');
  assert.equal(await noScript.locator('.am-extra-zoom').isVisible(),false,
    'Image zoom affordance is progressive enhancement');

  assert.equal(await noScript.locator('.am-extra-local-tools').isVisible(),false);
  assert.ok(await noScript.locator('.am-extra-actions a').count()>=1,
    'Manufacturer/merchant links remain available without JavaScript');
  await noScript.close();
  // A model blocked by the manufacturer stays a typographic composition.
  const noPhoto=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  await noPhoto.goto(new URL('/montres/casio-f91w-1.html',base).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await noPhoto.locator('.am-extra-photo-stage').count(),0,
    'Never substitute another watch photograph for an inaccessible source');
  assert.equal(await noPhoto.locator('.am-extra-licensed-photo').count(),0);
  assert.ok(await noPhoto.locator('.am-extra-art:not(.am-extra-art-with-photo) .am-extra-art-label').isVisible());
  assert.ok(await noPhoto.locator('.am-extra-actions a').count()>=1);
  const bounds=await noPhoto.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth
  }));
  assert.ok(bounds.scroll<=bounds.client+2,'Unphotographed watch must not overflow Android');
  await noPhoto.close();


  // Browser clipboard/share may both be unavailable or blocked. Users must
  // still be able to manually copy the full, model-specific URL.
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw Error('Clipboard permission denied')}
    }});
  });
  await fallback.goto(new URL('/montres/skmei-1251.html',base).href);
  await fallback.locator('[data-extra-share]').click();
  const field=fallback.locator('[data-extra-copy-link]');
  assert.ok(await field.isVisible());
  assert.equal(await field.inputValue(),new URL('/montres/skmei-1251.html',base).href);
  await fallback.close();
  console.log('PASS: 37 exact product pages have safe save/share, Android favorites sync, canonical sharing and no-JS merchant links');
}finally{
  await browser.close();
}
