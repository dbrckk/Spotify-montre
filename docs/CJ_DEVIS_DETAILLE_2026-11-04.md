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

## Correction : identité officielle de la variante (PR suivante)

L'essai [41825878114](https://github.com/dbrckk/Spotify-montre/actions/runs/41825878114) a échoué sur `CJ_DETAIL_VARIANT_ID_MISMATCH` : le PID fourni par le listing global divergeait du PID de l'endpoint de variante exacte. **Ce décalage ne valide pas une autre montre.**

Le flux corrigé :

1. `GET /product/variant/queryByVid?vid=...` retrouve le **PID parent officiel** et le SKU/poids/prix du VID demandé. Un VID inattendu entraîne un arrêt.
2. Le SKU de la variante doit être exactement `CJZBNSET00031-black` pour cet audit ; sinon arrêt.
3. `GET /product/query?pid=<PID officiel>` récupère les caractéristiques logistiques du parent officiel. Son `productSku` doit être exactement `CJZBNSET00031`, sinon arrêt.
4. Si la liste des variantes dans la fiche contredit le VID ou SKU officiel, le calcul est refusé ; si elle omet simplement le VID, la réponse `queryByVid` fait foi pour cette variante exacte.
5. Contrôle de stock CN, puis calcul de transport détaillé avec poids **déclaré par CJ**, arrondi conservativement au gramme supérieur pour le calcul ; les volumes ne sont convertis de mm³ en cm³ que s'ils sont présents.
6. Devis complet, transporteur et importation **ne sont jamais présumés** : les tarifs restent purement indicatifs sans confirmation et ne sont pas publiés comme prix achetables.

Le PID ancien issu du catalogue demeure un **indice de provenance** et le rapport précise s'il correspond au parent officiel, sans imposer un rapprochement trompeur. Aucun achat, paiement ou modification du panier n'est déclenché par ce contrôle. La requête réelle reste strictement ciblée sur le VID et le code postal d'échantillon.
