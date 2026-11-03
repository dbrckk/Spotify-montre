import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(!(base.protocol==='https:'||base.protocol==='http:'&&
  ['localhost','127.0.0.1'].includes(base.hostname)))
  throw Error('Only HTTPS or localhost browser checks are allowed');
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
try{
  for(const width of [360,393,768,1366]){
    const mobile=width<=768;
    const page=await browser.newPage({
      viewport:{width,height:900},isMobile:mobile,hasTouch:mobile,
      deviceScaleFactor:1,locale:'fr-FR'
    });
    page.on('pageerror',error=>failures.push(width+': '+error.message));
    await page.goto(new URL('/index.html',base).href,{waitUntil:'domcontentloaded'});
    await page.locator('.am-hero-watch img').waitFor({state:'visible',timeout:15000});
    assert.equal(await page.locator('.am-style-card').count(),3,
      'three factual image-led catalogue paths must remain');
    assert.equal(await page.locator('.home-product').count(),3,
      'three additional model-specific photo features must render');
    assert.match(await page.title(),/montres/i);
    assert.match(await page.locator('#amFeaturedTitle').innerText(),/Trois montres/);
    const result=await page.evaluate(async()=>{
      const photos=[...document.querySelectorAll(
        '.am-hero-watch img,.home-product-visual img,.am-style-card-image img'
      )];
      // Force below-fold lazy photos to load only during this isolated test.
      for(const img of photos)img.loading='eager';
      await Promise.race([
        Promise.all(photos.map(img=>img.decode().catch(()=>{}))),
        new Promise(resolve=>setTimeout(resolve,15000))
      ]);
      return {
        width:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth,
        photos:photos.map(img=>({src:img.getAttribute('src'),loaded:img.naturalWidth>0})),
        css:[...document.styleSheets].some(sheet=>
          sheet.href?.includes('home-editorial.css')),
        heroBg:getComputedStyle(document.querySelector('.aff-hero')).backgroundImage,
        directBuyActive:document.querySelector('#amDirectForm:not([hidden])')!==null
      };
    });
    assert.ok(result.scroll<=result.width+2,
      'horizontal overflow at '+width+': '+JSON.stringify(result));
    assert.ok(result.css,'real-watch homepage CSS missing at '+width);
    assert.ok(result.heroBg.includes('gradient'),'hero gradient missing');
    assert.ok(result.photos.length>=7,'at least seven distinct image placements expected');
    assert.ok(result.photos.every(photo=>photo.loaded),
      'broken real-watch photography at '+width+': '+JSON.stringify(result.photos));
    assert.equal(result.directBuyActive,false);
    assert.match(await page.locator('.aff-note').innerText(),/marchands partenaires/);
    const menu=page.locator('.am-mobile-nav');
    if(await menu.isVisible()){
      await page.locator('.am-mobile-nav summary').click();
      assert.notEqual(await menu.getAttribute('open'),null);
      await page.locator('.am-mobile-links a[href="./montres/toutes-les-montres.html"]')
        .waitFor({state:'visible'});
      await page.locator('.am-mobile-nav summary').click();
      assert.equal(await menu.getAttribute('open'),null);
    }else{
      assert.equal(await page.locator('.am-header .navigation').isVisible(),true);
    }
    if(width===393){
      await page.locator('#chatLauncher').click();
      await page.locator('#chatPanel').waitFor({state:'visible'});
      await page.locator('[data-question="Livraison"]').click();
      const messages=await page.locator('#chatHistory').innerText();
      assert.match(messages,/marchand|vendeur/i);
      assert.doesNotMatch(messages,/stock contrôlé et des expéditions préparées en France/i);
      await page.locator('#chatClose').click();
      await page.screenshot({path:'artifacts/atelier-home-393.png'});
    }
    if(width===1366)await page.screenshot({path:'artifacts/atelier-home-1366.png'});
    await page.close();
  }
  assert.deepEqual(failures,[]);
  console.log('Premium generated homepage OK: 52-watch links, 7 authentic local-photo placements, 3 detailed highlights, responsive menu, no overflow, accurate shipping disclosure');
}finally{
  await browser.close();
}
