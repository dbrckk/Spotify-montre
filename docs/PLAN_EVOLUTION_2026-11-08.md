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


## 6. Lot P1 du 9 novembre 2026 — comparateurs lisibles sur Android

**Base inspectée :** `main@ce7d68dbe92d9a0c3bdaabc355104d9a206ab192`. Les workflows SEO, Lighthouse mobile production et WCAG de `2fdd326fb` ont réussi. Lighthouse mobile observé sur cette base : accueil 100/100, LCP médian 1 083 ms ; catalogue 100/100, LCP 1 432 ms (mesures de laboratoire uniquement).

**Problème d'expérience vérifiable :** les quatre duels présentaient deux fiches détaillées avant les différences techniques, sans accès rapide aux décisions. Les tableaux de comparaison à quatre modèles étaient défilants mais sans repère visuel indiquant le geste horizontal ; le lecteur perdait le nom des caractéristiques pendant le défilement sur téléphone.

**Modifications :**
- `scripts/build-comparisons.mjs` : deux liens d'ancrage natifs (différences et orientation d'achat) sur les quatre duels, indication du défilement horizontal.
- `scripts/build-popular-product-pages.mjs` : indication claire du défilement sur les 37 fiches complémentaires ; données et recommandation de la même gamme conservées.
- `site/seo-guides.css`, `site/extra-factual-comparison.css` : première colonne technique épinglée sur écrans mobiles, raccourcis lisibles et ciblables, focus visible, aucun nouveau JavaScript, aucune photo ou offre ajoutée.
- `scripts/test-watch-comparisons-browser.mjs`, `scripts/test-popular-product-actions-browser.mjs` : vérification navigateur des ancrages, du scroll réel, de la colonne épinglée, du débordement existant et de la source unique des 52 références.

**Critères de livraison :** `npm test`, génération SEO et validation, navigateur Android et desktop, WCAG ; aucun changement des prix, photos, liens marchands ou du verrou de paiement. **Ne pas attribuer une amélioration de LCP/INP sans mesure liée à la version publiée.**


## 7. Lot P1 — 9 novembre 2026 : photos sources des cartes du catalogue complémentaire

**Base auditée :** `main@2d441cc114132c8796819cde02d1048e61570512` (post-PR #239, contrôles Android/SEO/Lighthouse/WCAG réussis). La page des 37 modèles complémentaires publiait les images principales des 25 références déclarées autorisées **sans utiliser leur `srcset` responsive**, même si les miniatures de 240, 360, 480, 720 et 960 px étaient déjà disponibles.

**Correction ciblée :**
- `scripts/build-popular-picks.mjs` réutilise `responsivePopularAttrs` sur les cartes des 37 modèles et les 8 idées de l'accueil ; `width` et `height` proviennent du registre photographique réel. Le navigateur choisit un WebP adapté à la taille affichée et à la densité d'écran. La photo d'origine reste en repli.
- `site/popular-picks.css` : les images authentiques sont mises en valeur dans un studio plus sobre, légèrement plus grandes et séparées du texte ; les fiches sans photographie ne reçoivent aucune fausse image.
- `scripts/test-mobile-storefront-v8.mjs` : contrôle exhaustif des 25 enregistrements, URL et dimensions exactes, existence des variantes locales et choix réel d'une miniature par Chromium Android, avec capture du rendu.

**Exemples fondés sur les fichiers réellement versionnés** (octets de fichier, pas métriques de réseau) : SKMEI 1251 : original 59 580 o, 240 px 5 008 o ; ADDIESDIVE AD2030 : original 155 742 o, 240 px 7 058 o. Selon le DPR et la géométrie, une taille plus grande peut être sélectionnée. **Ne pas revendiquer de gain LCP sans un audit production après déploiement.** Aucun paiement, tarif, lien partenaire ou droit photographique n'est modifié.


## 8. Lot P2 — 9 novembre 2026 : filtres de preuves produit, sans stock fictif

**Base vérifiée :** `main@4da384dfb2a959f251d19d8aa9a06d38e4426352`, 7 workflows post-PR #240 réussis (SEO, mobile, Render et Lighthouse notamment).

**Constat source :** sur les 37 montres complémentaires, 25 ont une photo publiée avec autorisation déclarée, 14 ont une correspondance ASIN documentée et **5 ont les deux**. La recherche existante (texte, gamme, style, mouvement) ne permettait pas de limiter facilement le parcours à ces modèles.

**Solution appliquée sur branche dédiée :**
- `scripts/build-popular-picks.mjs` : publier sur chaque carte deux indicateurs techniques dérivés **uniquement** des registres existants (photo autorisée, correspondance marchande documentée) et ajouter deux choix facultatifs au formulaire du catalogue.
- `site/popular-filters.js` : cumuler ces deux critères à la recherche, à la gamme, au style et au mouvement. RAZ complète et navigation par ancre compatibles ; aucun appel réseau.
- `site/popular-picks.css` : filtres mobiles à grande zone tactile, focus clavier visible et avertissement clair. Le formulaire reste **masqué sans JavaScript**, et les 37 fiches restent consultables.
- `scripts/test-mobile-storefront-v8.mjs` : comparer les correspondances rendues aux registres photo et ASIN, essayer chaque filtre et leur intersection sur Android, le reset et l’absence de débordement.

**Propriété commerciale :** « Référence Amazon.fr documentée » n’est **ni** une garantie de stock, **ni** un prix validé, **ni** une commission ou une commande. Le paiement direct reste inactif. Aucun nouveau lien d'achat ou prix n'est généré.

**Acceptation :** 37 références préservées, filtres combinables, test Android/desktop complet, SEO et WCAG validés. Aucun gain de trafic/vente n'est attribué sans mesure externe.


## 9. Lot P2 — 9 novembre 2026 : provenance lisible au moment du départ marchand

**Base inspectée :** `main@485746920971720aa7665a9ff17315ab54c57343`. Les sept contrôles de la précédente livraison (#241) ont réussi après fusion, y compris Render, Lighthouse, SEO et WCAG.

**Constat :** les liens vers les quatorze ASIN documentés étaient présentés comme des « modèles exacts », alors que six références ont une preuve par redirection de comparateur et corroboration indépendante, et que certaines fiches Amazon consultées ou indexées sont historiques. Un lien vers un ASIN n'est pas la preuve d'une offre achetable aujourd'hui.

**Modifications :**
- `scripts/build-popular-picks.mjs` : libellés marchands distincts (ASIN de source tierce, fiche Amazon.fr documentée, simple recherche). Chaque carte présente la nature de la preuve, l'ASIN et sa date de contrôle quand ils existent, avant le lien rémunéré. Le même traitement s'applique aux huit cartes de l'accueil.
- `scripts/build-popular-product-pages.mjs` : sur les 37 fiches complémentaires, afficher sous le code modèle un récapitulatif structuré comprenant **destination**, **référence** et **date de preuve documentaire** (ou « Aucun ASIN exact documenté ») ; conserver les avertissements concernant les variantes, les prix et le stock.
- `site/popular-picks.css` : présentation sobre forêt/ivoire et grille d'informations lisible en une colonne sur mobile, sans JavaScript supplémentaire.
- `scripts/test-mobile-storefront-v8.mjs` et `scripts/test-popular-product-actions-browser.mjs` : vérifier les trois états, les liens exacts, les libellés, les dates et les dimensions sur Android et ordinateur.

**Critères :** tests et génération SEO verts, accessibilité WCAG, preuve conforme aux registres, aucune redirection commerciale changée, aucun prix ni stock inventé, caisse toujours inactive. L'amélioration de la conversion devra être évaluée à partir d'événements et commissions réellement mesurés, pas postulés.


## 10. Lot P2 — 9 novembre 2026 : instrumenter un entonnoir sans données personnelles ajoutées

**Base réellement inspectée :** `main@9fbf01c3c28c3716d120637410d1949137bf84a9`. Les sept workflows de la version précédente (#242), y compris production Render et Lighthouse, étaient au vert. `site/analytics.js` documentait déjà 27 associations ASIN et les clics sortants, mais n'observait pas l'utilisation des parcours comparateur ni les filtres documentaires.

**Livrable :**
- `site/analytics.js` : réutiliser l'Umami **facultatif** déjà connecté au build, sans nouvelle bibliothèque, cookie ou activation implicite. Trois familles d'événements `compare:<référence>:fiche|selection|accueil` n'acceptent que les liens comparateurs internes, sur la bonne origine, avec deux ou trois IDs valides et sans paramètres additionnels.
- Les changements des deux cases de filtres documentaires déclenchent des signaux catégoriels `proof-filter:photo|asin|both` uniquement lors d'une activation. Le script ne transmet **jamais** le contenu de la recherche libre, les informations d'identité ou des valeurs quelconques des formulaires.
- `scripts/check-merchant-analytics.mjs` : tests du vrai JavaScript de production sur les clics existants, les trois parcours internes et la combinaison des preuves ; refus des URLs extérieures, IDs incohérents, paramètres additionnels et champs libres. Aucun événement émis en l'absence d'Umami.
- `docs/analytics-gratuites-et-revenus-amazon.md` : guide mis à jour (52 montres, 27 ASIN documentés), lecture des événements, limites d'échantillonnage, configuration Android optionnelle, conditions de conformité et distinction rigoureuse **clic ≠ vente**.

**Acceptation :** `npm test`, SEO, publication sans Umami, WCAG, Android et Lighthouse ; absence de modifications des liens d'achat, des registres de preuves, du paiement désactivé et des données de prix. Aucun résultat de conversion ni revenu ne sera revendiqué sans export d'événements réel ou rapports marchands.

**Correctif de conformité associé :** `scripts/build-seo.mjs` publie désormais une notice active décrivant explicitement les comparaisons et catégories de filtres mesurées ; sans configuration Umami, la notice et les scripts reviennent à l'état sans suivi. `scripts/check-affiliate-publication.mjs` contrôle les deux versions, la reconstruction idempotente et l'absence de suivi après désactivation. La page légale est datée du 9 novembre 2026 ; les coordonnées de l'éditeur demeurent à compléter avant toute activation effective.


## 11. Lot P1 — 9 novembre 2026 : liens de sélection restaurables pour les 37 montres complémentaires

**Audit de départ :** `main@258dfd546707e271aef4b79d6c68f4d0d14ecd4e`. Le catalogue unifié de 52 montres sait déjà conserver ses filtres dans l'URL et restaurer un retour depuis une fiche. La sélection supplémentaire de 37 modèles ne proposait ni URL filtrée durable, ni partage, ni retour vers le sous-ensemble réellement consulté.

**Livraison :**
- `site/popular-filters.js` : lecture des critères validés `q`, `tier`, `style`, `movement`, `photo` et `asin` depuis la query string (valeurs limitées à celles des contrôles). Synchronisation locale des modifications sans chargement réseau ni collecteur analytique supplémentaire. Un lien partagé restaure les résultats réels.
- `scripts/build-popular-picks.mjs` et `site/popular-picks.css` : bouton « Partager cette sélection » visible seulement lorsque le JavaScript de filtrage est opérationnel ; Web Share natif Android, repli dans le presse-papiers, puis champ manuel sélectionné si les deux méthodes sont indisponibles. Statut annoncé par `role=status`.
- `site/catalogue-return.js` : retour sécurisé vers la collection réelle (52 ou 37 références) depuis la fiche, puis depuis les modèles associés. Un seul contexte de navigation, enregistré temporairement côté onglet (30 minutes), URL interne reconstruite à partir d'une **liste blanche stricte** ; les liens canonicals des 52 fiches restent inchangés. Les visites directes n'inventent pas de « retour à ma sélection ».
- `scripts/test-catalogue-search-browser.mjs` : vérifier sous Chromium Android les URL filtrées, partage natif, copie, repli manuel, restauration de la navigation liée, remise à zéro et fonctionnement sans JavaScript.

**Respect de la vie privée :** le texte libre de recherche n'est transmis ni à un service tiers ni à un compte client par le filtre ; il ne figure dans le lien que lorsque le visiteur choisit explicitement de partager sa sélection. Aucun prix, disponibilité, commission ou correspondance ASIN n'est ajouté. Aucun lien d'affiliation ni paiement n'est modifié.

**Barrières de fusion :** vérification de la syntaxe, tests SEO et publications, parcours Android, audit WCAG, build et contrôle de production sur le commit fusionné ; le gain de conversion ne pourra être estimé qu'à partir de statistiques réelles.


## 12. Lot P1 — 9 novembre 2026 : photographies premium des six sélections éditoriales

**Base réellement auditée :** `main@ce2afa7e65cc185f5e13996a5747db79d67fc9fc`, après fusion du retour aux sélections #245. Les pages `montres-femme-accessibles`, `montres-homme-style-accessible`, `montres-automatiques-selection`, `montres-skmei`, `montres-pagani-design` et `montres-numeriques` réutilisaient les photos sources en plein format sans `srcset`, `sizes`, ni dimensions dans les vignettes, alors que la vitrine principale livrait déjà les vraies déclinaisons WebP locales.

**Améliorations livrées :**
- `scripts/build-shopper-selections.mjs` : utiliser `responsiveAttrs` pour les modèles du catalogue principal et `responsivePopularAttrs` pour les images complémentaires, avec URLs et dimensions **tirées des registres autorisés**. Toute photographie sans dimensions sources fiables bloque la génération. Les originaux restent en repli haute résolution ; les modèles sans photographie gardent leur visuel typographique explicitement non contractuel.
- Chaque photographie publiée est un **lien natif accessible** vers la fiche du modèle exact, identifié par son nom dans l'intitulé accessible ; aucun JavaScript requis. Le texte alternatif de la photo décorative ne duplique pas cet intitulé.
- `site/shopper-selections.css` : studio photographique ivoire/forêt, cadrage propre, ombrage discret, étiquette « Photo du modèle », cibles cliquables et focus clavier visibles, animation supprimée avec `prefers-reduced-motion`.
- `scripts/test-intent-collections-browser.mjs` : contrôler **les six pages** et leur nombre de modèles, la correspondance stricte du fichier local à l'ID, les dimensions et le contenu des variantes réellement produites, un chargement WebP mobile sélectionné par Chromium et la navigation par l'image vers la bonne fiche. Garder les validations écran 320/393 px, desktop et sans JavaScript.

**Limites et critères :** ces photos reposent sur les autorisations déclarées par le responsable du site, non confirmées indépendamment ; aucune image de produit manquant n'est recréée comme représentation factuelle. Aucune donnée marchande, prix, ASIN, affiliation, paiement ou inventaire n'est modifiée. Valider les 4 CI de PR puis les 7 CI post-fusion, y compris Lighthouse de production **sans revendiquer de gain causal avant comparaison**.


## 13. Correctif de validation production — 9 novembre 2026

**Constat reproductible après #246 :** les quatre CI de PR étaient verts, dont les tests Android locaux sur les six collections. La version Render a servi les mêmes CSS/JS et références, mais l'audit Android post-fusion a mesuré le débordement dès `DOMContentLoaded` sur `montres-femme-accessibles`, avant de vérifier le calcul des styles. L'outil de test de production avait déjà un garde-fou identique sur la fiche Citizen, mais pas sur ces pages éditoriales. Deux tentatives post-fusion ont reproduit cet échec. La cause exacte du débordement ne doit pas être imputée au réseau avant contrôle complémentaire.

**Correctif soumis :**
- `scripts/test-mobile-storefront-v8.mjs` : attendre les **styles réellement calculés** (grille une colonne, photo masquée si débordement, lien photographique en position absolue) avant toute assertion géométrique, puis conserver le test strict du débordement et inclure des détails sur les premiers éléments fautifs en cas d'échec. Aucun simple `sleep` ou suppression d'assertion.
- `.github/workflows/test-published-watch-storefront.yml` : contrôler le contenu client exact des trois pages de sélection à six montres, et plus seulement l'existence de la grille et les nombres de cartes, avant de lancer le navigateur sur la version publiée. Les feuilles CSS étaient déjà comparées octet pour octet.
- `.github/workflows/lighthouse-mobile.yml` et `scripts/report-lighthouse-mobile.mjs` : inclure `shopper-selections.css` et son générateur dans les déclencheurs, vérifier la feuille publiée et mesurer réellement la page femme à six cartes avec un budget Lighthouse mobile explicite (un passage de laboratoire, sans attribution de ventes ou de Core Web Vitals terrain).

**Critère de fin :** 4 vérifications de PR vertes, génération statique puis contrôle Android de Render et Lighthouse sur **la version effectivement déployée** ; aucune régression de navigation, d'accessibilité, de source image ou de paiement.


**Correctif supplémentaire de préparation CI (après #247) :** les pages `site/montres/montres-femme-accessibles.html`, `montres-homme-style-accessible.html` et `montres-automatiques-selection.html` sont **générées par `scripts/build-seo.mjs`** et ne sont pas directement versionnées sur Git. Le nouveau garde-fou d'identité HTML de production doit donc reconstruire les WebP sources et ces pages dans le même job avant d'effectuer la comparaison. L'absence de cette étape provoquait des tentatives de synchronisation sans fichier local de référence. Le test rejette toujours une page Render différente, un style incomplet ou un véritable débordement Android.
