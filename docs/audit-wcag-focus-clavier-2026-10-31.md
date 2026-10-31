# Audit WCAG : vérifications clavier et focus des fenêtres modales

Date : 31 octobre 2026. Objectif : compléter le scan axe-core des pages du site par des vérifications du comportement réel des interactions, testées à 393 px et à 1366 px avec Playwright Chromium.

## Couverture complémentaire
- Ouvrir le comparateur à la touche Entrée après sélection de deux références.
- Vérifier qu'aucun des huit déplacements `Tab` ne peut déplacer le focus hors de la boîte de dialogue ouverte.
- Activer et désactiver « Différences uniquement » avec la barre espace.
- Sur Android : utiliser les flèches droite et gauche dans le rail horizontal des montres et vérifier l'indicateur 1/2, 2/2.
- Fermer le comparateur à `Escape` et vérifier que le focus revient sur le bouton « Comparer les montres ».
- Avec trois références choisies, tenter d'en sélectionner une quatrième : la boîte de remplacement doit recevoir le focus ; `Escape` ferme sans remplacer ni perdre la sélection.
- Ouvrir la visionneuse photo à `Entrée`, puis fermer à `Escape` et vérifier le retour du focus sur le bouton d'agrandissement.
- Ouvrir la navigation mobile à `Entrée`, puis exécuter axe-core sur le menu effectivement ouvert.

Chaque étape réussie est enregistrée dans `artifacts/accessibility-wcag-report.json` sous `interactionChecks`. Une échec est remonté comme scénario non résolu et bloque la publication avec `A11Y_ENFORCE=1`. L'audit exige au moins 25 vérifications explicites.

## Périmètre
Les tests restent **automatisés** : ils ne remplacent pas la revue avec lecteurs d'écran, ni un audit WCAG 2.2 AA exhaustif par une personne compétente. Aucun texte produit, visuel ou tracking n'est modifié pour cette étape.

## Reproductibilité
```sh
npm install --no-save playwright @axe-core/playwright
npx playwright install chromium
node scripts/build-seo.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
A11Y_ENFORCE=1 WATCH_STOREFRONT_URL=http://127.0.0.1:8765 node scripts/audit-accessibility.mjs
```
