# Comparaisons approfondies — Atelier Montres

Date : 30 octobre 2026 · Dépôt `dbrckk/Spotify-montre`

## Objectif

Proposer des comparatifs utiles avant achat, consultables sur Android et indexables par les moteurs de recherche, sans inventer de caractéristiques, de prix, de disponibilité ou d'évaluations clients. Les données techniques viennent exclusivement de `site/selection-affiliation.json`, et les URL externes du catalogue des fabricants et de la recherche d'ASIN exacts déjà validée.

## Quatre comparatifs publiés

| Duo | Question principale | Données utiles |
| --- | --- | --- |
| Tissot PRX Quartz / PRX Powermatic 80 | Quartz ou mécanique automatique ? | 40 mm, verre, mouvement, 10 bar |
| Citizen Tsuyosa / Tissot PRX automatique | Deux automatiques sport chic : quelles différences ? | 40 mm, verre saphir, 5 / 10 bar |
| Casio MTP-B145 / MTP-1302 | Quel format de boîtier ? | 35 / 38,5 mm, quartz, minéral, 5 bar |
| Orient Bambino 38 / Hamilton Khaki Field Auto | Montre classique ou de terrain ? | 38,4 / 38 mm, minéral / saphir, 3 / 10 bar |

La comparaison doit clairement signaler les données absentes. **L'étanchéité en bar ne se traduit pas automatiquement en profondeur de plongée ou en usage autorisé**. Les préférences de style sont présentées comme des critères de choix et non comme un classement universel.

## Architecture

- Source éditoriale : `site/comparaisons-montres.json` (références par ID, texte rédigé).
- Générateur : `scripts/build-comparisons.mjs`, appelé par `scripts/build-seo.mjs`.
- Sortie : quatre pages `site/montres/comparer-*.html`, liens sur la page d'accueil sous **Comparer deux montres, vraiment**, liens de retour depuis les fiches des modèles, sitemap et manifeste SEO mis à jour.
- Visuels : SVG original `site/watch-illustrations.js` et `site/seo-watch-art.js`. **Aucune photographie constructeur non licenciée n'est chargée par ces pages.**
- Commercial : lien fabricant exact et, uniquement pour les 13 ASIN documentés, lien Amazon.fr direct non rémunéré par défaut. Si une configuration Partenaires valide est approuvée, le lien est marqué `sponsored` avec la mention réglementaire.
- Confidentialité : si Umami est activé explicitement, les clics Amazon sur ces pages portent l'emplacement `seo` comme les fiches existantes. Aucun traqueur sinon.

## Contrôles avant publication

- `npm test` vérifie le module, l'intégration des liens et les protections d'affiliation.
- `node scripts/build-seo.mjs && node scripts/build-seo.mjs && node scripts/validate-seo.mjs` vérifie la génération idempotente, quatre duels et **25 URL indexables** (15 produits, 4 guides, 4 duels, accueil, conseiller).
- `scripts/test-watch-comparisons-browser.mjs` vérifie les quatre parcours mobiles dans Chromium, la présence de deux illustrations originales, les liens fabricants, le tableau des données et les liens de retour depuis les pages produit. Une capture desktop est produite.
- La compilation refuse désormais tout **lien rémunéré Amazon dont l'ASIN ne correspond pas au produit exact déjà confirmé**. Une simple déclaration `productMatchConfirmed:true` ne suffit plus.

## Prolongement sans dilution

Avant d'ajouter d'autres duels, vérifier qu'ils répondent à une vraie question de visiteur et comportent suffisamment de spécifications documentées ; les pages quasi identiques ou calculées à partir de données manquantes n'apportent pas de valeur. Ne pas transformer le site en marchand tant que l'identité commerciale, les fournisseurs, la conformité produit et les paiements ne sont pas réellement opérationnels.
