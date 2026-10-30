import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts',{recursive:true});
const errors=[];
const isVector=async wrap=>{
 await wrap.scrollIntoViewIfNeeded();
 const svg=wrap.locator('svg.am-watch-svg');
 await svg.waitFor({state:'visible',timeout:8000});
 assert.match(await svg.getAttribute('aria-label')||'',/Interprétation vectorielle/,'Original unlicensed-image fallback required');
 assert.equal(await wrap.locator('img[src*="assets/watches/"]').count(),0,'Unlicensed photo must not be loaded');
};
const noOverflow=async(page,label)=>{
 const dimensions=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
 assert.ok(dimensions.scroll<=dimensions.client+2,label+' horizontal overflow: '+JSON.stringify(dimensions));
};
try{
 const phone=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
 phone.on('pageerror',e=>errors.push('Android: '+e.message));
 const response=await phone.goto(new URL('/conseiller.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 assert.ok(response?.ok(),'Watch adviser must be available via HTTP');
 const cards=phone.locator('#advisorResults .advisor-card');
 await cards.first().waitFor({state:'visible',timeout:20000});
 assert.equal(await cards.count(),3,'Three editorial starter recommendations');
 assert.match(await cards.first().locator('h3').innerText(),/MTP-1302PD-2A2V/);
 await noOverflow(phone,'Mobile adviser');
 await isVector(phone.locator('.advisor-hero-frame'));
 for(const card of await cards.all())await isVector(card.locator('.advisor-photo'));
 const compareLink=phone.locator('#advisorCompare');
 assert.ok(await compareLink.isVisible(),'Personalized shortlist must offer direct comparison');
 const deepLink=await compareLink.getAttribute('href');
 assert.match(deepLink||'',/compare=casio-mtp-1302,citizen-tsuyosa,tissot-prx-auto/,'Three accurate IDs pass to comparison');
 const compareTab=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
 try{
   await compareTab.goto(new URL(deepLink,phone.url()).href,{waitUntil:'domcontentloaded',timeout:30000});
   await compareTab.locator('#affCompareDialog').waitFor({state:'visible',timeout:20000});
   assert.equal(await compareTab.locator('#affCompareSelected .am-compare-selected-chip').count(),3,'One-tap compare must preserve all 3 recommended models');
 }finally{await compareTab.close()}
 assert.ok(await phone.locator('.am-mobile-nav>summary').isVisible(),'Mobile navigation must be visible');
 await phone.locator('.am-mobile-nav>summary').click();
 assert.ok(await phone.locator('.am-mobile-links a[href="./affiliation.html#montres"]').isVisible(),'Navigation can reach full collection');
 await phone.locator('.am-mobile-nav>summary').click();

 await phone.locator('input[name="tier"][value="essential"]').check();
 await phone.locator('input[name="style"][value="retro"]').check();
 assert.match(await cards.first().locator('h3').innerText(),/A168WA-1/,'Vintage starter under essential tier');
 assert.match(new URL(phone.url()).search,/tier=essential/);
 assert.match(new URL(phone.url()).search,/style=retro/);
 await phone.locator('input[name="movement"][value="quartz"]').check();
 assert.equal(await cards.count(),3);
 assert.match(await phone.locator('#advisorCriteria').innerText(),/3 préférences/i);
 const link=cards.first().locator('.advisor-card-actions .primary');
 assert.ok((await link.getAttribute('href')).startsWith('./montre.html?id='),'Every pick leads to exact product');
 await phone.screenshot({path:'artifacts/mobile-watch-advisor.png',fullPage:true});

 await phone.locator('#advisorReset').click();
 assert.match(await cards.first().locator('h3').innerText(),/MTP-1302PD-2A2V/,'Reset returns editorial starting point');
 assert.equal(new URL(phone.url()).search,'','Reset also clears shared preferences');
 assert.equal(await cards.count(),3);
 // Case-size preference can be used alone and shared as an URL without a server.
 await phone.locator('input[name="size"][value="compact"]').check();
 assert.match(new URL(phone.url()).search,/size=compact/,'Size preference is shareable');
 assert.match(await cards.first().locator('h3').innerText(),/MTP-B145D-2A2V/,'First compact result has documented 35 mm case');
 assert.match(await phone.locator('#advisorCriteria').innerText(),/1 préférence/);
 await noOverflow(phone,'Mobile case size preference');
 await phone.screenshot({path:'artifacts/mobile-watch-advisor-sizing.png',fullPage:true});
 await phone.locator('input[name="size"][value="medium"]').check();
 assert.match(await cards.first().locator('h3').innerText(),/MTP-1302PD-2A2V/,'Medium size starts with first documented 38.5mm model');
 assert.match(new URL(phone.url()).search,/size=medium/);
 await phone.locator('#advisorReset').click();
 assert.equal(new URL(phone.url()).search,'','Reset must clear the size preference');
 assert.match(await compareLink.getAttribute('href'),/compare=casio-mtp-1302,citizen-tsuyosa,tissot-prx-auto/,'Shortlist link updates after resetting filters');
 await phone.goto(new URL('/conseiller.html?tier=prestige&movement=automatic&size=compact',base).href,{waitUntil:'domcontentloaded'});
 await cards.first().waitFor({state:'visible'});
 assert.match(await phone.locator('#advisorCriteria').innerText(),/3 préférences/i);
 assert.equal(await phone.locator('input[name="tier"][value="prestige"]').isChecked(),true);
 assert.equal(await phone.locator('input[name="movement"][value="automatic"]').isChecked(),true);
 assert.equal(await phone.locator('input[name="size"][value="compact"]').isChecked(),true,'Deep link restores size preference');
 for(const card of await cards.all())await isVector(card.locator('.advisor-photo'));
 await noOverflow(phone,'Adviser URL filters');
 await phone.close();

 const desktop=await browser.newPage({viewport:{width:1366,height:900},locale:'fr-FR'});
 desktop.on('pageerror',e=>errors.push('Desktop: '+e.message));
 await desktop.goto(new URL('/conseiller.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#advisorResults .advisor-card').first().waitFor({state:'visible',timeout:20000});
 await noOverflow(desktop,'Desktop adviser');
 assert.ok(await desktop.locator('.am-header .navigation').isVisible(),'Desktop navigation visible');
 assert.equal(await desktop.locator('.advisor-question').count(),4,'Four factual advisory steps');
 assert.equal(await desktop.locator('#advisorResults .advisor-card').count(),3);
 await desktop.screenshot({path:'artifacts/desktop-watch-advisor.png',fullPage:true});
 await desktop.close();
 assert.deepEqual(errors,[],'No uncaught client-side JavaScript errors');
 console.log('PASS: Android + desktop watch adviser, 15 original illustrations, four preferences, sizing deep links, matching models, no overflow');
}finally{
 await browser.close();
}
