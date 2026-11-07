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

    // A narrow Android screen should open into the photo-first, single-column
    // view; a deliberate switch to the grid must survive a page reload.
    await page.locator('#udViewTools').waitFor({state:'visible'});
    if(width<=420){
      assert.equal(await page.locator('#udViewLarge').getAttribute('aria-pressed'),'true');
      assert.ok(await page.locator('#udGrid').evaluate(el=>el.classList.contains('ud-view-large')),
        'Narrow Android should initially show large, inspectable watch photos');
      const photoDimensions=await page.locator('#udGrid .ud-card[data-visual="photo"] .ud-photo').first()
        .evaluate(el=>{
          const r=el.getBoundingClientRect();
          return {height:r.height,width:r.width};
        });
      assert.ok(photoDimensions.height>=300&&photoDimensions.width>=290,
        'Initial Android watch photograph too small: '+JSON.stringify(photoDimensions));
      const firstLarge=page.locator('#udGrid .ud-card').first();
      assert.equal(await firstLarge.locator('dl>div').count(),2);
      assert.ok(await firstLarge.locator('dl>div').last().isVisible(),
        'Large Android gallery must reveal both documented characteristics');
      await page.locator('#udViewCompact').click();
      assert.equal(await page.locator('#udViewCompact').getAttribute('aria-pressed'),'true');
      assert.ok(!await page.locator('#udGrid').evaluate(el=>el.classList.contains('ud-view-large')));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#udViewTools').waitFor({state:'visible'});
      assert.equal(await page.locator('#udViewCompact').getAttribute('aria-pressed'),'true',
        'Manual mobile grid preference must survive reload');
      await page.locator('#udViewLarge').click();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('#udViewTools').waitFor({state:'visible'});
      assert.equal(await page.locator('#udViewLarge').getAttribute('aria-pressed'),'true',
        'Manual large-image preference must survive reload');
    }else{
      assert.equal(await page.locator('#udViewCompact').getAttribute('aria-pressed'),'true',
        'Desktop must keep its original compact catalogue grid');
    }


    // The public catalogue hero should help a buyer browse rather than read
    // development plans. Its two real navigation paths must work on Android.
    const shopperHero=page.locator('header.ud-heading');
    assert.match(await shopperHero.locator('h1').innerText(),/52 montres.*vous ressemble/i);
    const customerActions=shopperHero.locator('.ud-heading-actions a');
    assert.equal(await customerActions.count(),2);
    assert.equal(await customerActions.nth(0).getAttribute('href'),'#udCount');
    assert.equal(await customerActions.nth(1).getAttribute('href'),'../conseiller.html');
    assert.equal(await shopperHero.locator('.ud-heading-highlights li').count(),3);
    const heroAudit=await shopperHero.evaluate(header=>{
      const nodes=[header,...header.querySelectorAll('.ud-heading-actions a')];
      const r=header.getBoundingClientRect();
      return {
        width:r.width,left:r.left,right:r.right,
        ctas:nodes.slice(1).map(item=>{
          const b=item.getBoundingClientRect();
          return {width:b.width,height:b.height,left:b.left,right:b.right,
            visible:getComputedStyle(item).visibility==='visible'};
        }),
        text:header.textContent
      };
    });
    assert.ok(heroAudit.left>=-1&&heroAudit.right<=width+1,
      'Premium catalogue hero overflows viewport: '+width);
    for(const action of heroAudit.ctas)
      assert.ok(action.width>0&&action.height>=44&&action.left>=-1&&action.right<=width+1&&action.visible,
        'Main customer CTA not touch-accessible at '+width+'px');
    assert.ok(!/vente directement sur notre site ne sera proposée|prix inventé|classement commercial fictif/i.test(heroAudit.text),
      'Do not display engineering roadmap or developer-centric caveats as hero copy');
    assert.match(heroAudit.text,/prix.*disponibilité.*livraison/i,
      'Merchant price, stock and delivery caveat must remain visible to buyers');


    // The 15 models without publishable packshots must let a shopper open
    // the exact manufacturer/source photo from the catalogue itself.
    const noPhotoCards=await page.locator('.ud-card[data-visual="no-photo"]').count();
    assert.equal(noPhotoCards,15,'Unexpected source-backed no-photo coverage');
    assert.equal(await page.locator('.ud-card[data-visual="photo"] .ud-photo-official').count(),0,
      'Do not duplicate source-photo buttons on already photographed cards');
    const unpictured=await page.locator('.ud-card[data-visual="no-photo"]').evaluateAll(items=>
      items.map(card=>{
        const button=card.querySelector('a.ud-photo-official');
        const rect=button?.getBoundingClientRect();
        return {
          id:card.dataset.id,
          url:button?.getAttribute('href'),
          label:button?.getAttribute('aria-label'),
          text:button?.textContent?.trim(),
          target:button?.getAttribute('target'),
          rel:button?.getAttribute('rel'),
          height:rect?.height,
          x:rect?.x,
          right:rect?.right
        };
      }));
    const knownUnpictured=JSON.parse(readFileSync(
      new URL('../site/selection-populaires.json',import.meta.url),'utf8')).products
      .filter(p=>!popularPhotoProof[p.id]);
    assert.equal(knownUnpictured.length,15);
    for(const item of unpictured){
      const source=knownUnpictured.find(p=>p.id===item.id);
      assert.ok(source,'Unregistered unphotographed model: '+item.id);
      assert.equal(item.url,source.officialUrl.replaceAll('&','&amp;'),
        'Source photo CTA must use exact documented model URL: '+item.id);
      assert.equal(item.target,'_blank');
      assert.match(item.rel||'',/noopener/);
      assert.match(item.rel||'',/noreferrer/);
      assert.ok(item.text?.includes('Voir les photos du modèle exact'));
      assert.ok(item.label?.includes('Voir les photos du modèle exact '+source.brand+' '+source.model));
      assert.ok(item.height>=44,'Mobile touch target below WCAG threshold: '+item.id);
      assert.ok(item.x>=-1&&item.right<=width+1,
        'No-photo source CTA overflows viewport: '+item.id);
    }


    // The storefront must present the watch before sales evidence, while
    // showing truthful availability disclosures immediately beside the exits.
    const cards=await page.locator('#udGrid .ud-card').evaluateAll(items=>
      items.map(card=>{
        const main=card.querySelector('.ud-card-main');
        const children=[...main.children];
        const heading=main.querySelector('h2');
        const context=main.querySelector('.ud-offer-context');
        const actions=main.querySelector('.ud-actions');
        return {
          id:card.dataset.id,
          headingBeforeEvidence:children.indexOf(heading)>=0&&
            children.indexOf(heading)<children.indexOf(context),
          evidenceBeforeExit:children.indexOf(context)>=0&&
            children.indexOf(context)<children.indexOf(actions),
          evidence:context?.querySelector('.ud-commercial-proof')?.textContent,
          merchant:context?.querySelector('.ud-merchant-kind')?.textContent,
          source:actions?.querySelector('.ud-source')?.getAttribute('href')
        };
      }));
    assert.equal(cards.length,52);
    for(const card of cards){
      assert.ok(card.headingBeforeEvidence&&card.evidenceBeforeExit,
        'Watch details must lead with the model, seller proof near merchant exits: '+card.id);
      assert.ok(card.evidence?.trim()&&card.merchant?.trim()&&card.source?.startsWith('https://'),
        'Source and seller transparency must remain visible on '+card.id);
    }


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
        const validWidths=width<=420?[240,480,720,960]:[240,480];
        assert.ok(validWidths.some(w=>selected==='/assets/popular-responsive/'+id+'-'+w+'.webp'),
          'Chromium used an unrelated or full-size original watch image for '+id+': '+selected);
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

    // Browser-sized lazy images follow the actual layout selected by the
    // shopper: one-column Android large mode or desktop four-column grid.
    const photo=page.locator('#modele-casio-mdv107 .ud-photo img');
    const sizes=await photo.getAttribute('sizes');
    assert.ok(sizes?.startsWith('auto, ')&&
      sizes.includes('(max-width: 420px) 90vw')&&
      sizes.includes('(max-width: 650px) 46vw'),
      'Adaptive image sizes must support the Android gallery and compact fallback');
    const columns=await page.locator('#udGrid').evaluate(el=>
      getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width<=420?1:4,
      'Photo-first Android and compact desktop gallery must match image sizing');

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
