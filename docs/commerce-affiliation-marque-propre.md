# Atelier Montres — plan commercial réel, affiliation puis marque propre

Dernière mise à jour : 30 octobre 2026. Cette feuille de route concerne **une seule boutique**, pas deux boutiques concurrentes.

## État vérifié

- URL Render : https://atelier-montres-selection-fr.onrender.com/
- 15 montres de marques tierces présentées dans un catalogue éditorial indépendant.
- Partenariat Amazon France **non confirmé** ; aucun lien spécial rémunéré actif, aucun paiement, aucun stock propre.
- Les photographies fabricant actuellement publiées ne disposent pas encore d'une preuve de licence commerciale (`publicUsageApproved:false`). **Vérifier ces droits en priorité** ; ne jamais confondre accès à une image publique et autorisation de redistribution.
- Aucun fournisseur chinois, prix final rendu, échantillon testé ou référence de marque propre validés.

## Vue de préparation vérifiable

Le dépôt produit désormais un rapport public dans les résumés GitHub Actions, avec **15 références et 2 preuves distinctes par modèle** : lien spécial validé dans la configuration et autorisation de diffusion commerciale des photographies. Ce sont des déclarations techniques, pas une vérification indépendante des contrats ou de la présence du produit.

- Depuis un terminal : `npm run affiliate:status`.
- Depuis Android sans ordinateur : ouvrir **GitHub → Actions → SEO storefront checks → dernier run → Summary**.
- En dehors des tests, le rapport n'envoie aucune donnée et ne crée aucun achat.
- **Compte Partenaires et droits actuels : non confirmés**. L'état « 0 lien spécial activé » est attendu.

### Activation du référencement Google sans modifier le code

1. Ajouter la propriété de type **Préfixe d'URL** `https://atelier-montres-selection-fr.onrender.com/` dans [Search Console](https://search.google.com/search-console/).
2. Choisir l'option **Balise HTML**. Copier uniquement la valeur de l'attribut `content` de `<meta name="google-site-verification" content="...">` ; ne pas copier la balise entière.
3. Configurer la variable Render **`GOOGLE_SITE_VERIFICATION`** avec cette valeur dans les paramètres d'environnement du site statique (aucun accès à GitHub nécessaire), puis laisser Render reconstruire le site.
4. Dans Search Console, cliquer « Valider ». Soumettre ensuite `https://atelier-montres-selection-fr.onrender.com/sitemap.xml`, puis inspecter quelques pages de montres et guides.
5. Le jeton de validation est publié comme prévu dans la balise HTML : il ne s'agit pas d'un secret d'API. **Ne pas** saisir un mot de passe Google, un jeton OAuth ou une clé de service à cet emplacement.
6. Google peut découvrir ces pages sans indexer toutes les URL : contrôler la couverture et les impressions réelles avant d'augmenter la production de contenu.

### Déclaration de commission visible

La déclaration en français sur les pages activées est désormais le **libellé exact** exigé par l'aide Amazon France : « En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises ». Les liens rémunérés portent une mention visible adjacente. [Source Amazon](https://partenaires.amazon.fr/help/node/topic/GHQNZAU6669EZS98).

## Phase A : rendre l'affiliation réellement opérationnelle

1. Confirmer un compte **Amazon Partenaires France** accepté et déclarer l'adresse publique de la boutique. Ne jamais recycler automatiquement un identifiant Amazon US d'un autre dépôt.
2. Choisir des **références et ASIN exacts**, vérifier manuellement la variante, l'identité du vendeur et la page produit ; ne pas générer un ASIN à partir du nom de modèle.
3. Générer les **liens spéciaux** depuis les outils autorisés Amazon, vérifier le `tag` attribué. Le client paie sur Amazon, **jamais** sur Atelier Montres lors d'une vente affiliée.
4. Renseigner `site/affiliate-links.json` : passer `enabled` et `approved` à `true`, `amazonPartnerTag` au vrai tag Amazon.fr ; une entrée par référence avec `provider`, `asin`, `url`, `verifiedAt`, `productMatchConfirmed:true` et `linkApproved:true`.
5. Le build arrête la publication si un domaine/chemin/ASIN/tag ne correspond pas aux règles. Le site n'affiche le lien rémunéré que pour les modèles explicitement vérifiés, avec mention visible **« lien rémunéré »** et la déclaration Amazon requise. Les autres restent des liens officiels non rémunérés.
6. Obtenir des photographies originales ou licences écrites / autorisations d'usage depuis les programmes partenaires avant d'exploiter commercialement le catalogue. Les images fabricant du dépôt ne prouvent pas leurs droits.
7. Ajouter le domaine à Google Search Console puis Bing Webmaster Tools, soumettre le sitemap et vérifier l'indexation. Mesurer **impressions, clics organiques, CTR, clics sortants autorisés, conversions partenaires, commission confirmée** ; sans prétendre mesurer une commande Amazon depuis le site.
8. Produire de vrais comparatifs fondés sur les caractéristiques, les usages, les photographies autorisées et des essais réalisés (si effectués). Ne jamais produire de faux avis, prix, disponibilité, rabais, étoiles ou témoignages.
9. Examiner les résultats après suffisamment de trafic utile avant d'acheter des montres en quantité. Toute campagne publicitaire payante est optionnelle, sur un budget validé.

Références :
- Conditions Amazon : https://partenaires.amazon.fr/help/operating/policies
- Transparence des liens : https://partenaires.amazon.fr/help/node/topic/GPXFHVYZMTGPUMPE
- Contenu e-commerce utile : https://developers.google.com/search/docs/specialty/ecommerce/where-ecommerce-data-can-appear-on-google
- La sélection affiliée actuelle n'est **pas** une boutique acceptant des commandes.

### Contrat de la configuration publique

`site/affiliate-links.json` est volontairement **désactivé**. Exemple de structure (valeurs fictives exclusivement pour expliquer les champs, jamais publier cet exemple) :

```json
{
  "version": 1,
  "enabled": false,
  "approved": false,
  "amazonPartnerTag": null,
  "links": {}
}
```

Activation : **uniquement après validation** du compte et de chaque ASIN. Un vrai enregistrement a la forme `"citizen-tsuyosa": {"provider":"amazon.fr","asin":"<vrai ASIN>","url":"<vrai lien spécial>","verifiedAt":"AAAA-MM-JJ","productMatchConfirmed":true,"linkApproved":true}`. Les liens courts et les URLs d'autres pays sont refusés, par prudence. Pour étendre plus tard à Awin, ajouter un validateur de destination distinct, et non supprimer le contrôle de sécurité.

Contrôle automatique : `node scripts/check-affiliate-readiness.mjs` puis `npm test`, `node scripts/build-seo.mjs` et `node scripts/validate-seo.mjs`. Le navigateur n'envoie aucune donnée utilisateur à notre serveur pour afficher un lien rémunéré.

## Phase B : recherche de montres de marque propre

**Positionnement** : une marque horlogère accessible, identité visuelle cohérente, finitions soignées et SAV crédible. Priorité à une petite collection de 2–3 références validées plutôt qu'à 15 variantes de qualité incertaine. Choisir au départ des mouvements, boîtiers et bracelets disponibles chez des fabricants capables de fournir pièces de remplacement et documentation.

**Sourcing chinois** : Alibaba, Global Sources, Made-in-China et salons industriels peuvent être des lieux de recherche, pas des preuves de conformité. Pour chaque usine ou intermédiaire : vérifier l'entreprise, les coordonnées, la possibilité de personnalisation légitime (logo propre, pas copie de marque), le MOQ, le devis EXW/FOB/DDP réellement compris, les matériaux, le mouvement, les quantités, l'expédition, la traçabilité et les références client. Ne pas confondre une certification affichée et un document authentifié.

**Échantillons obligatoires avant commande** : inspection physique, exactitude des dimensions, tenue du bracelet, finitions, marche, cohérence étanchéité annoncée/essais disponibles, emballage, lisibilité des gravures, résistance du fermoir, analyse de sécurité et documentation sur matériaux / piles si applicable. Demander le détail des tests, les numéros de lots, notices et documents de conformité adaptés à la référence exacte.

**Conformité** : le règlement (UE) 2023/988 s'applique notamment aux produits mis sur le marché depuis le 13 décembre 2024, avec obligations de sécurité, traçabilité, opérateur responsable et informations visibles en vente à distance. Vérifier obligations spécifiques selon la nature réelle de chaque montre (pile/batterie, équipements électriques, composition des matériaux, restrictions REACH/nickel, emballages, REP/Triman/Info-tri, douanes/TVA, langue française et responsabilités de mise sur le marché). Le marquage CE n'est **pas universellement obligatoire** pour toute montre : déterminer l'applicabilité selon le type de produit, ne pas demander un faux certificat générique.

Textes :
- GPSR : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32023R0988
- DGCCRF : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/obligation-generale-de-securite
- REP emballages : https://www.ecologie.gouv.fr/politiques-publiques/emballages-menagers-papiers-graphiques
- REP / signalétique Triman : https://www.ecologie.gouv.fr/politiques-publiques/cadre-general-filieres-responsabilite-elargie-producteurs

### Calcul économique avant toute commande

L'objectif historique est **20 € maximum par montre rendue en France**, avec coûts répartis ; il n'est pas un prix fournisseurs garanti.

Entrer un devis **réel et complet** dans un fichier JSON local conforme à `research/supplier-quote.schema.json`, puis lancer :

```bash
node scripts/evaluate-supplier.mjs chemin/devis-reel.json
```

Le calcul considère : prix usine/unité, fret, droits de douane, inspection, emballage, autres coûts import, TVA import **non récupérable**, frais de paiement, expédition finale, marketing, retour et réserve SAV. Il calcule la recette hors TVA sur la base du taux fourni, le coût rendu et la marge de contribution. Ne pas confondre marge de contribution avec bénéfice net de l'entreprise : charges fixes, assurance, comptabilité, impôt, invendus et capital immobilisé restent à budgéter.

**Blocage automatique** lorsque coût rendu supérieur à 20 €, marge de contribution non positive ou preuves de conformité manquantes. Le calcul est préparatoire et n'équivaut pas à une conformité légale vérifiée.

## Phase C : mise en vente de la marque propre

1. Structure juridique du vendeur, assurance RC produits à examiner, compte bancaire professionnel si requis, adresse et contact commerçant, CGV complètes, politique de confidentialité, SAV et retour, droit de rétractation/garanties selon le droit applicable.
2. Marques, modèles, logos et noms contrôlés pour éviter contrefaçon et atteinte aux droits de tiers. Identité visuelle déposée si stratégie et budget le justifient.
3. Stock réellement détenu ou logistique sous contrat, réservations atomiques, suivi des commandes, preuve d'expédition, retours, remboursement et gestion des incidents.
4. **Stripe Embedded Checkout** ou équivalent sur Atelier Montres : prix/stock **côté serveur**, webhooks signés, idempotence des commandes, refus des paiements sur produits inactifs, aucun secret dans le navigateur. Certaines étapes bancaires d'authentification peuvent nécessiter une interface externe.
5. Affichage des mentions GPSR de chaque produit, prix TTC, frais d'envoi et délais, suivi des obligations environnementales, CGV. Le site doit distinguer nettement **vendu par Atelier Montres** et **lien affilié externe**.
6. Tests d'achat réels en mode test et d'annulation/remboursement, livraison et retours avant activation. Ne pas annoncer « vente ouverte » avant une transaction, un webhook et un SAV opérationnels.

## Indicateurs à suivre

| Domaine | KPI réel | Seuil de décision |
|---|---|---|
| Acquisition | clics organiques et pages indexées | progression mesurée sur Search Console |
| Affiliation | clics qualifiés vers le marchand | mesurer sans identifiants visiteurs ni fausses conversions |
| Revenus | commissions **effectivement validées** | suivre la marge après coûts marketing |
| Contenu | CTR recherche, lecture des guides, liens consultés | corriger les pages faibles sur données observées |
| Sourcing | coût rendu, taux de rejet échantillons, conformité | ne pas commander si dossier incomplet |
| Marque propre | marge contribution unitaire et retours réels | interdiction de la vente à perte structurelle |
| Produit | satisfaction client, incidents SAV, défauts | analyser par lot/fournisseur |

**Ordre de réalisation** : fiabiliser la distribution affiliée, régulariser droits photographiques, obtenir des revenus vérifiables, tester des échantillons chinois, valider conformité/coûts, puis seulement construire et activer le paiement propre.
