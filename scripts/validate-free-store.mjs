import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..', 'site');
const markup = readFileSync(resolve(root, 'index.html'), 'utf8');
const config = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8'));

assert.match(markup, /^<!doctype html>/i, 'Valid HTML doctype required');
assert.match(markup, /<html lang="fr">/i, 'French document language required');
assert.match(markup, /name="viewport"/, 'Responsive viewport required');
assert.match(markup, /id="contenu"/, 'Main landmark anchor required');
assert.match(markup, /aria-label="Navigation principale"/, 'Navigation should be labelled');
assert.match(markup, /prefers-reduced-motion/, 'Reduced motion rules required');
assert.match(markup, /\[hidden\]\{display:none!important\}/, 'Hidden state CSS required');
assert.match(markup, /fetch\('\.\/config\.json'/, 'Configuration should be loaded from local JSON');
assert.match(markup, /config\.status !== 'open'/, 'Unverified store must fail closed');
assert.match(markup, /url\.protocol !== 'https:'/, 'Payment storefront must use HTTPS');
assert.match(markup, /host\.endsWith\('\.square\.site'\)/, 'Square storefront host validation is required');
assert.match(markup, /id="storeState" hidden/, 'Checkout must be hidden by default');
assert.match(markup, /Aucune commande n'est encore acceptée/, 'Prelaunch should state no orders');
assert.equal(typeof config, 'object', 'Config must be JSON object');
assert.ok(['prelaunch', 'open'].includes(config.status), 'Status must be prelaunch or open');
if (config.status === 'open') {
  assert.ok(typeof config.squareStoreUrl === 'string', 'Live store needs verified Square URL');
  const url = new URL(config.squareStoreUrl);
  assert.equal(url.protocol, 'https:');
  assert.ok(url.hostname === 'square.site' || url.hostname.endsWith('.square.site'));
} else {
  assert.equal(config.squareStoreUrl, null, 'Prelaunch must not expose payment URL');
}
for (const id of ['accueil', 'collection', 'approche', 'informations']) {
  assert.match(markup, new RegExp('id="' + id + '"'), 'Missing section: ' + id);
}
console.log('Free storefront checks OK: prelaunch safety, layout, Square checkout gating, config.');
