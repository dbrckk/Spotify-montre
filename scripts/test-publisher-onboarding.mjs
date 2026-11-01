import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {assessAwinPublisherReadiness} from './report-publisher-onboarding.mjs';

const root=resolve(import.meta.dirname,'..');
const state=assessAwinPublisherReadiness();
const checks=new Map(state.checks.map(x=>[x.id,x]));
assert.equal(checks.size,state.checks.length,'Each readiness condition has one unique name');
assert.deepEqual([...checks.keys()],['site','legal-link','host','editor','awin-account','aliexpress','addiesdive']);
assert.equal(checks.get('site').pass,true,'Source catalogue must contain 52 known models');
assert.equal(checks.get('legal-link').pass,true,'Visitors must find legal disclosures directly from homepage');
assert.equal(checks.get('host').pass,true,'Render company and legal source must be published');
const legal=readFileSync(resolve(root,'site/informations-legales.html'),'utf8');
if(legal.includes("Informations d'identification incomplètes."))
  assert.equal(checks.get('editor').pass,false,'Public legal incompleteness must not be called onboarding-ready');
const account=JSON.parse(readFileSync(resolve(root,'research/partner-affiliate-offers.json'),'utf8'));
assert.equal(checks.get('awin-account').pass,account.publisherApproved&&Number.isSafeInteger(account.publisherId)&&account.publisherId>0);
assert.equal(checks.get('aliexpress').pass,account.programs['aliexpress-fr'].joined);
assert.equal(checks.get('addiesdive').pass,account.programs.addiesdive.joined);
assert.deepEqual(state.blockers,[...checks].filter(([,c])=>!c.pass).map(([id])=>id));
assert.equal(state.allReady,state.blockers.length===0&&account.enabled&&state.approvedOffers>0,
  'Preflight may only claim complete when legal, both partner programmes and genuine offers are approved');
console.log('Publisher onboarding preflight OK: public legal gaps surfaced, no fictional approval or merchant status');
