import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

// Review *every* generated indexable page plus the site's nonindex flows.
// All URLs resolve to the built local storefront; no remote resources required.
const site=resolve('site');
const manifest=JSON.parse(readFileSync(resolve(site,'seo-manifest.json'),'utf8'));
const generated=manifest.paths.map(url=>new URL(url).pathname);
const extras=readdirSync(site).filter(name=>name.endsWith('.html')&&!/^google[a-f0-9]+\.html$/i.test(name)).map(name=>'/'+name);
const paths=[...new Set([...generated,...extras,'/montre.html?id=citizen-tsuyosa'])].sort();
const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
const origin=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const strict=process.env.A11Y_ENFORCE==='1';
const browser=await chromium.launch({headless:true});
const entries=[];
const violations=[];
const unresolved=[];
const interactionChecks=[];
const record=(viewport,check)=>interactionChecks.push({viewport,check,passed:true});
mkdirSync('artifacts',{recursive:true});
async function assertModalFocus(page,selector,viewport,check){
  const snapshot=await page.evaluate(selector=>{
    const modal=document.querySelector(selector);
    const active=document.activeElement;
    return {open:modal?.open===true,inside:!!modal?.contains(active),active:active?.outerHTML.slice(0,170)};
  },selector);
  assert.ok(snapshot.open&&snapshot.inside,viewport+' '+check+' focus escaped modal: '+JSON.stringify(snapshot));
  record(viewport,check);
}
async function checkKeyboardJourney(page,label){
  const compare=page.locator('#affCompareDialog');
  const compareTrigger=page.locator('#affCompareOpen');
  const boxes=page.locator('#affGrid .am-compare-check input');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await compareTrigger.focus();
  await page.keyboard.press('Enter');
  await compare.waitFor({state:'visible'});
  await assertModalFocus(page,'#affCompareDialog',label,'compare opened from keyboard');
  for(let i=0;i<8;i++){
    await page.keyboard.press('Tab');
    await assertModalFocus(page,'#affCompareDialog',label,'modal trap Tab '+(i+1));
  }
  const toggle=page.locator('#affCompareOnlyDiff');
  await toggle.focus();
  await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'),'true',label+' Space should toggle differences');
  record(label,'differences keyboard Space');
  await scan(page,label+' /#differences-only-keyboard');
  await toggle.focus();
  await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  if(label==='mobile'){
    const track=page.locator('.am-compare-mobile-track');
    await track.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.querySelector('.am-compare-mobile-position')?.textContent?.trim()==='2 / 2');
    record(label,'comparison carousel keyboard ArrowRight');
    await track.focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(()=>document.querySelector('.am-compare-mobile-position')?.textContent?.trim()==='1 / 2');
    record(label,'comparison carousel keyboard ArrowLeft');
  }
  await toggle.focus();
  await page.keyboard.press('Escape');
  await compare.waitFor({state:'hidden'});
  assert.ok(await compareTrigger.evaluate(el=>document.activeElement===el),label+' Escape must return focus to comparison trigger');
  record(label,'compare Escape and trigger focus return');
  // Replacement dialog must leave the full selection intact on Escape.
  await boxes.nth(2).check();
  const currentSelection=await page.evaluate(()=>sessionStorage.getItem('atelier-montres-comparison-v1'));
  // With three occupied slots the fourth checkbox intentionally reverts
  // to unchecked while the replacement modal opens: use click, not check().
  await boxes.nth(3).click();
  assert.equal(await boxes.nth(3).isChecked(),false,'Fourth watch must not be added without replacement');
  const replacement=page.locator('#affCompareReplaceDialog');
  await replacement.waitFor({state:'visible'});
  await assertModalFocus(page,'#affCompareReplaceDialog',label,'replacement focus initialized');
  await page.keyboard.press('Escape');
  await replacement.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('atelier-montres-comparison-v1')),currentSelection,label+' cancelling replacement must preserve selection');
  record(label,'replacement Escape keeps all 3 models');
  // Real photographic modal uses the same native keyboard semantics.
  const enlarge=page.locator('#affGrid .aff-photo-expand').first();
  await enlarge.scrollIntoViewIfNeeded();
  await enlarge.focus();
  await page.keyboard.press('Enter');
  await page.locator('#amPhotoDialog').waitFor({state:'visible'});
  await assertModalFocus(page,'#amPhotoDialog',label,'photo dialog keyboard open');
  await page.keyboard.press('Escape');
  await page.locator('#amPhotoDialog').waitFor({state:'hidden'});
  assert.ok(await enlarge.evaluate(el=>document.activeElement===el),label+' photo Escape must restore focus');
  record(label,'photo Escape and focus return');
}

async function scan(page,name){
  const result=await new AxeBuilder({page}).withTags(tags).analyze();
  const unique=result.violations.map(v=>({
    id:v.id,impact:v.impact,description:v.help,helpUrl:v.helpUrl,
    selectors:v.nodes.slice(0,7).map(n=>n.target.join(' ')),
    count:v.nodes.length
  }));
  entries.push({name,checked:result.passes.length,violations:unique});
  for(const entry of unique)violations.push({page:name,...entry});
}
try{
  for(const viewport of [{width:393,height:852,label:'mobile'},{width:1366,height:900,label:'desktop'}]){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},
      isMobile:viewport.width<600,hasTouch:viewport.width<600,locale:'fr-FR',reducedMotion:'reduce'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    for(const path of paths){
      const url=new URL(path,origin);
      let response;
      try{
        response=await page.goto(url.href,{waitUntil:'load',timeout:20000});
        if(!response?.ok()){unresolved.push({page:path,status:response?.status()});continue}
        if(path==='/'||path==='/index.html'||path==='/affiliation.html')await page.locator('#affGrid .aff-card').first().waitFor({state:'visible'});
        if(path.includes('montre.html?id='))await page.locator('#detailShell').waitFor({state:'visible'});
        await scan(page,viewport.label+' '+path);
        if(path==='/'){
          // The very first keyboard stop should become visibly focused.
          await page.keyboard.press('Tab');
          const skip=await page.locator('a.sr-only[href="#contenu"]').first().evaluate(el=>{
            const rect=el.getBoundingClientRect();return {focused:document.activeElement===el,width:rect.width,height:rect.height}
          });
          assert.ok(skip.focused&&skip.width>=100&&skip.height>=30,'Keyboard skip-link must be visibly accessible: '+JSON.stringify(skip));
          // Audit modal content and real Tab / Enter / Escape journeys.
          await checkKeyboardJourney(page,viewport.label);
          if(viewport.label==='mobile'){
            const menu=page.locator('details.am-mobile-nav').first();
            await menu.locator('summary').focus();
            await page.keyboard.press('Enter');
            assert.ok(await menu.evaluate(el=>el.open),'Mobile menu must open with Enter');
            await scan(page,viewport.label+' /#mobile-menu-open');
            record(viewport.label,'mobile navigation opens with Enter');
          }
        }
      }catch(err){unresolved.push({page:viewport.label+' '+path,error:String(err).slice(0,300)})}
    }
    await context.close();
  }
}finally{await browser.close()}
const report={
  auditedAt:new Date().toISOString(),scans:entries.length,totalPages:paths.length,
  violationInstances:violations.length,interactionChecks,unresolved,violations,entries
};
writeFileSync('artifacts/accessibility-wcag-report.json',JSON.stringify(report,null,2));
const summary=new Map();
for(const v of violations){
 const k=v.id+' '+v.impact;
 const group=summary.get(k)||{count:0,pages:new Set(),samples:[]};
 group.count+=v.count;group.pages.add(v.page);
 if(group.samples.length<4)group.samples.push(v.page+' :: '+v.selectors.slice(0,2).join(' | '));
 summary.set(k,group);
}
console.log('WCAG automated audit:',JSON.stringify({
 paths:paths.length,scans:entries.length,violationTypes:summary.size,
 totalViolations:violations.length,keyboardChecks:interactionChecks.length,unresolved:unresolved.length
}));
for(const [id,v] of [...summary].sort((a,b)=>b[1].count-a[1].count)){
 console.log('AXE',id,'elements='+v.count,'screens='+v.pages.size,JSON.stringify(v.samples));
}
for(const e of unresolved.slice(0,12))console.log('UNRESOLVED',JSON.stringify(e));
if(strict&&interactionChecks.length<25)throw Error('Keyboard coverage incomplete: '+interactionChecks.length);
if(strict&&violations.length)throw Error(violations.length+' WCAG rule/screen failures; inspect artifacts/accessibility-wcag-report.json');
if(strict&&unresolved.length)throw Error(unresolved.length+' screens could not be audited');
