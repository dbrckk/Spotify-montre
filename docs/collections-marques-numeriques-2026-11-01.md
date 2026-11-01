# Collections SKMEI, Pagani Design et montres numériques — 1er novembre 2026

## But

Compléter les six parcours de découverte existants avec **trois pages indépendantes** correspondant à une recherche concrète, sans multiplier des pages quasi identiques uniquement pour attirer des clics. Le projet couvre 52 montres réelles documentées (15 historiques et 37 complémentaires). Les collections ci-dessous ne prétendent pas refléter l'intégralité d'un catalogue fabricant ni les ventes Amazon.

| Page et intention | Couverture contrôlée | Particularités utiles |
| --- | --- | --- |
| `/montres/montres-skmei.html` | **10 SKMEI** | Numériques rétro, hybrides, analogiques et chronographe, comparatif 2056/2256/9156 |
| `/montres/montres-pagani-design.html` | **3 Pagani Design** | PD1701 quartz VK63 annoncé, PD1751 automatique NH35 annoncé, PD1776 quartz VH65 annoncé |
| `/montres/montres-numeriques.html` | **12 références** SKMEI/Casio | Sépare les affichages entièrement numériques et les hybrides analogiques-numériques, comparatif 2056/F-91W/2471 |

## Comportement

- Fiches et images intégralement intégrées au HTML statique, visibles sans JavaScript et accessibles depuis les navigations de l'accueil et des 37 modèles complémentaires.
- Chaque collection fournit une présentation éditoriale adaptée, **trois conseils spécifiques** et un tableau avec **chaque référence** (mouvement annoncé, dimensions documentées, verre, étanchéité). Les éléments inconnus restent « Non documenté ».
- Deux liens HTML ordinaires ouvrent la comparaison réelle dans le catalogue de 52 modèles par `?compare=<id1>,<id2>,<id3>#comparer`. Aucun prix, avis client ni disponibilité ne sont calculés ou affichés.
- Les cartes réutilisent les liens Amazon et fabricants approuvés par les contrôles préexistants. Une recherche Amazon est toujours présentée comme une recherche non garantie ; les programmes Awin demeurent inactifs.
- Les photographies locales sont présentées uniquement lorsque le registre source les autorise **sur déclaration du propriétaire**, sans prétendre à une vérification indépendante des droits.
- Page auto-canonique `rel=canonical`, métadonnées éditoriales descriptives, JSON-LD `CollectionPage` + `ItemList`, et inclusion dans le sitemap : **71 → 74 URL**.
- Le générateur compare les groupes de produits réels à leurs IDs attendus à chaque build et **échoue** si de nouvelles références SKMEI/Pagani/numériques sont ajoutées sans mise à jour éditoriale de la collection. Aucune inclusion silencieuse ou attribution de prix inféré.

## Contrôles

Les règles de `scripts/validate-seo.mjs` vérifient l'exhaustivité des 10/3/12 références, les trois tableaux, leurs deux liens de comparaison, les 74 canoniques, les métadonnées JSON-LD, la présence des photographies enregistrées et les liens internes vers toutes les fiches. Le test `scripts/test-intent-collections-browser.mjs` valide Android 320/393 px, ordinateur, navigation depuis l'accueil, utilisation sans JavaScript et comparaison interactive effective des trois Pagani Design.

L'amélioration du référencement naturel n'est pas une promesse de positionnement : l'indexation, le classement et le trafic devront être suivis dans Google Search Console. Pour la stratégie, privilégier la qualité éditoriale, des liens HTML directement explorables et les informations réellement utiles aux acheteurs, conformément à Google Search Central :

- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable

**Hors périmètre :** inscription commerciale Awin, vérification de droits photographiques indépendante, prix en temps réel, stock, calcul de commission et commande sur site.
