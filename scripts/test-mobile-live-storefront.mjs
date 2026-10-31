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
    assert.ok(state.width>=240&&state.height>=240,'Card '+i+' image must decode and be high quality');
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
  assert.ok(detailState.width>=500,'Actual detail watch image must load');
  assert.ok(detailState.src.includes('/assets/watches/tissot-prx-auto.webp'),'Detail must use real local watch image');
  const shell=await page.locator('#detailShell').boundingBox();
  assert.ok(shell?.height>250,'Product detail cannot be blank on mobile');
  await page.screenshot({path:'artifacts/mobile-tissot-product.png',fullPage:true});
  assert.deepEqual(errors,[],'Uncaught browser errors on the storefront');
  console.log('PASS MOBILE DETAIL: Tissot PRX Powermatic 80 displayed, photo decoded, detail sheet visible');
}finally{
  await browser.close();
}
