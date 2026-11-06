# Atelier Montres — refonte de la boutique publique et vente directe

Date : 6 novembre 2026. Document d'exécution, non présentation d'une boutique encaissant déjà.

## Objectif client

Une expérience haut de gamme visuellement, mais accessible à une personne gagnant approximativement le SMIC. L'objectif n'est pas de faire croire que toutes les références sont à acheter immédiatement ou au prix d'une catégorie : la présentation doit valoriser des modèles exacts et permettre d'explorer des budgets, avant une future commande **auprès d'Atelier Montres** et son traitement fournisseur en arrière-plan.

### Gammes de recherche, pas prix de caisse

| Univers | Budget indicatif pour commencer à chercher | Exemples existants documentés |
| --- | --- | --- |
| Accessible | 20–120 € | Casio MTP-1302, Casio MDV-107 ; catalogue complémentaire SKMEI et ADDIESDIVE |
| Intermédiaire | 150–450 € | Citizen Tsuyosa, Seiko 5 Sports ; Orient dans la collection |
| Haut de gamme accessible | 500–1 200 € | Tissot PRX Powermatic 80, Hamilton Khaki Field Auto |

Les exemples sont des références éditoriales : aucun montant de ces fourchettes n'est un prix de vente garanti, ni une preuve de stock, de livraison ou d'offre CJ.

## Plan et exécution

### 1. Vitrine haut de gamme et claire — implémenté

- Accueil image-first : véritable packshot Citizen existant, typographie éditoriale, fond vert forêt, détails bronze, lisibilité et boutons clairs.
- Navigation prioritaire « Par budget » ; trois catégories détaillées, accessibles au clavier et sur Android, avec montres réelles.
- Six fiches visibles dans le showroom, deux par gamme : tous les IDs, les pages de détail et les six WebP autorisés proviennent du registre existant `selection-affiliation.json`.
- Cartes premium, photos agrandies et nouveaux rythmes verticaux, sans services de polices payants ni dépendance JavaScript supplémentaire.
- Aucun faux prix, faux stock, badge d'achat simulé, ni paiement activé.

Fichiers : `site/index.html`, `site/public-home.css` conservé, et nouvelles règles dans `site/premium-showroom.css`.

### 2. Continuité visuelle des pages de décision — implémenté

- Harmonisation des couleurs, cartouches et typographie sur `affiliation.html`, `montre.html`, `acheter.html`.
- Budgets repères affichés à côté des trois gammes du comparatif 15 références.
- Amélioration de la grille du catalogue 52 via `site/unified-discovery.css` : packshots locaux agrandis, contrôles affinés, typographie et affichage mobile.
- Aucun essai de transformer les 37 modèles documentés sans photographie approuvée en photographies prétendument réelles.

### 3. Parcours marchand, pas affiliation par défaut — architecture déjà présente, activation bloquée

1. Sur une référence **vérifiée dans l'API**, `direct-offer-links.js` affiche « Acheter sur Atelier Montres » **avec son vrai prix total TTC**, seulement si la vitrine est active et si le serveur confirme le catalogue achetable.
2. Le client envoie sa commande **à Atelier Montres**, avec une référence de tentative idempotente et ses informations de livraison ; la boutique confie le règlement au prestataire sécurisé Mollie.
3. Le backend vérifie le paiement auprès de Mollie. Après confirmation, il transmet l'ordre fournisseur CJ correspondant à l'identité PID/VID/SKU exacte et à l'adresse du client, puis assure la reprise, le rapprochement et le suivi.
4. En cas d'interruption de paiement, la tentative déjà enregistrée peut être retrouvée sans création de nouveau paiement.

Le prestataire de paiement peut héberger sa page sécurisée ; l'acheteur **ne commande pas chez le fournisseur** ni chez Amazon dans cette transaction. Les liens Amazon, lorsqu'ils existent sur d'autres références, sont un parcours de vente partenaire distinct.

**La caisse directe reste volontairement inactive** (`site/config.json`, `checkoutMode=inactive`). Ne pas promettre de vente live ni changer ce verrou pour démontrer une interface.

### 4. Conditions de mise en vente réelle — toujours bloquantes

- Identité légale vendeur, CGV complètes et vérifiées, confidentialité réelle, informations SAV/retours/garanties/garantie de conformité et obligations françaises.
- Réponse écrite CJ et coût produit + transport + TVA/import/douane/dédouanement/frais rendu France, Incoterm, origine, importateur, délai, tracking, restrictions et conformité de la **variante exacte**.
- Recalcul documenté de la marge TTC après coût fournisseur tout compris, réserves retours/SAV, commissions de paiement et change.
- Compte Mollie marchand live autorisé, clés privées et webhook sur Render, environnement CJ opérationnel et capacité de financement fournisseur.
- Qualification de l'offre en base, puis vérification de l'API en production, des contrats, des retours et d'une première commande réelle supervisée.

Référence pilote du dossier fournisseur : `CJZBNSET00031-black`. Une absence de réponse ou un ticket ouvert ne constitue pas une validation de prix.

### 5. Vérifications de sécurité et de rendu

- Nouveau `scripts/check-premium-showroom.mjs` : six IDs exacts, images WebP locales réellement existantes et approuvées dans le registre, trois ancres de budget, avertissements de prix indicatifs, texte d'expédition fournisseur, caisse désactivée, absence de boutons d'achat fictifs et adaptation mobile.
- Ce contrôle est intégré à `npm test` et `npm run lint`.
- Les tests du navigateur mobile, la validation SEO, l'accessibilité et le contrôle de sécurité commerce sont exécutés par les workflows GitHub de la PR.
- Vérification visuelle finale sur URL de production après fusion et déploiement Render requise : pas de validation graphique réelle sans rendu navigateur.

## Correction de la page d'achat publique (6 novembre 2026)

- Auparavant, `showPrelaunch()` masquait simultanément `#amDirectCommerce` **et** la carte `#amDirectPrelaunch` qu'il devait afficher. Le visiteur ne voyait pas la raison de l'indisponibilité.
- Désormais, lorsque le paiement n'est pas ouvert ou que la configuration commerciale est inaccessible, le panneau de pré-lancement et le message d'état sont visibles. **Le formulaire et les quatre étapes de paiement restent masqués**.
- Une arrivée avec `?modele=<référence>` indique explicitement qu'aucune vente directe de cette référence n'est possible en période de suspension ; une panne réseau n'est pas confondue avec une indisponibilité commerciale vérifiée.
- L'écran est présenté sur une colonne sur Android, y compris pour la reprise d'une tentative existante. La version sans JavaScript conserve la vitrine et les liens d'exploration sans afficher le paiement.
- Tests Playwright de la panne de configuration, du gel commercial, de la référence exacte et du débordement mobile. Aucune transaction réelle, aucun changement du verrou `checkoutMode`.

## Prochain travail à valeur réelle

Au lieu d'augmenter artificiellement le catalogue ou d'ouvrir des caisses fictives, obtenir un devis écrit CJ complet pour une seule référence, sélectionner et qualifier sa variante exacte, valider le vendeur et le paiement, puis ouvrir **une seule offre réellement achetable**. En parallèle, améliorer la qualité photographique uniquement avec des sources autorisées correspondant précisément au SKU affiché.
