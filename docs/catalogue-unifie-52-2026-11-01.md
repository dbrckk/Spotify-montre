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

## Comparaison mobile persistante — 1er novembre 2026

Sur le catalogue unifié des **52 montres**, le sélecteur « Ajouter à la comparaison » active désormais une **barre fixe accessible en bas de l’écran**. Elle n’apparaît qu’après chargement et validation du registre JSON des 52 références et après sélection d’un vrai modèle.

- Avec **une montre**, la barre indique « 1 sur 3 », montre l’intitulé réel et invite à ajouter un deuxième modèle. Elle ne propose pas de tableau prématuré.
- Avec **deux ou trois montres**, la barre affiche les références, permet de retirer une montre individuellement et propose « Comparer 2/3 montres » vers le tableau factuel existant. Les caractéristiques inconnues restent explicitement non documentées.
- « Tout effacer » vide à la fois la barre, le tableau et la sélection partageable dans l’URL. Les paramètres `?compare=id1,id2` restent compatibles avec le conseiller et les liens transmis.
- Les filtres ne détruisent pas les montres déjà choisies, même lorsqu’elles ne figurent plus dans les résultats visibles. À 3 montres, l’ajout d’une quatrième est refusé avec une explication.
- **Sans JavaScript, ou en cas de registre invalide/indisponible**, la barre et les sélecteurs restent masqués ; les 52 cartes HTML et leurs fiches restent consultables sans erreur.
- Le dock respecte les zones de sécurité des mobiles, les cibles tactiles de **44 px minimum**, les commandes clavier et l’absence de défilement horizontal, sans fabriquer de photos ou de données commerciales.

La suite `scripts/test-unified-compare-tray.mjs` est exécutée en Chromium Android et desktop dans le workflow `test-premium-mobile.yml`. Elle couvre le préchargement depuis l’URL, le retrait unitaire, les filtres, la limite de trois, l’effacement, le lien direct au tableau et le scénario sans JavaScript. Les captures restent des artefacts de CI, pas des images de montres non licenciées.

## Présentation visuelle premium — 1er novembre 2026

Le catalogue unique propose désormais une présentation **plus photographique sans inventer de montres**. Les 15 photographies du catalogue principal et les 21 photographies complémentaires sont publiées exclusivement selon les registres d'autorisations déclarées et les contrôles de fichiers locaux existants. La déclaration du propriétaire n'est **pas une vérification juridique indépendante** des droits ; ce statut reste explicite.

- **Visionneuse existante réutilisée :** chaque carte dotée d'une photographie locale validée présente un bouton **Agrandir**. La fenêtre modale du projet affiche la référence réelle, permet le zoom ×2, les flèches clavier, Échap et le glissement tactile entre les **36 montres photographiées**. Les sources sont uniquement les fichiers WebP locaux déjà autorisés par déclaration ; une photo manquante n'est jamais remplacée silencieusement par une image externe.
- **16 fiches sans photo publiée :** elles conservent une composition typographique identifiant la marque et le modèle, avec la mention **« Aucune photographie publiée pour cette référence »** ; pas d'image IA ressemblant à une vraie photo produit.
- **Filtre « Photographies » :** parmi les 52 modèles, les visiteurs peuvent limiter les résultats aux 36 cartes avec photographie ou aux 16 sans photographie. Le filtre fonctionne avec les six critères préexistants, même lors d'une comparaison en cours, et son état est partageable dans l'URL via `?visual=photo`.
- **Grille / grands visuels :** la grille compacte originale reste le choix initial, tandis que **« Grands visuels »** agrandit la scène produit : trois colonnes larges sur PC, deux sur tablette et une colonne sur mobile. Ce choix est partageable via `?view=large` et l'interface respecte les préférences de mouvement réduit.
- **Chargement :** les 15 photographies principales utilisent désormais les variantes WebP responsives enregistrées lorsqu'elles existent (`srcset`/ `sizes`), sans recréer ni télécharger de nouvelles photos. Les 21 photos complémentaires déjà compressées restent en WebP local. Les images sont en chargement différé.
- **Fiabilité :** sans JavaScript ou si le catalogue JSON ne peut être validé, les sélecteurs de zoom et de présentation restent masqués, mais les 52 fiches HTML restent accessibles.

Les tests Playwright Android sur une largeur de **393 px** couvrent les filtres, les 36/16 cartes, la conservation de la sélection et de la vue par URL, l'ouverture d'une véritable image SKMEI 2056, Échap, le débordement horizontal, et le mode sans JavaScript. Le contrôle SEO refuse toute divergence de provenance (photo publiée versus source déclarée), et le workflow Android lance ces tests avant fusion.

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
