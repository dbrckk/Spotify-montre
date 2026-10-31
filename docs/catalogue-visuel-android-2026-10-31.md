# Atelier Montres — catalogue photographique et mobile

Mise à jour du 31 octobre 2026. Répertoire principal : `dbrckk/Spotify-montre`, branche `main`. Production : `https://atelier-montres-selection-fr.onrender.com/`.

## Produit et architecture

Le catalogue propose **15 références exactes** issues de `site/selection-affiliation.json`. Les photos WebP locales publiées ont une permission d'usage déclarée par l'éditeur, non indépendamment vérifiée. Aucun remplacement visuel généré, prix, stock ou avis non établi n'a été ajouté.

L'utilisateur découvre, dans cet ordre : accueil photographique, trois gammes, **catalogue réel**, galerie éditoriale, puis guides et comparaisons utiles au référencement. Les sections SEO restent indexables, mais ne repoussent plus les produits sous de longues sections textuelles.

Sur mobile, les trois liens de catégorie (`quartz`, `Casio`, `petit boîtier`) sont un rail horizontal accessible au toucher et au clavier, avec défilement natif et `scroll-snap`, sans bibliothèque.

## Photographies réelles et identité

- Les quinze cartes de la galerie utilisent un **fond neutre homogène** indépendamment de la couleur du cadran et respectent les originaux `object-fit: contain`.
- La galerie conserve ses deux colonnes à largeur mobile habituelle et son mode **Détails** pleine largeur ; le choix reste mémorisé localement.
- Les zones des modèles, des faits documentés et des boutons sont alignées par les mêmes règles de mise en page ; favori et comparaison conservent leurs interactions.
- Les photos n'ont pas été retouchées ni recréées à partir de modèles supposés ; l'image originale reste disponible en secours et dans le zoom.
- Les CTA Amazon autorisés, leurs mentions « lien rémunéré », les liens officiels et la déclaration Amazon globale restent visibles, conformément aux règles déjà codées.

## Optimisation réseau

- `site/affiliation.js` choisit `sizes` selon le **mode réel** d'affichage de la grille (galerie ou détails) ; il met les tailles à jour lors du basculement sans remplacer les cartes ni leur état.
- Les miniatures de l'historique privé (`120px`) et de la comparaison (`40px`) utilisent les variantes WebP 480/800px lorsque pertinentes, avec repli vers l'original.
- `site/editorial-photo.js` fait de même pour le carrousel de couverture et les trois photographies éditoriales.
- Les variantes ne sont jamais créées en agrandissant une source trop petite : `swatch-clearly` à 399px garde son original.
- `site/seo-guides.css` réserve une hauteur prévisible aux photos des fiches statiques mobiles pour réduire les déplacements de contenu pendant le chargement.

## Contrôles avant diffusion

`npm test && node scripts/build-seo.mjs && node scripts/validate-seo.mjs` vérifie les 15 produits, les liens et pages SEO.

Les workflows GitHub utilisent Playwright avec screenshots Android et desktop ; ils valident notamment :

- L'ordre catalogue avant les guides et les comparatifs.
- Trois chemins de découverte et la possibilité de les faire défiler sur Android.
- L'identité des 15 photos et l'homogénéité de leurs fonds.
- Les tailles `sizes` correctes pour la grille deux colonnes et la présentation pleine largeur.
- Les images adaptatives du lookbook et les photos locales réelles.
- Les filtres, le zoom, les favoris, les comparaisons et les mentions de rémunération.
- L'absence de débordement horizontal dans les pages visitées.

Les workflows les plus lourds ont une clause `concurrency` pour annuler les exécutions obsolètes lorsqu'un commit plus récent arrive. La vérification publique attend les **octets exacts** des CSS/JS déployés pour éviter de contrôler par erreur la version Render précédente. Lighthouse suit la médiane de trois mesures d'accueil et une fiche Casio, avec attente préalable du CSS exact.

**Interprétation :** les scores Lighthouse sont des mesures de laboratoire, pas des Core Web Vitals réels ni une position dans Google. Les exports Search Console ne sont pas encore à utiliser pour des décisions SEO : le site est trop récent.

## Fichiers principaux

- `site/affiliation.html` : ordre des sections et catalogue.
- `scripts/build-seo.mjs` : génération des sections et pages canoniques, sans supprimer le SEO éditorial.
- `site/catalogue-view.css` : photographie et rail de découverte.
- `site/affiliation.js` : tailles adaptatives et boutons.
- `site/editorial-photo.js` : photos de couverture et galerie.
- `site/seo-guides.css` : stabilité des fiches canoniques.
- `scripts/test-mobile-storefront-v8.mjs` : navigation et géométrie du catalogue.
- `scripts/test-mobile-live-storefront.mjs` : contrôle des vraies photos Android sur Render.
- `.github/workflows/test-premium-mobile.yml`, `.github/workflows/test-published-watch-storefront.yml`, `.github/workflows/lighthouse-mobile.yml` : gardes d'intégration et de déploiement.

**Priorités restantes :** renforcer les preuves d'autorisations photo, enrichir les caractéristiques manquantes à partir des fabricants, vérifier la stabilité visuelle et le poids du réseau avec plusieurs téléphones, puis mesurer le trafic et les conversions seulement lorsque des données réelles suffisantes existent.
