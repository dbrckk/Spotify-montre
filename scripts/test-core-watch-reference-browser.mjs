import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

// Verify the generated 15 historical SEO pages, not external merchant sites.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Reference copy browser tests must use localhost');
const products=JSON.parse(readFileSync('site/selection-affiliation.json','utf8')).products;
assert.equal(products.length,15);
const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
for(const p of products){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  const name=p.brand+' '+p.model;
  assert.ok(html.includes('class="watch watch-product" data-watch-id="'+p.id+'"'
    +' data-brand="'+escapeHtml(p.brand)+'" data-model="'+escapeHtml(p.model)+'"'),
    'Only the source catalogue may identify historical SEO model '+p.id);
  assert.equal((html.match(/data-watch-ref-copy=/g)||[]).length,1,
    'Exactly one source-matched copy button per historical model: '+p.id);
  assert.ok(html.includes('data-watch-ref-copy="'+p.id+'" hidden>Copier la référence</button>'),
    'Unvalidated copy button must be hidden without JavaScript: '+p.id);
  assert.ok(html.includes('<h1>'+escapeHtml(name)+'</h1>'),
    'Copied source identity must match buyer-facing heading: '+p.id);
  assert.equal((html.match(/src="\.\.\/watch-reference-copy-v2\.js"/g)||[]).length,1);
  assert.equal((html.match(/href="\.\.\/watch-reference-copy\.css"/g)||[]).length,1);
  assert.ok(html.includes('data-watch-ref-status'), 'Accessible copy outcome required: '+p.id);
}
// A guide is not a product page and must not download a nonfunctional copy widget.
const guide=readFileSync('site/montres/guide-choisir-montre.html','utf8');
assert.ok(!guide.includes('data-watch-ref-copy='));
assert.ok(!guide.includes('watch-reference-copy-v2.js'));

const browser=await chromium.launch({headless:true});
try{
  for(const width of [360,393,1366]){
    const page=await browser.newPage({viewport:{width,height:850},
      isMobile:width<=393,hasTouch:width<=393,locale:'fr-FR'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
        writeText:async value=>{window.__copiedReference=value}
      }});
    });
    try{
      const p=products.find(x=>x.id==='casio-mtp-1302')||products[0];
      await page.goto(new URL('/montres/'+p.id+'.html',base).href,
        {waitUntil:'domcontentloaded'});
      const ref=page.locator('article.watch.watch-product [data-watch-ref-tools]');
      const button=ref.locator('[data-watch-ref-copy]');
      assert.equal(await ref.isVisible(),true);
      assert.equal(await button.isVisible(),true);
      assert.equal(await button.getAttribute('aria-label'),
        'Copier la référence '+p.brand+' '+p.model);
      const bounds=await button.boundingBox();
      assert.ok(bounds&&bounds.height>=44&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,
        'Copy CTA must be accessible and fit viewport '+width);
      await button.click();
      assert.equal(await page.evaluate(()=>window.__copiedReference),p.brand+' '+p.model,
        'Clipboard should contain the documented historical model');
      assert.match(await ref.locator('[data-watch-ref-status]').innerText(),/Référence copiée/);
      assert.equal(await ref.locator('input[data-watch-ref-manual]').count(),0,
        'Do not show manual fallback after successful clipboard write');
      const geometry=await page.evaluate(()=>({
        width:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth
      }));
      assert.ok(geometry.scroll<=geometry.width+2,
        'Core product must not overflow '+width+'px: '+JSON.stringify(geometry));
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
  const fallback=await browser.newPage({viewport:{width:393,height:850},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  await fallback.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw Error('Permission denied')}
    }});
  });
  try{
    const p=products.find(x=>x.id==='citizen-tsuyosa')||products[1];
    await fallback.goto(new URL('/montres/'+p.id+'.html',base).href);
    const ref=fallback.locator('article.watch.watch-product [data-watch-ref-tools]');
    await ref.locator('button[data-watch-ref-copy]').click();
    const field=ref.locator('input[data-watch-ref-manual]');
    assert.ok(await field.isVisible());
    assert.equal(await field.inputValue(),p.brand+' '+p.model);
    assert.equal(await field.getAttribute('readonly'),'');
    assert.match(await ref.locator('[data-watch-ref-status]').innerText(),
      /Copie automatique indisponible/);
  }finally{await fallback.close();}
  const withoutJs=await browser.newContext({javaScriptEnabled:false,
    viewport:{width:393,height:850},isMobile:true,hasTouch:true});
  try{
    const p=products[0];
    const page=await withoutJs.newPage();
    await page.goto(new URL('/montres/'+p.id+'.html',base).href);
    assert.equal(await page.locator('button[data-watch-ref-copy]').isVisible(),false,
      'No-JS visitor must not see a dead copy button');
    assert.ok(await page.locator('.watch-actions a').count()>=1,
      'Core model destination links must work without JavaScript');
  }finally{await withoutJs.close();}
  console.log('PASS: 15 original watch references match source; Android copy, denied clipboard, no-JS merchant links and desktop reflow.');
}finally{await browser.close();}
