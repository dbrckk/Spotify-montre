import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&
  ['localhost','127.0.0.1'].includes(origin.hostname)),
  'Allow only localhost HTTP or a real HTTPS testing endpoint');
const selections=[
  {slug:'montres-skmei',count:10,first:'skmei-1251',compare:['skmei-2056','skmei-2256','skmei-9156']},
  {slug:'montres-pagani-design',count:3,first:'pagani-pd1701',compare:['pagani-pd1701','pagani-pd1751','pagani-pd1776']},
  {slug:'montres-numeriques',count:12,first:'skmei-1251',compare:['skmei-2056','casio-f91w-1','skmei-2471']}
];
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
const noOverflow=async (page,label)=>{
  const width=await page.evaluate(()=>({inner:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
  assert.ok(width.scroll<=width.inner+2,label+': horizontal page overflow '+JSON.stringify(width));
};
try {
  const phone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  phone.on('pageerror',e=>errors.push('Android: '+e.message));
  await phone.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded'});
  for(const selection of selections){
    const nav=phone.locator('.am-shopper-nav-home a[href="./montres/'+selection.slug+'.html"]');
    assert.equal(await nav.count(),1,'Home must link to the distinct targeted collection: '+selection.slug);
  }
  await phone.goto(new URL('/montres/modeles-populaires.html',base).href,{waitUntil:'domcontentloaded'});
  for(const selection of selections)
    assert.equal(await phone.locator('.am-shopper-nav a[href="./'+selection.slug+'.html"]').count(),1,
      'All supplementary watch cards must give a direct path to category: '+selection.slug);

  for(const selection of selections){
    const path='/montres/'+selection.slug+'.html';
    const response=await phone.goto(new URL(path,base).href,{waitUntil:'domcontentloaded'});
    assert.ok(response?.ok(),'Public editorial category page must exist '+path);
    assert.equal(await phone.locator('main h1').count(),1,'One descriptive H1 '+path);
    const canonical=await phone.locator('link[rel="canonical"]').getAttribute('href');
    assert.equal(new URL(canonical).pathname,path);
    const cards=phone.locator('.am-shopper-grid article.am-shopper-card');
    assert.equal(await cards.count(),selection.count,'Source-backed card count '+path);
    assert.equal(await phone.locator('.am-shopper-matrix tbody tr').count(),selection.count,
      'Factual matrix must cover all original models '+path);
    const first=phone.locator('.am-shopper-matrix tr[data-matrix-watch="'+selection.first+'"]');
    assert.ok(await first.count(),'The matrix references only real catalogue watch IDs '+path);
    assert.equal(await phone.locator('.am-shopper-insight-grid article').count(),3,
      'Three editorial purchase criteria, not SEO filler '+path);
    const expectedUrl='./toutes-les-montres.html?compare='+selection.compare.join(',')+'#comparer';
    const actions=phone.locator('a.am-shopper-compare');
    assert.equal(await actions.count(),2,'Visible comparison near model listing and fact matrix '+path);
    for(const link of await actions.all())
      assert.equal(await link.getAttribute('href'),expectedUrl,
        'Comparable models must be the three selected source references '+path);
    const schema=JSON.parse(await phone.locator('script[type="application/ld+json"]').first().textContent());
    const list=schema['@graph'].find(x=>x['@type']==='ItemList');
    assert.equal(list.numberOfItems,selection.count,'ItemList count must match visible HTML '+path);
    assert.equal(list.itemListElement.length,selection.count);
    assert.equal(await cards.locator('a[href*=".html"]').count()>0,true);
    assert.equal(await cards.locator('img[src*="watches-popular"]').count()>0,true,
      'Watch pictures come from documented local source, not artificial stock photographs');
    assert.equal(await phone.locator('meta[property="product:price:amount"]').count(),0);
    await noOverflow(phone,'Android '+path);
    if(selection.slug==='montres-skmei'||selection.slug==='montres-pagani-design')
      await phone.screenshot({path:'artifacts/mobile-'+selection.slug+'.png',fullPage:true});
  }
  // Link must be usable, not merely an attractive inactive button.
  await phone.goto(new URL('/montres/montres-pagani-design.html',base).href,{waitUntil:'domcontentloaded'});
  await phone.locator('.am-shopper-intent-nav .am-shopper-compare').click();
  await phone.locator('#udCompareTable table').waitFor({state:'visible',timeout:20000});
  assert.equal(await phone.locator('#udCompareTable th[scope=col]').count(),4);
  const selected=await phone.locator('#udTrayItems button[data-tray-remove]').evaluateAll(
    els=>els.map(el=>el.dataset.trayRemove));
  assert.deepEqual(selected,selections[1].compare,'Comparing must restore exactly the three Pagani IDs');
  await phone.close();

  const verySmall=await browser.newPage({viewport:{width:320,height:740},isMobile:true,hasTouch:true,locale:'fr-FR'});
  await verySmall.goto(new URL('/montres/montres-numeriques.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await verySmall.locator('.am-shopper-card').count(),12);
  await noOverflow(verySmall,'Narrow Android 320px digital collection');
  await verySmall.close();

  const withoutJs=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,javaScriptEnabled:false});
  await withoutJs.goto(new URL('/montres/montres-skmei.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await withoutJs.locator('.am-shopper-grid .am-shopper-card:visible').count(),10,
    'All SKMEI references must remain browsable with JavaScript disabled');
  assert.equal(await withoutJs.locator('.am-shopper-matrix tbody tr').count(),10);
  await noOverflow(withoutJs,'SKMEI page without JS');
  await withoutJs.close();

  const desktop=await browser.newPage({viewport:{width:1366,height:900},locale:'fr-FR'});
  desktop.on('pageerror',e=>errors.push('Desktop: '+e.message));
  await desktop.goto(new URL('/montres/montres-numeriques.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await desktop.locator('.am-shopper-card').count(),12);
  await noOverflow(desktop,'Desktop digital collection');
  await desktop.screenshot({path:'artifacts/desktop-montres-numeriques.png',fullPage:true});
  await desktop.close();
  assert.deepEqual(errors,[],'New indexed pages and comparator must load without client-side JavaScript errors');
  console.log('PASS: SKMEI 10, Pagani 3, digital 12, canonical + schema + source-backed matrix, Android 320/393, desktop, no-JS and real comparison navigation');
} finally { await browser.close() }
