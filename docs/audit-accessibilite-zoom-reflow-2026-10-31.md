# Audit d'accessibilité : grossissement navigateur et mise en page (31/10/2026)

## Pourquoi ce contrôle
La validation axe-core des 39 chemins HTML et les 33 scénarios clavier ne détectent pas à eux seuls tous les problèmes de **réorganisation à 400 %** (WCAG 2.2, critère 1.4.10). Un navigateur réglé à 400 % sur une page de 1280 pixels CSS présente une fenêtre logique proche de **320 pixels CSS**. À cette largeur, le texte et les actions doivent rester utilisables sans devoir déplacer toute la page horizontalement. Les tableaux techniques explicitement défilants peuvent conserver leur propre navigation horizontale.

## Implémentation
`scripts/audit-reflow.mjs` lance Chromium/Playwright avec une largeur de 320 pixels CSS, `reducedMotion: reduce`, puis :

- parcourt **tous les chemins HTML publiés** à partir du manifeste SEO et les autres pages `.html` (hors fichiers Google de vérification) ;
- mesure les débordements horizontaux **du document entier**, et liste les éléments susceptibles de les provoquer ;
- examine les présentations galerie et détails, le menu mobile, le formulaire conseiller, la fiche produit et un comparatif SEO ;
- ouvre le comparateur interactif, son filtre de différences, la fenêtre de remplacement et la visionneuse photo réelle ;
- vérifie que les actions clés (fermer, partager, filtrer, agrandir, lien source) tiennent dans la largeur logique et offrent au moins 24 pixels de cible ;
- vérifie qu'en largeur 320 la galerie comporte **une colonne** pour préserver la lisibilité.

Le workflow `.github/workflows/audit-accessibility.yml` exécute ce nouvel audit **après** axe-core, en mode bloquant `A11Y_ENFORCE=1`. Il conserve le JSON inspectable et plusieurs captures à 320 px, au même titre que le rapport axe-core.

## Limites et interprétation
Ce contrôle est une **simulation Playwright du reflow** à 320 pixels CSS, pas une commande du zoom natif Android ou une validation manuelle TalkBack/VoiceOver. Il ne garantit pas le respect de toutes les règles WCAG ; une revue avec technologies d'assistance et niveaux de zoom réels reste nécessaire. Les contrôles privilégient le débordement du document et les interactions essentielles, en autorisant le défilement propre à certains tableaux.

## Commandes sur un environnement Node avec Playwright
```sh
npm install --no-save playwright @axe-core/playwright
npx playwright install chromium
node scripts/build-seo.mjs
python3 -m http.server 8765 --bind 127.0.0.1 --directory site &
A11Y_ENFORCE=1 WATCH_STOREFRONT_URL=http://127.0.0.1:8765 node scripts/audit-reflow.mjs
```

Rapports : `artifacts/accessibility-reflow-report.json` et `artifacts/reflow/*.png` (captures générées en CI, pas enregistrées dans le dépôt).
