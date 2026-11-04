# CJdropshipping — demande de devis livré France, variante vérifiée

**Statut :** message prêt à transmettre au support CJ ; **non envoyé**. Aucun paiement ni commande fournisseur ne doit être lancé en attendant une réponse vérifiable.

## Message à CJdropshipping (anglais)

**Subject:** Written all-in landed cost and VAT/customs treatment — France, SKU CJZBNSET00031-black

Hello CJdropshipping support,

We are evaluating one specific dropshipping watch for shipment from the CN warehouse to a consumer in metropolitan France. Before enabling checkout, could you please provide a **written, itemized and binding-for-the-stated-conditions quote** or the exact official steps to obtain it?

- Product SKU: `CJZBNSET00031`
- Variant SKU: `CJZBNSET00031-black`
- Exact VID: `74F64E7D-7D90-425D-AFB3-487D28B1D09F`
- Canonical product PID returned by `product/variant/queryByVid`: `EC60873E-E5A2-4081-82F7-427BC84A8A3D`
- Dispatch warehouse: CN; destination: France, example postal code **75002**
- Quantity: **1 watch**, declared CJ variant weight **45 g**, logistics property **BATTERY**
- Preferred shipping services for comparison: **CJPacket Liquid Line**, **CJPacket Postal**, and **CJPacket Euro Sensitive F**

Our latest API readings confirmed inventory and 13 available shipping routes. However:
- `/logistic/freightCalculate` returned routes where `tariff` was absent.
- `/logistic/freightCalculateTip` returned routes where `taxesFee` and `clearanceOperationFee` were absent.

We cannot assume any missing field equals zero. Please confirm for each service:

1. The exact **goods price + shipping + all taxes/VAT + customs duty + customs clearance / handling fees + any additional charges** payable before or after delivery, in the specified currency.
2. Whether the delivery term is **DDP, DAP/DDU, or another Incoterm**, and **who is importer of record**.
3. Whether CJ collects or remits French/EU import VAT through **IOSS**, a carrier, or another arrangement; which charges are billed to the **seller** and which to the **recipient**.
4. Whether an extra amount can be charged upon arrival and what happens if the consumer refuses that charge.
5. Whether an official API or CJ checkout/pre-payment method returns a **complete tax-inclusive landed quote** for this VID before a customer is charged.
6. An estimated delivery window and shipment tracking coverage for the chosen service.
7. Compliance documents and applicable battery transport restrictions for this exact SKU.
8. Please confirm whether your **complete landed price expressly includes the EU temporary €3 customs duty** for low-value imports effective 1 July 2026 **and the €2 EU handling fee** effective 1 November 2026 for a single customs tariff category. Clarify the exact applicable tariff classification and whether these charges are collected once by the declarant, so that our checkout does **not double charge** them.
9. For French customs declarations submitted from **1 November 2026**, who assigns and transmits the required **merchant product identifier (M-PID, code C127)** and **non-standardised manufacturer/supplier product identifier (NS-PID, code C128)**? Please provide the actual identifiers used for this product, or explain the supported merchant configuration. If a **standardised manufacturer product identifier (S-PID, C129)** exists, please give it; otherwise confirm how you declare **Y081**. The internal CJ API product PID alone does not establish customs declaration compliance.
10. Can you provide a **redacted sample customs declaration or written operational confirmation** showing the applicable IOSS / non-IOSS VAT procedure, declarant, responsible party and product-identifier handling? Do not share personal data of other customers.

Please do not place an order or charge any wallet balance. A written quotation and clarification only.

Thank you.

## Critères de validation internes

La réponse doit également identifier les codes M-PID / NS-PID et la déclaration S-PID ou Y081, **distincts des UUID internes CJ**. Elle doit distinguer les droits forfaitaires, les frais européens de traitement et les frais du transporteur pour éviter une double facturation. La réponse doit permettre de documenter la référence VID, le transporteur exact, l'origine/destination, le poids, la période de validité, la devise, **le montant complet**, qui paie la TVA et les droits, le régime d'importation et les éventuels montants dus à la livraison. Une réponse « taxes may apply » sans plafond clair ne suffit pas pour activer un checkout.

Ensuite seulement : revalider les coûts, le change USD→EUR avec réserve, la marge TTC, les garanties/retours, la conformité et l'identité de l'opérateur économique, puis mettre en place le paiement marchand. Tous les contrôles commerciaux existants restent désactivés tant que ces éléments ne sont pas vérifiés.

## Références de preuve

- Scan CJ global : https://github.com/dbrckk/Spotify-montre/actions/runs/41821292411
- Devis simplifiés ciblés : https://github.com/dbrckk/Spotify-montre/actions/runs/41824347813
- Devis détaillé et PID officiel corrigé : https://github.com/dbrckk/Spotify-montre/actions/runs/41834688555
- Documentation : https://developers.cjdropshipping.com/en/api/api2/api/logistic.html

**Ne jamais joindre** `CJ_API_KEY`, `CJ_ACCESS_TOKEN`, une URL privée, un relevé de portefeuille ou des données personnelles clients au ticket.

Références douanières complémentaires (30 octobre et 4 novembre 2026) : https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes et https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne.
