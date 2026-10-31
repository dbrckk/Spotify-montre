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
const extras=readdirSync(site).filter(name=>name.endsWith('.html')).map(name=>'/'+name);
const paths=[...new Set([...generated,...extras,'/montre.html?id=citizen-tsuyosa'])].sort();
const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
const origin=new URL(process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765');
assert.ok(origin.protocol==='https:'||(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)));
const strict=process.env.A11Y_ENFORCE==='1';
const browser=await chromium.launch({headless:true});
const entries=[];
const violations=[];
const unresolved=[];
mkdirSync('artifacts',{recursive:true});
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
          // A native HTML dialog is not in the accessibility tree before opening.
          const boxes=page.locator('#affGrid .am-compare-check input');
          await boxes.nth(0).check();await boxes.nth(1).check();
          await page.locator('#affCompareOpen').click();
          await page.locator('#affCompareDialog').waitFor({state:'visible'});
          await scan(page,viewport.label+' /#comparator-open');
          await page.locator('#affCompareOnlyDiff').click();
          await scan(page,viewport.label+' /#differences-only');
          await page.locator('#affCompareClose').click();
          if(viewport.label==='mobile'){
            const menu=page.locator('details.am-mobile-nav').first();
            await menu.locator('summary').click();
            await scan(page,viewport.label+' /#mobile-menu-open');
          }
        }
      }catch(err){unresolved.push({page:viewport.label+' '+path,error:String(err).slice(0,300)})}
    }
    await context.close();
  }
}finally{await browser.close()}
const report={
  auditedAt:new Date().toISOString(),scans:entries.length,totalPages:paths.length,
  violationInstances:violations.length,unresolved,violations,entries
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
 totalViolations:violations.length,unresolved:unresolved.length
}));
for(const [id,v] of [...summary].sort((a,b)=>b[1].count-a[1].count)){
 console.log('AXE',id,'elements='+v.count,'screens='+v.pages.size,JSON.stringify(v.samples));
}
for(const e of unresolved.slice(0,12))console.log('UNRESOLVED',JSON.stringify(e));
if(strict&&violations.length)throw Error(violations.length+' WCAG rule/screen failures; inspect artifacts/accessibility-wcag-report.json');
if(strict&&unresolved.length)throw Error(unresolved.length+' screens could not be audited');
