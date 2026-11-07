import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// Local-only verification. Do not follow merchant links or invoke payments.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Supplemental product browser tests must run on localhost');
const picks=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
const rights=JSON.parse(readFileSync('site/popular-photo-rights.json','utf8')).photos;
assert.equal(picks.length,37);
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.match(html,/src="\.\.\/extra-product-actions\.js"/);
  assert.ok(html.includes('data-extra-favorite="'+p.id+'"'));
  assert.ok(html.includes('data-extra-share="'+p.id+'"'));
  assert.ok(html.includes('href="./toutes-les-montres.html?saved=1"'));
  const proof=rights[p.id];
  if(proof){
    const hero=html.match(/<img class="am-extra-licensed-photo"[^>]+>/)?.[0]||'';
    assert.ok(hero,'Published exact-model photograph missing: '+p.id);
    assert.ok(html.includes('class="am-extra-photo-stage"')&&
      html.includes('class="am-extra-photo-meta"'),
      'Verified watch must have an unobstructed photo stage and separate metadata: '+p.id);
    assert.ok(hero.includes('width="'+proof.width+'"')&&
      hero.includes('height="'+proof.height+'"'),'Original aspect dimensions missing: '+p.id);
    for(const size of [240,480,720,960].filter(size=>size<proof.width))
      assert.ok(hero.includes('popular-responsive/'+p.id+'-'+size+'.webp '+size+'w'),
        'Detailed watch hero must expose the verified '+size+'px WebP: '+p.id);
    assert.ok(hero.includes('watches-popular/'+p.id+'.webp '+proof.width+'w'),
      'Full-size original must remain eligible on detail '+p.id);
  }else{
    assert.ok(!html.includes('class="am-extra-licensed-photo"'),
      'Do not publish unapproved watch photography: '+p.id);
    assert.ok(!html.includes('class="am-extra-photo-stage"'),
      'An unphotographed watch must keep its honest typographic fallback: '+p.id);
  }
}
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
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
      assert.equal(actual.path,'/assets/popular-responsive/skmei-1251-480.webp',
        'Android product sheet must actually download the lightweight exact-model WebP');
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
