# Livraison V9 — galerie de photographies et comparaison (27 octobre 2026)

**Site public déployé :** https://slippery-lens-4x9n6zu.shipstatic.com/

## Améliorations effectivement intégrées
- Visionneuse des photographies originales en grand format, incluse sur les cartes du catalogue et dans les fiches produit, avec fond clair et bouton d’agrandissement x2.
- Navigation entre les modèles visibles par flèches, clavier (flèches gauche/droite) et glissement tactile horizontal.
- Contrôles accessibles : dialogue modal natif, fermeture au clavier Échap, libellés et texte alternatif des montres.
- Filtre de mouvement indépendant des gammes, favoris, recherches et tris : quartz, automatique, Eco-Drive solaire. Réinitialisation en un clic en cas de recherche sans résultat.
- Comparaison de 2 à 3 montres enrichie : les critères dont les valeurs diffèrent sont mis en évidence, sans inventer les caractéristiques non renseignées.
- Conservation des 15 véritables fichiers locaux `site/assets/watches/*.webp` avec les URL des sources officielles comme métadonnées ; aucune conversion vers des images artificielles.
- Maintien des politiques de pré-lancement : pas de paiement, pas de prix / stock présentés comme synchronisés, pas de rémunération d’affiliation supposée.

## Architecture
- `site/photo-zoom.js` : visionneuse commune catalogue / fiches. Aucune bibliothèque tierce ni collecte de données.
- `site/photo-zoom.css` : direction artistique et responsive mobile, avec réduction du mouvement.
- `site/affiliation.js` : filtres, agrandissement depuis les cartes et comparaison des différences.
- `site/fiche.js` : agrandissement à partir de la page de détail, masqué automatiquement si photo indisponible.
- `site/affiliation.html` et `site/montre.html` : chargement des nouveaux composants.
- `scripts/validate-gallery-v9.mjs` : contrôle des éléments du catalogue, des 15 fichiers locaux et de la visionneuse.
- `scripts/test-mobile-storefront-v8.mjs` : tests réels de la nouvelle visionneuse, des filtres et des fiches dans Chromium.
- `.github/workflows/test-premium-mobile.yml` : exécute les tests mobiles lorsque le code concerné change.
- `.github/workflows/validate-live-photos.yml` : contrôle le chargement des photos sur l'URL publique.

## Vérifications
- `npm test` inclut la validation de la galerie.
- Le test mobile en local vérifie le décodage WebP, l'agrandissement, l'ouverture/fermeture, les mouvements, la recherche sans résultat et les comparaisons.
- Le lot ShipStatic V9 contient 15 fichiers WebP et les fichiers HTML, CSS, JS nécessaires aux pages publiques. Déploiement signalé `success`.

## Restant pour une exploitation commerciale
1. Vérifier les licences de réutilisation et les conditions d'affichage commercial des photographies.
2. Obtenir des flux d'affiliation agréés et contrôler les prix / disponibilités si souhaité.
3. Ajouter de véritables vues complémentaires (profil, fond de boîte, portée au poignet) lorsque des clichés exploitables existent, sans remplacer des modèles réels par des photomontages.
4. Gérer un domaine personnalisé et la configuration Shopify lors de l'ouverture effective de la boutique.
