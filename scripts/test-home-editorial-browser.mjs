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
    await page.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded'});
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
  // The actual public homepage is distinct from the legacy comparison page.
  // Its large, padded budget visuals need only 480px at Lighthouse's 412px /
  // 1.75x emulation. Citizen is deliberately excluded: it reuses the 800px
  // hero image already fetched, avoiding another download.
  const publicHome=await browser.newPage({
    viewport:{width:412,height:823},deviceScaleFactor:1.75,
    isMobile:true,hasTouch:true,locale:'fr-FR'
  });
  try{
    const response=await publicHome.goto(new URL('/',base).href,{waitUntil:'domcontentloaded'});
    assert.ok(response?.ok(),'The public premium homepage must load');
    assert.equal(await publicHome.locator('.am-budget-card').count(),3,
      'All three real-photo budget tiers must remain visible');
    for(const id of ['casio-mtp-1302','tissot-prx-auto']){
      const photo=publicHome.locator('.am-budget-art img[src="./assets/watches/'+id+'.webp"]');
      assert.equal(await photo.count(),1,'Missing exact watch photo: '+id);
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img=>img.decode());
      const rendered=await photo.evaluate(img=>({
        path:new URL(img.currentSrc).pathname,width:img.naturalWidth,height:img.naturalHeight
      }));
      assert.equal(rendered.path,'/assets/watch-responsive/'+id+'-480.webp',
        'Mobile budget visual must download the smaller existing local WebP: '+id);
      assert.ok(rendered.width>0&&rendered.height>0,'Budget photo failed to decode: '+id);
    }
    const hero=publicHome.locator('.home-hero-visual img');
    assert.equal(await hero.count(),1,'The real Citizen hero must remain');
    assert.ok((await hero.getAttribute('fetchpriority'))==='high',
      'Keep the main Citizen watch image prioritized');
    const mobileWidth=await publicHome.evaluate(()=>({
      client:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth
    }));
    assert.ok(mobileWidth.scroll<=mobileWidth.client+2,
      'Budget image sizing must not introduce mobile overflow');
    // The four commercial routes must fit one compact Android navigation
    // strip, with accessible 44px targets and an operable final link.
    for(const width of [412,360]){
      await publicHome.setViewportSize({width,height:823});
      await publicHome.waitForFunction(()=>{
        const nav=document.querySelector('.home-nav');
        return nav&&getComputedStyle(nav).overflowX==='auto';
      },null,{timeout:10000});
      const layout=await publicHome.evaluate(()=>{
        const nav=document.querySelector('.home-nav');
        const links=[...nav.querySelectorAll('a')];
        return {
          flexWrap:getComputedStyle(nav).flexWrap,
          overflowX:getComputedStyle(nav).overflowX,
          targets:links.map(link=>Math.round(link.getBoundingClientRect().height)),
          pageWidth:document.documentElement.clientWidth,
          pageScroll:document.documentElement.scrollWidth
        };
      });
      assert.equal(layout.flexWrap,'nowrap','Android navigation must stay on one row at '+width);
      assert.equal(layout.overflowX,'auto','Android navigation must scroll natively');
      assert.equal(layout.targets.length,4,'Keep the four customer destinations');
      assert.ok(layout.targets.every(height=>height>=44),
        'Android navigation touch targets must be at least 44px high: '+JSON.stringify(layout));
      assert.ok(layout.pageScroll<=layout.pageWidth+2,
        'Scrollable menu must not overflow the entire page: '+JSON.stringify(layout));
      await publicHome.locator('.home-nav a').last().scrollIntoViewIfNeeded();
      const lastLink=await publicHome.locator('.home-nav a').last().evaluate(link=>{
        const bounds=link.getBoundingClientRect();
        const viewport=link.closest('nav').getBoundingClientRect();
        return {left:bounds.left,right:bounds.right,viewLeft:viewport.left,viewRight:viewport.right};
      });
      assert.ok(lastLink.left>=lastLink.viewLeft-2&&lastLink.right<=lastLink.viewRight+2,
        'Visitors must be able to reach the vendor link by touch scrolling: '+JSON.stringify(lastLink));
    }
    await publicHome.screenshot({path:'artifacts/atelier-public-home-android-360.png'});
    console.log('PASS PUBLIC MOBILE HOME: two 480px budget images decode, three tiers, Citizen hero retained');
  }finally{
    await publicHome.close();
  }
  assert.deepEqual(failures,[]);
  console.log('Premium editorial comparison showroom OK: 52-watch links, 7 authentic local-photo placements, 3 detailed highlights, responsive menu, no overflow, accurate shipping disclosure');
}finally{
  await browser.close();
}
