# Dix montres à qualifier commercialement — sélection vérifiable du 1er novembre 2026

## Objectif réel

Le site Atelier Montres a déjà 52 références : 15 montres historiques présentées sur l'accueil et 37 montres complémentaires dans le catalogue. Cette sélection de **dix références parmi les 37 complémentaires** n'est **ni un classement de meilleures ventes françaises/Amazon**, ni un diagnostic du taux de conversion, ni une recommandation de prix à afficher.

Elle rend visible et actionnable un portefeuille d'essai raisonnable : plusieurs styles, marques accessibles, photos exactes déclarées autorisées, fiches documentées, progression vers des liens marchands plus précis. Les 42 autres modèles restent consultables dans le comparateur universel, et les huit cartes déjà mises en avant sur la page d'accueil ne sont pas supprimées.

**Source technique unique :** `scripts/build-commercial-shortlist.mjs`. Chaque membre est tiré de `site/selection-populaires.json`; toutes les fiches ont les mêmes contrôles de provenance, disponibilité non revendiquée, et transparence commerciale.

## Les dix références et leur intérêt

| Modèle | Segment / intention | Situation marchande documentée au contrôle initial | Photo locale déclarée autorisée | Prochaine preuve à obtenir |
|---|---|---|---|---|
| ADDIESDIVE AD2030 | Quartz compact épuré | Fiche Amazon.fr modèle AD2030, attention variante bleue | Oui | Vérifier couleur/mouvement effectifs, stock, coûts de livraison, retour |
| Pagani Design PD-1701 | Chronographe sport | Fiche Amazon.fr « 1701 » / PGN-1701 | Oui | Vérifier génération, bracelet, vendeur et disponibilité |
| SKMEI 2056 | Digital rétro transparent | **Recherche Amazon.fr uniquement**, fiche modèle SKM-2056F01 auparavant indisponible | Oui | Rechercher vendeur et couleur réellement achetables en France |
| SKMEI 2256 | Analogique acier accessible | **Recherche Amazon.fr uniquement** | Oui | Référence exacte, qualité bracelet, étanchéité 3 bar |
| SKMEI 2514 | Rétro numérique acier | **Recherche Amazon.fr uniquement** | Oui | Fiche Amazon/Awin/AliExpress exacte et variante |
| Casio F-91W-1 | Numérique épuré | Fiche Amazon.fr documentée (F-91W-1YER) | Non | Contrôler offre actuelle, fiche locale autorisée éventuelle |
| Casio GA-2100-1A1 | G-SHOCK sport noire | Fiche Amazon.fr documentée (GA-2100-1A1ER) | Non | Vérifier disponibilité et droits photo |
| Casio GW-M5610U-1 | Numérique solaire | Fiche Amazon.fr documentée (GW-M5610U-1ER) | Non | Vérifier variantes régionales et droits photo |
| Pagani Design PD-1776 | Montre compacte soignée | **Recherche Amazon.fr uniquement** | Oui | Fiche vendeuse de la variante exacte, compatibilité acheteur FR |
| SKMEI 1874 | Petit boîtier acier | **Recherche Amazon.fr uniquement** | Oui | Taille, variante et commerçant exacts |

**Bilan de préparation, pas de résultat commercial :** 5 liens Amazon.fr sur un ASIN correspondant au code modèle, 5 modèles toujours en recherche, 7 photos locales de modèles spécifiques sur attestation de droits. **Zéro chiffre de vente, commission, classement, prix ou disponibilité déduit de cette sélection.**

## Mesures de progrès liées à ces dix modèles

1. Exactitude du code modèle et de la variante proposée au marchand (100 % cible pour toute fiche dite « directe »).
2. Photos de modèle exact autorisées et inspectables ; jamais de concept IA présenté comme photo de produit.
3. Type de sortie explicite : fiche modèle correspondant au code, ou recherche à vérifier, sans bouton « acheter » qui suggérerait un encaissement par Atelier Montres.
4. Intérêt mesuré uniquement si l'outil de statistiques est activé légalement : vues de fiche, clics internes, clics Amazon et vendeurs distincts ; **ne pas transformer un clic en vente**.
5. Rapport Amazon.fr ou Awin uniquement après existence d'un contrat d'affiliation effectivement actif et accès au vrai rapport de commissions.

## Évolution par preuve et arrêt d'un modèle

- Un candidat sans fiche marchande précise peut rester éditorial, mais ne doit pas devenir un « achat direct confirmé ».
- Si un modèle n'est plus disponible, le lien connu n'est pas présenté comme une disponibilité acquise ; les autres modèles restent comparables.
- Une nouvelle photo ne remplace la photographie primaire que si elle représente précisément la référence et que l'autorisation est documentée.
- Le Top 10 est **éditorial et peut changer** après observation de demande réelle. Aucun système automatique ne doit transformer une simple caractéristique (« quartz », « acier », « rétro ») en volume de ventes prétendument constaté.
- À ce stade, **aucune** des dix références n'est habilitée pour notre propre checkout : la qualification vendeur, TVA/douane, garanties, devis rendu France et politique SAV figurent dans `docs/strategie-systemique-rentabilite-2026-11-01.md`.

## Critères de publication et sécurité

Le build doit refuser les IDs absents ou dupliqués, exiger dix fiches distinctes et la couverture documentaire prévue, conserver les 37 fiches du catalogue complémentaire et les 52 du comparateur, afficher les incertitudes et assurer l'accès mobile sans JavaScript. Les nouvelles cartes du Top 10 renvoient **uniquement** aux fiches internes du site : elles ne créent pas dix nouveaux liens rémunérés susceptibles de fausser les comptages d'affiliation ou d'attribution.

Validation : `npm test`, `node scripts/build-seo.mjs`, `node scripts/validate-seo.mjs`, puis parcours Chromium mobile `scripts/test-mobile-storefront-v8.mjs` et tests de déploiement GitHub Actions. Les droits des photos reposent sur la déclaration de l'éditeur ; ils ne sont pas indépendamment attestés dans le dépôt.
