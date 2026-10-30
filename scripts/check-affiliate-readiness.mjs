import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateAffiliateConfig} from './affiliate-policy.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../site/'+p,import.meta.url),'utf8'));
const data=read('selection-affiliation.json'), config=read('affiliate-links.json');
const actual=validateAffiliateConfig(config,data.products.map(p=>p.id));
assert.equal(actual.enabled,config.enabled);
assert.equal(actual.links.size,Object.keys(config.links).length);
if(!config.enabled) assert.equal(actual.links.size,0,'The default storefront has no active partner links');
assert.equal(data.affiliateEnabled,false,'The old catalogue must remain non-commissionable');
const base={version:1,enabled:true,approved:true,amazonPartnerTag:'example-21',links:{'citizen-tsuyosa':{provider:'amazon.fr',asin:'B012345678',url:'https://www.amazon.fr/dp/B012345678?tag=example-21',verifiedAt:'2026-10-30',productMatchConfirmed:true,linkApproved:true}}};
const ok=validateAffiliateConfig(base,data.products.map(p=>p.id));
assert.equal(ok.links.get('citizen-tsuyosa').url,'https://www.amazon.fr/dp/B012345678?tag=example-21');
const provisional=structuredClone(base);
provisional.approved=false;
provisional.enrollmentStatus='registered_pending_review';
provisional.ownerConfirmedEnrollment=true;
provisional.specialLinksCreatedInAccount=true;
const started=validateAffiliateConfig(provisional,data.products.map(p=>p.id));
assert.equal(started.enabled,true,'Provisional Amazon enrollee must be able to create the first qualifying sales');
assert.equal(started.approved,false,'Do not falsely declare final Amazon approval');
assert.equal(started.enrollmentStatus,'registered_pending_review');
assert.equal(started.links.size,1);
for(const invalid of [
 {...provisional,ownerConfirmedEnrollment:false},
 {...provisional,specialLinksCreatedInAccount:false},
 {...provisional,enrollmentStatus:'not_registered'},
 {...provisional,approved:true},
]){
 assert.throws(()=>validateAffiliateConfig(invalid,data.products.map(p=>p.id)),/Affiliate config rejected/,'Unverified or contradictory application state must fail');
}

function reject(changes,mutate) { const c=structuredClone(base);Object.assign(c,changes);mutate?.(c);assert.throws(()=>validateAffiliateConfig(c,data.products.map(p=>p.id)),/Affiliate config rejected/); }
reject({approved:false});
reject({amazonPartnerTag:'random-20'});
reject({},c=>c.links['citizen-tsuyosa'].url='https://www.amazon.fr.evil.invalid/dp/B012345678?tag=example-21');
reject({},c=>c.links['citizen-tsuyosa'].url='https://www.amazon.fr/dp/B012345678?tag=wrong-21');
reject({},c=>c.links['citizen-tsuyosa'].url='https://www.amazon.fr/dp/B012345679?tag=example-21');
reject({},c=>c.links['citizen-tsuyosa'].productMatchConfirmed=false);
reject({},c=>c.links['citizen-tsuyosa'].linkApproved=false);
reject({},c=>c.links['unknown-watch']=c.links['citizen-tsuyosa']);
reject({},c=>c.links['citizen-tsuyosa'].url='https://www.amazon.fr/dp/B012345678?tag=example-21&subtag=visitor42');
console.log('Amazon partner activation guardrails OK: 9 negative cases, links disabled by default');
