# Recherche globale CJdropshipping — 4 novembre 2026

## Objectif

La première recherche du 4 novembre a trouvé **SKMEI 1251**, mais les deux variantes les moins chères n'ont pas été confirmées en stock CN. Les deux workflows précédents ont tous deux utilisé le mot-clé `SKMEI`. Cela **ne prouve pas** l'absence de variantes livrables ni de montres dans le catalogue.

Ce scanner interroge les montres de manière **large mais bornée**, sans déclarer que le catalogue CJ entier a été parcouru.

## Lancer depuis Android (une action)

1. Vérifier que la clé CJ est dans les [secrets Actions du dépôt](https://github.com/dbrckk/Spotify-montre/settings/secrets/actions), sous **`CJ_API_KEY`**. Ne jamais la recopier dans les paramètres de workflow.
2. Ouvrir [Recherche globale des montres CJ](https://github.com/dbrckk/Spotify-montre/actions/workflows/search-cj-global.yml).
3. Appuyer sur **Run workflow**, laisser **`main`** et le code postal **`75002`**, puis confirmer.
4. Ouvrir le job `supplier-global-read-only`, consulter le **résumé du workflow** puis le rapport JSON dans ses journaux.

Le script `node commerce/global-cj-search.mjs` récupère un jeton temporaire depuis `CJ_API_KEY` à chaque exécution. Il est possible d'utiliser `CJ_ACCESS_TOKEN` comme repli, mais le secret permanent `CJ_API_KEY` est préférable pour éviter les jetons expirés.

## Périmètre de la recherche

Le plan échantillonne, dans un ordre diversifié :

- `watch` (pages 1 à 4),
- `digital watch` et `quartz watch` (pages 1 et 2),
- `sport watch`, `women watch`, `men watch`, `wrist watch`, `automatic watch`,
- `SKMEI`.

Pour chaque recherche, la page CJ contient jusqu'à **60 références** filtrées sur l'entrepôt CN. Au plus **deux produits distincts** par page sont approfondis, et au plus **trois variantes uniques** par produit, triées par prix fournisseur. Les produits déjà examinés sur une requête précédente sont ignorés pour éviter les appels payants en doublon.

Chaque variante potentiellement recevable est vérifiée via `queryByVid` (identité/prix), `stock/queryByVid` (stock de la **variante exacte** en CN), puis `freightCalculate` seulement si le stock est confirmé. Le code postal `75002` est une **simulation d'expédition**, pas une validation de toutes les zones françaises. Une offre avec transport incomplet ou contradictoire n'est pas approuvée.

Le scanner essaie de couvrir au moins cinq recherches de familles différentes avant de s'arrêter lorsqu'il dispose de quatre variantes livrables, ou poursuit jusqu'à épuisement du plan ou du budget.

## Ressources et sécurité

- Au plus **2 500 points CJ** par exécution : 50 points par appel `listV2`, 10 points pour chacun des appels variant/stock/fret.
- **250 points maximum réservés** par recherche (1 listing + 2 produits × (1 liste de variantes + 3 contrôles de variantes à 30 points)). Le scanner ne commence pas une page si la réserve n'est pas suffisante.
- Une pause d'au moins **1,2 s** entre les requêtes réelles CJ évite de heurter la limitation de fréquence des comptes gratuits.
- Uniquement **manuel** : pas de coût API répété chaque jour ni déclenchement sur les pushs.
- Accès GitHub `contents: read` ; pas de secret de paiement, de base de données, de wallet ni de données clients.
- L'API CJ est limitée dans le code aux cinq endpoints de lecture nécessaire. Pas de commande, pas de débit fournisseur, pas de publication et pas de paiement client.
- Les logs du dépôt public révèlent les références CJ et les coûts fournisseur ; **pas** la clé ni les jetons.

**Un résultat technique `shipping_samples_found` n'autorise pas à vendre la montre.** Avant de la rendre commandable, il faut vérifier identité et droits de marque, sécurité et conformité GPSR, taxes françaises et dédouanement, prix TTC, marge, délais, garantie, politique de retour et compte marchand réel. Le champ `listedNum` de CJ n'est **pas** un volume de ventes.

## Interprétation des résultats

- `shipping_samples_found` : au moins une variante a du stock et une méthode de transport vers le code postal demandé, à l'instant du contrôle. Il reste à qualifier le modèle.
- `no_confirmed_shipping_sample` : aucune des variantes **effectivement examinées** n'a réussi le contrôle. Il reste des produits non explorés.
- `pointsAttempted` : estimation conservatrice des points consommés par les requêtes initiées, pas un relevé officiel du solde CJ.
- `exhaustedByBudget: true` : le scanner s'est arrêté sans dépasser le budget.
- `exhaustive: false` : toujours faux ; l'échantillon ne couvre pas l'intégralité du catalogue.

Références : [listV2](https://developers.cjdropshipping.com/en/api/api2/api/product.html), [règles de points](https://developers.cjdropshipping.com/en/api/api2/standard/points.html), [limitations de fréquence](https://developers.cjdropshipping.com/en/api/api2/standard/limit.html).
