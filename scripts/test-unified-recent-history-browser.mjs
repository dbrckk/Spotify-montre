import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Private history tests require localhost');
const core=JSON.parse(readFileSync('site/selection-affiliation.json','utf8')).products;
const extra=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
const all=[...core,...extra];
assert.equal(all.length,52);
for(const p of all){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.ok(html.includes('src="../unified-recent-history.js"'),
    'History must work on the exact-model SEO sheet: '+p.id);
}
const catalogue=readFileSync('site/montres/toutes-les-montres.html','utf8');
assert.ok(catalogue.includes('data-unified-recent-list'));
assert.ok(catalogue.includes('href="../unified-recent-history.css"'));
assert.ok(catalogue.includes('src="../unified-recent-history.js"'));
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const path=p=>new URL(p,base).href;
  const key='atelier-montres-unified-recent-v1';
  try{
    await page.goto(path('/montres/toutes-les-montres.html'));
    assert.equal(await page.locator('[data-unified-recent]').isVisible(),false,
      'New visitors must not see a fictitious browsing history');
    const ids=[core[0].id,extra[0].id,core[1].id,extra[1].id];
    for(const id of ids){
      await page.goto(path('/montres/'+id+'.html'));
      assert.ok(await page.locator('h1').isVisible());
    }
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),
      [...ids].reverse(),'All 52 product types share the same device-local recency record');
    await page.goto(path('/montres/toutes-les-montres.html'));
    const section=page.locator('[data-unified-recent]');
    assert.ok(await section.isVisible());
    const links=section.locator('a.am-unified-recent-link');
    assert.equal(await links.count(),4);
    for(let i=0;i<ids.length;i++){
      assert.equal(await links.nth(i).getAttribute('href'),'./'+ids[ids.length-1-i]+'.html');
      const box=await links.nth(i).boundingBox();
      assert.ok(box&&box.height>=44&&box.x>=-1&&box.x+box.width<=394,
        'Recent watch link must be touch-accessible on Android');
    }
    const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.width+2,'History must not introduce horizontal overflow');
    await section.locator('[data-unified-recent-clear]').click();
    assert.equal(await section.isVisible(),false);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);
    await page.reload();
    assert.equal(await section.isVisible(),false,'Cleared history must stay empty');
    // No off-site URL can enter the rail, even if storage is manually corrupted.
    await page.evaluate(key=>localStorage.setItem(key,
      JSON.stringify(['https://evil.example', 'missing-watch', 'javascript:alert(1)'])),key);
    await page.reload();
    assert.equal(await section.isVisible(),false,'Unknown or malicious IDs must not render links');
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
  const noJs=await browser.newContext({javaScriptEnabled:false});
  try{
    const page=await noJs.newPage();
    await page.goto(path('/montres/toutes-les-montres.html'));
    assert.equal(await page.locator('[data-unified-recent]').isVisible(),false);
    assert.equal(await page.locator('article.ud-card').count(),52,
      '52 products remain crawlable without history JS');
  }finally{await noJs.close();}
  console.log('PASS: 52-watch local history, private recent rail, source-bound links, clear, Android touch and no-JS');
}finally{await browser.close();}
