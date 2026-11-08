# Atelier Montres — plan d'évolution et exécution du 8 novembre 2026

**Dépôt :** `dbrckk/Spotify-montre` · **base vérifiée :** `main@c928363b86e16344d16454c8b47a2e792060feb2` · **branche de travail :** `fix/recent-watch-srcset-20261108`.

Ce document complète le [plan directeur](./OBJECTIF_GLOBAL_ET_PLAN_DIRECTEUR_2026-11-05.md). Il conserve ses verrous de sécurité et ne transforme jamais un catalogue éditorial en stock effectivement disponible.

## 1. Objectif produit et critères

Faire de la vitrine publique un **guide d'achat horloger premium, accessible sur Android et fiable**, qui permet de choisir et de comparer une référence exacte avant de consulter une offre partenaire correctement identifiée. Préparer la vente directe séparément, **sans la réactiver** avant l'existence des preuves fournisseur, marchand et paiement.

Principes : fiabilité, exactitude des modèles et droits photographiques avant quantité de fiches ; pas de prix, stock, avis, commission ou livraison simulés ; zéro dépendance payante indispensable ; conserver le site indépendant et le catalogue généré.

## 2. État vérifié le 8 novembre 2026

| Axe | Observation vérifiée | Conséquence |
| --- | --- | --- |
| Catalogue | 15 modèles historiques + 37 complémentaires, soit **52** références ; générateur SEO présent | Améliorer la qualité de parcours, pas gonfler le volume |
| Photos | Photos locales approuvées et déclinaisons WebP responsive ; nouvelles sources officielles contrôlées sur `main` le 08/11 | Préserver identité exacte et traçabilité ; éviter les requêtes d'originaux sur mobile |
| Mobile | Workflow de vérification de la vitrine Render **réussi** sur le commit `c928363b` | Ne pas confondre succès fonctionnel et résultat Lighthouse |
| Performance | Workflow **Lighthouse mobile production en échec** au même commit : la pré-vérification de version publiée a expiré, **aucun score Lighthouse ne peut en être déduit** | Comparer précisément déploiement Render et commit avant de conclure sur les Core Web Vitals |
| Commerce | `site/config.json` indique `checkoutMode: "inactive"`; devis fournisseur final et lancement marchand non prouvés | Garder la caisse fermée |
| SEO et affiliation | Métadonnées, pages générées, tests et vérification de liens disponibles ; performances SEO réelles à suivre dans Search Console | Mesurer trafic/indexation/clics sans inventer des revenus |

La CI et la version Render publiée peuvent évoluer indépendamment : chaque validation de production doit être associée à une **version déployée identifiée**.

## 3. Feuille de route priorisée

### P0 — Fiabilité, sécurité, publication

1. Vérifier l'état des workflows de `main`, en séparant erreurs applicatives, erreurs de déploiement et erreurs des sondes.
2. Conserver un précontrôle **strict** de synchronisation entre pages/ressources Render et commit mesuré. En cas de désaccord, produire un diagnostic exploitable ; ne jamais afficher un faux score Lighthouse.
3. Protéger les liens, les photos, les informations produit et les variantes contre les remplacements non vérifiés.
4. Laisser le paiement direct **désactivé** tant qu'il n'existe pas de transaction et de livraison réelles qualifiées.

**Acceptation :** CI de la PR verte ; version déployée identifiable ; aucune activation du paiement dans le diff.

### P1 — Photos, design et rapidité Android

1. Conserver l'identité visuelle de la vitrine (fonds forêt/ivoire, hiérarchie éditoriale, trois gammes).
2. Servir les **miniatures des montres récemment vues** à la bonne résolution. Les URL de photos principales portent parfois un `?v=<12 caractères hexadécimaux>` dérivé de l'empreinte approuvée : la validation précédente rejetait ces URL dans le `srcset` et retirait le bénéfice des variantes de petites dimensions.
3. Vérifier en navigateur les liens exacts, les variantes WebP du **même modèle**, les états « photo non publiée », le rail sur 393 px et le parcours de comparaison. Interdire les URLs distantes et les paramètres de cache libres.
4. Inspecter ensuite le **LCP, CLS, INP** et le poids des CSS/JS à partir de mesures sur la version réellement déployée, puis regrouper ou différer les ressources seulement si l'amélioration est mesurée.

**Acceptation :** variantes WebP sélectionnables, aucune photo tiers introduite, zéro débordement, tests Android et bureau réussis, mesures Lighthouse reliées au commit.

### P2 — SEO utile et conversion responsable

1. Auditer les pages prioritaires par intention (« montre homme petit budget », modèles exacts, quartz/automatique, comparatifs) avec données Search Console, plutôt que créer des pages quasi identiques.
2. Améliorer la navigation entre fiches, comparaisons, catégories, conseiller, pages vendeur sans liens cassés.
3. Mesurer impressions, CTR, pages indexées et clics partenaires dans une période comparable. Une preuve ASIN ne démontre pas un stock ni une commission.
4. Publier des photos seulement lorsqu'une source autorisée et la variante exacte correspondent.

**Acceptation :** sitemap et canonicals valides, texte utile et non trompeur, CTR et clics fondés sur données externes vérifiées.

### P3 — Affiliation, rentabilité et lancement commercial séparé

1. Faire vérifier statuts éditeur et marchands, coordonnées légales, mentions, politiques de retour et preuves de rémunération.
2. Qualifier **une** référence fournisseur CJ : PID/VID/SKU, devis TTC rendu France, TVA/import, retours, délai, marge et disponibilité.
3. Finaliser un processeur de paiement, KYC, remboursement, rapprochement et commande unique *avant* toute mise en vente réelle ; lancer un seul pilote supervisé.
4. Ne jamais utiliser le checkout fictif pour donner l'impression qu'une commande est possible.

**Acceptation :** offre et droit de vendre réels, commande fournisseur et livraison attestées, calcul de marge après coûts constatés.

## 4. Modifications effectivement apportées sur la branche

- **`site/unified-recent-history.js`** : accepte uniquement un paramètre de version `?v=` suivi de **12 caractères hexadécimaux minuscules** sur un chemin WebP local déjà lié à la référence exacte. Rejette toujours les origines tierces, fragments, identifiants d'URL et paramètres inconnus. Le navigateur peut conserver les `srcset` des photos approuvées.
- **`scripts/test-unified-recent-history-browser.mjs`** : ajoute une régression vérifiant que les candidats `srcset` sont bien présents, hachés, locaux, et montrent **la même référence** ; inclut le contrôle de deux photos du catalogue principal.
- **`scripts/test-catalogue-search-browser.mjs`** : corrige une **régression CI identifiée lors de la première exécution**. Le test attendait encore 15 fiches sans photo alors que les nouvelles photos officielles ont réduit le nombre à 12. Le test vérifie désormais le compte **calculé depuis le registre des photos autorisées** et les liens sources de toutes les fiches non photographiées, sans affaiblir la couverture.
- **Ce plan** : objectif, ordre des travaux, preuves nécessaires et critères d'acceptation consignés au dépôt.

## 5. Vérification, livraison, limites

Commandes de contrôle sur la branche :

```bash
node --check site/unified-recent-history.js
node --check scripts/test-unified-recent-history-browser.mjs
npm test
npm run lint
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
# Après installation de playwright et de Chromium :
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
# Dans un second terminal :
WATCH_STOREFRONT_URL=http://127.0.0.1:8765 node scripts/test-unified-recent-history-browser.mjs
```

Le workflow `test-premium-mobile.yml` exécute déjà la génération et le test navigateur inclus dans la PR. Le workflow `seo-storefront.yml` vérifie les contrats SEO et le catalogue sur une PR.

**Important :** aucune amélioration de Core Web Vitals, de revenus ou de ventes n'est revendiquée avant une mesure production liée au commit et des preuves commerciales indépendantes.
