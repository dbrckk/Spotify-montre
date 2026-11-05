# Atelier Montres — plancher de prix contrôlable pour la première montre CJ
*Mise à jour : 5 novembre 2026 — étude interne, sans offre commerciale ni paiement*

## État fournisseur et décision

Le ticket fournisseur `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031` est confirmé auprès de CJ (statut `AWAITING_CJ_REPLY`). À la vérification du 5 novembre, aucune réponse écrite n'était encore visible. **Aucun prix rendu TTC/DDP et aucune marge réelle ne peuvent être publiés pour cette variante** avant réception et vérification du devis et des autres pièces.

Ce module prépare **un calcul de seuil de vente interne**, pas un tarif commercial. Il prend en compte le stock et la variante réelle, le fournisseur à taux de change conservateur, la douane/importation, le régime de TVA du vendeur, les frais du prestataire de paiement, les retours et les autres réserves. Il refuse de calculer si ces données sont absentes, contradictoires ou expirées. Aucun prix ni taux de change fictif n'est intégré au code de production.

## Réglementation à confronter au devis CJ

D'après la Douane française, au 5 novembre 2026, une vente à distance hors UE d'une seule montre d'une valeur en douane au plus égale à 150 € est soumise, en principe, à **3 € de droit forfaitaire et 2 € de frais de traitement**, sous réserve des exceptions et modalités légales. Ces deux montants **ne comprennent ni la TVA d'importation ni les éventuels frais de transporteur**. Les textes et conditions applicables à la déclaration doivent être confirmés par le professionnel du dédouanement.

Références officielles :
- https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne
- https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes

**Ne pas additionner deux fois les frais déjà inclus dans `totalPostageFee` de CJ.** Un montant indiqué comme `included_in_supplier_total` est conservé pour le contrôle documentaire mais non ajouté au coût fournisseur. Un montant `extra_seller_cost` est ajouté **une seule fois**. Si CJ ne précise pas la prise en charge, le calcul est impossible. Le client ne doit avoir aucune surprise douanière (`buyerExtraEurCents=0`) dans notre scénario de vente tout compris.

## Entrée privée exigée

Créer un fichier JSON privé hors de `site/` et **ne pas le committer**. Le schéma a **exactement** quatre sections :

| Section | Données à renseigner exclusivement d'après les justificatifs réels |
|---|---|
| `identity` | `supplierVid`, `supplierPid`, `supplierVariantSku`, `supplierProductSku`, `originCountry` = `CN`, `destinationCountry` = `FR`, `postalCode` = code postal métropolitain du devis (ex. 75002) |
| `supplierQuote` | `sourceSha256` (empreinte SHA-256 du document privé), `issuedAt`, `expiresAt` (UTC format `YYYY-MM-DDTHH:mm:ssZ`), `supplierProductUsdCents`, `supplierFreightAndImportUsdCents`, `supplierGrandTotalUsdCents`, `fxUpperEurPerUsdBps`, `consignmentValueEurCents`, `deliveryMinBusinessDays`, `deliveryMaxBusinessDays`, `stockConfirmed` |
| `importCosts` | `flatDuty`, `unionHandling`, `importVat`, `carrierClearance` : pour chacun, l'objet `{amountEurCents, treatment}` (treatment = `included_in_supplier_total` ou `extra_seller_cost`). Puis `importPayer` = `SUPPLIER` ou `SELLER`, `buyerExtraEurCents` = 0, `importLiabilityReviewed` et `vatAndFeeTreatmentReviewed` après vérification réelle |
| `commercial` | `sellerVatRateBps`, `vatSchemeReviewed`, `pspVariableFeeBps`, `pspFixedFeeEurCents`, `returnAndServiceReserveEurCents`, `otherSellerCostsEurCents`, `marginTargetBps` (au moins 2500 = 25 % du chiffre d'affaires HT du vendeur) |

Les valeurs en centimes sont des **entiers** ; les taux `Bps` sont des dix-millièmes (2000 = 20 %). **Aucun indicateur `...Reviewed` ne remplace les documents**, ni le visa de l'opérateur/vendeur : le code ne peut pas certifier leur authenticité.

Identité exacte du pilote, déjà constatée dans le fournisseur :

- VID : `74F64E7D-7D90-425D-AFB3-487D28B1D09F`
- PID parent canonique : `EC60873E-E5A2-4081-82F7-427BC84A8A3D`
- SKU variante : `CJZBNSET00031-black`
- SKU parent : `CJZBNSET00031`

## Calcul et commande

Sur un environnement privé disposant de Node.js 22 ou supérieur, depuis la racine du dépôt :

```sh
node commerce/price-cj-pilot.mjs /chemin/prive/quote-verifie.json
```

Le CLI n'utilise aucune clé CJ, aucun service web ni aucune base de données. Il vérifie la validité temporelle (maximum 31 jours) et l'exactitude des coûts, utilise une borne supérieure EUR/USD explicitement validée par le vendeur, traite séparément les charges d'importation incluses et supplémentaires, puis recherche **au centime** le plus petit prix TTC permettant une marge de contribution d'au moins 25 % après frais de paiement, réserves et TVA vendeur. Les recettes HT sont arrondies **vers le bas** et les frais de paiement **vers le haut**. L'offre pilote est plafonnée à 150 € TTC, conformément au parcours de vente directe limité du dépôt.

Le résultat `provisional_floor_calculated` **n'est jamais un prix approuvé ou public**. S'il manque une pièce, le CLI échoue sans publier le contenu du JSON privé. Si aucun prix ne respecte le seuil, le résultat est `not_viable_under_150_eur_pilot_cap`, avec prix nul.

Le programme laisse toujours à `false` :
- `documentaryAuthenticityVerified`
- `actualPspContractVerified`
- `fullFranceDeliveryCoverageVerified`
- `publicPriceApproved`
- `checkoutApproved`
- `orderPlaced`

Ce calcul ne déploie rien, ne crée pas de brouillon approuvé, ne modifie pas `site/config.json` et ne permet ni paiement Mollie ni commande CJ.

## Conditions restant indispensables

Devis écrit CJ complet et daté, preuve du rôle d'importateur et de la collecte de TVA, justification du transport, tarif transporteur vers différents codes postaux, conformité de la montre et des piles (GPSR et obligations spécifiques), identité professionnelle, conditions légales de vente et retours, prestataire de paiement contractuellement actif et frais réels, trésorerie CJ préfinancée. Le calcul économique ne remplace **aucune** de ces validations.
