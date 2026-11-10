import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=(p)=>readFileSync(resolve(root,p),'utf8');
const products=JSON.parse(load('site/catalogue.json'));
const config=JSON.parse(load('site/config.json'));
const registry=JSON.parse(load('research/fournisseurs-candidats.json'));
const markup=load('site/catalogue.html');
const css=load('site/catalogue.css');
const code=load('site/catalogue.js');
assert.equal(products.version,1);
assert.equal(products.currency,'EUR');
assert.ok(['open','prelaunch'].includes(products.storefrontMode));
assert.ok(Array.isArray(products.products));
assert.equal(config.checkoutMode,'inactive','No live embedded checkout without payment backend');
assert.equal(config.status,'prelaunch','Prelaunch must remain off while no store account connected');
assert.equal(products.storefrontMode,'prelaunch');
assert.equal(products.products.length,0,'No products can be promoted before supplier compliance review');
assert.equal(registry.version,1);
assert.equal(registry.maxTargetLandedCostEur,20);
assert.ok(registry.candidates.length>=3);
for(const c of registry.candidates) {
 assert.equal(c.status,'research_only');
 assert.ok(c.id && c.model && c.supplier);
 assert.ok(c.price?.from>0 && c.price?.to>=c.price?.from);
 assert.ok(c.minimumOrderQuantity>=1);
 assert.ok(c.price.currency==='EUR'||c.price.currency==='USD');
 assert.ok(new URL(c.sourceUrl).protocol==='https:');
 assert.ok(Array.isArray(c.issues) && c.issues.length>=3);
 assert.ok(!c.sellingPrice && !c.approved && !c.inventory);
}
// The legacy supplier-catalogue URL must guide public visitors into the
// actual 52-model editorial collection, even with JavaScript disabled.
assert.match(markup,/<meta name="robots" content="noindex,follow">/,
  'Legacy commerce route must not compete in search but its links remain followable');
assert.match(markup,/<a class="button" href="\.\/montres\/toutes-les-montres\.html">Explorer les 52 montres/,
  'An above-fold direct route to the 52 real references is mandatory');
assert.match(markup,/Les achats se font auprès des vendeurs indiqués/,
  'No implication of direct payment while checkout is inactive');
assert.match(markup,/href="\.\/acheter\.html#amPartnerSelection">Les vendeurs/,
  'Show the real public vendor route, not the disabled checkout');
assert.doesNotMatch(markup,/href="\.\/index\.html#newsletter"/,
  'Never link shoppers to a hidden, unimplemented newsletter');
assert.match(css,/catalogue-legacy \.navigation a/,
  'Android legacy route needs accessible 44px navigation targets');
assert.match(markup,/id="catalogEmpty"[^>]* hidden/);
assert.match(markup,/id="catalogError"[^>]* hidden/);
assert.match(markup,/src="\.\/catalogue\.js" defer/);
assert.match(markup,/aucune commande n'est acceptée/i);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(code,/catalogue\.products\.filter\(validItem\)/);
assert.match(code,/p\.complianceReviewed !== true/);
assert.match(code,/p\.imageRightsConfirmed !== true/);
assert.match(code,/config\?\.checkoutMode !== 'embedded'/);
assert.match(code,/storefrontMode !== 'open'/);
assert.match(code,/\.textContent = content/);
assert.doesNotMatch(code,/innerHTML|window\.location\.assign|window\.open\(/,'No unsafe HTML or external redirect');
console.log('Supplier evidence registry and fail-closed on-site catalogue validation — OK');
