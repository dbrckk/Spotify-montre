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
const baseCss = readFileSync(resolve(root, 'base.css'), 'utf8');
assert.match(baseCss, /prefers-reduced-motion/, 'Reduced motion rules required');
assert.match(baseCss, /\[hidden\]\{display:none!important\}/, 'Hidden state CSS required');
assert.match(markup, /href="\.\/affiliation\.html#montres"/, 'Main site must link to the 15 actual watch listings');
assert.doesNotMatch(markup, /squareLink|storeState|Square Online/, 'No outbound checkout in current customer experience');
assert.match(markup, /Aucune commande n'est encore acceptée/, 'Prelaunch should state no orders');
assert.equal(typeof config,'object');
assert.ok(['prelaunch','open'].includes(config.status), 'Valid commerce status');
assert.ok(['inactive','embedded'].includes(config.checkoutMode), 'Offsite checkout is prohibited');
assert.ok(!('squareStoreUrl' in config), 'Remove old outbound purchase URL');
if(config.status === 'prelaunch') assert.equal(config.checkoutMode,'inactive','Prelaunch checkout must be inactive');
for (const id of ['accueil', 'collection', 'approche', 'informations']) {
  assert.match(markup, new RegExp('id="' + id + '"'), 'Missing section: ' + id);
}

const stylesheet = readFileSync(resolve(root, 'features.css'), 'utf8');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');
const privacy = readFileSync(resolve(root, 'confidentialite.html'), 'utf8');
const favicon = readFileSync(resolve(root, 'favicon.svg'), 'utf8');

for (const id of ['inspirations','faq','newsletter','chatLauncher','chatPanel','chatHistory','chatInput','chatForm','newsletterComing','newsletterCta']) {
  assert.match(markup, new RegExp('id="' + id + '"'), 'Missing interactive feature: ' + id);
}
for (const name of ['features.css','app.js','confidentialite.html','favicon.svg']) {
  assert.ok(markup.includes('./' + name), 'Missing linked asset: ' + name);
}
assert.match(markup, /<details>/, 'FAQ must be native and accessible');
assert.match(markup, /role="log"/, 'Chat must expose an accessible conversation log');
assert.match(markup, /aria-expanded="false"/, 'Chat must start collapsed');
assert.match(markup, /id="newsletterCta"[^>]* hidden/, 'Newsletter signup must remain disabled without provider');
assert.match(stylesheet, /@media\(max-width:680px\)/, 'Newsletter and chatbot must be responsive');
assert.match(stylesheet, /prefers-reduced-motion:reduce/, 'Animations must respect reduced motion');
assert.match(app, /new URL\(urlValue\)/, 'Newsletter URL must be validated');
assert.match(app, /host\.endsWith\('\.sibforms\.com'\)/, 'Provider host allowlist required');
assert.match(app, /line\.textContent = message/, 'Chat must render input via safe textContent');
assert.doesNotMatch(app, /innerHTML\s*=/, 'Chat must not use HTML injection');
assert.match(app, /panel\.hidden = false/, 'Chat open handler missing');
assert.match(app, /panel\.hidden = true/, 'Chat close handler missing');
assert.match(privacy, /Aucune adresse e-mail n'est actuellement collectée/, 'Newsletter transparency required');
assert.match(favicon, /<svg /, 'Brand SVG favicon missing');
assert.ok(Object.prototype.hasOwnProperty.call(config,'newsletterUrl'), 'Newsletter configuration must exist');
if (config.newsletterUrl !== null) {
  assert.equal(typeof config.newsletterUrl,'string');
  const provider = new URL(config.newsletterUrl);
  const host = provider.hostname.toLowerCase();
  assert.equal(provider.protocol,'https:','Only HTTPS newsletter providers');
  assert.ok(['brevo.com','sibforms.com','buttondown.com'].some((base) => host === base || host.endsWith('.'+base)), 'Unapproved newsletter provider');
} else assert.equal(config.status,'prelaunch','Disable signup only for prelaunch state or configure approved provider');


// Watch-style selector stays informational; it is not a fake shopping checkout.
const selector = readFileSync(resolve(root, 'selection.html'), 'utf8');
const selectorCss = readFileSync(resolve(root, 'selection.css'), 'utf8');
const selectorJs = readFileSync(resolve(root, 'selection.js'), 'utf8');
assert.match(markup, /href="\.\/selection\.html"/, 'Main site must link to watch selector');
assert.match(selector, /id="styleGrid"/, 'Style selector is missing its grid');
assert.match(selector, /id="copyFav"/, 'Style shortlist must be shareable');
assert.match(selector, /VISUELS?/i, 'Concept nature should be disclosed in selector');
assert.match(selector, /Tous les visuels sont des concepts, non des produits disponibles/i, 'Do not imply that concepts are available products');
assert.match(selector, /<script src="\.\/selection\.js" defer><\/script>/, 'Selector script should defer');
assert.match(selectorCss, /@media\(max-width:620px\)/, 'Selector mobile layout missing');
assert.match(selectorJs, /localStorage\.setItem/, 'Favourite shortlist should be local-only');
assert.match(selectorJs, /\.textContent\s*=/, 'Use safe text nodes for data');
assert.doesNotMatch(selectorJs, /innerHTML\s*=/, 'Never interpolate HTML from products or users');
assert.doesNotMatch(selectorJs, /fetch\s*\(/, 'Concept selector should not send data anywhere');
assert.doesNotMatch(selector, /type="submit"|paiement sécurisé|Ajouter au panier/, 'Do not present an unavailable checkout');

console.log('Free storefront checks OK: prelaunch safety, layout, Square checkout gating, config.');
