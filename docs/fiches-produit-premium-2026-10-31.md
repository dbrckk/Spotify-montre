# Fiches produit premium — 31 octobre 2026

## Parcours en production

- **Catalogue** : `/index.html#montres` et `/affiliation.html#montres`.
- **Fiche interactive** : `/montre.html?id=<identifiant>`, volontairement non indexable (les préférences, favoris et partages restent accessibles).
- **Fiche canonique SEO** : `/montres/<identifiant>.html`, générée à partir du même `site/selection-affiliation.json` pour les **15 références exactes**.

Ces deux types de fiches ne doivent pas diverger sur le mouvement, les dimensions, le verre ou l'étanchéité. Les champs non fournis par le catalogue affichent explicitement « Non documenté » plutôt que des valeurs supposées.

## Interface et photographie

- Une scène photo sobre remplace l'apparence d'une fiche générique. Les photographies locales sont des images des références exactes dont l'usage a été **déclaré autorisé par le propriétaire du site**. Aucun contrôle indépendant de l'autorisation de reproduction n'est revendiqué.
- La fiche interactive et la fiche statique utilisent les variantes WebP existantes de 480 et 800 px quand leur taille est justifiée ; l'image originale reste la source de repli et sert au zoom interactif.
- Le premier écran contient quatre critères : mouvement, diamètre, verre et étanchéité. L'information manquante est explicitée et mise en retrait, sans être cachée.
- Sur la fiche canonique, des raccourcis ciblent les caractéristiques, le tableau de comparaison, les vérifications avant achat et les modèles proches.
- Les boutons de fabricant, comparaison et recherche chez un vendeur restent distincts ; le site n'invente ni prix, ni stock, ni garantie, ni avis, ni commission active.

## Fichiers maintenus

| Sujet | Fichier |
| --- | --- |
| Marquage de la fiche interactive | `site/montre.html` |
| Affichage de la fiche interactive et images adaptatives | `site/fiche.js` |
| Styles et responsive mobile interactif | `site/fiche.css` |
| Génération des 15 fiches canoniques | `scripts/build-seo.mjs` |
| Styles des fiches canoniques | `site/seo-guides.css` |
| Contrôles invariants HTML/schema et faits | `scripts/validate-seo.mjs` |
| Vraies vérifications Android sur Render | `scripts/test-mobile-live-storefront.mjs` |

## Vérification avant publication

Lancer `npm test && node scripts/build-seo.mjs && node scripts/validate-seo.mjs` depuis la racine du dépôt. La CI « SEO storefront checks » vérifie le catalogue, les 15 fiches et la cohérence des données sans prétendre mesurer des classements Google.

La CI « Validate production Render photos on Android » ouvre réellement le catalogue, la fiche interactive Tissot et la fiche canonique Citizen en navigateur Android : images décodées, source de photos locale approuvée, quatre critères, ancres internes et débordements horizontaux.

Le workflow « Verify production Render watch storefront on Android » attend les versions **exactes** des JS/CSS et la présence du nouveau balisage canonique dans Render avant d'enchaîner les parcours Android. Un déploiement `live` et une CI verte sont deux contrôles distincts.

## Prochaines limites à traiter

- La vérification externe des licences ou autorisations des photos fabricants n'est pas documentée : toute preuve doit être enregistrée avant de revendiquer un droit vérifié.
- Les 15 fiches affichent uniquement les informations déjà présentes dans le catalogue ; les caractéristiques absentes demandent une source constructeur vérifiable.
- L'indexation de toutes les pages, le CTR et les positions Search Console ne sont pas présumés. L'étude du trafic est différée jusqu'à ce que le volume soit exploitable.
