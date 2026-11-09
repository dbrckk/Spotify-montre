import assert from 'node:assert/strict';
import {mkdirSync,existsSync} from 'node:fs';
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
// Check the actual approved model assets, not page decoration. Six distinct
// editorial collections share real source photos and typographic fallbacks.
const photoCards=async(page,slug,count)=>{
  const cards=await page.locator('.am-shopper-grid .am-shopper-card').evaluateAll(nodes=>nodes.map(card=>{
    const id=card.dataset.shopperWatch,stage=card.querySelector('.am-shopper-art');
    const img=stage?.querySelector('img'),link=stage?.querySelector('a.am-shopper-photo-link');
    const source=img?.getAttribute('src')||null;
    return {id,hasPhoto:stage?.classList.contains('am-shopper-real-photo')||false,
      source,srcset:img?.getAttribute('srcset')||'',sizes:img?.getAttribute('sizes')||'',
      width:img?.getAttribute('width')||'',height:img?.getAttribute('height')||'',
      alt:img?.getAttribute('alt')??null,loading:img?.getAttribute('loading')||'',
      link:link?.getAttribute('href')||'',label:link?.getAttribute('aria-label')||'',
      stageWidth:stage?.getBoundingClientRect().width||0,
      imageWidth:img?.getBoundingClientRect().width||0};
  }));
  assert.equal(cards.length,count,'All sourced watches must remain visible: '+slug);
  let pictured=0,unpictured=0;
  for(const card of cards){
    assert.match(card.id,/^[a-z0-9-]+$/,'Source model ID must be valid: '+slug);
    if(!card.hasPhoto){
      unpictured++;
      assert.equal(card.source,null,'Unphotographed model cannot acquire a synthetic product photo');
      assert.equal(card.link,'','No inert clickable photo wrapper for unknown image');
      continue;
    }
    pictured++;
    assert.equal(card.source?.includes('/'+card.id+'.webp'),true,
      'Photograph must belong to its actual exact watch reference: '+card.id);
    const supplemental=card.source.startsWith('../assets/watches-popular/');
    assert.ok(supplemental||card.source.startsWith('../assets/watches/'),
      'Image must be a vetted local model photograph: '+card.id);
    assert.equal(card.link,'../montres/'+card.id+'.html',
      'Clicking the photograph must open that model information: '+card.id);
    assert.match(card.label,/Consulter la fiche et les sources/);
    assert.equal(card.alt,'','A labeled image link should not repeat its name to screen readers');
    assert.equal(card.loading,'lazy');
    const width=Number(card.width),height=Number(card.height);
    assert.ok(Number.isInteger(width)&&width>0&&Number.isInteger(height)&&height>0,
      'Real photograph must reserve genuine source dimensions: '+card.id);
    assert.ok(card.stageWidth>=150&&card.imageWidth>=120&&card.imageWidth<=card.stageWidth+2,
      'Photographs must occupy the premium stage without overflow: '+JSON.stringify(card));
    const baseFolder=supplemental?'popular-responsive':'watch-responsive';
    const sizes=supplemental?[240,360,480,720,960]:[480,800];
    const variants=sizes.filter(size=>size<width
      &&existsSync('site/assets/'+baseFolder+'/'+card.id+'-'+size+'.webp'));
    if(variants.length){
      assert.equal(card.sizes,'(max-width:420px) 75vw, 280px',
        'The image candidates must match the card geometry');
      for(const size of variants)
        assert.ok(card.srcset.includes('../assets/'+baseFolder+'/'+card.id+'-'+size+'.webp'),
          'Missing real mobile derivative '+card.id+':'+size);
      assert.ok(card.srcset.includes(card.source),
        'The exact original remains as high-resolution fallback: '+card.id);
    }else assert.equal(card.srcset,'','Never generate an unavailable responsive image');
  }
  assert.ok(pictured>0,'Every editorial collection must show at least one genuine image: '+slug);
  return {pictured,unpictured};
};
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
  const focus=phone.locator('#selection-10-montres');
  assert.equal(await focus.locator('.am-focus-item').count(),10,
    'The commercial curation must keep all ten genuine catalogue models');
  const matched=focus.locator('#selection-avec-asin .am-focus-item');
  const sourceOnly=focus.locator('#selection-sources-marchandes .am-focus-item');
  assert.equal(await matched.count(),6,'Six documented ASIN models must lead the buyer shortlist');
  assert.equal(await sourceOnly.count(),4,'Four source-only models must be labeled separately');
  assert.equal(await matched.first().getAttribute('data-focus-id'),'addiesdive-ad2030');
  assert.equal(await sourceOnly.first().getAttribute('data-focus-id'),'skmei-2056');
  assert.equal(await matched.first().getAttribute('data-evidence'),'documented-asin');
  assert.equal(await sourceOnly.first().getAttribute('data-evidence'),'manufacturer-source');
  assert.match(await matched.first().locator('.am-focus-proof-label').innerText(),
    /stock actuel non confirmés/);
  assert.match(await sourceOnly.first().locator('.am-focus-proof-label').innerText(),
    /aucun ASIN exact établi/);
  assert.equal(await focus.locator('.am-focus-jump a').count(),2,
    'Both source categories must remain reachable by touch and keyboard');
  await focus.locator('.am-focus-jump a[href="#selection-sources-marchandes"]').click();
  assert.equal(new URL(phone.url()).hash,'#selection-sources-marchandes');
  await noOverflow(phone,'Android 393px commercial evidence groups');
  await focus.locator('.am-focus-group-heading').first().screenshot({
    path:'artifacts/mobile-am05-evidence-groups.png'
  });
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
    await photoCards(phone,selection.slug,selection.count);
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
  // Complete the same responsive image audit on three six-watch commercial
  // selections; these must never load full originals on Android by default.
  for(const [slug,count] of [
    ['montres-femme-accessibles',6],
    ['montres-homme-style-accessible',6],
    ['montres-automatiques-selection',6]
  ]){
    await phone.goto(new URL('/montres/'+slug+'.html',base).href,{waitUntil:'domcontentloaded'});
    const measured=await photoCards(phone,slug,count);
    assert.ok(measured.pictured+measured.unpictured===6);
    await noOverflow(phone,'Real photographs at Android 393px: '+slug);
  }
  await phone.goto(new URL('/montres/montres-skmei.html',base).href,{waitUntil:'domcontentloaded'});
  const packshot=phone.locator('[data-shopper-watch="skmei-1251"] .am-shopper-photo-link img');
  await packshot.scrollIntoViewIfNeeded();
  await packshot.evaluate(img=>img.decode());
  const actuallyLoaded=await packshot.evaluate(img=>({
    pathname:new URL(img.currentSrc).pathname,
    width:img.naturalWidth,displayWidth:img.getBoundingClientRect().width
  }));
  assert.match(actuallyLoaded.pathname,
    /^\/assets\/popular-responsive\/skmei-1251-[0-9]+\.webp$/,
    'Chromium Android must choose a genuine compact WebP instead of the original');
  assert.ok(actuallyLoaded.width>0&&actuallyLoaded.displayWidth>120,
    'The exact-model photo must render at a usable display size');
  await packshot.locator('xpath=..').screenshot({path:'artifacts/android-premium-sourced-packshot.png'});
  await packshot.locator('xpath=..').click();
  assert.equal(new URL(phone.url()).pathname,'/montres/skmei-1251.html',
    'The whole premium photo must open the exact model fact sheet');

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
  await verySmall.goto(new URL('/montres/modeles-populaires.html',base).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await verySmall.locator('.am-focus-group .am-focus-item').count(),10);
  await noOverflow(verySmall,'Narrow Android 320px grouped watch shortlist');
  await verySmall.close();

  const withoutJs=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,javaScriptEnabled:false});
  await withoutJs.goto(new URL('/montres/montres-skmei.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await withoutJs.locator('.am-shopper-grid .am-shopper-card:visible').count(),10,
    'All SKMEI references must remain browsable with JavaScript disabled');
  assert.equal(await withoutJs.locator('.am-shopper-matrix tbody tr').count(),10);
  await noOverflow(withoutJs,'SKMEI page without JS');
  await withoutJs.goto(new URL('/montres/modeles-populaires.html',base).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await withoutJs.locator('.am-focus-item:visible').count(),10,
    'All 10 source-backed choices remain visible without JavaScript');
  assert.equal(await withoutJs.locator('.am-focus-jump a').count(),2);
  await noOverflow(withoutJs,'Shortlist without JavaScript');
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
