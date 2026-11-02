# Atelier Montres — vente directe sans connexion Stripe (décision du 02/11/2026)

## Décision et état réel

**Choix : Render éditorial + Shopify pour le checkout et la commande + fournisseur CJdropshipping compatible avec une commande ET un règlement automatisés.** Le paiement client doit passer par **Shopify Payments** si le compte marchand est accepté ; il ne nécessite pas de connexion autonome au tableau de bord Stripe. Le système ne doit pas prétendre encaisser de l'argent tant que le checkout marchand n'est pas réellement actif.

Lecture des comptes au 02/11/2026 :
- Site Render en production : catalogue éditorial 52 montres et affiliation Amazon déjà déployés. **Ne pas remplacer cette monétisation tant que les ventes directes ne sont pas réellement ouvertes.**
- Boutique Shopify connectée, pays France, devise EUR : **forfait d'essai, aucun produit enregistré** au moment de l'inspection. Impossible de présenter un checkout direct valide depuis cette boutique aujourd'hui.
- Stripe autonome : utilisateur ne peut pas le connecter maintenant, ce qui n'empêche pas de préparer le parcours Shopify.
- Fournisseur CJ : **aucun compte, SKU, devis, stock, preuve de conformité ou activation wallet confirmé ici**. L'API CJ supporte une création de commande avec paiement par solde (`payType=2`) selon sa documentation ; son usage par notre compte et pour nos montres doit être vérifié en réel.
- **Shopify Collective est écarté pour cette boutique française** : au moment de la vérification, la France n'apparaît pas dans ses pays pris en charge. Ne pas contourner cette restriction par une fausse domiciliation.

## Parcours visé — aucun paiement tant que les dépendances manquent

```text
Atelier Montres / Render : découverte + comparaison
       ↓ (uniquement pour les SKU préalablement approuvés)
Bouton d'achat Shopify / checkout Shopify hébergé
       ↓
Paiement vérifié par Shopify Payments ; commande réelle enregistrée
       ↓
Connexion fournisseur Shopify↔CJ ou backend vérifiant Shopify Webhook HMAC
       ↓
Réconciliation obligatoire modèle exact / variante / stock / livraison FR / coût TTC
       ↓
Commande fournisseur unique (idempotence, limite de coût et de volume)
       ↓
CJ solde préfinancé → paiement automatique fournisseur confirmé
       ↓
Tracking réel → client → service après-vente / remboursements
```

La commande client **payée** ne prouve pas que CJ a pu payer ou expédier. Conserver des états distincts : `paid_customer`, `supplier_ordered`, `supplier_paid`, `shipped`, `delivered`, `exception`, `refunded`. Déclencher une intervention en cas de stock absent, adresse impossible, paiement CJ insuffisant ou divergence de devis. Le gestionnaire doit avoir la possibilité de rembourser sans laisser la commande bloquée silencieusement.

Si le fournisseur requiert une décision humaine ou que la wallet est insuffisante, **ne pas déclarer la commande automatisée**. Ne jamais tenter de payer AliExpress avec les identifiants/carte client ni recourir à un bot de paiement.

## Pourquoi CJ est prioritaire sur AliExpress direct

| Système | Encaissement client | Fournisseur automatiquement payé | Conclusion |
| --- | --- | --- | --- |
| Shopify Payments + CJ (wallet préfinancée, intégration admissible) | Via Shopify, une fois validé | Possible via API CJ `payType=2` ou mécanisme CJ d'auto-paiement, **à confirmer pour le compte** | **Candidat principal** |
| Shopify + DSers + AliExpress classique | Via Shopify | Le parcours standard DSers conduit à un paiement AliExpress manuel | Solution de secours seulement, ne répond pas à l'objectif 100 % automatisé |
| Shopify Collective | Via Shopify | Paiement automatique possible dans les pays éligibles | **Non disponible pour une boutique basée en France à la date de vérification** |
| Stripe directement sur Render | Exigerait backend, compte et conformité | Toujours pas de paiement fournisseur sans intégration distincte | **Complexité inutile maintenant** |

CJ Wallet doit être créditée **avant** les commandes ; un paiement Shopify peut être réglé au marchand plus tard, et le montant disponible peut être diminué des frais ou réserves. Il faut un fonds de roulement, des limites de budget et un journal de rapprochement. La différence prix client - prix fournisseur n'est **pas** du bénéfice net.

## Calcul de marge contrôlé avant publication

Le moteur `scripts/evaluate-dropship-offer.mjs` est prêt pour un **devis réel d'une variante exacte expédiée en France**. Il prend exclusivement des **centimes entiers**, sans prix d'appel ou frais supposés. Le prix client TTC inclut déjà les frais de livraison éventuellement facturés au client, et il ne faut pas décompter deux fois la TVA d'importation.

**Formule :** contribution = prix de vente hors TVA effectivement collectée - prix fournisseur - expédition - droits/frais d'import - TVA d'import non récupérable - frais de paiement - emballage - réserves retours/garantie/SAV - autres coûts variables.

Les conditions bloquantes sont, entre autres : absence de devis valide, référence ou variante non prouvée, frais douane incertains, preuve de conformité absente, frais occultés, paiement fournisseur manuel, wallet non financée, Shopify Payments non actif ou marge inférieure au seuil interne de prudence de **25 %** de la recette hors TVA. Ce seuil est un **critère interne de revue**, pas une garantie de rentabilité. Les cotisations et frais fixes doivent aussi être examinés pour le cas réel.

Commande de vérification, **uniquement lorsqu'un devis réel complet existe** :

```sh
npm run commerce:quote -- chemin/vers/devis-reel.json
```

Résultat : `eligibleForMerchantReview` ou motif de refus, **jamais** un ordre fournisseur ni une autorisation automatique de vendre. Les documents et preuves privés restent hors du dépôt GitHub public. Le fichier JSON peut respecter `research/dropship-offer.schema.json`.

## Déclencheurs avant ouverture au public

1. **Vendeur** : statut et identité vérifiés, mentions légales, CGV, TVA, rétractation, retours, médiateur, garantie, conformité montres et obligations importateur/emballages/piles.
2. **Boutique Shopify** : forfait permettant la vente, Shopify Payments vérifié, moyen de versement approuvé, commandes test réelles en environnement prévu à cet effet. Ne jamais créer une fausse commande publique.
3. **Fournisseur** : 2–3 SKUs réels avec références exactes, autorisation de revente et images, prix livré France, taxes/DDP, suivi, conformité UE, stock, délais et retours ; réserver un échantillon et valider le contrôle qualité.
4. **Fulfillment** : compte CJ accessible, app Shopify↔CJ ou API autorisée, wallet approvisionnée, limite par commande et journalière, idempotence (un achat client ne génère jamais deux achats fournisseur), remboursement et surveillance des erreurs.
5. **Présentation** : sur les seules fiches correspondantes, déclencher le composant officiel **Shopify Buy Button** ou son checkout hébergé. Ne pas recopier coordonnées ni CB dans le site statique, et ne pas placer de clés privées dans GitHub. Laisser les autres modèles en affiliation.
6. **Validation production** : vente témoin autorisée de bout en bout, statut de paiement, décompte fournisseur, numéro de suivi et procédure de retour. Puis déploiement sélectif. Tester le rendu Android et la conformité des obligations précontractuelles.

L'intégration Shopify en période d'essai ne remplace ni la validation du prestataire de paiement ni l'obtention d'un fournisseur autorisé. **État actuel : activation paiement bloquée ; conservation de l'affiliation.**

## Sources techniques vérifiées

- Shopify Payments France et conditions : https://help.shopify.com/fr/manual/payments/shopify-payments/supported-countries/france
- Intégration Shopify Buy Button externe : https://help.shopify.com/fr/manual/online-sales-channels/buy-button
- Pays Shopify Collective : https://help.shopify.com/fr/manual/online-sales-channels/shopify-collective/retailers/requirements-and-considerations
- CJ API paiement sur balance `payType=2` : https://developers.cjdropshipping.com/en/api/api2/api/shopping.html
- DSers AliExpress place & pay : https://help.dsers.com/fulfilling-customer-orders-how-to-place-pay-for-supplier-orders/
- DGCCRF dropshipping : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation
