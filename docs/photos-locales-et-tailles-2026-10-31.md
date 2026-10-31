# Images locales et dimensions de boîtier — 31 octobre 2026

## Publication photographique

Les 15 WebP sont publiés sur la base d'une déclaration d'autorisation du responsable du site ; **aucune preuve indépendante des droits n'a été obtenue**. Cela n'est pas une licence constructeur démontrée.

Les interfaces publiques (`site/affiliation.js`, `site/fiche.js`, `site/photo-zoom.js` et `site/editorial-photo.js`) utilisent exclusivement les fichiers déjà présents dans `./assets/watches/` et les dérivés locaux `./assets/watch-responsive/`. Les URL de recherche `photoReview.url` et `photoReview.source` restent des métadonnées de provenance et **ne sont jamais appelées par le navigateur** pour afficher une image.

En cas d'échec du chargement d'un dérivé, le navigateur réessaie l'original local. Si l'original manque aussi, la carte ou la fiche affiche une **illustration éditoriale originale clairement identifiée**. La visionneuse agrandie indique que la photo est indisponible. Le lien de la fiche constructeur reste disponible.

Cette politique évite le « hotlink » vers des serveurs de fabricants ou de revendeurs, réduit les dépendances réseau et évite de divulguer le parcours d'un visiteur aux hébergeurs de photos. Elle ne remplace pas la collecte de justificatifs d'utilisation commerciale des images.

## Mesures et filtres

Les boîtiers ronds avec un diamètre documenté affichent **Diamètre XX mm** dans les comparatifs. Les boîtiers rectangulaires sans diamètre proprement établi affichent **L × l × H**, en conservant les trois valeurs du fabricant. Dans la galerie mobile, la largeur est résumée par « Largeur XX mm » avec la mesure intégrale dans l'intitulé accessible. La colonne des collections et les tableaux comparatifs distinguent les deux formats.

Le filtre de diamètres et le conseiller continuent à tenir compte **uniquement des valeurs `specs.diameter`**. Une largeur de 35 mm ne devient jamais un diamètre connu ; l'absence d'un diamètre rond est explicite.

## Vérification

Les suites `npm test`, `node scripts/build-seo.mjs`, `node scripts/validate-seo.mjs` et les contrôles Chromium de production testent la présentation des dimensions et les chemins de repli des images. Le scénario navigateur intercepte volontairement les WebP Casio MDV-107 pour vérifier que la galerie, la fiche et le zoom n'émettent **aucun appel d'image externe**.
