# Plan d'exécution — Atelier Montres (4 novembre 2026)

Dépôt : `dbrckk/Spotify-montre`, branche cible `main`. Plan établi après inspection de la tête `e9f21a6e38252287b45c8540f19ea3c225dc0dab` et des workflows réellement exécutés.

## Objectif produit

Vitrine indépendante de 52 références horlogères, attractive et accessible sur Android, liens partenaires documentés, puis vente directe avec paiement, fournisseur, livraison et marge vérifiés. **La vente directe doit rester désactivée** tant que l'entreprise, les paiements, les offres CJ et les coûts complets ne sont pas validés. Ne jamais simuler une commission, une commande fournisseur, une taxe nulle ou une disponibilité.

## Audit factuel

- Commit de référence : `e9f21a6e3` (04/11/2026). Les contrôles SEO, accessibilité, interaction mobile et Lighthouse passent ; le contrôle réel Render Android `41867857776` échoue.
- Échec reproduit dans les journaux Playwright : page `/montres/comparer-addiesdive-ad2030-vs-pagani-pd1701.html`, viewport **393 px**, images `img.am-duel-product-photo` à **440 px**, débordement horizontal (448 px de scroll). La page est générée par `scripts/build-affordable-comparisons.mjs` et stylée par `site/affordable-comparisons.css`.
- Les 52 montres, le parcours partenaire et la préparation du commerce CJ/Mollie existent, mais `site/config.json` maintient `checkoutMode: inactive` ; cela ne constitue pas une vente opérationnelle.
- Les investigations CJ du 04/11/2026 n'ont pas démontré de devis final TTC livré ni de variante autorisée à encaisser ; les 13 propositions de transport de la variante testée ont été écartées par les garde-fous de coûts.

## P0 — Correction livrable immédiatement (ce changement)

1. Empêcher la largeur intrinsèque de 440 px des packshots de forcer le document sur Android : contraintes de taille en **CSS** et dimensions de secours directement sur la balise générée. Ne pas rogner les photographies de manière arbitraire.
2. Confirmer que le comparatif possède sa feuille de style et que celle-ci a effectivement pris effet *avant* l'assertion de largeur du navigateur (attendre l'état `load`). Ne pas « corriger » un test par suppression du contrôle de débordement.
3. Ajouter la présence de la référence de feuille CSS des quatre duels au contrôle de préparation du Render réel ; les octets CSS sont déjà comparés à la source par ce même workflow.
4. Sur la PR, exiger les contrôles `SEO storefront checks` et `Validate premium mobile catalogue interactions`. Après fusion et publication Render, exiger un nouveau résultat vert de `Verify production Render watch storefront on Android`. S'assurer que le viewport 320 px sans JS est également couvert.

**Acceptation P0 :** zéro débordement horizontal à 320 et 393 px sur les quatre comparatifs, CSS chargée, photos responsives et scripts/tables inchangés, CI locale de PR verte, puis test Render réel vert.

## P1 — Convertir sans tromper

1. Maintenir une liste des seules fiches Amazon précises et de l'état de chaque programme partenaire ; distinguer les liens rémunérés vérifiés des recherches et des liens fabricants non rémunérés.
2. Pour CJ, sélectionner **une** référence exacte et demander prix du produit, variante PID/VID, stock, frais de livraison France, TVA/droits/traitement douanier documentés, délais, conformité GPSR, garanties et droit de rétractation. Aucun montant absent ne vaut zéro.
3. Enregistrer une offre unique qualifiée dans le moteur de devis et vérifier sa marge conservatrice après coût rendu, frais de paiement, litiges et réserve SAV. Aucune publication d'offre sans preuve complète et valide.
4. Valider l'identité du vendeur, les mentions légales, CGV, politique de retours, prestataire de paiement Mollie et la base de données persistante avant de passer `checkoutMode` à `active`.
5. Effectuer ensuite une commande contrôlée de bout en bout (paiement réel/sandbox approprié, confirmation serveur, idempotence, transmission CJ et suivi), avant toute activation publique. Les simulations internes ne prouvent pas la capacité de livraison réelle.

## P2 — Croissance et présentation

- Mesurer réellement, de façon agrégée et respectueuse du choix Do Not Track, les clics par emplacement de la vitrine partenaire ; **un clic n'est pas une vente**.
- Réduire les ruptures de navigation Android entre galerie, comparaison, fiche, fournisseur ; vérifier la visibilité du prix réel chez le marchand sans en inventer sur le site.
- Optimiser le chargement des images locales, le LCP mobile et les textes de choix/documentation de modèles existants plutôt que multiplier des pages presque identiques.
- Analyser Search Console lorsque des données temporelles suffisantes sont disponibles ; ne jamais promettre une position dans Google.

## Contraintes de publication

- Pas de nouveaux secrets/API keys, jetons, devis client ou adresses dans GitHub, ses journaux ou ses artefacts.
- Pas de changement d'architecture vers Shopify ; la boutique est le frontend indépendant du dépôt.
- Pas d'activation artificielle de Mollie/CJ ni de fausses indications de ventes, stocks, prix, reviews ou permissions photographiques.
- Le résultat P0 est une **correction proposée** tant que la PR n'est pas fusionnée et que le workflow de production n'est pas vert.

## Références de suivi

- Échec production : https://github.com/dbrckk/Spotify-montre/actions/runs/41867857776
- Roadmap produit globale : `docs/ROADMAP_VENTE_DIRECTE_AUTOMATISEE_2026-11-02.md`
- Diagnostic CJ : `docs/DIAGNOSTIC_DEVIS_CJ_CIBLE_2026-11-04.md`
- Contrôle Playwright : `scripts/test-unified-compare-tray.mjs`
