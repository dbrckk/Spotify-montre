import {readFileSync,appendFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {validateAffiliateConfig} from './affiliate-policy.mjs';

/**
 * Read-only deployment readiness report. Makes no API calls, no live availability
 * assertions, and never treats self-declared approvals as independently proven.
 */
const root=resolve(import.meta.dirname,'..');
const read=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const catalog=read('site/selection-affiliation.json');
const config=read('site/affiliate-links.json');
if(!Array.isArray(catalog.products)||catalog.products.length!==15)throw Error('Catalogue incomplet');
const validated=validateAffiliateConfig(config,catalog.products.map(p=>p.id));
const entries=catalog.products.map(p=>{
  const linked=validated.links.has(p.id);
  const photoApproved=p.photoReview?.publicUsageApproved===true;
  return {
    id:p.id,label:p.brand+' '+p.model,
    specialLinkConfigured:linked,photoRightsConfirmed:photoApproved,
    commercialReady:linked&&photoApproved,
    next:linked?(photoApproved?'Prêt pour une revue finale':'Autorisation de photographie nécessaire'):
       'Vérifier le produit Amazon et obtenir un lien spécial valide'
  };
});
const totals={
  models:entries.length,
  configuredSpecialLinks:entries.filter(x=>x.specialLinkConfigured).length,
  confirmedPhotoRights:entries.filter(x=>x.photoRightsConfirmed).length,
  commerciallyReady:entries.filter(x=>x.commercialReady).length,
  accountApprovalDeclared:config.approved===true,
  linksActivated:validated.enabled,
  purchaseCheckoutOnSite:false
};
const esc=value=>String(value).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const icon=state=>state?'Oui':'Non';
const lines=[
 '# Atelier Montres — préparation affiliation Amazon.fr',
 '',
 '> Rapport automatique basé sur les fichiers du dépôt : il ne prouve pas que le compte Amazon est approuvé, qu’un ASIN correspond à un produit réel, ou qu’une autorisation photographique est authentique.',
 '',
 `- Programme déclaré approuvé : **${icon(totals.accountApprovalDeclared)}**. Configuration de liens activée : **${icon(totals.linksActivated)}**.`,
 `- **${totals.configuredSpecialLinks} / ${totals.models}** liens spéciaux déclarés, **${totals.confirmedPhotoRights} / ${totals.models}** droits d’image déclarés, **${totals.commerciallyReady} / ${totals.models}** modèles réunissant les préconditions techniques.`,
 '- Paiement direct sur ce site : **désactivé**. Une commission ne peut être prouvée que dans les rapports officiels du programme Partenaires.',
 '',
 '| Référence | Lien spécial | Droit image | Prochaine action |',
 '|---|:---:|:---:|---|',
 ...entries.map(x=>`| ${esc(x.label)} (${x.id}) | ${icon(x.specialLinkConfigured)} | ${icon(x.photoRightsConfirmed)} | ${esc(x.next)} |`),
 '',
 '## Actions restantes',
 ...(!config.approved?['- Faire confirmer le compte Amazon Partenaires France et enregistrer cette URL de boutique.']:[]),
 ...(!config.enabled?['- Renseigner un vrai tag Amazon.fr et au moins un lien spécial de produit exact, puis activer la configuration.']:[]),
 ...entries.some(x=>!x.photoRightsConfirmed)?['- Obtenir les autorisations de diffusion commerciale des photographies ou produire des images originales réellement utilisables.']:[],
 '- Vérifier chaque lien et la correspondance du produit dans un navigateur, puis comparer les revenus réellement attribués dans les rapports Amazon.',
 '- Soumettre le sitemap dans Google Search Console et inspecter les pages produits réellement indexées.',
 '',
 '[Documentation opérationnelle](../docs/commerce-affiliation-marque-propre.md)'
];
const markdown=lines.join('\n')+'\n';
if(process.argv.includes('--json'))console.log(JSON.stringify({totals,products:entries},null,2));
else process.stdout.write(markdown);
if(process.argv.includes('--ci-summary')&&process.env.GITHUB_STEP_SUMMARY){
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
}
