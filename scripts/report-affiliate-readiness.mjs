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
  const permissionDeclared=photoApproved&&p.photoReview?.permissionDeclaration==='site_owner_explicit_confirmation_2026-10-30';
  const permissionEvidenceVerified=photoApproved&&p.photoReview?.permissionIndependentlyVerified===true;
  return {
    id:p.id,label:p.brand+' '+p.model,
    specialLinkConfigured:linked,photoRightsDeclared:permissionDeclared,photoProofVerified:permissionEvidenceVerified,
    commercialReady:linked&&photoApproved,
    next:!linked?'Confirmer compte et lien spécial du modèle exact':
      !photoApproved?'Publication de la photo non autorisée':
      !permissionEvidenceVerified?'Conserver la preuve des droits image et contrôler le compte Amazon':'Revue finale Amazon requise'
  };
});
const totals={
  models:entries.length,
  configuredSpecialLinks:entries.filter(x=>x.specialLinkConfigured).length,
  declaredPhotoRights:entries.filter(x=>x.photoRightsDeclared).length,
  independentlyVerifiedPhotoRights:entries.filter(x=>x.photoProofVerified).length,
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
 `- **${totals.configuredSpecialLinks} / ${totals.models}** liens spéciaux déclarés ; **${totals.declaredPhotoRights} / ${totals.models}** permissions d'image déclarées par le responsable ; **${totals.independentlyVerifiedPhotoRights} / ${totals.models}** justificatifs vérifiés indépendamment ; **${totals.commerciallyReady} / ${totals.models}** modèles techniquement configurés.`,
 '- Paiement direct sur ce site : **désactivé**. Une commission ne peut être prouvée que dans les rapports officiels du programme Partenaires.',
 '',
 '| Référence | Lien spécial | Droit image déclaré | Preuve vérifiée | Prochaine action |',
 '|---|:---:|:---:|:---:|---|',
 ...entries.map(x=>`| ${esc(x.label)} (${x.id}) | ${icon(x.specialLinkConfigured)} | ${icon(x.photoRightsDeclared)} | ${icon(x.photoProofVerified)} | ${esc(x.next)} |`),
 '',
 '## Actions restantes',
 ...(!config.approved?['- Faire confirmer le compte Amazon Partenaires France et enregistrer cette URL de boutique.']:[]),
 ...(!config.enabled?['- Renseigner un vrai tag Amazon.fr et au moins un lien spécial de produit exact, puis activer la configuration.']:[]),
 ...entries.some(x=>!x.photoProofVerified)?['- Archiver les autorisations écrites des marques / ayants droit pour les 15 photos. Le responsable du site a déclaré disposer de ces droits ; ce rapport ne vérifie pas ses pièces justificatives.']:[],
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
