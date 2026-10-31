# Fiches produit interactives : conseils vérifiables pour 15 montres

Mise à jour : 31 octobre 2026.

## Contexte
Les pages indexables `/montres/{reference}.html` disposent déjà de trois conseils éditoriaux originaux, propres à chaque référence et validés à la génération. Le parcours issu de la **collection** aboutissait à `/montre.html?id={reference}` : les caractéristiques étaient présentes, mais le visiteur ne retrouvait pas ces conseils.

## Fonctionnement livré
- Chaque fiche interactive charge, **sans bloquer les caractéristiques ni la photo**, le fichier partagé `site/editorial-insights.json`.
- Trois cartes distinctes : **Ce qui la distingue**, **À qui elle peut parler**, **Point à contrôler**. Le texte est celui de la référence exacte, sans ajouter d'essai physique, de prix ou de stock supposé.
- Les faits en bas de section proviennent exclusivement de `selection-affiliation.json`, avec une clé `facts` déclarée dans la synthèse pour cette référence et un contrôle de présence dans `specs`.
- Un lien « Lire notre analyse » apparaît dans la navigation rapide **uniquement quand le contenu est chargé et validé**.
- Mise en page responsive trois colonnes desktop et une colonne à 800 pixels et moins, lisible également à 320 pixels CSS ; focus visible sur les liens.
- Aucune photographie additionnelle ni ressource payante.

## Résilience et sécurité
La source auxiliaire est soumise à une validation stricte de version, nombre de faits, unicité, types et présence des caractéristiques dans le catalogue. Le rendu emploie `textContent` pour ne jamais injecter de HTML venu du JSON. En cas d'erreur réseau, de source invalide ou d'information manquante, **la section et son raccourci restent cachés**, tandis que la fiche, la photo, les liens fabricant, le partage, les favoris et le comparateur restent fonctionnels.

## Validation
La suite Playwright `scripts/test-mobile-storefront-v8.mjs` vérifie :
- la correspondance textuelle et les valeurs factuelles des **15 références** avec la source éditoriale et le catalogue ;
- la présence du raccourci seulement lorsque la section est valide ;
- la résistance à une erreur `503` du fichier éditorial ;
- l'absence de débordement horizontal sur 393 et 320 pixels CSS et la capture de la fiche à 320 pixels.

Cela complète, sans les remplacer, les audits WCAG axe-core, reflow à 400 % et Lighthouse du site public.

## Restriction
Ces conseils restent des **analyses documentaires** et non des tests réels des montres. Les permissions des photographies sont déclarées par le propriétaire du site ; les licences écrites et contrôlables devront être constituées séparément.
