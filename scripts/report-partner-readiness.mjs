import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {loadApprovedPartnerOffers} from './approved-partner-offers.mjs';

const repository=resolve(import.meta.dirname,'..');
const data=JSON.parse(readFileSync(join(repository,'research/partner-affiliate-offers.json'),'utf8'));
const products=JSON.parse(readFileSync(join(repository,'site/selection-populaires.json'),'utf8')).products;
const verified=loadApprovedPartnerOffers({root:join(repository,'site'),picks:products});
const status=(name,info)=>console.log(name+': '+(info.joined?'acceptation éditeur déclarée':'candidature / acceptation non confirmée')+' · annonceur '+info.advertiserId);
console.log('Atelier Montres — partenariats Awin (déclarations du dépôt, pas preuve de commission)');
console.log('Éditeur approuvé : '+(data.publisherApproved?'déclaré dans le registre':'non confirmé'));
console.log('Affiliation Awin publiée : '+(data.enabled?'active':'désactivée'));
for(const [name,program] of Object.entries(data.programs))status(name,program);
console.log('Liens profonds Awin activés : '+verified.size);
console.log('Prochaine action : obtenir l’approbation éditeur et annonceur, générer les deeplinks exacts via Awin LinkBuilder, puis fournir le registre sous revue GitHub.');
