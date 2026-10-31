# Lisibilité premium du catalogue — 31 octobre 2026

## Problème
La grille photo de montres sur Android est volontairement en deux colonnes pour la découverte rapide. Plusieurs éléments secondaires (marque, caractéristiques, liens affiliés, notes de rémunération, liens vers la fiche) descendaient à 12 px malgré la feuille premium.

## Correction
La feuille commune `site/premium-system.css`, chargée en dernier, relève :
- les indications de marque, caractéristiques vérifiées, notes commerciales et liens secondaires à **13 px minimum** ;
- les boutons principaux des cartes en mode galerie à **14 px minimum** ;
- les légendes photo, résumés et métadonnées de fiches à **13 px** ;
- le compteur de navigation du comparateur mobile à **14 px**.

Aucun produit, URL, photographie, donnée de prix ou libellé publicitaire n'est modifié. La grille à deux colonnes sur Android reste l'objectif de conception ; sous 350 px elle reste en une colonne.

## Validation avant fusion
`scripts/test-premium-readability.mjs` inspecte les tailles CSS calculées sur les galeries à 360, 393, 430 et 768 px ; vérifie qu'il n'existe pas de débordement horizontal, que les contrôles tactiles restent adaptés, que les photos sont présentes et conserve des captures Android/tablette. Le workflow WCAG assure en parallèle le reflow 320 px et la police racine 200 %. Ces contrôles automatisés ne remplacent pas une inspection humaine de chaque capture.
