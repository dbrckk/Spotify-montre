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
3. Type de sortie explicite : fiche Amazon.fr correspondant au code **ou fiche vendeur portant le modèle exact**, avec mention rémunérée ou non rémunérée. La recherche Amazon générique reste sur la fiche détaillée, sans bouton « acheter ici » qui suggérerait un encaissement par Atelier Montres.
4. Intérêt mesuré uniquement si l'outil de statistiques est activé légalement : vues de fiche, clics internes, clics Amazon et vendeurs distincts ; **ne pas transformer un clic en vente**.
5. Rapport Amazon.fr ou Awin uniquement après existence d'un contrat d'affiliation effectivement actif et accès au vrai rapport de commissions.

## Évolution par preuve et arrêt d'un modèle

- Un candidat sans fiche marchande précise peut rester éditorial, mais ne doit pas devenir un « achat direct confirmé ».
- Si un modèle n'est plus disponible, le lien connu n'est pas présenté comme une disponibilité acquise ; les autres modèles restent comparables.
- Une nouvelle photo ne remplace la photographie primaire que si elle représente précisément la référence et que l'autorisation est documentée.
- Le Top 10 est **éditorial et peut changer** après observation de demande réelle. Aucun système automatique ne doit transformer une simple caractéristique (« quartz », « acier », « rétro ») en volume de ventes prétendument constaté.
- À ce stade, **aucune** des dix références n'est habilitée pour notre propre checkout : la qualification vendeur, TVA/douane, garanties, devis rendu France et politique SAV figurent dans `docs/strategie-systemique-rentabilite-2026-11-01.md`.

## Critères de publication et sécurité

Le build doit refuser les IDs absents ou dupliqués, exiger dix fiches distinctes et la couverture documentaire prévue, conserver les 37 fiches du catalogue complémentaire et les 52 du comparateur, afficher les incertitudes et assurer l'accès mobile sans JavaScript. Chaque carte du Top 10 conserve le lien documentaire interne et affiche **une sortie marchande directe supplémentaire** : cinq liens Amazon.fr déjà documentés (même ASIN et identifiant affilié, pas de nouvelles références supposées), cinq fiches vendeur au modèle exact non rémunérées. Le tracking compte les clics d'emplacement `popular` mais ne prouve jamais des ventes ; ce deuxième emplacement augmente volontairement le nombre de CTAs visibles, sans compter de nouveaux modèles.

Validation : `npm test`, `node scripts/build-seo.mjs`, `node scripts/validate-seo.mjs`, puis parcours Chromium mobile `scripts/test-mobile-storefront-v8.mjs` et tests de déploiement GitHub Actions. Les droits des photos reposent sur la déclaration de l'éditeur ; ils ne sont pas indépendamment attestés dans le dépôt.

## Itération « parcours marchand direct » — 1er novembre 2026

- **Pagani PD-1701** : lien documentaire désormais vers la [fiche produit spécifique du distributeur qui se présente comme officiel](https://paganidesign.com/fr/products/pagani-design-1701), avec sélecteur couleur et bracelet. La page évoque parfois le mouvement VK63 **ou Miyota 0S20** selon variante. Ne pas promettre VK63 sur toutes les couleurs, ni le stock ou la livraison.
- **Pagani PD-1776** : accès vers la [fiche produit spécifique PD-1776](https://paganidesign.com/products/pd-1776), comprenant choix de couleurs. Cette page présentait « Sold out » sur une variante consultée ; ne pas afficher « en stock » sur notre site. Le fournisseur y déclare un transport droits/taxes inclus ; cette déclaration n'a pas été vérifiée par un achat France.
- **SKMEI 2056** : deux anciennes références de catalogue AliExpress repérées chez [PriceArchive](https://fr.pricearchive.org/aliexpress.com/item/1005007793914474) et [PriceArchive autre vendeur](https://fr.pricearchive.org/aliexpress.com/item/1005008144767722), mais les instantanés datent de septembre 2026, incluent des variantes 1123/1412 et **ne prouvent ni la disponibilité, ni le produit exact, ni l'expédition France, ni un droit de commission**. Aucun de ces liens n'est présenté comme un achat vérifié ni monétisé.
- **SKMEI 2256, 2514, 1874** : les fiches du vendeur SKMEI déjà documentées sont conservées, avec message **non rémunéré**, sans affirmation de stock, de prix ou de droits de douane. Les recherches Amazon restent possibles sur les fiches détaillées.
- **ADDIESDIVE AD2030, Pagani PD-1701 et les trois Casio** : raccourcis Amazon.fr vers les cinq ASIN déjà contrôlés, avec la mention `rel=sponsored` et des précisions de variantes dans le cas AD2030 et PD-1701. Le lien fournisseur distinct reste accessible sur la fiche détaillée.

**Aucune affiliation Pagani/AliExpress, aucun revenu marchand, aucune disponibilité France ni prix de vente final n'a été validé par cette itération.** La vente directe et le dropshipping restent désactivés jusqu'aux gates du plan directeur.
