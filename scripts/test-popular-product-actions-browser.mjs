import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,statSync} from 'node:fs';
import {chromium} from 'playwright';

// Local-only verification. Do not follow merchant links or invoke payments.
const base=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
if(base.protocol!=='http:'||!['localhost','127.0.0.1'].includes(base.hostname))
  throw Error('Supplemental product browser tests must run on localhost');
const picks=JSON.parse(readFileSync('site/selection-populaires.json','utf8')).products;
const rights=JSON.parse(readFileSync('site/popular-photo-rights.json','utf8')).photos;
const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
assert.equal(picks.length,37);
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  assert.match(html,/src="\.\.\/extra-product-actions\.js"/);
  assert.ok(html.includes('data-extra-favorite="'+p.id+'"'));
  assert.ok(html.includes('data-extra-share="'+p.id+'"'));
  // All 37 pages must offer meaningful no-JS in-page navigation, including
  // photos-withdrawn references. Never duplicate IDs or invent merchant URLs.
  assert.equal((html.match(/class="am-extra-quicklinks"/g)||[]).length,1,
    'One buyer-facing shortcuts rail per product sheet: '+p.id);
  for(const [target,label] of [
    ['caracteristiques','Caractéristiques'],
    ['vendeurs','Vendeurs et références'],
    ['sources','Sources et preuves']
  ]){
    assert.ok(html.includes('href="#'+target+'"><span aria-hidden="true">'),
      'Direct no-JS shortcut missing for '+target+': '+p.id);
    assert.ok(html.includes(label+'</a>'),
      'Public buyer label missing on '+p.id+': '+label);
    assert.equal((html.match(new RegExp('id="'+target+'"','g'))||[]).length,1,
      'Shortcut target must be unique: '+target+' '+p.id);
  }
  assert.ok(html.includes('id="caracteristiques">Repères techniques documentés</h2>'),
    'Technical facts heading must remain documented and discoverable: '+p.id);
  assert.ok(html.includes('data-watch-ref-copy="'+p.id+'"'),
    'Every supplemental watch must expose its actual model reference: '+p.id);
  assert.ok(html.includes('data-watch-ref-tools hidden'),
    'Copy controls must remain invisible without validated JavaScript: '+p.id);
  assert.ok(html.includes('src="../watch-reference-copy-v2.js"'),
    'Dedicated source-copy enhancement missing on '+p.id);
  assert.ok(html.includes('href="../watch-reference-copy.css"'),
    'Dedicated source-copy styling missing on '+p.id);
  assert.ok(html.includes('href="./toutes-les-montres.html?saved=1"'));
  assert.ok(html.includes('class="am-extra-factual-swipe-hint"')&&
    html.includes('class="am-extra-factual-scroll"'),
    'Every supplemental product must explain the same source-backed four-watch comparison: '+p.id);
  assert.ok(html.includes('<div class="am-extra-mobile-prelude" aria-hidden="true">'),
    'Every source-backed watch needs a visual mobile title: '+p.id);
  assert.ok(html.includes('<strong>'+escapeHtml(p.brand+' '+p.model)+'</strong>'),
    'Mobile title must contain exact documented watch identity: '+p.id);
  assert.equal((html.match(/class="am-extra-mobile-prelude"/g)||[]).length,1,
    'One mobile prelude required per exact-model page: '+p.id);
  assert.equal((html.match(/<h1>/g)||[]).length,1,
    'One semantic h1 remains after mobile prelude: '+p.id);
  const article=html.match(/<article class="am-extra-product"[^>]*>/)?.[0]||'';
  assert.ok(article.includes('data-extra-tier="'+p.tier+'"'),
    'Editorial tier must be present for the exact model: '+p.id);
  assert.ok(article.includes('data-extra-photo="'+(rights[p.id]?'published':'source')+'"'),
    'Real photographs and source-only fallbacks must never share the same photo state: '+p.id);
  const proof=rights[p.id];
  if(proof){
    assert.ok(!html.includes('href="../extra-source-passport.css"'),
      'Approved photo should not download the no-photo editorial CSS: '+p.id);
    assert.ok(!html.includes('class="am-extra-reference-passport"'),
      'Real approved photographs should not be replaced by an editorial passport: '+p.id);
    assert.ok(!html.includes('class="am-extra-art-no-photo"'),
      'Photographed product must not use the no-photo treatment: '+p.id);
    const hero=html.match(/<img class="am-extra-licensed-photo"[^>]+>/)?.[0]||'';
    assert.ok(hero,'Published exact-model photograph missing: '+p.id);
    assert.ok(hero.includes('fetchpriority="high"')&&hero.includes('loading="eager"'),
      'The genuine first-viewport photograph must be prioritized, not lazy: '+p.id);
    assert.ok(html.includes('class="am-extra-photo-stage"')&&
      html.includes('class="am-extra-photo-meta"'),
      'Verified watch must have an unobstructed photo stage and separate metadata: '+p.id);
    assert.ok(hero.includes('width="'+proof.width+'"')&&
      hero.includes('height="'+proof.height+'"'),'Original aspect dimensions missing: '+p.id);
    for(const size of [240,360,480,640,720,960].filter(size=>size<proof.width))
      assert.ok(hero.includes('popular-responsive/'+p.id+'-'+size+'.webp '+size+'w'),
        'Detailed watch hero must expose the verified '+size+'px WebP: '+p.id);
    assert.ok(hero.includes('watches-popular/'+p.id+'.webp '+proof.width+'w'),
      'Full-size original must remain eligible on detail '+p.id);
  }else{
    assert.ok(html.includes('href="../extra-source-passport.css"'),
      'Source-backed no-photo design must load its uniquely named CSS asset: '+p.id);
    assert.ok(html.includes('am-extra-art-no-photo'),
      'No-photo product must receive the source-first studio art direction: '+p.id);
    assert.equal((html.match(/class="am-extra-reference-passport"/g)||[]).length,1,
      'One factual reference panel required per unphotographed product: '+p.id);
    assert.equal((html.match(/class="am-extra-seller-path"/g)||[]).length,1,
      'Commercial exits must be distinguished from official photos: '+p.id);
    assert.ok(html.includes('<dt>Mouvement</dt><dd>'+escapeHtml(p.movement)+'</dd>'),
      'Editorial passport movement must match the exact source field: '+p.id);
    assert.ok(html.includes('<dt>Boîtier</dt><dd>'+escapeHtml(p.case)+'</dd>'),
      'Editorial passport case description must remain documented: '+p.id);
    assert.equal((html.match(/class="am-extra-passport-number"/g)||[]).length,4,
      'Unphotographed reference needs exactly four real specification cells: '+p.id);
    for(const [label,value] of [['Verre',p.glass],['Étanchéité',p.water]]){
      assert.ok(html.includes('<dt>'+label+'</dt><dd>'+escapeHtml(value)+'</dd>'),
        'Editorial passport must retain exact source-backed '+label+': '+p.id);
    }
    assert.ok(html.includes('<span class="am-extra-passport-photo-status">Photo non publiée</span>'),
      'Do not make a documentary visual look like verified product photography: '+p.id);
    assert.ok(html.includes('<strong>'+escapeHtml(p.model)+'</strong>'),
      'Documentary visual must display the exact manufacturer model reference: '+p.id);
    assert.ok(!html.includes('class="am-budget-dial"'),
      'Do not simulate an unsupported product dial on a no-photo model: '+p.id);
    assert.ok(!html.includes('class="am-extra-licensed-photo"'),
      'Do not publish unapproved watch photography: '+p.id);
    assert.ok(!html.includes('class="am-extra-photo-stage"'),
      'An unphotographed watch must keep its honest typographic fallback: '+p.id);
    assert.ok(html.includes('class="am-extra-photo-unavailable"'),
      'Missing explicit photo-unavailable disclosure: '+p.id);
    const photoLink=html.match(/<a href="([^"]+)" target="_blank" rel="noopener noreferrer" aria-label="Voir les photos du modèle exact : [^"]+ sur la fiche officielle \(nouvel onglet\)">Voir les photos du modèle exact/);
    assert.ok(photoLink,'Missing source-first exact-model photo CTA: '+p.id);
    assert.equal(photoLink[1],p.officialUrl.replaceAll('&','&amp;'),
      'Photo CTA must link to the documented manufacturer or seller URL: '+p.id);
  }
}
// Priority is based on documentary evidence, not projected affiliate income.
const exactResearch=JSON.parse(readFileSync('research/amazon-fr-popular-verified.json','utf8')).verifiedProducts;
const affiliateActive=JSON.parse(readFileSync('site/affiliate-links.json','utf8')).enabled;
let exactFirst=0,sourceFirst=0,partnerFirst=0;
for(const watch of picks){
  const html=readFileSync('site/montres/'+watch.id+'.html','utf8');
  const summary=html.match(/<section class="am-extra-decision"[^>]+>/)?.[0]||'';
  assert.ok(summary,'Every watch needs an evidence-first decision summary: '+watch.id);
  assert.ok(html.includes('<strong>Point à contrôler sur ce modèle :</strong> '+escapeHtml(watch.caution)),
    'Decision summary must surface the documented, watch-specific caution: '+watch.id);
  assert.ok(html.includes('Chez le vendeur tiers · pas de commande sur Atelier Montres'),
    'The decision summary must not masquerade external checkout as direct purchase');
  assert.ok(html.includes('<dt>Visuel du modèle</dt>')&&
    html.includes('<dt>Accès marchand</dt>')&&
    html.includes('<dt>Paiement et livraison</dt>'),
    'Buyer evidence must cover photograph, merchant route and payment: '+watch.id);
  assert.ok(summary.includes('data-decision-photo="'+(rights[watch.id]?'published':'source')+'"'),
    'Photo disclosure must match declared image publication: '+watch.id);
  const expectedRoute=affiliateActive&&exactResearch[watch.id]
    ?(exactResearch[watch.id].evidenceType==='amazon_fr_comparator_redirect'?'comparator':'asin')
    :affiliateActive?'search':'official';
  assert.ok(summary.includes('data-decision-route="'+expectedRoute+'"'),
    'Buyer summary must reflect source-first merchant evidence: '+watch.id);
  const match=html.match(/<div class="am-extra-actions" data-action-priority="(amazon|awin|source)"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(match,'Customer merchant priority must be explicit on '+watch.id);
  const first=match[2].match(/<a\b[^>]*>/)?.[0]||'';
  assert.ok(first,'No outbound model-specific action for '+watch.id);
  const expected=affiliateActive&&exactResearch[watch.id]?'amazon'
    :match[2].includes('data-partner-offer-id=')?'awin':'source';
  assert.equal(match[1],expected,'Do not prioritise a generic search over an actual source: '+watch.id);
  if(expected==='amazon'){
    exactFirst++;
    assert.ok(first.includes('data-amazon-product="'+watch.id+'"'),
      'Verified ASIN must lead to its documented product page: '+watch.id);
    assert.ok(first.includes('/dp/'+exactResearch[watch.id].asin),
      'The first CTA must use the actual documented ASIN: '+watch.id);
  }else if(expected==='awin'){
    partnerFirst++;
    assert.ok(first.includes('data-partner-offer-id="'+watch.id+'"'),
      'The approved partner source should lead when no exact Amazon ASIN is present: '+watch.id);
  }else{
    sourceFirst++;
    assert.ok(first.includes('data-merchant-official-id="'+watch.id+'"'),
      'An unverified Amazon search must not appear before the model source: '+watch.id);
    assert.ok(first.includes('href="'+escapeHtml(watch.officialUrl)+'"'),
      'The manufacturer / seller URL must match the original source: '+watch.id);
    if(affiliateActive)assert.ok(match[2].includes('data-amazon-search-id="'+watch.id+'"'),
      'Research-only sponsored Amazon link remains available but secondary: '+watch.id);
    assert.ok(html.includes('Recherche Amazon.fr — modèle non garanti'),
      'A generic search must remain transparently described: '+watch.id);
  }
}
assert.equal(exactFirst+partnerFirst+sourceFirst,37);
if(affiliateActive)assert.equal(exactFirst,14,'All fourteen verified supplemental ASINs retain priority');

// Comparator proof is the only trusted reason to publish two external
// documentary sources. Other exact links are NOT silently given fake proof.
const research=JSON.parse(readFileSync('research/amazon-fr-popular-verified.json','utf8')).verifiedProducts;
const documented=Object.entries(research)
  .filter(([,r])=>r.evidenceType==='amazon_fr_comparator_redirect');
assert.equal(documented.length,6,'Six different model/ASIN comparator proofs are currently substantiated');
for(const p of picks){
  const html=readFileSync('site/montres/'+p.id+'.html','utf8');
  const proof=research[p.id];
  const comparator=proof?.evidenceType==='amazon_fr_comparator_redirect';
  if(!comparator){
    assert.ok(!html.includes('data-asin-proof-id='),
      'Never invent independent corroboration for '+p.id);
    assert.ok(!html.includes('href="../merchant-proof-ledger.css"'),
      'Unrelated product pages must not download the audit-ledger CSS: '+p.id);
    continue;
  }
  assert.equal((html.match(/data-asin-proof-id=/g)||[]).length,1);
  assert.ok(html.includes('data-asin-proof-id="'+p.id+'"'));
  assert.ok(html.includes('href="../merchant-proof-ledger.css"'));
  assert.ok(html.includes('<code>'+proof.asin+'</code>'));
  assert.ok(html.includes('Code associé : <strong>'+escapeHtml(proof.marketplaceModel)+'</strong>'));
  assert.ok(html.includes('href="'+escapeHtml(proof.comparisonUrl)+'"'),
    'Published comparator URL must exactly match research: '+p.id);
  assert.ok(html.includes('href="'+escapeHtml(proof.corroborationUrl)+'"'),
    'Corroboration URL must exactly match separately approved source: '+p.id);
  assert.ok(html.includes('href="#sources">Voir les deux sources de correspondance'),
    'Purchaser should find the auditable evidence before leaving: '+p.id);
  assert.equal((html.match(/class="am-extra-proof-step"/g)||[]).length,2);
  assert.ok(html.includes('La page Amazon.fr n’a pas pu être consultée directement'),
    'Do not present a comparator redirect as a live stock check: '+p.id);
}
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const examples=['essential','signature','prestige'].map(tier=>picks.find(p=>p.tier===tier&&rights[p.id]));
  assert.ok(examples.every(Boolean),'Each editorial tier has a registered exact-model photo');
  const studioPhone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,
    hasTouch:true,javaScriptEnabled:false,locale:'fr-FR'});
  try{
    const backgrounds=[];
    for(const watch of examples){
      await studioPhone.goto(new URL('/montres/'+watch.id+'.html',base).href,{waitUntil:'load'});
      const label=studioPhone.locator('.am-extra-mobile-prelude');
      assert.ok(await label.isVisible(),'Mobile watch identity must be visible before photo: '+watch.id);
      assert.ok((await label.innerText()).includes(watch.model),'Mobile watch name must match source: '+watch.id);
      const rects=await studioPhone.evaluate(()=>{
        const a=document.querySelector('.am-extra-mobile-prelude').getBoundingClientRect();
        const b=document.querySelector('.am-extra-art').getBoundingClientRect();
        return {end:a.bottom,start:b.top,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
      });
      assert.ok(rects.end<=rects.start+2&&rects.overflow<=2,'393px photo must follow title without overflow: '+watch.id+' '+JSON.stringify(rects));
      backgrounds.push(await studioPhone.locator('.am-extra-photo-stage').evaluate(el=>getComputedStyle(el).backgroundImage));
    }
    assert.equal(new Set(backgrounds).size,3,'Photographic studios must have three range-specific backgrounds');
    await studioPhone.goto(new URL('/montres/casio-f91w-1.html',base).href,{waitUntil:'load'});
    assert.ok(await studioPhone.locator('.am-extra-mobile-prelude').isVisible(),'No-photo product also gets a mobile identity');
    assert.match(await studioPhone.locator('.am-extra-mobile-prelude').innerText(),/Photo non publiée/);
    assert.equal(await studioPhone.locator('.am-extra-photo-stage').count(),0,'Never invent a photo stage for an unphotographed watch');
    await studioPhone.setViewportSize({width:320,height:740});
    const narrow=await studioPhone.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(narrow.scroll<=narrow.client+2,'320px documentary page must not overflow '+JSON.stringify(narrow));
  }finally{await studioPhone.close();}
  // Source transparency remains readable and usable on a 393px phone.
  // Do not follow external merchant or evidence links in automated checks.
  const auditPhone=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await auditPhone.goto(new URL('/montres/casio-la-20wh-4a1.html',base).href,
      {waitUntil:'domcontentloaded'});
    const card=auditPhone.locator('.am-extra-proof-ledger');
    await card.scrollIntoViewIfNeeded();
    assert.ok(await card.isVisible());
    assert.equal(await card.getAttribute('data-asin-proof-id'),'casio-la-20wh-4a1');
    assert.equal(await card.locator('.am-extra-proof-sources a').count(),2);
    for(const link of await card.locator('.am-extra-proof-sources a').all()){
      assert.equal(await link.getAttribute('target'),'_blank');
      assert.equal(await link.getAttribute('rel'),'noopener noreferrer nofollow',
        'Editorial evidence must never be labelled a paid checkout exit');
      const bounds=await link.boundingBox();
      assert.ok(bounds&&bounds.height>=44,'Source CTA should be touch-accessible on Android');
    }
    const geometry=await auditPhone.evaluate(()=>{
      const el=document.querySelector('.am-extra-proof-ledger');
      const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,width:r.width,client:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth,columns:getComputedStyle(el.querySelector('.am-extra-proof-sources')).gridTemplateColumns};
    });
    assert.ok(geometry.left>=-1&&geometry.right<=393&&geometry.width>=280,
      'Provenance ledger must fit phone without clipped source URLs: '+JSON.stringify(geometry));
    assert.ok(geometry.scroll<=geometry.client+2,
      'Buyer-facing provenance block must not create horizontal scrolling');
    await card.screenshot({path:'artifacts/atelier-asin-proof-ledger-393.png'});
  }finally{await auditPhone.close();}
  // Verify the honest fallback is actually usable at mobile viewport width.
  const officialFallbackPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
  try{
    await officialFallbackPage.goto(new URL('/montres/casio-f91w-1.html',base).href,{waitUntil:'domcontentloaded'});
    const cta=officialFallbackPage.locator('.am-extra-official-photo>a');
    await cta.waitFor({state:'visible'});
    assert.equal(await cta.getAttribute('href'),'https://www.casio.com/fr/watches/casio/product.F-91W-1/');
    assert.equal(await cta.getAttribute('target'),'_blank');
    assert.equal(await cta.getAttribute('rel'),'noopener noreferrer');
    const bounds=await cta.boundingBox();
    assert.ok(bounds&&bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=393,
      'Mobile exact-model photo CTA must fit the screen and offer a 44px touch target');

    const passport=officialFallbackPage.locator('.am-extra-reference-passport');
    assert.equal(await passport.isVisible(),true,
      'No-photo model must display source-backed technical facts in the hero');
    const fallbackModel=picks.find(p=>p.id==='casio-f91w-1');
    assert.ok(fallbackModel,'Documented Casio F-91W-1 missing');
    assert.ok((await passport.innerText()).includes(fallbackModel.movement));
    assert.ok((await passport.innerText()).includes(fallbackModel.case));
    assert.equal(await passport.locator('.am-extra-passport-facts>div').count(),4);
    assert.ok((await passport.innerText()).includes(fallbackModel.glass),
      'The four-fact studio must display the real source-registered crystal');
    assert.ok((await passport.innerText()).includes(fallbackModel.water),
      'The four-fact studio must display the actual waterproofness wording');
    assert.equal(await passport.locator('.am-extra-passport-photo-status').innerText(),
      'Photo non publiée');
    const specGeometry=await passport.evaluate(el=>{
      const rect=el.getBoundingClientRect(),grid=el.querySelector('.am-extra-passport-facts');
      return {width:rect.width,left:rect.left,right:rect.right,
        columns:getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
        children:[...grid.children].map(node=>{
          const r=node.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};
        })};
    });
    assert.equal(specGeometry.columns,2,
      '393px Android should show two columns of legible documentary facts');
    assert.ok(specGeometry.children.every(rect=>rect.left>=specGeometry.left-2
      &&rect.right<=specGeometry.right+2&&rect.height>=80),
      'Real watch fact tiles must remain inside the studio: '+JSON.stringify(specGeometry));
    assert.equal(await officialFallbackPage.locator('.am-extra-seller-path').isVisible(),true);
    const studio=await officialFallbackPage.locator('.am-extra-art-no-photo').boundingBox();
    const panel=await passport.boundingBox();
    assert.ok(studio&&panel&&panel.width>250&&panel.x>=studio.x-2
      &&panel.x+panel.width<=studio.x+studio.width+2,
      'No-photo editorial passport must remain within the mobile studio');
    const pageBounds=await officialFallbackPage.evaluate(()=>({
      width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
    }));
    assert.ok(pageBounds.scroll<=pageBounds.width+2,
      'Source-first hero must not overflow on Android: '+JSON.stringify(pageBounds));
    await officialFallbackPage.locator('.am-extra-art-no-photo').screenshot({
      path:'artifacts/atelier-no-photo-editorial-393.png'
    });
    assert.equal(await officialFallbackPage.locator('.am-extra-licensed-photo').count(),0,
      'No fabricated F-91W photograph may appear');
  }finally{await officialFallbackPage.close();}
  const noJsShortcuts=await browser.newPage({viewport:{width:360,height:740},
    isMobile:true,hasTouch:true,javaScriptEnabled:false});
  try{
    await noJsShortcuts.goto(new URL('/montres/casio-f91w-1.html',base).href,
      {waitUntil:'load'});
    assert.equal(await noJsShortcuts.locator('.am-extra-quicklinks a').count(),3,
      'Source-first product cards must preserve shortcuts without scripts');
    await noJsShortcuts.locator('.am-extra-quicklinks a[href="#vendeurs"]').click();
    assert.equal(new URL(noJsShortcuts.url()).hash,'#vendeurs');
    assert.ok(await noJsShortcuts.locator('.am-extra-actions a').count()>=1,
      'The official supplier remains reachable without JavaScript');
    const withoutJs=await noJsShortcuts.evaluate(()=>{
      const passport=document.querySelector('.am-extra-reference-passport');
      const rect=passport.getBoundingClientRect();
      return {scroll:document.documentElement.scrollWidth,
        client:document.documentElement.clientWidth,
        passportLeft:rect.left,passportRight:rect.right,
        count:passport.querySelectorAll('.am-extra-passport-facts>div').length};
    });
    assert.equal(withoutJs.count,4,
      'The four source-backed facts must remain visible without JS');
    assert.ok(withoutJs.scroll<=withoutJs.client+2
      &&withoutJs.passportLeft>=-1&&withoutJs.passportRight<=withoutJs.client+1,
      '360px no-JS documentary studio must not cause horizontal overflow: '+
        JSON.stringify(withoutJs));

  }finally{await noJsShortcuts.close();}

  for(const width of [360,393,1366]){
    const context=await browser.newContext({viewport:{width,height:870},
      isMobile:width<600,hasTouch:width<600,locale:'fr-FR'});
    await context.addInitScript(()=>{
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
        window.__lastSharedProduct=data;
      }});
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    const shortcuts=page.locator('.am-extra-quicklinks');
    assert.equal(await shortcuts.locator('a').count(),3,
      'Watch sheet must expose technical, seller and evidence shortcuts');
    const shortcutLayout=await shortcuts.evaluate(nav=>{
      const rect=nav.getBoundingClientRect();
      return {left:rect.left,right:rect.right,scroll:nav.scrollWidth,
        viewport:nav.clientWidth,screen:document.documentElement.clientWidth,
        documentScroll:document.documentElement.scrollWidth};
    });
    assert.ok(shortcutLayout.left>=-1&&shortcutLayout.right<=width+1
      &&shortcutLayout.documentScroll<=shortcutLayout.screen+2,
      'Shortcut navigation may scroll internally but must not overflow the Android page: '+
        JSON.stringify(shortcutLayout));
    if(width<600)assert.ok(shortcutLayout.scroll>shortcutLayout.viewport,
      'Mobile 3-part navigation should be swipeable without compressing labels');
    const buttons=await shortcuts.locator('a').evaluateAll(els=>els.map(el=>{
      const r=el.getBoundingClientRect();return {height:r.height,width:r.width};
    }));
    assert.ok(buttons.every(rect=>rect.height>=48&&rect.width>=120),
      'Each navigation link must remain comfortably tappable: '+JSON.stringify(buttons));
    await shortcuts.locator('a[href="#vendeurs"]').click();
    assert.equal(new URL(page.url()).hash,'#vendeurs',
      'The seller shortcut must jump to the actual model reference before outbound links');
    await shortcuts.locator('a[href="#sources"]').click();
    assert.equal(new URL(page.url()).hash,'#sources',
      'Source provenance must remain directly accessible without a new request');
    const decision=page.locator('.am-extra-decision');
    assert.equal(await decision.count(),1);
    assert.ok(await decision.isVisible(),'Decision evidence must be readable before merchant actions');
    assert.equal(await decision.getAttribute('data-decision-photo'),'published');
    const decisionBox=await decision.boundingBox();
    assert.ok(decisionBox&&decisionBox.x>=-1&&decisionBox.x+decisionBox.width<=width+1,
      'Buyer guidance must fit the full viewport at '+width+'px');
    const merchant=page.locator('.am-extra-link-status');
    assert.equal(await merchant.getAttribute('data-merchant-route'),'comparator');
    assert.equal(await merchant.locator('.am-extra-merchant-facts dt').count(),3);
    assert.ok((await merchant.innerText()).includes('B072JTCP5H'),
      'The documented ASIN must appear before the external CTA');
    const merchantLayout=await merchant.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return {left:r.left,right:r.right,
        columns:getComputedStyle(el.querySelector('.am-extra-merchant-facts')).gridTemplateColumns,
        viewport:document.documentElement.clientWidth};
    });
    assert.ok(merchantLayout.left>=0&&merchantLayout.right<=merchantLayout.viewport+1,
      'Merchant proof panel must not overflow the viewport: '+JSON.stringify(merchantLayout));
    assert.equal(merchantLayout.columns.trim().split(/\s+/).length,width<600?1:3,
      'Documentary facts must stack on Android and fit a desktop grid');
    if(width===393)
      await merchant.screenshot({path:'artifacts/atelier-watch-merchant-proof-393.png'});
    const hint=page.locator('.am-extra-factual-swipe-hint');
    assert.equal(await hint.isVisible(),width<700,
      'Horizontal comparison hint is reserved for mobile screens');
    if(width<700){
      const sticky=await page.locator('.am-extra-factual-scroll').evaluate(region=>{
        region.scrollLeft=160;
        const label=region.querySelector('tbody th:first-child');
        const bounds=region.getBoundingClientRect(),criterion=label.getBoundingClientRect();
        return {position:getComputedStyle(label).position,scroll:region.scrollLeft,
          within:criterion.left>=bounds.left-2&&criterion.left<=bounds.left+7};
      });
      assert.ok(sticky.position==='sticky'&&sticky.scroll>0&&sticky.within,
        'Four-watch technical labels must stay visible on Android: '+JSON.stringify(sticky));
    }
    // A genuine watch photo must be entirely separate from its caption.
    // The older dark overlay obscured the bottom portion of the packshot.
    const studio=await page.evaluate(()=>{
      const stage=document.querySelector('.am-extra-photo-stage');
      const art=document.querySelector('.am-extra-art-with-photo');
      const image=stage?.querySelector('img.am-extra-licensed-photo');
      const meta=document.querySelector('.am-extra-photo-meta');
      const zoom=stage?.querySelector('button.am-extra-zoom');
      if(!stage||!art||!image||!meta||!zoom)return null;
      const s=stage.getBoundingClientRect(),i=image.getBoundingClientRect(),
        m=meta.getBoundingClientRect(),a=art.getBoundingClientRect(),
        z=zoom.getBoundingClientRect();
      return {
        stageInsideArt:s.left>=a.left-2&&s.right<=a.right+2,
        photoInsideStage:i.left>=s.left-2&&i.right<=s.right+2&&i.top>=s.top-2&&i.bottom<=s.bottom+2,
        metaAfterStage:m.top>=s.bottom-2&&m.left>=a.left-2&&m.right<=a.right+2,
        photoFit:getComputedStyle(image).objectFit,
        studioBg:getComputedStyle(stage).backgroundImage,
        captionText:meta.textContent.trim(),
        zoomVisible:!zoom.hidden&&z.width>=44&&z.height>=44,
        client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
      };
    });
    assert.ok(studio?.stageInsideArt&&studio.photoInsideStage&&studio.metaAfterStage,
      'Real watch photograph must remain unoccluded in the studio: '+width+' '+JSON.stringify(studio));
    assert.equal(studio.photoFit,'contain','Do not crop exact-model product photos');
    assert.ok(studio.captionText.includes('SKMEI')&&studio.captionText.includes('1251'),
      'Photo provenance and actual model must remain visible');
    assert.ok(studio.zoomVisible,'Photo zoom needs a visible 44px touch target');
    assert.ok(studio.scroll<=studio.client+2,'Studio layout must not overflow on '+width);
    if(width===393||width===1366)
      await page.locator('.am-extra-hero').screenshot({path:'artifacts/atelier-watch-studio-'+width+'.png'});

    if(width===393){
      const image=page.locator('.am-extra-licensed-photo');
      await image.waitFor({state:'visible'});
      await image.evaluate(node=>node.decode());
      const actual=await image.evaluate(node=>({
        path:new URL(node.currentSrc).pathname,
        width:node.naturalWidth,height:node.naturalHeight
      }));
      assert.ok(['/assets/popular-responsive/skmei-1251-360.webp',
         '/assets/popular-responsive/skmei-1251-480.webp'].includes(actual.path),
         'Android product sheet must download a lightweight exact-model WebP: '+actual.path);
      // With a width-descriptor srcset, naturalWidth can be density-adjusted:
      // assert successful decode and the exact requested derivative instead.
      assert.ok(actual.width>0&&actual.height>0,
        'Mobile product photo failed to decode: '+JSON.stringify(actual));
    }
    const actions=page.locator('.am-extra-local-tools');
    await actions.waitFor({state:'visible'});
    const favorite=actions.locator('[data-extra-favorite]');
    const share=actions.locator('[data-extra-share]');
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.ok(await favorite.isVisible());
    assert.ok(await share.isVisible());
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),
      ['skmei-1251']);
    assert.match(await actions.locator('[data-extra-action-status]').innerText(),/enregistrée/);
    await share.click();
    const shared=await page.evaluate(()=>window.__lastSharedProduct);
    assert.equal(shared.url,new URL('/montres/skmei-1251.html',base).href);
    assert.match(shared.title,/SKMEI 1251/);
    assert.equal(new URL(shared.url).search,'');
    await actions.locator('.am-extra-saved-link').click();
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('#udSavedCount').innerText(),'1');
    assert.equal(await page.locator('.ud-card:visible').count(),1);
    assert.ok(await page.locator('#modele-skmei-1251').isVisible());
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    await actions.waitFor({state:'visible'});
    assert.equal(await favorite.getAttribute('aria-pressed'),'true');
    await favorite.click();
    assert.equal(await favorite.getAttribute('aria-pressed'),'false');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(
      localStorage.getItem('atelier-montres-multibrand-favorites-v1'))),[]);

    const dimension=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      width:document.documentElement.clientWidth
    }));
    assert.ok(dimension.scroll<=dimension.width+2,
      'Supplemental product action overflow: '+JSON.stringify(dimension));
    assert.deepEqual(errors,[]);
    await context.close();
  }

  // A 393px Android at DPR 2 needs ~613 image pixels (78vw * 2).
  // A source-verified 640px candidate should avoid loading the 720px file
  // while preserving detail and the unchanged full original for zoom.
  const middleDensity=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'fr-FR'});
  try{
    const page=await middleDensity.newPage();
    const response=await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'load'});
    assert.ok(response?.ok(),'Two-density Android product sheet loads');
    const image=page.locator('.am-extra-photo-stage img.am-extra-licensed-photo');
    await image.evaluate(el=>el.decode());
    const info=await image.evaluate(el=>({
      chosen:new URL(el.currentSrc).pathname,
      sizes:el.getAttribute('sizes'),priority:el.getAttribute('fetchpriority'),
      renderedWidth:el.getBoundingClientRect().width,
      naturalWidth:el.naturalWidth
    }));
    assert.equal(info.chosen,'/assets/popular-responsive/skmei-1251-640.webp',
      'DPR2 Android should select the 640px source-verified WebP: '+JSON.stringify(info));
    assert.equal(info.priority,'high','First viewport watch photo should have high fetch priority');
    assert.ok(info.renderedWidth>250&&info.naturalWidth>0,
      'Selected watch image must decode and remain visually inspectable');
    const compactBytes=statSync('site/assets/popular-responsive/skmei-1251-640.webp').size;
    const largeBytes=statSync('site/assets/popular-responsive/skmei-1251-720.webp').size;
    assert.ok(compactBytes<largeBytes,
      '640px WebP must transfer fewer bytes than equivalent 720px photo');
    await page.locator('.am-extra-zoom').click();
    const original=page.locator('#amPhotoDialog img.am-photo-large');
    await original.waitFor({state:'visible'});
    assert.match(await original.getAttribute('src'),
      /\/assets\/watches-popular\/skmei-1251\.webp$/,
      'Full original source remains available for photo zoom');
    await page.locator('#amPhotoDialog .am-photo-close').click();
  }finally{await middleDensity.close();}

  // High-density Android screens must not jump straight from a 480px card
  // image to the full 1080px SKMEI original. Full original stays for zoom.
  const dense=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,deviceScaleFactor:3,locale:'fr-FR'});
  try{
    const page=await dense.newPage();
    await page.goto(new URL('/montres/skmei-1251.html',base).href,
      {waitUntil:'domcontentloaded'});
    const photo=page.locator('.am-extra-photo-stage img.am-extra-licensed-photo');
    await photo.waitFor({state:'visible'});
    await photo.evaluate(image=>image.decode());
    const selection=await photo.evaluate(image=>({
      path:new URL(image.currentSrc).pathname,
      width:image.naturalWidth,height:image.naturalHeight,
      renderedWidth:Math.round(image.getBoundingClientRect().width)
    }));
    assert.equal(selection.path,'/assets/popular-responsive/skmei-1251-960.webp',
      'Dense Android must select 960px optimized exact-model WebP: '+JSON.stringify(selection));
    assert.ok(selection.width>0&&selection.height>0);
    assert.ok(await page.locator('button.am-extra-zoom').isVisible(),
      'Original zoom remains available when optimized display image loads');
  }finally{await dense.close();}

  const noScript=await browser.newPage({javaScriptEnabled:false});
  await noScript.goto(new URL('/montres/skmei-1251.html',base).href);
  assert.ok(await noScript.locator('.am-extra-photo-stage img').isVisible(),
    'Real photo must display without JavaScript');
  assert.ok(await noScript.locator('.am-extra-photo-meta').isVisible(),
    'Photo caption must display without JavaScript');
  assert.equal(await noScript.locator('.am-extra-zoom').isVisible(),false,
    'Image zoom affordance is progressive enhancement');

  assert.equal(await noScript.locator('.am-extra-local-tools').isVisible(),false);
  assert.ok(await noScript.locator('.am-extra-actions a').count()>=1,
    'Manufacturer/merchant links remain available without JavaScript');
  await noScript.close();
  // A model blocked by the manufacturer stays a typographic composition.
  const noPhoto=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  await noPhoto.goto(new URL('/montres/casio-f91w-1.html',base).href,
    {waitUntil:'domcontentloaded'});
  assert.equal(await noPhoto.locator('.am-extra-photo-stage').count(),0,
    'Never substitute another watch photograph for an inaccessible source');
  assert.equal(await noPhoto.locator('.am-extra-licensed-photo').count(),0);
  assert.ok(await noPhoto.locator('.am-extra-art:not(.am-extra-art-with-photo) .am-extra-art-label').isVisible());
  assert.ok(await noPhoto.locator('.am-extra-actions a').count()>=1);
  const bounds=await noPhoto.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth
  }));
  assert.ok(bounds.scroll<=bounds.client+2,'Unphotographed watch must not overflow Android');
  await noPhoto.close();


  // With scripts disabled, a generic Amazon search must never become the
  // primary action for a watch lacking a documented exact ASIN.
  const sourceOnly=picks.find(p=>!exactResearch[p.id]);
  assert.ok(sourceOnly,'An unverified-reference sample is required');
  for(const [id,firstKind] of [['skmei-1251','amazon'],[sourceOnly.id,'source']]){
    const viewport=await browser.newPage({
      javaScriptEnabled:false,viewport:{width:393,height:852},isMobile:true,hasTouch:true
    });
    try{
      await viewport.goto(new URL('/montres/'+id+'.html',base).href);
      const group=viewport.locator('.am-extra-actions');
      assert.equal(await group.getAttribute('data-action-priority'),firstKind);
      const first=group.locator('a').first();
      const label=await first.innerText();
      assert.match(label,firstKind==='amazon'?/Amazon.fr/:/modèle exact chez/);
      const rect=await first.boundingBox();
      const width=await viewport.evaluate(()=>document.documentElement.scrollWidth);
      assert.ok(rect&&rect.height>=44&&rect.x>=0&&rect.x+rect.width<=393,
        'Primary merchant source must be an accessible Android touch target: '+id);
      assert.ok(width<=395,'Buyer links must not overflow a 393px Android viewport: '+id);
      if(firstKind==='source') {
        assert.ok(await group.locator('[data-amazon-search-id="'+id+'"]').count()===1,
          'Amazon search stays visibly available as a secondary option');
        assert.match(await group.locator('a').last().innerText(),/Rechercher sur Amazon.fr/);
      }
    }finally{await viewport.close();}
  }

  // Browser clipboard/share may both be unavailable or blocked. Users must
  // still be able to manually copy the full, model-specific URL.
  const fallback=await browser.newPage();
  await fallback.addInitScript(()=>{
    Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw Error('Clipboard permission denied')}
    }});
  });
  await fallback.goto(new URL('/montres/skmei-1251.html',base).href);
  const refButton=fallback.locator('button[data-watch-ref-copy="skmei-1251"]');
  assert.ok(await refButton.isVisible(),'Copy exact manufacturer code must work as an Android fallback');
  await refButton.click();
  const refField=fallback.locator('input[data-watch-ref-manual]');
  assert.ok(await refField.isVisible(),'Denied clipboard permission must reveal a selectable reference');
  assert.equal(await refField.inputValue(),'SKMEI 1251');
  assert.equal(await refField.getAttribute('readonly'),'');
  assert.match(await fallback.locator('[data-watch-ref-status]').innerText(),/Copie automatique indisponible/);
  await fallback.locator('[data-extra-share]').click();
  const field=fallback.locator('[data-extra-copy-link]');
  assert.ok(await field.isVisible());
  assert.equal(await field.inputValue(),new URL('/montres/skmei-1251.html',base).href);
  await fallback.close();
  console.log('PASS: 37 exact product pages have safe save/share, Android favorites sync, canonical sharing and no-JS merchant links');
}finally{
  await browser.close();
}
