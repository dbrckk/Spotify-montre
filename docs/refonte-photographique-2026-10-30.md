# Atelier Montres — refonte photographique / revue d'inspiration (30 octobre 2026)

## Objectif
Passer d'un catalogue statique de photographies produit à une découverte horlogère **photographique, interactive et crédible** pour Android et ordinateur, sans changer les 15 références ni les 13 destinations Amazon.fr existantes.

## Références examinées

| Source réelle | Observation documentée | Transposition originale |
|---|---|---|
| [Tissot — collection](https://www.tissotwatches.com/fr-fr/collection.html) | Association explicite de photo, diamètre, mouvement et comparateur | Photo identifiable de la référence, lien vers sa fiche, caractéristiques sans prix inventé |
| [Tissot — fiche Seastar](https://www.tissotwatches.com/fr-fr/T1202171701100.html) | Photos de face, de profil, du dos, bracelet, rotation sur certains modèles | **Un seul visuel réel** par montre lorsqu'un seul packshot est archivé ; agrandissement et navigation, pas de faux visuels multi-angles |
| [Seiko France](https://www.seikowatches.com/fr-fr) | Histoire des collections, navigation par famille et dimensions de boîtier | Quatre orientations visuelles photographiques, trois histoires de montre, liens vers le conseiller et le catalogue |
| [Chrono24](https://www.chrono24.fr/) | Galerie des objets à grande taille et exploration par modèle | Présentation visuelle généreuse et lecture de l'identité de la montre avant d'ouvrir les données |
| [Hodinkee](https://www.hodinkee.com/) | Image éditoriale dominante et hiérarchie typographique forte | Composition originale, photographie des vraies références et texte éditorial sans promesse commerciale fictive |

Le but n'est **pas** de cloner leur marque, copier leur code ou réutiliser des photographies de tiers.

## Sélection réelle dans `dbrckk/star-list`

Source inspectée : `dbrckk/star-list/websites.json`, `WEB_RESOURCES.md` et `stacks.json`.

| Ressource du dépôt | Usage retenu | Statut |
|---|---|---|
| [Awwwards](https://www.awwwards.com/) | Référence pour la hiérarchie typographique et les compositions « magazine » | Inspiration seulement, aucun code ni actif copié |
| [Recent](https://recent.design/) | Référence pour l'asymétrie mesurée et les cartes éditoriales | Inspiration seulement |
| [60fps.design](https://60fps.design/) | Référence pour les transitions légères et retours d'interaction | Inspiration seulement ; transitions CSS, réduction des mouvements |
| `microsoft/playwright` et `GoogleChrome/lighthouse` (stack Full-stack Web App) | Régression mobile/desktop existante et futurs audits de performance | Playwright déjà intégré à la CI ; pas de nouveau coût |

**Outils volontairement non intégrés :** frameworks React/Tailwind (inadaptés au site statique actuel), WebGL/Three.js pour des montres qui n'ont pas de modèles 3D autorisés, générateurs d'images avec coûts/licences variables, modèles IA produisant des « photos » inexactes.

## Fonctionnement construit

- La couverture propose quatre références réelles : Citizen Tsuyosa, Tissot PRX Quartz, Orient Bambino 38 et Casio MTP-B145.
- Quatre commandes accessibles (sélection `aria-pressed`, flèches gauche/droite, Home/End) changent **l'image exacte, le texte et la fiche liée**. Aucun défilement automatique susceptible de gêner Android.
- La **galerie photographique** est construite à partir du catalogue vérifié pour Seiko 5 Sports, Orient Bambino 38 et Tissot PRX Quartz. Chaque carte comporte les photographies locales, le nom exact, des données techniques réelles, l'agrandissement et une fiche produit.
- Les images chargent depuis `./assets/watches/<id>.webp` **uniquement si** `photoReview.publicUsageApproved===true`. Les cas interdits restent masqués dans la galerie ; la couverture retombe sur l'illustration originale, explicitement étiquetée.
- La visionneuse existante `AtelierPhoto` gère l'agrandissement au clavier et au toucher ; aucune galerie distante ni connexion supplémentaire.
- Responsive : mise en page 3 colonnes sur grands écrans, carrousel horizontal **manuel** sur Android ; transitions compatibles avec `prefers-reduced-motion`.
- Les événements d'image asynchrones utilisent un compteur de version : un téléchargement retardé ne peut pas afficher **une mauvaise montre sous le titre d'une autre**.

## Ce qui manque pour approcher les meilleurs marchands

Les boutiques professionnelles affichent souvent plusieurs angles, photos de poignet et détails du cadran, parfois des rotations 360°. Nous ne disposons ici **que d'un packshot par référence**. Pour une galerie multi-angles réellement fidèle, obtenir des photos de dos, profil, poignet et bracelet auprès des titulaires des droits **pour chaque référence exacte** ; archiver leur provenance et leur permission. Ne pas déduire de faux angles à partir du premier packshot ni utiliser une photo d'une variante différente.

Les droits d'image restent enregistrés comme **déclaration du responsable et non preuve indépendante vérifiée**. Les prix et stocks continuent de dépendre d'Amazon ou du fabricant, et aucune commission n'est présumée réellement attribuée par les seuls clics.

## Qualité et retour arrière

- `node scripts/test-editorial-photo.mjs` : 4 modèles de couverture, 3 images de galerie, références et fichiers réels, garde-fous de licence, accessibilité, absence de ressource externe.
- `scripts/test-mobile-storefront-v8.mjs` : navigateur Android et desktop, quatre sélections photographiques, navigation clavier, visionneuse, galeries et vérification des débordements.
- `npm test`, `npm run lint`, build SEO et CI existantes, y compris la stabilité des **13 liens Amazon rémunérés balisés**.
- `site/editorial-photo.css` est isolé : suppression de son import et du module permet de revenir à la présentation antérieure, qui subsiste en secours dans `site/affiliation.js`.
