import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync,readFileSync} from 'node:fs';

// Only exercise a generated local collection; merchant links are never clicked.
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const origin=new URL(base);
if(origin.protocol!=='http:'||!['localhost','127.0.0.1'].includes(origin.hostname))
  throw Error('This catalogue search test is restricted to localhost');
const browser=await chromium.launch({headless:true});
const errors=[];
const popularPhotoProof=JSON.parse(readFileSync(
  new URL('../site/popular-photo-rights.json',import.meta.url),'utf8')).photos;
try{
  for(const width of [360,393,1366]){
    const page=await browser.newPage({viewport:{width,height:900},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    page.on('pageerror',error=>errors.push(width+': '+error.message));
    await page.goto(new URL('/montres/toutes-les-montres.html',base).href,
      {waitUntil:'domcontentloaded'});
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('.ud-card').count(),52);

    for(const id of ['skmei-2056','skmei-2514','addiesdive-ad2030','pagani-pd1701']){
      const photo=page.locator('.ud-feature-card[data-feature-id="'+id+'"] img');
      const srcset=await photo.getAttribute('srcset');
      assert.ok(srcset?.includes('popular-responsive/'+id+'-240.webp 240w')&&
        srcset.includes('popular-responsive/'+id+'-480.webp 480w'),
        'Heavy editorial photo must have verified mobile WebP variants: '+id);
    }


    // Registered supplemental photos must preserve real source dimensions;
    // only publish 240px/480px candidates when both verified assets exist.
    const supplemental=await page.locator('.ud-card[data-visual="photo"] .ud-photo img')
      .evaluateAll(images=>images.map(img=>({
        id:img.closest('.ud-card')?.dataset.id,
        width:Number(img.getAttribute('width')),height:Number(img.getAttribute('height')),
        srcset:img.getAttribute('srcset')||''
      })));
    const imagesById=new Map(supplemental.map(item=>[item.id,item]));
    for(const [id,proof] of Object.entries(popularPhotoProof)){
      const img=imagesById.get(id);
      assert.ok(img,'Missing registered photograph for '+id);
      assert.equal(img.width,proof.width,'Wrong source width for '+id);
      assert.equal(img.height,proof.height,'Wrong source height for '+id);
      if([240,480].every(size=>existsSync(new URL(
        '../site/assets/popular-responsive/'+id+'-'+size+'.webp',import.meta.url)))){
        for(const size of [240,480])
          assert.ok(img.srcset.includes('popular-responsive/'+id+'-'+size+'.webp '+size+'w'),
            'Small verified local WebP missing: '+id+'/'+size);
        assert.ok(img.srcset.includes('watches-popular/'+id+'.webp '+proof.width+'w'),
          'Full-size exact-model fallback missing for '+id);
      }
    }
    // Verify Chromium actually decodes smaller images on a narrow Android screen.
    if(width===393){
      for(const id of ['skmei-2056','skmei-2514','addiesdive-ad2030','pagani-pd1701']){
        const image=page.locator('#modele-'+id+' .ud-photo img');
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(node=>node.decode());
        const selected=await image.evaluate(node=>new URL(node.currentSrc).pathname);
        assert.ok(
          selected==='/assets/popular-responsive/'+id+'-240.webp'||
          selected==='/assets/popular-responsive/'+id+'-480.webp',
          'Chromium used an oversized image for '+id+': '+selected);
      }
    }

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
