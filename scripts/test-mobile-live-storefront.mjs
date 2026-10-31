import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'https://atelier-montres-selection-fr.onrender.com';
const isAllowedPhoto=(url,id)=>{
  try {
    const resource=new URL(url),site=new URL(base);
    return resource.origin===site.origin && (
      resource.pathname==='/assets/watches/'+id+'.webp' ||
      resource.pathname==='/assets/watch-responsive/'+id+'-480.webp' ||
      resource.pathname==='/assets/watch-responsive/'+id+'-800.webp'
    );
  }catch{return false;}
};
const root=new URL(base);
assert.equal(root.protocol,'https:');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({
  viewport:{width:393,height:852},
  deviceScaleFactor:2,
  isMobile:true,
  hasTouch:true,
  locale:'fr-FR',
  colorScheme:'light',
});
const errors=[];
page.on('pageerror',err=>errors.push(err.message));
mkdirSync('artifacts',{recursive:true});
try{
  const response=await page.goto(new URL('/index.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(response?.ok(),'Home page must respond HTTP 2xx');
  const cards=page.locator('#affGrid .aff-card');
  await cards.first().waitFor({state:'visible',timeout:30000});
  assert.equal(await cards.count(),15,'All 15 real watches should be rendered as cards');
  const hero=page.locator('#heroWatch img.am-hero-real-photo');
  await hero.waitFor({state:'visible',timeout:25000});
  await hero.evaluate(img=>img.decode());
  const heroMeta=await hero.evaluate(img=>({naturalWidth:img.naturalWidth,currentSrc:img.currentSrc}));
  assert.ok(heroMeta.naturalWidth>=300&&isAllowedPhoto(heroMeta.currentSrc,'citizen-tsuyosa'),'Hero must show a genuine local Citizen photo');
  for(let i=0;i<15;i++){
    const card=cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    const img=card.locator('img.aff-product-photo');
    await img.waitFor({state:'visible',timeout:15000});
    await img.evaluate(node=>node.decode());
    const state=await img.evaluate(node=>({src:node.currentSrc,width:node.naturalWidth,height:node.naturalHeight}));
    assert.ok(state.width>=110&&state.height>=110,'Card '+i+' must decode with a nontrivial displayed image size: '+JSON.stringify(state));
    const model=await card.getAttribute('data-watch-id');
    assert.ok(isAllowedPhoto(state.src,model),'Card '+i+' must use a genuine same-origin photograph: '+state.src);
  }
  await page.screenshot({path:'artifacts/mobile-collection.png',fullPage:true});
  console.log('PASS MOBILE COLLECTION: hero + 15 actual model photos from local same-origin WebP files');
  const product=await page.goto(new URL('/montre.html?id=tissot-prx-auto',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(product?.ok(),'Product detail page should respond HTTP 2xx');
  await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  assert.match(await page.locator('#detailTitle').textContent(),/T1374071104100/);
  const detail=page.locator('#detailArtwork img.am-real-product-photo');
  await detail.waitFor({state:'visible',timeout:20000});
  await detail.evaluate(img=>img.decode());
  const detailState=await detail.evaluate(img=>({src:img.currentSrc,width:img.naturalWidth}));
  assert.ok(detailState.width>=300,'Actual detail watch image must decode at mobile-appropriate resolution');
  assert.ok(isAllowedPhoto(detailState.src,'tissot-prx-auto'),'Detail must use the exact Tissot model local photo or approved WebP derivative');
  const factRows=page.locator('#detailEssentials .detail-fact');
  assert.equal(await factRows.count(),4,'Mobile product sheet must display four source-grounded specifications');
  const quickFacts=await factRows.allTextContents();
  assert.ok(quickFacts.some(value=>value.includes('40 mm')),'Documented Tissot case diameter should be visible in product overview');
  assert.ok(quickFacts.some(value=>value.includes('10 bar')),'Documented Tissot water resistance should remain accurate');
  assert.ok(await page.locator('.detail-fast-nav a[href="#specTitle"]').isVisible(),'Mobile user should find the specification shortcut');
  const shell=await page.locator('#detailShell').boundingBox();
  assert.ok(shell?.height>250,'Product detail cannot be blank on mobile');
  await page.screenshot({path:'artifacts/mobile-tissot-product.png',fullPage:true});
  const editorial=await page.goto(new URL('/montres/citizen-tsuyosa.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(editorial?.ok(),'The canonical Citizen editorial product page should respond HTTP 2xx');
  assert.equal(await page.locator('article.watch-product').count(),1,'Search-indexable product must use the premium editorial layout');
  const sourcePhotoStage=page.locator('article.watch-product .watch-photo');
  // On a cold CDN/browser navigation, DOMContentLoaded can precede the
  // final stylesheet paint. Measure photo reservation only once our actual
  // mobile product CSS has been applied (before awaiting photo decoding).
  await page.waitForFunction(()=>{
    const stage=document.querySelector('article.watch-product .watch-photo');
    if(!stage)return false;
    const box=stage.getBoundingClientRect();
    const css=getComputedStyle(stage);
    return css.display==='flex'&&box.height>=340&&box.height<=410&&css.boxSizing==='border-box';
  },null,{timeout:20000});
  const reservedHeight=await sourcePhotoStage.evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(reservedHeight>=340&&reservedHeight<=410,'Canonical watch photo must reserve stable room before image decode: '+reservedHeight);
  const staticImage=page.locator('article.watch-product .watch-photo img');
  await staticImage.waitFor({state:'visible',timeout:20000});
  await staticImage.evaluate(img=>img.decode());
  const loadedHeight=await sourcePhotoStage.evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(Math.abs(loadedHeight-reservedHeight)<2,'Photo decoding must not move the editorial product introduction');
  const staticPhoto=await staticImage.evaluate(img=>({src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight}));
  assert.ok(staticPhoto.width>=300&&staticPhoto.height>=300&&isAllowedPhoto(staticPhoto.src,'citizen-tsuyosa'),'Indexable product uses the source-approved local Citizen image');
  const editorialFacts=page.locator('.watch-facts .watch-quickfact');
  assert.equal(await editorialFacts.count(),4,'Indexable product must show exactly four sourced-or-unknown facts');
  const editorialText=(await editorialFacts.allTextContents()).join(' ');
  assert.match(editorialText,/40 mm/,'Citizen diameter must come from the catalog');
  assert.match(editorialText,/Saphir/,'Citizen crystal must come from the catalog');
  for(const target of ['caracteristiques','comparatif','avant-achat','modeles-proches']){
    assert.equal(await page.locator('.watch-section-nav a[href="#'+target+'"]').count(),1,'Product navigation must link to '+target);
    assert.equal(await page.locator('#'+target).count(),1,'Product destination must exist: '+target);
  }
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert.ok(horizontalOverflow<=2,'Product page must not overflow Android viewport horizontally (overflow '+horizontalOverflow+'px)');
  await page.screenshot({path:'artifacts/mobile-citizen-editorial.png',fullPage:true});
  console.log('PASS MOBILE EDITORIAL: source-approved Citizen photo, four sourced facts, valid anchors and no horizontal viewport overflow');
  const casioSpec=await page.goto(new URL('/montres/casio-mdv107.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(casioSpec?.ok(),'The canonical Casio MDV-107 page should load');
  const casioFacts=(await page.locator('.watch-facts').textContent())||'';
  assert.match(casioFacts,/Dimensions du boîtier[\s\S]*49,5 × 44,2 × 12,1 mm/,'The rectangular L × l × H case size is not a diameter');
  assert.match(casioFacts,/20 bar/,'Exact Casio water resistance must come from its official technical sheet');
  assert.match(await page.locator('.watch-evidence').innerText(),/Caractéristiques constructeur recoupées/,'Dated manufacturer evidence required');
  assert.equal(await page.locator('.watch-evidence a').getAttribute('href'),'https://www.casio.com/fr/watches/casio/product.MDV-107-1A1V/');
  const vintage=await page.goto(new URL('/montre.html?id=casio-a168wa',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  assert.ok(vintage?.ok(),'The live interactive Casio Vintage page should load');
  await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  assert.match(await page.locator('#detailEssentials').innerText(),/Dimensions du boîtier[\s\S]*38,6 × 36,3 × 9,6 mm/,'A rectangular vintage case size is displayed as dimensions');
  assert.match(await page.locator('#detailSpecList').innerText(),/Diamètre du boîtier[\s\S]*À confirmer/,'Unknown circular diameter must stay unknown');
  assert.match(await page.locator('#detailEvidence').innerText(),/31 octobre 2026/,'Dated source provenance is visible on the interactive watch page');
  await page.screenshot({path:'artifacts/mobile-casio-vintage-facts.png',fullPage:true});
  console.log('PASS TECHNICAL PROVENANCE: Casio MDV-107 bar and case L × l × H, Casio A168 unknown diameter and dated official evidence');
  // Abort every local photo derivative of an exact model and verify the
  // fallback stays a same-origin, original SVG — never a third-party hotlink.
  const blocked=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
  const foreignImages=[];
  blocked.on('request',request=>{
    if(request.resourceType()==='image'&&new URL(request.url()).origin!==new URL(base).origin)
      foreignImages.push(request.url());
  });
  await blocked.route(/\/assets\/(?:watches\/casio-mdv107\.webp|watch-responsive\/casio-mdv107-\d+\.webp)(?:\?|$)/,
    route=>route.abort('failed'));
  await blocked.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  const brokenCard=blocked.locator('#affGrid .aff-card[data-watch-id="casio-mdv107"]');
  await brokenCard.waitFor({state:'visible',timeout:20000});
  await brokenCard.scrollIntoViewIfNeeded();
  await blocked.waitForFunction(()=>{
    const x=document.querySelector('#affGrid .aff-card[data-watch-id="casio-mdv107"] .aff-art-label');
    return x?.textContent.includes('ILLUSTRATION ORIGINALE');
  },{timeout:15000});
  assert.equal(await brokenCard.locator('img.aff-product-photo').count(),0,'Missing local product photo must render the original vector');
  await blocked.goto(new URL('/montre.html?id=casio-mdv107',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  await blocked.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  await blocked.waitForFunction(()=>document.querySelector('#detailPhotoLabel')?.textContent.includes('ILLUSTRATION ÉDITORIALE ORIGINALE'),{timeout:15000});
  assert.ok(await blocked.locator('#detailPhotoZoom').isHidden(),'Unavailable real photo must not offer a broken zoom');
  // The zoom receives a deliberately untrusted research URL with no
  // approved local file and must never use the third-party host.
  await blocked.evaluate(()=>{
    window.AtelierPhoto.open([{
      id:'missing-remote-test',brand:'Test',model:'Photographie absente',
      officialUrl:'https://www.casio.com/',
      photoReview:{publicUsageApproved:true,url:'https://untrusted.invalid/external.jpg'}
    }],'missing-remote-test');
  });
  await blocked.locator('#amPhotoDialog').waitFor({state:'visible',timeout:5000});
  assert.equal(await blocked.locator('#amPhotoDialog img.am-photo-large').getAttribute('src'),null,
    'A remote-only research image cannot be requested in full-screen zoom');
  assert.deepEqual(foreignImages,[],'Missing local watch photos must not trigger any external image requests');
  await blocked.close();
  console.log('PASS LOCAL PHOTO FALLBACK: gallery, product sheet and zoom never hotlink unreviewed images');
  assert.deepEqual(errors,[],'Uncaught browser errors on the storefront');
  console.log('PASS MOBILE DETAIL: Tissot PRX Powermatic 80 displayed, photo decoded, detail sheet visible');
}finally{
  await browser.close();
}
