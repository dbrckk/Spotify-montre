# AM-03 — parcours d'achat partenaire et provenance des offres Amazon.fr
*5 novembre 2026 — état observé, à réévaluer à chaque modification des sources*

## Objectif du chantier

Ne proposer un bouton rémunéré que pour une **référence de montre documentée par un ASIN propre**, avec la bonne identité de produit et un marquage publicitaire non équivoque. Préserver le choix du visiteur sur Android. Ne **jamais** présenter une fiche identifiée comme une disponibilité de stock, une preuve de vente, un prix ou une commission gagnée.

## Audit des 15 montres principales

Les trois registres inspectés sont `research/amazon-fr-exact-products.json` (provenance), `site/affiliate-links.json` (liens balisés et statut du programme) et `site/amazon-product-links.json` (carte publique publiée par le build). Résultat du relevé **du 30 octobre 2026**, non de la disponibilité actuelle :

- **13/15** modèles ont un ASIN Amazon.fr correspondant à la référence cataloguée (parfois avec un suffixe régional indiqué dans la recherche), et un lien public balisé `drackk04-21` enregistré dans le dépôt.
- **4/13** de ces fiches étaient signalées `unavailable_at_check` : `casio-mtp-1302`, `swatch-clearly`, `tissot-prx-quartz`, `seiko-sharp`. Cela **ne prouve pas** qu'elles sont actuellement indisponibles.
- **9/13** fiches sont signalées `not_checked` : **aucune disponibilité** n'avait été confirmée pour ces offres.
- **2/15** modèles restent sans lien Amazon.fr exact : `citizen-eco` et `tissot-prx-auto`. Ils ne doivent pas recevoir un ASIN de modèle voisin.
- L'identifiant de suivi et le site ont été confirmés par le propriétaire, mais le registre comporte toujours `approved:false` et `enrollmentStatus:enrolled_approval_unverified`. **Aucune approbation finale Amazon ni commission versée ne sont attestées.**

La recherche web publique de ce jour ne remplace pas une consultation authentifiée de chacune des 13 fiches : aucun état « en stock », prix ou livraison 2026 n'a été validé.

## Modifications réalisées

1. Le build SEO copie désormais le statut historique de chaque ASIN source vers `site/amazon-product-links.json`, sans lui donner une validité en temps réel.
2. Le tableau d'achat `site/achat-partenaires.js` exige une concordance complète : ID catalogue, ASIN, lien partenaire sécurisé, date de provenance et état de disponibilité dans le registre indépendant. Un registre falsifié ou incohérent entraîne un refus de l'ensemble des liens commerciaux.
3. Les quatre anciennes indisponibilités sont signalées sur les cartes (« indisponible lors du contrôle du 30/10/2026 ») et le libellé du bouton impose une vérification du stock. Les neuf autres affichent « disponibilité non vérifiée ». **Aucune des treize fiches n'est vendue par Atelier Montres**.
4. Si un visiteur arrive avec `acheter.html?modele=<identifiant-exact>`, cette référence est présentée en premier avec un repère visuel. Les filtres, les autres modèles et la navigation fabricant restent accessibles. L'ID non répertorié est ignoré.
5. Le code conserve une page utilisable sans JavaScript, le marquage `rel="nofollow sponsored noopener noreferrer"` des liens rémunérés et le verrou du checkout interne.

## Vérifications exigées

- `node scripts/check-amazon-exact-links.mjs` : 13 références concordantes, 2 manquantes, 4 indisponibilités historiques, aucune provenance inventée.
- `node scripts/build-seo.mjs` + `node scripts/validate-seo.mjs` : génération et contrôle des métadonnées publiées.
- `scripts/test-partner-purchase-browser.mjs` sous Playwright Android (390 px) : 13 fiches, états datés, quatre boutons avertis, ciblage `?modele=seiko-sharp`, filtres, garde-fous et mode sans JS.
- CI du site, tests Android et déploiement Render, sans visite automatisée de page de paiement Amazon et sans activité financière.

## Points restants pour clore AM-03

- Confirmer sur les fiches marchandes, **une par une**, la présence actuelle des 13 ASIN, le titre produit, la couleur/variante exacte et la disponibilité/livraison France, sans utiliser des résultats de recherche Google comme preuve d'offre réellement achetable.
- Retirer ou remplacer **seulement après preuve** les références remplacées/invalides. Ne pas retoucher automatiquement leur ASIN pour pointer vers un autre modèle.
- Vérifier les chemins d'achat et de retour vers chaque référence principale depuis l'accueil, les fiches et les comparateurs avec un parcours utilisateur réel sur Android.
- Contrôler séparément le statut officiel du compte Partenaires et les commissions dans les rapports officiels (AM-04).

## Source officielle de prudence

Amazon Partenaires indique qu'une fiche produit peut cesser de fonctionner lorsque le produit devient indisponible ou qu'une nouvelle édition reçoit un nouvel ASIN : https://partenaires.amazon.fr/help/node/topic/G28H2J7TRSU445JY

Les prix et stocks ne doivent jamais être extrapolés à partir du seul ASIN.
