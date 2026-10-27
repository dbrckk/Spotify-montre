import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const browser=await chromium.launch({headless:true});
mkdirSync('artifacts',{recursive:true});
const errors=[];
const isLocal=async img=>{
 await img.scrollIntoViewIfNeeded();
 await img.evaluate(el=>el.decode());
 const photo=await img.evaluate(el=>({src:el.currentSrc,width:el.naturalWidth,height:el.naturalHeight}));
 assert.ok(photo.width>=240&&photo.height>=240,'Real photograph must decode at sufficient quality: '+JSON.stringify(photo));
 assert.ok(photo.src.includes('/assets/watches/'),'Real photograph must be first-party local WebP: '+photo.src);
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
 await isLocal(phone.locator('.advisor-hero-frame img'));
 for(const card of await cards.all())await isLocal(card.locator('.advisor-photo img'));
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
 await phone.goto(new URL('/conseiller.html?tier=prestige&movement=automatic',base).href,{waitUntil:'domcontentloaded'});
 await cards.first().waitFor({state:'visible'});
 assert.match(await phone.locator('#advisorCriteria').innerText(),/2 préférences/i);
 assert.equal(await phone.locator('input[name="tier"][value="prestige"]').isChecked(),true);
 assert.equal(await phone.locator('input[name="movement"][value="automatic"]').isChecked(),true);
 for(const card of await cards.all())await isLocal(card.locator('.advisor-photo img'));
 await noOverflow(phone,'Adviser URL filters');
 await phone.close();

 const desktop=await browser.newPage({viewport:{width:1366,height:900},locale:'fr-FR'});
 desktop.on('pageerror',e=>errors.push('Desktop: '+e.message));
 await desktop.goto(new URL('/conseiller.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
 await desktop.locator('#advisorResults .advisor-card').first().waitFor({state:'visible',timeout:20000});
 await noOverflow(desktop,'Desktop adviser');
 assert.ok(await desktop.locator('.am-header .navigation').isVisible(),'Desktop navigation visible');
 assert.equal(await desktop.locator('.advisor-question').count(),3,'Exactly three advisory steps');
 assert.equal(await desktop.locator('#advisorResults .advisor-card').count(),3);
 await desktop.screenshot({path:'artifacts/desktop-watch-advisor.png',fullPage:true});
 await desktop.close();
 assert.deepEqual(errors,[],'No uncaught client-side JavaScript errors');
 console.log('PASS: Android + desktop watch adviser, 15 local photo catalogue, selectable preferences, deep links, matching models, no overflow');
}finally{
 await browser.close();
}
