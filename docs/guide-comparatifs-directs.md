# Comparatifs directs des montres — Atelier Montres

État du 30 octobre 2026. Source éditoriale : `scripts/watch-comparisons.mjs`.

## Objectif

Améliorer le parcours **découverte → comparaison factuelle → fiche fabricant/fiche vendeur**, sans inventer de prix ou de disponibilité. Les guides sont générés avec les mêmes données de référence que les 15 pages produits.

## Quatre comparaisons

| Comparaison | Usage du guide |
|---|---|
| [Tissot PRX Quartz ou automatique](https://atelier-montres-selection-fr.onrender.com/montres/tissot-prx-quartz-vs-automatique.html) | Choisir un mouvement électronique ou mécanique ; comparer diamètre, verre et étanchéité |
| [Citizen Tsuyosa vs Tissot PRX automatique](https://atelier-montres-selection-fr.onrender.com/montres/citizen-tsuyosa-vs-tissot-prx-powermatic-80.html) | Distinguer deux automatiques sport chic à partir de caractéristiques publiées |
| [Casio MTP-1302 vs MTP-B145](https://atelier-montres-selection-fr.onrender.com/montres/casio-mtp-1302-vs-mtp-b145.html) | Comparer deux quartz de dimensions différentes |
| [Orient Bambino 38 vs Hamilton Khaki Field Auto](https://atelier-montres-selection-fr.onrender.com/montres/orient-bambino-38-vs-hamilton-khaki-field-auto.html) | Examiner deux automatiques de caractère différent |

Les textes d'aide au choix sont éditoriaux, distincts des **faits** tirés de `site/selection-affiliation.json` : mouvement, diamètre, verre et étanchéité déclarée. Une donnée non documentée doit afficher `Non renseigné`.

## Parcours utilisateurs

- Les quatre cartes sont visibles depuis la page d'accueil et figurent dans le sitemap.
- Depuis chaque fiche SEO d'une des huit références, un lien conduit à son ou ses comparatifs directs.
- Chaque comparatif offre les deux fiches constructeur exactes, les pages produit Atelier Montres et, seulement pour les ASIN vérifiés, les URL Amazon.fr correspondantes.
- Un bouton préremplit le comparateur interactif avec les deux montres, sur Android et PC. Il réutilise le stockage de session et la sélection de comparaison existants.
- Les illustrations SVG originales conservent le site utilisable sans reproduire les photographies constructeur sans licence.
- Les tableaux et textes restent exploitables sans JavaScript ; le script de rendu SVG est un enrichissement visuel, sans appel à un service externe.

## Commercialisation

**Les liens Amazon restent non rémunérés** tant que le compte Partenaires, les URL de suivi et les autorisations d'images n'ont pas été vérifiés et approuvés. Aucun bouton de commande ou paiement n'a été ajouté.

Ne pas utiliser de `Offer`, `aggregateRating`, prix ou état de stock dans les données structurées tant que le backend marchand n'en fournit pas la preuve. La notation Google et les commissions ne se déduisent pas du nombre de comparatifs générés.

## Validation avant publication

La CI vérifie :
- les 25 URL du sitemap (accueil, conseiller, 4 guides, 4 comparatifs et 15 fiches produits) ;
- les métadonnées Article, canoniques et maillage interne ;
- les deux références exactes et le contenu provenant du catalogue ;
- l'absence de photo non autorisée et d'offre non vérifiée ;
- la présence des liens fabricants et Amazon exacts lorsqu'ils existent ;
- l'activation optionnelle du suivi Umami ;
- les contrôles existants de catalogue Android, comparateur et politiques d'affiliation.

Les comparatifs sont un contenu **utile** et non une garantie de trafic SEO : l'indexation se surveille dans Search Console quand la propriété a été vérifiée.
