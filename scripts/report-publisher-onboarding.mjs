import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const repository=resolve(import.meta.dirname,'..');
const site=join(repository,'site');
const read=(path)=>readFileSync(join(repository,path),'utf8');
const account=JSON.parse(read('research/partner-affiliate-offers.json'));
const core=JSON.parse(read('site/selection-affiliation.json'));
const extra=JSON.parse(read('site/selection-populaires.json'));
const legal=read('site/informations-legales.html');
const home=read('site/index.html');

export function assessAwinPublisherReadiness(){
  const hasEditorDetails=!legal.includes("Informations d'identification incomplètes.")
    &&!legal.includes("n'ont pas encore été fournis pour publication");
  const editorBlock=legal.split('<h2>Éditeur et publication</h2>')[1]?.split('<h2>Hébergement</h2>')[0]||'';
  const editorContact=hasEditorDetails&&editorBlock.includes('mailto:')&&editorBlock.includes('tel:');
  const editorIdentity=hasEditorDetails&&editorBlock.includes('<strong>');
  const publicIdentity=Boolean(editorContact&&editorIdentity);
  const total=core.products.length+extra.products.length;
  const checks=[
    {id:'site',pass:total===52&&home.includes('Atelier Montres'),
      explanation:'Vitrine publique et catalogue 52 montres'},
    {id:'legal-link',pass:home.includes('href="./informations-legales.html"'),
      explanation:'Lien de mentions légales accessible depuis l’accueil'},
    {id:'host',pass:legal.includes('Render Services, Inc.')&&legal.includes('525 Brannan Street')
      &&legal.includes('https://render.com/terms'),
      explanation:'Identité et source officielle de l’hébergeur Render'},
    {id:'editor',pass:publicIdentity,
      explanation:'Identité/statut et contact éditeur à compléter selon le régime réel (publication publique)'},
    {id:'awin-account',pass:account.publisherApproved&&Number.isSafeInteger(account.publisherId)
      &&account.publisherId>0,
      explanation:'Validation du compte éditeur Awin et identifiant réel confirmé'},
    {id:'aliexpress',pass:account.programs['aliexpress-fr']?.joined===true,
      explanation:'Acceptation de l’annonceur AliExpress FR (26009)'},
    {id:'addiesdive',pass:account.programs.addiesdive?.joined===true,
      explanation:'Acceptation de l’annonceur ADDIESDIVE (94513)'}
  ];
  const verifiedOffers=Object.keys(account.offers||{}).length;
  const blockers=checks.filter(c=>!c.pass).map(c=>c.id);
  return {siteUrl:'https://atelier-montres-selection-fr.onrender.com/',
    checks,blockers,approvedOffers:verifiedOffers,
    allReady:blockers.length===0&&account.enabled&&verifiedOffers>0};
}

const invoked=process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname);
if(invoked){
  const result=assessAwinPublisherReadiness();
  if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
  else{
    console.log('Atelier Montres — vérification avant candidature Awin (état documenté dans GitHub)');
    for(const c of result.checks)
      console.log((c.pass?'[OK] ':'[À FAIRE] ')+c.explanation);
    console.log('Liens Awin documentés dans le registre : '+result.approvedOffers);
    console.log(result.allReady?'Prêt pour revue de publication, vérifier le compte Awin et le site public.':
      'Priorité : compléter les mentions éditeur, valider le compte éditeur, puis obtenir les accords marchands.');
    console.log('Inscription éditeur : https://ui.awin.com/publisher-signup/fr/awin/step1');
  }
  if(process.argv.includes('--strict')&&!result.allReady)process.exitCode=2;
}
