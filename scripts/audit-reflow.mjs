import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

// Reflow at 320 CSS px approximates a 1280 px desktop browser at 400% page
// zoom (WCAG 1.4.10). The audit is of layout, not a substitute for TalkBack,
// VoiceOver or manual browser-zoom and screen-reader examinations.
const origin=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const root=resolve('site');
const manifest=JSON.parse(readFileSync(resolve(root,'seo-manifest.json'),'utf8'));
const indexable=manifest.paths.map(url=>new URL(url).pathname);
const extras=readdirSync(root).filter(n=>n.endsWith('.html')&&!/^google[a-f0-9]+\.html$/i.test(n)).map(n=>'/'+n);
const paths=[...new Set([...indexable,...extras,'/montre.html?id=citizen-tsuyosa'])].sort();
const report={method:'320 CSS-pixel reflow ≈ 400% page zoom of a 1280 CSS-pixel desktop viewport',
  measuredAt:new Date().toISOString(),pages:[],interactions:[],failures:[]};
const screenshots='artifacts/reflow';
mkdirSync(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true});
const strict=process.env.A11Y_ENFORCE==='1';

async function measure(page,label){
  const info=await page.evaluate(()=>{
    const root=document.documentElement;
    const width=root.clientWidth;
    const overflow=root.scrollWidth-width;
    const out=[];
    if(overflow>2){
      for(const el of document.querySelectorAll('body *')){
        if(out.length>=12)break;
        const style=getComputedStyle(el);
        if(style.display==='none'||style.visibility==='hidden')continue;
        const r=el.getBoundingClientRect();
        if(r.width&&r.right>width+3&&r.left<width+10)
          out.push({tag:el.tagName.toLowerCase(),id:el.id,cls:String(el.className).slice(0,100),
            left:Math.round(r.left),right:Math.round(r.right),scrollWidth:el.scrollWidth});
      }
    }
    return {width,scrollWidth:root.scrollWidth,overflow,offenders:out};
  });
  report.pages.push({label,...info});
  if(info.overflow>2)report.failures.push({label,reason:'document horizontal overflow',...info});
  return info;
}
async function control(page,selector,label,{min=24}={}){
  const locator=page.locator(selector).first();
  await locator.waitFor({state:'visible'});
  const r=await locator.evaluate(el=>{
    const b=el.getBoundingClientRect();
    return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,
      viewportWidth:document.documentElement.clientWidth,viewportHeight:window.innerHeight};
  });
  const passed=r.left>=-2&&r.right<=r.viewportWidth+2&&r.width>=min&&r.height>=min;
  report.interactions.push({label,selector,passed,rect:r});
  if(!passed)report.failures.push({label,selector,reason:'control clipped or too small',rect:r});
}
async function navigation(page,path){
  const res=await page.goto(new URL(path,origin).href,{waitUntil:'domcontentloaded',timeout:25000});
  if(!res?.ok())throw Error('HTTP '+res?.status()+' '+path);
  if(path==='/'||path==='/index.html'||path==='/affiliation.html'){
    await page.locator('#affGrid .aff-card').first().waitFor({state:'visible',timeout:20000});
  }
  if(path.includes('montre.html?id='))await page.locator('#detailShell').waitFor({state:'visible'});
}
async function screenshot(page,id){await page.screenshot({path:screenshots+'/'+id+'.png',fullPage:true})}
try{
  const context=await browser.newContext({viewport:{width:320,height:640},deviceScaleFactor:1,
    isMobile:true,hasTouch:true,locale:'fr-FR',reducedMotion:'reduce'});
  const page=await context.newPage();
  page.setDefaultTimeout(18000);
  page.on('pageerror',err=>report.failures.push({label:'runtime',reason:err.message}));
  for(const path of paths){
    try{
      await navigation(page,path);
      await measure(page,'320 '+path);
      if(path==='/montres/citizen-tsuyosa.html')await screenshot(page,'watch-product-320');
      if(path==='/conseiller.html'){
        await control(page,'#advisorReset','320 advisor reset');
        await screenshot(page,'advisor-320');
      }
      if(path==='/montre.html?id=citizen-tsuyosa')
        await control(page,'#detailPhotoZoom','320 dynamic watch photo zoom');
      if(path==='/montres/comparer-tissot-prx-quartz-vs-powermatic-80.html')
        await screenshot(page,'editorial-comparison-320');
    }catch(err){report.failures.push({label:'320 '+path,reason:String(err).slice(0,380)})}
  }
  // Exercise difficult overlays at the 320px layout (not only static pages).
  await navigation(page,'/');
  await control(page,'.am-mobile-nav>summary','320 mobile navigation button');
  const menu=page.locator('details.am-mobile-nav').first();
  await menu.locator('summary').click();
  await measure(page,'320 menu open');
  await control(page,'.am-mobile-links a','320 mobile menu link');
  await menu.locator('summary').click();
  await screenshot(page,'catalogue-320');
  await page.locator('#affViewGallery').click();
  await page.waitForFunction(()=>document.querySelector('#affGrid')?.dataset.view==='gallery');
  await measure(page,'320 gallery view');
  const columns=await page.locator('#affGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  if(columns!==1)report.failures.push({label:'320 gallery view',reason:'320px reflow needs one column, got '+columns});
  await screenshot(page,'gallery-320');
  await page.locator('#affViewDetail').click();
  const checks=page.locator('#affGrid .am-compare-check input');
  await checks.nth(0).check();await checks.nth(1).check();
  await measure(page,'320 comparison dock');
  await control(page,'#affCompareOpen','320 compare action');
  await page.locator('#affCompareOpen').click();
  await page.locator('#affCompareDialog').waitFor({state:'visible'});
  await measure(page,'320 comparison dialog');
  for(const [selector,label] of [
    ['#affCompareClose','320 comparison close'],
    ['#affCompareShare','320 comparison share'],
    ['#affCompareOnlyDiff','320 comparison difference filter'],
    ['.am-compare-mobile-nav button:last-child','320 comparison next']
  ])await control(page,selector,label);
  await screenshot(page,'comparison-dialog-320');
  await page.locator('#affCompareOnlyDiff').click();
  await measure(page,'320 differences-only dialog');
  await page.locator('#affCompareClose').click();
  await checks.nth(2).check();
  await checks.nth(3).click();
  await page.locator('#affCompareReplaceDialog').waitFor({state:'visible'});
  await measure(page,'320 replacement dialog');
  await control(page,'#affReplaceCancel','320 replacement cancel');
  await screenshot(page,'replacement-dialog-320');
  await page.locator('#affReplaceCancel').click();
  const zoom=page.locator('#affGrid .aff-photo-expand').first();
  await zoom.click();
  await page.locator('#amPhotoDialog').waitFor({state:'visible'});
  await measure(page,'320 photographic viewer');
  for(const [selector,label] of [
    ['.am-photo-close','320 photo close'],
    ['.am-photo-zoom','320 photo zoom'],
    ['.am-photo-official','320 manufacturer source link']
  ])await control(page,selector,label);
  await screenshot(page,'photo-dialog-320');
  await page.locator('.am-photo-close').click();
  await context.close();
}finally{
  await browser.close();
  writeFileSync('artifacts/accessibility-reflow-report.json',JSON.stringify(report,null,2));
}
const failed=report.failures;
console.log('Reflow accessibility audit:',JSON.stringify({
  uniqueRoutes:paths.length,measurements:report.pages.length,controlChecks:report.interactions.length,
  failures:failed.length}));
for(const failure of failed.slice(0,30))console.error('REFLOW',JSON.stringify(failure).slice(0,1050));
if(strict&&failed.length)throw Error(failed.length+' zoom/reflow failures; inspect artifacts/accessibility-reflow-report.json');
