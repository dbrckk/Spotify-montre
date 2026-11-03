# Validation stricte de livraison CJ — 3 novembre 2026

Ce correctif protège les commandes clients déjà payées. Le statut fournisseur ne peut pas être utilisé pour annoncer une expédition ou une livraison lorsque le rapprochement avec l'adresse client et la ligne d'achat n'est pas suffisamment fiable.

## Règles applicables

- Le **code postal français est obligatoire** dans la réponse `getOrderDetail` de CJ et doit correspondre exactement à celui du client. Avant la correction, un champ vide ou absent passait.
- Le **complément d'adresse** (appartement, bâtiment ou indication) doit correspondre à l'adresse conservée de manière chiffrée dans notre base. Une information omise ou différente bloque la confirmation fournisseur.
- Si la **région** figure dans le détail CJ, elle ne peut pas contredire celle du client.
- Une référence `productList[].storeLineItemId` explicite mais différente de notre identifiant marchand doit toujours être rejetée, **même quand la référence parente `orderNum` paraît correcte**.
- Un `storeLineItemId` absent peut encore être remplacé par une autre référence marchande exacte, comme le permet l'ancien contrat CJ ; l'identité de la variante, le coût, la quantité, l'adresse et le paiement restent vérifiés indépendamment.

En cas de désaccord ou d'absence de preuve, la réconciliation du fournisseur place le dossier dans `EXCEPTION` et demande une revue manuelle. Elle ne crée pas une seconde commande, ne sollicite pas un nouveau paiement client et ne prétend pas que le colis a été livré.

## Tests

`npm --prefix commerce run check` lance `cj-identity-check.mjs`, qui vérifie notamment les codes postaux omis, les compléments d'adresse contradictoires, la région incohérente et les références de ligne contradictoires, ainsi qu'une réponse correctement documentée. Le workflow commerce GitHub exécute ce contrôle lors de chaque PR modifiant le commerce.

## Limites restantes

Il s'agit d'un contrôle **des réponses fournisseur**, non d'un test de livraison réel. Le compte CJ doit être opérationnel, les variantes et le solde doivent être vérifiés, les obligations vendeur/TVA/retours doivent être satisfaites et une commande de bout en bout doit être exécutée avant l'activation publique du paiement.
