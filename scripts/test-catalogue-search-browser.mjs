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
    // Browser-share is stubbed for a deterministic test: no external app or
    // merchant is opened and we can inspect the exact customer-facing URL.
    await page.addInitScript(()=>{
      Object.defineProperty(navigator,'share',{configurable:true,value:async({url})=>{
        window.__lastSharedCatalogueUrl=url;
      }});
    });
    await page.goto(new URL('/montres/toutes-les-montres.html',base).href,
      {waitUntil:'domcontentloaded'});
    await page.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await page.locator('.ud-card').count(),52);
    assert.equal(await page.locator('link[href="../watch-reference-copy.css"]').count(),1,
      'The 52-watch collection must use the cache-isolated reference-copy stylesheet');
    assert.equal(await page.locator('script[src="../watch-reference-copy-v2.js"]').count(),1);
    assert.equal(await page.locator('.ud-card [data-watch-ref-tools]').count(),52);
    const allCopyButtons=page.locator('.ud-card button[data-watch-ref-copy]');
    assert.equal(await allCopyButtons.count(),52);
    for(const button of await allCopyButtons.all()){
      const card=button.locator('xpath=ancestor::article[1]');
      assert.equal(await button.getAttribute('data-watch-ref-copy'),await card.getAttribute('data-id'),
        'A reference-copy control cannot reference a different watch');
      assert.ok(await button.isVisible(),'Actual model reference must be copyable on supported browsers');
    }
    if(width===393){
      await page.evaluate(()=>{
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
          writeText:async text=>{window.__copiedWatchReference=text;}
        }});
      });
      const copyCard=page.locator('#modele-tissot-le-locle-white');
      await copyCard.locator('button[data-watch-ref-copy]').click();
      assert.equal(await page.evaluate(()=>window.__copiedWatchReference),
        'Tissot Le Locle T0064071103300',
        'The exact documented manufacturer reference must be copied, not a fabricated Amazon variant');
      assert.match(await copyCard.locator('[data-watch-ref-status]').innerText(),/Référence copiée/);
      assert.equal(await copyCard.locator('input[data-watch-ref-manual]').count(),0,
        'Successful clipboard writes must not show a manual field');
    }

    assert.equal(await page.locator('link[href="../unified-trust-markers.css"]').count(),1,
      'All catalogue pages must load the cache-independent confidence stylesheet');
    const markers=await page.locator('.ud-card').evaluateAll(cards=>cards.map(card=>({
      id:card.dataset.id,kind:card.dataset.merchant,
      marker:card.querySelector('.ud-card-main>.ud-trust-marker'),
      title:card.querySelector('h2')?.innerText
    })).map(x=>({id:x.id,kind:x.kind,text:x.marker?.textContent?.trim()||'',
      data:x.marker?.dataset.merchantConfidence||'',title:x.title})));
    const labels={
      direct:'Fiche Amazon associée',awin:'Variante partenaire associée',
      search:'Recherche Amazon uniquement',official:'Référence à vérifier à la source'
    };
    assert.equal(markers.length,52);
    for(const marker of markers){
      assert.equal(marker.data,marker.kind,'Confidence marker must use actual merchant kind: '+marker.id);
      assert.equal(marker.text,labels[marker.kind],
        'Buyer-facing merchant confidence cannot invent stock or an exact listing: '+marker.id);
      assert.doesNotMatch(marker.text,/disponible|livraison offerte|meilleur prix|en stock/i);
    }
    assert.equal(markers.filter(m=>m.kind==='direct').length,27,
      'Only the 27 documented exact Amazon references can carry the green marker');

    // A comparator redirect plus independent matching model evidence can
    // establish an ASIN destination, but never stock, price or a sale.
    for(const [id,asin,code] of [
      ['casio-la-20wh-4a1','B077YZHF21','LA-20WH-4A1EF'],
      ['tissot-gentleman-auto','B07XTVQ3W7','T1274071104100'],
      ['casio-dw5600rl-1','B0DN6LT6FX','DW-5600RL-1ER'],
      ['tissot-le-locle-white','B01N7FXE80','T0064071103300']
    ]){
      const card=page.locator('#modele-'+id);
      assert.equal(await card.getAttribute('data-merchant'),'direct',
        'Independently cross-checked Amazon.fr model must no longer be a generic search: '+id);
      const direct=card.locator('a[data-amazon-product="'+id+'"]');
      assert.equal(await direct.count(),1);
      const target=new URL(await direct.getAttribute('href'));
      assert.equal(target.origin,'https://www.amazon.fr');
      assert.equal(target.pathname,'/dp/'+asin);
      assert.deepEqual([...target.searchParams.keys()],['tag']);
      assert.equal(target.searchParams.get('tag'),'drackk04-21');
      assert.match(await direct.getAttribute('rel'),/\bsponsored\b/);
      assert.match(await card.locator('.ud-exact-variant').innerText(),new RegExp(code));
      assert.match(await card.locator('.ud-redirect-proof').innerText(),
        /page Amazon.fr non consultée directement/i);
      assert.equal(await card.locator('a[data-amazon-search-id]').count(),0);
    }
    for(const id of ['seiko-5-srpk29','citizen-promaster-bn0150','seiko-presage-srpe43','skmei-2056']){
      const card=page.locator('#modele-'+id);
      assert.notEqual(await card.getAttribute('data-merchant'),'direct',
        'Unverified or unavailable Amazon.fr evidence must never become an exact paid CTA: '+id);
      assert.equal(await card.locator('a[data-amazon-product]').count(),0);
    }

    // Customer-facing collections use the same exact source feed as the 52
    // cards. Editorial tiers are not silently passed off as price bands.
    const tierLinks=page.locator('.ud-tier-shortcuts [data-tier-shortcut]');
    assert.equal(await tierLinks.count(),3,'All three collections must be explorable');
    assert.match(await page.locator('.ud-tier-disclaimer').innerText(),
      /pas des fourchettes de prix/i);
    assert.ok(await page.locator('link[href="../unified-tier-finish.css"]').count()===1,
      'Premium catalogue requires its cache-independent stylesheet');
    let tierSum=0;
    for(const tier of ['essential','signature','prestige']){
      const count=await page.locator('.ud-card[data-tier="'+tier+'"]').count();
      assert.ok(count>0,'Empty collection: '+tier);
      tierSum+=count;
      const tierLink=page.locator('.ud-tier-shortcuts [data-tier-shortcut="'+tier+'"]');
      assert.equal(await tierLink.count(),1);
      assert.equal(await tierLink.getAttribute('href'),'?tier='+tier+'#udCount');
      assert.match(await tierLink.innerText(),new RegExp('\\b'+count+' modèle'));
    }
    assert.equal(tierSum,52,'Editorial tier totals must exactly cover 52 watches');
    assert.equal(await page.locator('.ud-card .ud-tier-pill').count(),52);
    for(const tier of ['essential','signature','prestige']){
      const actual=await page.locator('.ud-card[data-tier="'+tier+'"] .ud-tier-pill').first().innerText();
      assert.match(actual,/Gamme (Essentielle|Signature|Prestige)/);
    }
    if(width===393){
      const shortcut=page.locator('.ud-tier-shortcuts [data-tier-shortcut="signature"]');
      const firstShortcut=page.locator('.ud-tier-shortcuts [data-tier-shortcut="essential"]');
      const geometry=await firstShortcut.boundingBox();
      assert.ok(geometry&&geometry.width>=200&&geometry.height>=180&&
        geometry.x>=-1&&geometry.x+geometry.width<=width+1,
        'Editorial range shortcuts must fit a narrow Android viewport');
      const expected=await page.locator('.ud-card[data-tier="signature"]').count();
      await shortcut.click();
      await page.locator('#udFilters').waitFor({state:'visible'});
      assert.equal(new URL(page.url()).searchParams.get('tier'),'signature');
      assert.equal(await page.locator('.ud-card:visible').count(),expected);
      await page.goto(new URL('/montres/toutes-les-montres.html',base).href,
        {waitUntil:'domcontentloaded'});
      await page.locator('#udFilters').waitFor({state:'visible'});
    }


    // Buyer-facing merchant paths must count real source-backed destinations,
    // never merchant prices, unverified inventory or invented Awin offers.
    const pathLinks=page.locator('.ud-path-link[data-merchant-path]');
    assert.ok(await pathLinks.count()>=3,'The public merchant choices are hidden');
    assert.match(await page.locator('.ud-paths-disclosure').innerText(),
      /ne prouve ni stock ni prix actuel/i);
    assert.equal(await page.locator('link[href="../unified-shopper-paths.css"]').count(),1);
    const actualDestinations=await page.locator('.ud-card').evaluateAll(cards=>cards.reduce((map,card)=>{
      const kind=card.dataset.merchant;
      map[kind]=(map[kind]||0)+1;
      return map;
    },{}));
    const shortcutKinds=await pathLinks.evaluateAll(links=>links.map(link=>link.dataset.merchantPath));
    assert.deepEqual([...shortcutKinds].sort(),Object.keys(actualDestinations).sort(),
      'Merchant shortcuts must exist only for categories with actual documented watches');
    for(const kind of shortcutKinds){
      const item=page.locator('.ud-path-link[data-merchant-path="'+kind+'"]');
      assert.equal(await item.getAttribute('href'),'?merchant='+kind+'#udCount');
      const count=actualDestinations[kind];
      assert.ok(Number.isInteger(count)&&count>0);
      assert.match(await item.innerText(),new RegExp('\\b'+count+' référence'));
    }
    assert.equal(Object.values(actualDestinations).reduce((sum,n)=>sum+n,0),52);
    if(width===393){
      const firstPath=page.locator('.ud-path-link').first();
      const bounds=await firstPath.boundingBox();
      assert.ok(bounds&&bounds.width>=200&&bounds.height>=180&&
        bounds.x>=-1&&bounds.x+bounds.width<=width+1,
        'Buyer-facing merchant navigation must fit an Android viewport');
      await page.locator('.ud-path-link[data-merchant-path="direct"]').click();
      await page.locator('#udFilters').waitFor({state:'visible'});
      assert.equal(new URL(page.url()).searchParams.get('merchant'),'direct');
      assert.equal(await page.locator('.ud-card:visible').count(),actualDestinations.direct);
      assert.equal(await page.locator('.ud-card[data-merchant="direct"]:visible').count(),actualDestinations.direct);
      await page.goto(new URL('/montres/toutes-les-montres.html',base).href,
        {waitUntil:'domcontentloaded'});
      await page.locator('#udFilters').waitFor({state:'visible'});
      assert.equal(await page.locator('.ud-card:visible').count(),52);
    }

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
      const proof=popularPhotoProof[id];
      assert.ok(proof&&proof.width>480,'Featured watch must have exact-model photo evidence: '+id);
      // 720px and 960px are needed on high-density phones, but are only
      // exposed if smaller than the approved original and actually generated.
      for(const widthCandidate of [360,720,960]){
        const candidateExists=widthCandidate<proof.width&&existsSync(
          new URL('../site/assets/popular-responsive/'+id+'-'+widthCandidate+'.webp',import.meta.url));
        assert.equal(Boolean(srcset?.includes('popular-responsive/'+id+'-'+widthCandidate+'.webp '+widthCandidate+'w')),
          candidateExists,'Featured image descriptor must reflect verified generated asset: '+id+' '+widthCandidate);
      }
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
        const validWidths=width<=420?[240,360,480,720,960]:[240,360,480];
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

    if(width===393){
      await page.locator('#udSearch').fill('mdv107');
      const share=page.locator('#udShareSelection');
      assert.equal(await share.isVisible(),true,'Share action missing in the public catalogue');
      await share.click();
      const shared=await page.evaluate(()=>window.__lastSharedCatalogueUrl);
      const sharedUrl=new URL(shared);
      assert.equal(sharedUrl.pathname,'/montres/toutes-les-montres.html');
      assert.equal(sharedUrl.searchParams.get('q'),'mdv107');
      assert.equal(sharedUrl.hash,'#udCount');
      assert.equal(await page.locator('#udShareStatus').innerText(),'Sélection partagée.');

      // The link must reproduce the visible exact-reference search on another
      // visit, rather than sharing a generic catalogue page.
      await page.goto(shared,{waitUntil:'domcontentloaded'});
      await page.locator('#udFilters').waitFor({state:'visible'});
      assert.equal(await page.locator('.ud-card:visible').count(),1);
      assert.equal(await page.locator('#modele-casio-mdv107').isVisible(),true);

      // Native Share is not the only working route: copy the identical URL.
      await page.evaluate(()=>{
        Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
          writeText:async text=>{window.__copiedCatalogueUrl=text;}
        }});
      });
      await page.locator('#udShareSelection').click();
      assert.equal(await page.evaluate(()=>window.__copiedCatalogueUrl),shared);
      assert.equal(await page.locator('#udShareStatus').innerText(),'Lien de sélection copié.');

      // Favourites only exist in localStorage: they must not masquerade as
      // a portable selection and leak a broken saved=1 link.
      await page.locator('#udSavedToggle').click();
      await page.locator('#udShareSelection').click();
      assert.match(await page.locator('#udShareStatus').innerText(),/favoris restent sur cet appareil/);
      assert.equal(await page.evaluate(()=>window.__copiedCatalogueUrl),shared);
      await page.locator('#udSavedToggle').click();
      await page.locator('#udClearActiveFilters').click();
      assert.equal(await page.locator('.ud-card:visible').count(),52);
    }

    const size=await page.evaluate(()=>({
      width:document.documentElement.clientWidth,
      scroll:document.documentElement.scrollWidth
    }));
    assert.ok(size.scroll<=size.width+2,
      'Catalogue must not overflow at '+width+': '+JSON.stringify(size));
    await page.close();
  }

  // A shopper browsing the 52-model catalogue must be able to inspect a
  // product and return to the exact filtered results, not a generic homepage.
  // No extra URL parameters are appended to product canonicals.
  const returnContext=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,locale:'fr-FR'});
  const returnPage=await returnContext.newPage();
  const returnErrors=[];
  returnPage.on('pageerror',error=>returnErrors.push(error.message));
  try{
    await returnPage.goto(new URL('/montres/toutes-les-montres.html?q=skmei1251',base).href,
      {waitUntil:'domcontentloaded'});
    await returnPage.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await returnPage.locator('.ud-card:visible').count(),1);
    await returnPage.locator('#modele-skmei-1251 .ud-details').click();
    await returnPage.locator('.am-catalogue-return a').waitFor({state:'visible'});
    assert.equal(new URL(returnPage.url()).search,'',
      'SEO product URL must remain canonical, without copied filter parameters');
    const back=returnPage.locator('.am-catalogue-return a');
    assert.equal(new URL(await back.getAttribute('href')).searchParams.get('q'),'skmei1251');
    assert.equal(new URL(await back.getAttribute('href')).hash,'#udCount');
    const dimensions=await back.boundingBox();
    assert.ok(dimensions&&dimensions.height>=48&&dimensions.x>=0
      &&dimensions.x+dimensions.width<=393,'Return-to-selection link must fit Android');
    // Browse a genuinely related product and retain the original filter.
    await returnPage.locator('.am-extra-related-name').first().click();
    await returnPage.locator('.am-catalogue-return a').waitFor({state:'visible'});
    assert.equal(new URL(await returnPage.locator('.am-catalogue-return a')
      .getAttribute('href')).searchParams.get('q'),'skmei1251');
    await returnPage.locator('.am-catalogue-return a').click();
    await returnPage.locator('#udFilters').waitFor({state:'visible'});
    assert.equal(await returnPage.locator('.ud-card:visible').count(),1);
    assert.ok(await returnPage.locator('#modele-skmei-1251').isVisible());

    // A photographed core product must share this exact workflow.
    await returnPage.goto(new URL('/montres/toutes-les-montres.html?q=mdv107',base).href,
      {waitUntil:'domcontentloaded'});
    await returnPage.locator('#udFilters').waitFor({state:'visible'});
    await returnPage.locator('#modele-casio-mdv107 .ud-details').click();
    await returnPage.locator('.am-catalogue-return a').waitFor({state:'visible'});
    assert.equal(new URL(await returnPage.locator('.am-catalogue-return a')
      .getAttribute('href')).searchParams.get('q'),'mdv107');

    // All 52 SEO product pages embed the same tiny enhancement.
    const core=readFileSync('site/montres/casio-mdv107.html','utf8');
    const photoMissing=readFileSync('site/montres/casio-f91w-1.html','utf8');
    assert.match(core,/src="\.\.\/catalogue-return\.js"/);
    assert.match(photoMissing,/src="\.\.\/catalogue-return\.js"/);
    assert.deepEqual(returnErrors,[]);
  }finally{await returnContext.close();}

  // Direct SEO visits without a catalogue referrer do not claim the shopper
  // has a previous local selection.
  const directPage=await browser.newPage({viewport:{width:393,height:852}});
  try{
    await directPage.goto(new URL('/montres/casio-f91w-1.html',base).href,
      {waitUntil:'domcontentloaded'});
    assert.equal(await directPage.locator('.am-catalogue-return').count(),0);
  }finally{await directPage.close();}

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
