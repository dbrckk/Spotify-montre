import assert from 'node:assert/strict';
import {mkdirSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// The test always uses the built, local HTTP store by default; no remote
// browser, account or paid service is required.
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&
  ['localhost','127.0.0.1'].includes(origin.hostname)),'Only localhost HTTP or real HTTPS');
const browser=await chromium.launch({headless:true});
const errors=[];
const documentedSupplementalPhotos=Object.keys(JSON.parse(readFileSync(
  new URL('../site/popular-photo-rights.json',import.meta.url),'utf8')).photos).length;
const approvedPhotoCount=15+documentedSupplementalPhotos;
const noPhotoCount=52-approvedPhotoCount;
const checkOverflow=async(page,label)=>{
  const w=await page.evaluate(()=>{
    const client=document.documentElement.clientWidth;
    const scroll=document.documentElement.scrollWidth;
    const culprits=scroll>client+2
      ?[...document.querySelectorAll('body *')].map(el=>{
        const rect=el.getBoundingClientRect();
        const css=getComputedStyle(el);
        return {tag:el.tagName.toLowerCase(),cls:String(el.className||'').slice(0,90),
          width:Math.round(rect.width),left:Math.round(rect.left),right:Math.round(rect.right),
          overflowX:css.overflowX,grid:css.gridTemplateColumns};
      }).filter(x=>x.right>client+2&&x.width>20).slice(0,12)
      :[];
    return {client,scroll,culprits};
  });
  assert.ok(w.scroll<=w.client+2,label+': horizontal overflow '+JSON.stringify(w));
};
mkdirSync('artifacts',{recursive:true});
try{
  const phone=await browser.newPage({viewport:{width:393,height:852},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'fr-FR'});
  phone.on('pageerror',e=>errors.push('mobile: '+e.message));
  await phone.goto(new URL('/montres/toutes-les-montres.html',base).href,{waitUntil:'domcontentloaded'});
  await phone.locator('#udFilters').waitFor({state:'visible'});
  // The four source-backed comparisons are immediately useful without
  // requiring a visitor to choose from the entire 52-watch catalogue.
  const starters=phone.locator('.ud-pair-starter');
  assert.equal(await starters.count(),4,'Four direct factual comparisons should be offered');
  await phone.locator('[data-ud-pair-interactive]').first().waitFor({state:'visible'});
  const firstPair=starters.first();
  const compareHref=await firstPair.locator('[data-ud-pair-interactive]').getAttribute('href');
  assert.equal(compareHref,'?compare=tissot-prx-quartz,tissot-prx-auto#comparer',
    'Direct pair route must keep both exact Tissot model codes');
  assert.equal(await firstPair.locator('.ud-pair-starter-static').getAttribute('href'),
    './comparer-tissot-prx-quartz-vs-powermatic-80.html',
    'Static pair must link to an indexable source-backed editorial analysis');
  await checkOverflow(phone,'Mobile preselected comparison shortcuts');
  const pairPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await pairPage.goto(new URL('/montres/toutes-les-montres.html'+compareHref,base).href,
      {waitUntil:'domcontentloaded'});
    await pairPage.locator('#udTrayOpen').waitFor({state:'visible'});
    assert.equal(await pairPage.locator('#udCompareTable th[scope=col]').count(),3,
      'A preselected comparison must open a real two-watch factual table on Android');
    await checkOverflow(pairPage,'Mobile one-tap two-watch comparison');
  }finally{await pairPage.close()}
  const tray=phone.locator('#udCompareTray');
  assert.equal(await tray.isVisible(),false,'The dock must not obstruct browsing before selection');
  assert.equal(await phone.locator('.ud-card').count(),52);
  // The 15-watch gallery and 52-watch catalogue share the same local-only
  // favourites. Verify real Android touch actions, reload and URL restoration.
  assert.ok(await phone.locator('#udFavoriteTools').isVisible());
  const save=phone.locator('#modele-skmei-2056 .ud-save');
  assert.ok(await save.isVisible(),'Every real model needs a save control');
  await save.click();
  assert.equal(await save.getAttribute('aria-pressed'),'true');
  assert.equal(await phone.locator('#udSavedCount').innerText(),'1');
  const savedOnDisk=await phone.evaluate(()=>JSON.parse(
    localStorage.getItem('atelier-montres-multibrand-favorites-v1')||'[]'));
  assert.deepEqual(savedOnDisk,['skmei-2056']);
  await phone.locator('#udSavedToggle').click();
  assert.equal(await phone.locator('#udSavedToggle').getAttribute('aria-pressed'),'true');
  assert.equal(new URL(phone.url()).searchParams.get('saved'),'1');
  assert.equal(await phone.locator('.ud-card:visible').count(),1);
  assert.ok(await phone.locator('#modele-skmei-2056').isVisible());
  await phone.reload({waitUntil:'domcontentloaded'});
  await phone.locator('#udFilters').waitFor({state:'visible'});
  assert.equal(await phone.locator('#udSavedCount').innerText(),'1');
  assert.equal(await phone.locator('.ud-card:visible').count(),1,
    'Reload must keep the saved-only view on this Android browser');
  await phone.locator('#udSavedToggle').click();
  assert.equal(new URL(phone.url()).searchParams.has('saved'),false);
  assert.equal(await phone.locator('.ud-card:visible').count(),52);
  await phone.locator('#modele-skmei-2056 .ud-save').click();
  assert.equal(await phone.locator('#udSavedCount').innerText(),'0');
  assert.equal(await phone.locator('#modele-skmei-2056 .ud-save').getAttribute('aria-pressed'),'false');
  await checkOverflow(phone,'52-watch favorites on Android');
  // This is NOT a price ranking: editorial tiers and documented merchant
  // destinations are the only signals, without a fabricated sales score.
  assert.equal(await phone.locator('#udSort').inputValue(),'essential');
  assert.equal(await phone.locator('#udGrid .ud-card').first().getAttribute('data-tier'),'essential',
    'The accessible-price editorial tier should be discoverable immediately');
  await phone.locator('#udSort').selectOption('direct');
  assert.equal(await phone.locator('#udGrid .ud-card').first().getAttribute('data-merchant'),'direct',
    'Users must be able to prioritize the identified merchant product pages');
  assert.equal(new URL(phone.url()).searchParams.get('sort'),'direct',
    'Merchant-first ordering is part of the shareable URL');
  await phone.reload({waitUntil:'domcontentloaded'});
  await phone.locator('#udFilters').waitFor({state:'visible'});
  assert.equal(await phone.locator('#udSort').inputValue(),'direct',
    'A shared URL must restore the chosen order after a real navigation');
  assert.equal(await phone.locator('#udGrid .ud-card').first().getAttribute('data-merchant'),'direct');
  await phone.locator('#udSort').selectOption('photo');
  assert.equal(await phone.locator('#udGrid .ud-card').first().getAttribute('data-visual'),'photo',
    'Photo-first ordering cannot promote unphotographed fallback cards');
  await phone.locator('#udSort').selectOption('alpha');
  assert.equal(await phone.locator('#udGrid .ud-card').first().getAttribute('data-brand'),'ADDIESDIVE',
    'Alphabetical sort must use real manufacturer names');
  await phone.locator('#udSort').selectOption('editorial');
  assert.equal(new URL(phone.url()).searchParams.get('sort'),'editorial');
  await phone.locator('#udSort').selectOption('essential');
  assert.equal(new URL(phone.url()).searchParams.has('sort'),false,
    'The default editorial tier order must not clutter shared URLs');
  // All models retain their own documented source in addition to any
  // compensated Amazon referral. Generic searches are always SECONDARY.
  const exits=await phone.locator('.ud-card').evaluateAll(cards=>cards.map(card=>{
    const actions=[...card.querySelectorAll('.ud-actions a')];
    const source=card.querySelector('.ud-source');
    return {
      id:card.dataset.id,merchant:card.dataset.merchant,
      sourceCount:card.querySelectorAll('.ud-source').length,
      sourceUrl:source?.href||'',sourceText:source?.textContent||'',
      sourceLabel:source?.getAttribute('aria-label')||'',
      sourceTracking:source?.getAttribute('data-merchant-official-id')||'',
      sourcePlacement:source?.getAttribute('data-merchant-placement')||'',
      links:actions.map(a=>a.className),
      searchTracking:card.querySelectorAll('a[data-amazon-search-id]').length,
      directTracking:card.querySelectorAll('a[data-amazon-product]').length
    };
  }));
  assert.equal(exits.length,52);
  for(const exit of exits){
    assert.equal(exit.sourceCount,1,'One genuine model source per card '+exit.id);
    assert.match(exit.sourceUrl,/^https:\/\//,'No insecure model source '+exit.id);
    assert.match(exit.sourceText,/Vérifier la référence chez la marque ou le vendeur/);
    assert.ok(exit.sourceLabel.startsWith(exit.sourceText),
      'Accessible destination name must include visible text '+exit.id);
    assert.equal(exit.sourceTracking,exit.id,'Source click attribution should identify its watch');
    assert.equal(exit.sourcePlacement,'popular');
    if(exit.merchant==='search'){
      assert.deepEqual(exit.links,['ud-details','ud-source','ud-merchant'],
        'Model-specific source must appear BEFORE an unverified Amazon search '+exit.id);
      assert.equal(exit.searchTracking,1,'One clearly labelled compensated search '+exit.id);
    }else if(exit.merchant==='direct'){
      assert.deepEqual(exit.links,['ud-details','ud-merchant','ud-source'],
        'Identified product listing takes priority without hiding the source '+exit.id);
      assert.equal(exit.directTracking,1,'Only identified product pages use ASIN tracking '+exit.id);
    }else{
      assert.deepEqual(exit.links,['ud-details','ud-source'],
        'Non-affiliate models must never pretend an Amazon purchase destination exists '+exit.id);
      assert.equal(exit.directTracking+exit.searchTracking,0);
    }
  }
  for(const [id,asin] of [['skmei-1251','B072JTCP5H'],['casio-ae1200wh-1av','B0099M2IWI']]){
    const card=phone.locator('#modele-'+id);
    assert.equal(await card.getAttribute('data-merchant'),'direct',
      'A source-matched ASIN redirect is a model-specific destination, not a generic search: '+id);
    assert.equal(await card.locator('.ud-redirect-proof').count(),1,
      'Comparator-based evidence must never be presented as a directly visited Amazon page: '+id);
    assert.match(await card.locator('.ud-redirect-proof').innerText(),/non consultée directement/);
    assert.match(await card.locator('.ud-exact-variant').innerText(),/Variante Amazon à vérifier/);
    assert.equal(await card.locator('a[data-amazon-product]').getAttribute('href'),
      'https://www.amazon.fr/dp/'+asin+'?tag=drackk04-21');
    assert.equal(await card.locator('a[data-amazon-search-id]').count(),0);
  }
  for(const id of ['addiesdive-ad2030','pagani-pd1701']){
    const item=phone.locator('#modele-'+id);
    assert.match(await item.locator('.ud-exact-variant').innerText(),/Variante Amazon à vérifier/,
      'A documented marketplace variant must be explained on the catalogue card');
  }
  // The six source-backed editorial features must be usable before the 52-card
  // comparison, with real local photos and accurately distinguished merchants.
  const spotlight=phone.locator('.ud-showroom');
  assert.ok(await spotlight.isVisible(),'The premium editorial gallery must be visible on mobile');
  assert.equal(await spotlight.locator('.ud-feature-card').count(),6);
  assert.equal(await spotlight.locator('.ud-feature-photo img').count(),6,
    'Every promoted watch requires its actual documented model photo');
  for(const id of ['skmei-2056','skmei-2514']){
    const feature=spotlight.locator('[data-feature-id="'+id+'"]');
    assert.match(await feature.locator('.ud-feature-exit').innerText(),/non rémunéré/,
      'SKMEI without verified ASIN must link to the official source, not a purported paid listing');
    assert.ok((await feature.locator('.ud-feature-exit').getAttribute('href')).startsWith('https://www.shopskmei.com/product/'));
    assert.equal(await feature.locator('.ud-feature-exit').getAttribute('data-amazon-product'),null);
  }
  for(const id of ['addiesdive-ad2030','pagani-pd1701','casio-mtp-1302','citizen-tsuyosa']){
    const feature=spotlight.locator('[data-feature-id="'+id+'"]');
    assert.match(await feature.locator('.ud-feature-exit').innerText(),/lien rémunéré/);
    assert.match(await feature.locator('.ud-feature-exit').getAttribute('href'),
      /^https:\/\/www\.amazon\.fr\/dp\/[A-Z0-9]{10}\?tag=/);
    assert.equal(await feature.locator('.ud-feature-exit').getAttribute('data-amazon-product'),id);
    assert.match(await feature.locator('.ud-feature-exit').getAttribute('rel'),/sponsored/);
  }
  const heroPhoto=spotlight.locator('[data-feature-id="skmei-2056"] img');
  await heroPhoto.scrollIntoViewIfNeeded();
  assert.ok(await heroPhoto.evaluate(async img=>{
    try{await img.decode();return img.complete&&img.naturalWidth>0&&img.naturalHeight>0&&/\/assets\/(popular-responsive|watches-popular)\/skmei-2056(?:-240|-360|-480|-720|-960)?\.webp(?:\?|$)/.test(new URL(img.currentSrc).pathname)}catch{return false}
  }),'The responsive SKMEI hero photo must really load and decode at mobile resolution');
  await checkOverflow(phone,'Mobile editorial photo showroom');

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
  // An actual source-first buyer route must appear below the swipeable
  // comparison for each watch. Never substitute a generic Amazon search.
  const nextSteps=phone.locator('#udCompareTable .ud-next-steps');
  assert.ok(await nextSteps.isVisible(),'Buyer next steps should be immediately accessible');
  const nextCards=nextSteps.locator('.ud-next-watch');
  assert.equal(await nextCards.count(),2,'Exactly two selected watches get follow-up routes');
  const sourceWatch=nextSteps.locator('[data-watch-id="skmei-2056"]');
  assert.equal(await sourceWatch.locator('.ud-next-detail').getAttribute('href'),
    './skmei-2056.html','Follow-up detail must use the exact SKMEI model');
  assert.equal(await sourceWatch.locator('.ud-next-outbound').getAttribute('data-route'),
    'official','Unverified SKMEI must route to its official source instead of Amazon search');
  assert.ok((await sourceWatch.locator('.ud-next-outbound').getAttribute('href'))
    .startsWith('https://www.shopskmei.com/product/'));
  assert.equal((await sourceWatch.locator('.ud-next-outbound').getAttribute('rel')).includes('sponsored'),false);
  assert.equal(await sourceWatch.locator('.ud-next-outbound').getAttribute('data-merchant-official-id'),
    'skmei-2056','Official comparison visits must reuse the existing safe analytics identifier');
  assert.equal(await sourceWatch.locator('.ud-next-outbound').getAttribute('data-merchant-placement'),'comparison');
  const paidWatch=nextSteps.locator('[data-watch-id="citizen-tsuyosa"]');
  assert.equal(await paidWatch.locator('.ud-next-detail').getAttribute('href'),'./citizen-tsuyosa.html');
  assert.equal(await paidWatch.locator('.ud-next-outbound').getAttribute('data-route'),'direct');
  assert.match(await paidWatch.locator('.ud-next-outbound').getAttribute('href'),
    /^https:\/\/www\.amazon\.fr\/dp\/[A-Z0-9]{10}\?tag=/);
  assert.match(await paidWatch.locator('.ud-next-outbound').getAttribute('rel'),/sponsored/);
  assert.equal(await paidWatch.locator('.ud-next-outbound').getAttribute('data-amazon-product'),'citizen-tsuyosa');
  assert.equal(await paidWatch.locator('.ud-next-outbound').getAttribute('data-amazon-placement'),'comparison');
  assert.equal(await paidWatch.locator('.ud-next-source').count(),1,
    'An identified Amazon listing must never displace the independent manufacturer source');
  assert.match(await paidWatch.locator('.ud-next-source').getAttribute('href'),/^https:\/\//);
  assert.equal(await paidWatch.locator('.ud-next-source').getAttribute('data-route'),'official');
  assert.equal(await paidWatch.locator('.ud-next-source').getAttribute('data-merchant-official-id'),'citizen-tsuyosa');
  assert.equal(await paidWatch.locator('.ud-next-source').getAttribute('data-merchant-placement'),'comparison');
  assert.equal((await paidWatch.locator('.ud-next-source').getAttribute('rel')).includes('sponsored'),false);
  assert.match(await paidWatch.locator('.ud-next-proof').innerText(),/Fiche Amazon.fr associée/);
  assert.equal(await sourceWatch.locator('.ud-next-source').count(),0,
    'Source-only products must not show the same official route twice');
  for(const a of await nextSteps.locator('.ud-next-actions a').all()){
    const bounds=await a.boundingBox();
    assert.ok(bounds&&bounds.height>=44,'All buyer next steps must be touch-accessible on Android');
  }
  await checkOverflow(phone,'Android source-first next steps');
  // The visitor can decide based on factual movement/size/style preferences,
  // not a fabricated price or bestseller rank.
  assert.ok(await phone.locator('#udDecisionForm').isVisible(),
    'Personal decision criteria must become available when comparing two watches');
  assert.equal(await phone.locator('#udPrefMovement').inputValue(),'all');
  await phone.locator('#udPrefMovement').selectOption('automatic');
  assert.equal(new URL(phone.url()).searchParams.get('prefMovement'),'automatic');
  assert.equal(await phone.locator('#udCompareTable .ud-decision-score').count(),2);
  assert.equal(await phone.locator('#udCompareTable .ud-decision-score[data-match=exact]').count(),1,
    'Only the automatic movement can match an explicitly selected automatic preference');
  assert.match(await phone.locator('#udDecisionResult').innerText(),/1 montre sur 2/);
  await phone.reload({waitUntil:'domcontentloaded'});
  await phone.locator('#udDecisionForm').waitFor({state:'visible'});
  assert.equal(await phone.locator('#udPrefMovement').inputValue(),'automatic',
    'A real Android reload must retain the personal comparison preference');
  assert.equal(await phone.locator('#udCompareTable .ud-decision-score[data-match=exact]').count(),1);
  await phone.locator('#udPrefMovement').selectOption('eco-drive');
  assert.equal(await phone.locator('#udCompareTable .ud-decision-score[data-match=exact]').count(),0);
  assert.match(await phone.locator('#udDecisionResult').innerText(),/Aucune des 2 montres/,
    'A no-match scenario must not invent a recommendation');
  await phone.locator('#udDecisionReset').click();
  assert.equal(await phone.locator('#udPrefMovement').inputValue(),'all');
  assert.equal(new URL(phone.url()).searchParams.has('prefMovement'),false);
  assert.equal(await phone.locator('#udCompareTable .ud-decision-score').count(),0);
  // Premium visual comparison must show exact local photos, preserve original
  // data provenance and keep criteria visible while swiping on Android.
  const matchedPhotos=phone.locator('#udCompareTable .ud-matrix-photo img');
  assert.equal(await matchedPhotos.count(),2,
    'Both source-verified watches must have an exact-model comparison photo');
  const photoSources=await matchedPhotos.evaluateAll(images=>images.map(img=>img.getAttribute('src')));
  assert.deepEqual(photoSources,[
    '../assets/watches-popular/skmei-2056.webp',
    '../assets/watches/citizen-tsuyosa.webp'
  ]);
  for(const img of await matchedPhotos.all()){
    assert.ok(await img.evaluate(async image=>{
      try{await image.decode();return image.naturalWidth>100}catch{return false}
    }),'Actual approved comparison photos must decode');
  }
  assert.ok(await phone.locator('#udCompareTable .ud-matrix-diff').count()>0,
    'Differences between verified watch specifications should be emphasized');
  assert.match(await phone.locator('#udCompareHint').innerText(),
    /caractéristique.*différenciant|caractéristiques.*différenciant/,
    'Never silently claim that unknown data is a documented difference');
  const sticky=await phone.locator('#udCompareTable .ud-matrix th[scope=row]').first()
    .evaluate(element=>getComputedStyle(element).position);
  assert.equal(sticky,'sticky','Android comparison labels must stay visible during swipe');
  await checkOverflow(phone,'Android source-photographed comparison matrix');
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
  assert.equal(await phone.locator('#udCompareTable .ud-next-watch').count(),3,
    'Each selected watch needs its own model-specific buyer route');
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
  const searchCard=phone.locator('.ud-card[data-merchant="search"]').first();
  const searchId=await searchCard.getAttribute('data-id');
  assert.ok(searchId,'At least one unverified Amazon search must be represented in the feed');
  await searchCard.locator('button.ud-select').click();
  // The first generic-search model can itself be SKMEI 2056; selecting it
  // twice would toggle it off and falsely report a broken comparison.
  assert.notEqual(searchId,'citizen-tsuyosa',
    'The fixture companion must remain a distinct documented model');
  await phone.locator('#modele-citizen-tsuyosa button.ud-select').click();
  const searchJourney=phone.locator('#udCompareTable .ud-next-watch[data-watch-id="'+searchId+'"]');
  assert.equal(await searchJourney.locator('.ud-next-outbound').getAttribute('data-route'),'official',
    'For search-only products the model source must come before generic Amazon results');
  assert.equal(await searchJourney.locator('.ud-next-search').getAttribute('data-route'),'search');
  assert.match(await searchJourney.locator('.ud-next-search').innerText(),/modèle à confirmer/);
  assert.match(await searchJourney.locator('.ud-next-search').getAttribute('rel'),/sponsored/);
  assert.equal(await searchJourney.locator('.ud-next-search').getAttribute('data-amazon-search-id'),searchId);
  assert.equal(await searchJourney.locator('.ud-next-search').getAttribute('data-amazon-placement'),'comparison');
  assert.match(await searchJourney.locator('.ud-next-proof').innerText(),/aucun résultat ni modèle exact garanti/);
  assert.equal(await searchJourney.locator('.ud-next-source').count(),0,
    'A search-only watch must have one official model source, not duplicate links');
  await checkOverflow(phone,'Android honest search vs official source');
  await phone.setViewportSize({width:320,height:740});
  await checkOverflow(phone,'320px honest merchant journey');
  await phone.setViewportSize({width:393,height:852});
  await phone.locator('#udTrayClear').click();

  // Compare the rendered photo/fallback split with the exact-model rights
  // registry; newly approved photos must not break consumer-side filters.
  assert.equal(await phone.locator('.ud-card[data-visual="photo"]').count(),approvedPhotoCount,
    'Only core and SHA-registered supplemental photos receive real photo cards');
  assert.equal(await phone.locator('.ud-card[data-visual="no-photo"]').count(),noPhotoCount,
    'Every remaining unphotographed model must disclose the missing packshot');
  assert.equal(await phone.locator('button.ud-zoom').count(),approvedPhotoCount,
    'Photo zoom is never offered for a fallback or unapproved visual');
  await phone.locator('#udVisual').selectOption('photo');
  assert.equal(await phone.locator('.ud-card:visible').count(),approvedPhotoCount,
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
  assert.equal(await phone.locator('.ud-card:visible').count(),noPhotoCount);
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
  const counted={};
  for(const kind of ['direct','search','official']){
    counted[kind]=await phone.locator('.ud-card[data-merchant="'+kind+'"]').count();
    assert.ok(counted[kind]>0,'Each destination type must be represented by source data');
    await phone.locator('#udMerchant').selectOption(kind);
    assert.equal(await phone.locator('.ud-card:visible').count(),counted[kind],
      'Merchant filter must show only '+kind+' source-documented destinations');
    assert.equal(new URL(phone.url()).searchParams.get('merchant'),kind,
      'Merchant filter must be shareable in a stable URL');
    assert.equal(await phone.locator('.ud-card[data-merchant="'+kind+'"]:visible').count(),counted[kind]);
  }
  assert.equal(Object.values(counted).reduce((a,b)=>a+b,0),52,
    'Every model must have exactly one honest merchant destination category');
  await phone.locator('#udMerchant').selectOption('all');
  assert.equal(await phone.locator('.ud-card:visible').count(),52);
  assert.equal(new URL(phone.url()).searchParams.has('merchant'),false);
  await phone.close();

  // Homepage four-model photographic gallery must also open a functional
  // two-watch comparison without asking the visitor to select models again.
  const heroPage=await browser.newPage({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  heroPage.on('pageerror',e=>errors.push('showroom: '+e.message));
  await heroPage.goto(new URL('/affiliation.html#selection-accessible',base).href,
    {waitUntil:'domcontentloaded'});
  const featuredCard=heroPage.locator('[data-affordable-id="skmei-1257"]');
  assert.ok(await featuredCard.isVisible(),'Affordable real-watch gallery must be visible on Android');
  await featuredCard.locator('a.am-affordable-compare').click();
  await heroPage.locator('#udCompareTable table').waitFor({state:'visible'});
  assert.equal(new URL(heroPage.url()).searchParams.get('compare'),'skmei-1257,skmei-1251',
    'The homepage comparison CTA must preserve the two exact SKMEI references');
  assert.equal(await heroPage.locator('#udTrayItems li').count(),2);
  await checkOverflow(heroPage,'Mobile homepage affordable comparison');
  await heroPage.close();

  // Original buyer content: homepage -> factual watch article -> two-model dock.
  const duelPage=await browser.newPage({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  duelPage.on('pageerror',e=>errors.push('duel: '+e.message));
  await duelPage.goto(new URL('/affiliation.html#duels-accessibles',base).href,{waitUntil:'domcontentloaded'});
  assert.equal(await duelPage.locator('.am-duel-promo-card').count(),4,
    'Four distinct, photographed-or-fallback buyer decision articles must be discoverable');
  await duelPage.locator('[data-duel-promo="addiesdive-ad2030-vs-pagani-pd1701"] a').click();
  assert.equal(new URL(duelPage.url()).pathname,
    '/montres/comparer-addiesdive-ad2030-vs-pagani-pd1701.html');
  await duelPage.waitForLoadState('load');
  assert.equal(await duelPage.locator('link[rel="stylesheet"][href="../affordable-comparisons.css"]').count(),1,
    'The editorial duel must reference its dedicated mobile stylesheet');
  assert.equal(await duelPage.locator('.am-duel-product-stage').first().evaluate(
    node=>getComputedStyle(node).display),'grid',
    'The duel stylesheet must load before measuring responsive product photos');
  assert.equal(await duelPage.locator('.am-duel-model').count(),2);
  assert.equal(await duelPage.locator('.am-duel-model img').count(),2,
    'Both exact-model photos in the steel-watch duel must be locally hosted');
  assert.equal(await duelPage.locator('a[data-amazon-product]').count(),2,
    'Only verified matched ASINs may receive paid Amazon exits in this duel');
  assert.match(await duelPage.locator('.am-duel-variant').first().innerText(),
    /SH-DE-AD2030-Steel-blue/);
  await checkOverflow(duelPage,'Mobile accessible watch editorial duel');
  await duelPage.locator('.am-duel-bottom-actions a.primary').click();
  await duelPage.locator('#udCompareTable table').waitFor({state:'visible'});
  assert.equal(new URL(duelPage.url()).searchParams.get('compare'),
    'addiesdive-ad2030,pagani-pd1701');
  assert.equal(await duelPage.locator('#udTrayItems li').count(),2);
  await checkOverflow(duelPage,'Mobile editorial duel to direct factual comparison');
  await duelPage.screenshot({path:'artifacts/android-affordable-duel-comparison.png',fullPage:false});
  await duelPage.close();

  const smallDuel=await browser.newPage({viewport:{width:320,height:740},
    isMobile:true,hasTouch:true,javaScriptEnabled:false,locale:'fr-FR'});
  await smallDuel.goto(new URL('/montres/comparer-skmei-1257-vs-casio-f91w.html',base).href,
    {waitUntil:'load'});
  assert.equal(await smallDuel.locator('.am-duel-model').count(),2);
  assert.equal(await smallDuel.locator('.am-duel-model img').count(),1,
    'Without JS, absent manufacturer photo is text, never a fake Casio packshot');
  assert.equal(await smallDuel.locator('.am-duel-model a.am-duel-merchant').count(),2,
    'Source-backed outbound links must work without JavaScript');
  await checkOverflow(smallDuel,'No-JS 320px buyer duel layout');
  await smallDuel.screenshot({path:'artifacts/android-320-watch-duel.png',fullPage:false});
  await smallDuel.close();

  // Real Android journey: go from the 10-watch editorial shortlist to a
  // preselected comparison of two exact, distinct documented watches.
  const shortlistPage=await browser.newPage({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  shortlistPage.on('pageerror',e=>errors.push('shortlist: '+e.message));
  await shortlistPage.goto(new URL('/montres/modeles-populaires.html#selection-10-montres',base).href,
    {waitUntil:'domcontentloaded'});
  const shortlist=shortlistPage.locator('#selection-10-montres');
  assert.equal(await shortlist.locator('.am-focus-item').count(),10,
    'Ten genuine editorial choices must remain discoverable');
  const first=shortlist.locator('[data-focus-id="addiesdive-ad2030"]');
  assert.match(await first.locator('.am-focus-evidence').innerText(),/stock actuel/,
    'No outdated Amazon model claim may imply live stock');
  await first.locator('a.am-focus-compare').click();
  await shortlistPage.locator('#udCompareTable table').waitFor({state:'visible'});
  assert.equal(new URL(shortlistPage.url()).pathname,'/montres/toutes-les-montres.html');
  assert.equal(new URL(shortlistPage.url()).searchParams.get('compare'),
    'addiesdive-ad2030,pagani-pd1776');
  assert.equal(await shortlistPage.locator('#udTrayItems li').count(),2,
    'Shortlist comparison must restore two exact watch models');
  assert.equal(await shortlistPage.locator('#udCompareTable th[scope=col]').count(),3);
  await checkOverflow(shortlistPage,'Mobile shortlist to exact comparison');
  await shortlistPage.screenshot({path:'artifacts/mobile-shortlist-comparison.png',fullPage:false});
  await shortlistPage.close();

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
  assert.equal(await noJs.locator('.ud-pair-starter-static:visible').count(),4,
    'The four editorial comparisons must remain usable without JavaScript');
  assert.equal(await noJs.locator('[data-ud-pair-interactive]:visible').count(),0,
    'A non-functional interactive comparison must stay hidden without JavaScript');
    assert.equal(await noJs.locator('.ud-feature-card:visible').count(),6,
    'Source-backed editorial watches remain navigable with JavaScript disabled');
  assert.equal(await noJs.locator('.ud-card:visible').count(),52,
    'All factual watch cards must remain visible without JS or feed fetching');
  assert.equal(await noJs.locator('.ud-next-steps').count(),0,
    'Do not render broken purchase steps before a validated JavaScript comparison');
  assert.equal(await noJs.locator('#udCompareTray:visible').count(),0,
    'The new dock must never appear as a broken control without JS');
  assert.equal(await noJs.locator('#udDecisionForm:visible').count(),0,
    'No-JS browsing must hide preference controls that cannot respond');
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
