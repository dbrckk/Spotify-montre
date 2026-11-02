# Atelier Montres — fiches et conseiller en identité premium
**3 novembre 2026 — refonte de l’expérience produit, code réellement intégré**

## Objectif

Étendre l'identité **graphite / champagne / porcelaine** adoptée sur l'accueil et le catalogue de 52 modèles aux pages concrètes où les visiteurs font leur choix : le conseiller, les fiches interactives et les 52 pages SEO de montres. Garder **toutes les caractéristiques sourcées**, la transparence rémunération et le mode de paiement désactivé.

## Références réellement étudiées

Dans [`dbrckk/star-list/WEB_RESOURCES.md`](https://github.com/dbrckk/star-list/blob/main/WEB_RESOURCES.md), **Mobbin** suggère de raccourcir les chemins de découverte, **Awwwards / Recent.design** favorisent une scénographie cohérente autour de la photo produit, **60fps.design** préconise des interactions visuelles légères. Ces sites servent de **références de recherche seulement** : aucune image, copie de maquette, composant payant, script ou service n'en provient.

## Changements livrés

1. **Conseiller** : scène graphite à grand cadran Citizen photographié ; trois entrées d'inspiration avec les fichiers déjà autorisés **SKMEI 2056**, **Citizen Tsuyosa** et **Pagani PD-1701**. Les liens utilisent les paramètres `style=retro`, `movement=automatic`, `style=sport` déjà reconnus par le moteur et ouvrent la section des trois recommandations. Pas de backend ou d'IA facturée.
2. **Formulaire** : contrastes, étiquettes et boutons de sélection refondus, états cochés visiblement différenciés, focus clavier, grande surface tactile.
3. **Suggestions** : vrais packshots quand publiables, cadres et ombres légers, explication de correspondance lisible, accès fabricant et fiche détaillée distincts.
4. **Fiche interactive des 15 modèles** : photo dominante sur fond neutre, caractéristiques rapides, liens de partage, favoris et comparaison, sources fabricants et alternatives ; nouvel accès à l'intégralité des **52 montres**.
5. **Fiches indexables des 52 modèles** : ajout ciblé de la feuille de style dans le générateur pour `type=product` uniquement. Les données `Product` JSON-LD, URL canonique, images autorisées et liens externes restent inchangés.
6. **Ressources** : HTML/CSS natifs et fichiers WebP déjà présents ; aucune police, bibliothèque, API ou image distante supplémentaire.

### Fichiers

- `site/editorial-product-advisor-2026.css` : système visuel responsive, animations réduites et survol non requis.
- `site/conseiller.html` : entrée par intentions et nouvelle feuille de style.
- `site/montre.html` : identité unifiée et lien vers 52 modèles.
- `scripts/build-seo.mjs` : feuille de style embarquée dans les pages produit générées.
- `scripts/check-editorial-product-advisor.mjs` : intégrité des images, liens, feuille de style et `checkoutMode=inactive`.
- `scripts/test-editorial-product-advisor-browser.mjs` : tests Playwright à 360, 393, 768 et 1366 px ; préférences réellement appliquées, trois types de fiches et photographies, absence de débordement ; captures d'écran GitHub Actions.

## Risques et critères avant fusion

- Le rendu repose sur les données photo déjà déclarées autorisées dans le dépôt ; une photo de référence absente reste explicitement un **fallback éditorial**, jamais une photo fabricant inventée.
- Les fiches marchandes ne garantissent ni stock ni prix. La vente directe et le paiement fournisseur **restent inactifs** ; aucune offre créée pour cette refonte.
- Les contrôles GitHub SEO, Android/desktop, commerce et accessibilité WCAG doivent réussir sur la version finale avant fusion et redéploiement.
- Les tests ne remplacent pas une validation juridique des droits photo ou du statut marchand.

## Suite visuelle

Après publication : analyser les scores Lighthouse mobile (LCP et interaction), vérifier la cohérence de toutes les pages produit depuis Android, puis travailler les contenus photographiques complémentaires uniquement avec les droits et références exactes documentés.
