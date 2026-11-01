import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const load=p=>readFileSync(resolve(root,p),'utf8');
const catalogue=JSON.parse(load('site/selection-affiliation.json'));
const html=load('site/revue-photo.html');
const js=load('site/revue-photo.js');
const css=load('site/revue-photo.css');
assert.equal(catalogue.products.length,15);
const tiers={essential:0,signature:0,prestige:0};
for(const p of catalogue.products){
  tiers[p.tier]++;
  const photo=p.photoReview;
  assert.ok(photo,'Missing official photo research for '+p.id);
  assert.equal(photo.accuracy,'exact');
  assert.equal(photo.publicUsageApproved,true,'The site owner has explicitly authorized publication in this revision');
  assert.equal(photo.licence,'permission_declared_by_site_owner');
  assert.equal(photo.permissionDeclaration,'site_owner_explicit_confirmation_2026-10-30');
  assert.equal(photo.permissionIndependentlyVerified,false,'Do not invent third-party proof');
  assert.equal(p.photoRights,'permission_declared_by_site_owner');
  assert.equal(p.imageMode,'manufacturer_product_photo','User-declared authorized photos should be served');
  for(const field of ['url','source']){
    const url=new URL(photo[field]);
    assert.equal(url.protocol,'https:');
    assert.ok(url.hostname && !url.username && !url.password);
  }
}
assert.deepEqual(tiers,{essential:6,signature:6,prestige:3});
assert.match(html,/name="robots" content="noindex,nofollow"/);
assert.match(html,/id="photoGrid"/);
assert.match(html,/id="photoDialog"/);
assert.match(html,/non autoris/i);
assert.match(js,/photo\.publicUsageApproved!==false/);
assert.match(js,/img\.src=p\.photoReview\.url/);
assert.match(js,/img\.onerror=/);
assert.match(js,/\.textContent=content/);
assert.doesNotMatch(js,/innerHTML\s*=/);
assert.match(css,/@media\(max-width:620px\)/);
// A manufacturer's product page is not a right to hotlink images or
// proof of a transferable image licence. This site must serve reviewed
// original local WebP bytes or its own illustration, never a remote fallback.
for(const path of ['site/affiliation.js','site/fiche.js','site/photo-zoom.js','site/editorial-photo.js']){
  const source=load(path);
  assert.doesNotMatch(source,/\b(?:t|photo|review)\.url\b/,'Public photo client must not read a remote research photo URL: '+path);
}
const photoZoom=load('site/photo-zoom.js');
assert.match(photoZoom,/\['\.\/assets\/watches\/'\+p\.id\+'\.webp'/,
  'The zoom viewer must accept only an ID-matched local core photo');
assert.match(photoZoom,/'\.\/assets\/watches-popular\/'\+p\.id\+'\.webp'/,
  'Supplemental zoom must use only ID-matched local merchant photos, never arbitrary external URLs');
assert.match(photoZoom,/allowed\.includes\(t\.localUrl\)/,
  'A signed-off exact local path must be required before loading any photo');
assert.match(photoZoom,/\^\[a-z0-9-\]\{4,64\}\$/,
  'The viewer must reject invalid product path identifiers');
assert.match(load('site/fiche.js'),/if\(img\.hasAttribute\('srcset'\)\)/,'Missing responsive photo must fall back to the approved original');
const storefront=load('site/affiliation.html');
const storefrontJs=load('site/affiliation.js');
assert.match(storefront,/id="affBrand"/,'Brand filter must be available in collection');
assert.match(storefrontJs,/new Set\(data\.map\(p=>p\.brand\)\)/,'Brand options must derive from the catalogue');
assert.match(storefrontJs,/brand==='all'\|\|p\.brand===brand/,'Brand filtering must combine with other criteria');
assert.match(storefrontJs,/brand='all';diameter='all';query=''/,'Reset must clear brand and diameter filters');
assert.match(storefront,/id="affDiameter"/,'Documented watch diameter filter must be available');
assert.match(storefrontJs,/matchesDiameter\(p\)/,'Diameter must combine with brand and movement');
assert.match(storefrontJs,/if\(key==='diameter'\)/,'Active chip must clear diameter filter');
assert.match(storefront,/id="affActiveFilters"/,'Active filter chip region must be present');
assert.match(storefrontJs,/function renderActiveFilters\(\)/,'Filter chips must be rendered');
assert.match(storefrontJs,/if\(key==='brand'\)/,'Removing brand chip must reset brand selector');
assert.match(storefrontJs,/if\(key==='movement'\)/,'Removing movement chip must reset movement selector');
assert.match(storefrontJs,/if\(key==='query'\)/,'Removing search chip must clear the query');
assert.match(storefrontJs,/renderActiveFilters\(\);renderRecentlyViewed\(\);empty\.hidden/,'Chips and recent history must update on each catalogue render');
console.log('Photo source review: 15 source packshots, owner-declared permissions and honest evidence provenance — OK');
