# Catalogue unique de 52 montres : architecture et critères d’acceptation
**1er novembre 2026 · Priorité P1 après audit #45**

## Résultat

La source primaire continue d'être :
- `site/selection-affiliation.json` : 15 montres historiques, fiche fabricant, photographies exactes autorisées, comparateur approfondi existant.
- `site/selection-populaires.json` : 37 montres complémentaires, preuves constructeur/distributeur, catalogue éditorial et liens Amazon directs **uniquement** pour les correspondances sourcées.
- `site/popular-photo-rights.json` : registre des photos publiées pour les références complémentaires.
- `research/amazon-fr-popular-verified.json` et `site/affiliate-links.json` : uniquement des destinations Amazon contrôlées.

`scripts/build-unified-discovery.mjs` normalise ces sources en `site/discovery-catalogue.json` et génère **52 fiches HTML pré-rendues sur une seule page** `/montres/toutes-les-montres.html`. La génération échoue sur un identifiant dupliqué, un style inconnu, un chemin image non local ou une couverture incomplète. Ces deux fichiers sont des **sorties générées** : toute amélioration de modèle doit être faite dans les catalogues sources et les registres de provenance, pas directement dans la sortie.

Le navigateur affiche les 52 cartes même **sans JavaScript** et active les filtres/recherche/comparateur seulement après avoir validé le JSON. Les 70 URL historiques sont conservées ; le sitemap intègre désormais **71 URL**.

## Filtrage / comparaison

- Recherche par marque, modèle, description, caractéristiques, sans accents.
- Marque, style, mouvement, gamme, diamètre documenté ou non connu.
- Comparaison de 2 ou 3 références, y compris une Casio du catalogue historique avec une SKMEI du catalogue complémentaire, via `?compare=skmei-2056,citizen-tsuyosa#comparer`.
- Les tailles de boîtiers rectangulaires ne sont **jamais** transformées en diamètre rond. Les mesures inconnues affichent « Non documenté ».
- Le conseiller utilise le même JSON 52, propose trois modèles et ouvre leurs **vraies fiches SEO**. Il passe les trois IDs sélectionnés au comparateur.
- Les 15 anciennes cartes du comparateur complexe restent accessibles depuis l'accueil pour conserver toutes leurs fonctionnalités ; elles ne sont plus présentées comme **tout** le catalogue du site.

## Transparence commerciale

- Vraies photos locales contrôlées par les registres et permissions déclarées. Les rendus IA ne sont **pas** employés comme photos produit exactes dans le catalogue unifié.
- Les montres sans photographie déclarée reçoivent un encart typographique explicite (pas un faux produit photoréaliste).
- Liens directs ou **recherches Amazon** correctement distingués. Tous les liens affiliés comportent `rel="sponsored nofollow noopener noreferrer"` et l'information « lien rémunéré ».
- Aucun prix, stock, remise, note client, disponibilité ou preuve de meilleures ventes n'est fabriqué.
- Les clics affiliés existants `data-amazon-product` / `data-amazon-search-id` restent compatibles avec le tracking Umami du site, sans collecte supplémentaire.

## Définition de terminé

1. Générateur idempotent sur deux passages ; **52 montres uniques** dans le JSON et dans le HTML statique.
2. **71** URL accessibles dans le sitemap ; canoniques et métadonnées conformes.
3. Parcours Android : une Casio + une SKMEI se comparent en un clic, six filtres fonctionnels, aucun débordement horizontal.
4. Test sans JS : 52 liens de fiches restent utilisables, aucun faux filtre visible.
5. Le conseiller propose des SKMEI, dispose de 52 références et ouvre des fiches précises ; aucune mesure de boîtier inventée.
6. Les workflows **boutique / SEO / mobile / WCAG** sont tous verts avant publication.
7. Les modèles non commercialement éligibles restent consultables sans fausse promesse de vente.

## Prochaine priorité après fusion

**P0/P2 — conversion fiable :** vérifier les destinations de marchands pour les 20 modèles prioritaires (notamment SKMEI, Casio, ADDIESDIVE, Pagani), remplacer les liens de recherche génériques par des liens vers la bonne annonce seulement avec preuve du modèle exact, contrôler la visibilité et la bonne attribution du tag. Les mentions légales restent un blocage distinct à résoudre avec des coordonnées réelles, jamais inventées.
