# Sécurité du catalogue CJ : vérification PID/VID

## Incident réel du 4 novembre 2026

Le scanner CJ avait associé un PID de `product/listV2` à un VID qui, sur l'API officielle `product/variant/queryByVid`, appartenait à un **autre PID canonique** :

- PID initial du catalogue : `7BCE6BB2-14F7-47C0-B1E1-79C50A253A3A`
- VID : `74F64E7D-7D90-425D-AFB3-487D28B1D09F`
- PID officiel du VID : `EC60873E-E5A2-4081-82F7-427BC84A8A3D`

Preuve réelle de réconciliation : [workflow #41834688555](https://github.com/dbrckk/Spotify-montre/actions/runs/41834688555).

Sans vérification de ce lien, il serait possible de présenter un titre/photo/nom d'un article tout en calculant le stock et le prix d'un autre. Cela créerait un risque de mauvaise livraison et de commandes non conformes.

## Comportement corrigé

1. `listV2` découvre une référence candidate (`catalogPid`).
2. `product/variant/query?pid=...` liste ses VIDs possibles (non fiables pour l'approbation).
3. `product/variant/queryByVid?vid=...` fournit le PID **officiel** de chaque variante examinée.
4. Si `canonicalPid !== catalogPid`, on qualifie la variante `catalog_identity_mismatch` : **aucun appel stock ni livraison n'est effectué** pour cette combinaison et aucune offre ne peut être qualifiée.
5. Le scanner peut continuer à explorer une autre variante du même produit si elle correspond effectivement au PID du catalogue. Sinon le produit entier est affiché comme `catalog_identity_mismatch`, jamais `not_ready` comme s'il était simplement en rupture de stock.
6. Les résultats globaux distinguent les produits isolés pour problème d'identité. Un devis n'entre dans `shippableSamples` que si `catalogPidMatched === true`, le stock est confirmé et le transport est recevable.

Une variante rejetée n'est pas nécessairement inexistante ou impossible à livrer. Elle peut appartenir à une autre fiche canonique, qui doit alors être interrogée et documentée séparément. **Les 25 produits du scan historique ne doivent pas être interprétés rétrospectivement comme tous correctement associés.**

## Maintien des protections commerciales

- Aucun endpoint CJ d'achat, wallet, publication ou panier n'est introduit.
- Une incohérence d'identité interdit les vérifications supplémentaires et économise les points API.
- Les devis incomplets sur les taxes restent refusés.
- Ce contrôle est en lecture seule et le scan global est déclenché manuellement depuis GitHub, sans clé CJ exposée dans le code.
- L'enregistrement éventuel d'une offre commerciale reste soumis séparément à l'examen légal, à la fiscalité française, aux frais d'import, aux marges et à l'autorisation du compte marchand.

Documentation CJ : [Query All Variants / Variant Id Inquiry](https://developers.cjdropshipping.com/en/api/api2/api/product.html).
