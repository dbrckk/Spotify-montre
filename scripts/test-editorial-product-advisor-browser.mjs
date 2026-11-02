import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
assert.ok(origin.protocol==='https:'||
  origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname));
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const onError=(page,label)=>page.on('pageerror',e=>errors.push(label+': '+e.message));
const dimensions=async(page,label)=>{
  const r=await page.evaluate(()=>({
    client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth
  }));
  assert.ok(r.scroll<=r.client+2,label+' must not overflow '+JSON.stringify(r));
};
try{
 for(const width of [360,393,768,1366]){
  const page=await browser.newPage({viewport:{width,height:900},
    isMobile:width<768,hasTouch:width<768,locale:'fr-FR'});
  onError(page,'adviser-'+width);
  await page.goto(new URL('/conseiller.html',origin).href,{waitUntil:'domcontentloaded'});
  await page.locator('#advisorResults .advisor-card').first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('.advisor-direction').count(),3);
  assert.equal(await page.locator('#advisorResults .advisor-card').count(),3);
  const theme=await page.evaluate(()=>{
    const node=document.querySelector('.advisor-directions');
    return {
      sheet:[...document.styleSheets].some(s=>s.href?.includes('editorial-product-advisor-2026.css')),
      background:getComputedStyle(node).backgroundColor,
      font:parseFloat(getComputedStyle(document.querySelector('.advisor-options label>span small')).fontSize),
      buttons:[...document.querySelectorAll('.advisor-directions a')].map(a=>a.getBoundingClientRect().height)
    };
  });
  assert.ok(theme.sheet,'Adviser editorial theme must be loaded');
  assert.ok(theme.font>=13,'Adviser choices must be readable');
  assert.ok(theme.buttons.every(n=>n>=44),'Mobile style shortcuts must be touch-friendly');
  await dimensions(page,'adviser-'+width);
  const image=page.locator('.advisor-direction img').first();
  await image.scrollIntoViewIfNeeded();
  assert.ok(await image.evaluate(async img=>{
    if(!img.complete)await new Promise(resolve=>{
      img.addEventListener('load',resolve,{once:true});
      img.addEventListener('error',resolve,{once:true});
    });
    return img.naturalWidth>100;
  }),'Image of the exact watch must load');
  await page.screenshot({path:'artifacts/editorial-adviser-'+width+'.png',fullPage:true});
  await page.close();
 }
 // A visible inspiration must restore the existing adviser engine's radio,
 // suggest three sourced products and preserve the exact selected URL.
 for(const [query,key,value] of [
  ['style=retro','style','retro'],
  ['movement=automatic','movement','automatic'],
  ['style=sport','style','sport']
 ]){
  const page=await browser.newPage({viewport:{width:393,height:850},isMobile:true,hasTouch:true});
  onError(page,'shortcut-'+query);
  await page.goto(new URL('/conseiller.html?'+query+'#recommandations',origin).href,
    {waitUntil:'domcontentloaded'});
  await page.locator('#advisorResults .advisor-card').first().waitFor({state:'visible'});
  assert.ok(await page.locator('input[name="'+key+'"][value="'+value+'"]').isChecked(),
    'Shortcut '+query+' did not actually preselect the preference');
  assert.equal(await page.locator('#advisorResults .advisor-card').count(),3);
  assert.match(new URL(page.url()).search,new RegExp(key+'='+value));
  await dimensions(page,'adviser shortcut '+query);
  await page.close();
 }
 for(const [route,label,selector] of [
   ['/montre.html?id=citizen-tsuyosa','interactive','[id="detailArtwork"] img'],
   ['/montres/citizen-tsuyosa.html','indexed-core','.watch-product .photo img'],
   ['/montres/skmei-2056.html','indexed-extra','img']
 ]){
   const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
   onError(page,'product-'+label);
   const res=await page.goto(new URL(route,origin).href,{waitUntil:'domcontentloaded'});
   assert.ok(res?.ok(),'Product page must be served '+route);
   if(label==='interactive')await page.locator('#detailShell').waitFor({state:'visible',timeout:16000});
   const loaded=await page.evaluate(()=>[...document.styleSheets].some(s=>
     s.href?.includes('editorial-product-advisor-2026.css')));
   assert.ok(loaded,'Premium CSS missing from '+route);
   const productPhoto=page.locator(selector).first();
   await productPhoto.waitFor({state:'visible',timeout:16000});
   assert.ok(await productPhoto.evaluate(async img=>{
     if(!img.complete)await new Promise(resolve=>{
       img.addEventListener('load',resolve,{once:true});
       img.addEventListener('error',resolve,{once:true});
     });
     return img.naturalWidth>100;
   }),label+' must display source-backed genuine watch photography');
   await dimensions(page,'product '+label);
   await page.screenshot({path:'artifacts/editorial-product-'+label+'-393.png',fullPage:true});
   await page.close();
 }
 assert.deepEqual(errors,[],'No browser errors after premium adviser/product redesign');
 console.log('PASS editorial adviser and 3 product types, 360/393/768/1366, real images, live URL presets, no overflow');
}finally{await browser.close()}
