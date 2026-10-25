import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const text = (path) => {
  const absolute = resolve(root, path);
  assert.ok(existsSync(absolute), `Missing expected theme file: ${path}`);
  return readFileSync(absolute, 'utf8');
};

const rawTemplate = text('shopify/templates/index.json');
const template = JSON.parse(rawTemplate.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
assert.deepEqual(template.order, ['atelier'], 'Homepage should load Atelier section');
assert.equal(template.sections?.atelier?.type, 'atelier-landing');

const section = text('shopify/sections/atelier-landing.liquid');
const schemaBlock = section.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
assert.ok(schemaBlock, 'Liquid section is missing the schema block');
const schema = JSON.parse(schemaBlock[1].trim());
assert.ok(schema.name?.includes('Atelier'), 'The section name is missing');
assert.ok(Array.isArray(schema.settings), 'Section settings should be an array');

for (const setting of schema.settings) {
  assert.ok(setting.id && setting.type && setting.label, 'Each editor setting must have id, type, label');
}
assert.ok(section.includes("collections['all']"), 'Featured products should come from Shopify');
assert.ok(section.includes('atelier_collection.products_count > 0'), 'Empty catalogue must be handled');
assert.ok(section.includes('item.price | money'), 'Prices must come from Shopify');
assert.ok(section.includes('item.featured_image'), 'Product images must come from Shopify');
assert.ok(section.includes('image_tag:'), 'Product images should use Shopify responsive image tag');

const css = text('shopify/assets/atelier-montres.css');
assert.ok(section.includes("'atelier-montres.css' | asset_url"), 'Section should load CSS asset');
for (const selector of ['.atelier-hero', '.atelier-product-grid', '.atelier-empty']) {
  assert.ok(css.includes(selector), `Missing CSS selector: ${selector}`);
}
assert.ok(css.includes('@media(max-width:540px)'), 'Missing mobile responsive rules');
assert.ok(css.includes('prefers-reduced-motion'), 'Reduced-motion preference not handled');
for (const phrase of ['livraison gratuite garantie', '4,9/5', '1 000 avis clients']) {
  assert.ok(!section.toLowerCase().includes(phrase), 'Unverified marketing claim detected');
}

console.log('Shopify Atelier homepage files: JSON, Liquid schema, dynamic catalog, responsive CSS — OK');
