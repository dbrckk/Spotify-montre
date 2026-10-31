# Fiches horlogères enrichies — 31 octobre 2026

## Objectif
Donner à chacune des 15 fiches SEO un contenu réellement distinctif, immédiatement utile au choix et connecté aux données constructeurs, sans ajouter de photographie non autorisée, de prix, de stock ou de prétendu essai physique.

## Changements
- `site/editorial-insights.json` : 15 profils documentaires correspondant strictement aux 15 IDs du catalogue.
- Chaque profil dispose de trois textes rédigés pour sa référence exacte : ce qui la distingue, à qui elle peut parler, et point à contrôler.
- `scripts/build-seo.mjs` génère une section « Faut-il considérer cette montre ? » avec trois cartes éditoriales et une barre de repères issus uniquement des champs non vides de `selection-affiliation.json`.
- `site/seo-guides.css` : grille trois colonnes sur desktop, une colonne sur mobile, titres lisibles, repères affichés en badges et navigation clavier.
- Le comparatif Casio MTP-B145 / MTP-1302 distingue maintenant les 35 mm de **largeur** du boîtier rectangulaire et les 38,5 mm de **diamètre** du boîtier rond. Aucune comparaison directe trompeuse.
- `scripts/validate-seo.mjs` exige une seule synthèse par page, trois conseils non dupliqués et les champs constructeur présents, et contrôle l'explication de dimensions Casio.

## Garde-fous
Les synthèses expriment des critères de choix et renvoient aux fiches fabricants. Elles ne promettent ni confort effectivement observé, ni résistance pratique, ni prix ou disponibilité. Les 15 images existantes restent inchangées et l'autorisation de les publier reste à justifier indépendamment.

## Vérifications avant publication
`npm test`, deux passages de `node scripts/build-seo.mjs`, puis `node scripts/validate-seo.mjs`. Les contrôles mobiles et la vérification de Render doivent passer après fusion. Les pages sont générées lors du déploiement — ne pas modifier à la main les 15 fichiers dérivés.

Référence : [Roadmap AAA](https://github.com/dbrckk/Spotify-montre/issues/20).
