# Bilan du scan global CJ — 4 novembre 2026

## Exécution réelle

- Workflow : https://github.com/dbrckk/Spotify-montre/actions/runs/41821292411
- Commit exécuté : `6458bde9e50d7239233cfac470d3f73a12e57c85`
- Statut GitHub : **success** ; `failedSearches: []`.
- 14 recherches sur 14, 25 produits distincts examinés.
- 183 appels d'API, 2 390 points **estimés pour les requêtes initiées** sur 2 500 points autorisés ; ce n'est pas le solde CJ.
- `shippableSamples: []`, `exhaustive: false`.
- Aucune commande CJ, paiement client, activation de checkout ou publication marchande.

**Important :** aucun résultat du scan ne constitue une approbation commerciale. Le catalogue complet de CJ et toutes les variantes n'ont pas été parcourus ; deux produits/page, trois variantes/produit au plus, triés par coût.

## Piste concrète à qualifier

La montre **Digital Wrist Watch**, SKU produit `CJZBNSET00031`, variante noire `CJZBNSET00031-black`, VID `74F64E7D-7D90-425D-AFB3-487D28B1D09F` :

- coût produit déclaré : **0,50 USD** (hors livraison et taxes),
- `stockConfirmed: true` au moment du contrôle, entrepôt CN,
- le serveur CJ a fourni 13 propositions de livraison qui ont toutes été exclues par notre **contrôle strict de ventilation des frais d'import**,
- aucun coût total livré en France n'a été confirmé : **ne pas proposer cette variante à l'achat**.

Le scanner n'indique pas pour l'instant quels champs (taxes, tarif, dédouanement ou total) manquaient dans ces 13 propositions. Il serait erroné de conclure que CJ ne peut pas livrer cette montre : la validation de prix rendu complet n'a simplement pas abouti.

## Pourquoi le résultat est incomplet

La documentation officielle de CJ présente `freightCalculate` comme un **devis simplifié**. Son exemple minimal peut contenir uniquement `logisticPrice`, `logisticPriceCn`, `logisticAging` et `logisticName`. Les champs `taxesFee`, `clearanceOperationFee` et `totalPostageFee` n'y sont pas tous obligatoires :
https://developers.cjdropshipping.com/en/api/api2/api/logistic.html

Notre fonction `computeCjFreightCents` refuse les montants fiscaux absents, car nul ne peut présumer qu'un champ absent signifie **0 USD**. Ce comportement protège les prix clients, mais empêche de classer « livraison possible mais frais fiscaux inconnus » séparément de « aucune livraison disponible ».

## Priorités opérationnelles

1. **Diagnostiquer le schéma exact** de chaque devis transport de la variante noire, par la seule présence/type des champs utiles (ne jamais publier un token ni une adresse privée).
2. **Séparer les niveaux de preuve** : route transport observée avec coût de base seulement, devis tout compris dûment justifié, et offre effectivement approuvée. Ne jamais transformer une route avec TVA/douanes inconnues en achat possible.
3. Utiliser **Freight Calculation Tip** pour une estimation plus détaillée seulement si poids, propriétés logistiques et SKU exacts sont obtenus auprès de CJ ; l'endpoint exige ces données.
4. Faire valider les coûts import/TVA, la conformité GPSR, l'identité fournisseur, les photos et les garanties, puis vérifier la marge TTC. Le compte marchand et le circuit de paiement restent des préalables indépendants à l'automatisation commerciale.
5. Après ces correctifs, relancer uniquement un **contrôle ciblé du VID** plutôt que consommer immédiatement 2 500 points dans une autre recherche globale.

## Accès et sécurité

- Secret `CJ_API_KEY` fonctionne, mais ne doit jamais être publié.
- Le correctif de diagnostic PR #123 a été fusionné ; le scan réel s'est conclu sans incident.
- Le déclenchement automatique exceptionnel du scan global a été **retiré** dans `d80c22ca81a8250e8639f680d72f482d33fb7b2e`. Les recherches futures sont manuelles pour contrôler les points CJ.

Ce rapport constate des faits au 4 novembre 2026. Le stock, les prix, les règles fournisseurs et les possibilités de transport changent et doivent être revalidés avant chaque vente.
