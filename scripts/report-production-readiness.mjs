#!/usr/bin/env node
/**
 * Attribution-free, source-only release audit.
 * Never treats source comments, CI, partner links or click events as sales.
 * Never uses network requests or reads private tokens/customer records.
 */
import {readFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const loadText=path=>readFileSync(join(root,path),'utf8');
const load=path=>JSON.parse(loadText(path));
const core=load('site/selection-affiliation.json');
const extra=load('site/selection-populaires.json');
const popularRights=load('site/popular-photo-rights.json');
const amazonCore=load('research/amazon-fr-exact-products.json');
const amazonExtra=load('research/amazon-fr-popular-verified.json');
const affiliate=load('site/affiliate-links.json');
const awin=load('research/partner-affiliate-offers.json');
const forSale=load('site/catalogue.json');
const config=load('site/config.json');
const legal=loadText('site/informations-legales.html');
const coreProducts=Array.isArray(core.products)?core.products:[];
const extraProducts=Array.isArray(extra.products)?extra.products:[];
const photoCount=coreProducts.filter(p=>p.photoReview?.publicUsageApproved===true).length
  +Object.keys(popularRights.photos||{}).length;
const rightsProofCount=coreProducts.filter(p=>p.photoReview?.permissionIndependentlyVerified===true).length
  +Object.values(popularRights.photos||{}).filter(p=>p.permissionIndependentlyVerified===true).length;
const primaryAsins=Object.values(amazonCore.products||{}).filter(
  p=>p.status==='matched_on_amazon_fr').length;
const supplementaryAsins=Object.keys(amazonExtra.verifiedProducts||{}).length;
const ids=[...coreProducts,...extraProducts].map(p=>p.id);
const legalIncomplete=/Informations d'identification incomplètes|n'ont pas encore été fournis pour publication/.test(legal);
const checkoutFrozen=config.checkoutMode==='inactive'&&Array.isArray(forSale.products)&&forSale.products.length===0;
const state=(pass,negative='BLOCKED')=>pass?'PASS':negative;
const item=(id,domain,status,observation,evidenceRequired,owner,source)=>{
  if(!['PASS','BLOCKED','EXTERNAL_PROOF_REQUIRED','NOT_MEASURED'].includes(status))
    throw Error('Unknown readiness status: '+id);
  return {id,domain,status,observation,evidenceRequired,owner,source};
};
const checks=[
  item('G01','catalogue',state(coreProducts.length===15&&extraProducts.length===37&&new Set(ids).size===52),
    coreProducts.length+' principaux + '+extraProducts.length+' complémentaires ; '+new Set(ids).size+' identifiants uniques',
    '52 fiches de vrais modèles et liens cohérents','tech lead',
    'site/selection-affiliation.json ; site/selection-populaires.json'),
  item('G02','checkout-locked',state(checkoutFrozen),
    'checkoutMode='+config.checkoutMode+' ; produits directs='+(forSale.products?.length??'inconnu'),
    'Pas de paiement public ou offre vendable sans approbation R3','sécurité/commerce',
    'site/config.json ; site/catalogue.json ; vérification serveur live séparée'),
  // Even a full source register would require independent permission review.
  item('G03','photos','EXTERNAL_PROOF_REQUIRED',
    photoCount+' photos locales sur 52 ; '+rightsProofCount+' droits prouvés indépendamment dans les registres',
    'Pièces écrites ou contrats contrôlés pour chaque photo, sinon retirer/repli factuel','direction artistique/juridique',
    'site/selection-affiliation.json ; site/popular-photo-rights.json'),
  item('G04','éditeur',legalIncomplete?'BLOCKED':'EXTERNAL_PROOF_REQUIRED',
    legalIncomplete?'Mentions légales déclarées incomplètes':'Texte modifié : contrôle juridique indépendant toujours requis',
    'Identité, statut et contact réels, revue juridique/documentaire','éditeur/juridique',
    'site/informations-legales.html ; justificatifs privés'),
  item('G05','amazon',affiliate.approved===true?'EXTERNAL_PROOF_REQUIRED':'BLOCKED',
    Object.keys(affiliate.links||{}).length+' liens principaux ; approbation finale Amazon '+(affiliate.approved?'déclarée':'non déclarée'),
    'Compte officiellement éligible, attribution et commissions validées','partenariats/finance',
    'site/affiliate-links.json ; rapports Amazon privés'),
  item('G06','asin',state(primaryAsins===13&&supplementaryAsins===14),
    primaryAsins+' ASIN principaux + '+supplementaryAsins+' complémentaires documentés',
    'Liens correspondant aux modèles, recherches distinctes, aucune garantie de stock','merchandising/QA',
    'research/amazon-fr-exact-products.json ; research/amazon-fr-popular-verified.json'),
  item('G07','awin',awin.enabled&&awin.publisherApproved&&Object.keys(awin.offers||{}).length>0
    ?'EXTERNAL_PROOF_REQUIRED':'BLOCKED',
    'Awin '+(awin.enabled?'activé':'inactif')+' ; offres configurées='+Object.keys(awin.offers||{}).length,
    'Compte et annonceurs approuvés + vrais deeplinks product-specific','partenariats',
    'research/partner-affiliate-offers.json ; compte privé Awin'),
  item('G08','gsc','NOT_MEASURED','Données de Search Console non récupérées par cet audit source',
    'Exports 28/56 jours et indexation réelle','SEO/data','Google Search Console daté'),
  item('G09','conversions','NOT_MEASURED','Aucun événement réel et aucune vente attribuée observables depuis les fichiers',
    'Visites, sorties, commandes, commissions et rémunérations séparées','data/finance',
    'Umami licite si activé ; comptes partenaires et PSP'),
  item('G10','cj-quote','EXTERNAL_PROOF_REQUIRED',
    'Ticket CJ existant ; devis de variante rendue France non établi ici',
    'Devis écrit détaillé, variante, stock, port, taxes, délais, retours','sourcing/finance',
    'Ticket CJ et réponses officielles privées'),
  item('G11','psp-legal','EXTERNAL_PROOF_REQUIRED',
    'KYC Mollie live, identité vendeur et CGV non prouvés par le dépôt',
    'PSP, contrat vendeur, TVA, médiation, rétractation, remboursements','paiement/juridique',
    'Preuves réelles hors dépôt public'),
  item('G12','product-safety','EXTERNAL_PROOF_REQUIRED',
    'Traçabilité GPSR/UE du premier SKU direct non établie ici',
    'Fabricant/responsable UE selon cas, sécurité, avertissements et import','conformité/fournisseur',
    'Dossier produit privé'),
  item('G13','real-sale','EXTERNAL_PROOF_REQUIRED',
    'Aucune vente directe pilote payée, livrée et rapprochée attestée ici',
    'Un paiement confirmé, une commande CJ, livraison, marge et SAV réels','commerce/QA/support',
    'PSP, CJ, transporteur, rapprochement privés'),
  item('G14','operations','NOT_MEASURED',
    'CI ne prouve pas des alertes reçues, un backup restauré ni le support fonctionnel',
    'Exercice rollback/restore, alertes, gel commercial, support et budget','DevOps/support',
    'Compte-rendu d’exercice opérateur')
];
const conclusions={
  sourceQualityChecked:checks.filter(c=>['G01','G02','G06'].includes(c.id))
    .every(c=>c.status==='PASS'),
  compliantAffiliateLaunchConfirmed:false,
  monetizedAffiliateBusinessConfirmed:false,
  liveDirectCheckoutConfirmed:false,
  productionReadyFinalConfirmed:false
};
// Source code can never establish legal authorizations, real partner revenue,
// live KYC or a delivered order; keep these statuses closed by design.
const result={
  schemaVersion:1,reportKind:'read-only-source-evidence',baselineDate:'2026-11-09',
  provenance:'GitHub source only; no private partner, legal, buyer or production account accessed',
  figures:{
    totalWatches:ids.length,coreWatches:coreProducts.length,
    extraWatches:extraProducts.length,publishedLocalPhotos:photoCount,
    missingLocalPhotos:ids.length-photoCount,independentlyVerifiedPhotoRights:rightsProofCount,
    documentedAsins:primaryAsins+supplementaryAsins,
    sellableDirectOffers:forSale.products?.length??null,
    eligibleAffiliateSales:null,paidAffiliateCommissions:null,directGrossSales:null,
    googleSearchClicks:null,organicSessions:null,fieldLcpP75:null,fieldInpP75:null
  },
  conclusions,checks,
  caveats:[
    'SOURCE ONLY: pass in GitHub is not proof of live legality, real sales or production uptime.',
    'UNKNOWN != ZERO: absent revenue and traffic evidence must remain null.',
    'No checkout state change, payment, order or external API request is made by this tool.'
  ],
  priorities:[
    'P0 éditeur : compléter identité légale et contacts réels (externe)',
    'P0 images : conserver et vérifier les autorisations des 40 photos publiées',
    'P0 affiliation : preuve officielle Amazon des commissions/éligibilité',
    'P0 CJ : investiguer CJ_TICKET_MESSAGES_UNVERIFIED sans envoyer de nouveau ticket',
    'P1 Search Console : importer un export de données datées et établir une baseline',
    'P1 exploitation : vérification de restore, surveillance, rollback et support'
  ]
};
const markdown=[
  '# Atelier Montres — Production Ready : état de preuve',
  '',
  '> Rapport **en lecture seule**. Les données légales, les comptes partenaires, les revenus et un pilote livré restent à prouver hors GitHub.',
  '',
  '- Montres : **'+result.figures.totalWatches+'** ('+result.figures.coreWatches+' + '+result.figures.extraWatches+').',
  '- Photos : **'+photoCount+'** ; absentes en local : **'+result.figures.missingLocalPhotos+'** ; droits independently vérifiés enregistrés : **'+rightsProofCount+'**.',
  '- ASIN documentés : **'+result.figures.documentedAsins+'**. Aucune garantie de stock ou revenu.',
  '- Checkout : **'+config.checkoutMode+'** ; offres directes : **'+result.figures.sellableDirectOffers+'**.',
  '- **Production-ready final : NON DÉMONTRÉ. Monétisation réelle : NON DÉMONTRÉE.**',
  '',
  '| Vérification | Statut | Fait observé | Pièce requise |',
  '| --- | --- | --- | --- |',
  ...checks.map(c=>'| '+c.id+' · '+c.domain+' | '+c.status+' | '+c.observation.replaceAll('|','\\|')+' | '+c.evidenceRequired.replaceAll('|','\\|')+' |'),
  '',
  '## Prochaines preuves à obtenir',
  ...result.priorities.map(p=>'- '+p),
  '',
  '[Charte Production Ready](docs/OBJECTIF_FINAL_PRODUCTION_READY_2026-11-09.md).'
].join('\n')+'\n';
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(result,null,2)+'\n');
else process.stdout.write(markdown);
if(process.argv.includes('--ci-summary')&&process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
if(process.argv.includes('--strict')&&!conclusions.productionReadyFinalConfirmed)
  process.exitCode=2;
