# Référencement organique : architecture et mesure — 30 octobre 2026

## Objectif

Faire découvrir **Atelier Montres** aux personnes qui comparent des montres en France, grâce aux informations vérifiables du catalogue actuel. Le mot-clé générique « montres » est très concurrentiel. **Aucune position, délai d'indexation, volume de recherche ou revenu n'est garanti ni prétendu mesuré.** Le trafic et les positions réels nécessitent les données de Google Search Console.

## Audit initial et sources

- Google Search Central — [e-commerce, données et architecture](https://developers.google.com/search/docs/specialty/ecommerce?hl=fr) et [navigation interne](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure?hl=fr).
- Google Search Central — [contenu fiable destiné aux utilisateurs](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [indexation et sitemap](https://developers.google.com/search/help/crawling-index-faq).
- Google Search Central — [Product snippets vs Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/product?hl=fr) : ce site **ne réalise aucune vente directe**, et ne doit pas déclarer des offres `Offer` ou des données de marchand qu'il n'a pas.
- Les méthodes de vérification navigateur sont tirées du stack web existant dans `dbrckk/star-list` (Playwright, Lighthouse), sans téléchargement ou intégration de dépendances supplémentaires.

Le site disposait initialement de **25 URL HTML déclarées dans le sitemap**, dont 15 fiches, 4 comparatifs et 4 guides. Les filtres de la boutique, purement interactifs, ne donnaient pas trois points d'entrée stables pour des recherches de type catégorie.

## Estimations de demande mesurées (Ubersuggest, France, français — 30 octobre 2026)

Données d'un service tiers de recherche de mots-clés, **estimatives**, et non impressions réellement obtenues par Atelier Montres. La difficulté SEO est le score Ubersuggest (0 à 100), pas une probabilité garantie de classement.

| Requête | Volume mensuel estimé | Difficulté SEO | Décision |
| --- | ---: | ---: | --- |
| « montres » | 135 000 | 32/100 | Objectif générique de long terme ; intention concurrentielle très large |
| « montres quartz » | 4 400 | 14/100 | **Priorité n° 1** : collection dédiée de sept modèles réels |
| « montres Casio » | 33 100 | 50/100 | Collection de cinq références exactes, compétition plus élevée |
| « montres Casio vintage » | 4 400 | 22/100 | Sous-thème utile sur la même collection Casio, pas de page quasi dupliquée |
| « montres quartz ou automatique » | 480 | 14/100 | Guide existant à maintenir et relier depuis la page quartz |
| « montre petit boîtier » | Indisponible | Indisponible | Page utile au choix du diamètre ; ne pas lui attribuer un potentiel chiffré |

Ces valeurs sont des indicateurs Ubersuggest à la date indiquée. La saisonnalité et les méthodes d'estimation peuvent faire varier les volumes. Le site **ne dispose pas encore de rapport Search Console confirmé** pour vérifier sa position réelle, son CTR, ses clics ou ses impressions.

Ne pas créer de pages « Casio G-Shock », calculatrices ou connectées pour capter des recherches alors qu'aucun modèle exact correspondant n'existe dans le catalogue. Les descriptions doivent rester factuelles.

## Trois nouvelles collections — 100 % issues des modèles réels

| URL indexable | Intention de recherche | Taille de l'ensemble | Différenciation utile |
| --- | --- | ---: | --- |
| `/montres/montres-quartz.html` | « montres quartz », marques et styles | 7 | Différence mouvement quartz/automatique, cas d'usage, comparaison des modèles, tableau technique |
| `/montres/montres-casio.html` | « montres Casio », modèles, formats | 5 | Cinq références exactes Casio, distinction numérique/rétro/plongeuse, vérification des codes de variante ; page **indépendante, non officielle** |
| `/montres/montres-petit-boitier.html` | « montre petit boîtier », diamètre 35/38 mm | 3 | Formats 30,2, 35 et 38 mm **documentés**, aucune recommandation automatique de tour de poignet |

Les pages sont rédigées pour répondre à des questions concrètes, pas générées automatiquement pour chaque combinaison de filtres ou chaque variante de requête. Les trois collections disposent d'un `<h1>` descriptif, de photographies locales exactes déclarées autorisées, d'un tableau et de liens vers les fabricants, les fiches produit et le conseiller.

Chaque page possède une URL canonique, une description distincte, des métadonnées sociales, un `CollectionPage` + `ItemList` + `BreadcrumbList` JSON-LD et une place unique dans le sitemap. Les fiches produit rétablissent le lien vers chaque catégorie pertinente ; l'accueil propose les trois collections.

**Résultat attendu au déploiement : 28 URL** (25 existantes + 3 catégories), sans créer d'URL indexable par paramètres de recherche. Le sitemap ne garantit pas que Google indexera l'ensemble.

## Image principale / visibilité initiale

La couverture Citizen Tsuyosa NJ0150-81X apparaît désormais **directement dans le HTML généré**, sans attendre la requête JavaScript du catalogue. Le `src` correspond exactement à l'image locale approuvée et au préchargement prioritaire. Le module visuel réutilise l'image déjà insérée pour éviter le clignotement et une seconde requête réseau. Une image `og:image` réelle est déclarée pour les partages.

**Performance :** ce changement réduit les dépendances de chargement critiques, mais n'établit **aucun chiffre LCP réel**. Les Core Web Vitals doivent être mesurés sur les visites réelles, et PageSpeed Insights/Lighthouse peut compléter ce suivi.

## Programme d'affiliation

L'identifiant de suivi `drackk04-21`, confirmé par le propriétaire, est inchangé. **13 correspondances Amazon.fr exactes**, deux références non confirmées. Les liens rémunérés restent annoncés à côté de leur bouton ; le paiement se fait chez Amazon. Les pages de collection ne publient ni prix, ni stock, ni avis, ni `Offer` fictifs.

L'approbation finale d'Amazon n'est pas présumée ; les commissions ne sont pas une métrique SEO.

## Google Search Console — configuration propriétaire effectuée le 31 octobre 2026

Le propriétaire a confirmé la vérification de la propriété **Préfixe d'URL** `https://atelier-montres-selection-fr.onrender.com/`, la soumission réussie du sitemap et l'indexation de la page d'accueil. Le fichier de vérification HTML `site/google6d385495b6d15d5e.html` a été publié sur Render. **Les 27 autres URL ne sont pas considérées indexées sans rapport Search Console** ; la propriété Google n'est pas reliée automatiquement au dépôt. Les étapes ci-dessous restent utiles en cas de migration ou de nouvelle vérification.

1. Ouvrir [Search Console](https://search.google.com/search-console/welcome) et ajouter une propriété **Préfixe d'URL** : `https://atelier-montres-selection-fr.onrender.com/`.
2. Choisir la vérification via **balise HTML**. Copier uniquement la valeur du champ `content` de la balise `google-site-verification`. Ne pas transmettre de cookie Google ni de mot de passe.
3. Dans **Render > Atelier Montres > Environment**, renseigner `GOOGLE_SITE_VERIFICATION` avec cette seule valeur, puis appliquer les changements. Le générateur vérifie la forme du token et émet la balise dans la page d'accueil. Ne pas insérer de code HTML complet dans la variable.
4. Après vérification dans Search Console, envoyer `sitemap.xml` (URL complète : `https://atelier-montres-selection-fr.onrender.com/sitemap.xml`). Vérifier les 28 canoniques dans le rapport d'indexation et l'inspection d'URL.
5. Regarder ensuite sur 28 à 90 jours les **impressions, clics, CTR, position moyenne, requêtes et pages**. Séparer « marque + modèle exact », « quartz », « Casio » et « petit boîtier ». Ne pas annoncer un gain sans comparaison de données réelles.

## Décisions de priorité

- **P0** : sitemap, maillage, correspondance canonique, images authentiques, absence d'offres fictives, tests et déploiement corrects.
- **P1** : Search Console et indexation réelle ; corriger les 404, éventuels problèmes d'indexation et Core Web Vitals mesurés.
- **P2** : développer des contenus réellement originaux à partir de modèles connus, tests d'essayage ou nouvelles photos autorisées. Recherche de liens éditoriaux mérités, sans achat de liens ou spam.
- **P3** : une adresse de domaine propre et stable lorsque justifiée, avec redirections HTTP 301 et nouvelles canoniques ; pas de migration improvisée susceptible de perdre le trafic.

**À éviter :** dupliquer des pages par taille et genre, générer des faux avis, attribuer des notes sans tests, inventer des remises ou prix, annoncer un rang Google, prétendre être la marque officielle, et soumettre des données Merchant Center d'un détaillant alors que le site n'encaisse pas les achats.

## Vérifications CI

`npm test` / `npm run lint` couvrent la syntaxe du nouveau générateur. `node scripts/build-seo.mjs && node scripts/build-seo.mjs` doit produire deux fois exactement 28 URL sans dupliquer les blocs et les balises canoniques.

`node scripts/validate-seo.mjs` vérifie les trois catégories : identité des 7/5/3 références, maillage aller-retour, `CollectionPage`, vrais fichiers photo et contrôle des droits, préchargement de la couverture, disclosure Amazon, absence de données commerciales inventées et nombre exact d'URL.

## Améliorations techniques après confirmation de l'indexation — 31 octobre 2026

- FAQ de la page principale : harmonisation avec les liens Amazon rémunérés réels et le statut d'approbation finale non confirmé.
- Conseiller indexable : URL canonique stable, titre descriptif de l'outil en quatre critères, métadonnées de partage et balisage `WebPage` sans promesse de résultat enrichi.
- Contrôles de non-régression : absence d'ancienne FAQ contradictoire, une seule URL canonique, génération SEO idempotente et JSON-LD cohérent avec l'URL publique.
- Mesure suivante : rapport **Pages** et **Performances** dans Google Search Console pour les 27 URL autres que l'accueil, sans annonce de position ou de croissance non mesurée.


## Product search pages — 31 October 2026

- Titles now include exact brand/model, documented movement, and diameter when known. Descriptions cite recorded facts without inferring price or stock.
- All 15 pages have model-specific purchase checks. Unknown diameter and water resistance remain explicitly unknown. Automatic, quartz, and solar advice reflect the actual movement.
- Three links to related models now include the locally published manufacturer photograph declared authorized by the owner; these lower-page images are lazy-loaded with correct intrinsic sizes. The hero photo remains high priority with actual pixel dimensions.
- Existing SEO validation now checks the claims and the photo treatments for every model. No measured ranking, CTR, INP, CLS, or LCP improvement is asserted without field or lab evidence.
