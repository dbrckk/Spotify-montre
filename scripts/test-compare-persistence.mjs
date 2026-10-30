import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Functional Android journey: choose two watches, inspect one, return, reload, clear.
const base=process.env.WATCH_STOREFRONT_URL||'http://127.0.0.1:8765';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,locale:'fr-FR'});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));

try {
  await page.goto(new URL('/affiliation.html',base).href,{waitUntil:'domcontentloaded',timeout:30000});
  const cards=page.locator('#affGrid .aff-card');
  await cards.first().waitFor({state:'visible',timeout:20000});
  assert.equal(await cards.count(),15,'All watches must be available');
  const tray=page.locator('#affCompareTray');
  const chat=page.locator('#chatPanel');
  assert.equal(await tray.evaluate(el=>getComputedStyle(el).display),'none','Comparison dock must not obstruct the empty catalogue');
  assert.equal(await chat.evaluate(el=>getComputedStyle(el).display),'none','Chat assistant must be dismissed by default');
  await page.locator('#chatLauncher').click();
  assert.equal(await chat.isVisible(),true,'Visitor can open the assistant');
  await page.locator('#chatClose').click();
  assert.equal(await chat.evaluate(el=>getComputedStyle(el).display),'none','Closing the assistant must hide it');

  await cards.nth(0).locator('.am-compare-check input').check();
  await cards.nth(1).locator('.am-compare-check input').check();
  assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2);
  const ids=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atelier-montres-comparison-v1')||'[]'));
  assert.equal(ids.length,2,'Comparison must persist for the current tab');

  await cards.first().locator('.aff-card-actions a[href^="./montre.html?id="]').click();
  await page.locator('#detailShell').waitFor({state:'visible',timeout:20000});
  const link=await page.locator('#detailCompare').getAttribute('href');
  const selectedFromDetail=new URL(link,page.url()).searchParams.get('compare')?.split(',');
  assert.deepEqual(selectedFromDetail,ids,'Product page must preserve all selected watches');

  await page.locator('#detailCompare').click();
  await page.locator('#affCompareTray').waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2);
  if(await page.locator('#affCompareDialog').isVisible())await page.locator('#affCompareClose').click();

  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#affCompareTray').waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),2,'Reload restores comparison');
  if(await page.locator('#affCompareDialog').isVisible())await page.locator('#affCompareClose').click();

  await page.locator('#affCompareClear').click();
  assert.equal(await tray.evaluate(el=>getComputedStyle(el).display),'none','Clearing selection must hide the floating dock');
  assert.equal(new URL(page.url()).searchParams.has('compare'),false,'Clearing comparison also clears URL deep-link state');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('atelier-montres-comparison-v1')),null,'Clear removes stored selection');
  await page.reload({waitUntil:'domcontentloaded'});
  await cards.first().waitFor({state:'visible',timeout:20000});
  assert.equal(await page.locator('#affCompareSelected .am-compare-selected-chip').count(),0,'Cleared comparison stays empty');
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('PASS: Android comparison selection survives product navigation and reload, and clears permanently');
} finally {
  await browser.close();
}
