import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const site = resolve(process.cwd(), 'site');
const origin = 'https://atelier-montres-selection-fr.onrender.com';
const read = path => readFileSync(resolve(site, path), 'utf8');

for (const [file, route] of [
  ['index.html', '/'],
  ['conseiller.html', '/conseiller.html'],
  ['affiliation.html', '/affiliation.html'],
]) {
  const html = read(file);
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, file + ': missing head');
  const url = origin + route;
  assert.equal((head.match(/rel="canonical"/g) || []).length, 1,
    file + ': exactly one canonical');
  assert.ok(head.includes('<link rel="canonical" href="' + url + '">'),
    file + ': canonical URL must be the deployed absolute URL');
  assert.ok(head.includes('<meta property="og:url" content="' + url + '">'),
    file + ': OG URL must match the canonical URL');
  assert.match(head, /<meta name="robots" content="index,follow(?:,[^"]*)?">/,
    file + ': public landing must be indexable');
  assert.match(head, /<meta name="description" content="[^"]{80,}">/,
    file + ': meaningful search description required');
  for (const property of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description']) {
    assert.ok(head.includes('<meta property="' + property + '" content="'),
      file + ': missing ' + property);
  }
}

// The customer homepage must link to indexable, server-rendered product pages.
// The interactive JS-only detail remains reachable from each canonical product page.
const home = read('index.html');
const featuredModels = [
  'casio-mtp-1302', 'casio-mdv107', 'citizen-tsuyosa',
  'seiko-5', 'tissot-prx-auto', 'hamilton-khaki'
];
assert.ok(!home.includes('href="./montre.html?id='),
  'Homepage must not link to noindex JS-only product detail pages');
for (const id of featuredModels) {
  const canonical = './montres/' + id + '.html';
  assert.ok(home.includes('href="' + canonical + '"'),
    'Missing canonical product landing link for ' + id);
}
assert.match(home, /<a class="home-hero-visual" href="\.\/montres\/citizen-tsuyosa\.html">/,
  'Hero must lead to the crawlable Citizen Tsuyosa detail page');

assert.ok(home.includes('href="./montres/toutes-les-montres.html?tier=essential#udCount" class="home-choice"'),
  'Budget guidance must open the actual filtered 52-watch catalogue');
assert.ok(!home.includes('affiliation.html#selection-accessible'),
  'Homepage must not send shoppers to the removed 15-watch budget anchor');

const adviser = read('conseiller.html');
assert.match(adviser, /<noscript>[\s\S]*?href="\.\/montres\/toutes-les-montres\.html"[\s\S]*?<\/noscript>/,
  'Advisor needs a working JS-free route to the 52 watches');

const affiliate = read('affiliation.html');
for (const obsolete of [
  'ACHAT DIRECT · QUAND DISPONIBLE',
  'Commander sur Atelier Montres.',
  'Si un bouton « Acheter sur Atelier Montres » apparaît',
  'Un achat direct n’est proposé sur Atelier Montres',
]) {
  assert.ok(!affiliate.includes(obsolete), 'Inactive checkout must not be marketed: ' + obsolete);
}
assert.match(affiliate, /n’encaisse actuellement aucun paiement/,
  'Prominent merchant disclosure must describe actual payment state');
assert.match(affiliate, /ne prend pas de commande/,
  'Editorial purchasing guide must not imply live direct sale');

const config = JSON.parse(read('config.json'));
assert.equal(config.checkoutMode, 'inactive', 'Storefront must remain in safe no-checkout mode');

console.log('OK: 3 indexable landing pages, advisor no-JS route, clear third-party purchase wording');
