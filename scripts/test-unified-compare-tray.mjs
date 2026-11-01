import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

// The test always uses the built, local HTTP store by default; no remote
// browser, account or paid service is required.
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&
  ['localhost','127.0.0.1'].includes(origin.hostname)),'Only localhost HTTP or real HTTPS');
const browser=await chromium.launch({headless:true});
const errors=[];
const checkOverflow=async(page,label)=>{
  const w=await page.evaluate(()=>({client:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
  assert.ok(w.scroll<=w.client+2,label+': horizontal overflow '+JSON.stringify(w));
};
mkdirSync('artifacts',{recursive:true});
try{
  const phone=await browser.newPage({viewport:{width:393,height:852},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
  phone.on('pageerror',e=>errors.push('mobile: '+e.message));
  await phone.goto(new URL('/montres/toutes-les-montres.html',base).href,{waitUntil:'domcontentloaded'});
  await phone.locator('#udFilters').waitFor({state:'visible'});
  const tray=phone.locator('#udCompareTray');
  assert.equal(await tray.isVisible(),false,'The dock must not obstruct browsing before selection');
  assert.equal(await phone.locator('.ud-card').count(),52);
  await phone.locator('#modele-skmei-2056 button.ud-select').click();
  assert.ok(await tray.isVisible(),'Selecting one watch reveals the accessible compare tray');
  assert.equal(await phone.locator('#udTrayItems li').count(),1);
  assert.match(await phone.locator('#udTrayCount').innerText(),/1 sur 3/);
  assert.equal(await phone.locator('#udTrayOpen').isVisible(),false,'Comparison starts only at two watches');
  assert.match(new URL(phone.url()).search,/compare=skmei-2056/);
  await checkOverflow(phone,'Mobile one-watch tray');
  await phone.locator('#modele-citizen-tsuyosa button.ud-select').click();
  assert.equal(await phone.locator('#udTrayItems li').count(),2);
  assert.ok(await phone.locator('#udTrayOpen').isVisible(),'Two watches unlock direct comparison');
  assert.equal(await phone.locator('#udCompareTable table').count(),1,
    'Actual fact-by-fact comparison must render from the source-backed JSON');
  assert.match(new URL(phone.url()).search,/compare=skmei-2056%2Ccitizen-tsuyosa/);
  await phone.locator('#udTrayOpen').click();
  assert.equal(new URL(phone.url()).hash,'#comparer',
    'Opening the dock must navigate to the actual on-page table');
  assert.equal(await phone.locator('#udCompareTable th[scope=col]').count(),3);
  await phone.locator('#udTrayItems button[data-tray-remove="skmei-2056"]').click();
  assert.equal(await phone.locator('#udTrayItems li').count(),1,'Chip removal updates shared selection');
  assert.equal(await phone.locator('#udCompareTable table').count(),0,
    'Table is hidden until two real products remain');
  await phone.locator('#udBrand').selectOption('SKMEI');
  assert.equal(await tray.isVisible(),true,'Selection remains available after filtering');
  await phone.locator('#udBrand').selectOption('all');
  await phone.locator('#modele-skmei-2514 button.ud-select').click();
  await phone.locator('#modele-casio-f91w-1 button.ud-select').click();
  assert.equal(await phone.locator('#udTrayItems li').count(),3);
  assert.equal(await phone.locator('#udCompareTable th[scope=col]').count(),4,
    'Three real references must be compared');
  assert.match(await phone.locator('#udTrayOpen').innerText(),/Comparer 3/);
  // Selecting a fourth is explicitly denied rather than silently replacing a watch.
  await phone.locator('#modele-skmei-2056 button.ud-select').click();
  assert.match(await phone.locator('#udCompareStatus').innerText(),/Trois modèles maximum/);
  assert.equal(await phone.locator('#udTrayItems li').count(),3);
  await checkOverflow(phone,'Mobile three-watch tray');
  await phone.screenshot({path:'artifacts/mobile-unified-compare-tray.png',fullPage:false});
  await phone.locator('#udTrayClear').click();
  assert.equal(await tray.isVisible(),false);
  assert.equal(await phone.locator('#udCompareTable table').count(),0);
  assert.equal(new URL(phone.url()).searchParams.has('compare'),false,
    'Clearing selection also removes the shareable comparison URL');

  // The visual-only filters are backed by the 15 approved core photos and
  // the 21 source-registry approved supplemental photos; no fake packshots.
  assert.equal(await phone.locator('.ud-card[data-visual="photo"]').count(),36,
    'Only the 36 owner-attested local model photos receive photo-backed cards');
  assert.equal(await phone.locator('.ud-card[data-visual="no-photo"]').count(),16,
    'The remaining 16 models must disclose missing published photos');
  assert.equal(await phone.locator('button.ud-zoom').count(),36,
    'Photo zoom is never offered for a fallback or unapproved visual');
  await phone.locator('#udVisual').selectOption('photo');
  assert.equal(await phone.locator('.ud-card:visible').count(),36,
    'Photo-only filter lists strictly documented photographed models');
  assert.match(new URL(phone.url()).search,/visual=photo/);
  await phone.locator('#udViewLarge').click();
  assert.equal(await phone.locator('#udGrid.ud-view-large').count(),1,
    'Large showroom mode must change the real grid layout');
  assert.equal(await phone.locator('#udViewLarge').getAttribute('aria-pressed'),'true');
  assert.equal(new URL(phone.url()).searchParams.get('view'),'large',
    'The selected photo layout should be shareable in URL');

  const model=phone.locator('#modele-skmei-2056');
  await model.locator('button.ud-zoom').click();
  const dialog=phone.locator('#amPhotoDialog');
  await dialog.waitFor({state:'visible'});
  assert.match(await dialog.locator('.am-photo-title').innerText(),/SKMEI.*2056/,
    'Zoom must show the exact watch model, not an unrelated product picture');
  await dialog.locator('img.am-photo-large').waitFor({state:'visible'});
  assert.ok(await dialog.locator('img.am-photo-large').evaluate(img=>
    img.naturalWidth>100&&img.currentSrc.includes('watches-popular/skmei-2056.webp')),
    'The licensed local SKMEI photo must be decoded in the viewer');
  assert.match(await dialog.locator('.am-photo-note').innerText(),/sans vérification indépendante des licences/,
    'The editorial photo-rights declaration must not be presented as an independently proven licence');
  await phone.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  await checkOverflow(phone,'Mobile large photo layout');

  // Fallback-only views must never show a made-up product rendering.
  await phone.locator('#udVisual').selectOption('no-photo');
  assert.equal(await phone.locator('.ud-card:visible').count(),16);
  const missing=phone.locator('.ud-card[data-visual="no-photo"]:visible');
  assert.equal(await missing.locator('img').count(),0);
  assert.equal(await missing.locator('.ud-zoom').count(),0);
  assert.match(await missing.first().locator('.ud-art-fallback').innerText(),/Aucune photographie publiée/,
    'Unphotographed models must carry an explicit and consistent disclaimer');
  await phone.screenshot({path:'artifacts/mobile-watch-visual-gallery.png',fullPage:false});
  await phone.locator('#udVisual').selectOption('all');
  assert.equal(await phone.locator('.ud-card:visible').count(),52);
  await phone.locator('#udViewCompact').click();
  assert.equal(await phone.locator('#udGrid.ud-view-large').count(),0);
  assert.equal(new URL(phone.url()).searchParams.has('view'),false);
  assert.equal(await phone.locator('#udViewCompact').getAttribute('aria-pressed'),'true');
  await phone.close();

  const linked=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  linked.on('pageerror',e=>errors.push('deep-link: '+e.message));
  await linked.goto(new URL('/montres/toutes-les-montres.html?compare=skmei-2056,citizen-tsuyosa#comparer',base).href,
    {waitUntil:'domcontentloaded'});
  await linked.locator('#udTrayOpen').waitFor({state:'visible'});
  assert.equal(await linked.locator('#udTrayItems li').count(),2,
    'Shared advisor links restore dock chips');
  assert.equal(await linked.locator('#udCompareTable th[scope=col]').count(),3);
  await checkOverflow(linked,'Deep-link mobile');
  await linked.close();

  const noJs=await browser.newPage({viewport:{width:393,height:852},
    javaScriptEnabled:false,isMobile:true,hasTouch:true});
  await noJs.goto(new URL('/montres/toutes-les-montres.html',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await noJs.locator('.ud-card:visible').count(),52,
    'All factual watch cards must remain visible without JS or feed fetching');
  assert.equal(await noJs.locator('#udCompareTray:visible').count(),0,
    'The new dock must never appear as a broken control without JS');
  assert.equal(await noJs.locator('#udViewTools:visible').count(),0,
    'A disabled JavaScript visitor must never see non-working image mode controls');
  assert.equal(await noJs.locator('.ud-zoom:visible').count(),0,
    'No-JS browsing must keep all genuine photo links and hide modal controls');
  await noJs.close();

  const desktop=await browser.newPage({viewport:{width:1366,height:900},locale:'fr-FR'});
  desktop.on('pageerror',e=>errors.push('desktop: '+e.message));
  await desktop.goto(new URL('/montres/toutes-les-montres.html?compare=skmei-2514,casio-ga-2100-1a1',base).href,
    {waitUntil:'domcontentloaded'});
  await desktop.locator('#udTrayOpen').waitFor({state:'visible'});
  await checkOverflow(desktop,'Desktop compare dock');
  await desktop.screenshot({path:'artifacts/desktop-unified-compare-tray.png',fullPage:false});
  await desktop.close();
  assert.deepEqual(errors,[],'No browser errors should appear in the enhanced comparison');
  console.log('PASS: sticky Android/desktop compare tray, 1–3 products, URL restore, remove, clear, overflow, no JS');
}finally{await browser.close()}
