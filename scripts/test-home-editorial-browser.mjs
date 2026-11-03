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
    await page.locator('.home-hero-photo img').waitFor({state:'visible'});
    assert.equal(await page.locator('.home-path').count(),3);
    assert.equal(await page.locator('.home-product').count(),3);
    assert.match(await page.title(),/52 modèles/);
    assert.match(await page.locator('#titre-principal').innerText(),/Le temps mérite/);
    const result=await page.evaluate(async()=>{
      const photos=[...document.querySelectorAll(
        '.home-hero-photo img,.home-product-visual img,.home-path-media img'
      )];
      // Lazy images below the fold do not start loading until scrolled into view.
      // Promote them to eager ONLY inside this isolated browser check.
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
        heroBg:getComputedStyle(document.querySelector('.home-hero')).backgroundImage,
        checkoutButtons:[...document.querySelectorAll('button,a')].filter(el=>
          /payer maintenant|commander chez nous|achat immédiat/i.test(el.textContent)).length
      };
    });
    assert.ok(result.scroll<=result.width+2,
      'horizontal overflow at '+width+': '+JSON.stringify(result));
    assert.ok(result.css,'homepage CSS missing at '+width);
    assert.ok(result.heroBg.includes('gradient'),'hero premium gradient missing');
    assert.ok(result.photos.length>=7);
    assert.ok(result.photos.every(photo=>photo.loaded),
      'broken product photography at '+width+': '+JSON.stringify(result.photos));
    assert.equal(result.checkoutButtons,0);
    const menu=page.locator('.home-nav-menu');
    if(width<=850){
      assert.equal(await menu.isVisible(),true,'mobile menu absent');
      await page.locator('.home-nav-menu summary').click();
      assert.equal(await menu.getAttribute('open'),'');
      await page.locator('.home-nav-menu a[href="./montres/toutes-les-montres.html"]')
        .waitFor({state:'visible'});
      await page.locator('.home-nav-menu summary').click();
      assert.equal(await menu.getAttribute('open'),null);
    }else{
      assert.equal(await menu.isVisible(),false,'mobile menu visible on desktop');
      assert.equal(await page.locator('.home-header .navigation').isVisible(),true);
    }
    if(width===393){
      const button=page.locator('#chatLauncher');
      await button.click();
      await page.locator('#chatPanel').waitFor({state:'visible'});
      await page.locator('[data-question="Livraison"]').click();
      const messages=await page.locator('#chatHistory').innerText();
      assert.match(messages,/marchand|vendeur/i);
      assert.doesNotMatch(messages,/stock contrôlé et des expéditions préparées en France/i);
      await page.locator('#chatClose').click();
      await page.screenshot({path:'artifacts/atelier-home-393.png',fullPage:true});
    }
    if(width===1366)
      await page.screenshot({path:'artifacts/atelier-home-1366.png',fullPage:true});
    await page.close();
  }
  assert.deepEqual(failures,[]);
  console.log('Premium homepage OK: 52-watch navigation, 7 genuine local photos, readable mobile menu, no horizontal overflow, accurate commercial answers');
}finally{
  await browser.close();
}
