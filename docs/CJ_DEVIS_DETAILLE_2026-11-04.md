# CJdropshipping — essai logistique détaillé d'une montre réelle

**Objectif** : obtenir un devis vers la France qui mentionne les frais d'import, en conservant les contrôles de sécurité existants.

## Sources réelles

- Scan global : https://github.com/dbrckk/Spotify-montre/actions/runs/41821292411
- Diagnostic ciblé : https://github.com/dbrckk/Spotify-montre/actions/runs/41824347813
- Produit CJ : `7BCE6BB2-14F7-47C0-B1E1-79C50A253A3A`
- Variante noire : `74F64E7D-7D90-425D-AFB3-487D28B1D09F`
- Référence : `CJZBNSET00031-black`, montant produit **0,50 USD** au relevé, stock CN positif.
- Les 13 voies de transport simples avaient **toutes le champ `tariff` absent**. L'absence n'est pas une valeur zéro.

## Méthode

Le [workflow de calcul détaillé](https://github.com/dbrckk/Spotify-montre/actions/workflows/audit-cj-detailed-freight.yml) ne lit que trois points de l'API CJ :

1. `GET /product/query?pid=...` : récupère le poids de la variante **exacte**, son SKU, son prix actuel et `productProEnSet`, sans supposer de poids standard.
2. `GET /product/stock/queryByVid?vid=...` : confirme une nouvelle fois le stock en CN avant de demander un devis.
3. `POST /logistic/freightCalculateTip` : envoie poids, propriétés logistiques, SKU, destination FR et valeur marchandise **obtenus directement chez CJ**.

S'il manque un poids ou une caractéristique, le script s'arrête sans appeler le devis détaillé. Les propriétés sont limitées à l'énumération publiée par CJ. Il n'envoie pas de nom ou d'adresse d'acheteur, n'utilise pas de base de données et n'a pas les clés du prestataire de paiement.

Le résultat distingue les méthodes dont **tous** les montants d'import sont présents, les méthodes incomplètes, les fournisseurs indisponibles et les contradictions. Il n'approuve **aucune vente** : le parcours de paiement conserve son contrôle indépendant au dernier moment.

Documentation CJ :
- https://developers.cjdropshipping.com/en/api/api2/api/product.html
- https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
- https://developers.cjdropshipping.com/en/api/api2/standard/ps-product-property.html

Après le premier résultat fournisseur, le déclenchement automatique ponctuel sera supprimé. Ne jamais recommencer une recherche globale coûteuse pour examiner une seule référence.
