# SKMEI — neuf illustrations IA originales publiées le 1er novembre 2026

## Objectif

Utiliser les **neuf créations IA approuvées par l'éditeur** pour enrichir le catalogue commercial Atelier Montres, sans remplacer ni déformer les **photographies réelles des montres exactes**.

Modèles couverts : 1251, 1257, 2056, 2514, 9156, 9353, 1874, 2471, 1220.

Chaque image a été créée dans cette conversation à partir d'un brief de style, puis redimensionnée en WebP 768 × 768 et téléversée via le compte Shopify connecté vers un CDN pérenne. Le registre `site/popular-ai-visuals.json` attache son URL, sa référence, sa provenance, l'approbation éditoriale et l'empreinte SHA-256 de la version WebP issue de cette création.

## Présentation publique

- **Accueil** : vignette IA discrète pour les modèles SKMEI mis en avant.
- **Catalogue complémentaire** : vignette IA sous le nom du modèle, sans déplacer la vraie photo principale.
- **Fiche détaillée** : vraie photo produit conservée dans le héros ; section artistique indépendante, avec image IA plus grande, explication des éventuelles différences et lien vers la fiche vendeur.
- **SEO** : ne pas employer les concepts IA comme photographies produit exactes dans `Product.image` ou les offres structurées ; garder les vraies images et sources.
- **Accessibilité** : alt explicite, dimensions indiquées, chargement différé et styles responsives, sans effet de mouvement imposé.

Ces illustrations peuvent différer de la montre vendue (aiguilles, cadrans, inscriptions, boutons, proportions). Elles ne sont jamais présentées comme photographies officielles SKMEI.

## Fiabilité et coût

Les neuf images sont servies par `cdn.shopify.com` depuis les médias du compte du propriétaire, sans appel IA au chargement et sans jetons payants par page vue. Leur affichage repose sur l'accès persistant à cette boutique et à son hébergement média. Le système conserve les photographies locales dans le dépôt en source principale, et les images IA sont accessoires.

La modification du registre refuse une URL hors du chemin CDN exact ou une image associée à une mauvaise référence SKMEI. Les tests d'intégration vérifient les neuf visuels et la séparation explicite entre image réelle et concept généré.

## Tests avant fusion

```sh
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
node scripts/check-affiliate-publication.mjs
npm test
```

La fusion doit attendre les validations SEO, vitrine, interactions mobiles et WCAG.
