import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Only exercise a generated local collection; merchant links are never clicked.
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
if(origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))
  throw Error('This catalogue search test is restricted to localhost');
const browser=await chromium.launch({headless:true});
const errors=[];
try{
  for(const width of [360,393,1366]){
    const page=await browser.newPage({viewport:{width,height:900},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    page.on('pageerror',error=>errors.push(width+': '+error.message));
    await page.goto(new URL('/montres/toutes-les-montres.html',base).href,
      {waitUntil:'domcontentloaded'});
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('.ud-card').count(),52);

    // The featured Casio and Citizen use approved local responsive WebPs.
    // At 393px the photo is only 37% of a split card, not a full-width image.
    for(const id of ['casio-mtp-1302','citizen-tsuyosa']){
      const img=page.locator('.ud-feature-card[data-feature-id="'+id+'"] img');
      const srcset=await img.getAttribute('srcset');
      const sizes=await img.getAttribute('sizes');
      assert.ok(srcset?.includes('watch-responsive/'+id+'-480.webp'),
        'Featured photo should reuse local approved responsive variant: '+id);
      assert.ok(sizes?.includes('(max-width: 660px) 33vw')&&
        sizes.includes('(max-width: 365px) 88vw'),
        'Featured photo sizes must reflect split-card layout: '+id);
    }

    // The gallery uses one column at 360px and two columns at 393px.
    // srcset's sizes must reflect this or mobile downloads oversized WebPs.
    const photo=page.locator('#modele-casio-mdv107 .ud-photo img');
    const sizes=await photo.getAttribute('sizes');
    assert.ok(sizes?.includes('(max-width: 365px) 90vw')&&
      sizes.includes('(max-width: 650px) 46vw'),
      'Responsive watch image sizes must match mobile gallery columns');
    const columns=await page.locator('#udGrid').evaluate(el=>
      getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width===360?1:width===393?2:4,
      'Gallery column count should agree with responsive image sizing');

    assert.equal(await page.locator('#udActiveFilters').isVisible(),false);

    for(const [query,id] of [
      ['mdv107','casio-mdv107'],
      ['Casio MDV107','casio-mdv107'],
      ['skmei1251','skmei-1251'],
      ['pd1701','pagani-pd1701']
    ]){
      await page.locator('#udSearch').fill(query);
      assert.equal(await page.locator('.ud-card:visible').count(),1,
        'Exact hyphenless reference should return one model: '+query);
      assert.equal(await page.locator('#modele-'+id).isVisible(),true);
      assert.equal(await page.locator('#udActiveFilterPills button').count(),1);
      assert.equal(new URL(page.url()).searchParams.get('q'),query);
    }

    // Two independent criteria: removing a brand pill must not erase search.
    await page.locator('#udSearch').fill('mdv107');
    await page.locator('#udBrand').selectOption('SKMEI');
    assert.equal(await page.locator('.ud-card:visible').count(),0);
    assert.equal(await page.locator('#udActiveFilterPills button').count(),2);
    await page.locator('[data-remove-filter="brand"]').click();
    assert.equal(await page.locator('#udBrand').inputValue(),'all');
    assert.equal(await page.locator('#udBrand').evaluate(el=>el===document.activeElement),true,
      'Removing a chip restores focus to the original form control');
    assert.equal(await page.locator('#modele-casio-mdv107').isVisible(),true);
    assert.equal(new URL(page.url()).searchParams.get('q'),'mdv107');
    await page.locator('[data-remove-filter="q"]').click();
    assert.equal(await page.locator('.ud-card:visible').count(),52);
    assert.equal(await page.locator('#udActiveFilters').isVisible(),false);
    assert.equal(new URL(page.url()).searchParams.has('q'),false);

    // URL state is shareable and removable without destroying sort or compare.
    await page.locator('#udSearch').fill('skmei1251');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('#modele-skmei-1251').isVisible(),true);
    assert.equal(await page.locator('#udActiveFilterPills button').count(),1);
    await page.locator('#udClearActiveFilters').click();
    assert.equal(await page.locator('#udSearch').evaluate(el=>el===document.activeElement),true,
      'Clearing all filters returns keyboard focus to the search field');
    assert.equal(await page.locator('.ud-card:visible').count(),52);
    assert.equal(new URL(page.url()).searchParams.has('q'),false);

    const size=await page.evaluate(()=>({
      width:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth
    }));
    assert.ok(size.scroll<=size.width+2,
      'Catalogue must not overflow at '+width+': '+JSON.stringify(size));
    await page.close();
  }

  const noScript=await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(new URL('/montres/toutes-les-montres.html',base).href);
  assert.equal(await noScript.locator('.ud-card').count(),52);
  assert.equal(await noScript.locator('#udActiveFilters').isVisible(),false);
  await noScript.close();
  assert.deepEqual(errors,[]);
  console.log('Catalogue search OK: punctuation-free IDs, removable filters, URLs, no-JS fallback and responsive layouts');
}finally{
  await browser.close();
}
