import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';

// Local-only tests: navigate real published-model HTML, never merchant links.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Private history tests require localhost');
const core=JSON.parse(readFileSync('site/selection-affiliation.json','utf8')).products;
const extra=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
const photoRights=JSON.parse(readFileSync('site/popular-photo-rights.json','utf8')).photos;
const all=[...core,...extra],noPhoto=extra.find(p=>!Object.hasOwn(photoRights,p.id));
assert.equal(all.length,52);
assert.ok(noPhoto,'An honest no-photo historical card is required');
for(const p of all){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.ok(html.includes('src="../unified-recent-history.js"'),
    'History must work on the exact-model SEO sheet: '+p.id);
}
const catalogue=readFileSync('site/montres/toutes-les-montres.html','utf8');
assert.ok(catalogue.includes('data-unified-recent-list'));
assert.ok(catalogue.includes('href="../unified-recent-history.css"'));
assert.ok(catalogue.includes('src="../unified-recent-history.js"'));
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const path=p=>new URL(p,base).href;
  const key='atelier-montres-unified-recent-v1';
  const cat=path('/montres/toutes-les-montres.html');
  const ids=[core[0].id,extra[0].id,core[1].id,noPhoto.id];
  const expectedIds=[...ids].reverse();
  const context=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(cat);
    assert.equal(await page.locator('[data-unified-recent]').isVisible(),false,
      'New visitors must not see a fictitious browsing history');
    for(const id of ids){
      await page.goto(path('/montres/'+id+'.html'));
      assert.ok(await page.locator('h1').isVisible());
    }
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),
      expectedIds,'All 52 product types share the same device-local recency record');
    await page.goto(cat);
    const section=page.locator('[data-unified-recent]');
    assert.ok(await section.isVisible());
    const links=section.locator('a.am-unified-recent-link');
    const items=section.locator('article.am-unified-recent-item');
    assert.equal(await links.count(),4);
    assert.equal(await items.count(),4);
    for(let i=0;i<expectedIds.length;i++){
      assert.equal(await links.nth(i).getAttribute('href'),'./'+expectedIds[i]+'.html');
      assert.equal(await items.nth(i).getAttribute('data-recent-watch-id'),expectedIds[i]);
      await links.nth(i).scrollIntoViewIfNeeded();
      const box=await links.nth(i).boundingBox();
      assert.ok(box&&box.height>=44&&box.x>=-1&&box.x+box.width<=394,
        'Scrolled watch card must be touch-accessible on Android');
    }
    const pictures=section.locator('.am-unified-recent-media img');
    assert.ok(await pictures.count()>=3,
      'Photo-backed historical models should display actual approved local images');
    let responsiveChecked=0;
    for(const img of await pictures.all()){
      const raw=await img.getAttribute('src');
      const url=new URL(raw,page.url());
      assert.equal(url.origin,base.origin,'Recently viewed must never load a remote image');
      assert.match(url.pathname,/^\/assets\/watches(?:-popular)?\/[a-z0-9-]+\.webp$/);
      const item=img.locator('xpath=ancestor::article[1]');
      const id=await item.getAttribute('data-recent-watch-id');
      assert.ok(url.pathname.endsWith('/'+id+'.webp'),
        'A thumbnail must depict the exact model that the link opens');
      if(core.some(product=>product.id===id)&&
        existsSync('site/assets/watch-responsive/'+id+'-480.webp')){
        // Hashed responsive photo URLs must not silently disable srcset.
        const sourceSet=await img.getAttribute('srcset');
        assert.ok(sourceSet?.includes('/watch-responsive/'+id+'-480.webp?v='),
          'Versioned responsive image must remain selectable for '+id);
        for(const candidate of sourceSet.split(',')){
          const parts=candidate.trim().split(/\s+/);
          assert.equal(parts.length,2,'Valid image URL and width descriptor');
          assert.match(parts[1],/^[1-9][0-9]*w$/);
          const imageUrl=new URL(parts[0],page.url());
          assert.equal(imageUrl.origin,base.origin,'No remote responsive image');
          assert.match(imageUrl.search,/^\?v=[a-f0-9]{12}$/);
          const original=imageUrl.pathname==='/assets/watches/'+id+'.webp';
          const prefix='/assets/watch-responsive/'+id+'-';
          const responsive=imageUrl.pathname.startsWith(prefix)&&
            /^[0-9]+[.]webp$/.test(imageUrl.pathname.slice(prefix.length));
          assert.ok(original||responsive,'The responsive image must match '+id);
        }
        responsiveChecked++;
      }
      assert.equal(await img.getAttribute('alt'),'',
        'The visible model name should label the link once');
    }
    assert.ok(responsiveChecked>=2,
      'Two core watch thumbnails must exercise versioned responsive WebPs');
    const noPhotoItem=section.locator('[data-recent-watch-id="'+noPhoto.id+'"]');
    assert.equal(await noPhotoItem.locator('img').count(),0,
      'Unphotographed models must not be given generated or unrelated pictures');
    assert.match(await noPhotoItem.innerText(),/PHOTO NON PUBLIÉE/);
    const size=await page.evaluate(()=>({
      width:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth,
      railWidth:document.querySelector('[data-unified-recent-list]').clientWidth,
      railScroll:document.querySelector('[data-unified-recent-list]').scrollWidth
    }));
    assert.ok(size.railScroll>size.railWidth,'Mobile cards should form an actual horizontal rail');
    assert.ok(size.scroll<=size.width+2,'History must not create page-wide overflow');
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({path:'artifacts/recent-watch-showroom-393.png'});

    const picks=section.locator('button[data-recent-compare-id]');
    assert.equal(await picks.count(),4);
    await picks.nth(0).click();
    assert.equal(await picks.nth(0).getAttribute('aria-pressed'),'true');
    assert.match(await section.locator('.am-unified-recent-compare-status').innerText(),
      /Une montre choisie/);
    assert.equal(await section.locator('.am-unified-recent-compare-link').isVisible(),false);
    await picks.nth(1).click();
    const compare=section.locator('a.am-unified-recent-compare-link');
    assert.equal(await compare.getAttribute('href'),
      '?compare='+expectedIds.slice(0,2).join(',')+'#comparer',
      'Compare route must carry only selected verified model IDs');
    assert.equal(await compare.isVisible(),true);
    await compare.click();
    await page.waitForFunction(()=>/2 montres choisies/.test(
      document.querySelector('#udCompareStatus')?.textContent||''));
    assert.ok(await page.locator('.ud-matrix').isVisible(),
      'Recently viewed compare must open the existing factual comparison');
    assert.ok(page.url().includes('#comparer'));

    await page.goto(cat);
    const newSection=page.locator('[data-unified-recent]');
    const morePicks=newSection.locator('button[data-recent-compare-id]');
    for(let i=0;i<3;i++)await morePicks.nth(i).click();
    await morePicks.nth(3).click();
    assert.equal(await morePicks.nth(3).getAttribute('aria-pressed'),'false');
    assert.match(await newSection.locator('.am-unified-recent-compare-status').innerText(),
      /Trois montres maximum/);
    assert.equal(await newSection.locator('[aria-pressed="true"][data-recent-compare-id]').count(),3);
    await newSection.locator('button.am-unified-recent-reset').click();
    assert.equal(await newSection.locator('.am-unified-recent-compare').isVisible(),false);

    await newSection.locator('[data-unified-recent-clear]').click();
    assert.equal(await newSection.isVisible(),false);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
    await page.reload();
    assert.equal(await newSection.isVisible(),false,'Cleared history must stay empty');
    // No off-site URL can enter the rail, even with corrupted localStorage.
    await page.evaluate(key=>localStorage.setItem(key,
      JSON.stringify(['https://evil.example', 'missing-watch', 'javascript:alert(1)'])),key);
    await page.reload();
    assert.equal(await newSection.isVisible(),false,'Unknown or malicious IDs must not render links');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}

  const desktop=await browser.newContext({viewport:{width:1366,height:900},locale:'fr-FR'});
  try{
    const page=await desktop.newPage();
    await page.goto(cat);
    await page.evaluate(({key,ids})=>localStorage.setItem(key,JSON.stringify(ids)),{key,ids});
    await page.reload();
    assert.equal(await page.locator('.am-unified-recent-item').count(),4);
    const desktopGrid=await page.locator('[data-unified-recent-list]').evaluate(el=>({
      columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    }));
    assert.equal(desktopGrid.columns,4,'Desktop should show four compact premium cards per row');
    assert.ok(desktopGrid.overflow<=2,'History grid must not cause desktop horizontal overflow');
    await page.locator('[data-unified-recent]').screenshot({path:'artifacts/recent-watch-showroom-1366.png'});
  }finally{await desktop.close();}
  const noJs=await browser.newContext({javaScriptEnabled:false});
  try{
    const page=await noJs.newPage();
    await page.goto(cat);
    assert.equal(await page.locator('[data-unified-recent]').isVisible(),false);
    assert.equal(await page.locator('article.ud-card').count(),52,
      '52 products remain crawlable without history JS');
  }finally{await noJs.close();}
  console.log('PASS: 52-watch private showroom, source-bound real thumbnails, honest no-photo, native comparison, Android and desktop geometry, no-JS');
}finally{await browser.close();}
