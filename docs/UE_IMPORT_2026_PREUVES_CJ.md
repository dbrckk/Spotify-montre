# Preuve d'importation UE 2026 — avant toute vente directe

**Statut au 4 novembre 2026 :** infrastructure préparée, aucune preuve fournisseur authentique reçue pour la montre CJ noire. Cette fonctionnalité ne valide, ne publie et ne commande **aucune** montre.

## Changement réglementaire à ne pas manquer

Pour les marchandises vendues à distance et importées hors UE vers la France métropolitaine :

- Depuis le **1er juillet 2026** : droit de douane forfaitaire de **3 € par catégorie tarifaire d'article** pour les envois jusqu'à 150 €, y compris les petits colis auparavant exonérés.
- Depuis le **1er novembre 2026** : frais européens de traitement de **2 € par catégorie tarifaire**, sans le même seuil.
- Pour une commande contenant **une seule montre d'une seule catégorie tarifaire** et une valeur déclarée ≤ 150 €, le montant de référence est **5 €** avant TVA à l'importation et frais éventuels du transporteur.
- Ce ne sont **pas** 3 € + 2 € par pièce si plusieurs pièces partagent une même classification ; les exceptions et les régimes préférentiels exigent une justification officielle et ne sont **pas** couverts par le pilote.
- Un fournisseur qui annonce uniquement le port ne prouve **pas** avoir payé la TVA, les droits et les frais de dédouanement. À l'inverse, si les 5 € sont déjà inclus dans un devis fournisseur complet et vérifié, il ne faut pas les ajouter deux fois.
- L'IOSS ne règle pas automatiquement les droits ou frais de traitement. La responsabilité du déclarant et les éventuels suppléments demandés au destinataire doivent être explicitement confirmés.

**Sources officielles, consultées le 4 novembre 2026 :**
- Douane française : https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne
- Douane française, mesures européennes mises à jour le 30 octobre 2026 : https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes
- Commission européenne : https://taxation-customs.ec.europa.eu/customs/eu-customs-reform_en
- Enregistrement IOSS : https://www.douane.gouv.fr/demarche/sinscrire-lioss

## Nouveau verrou commercial

La table PostgreSQL `commerce_offer_import_proofs` stocke **uniquement** les caractéristiques et l'empreinte SHA-256 d'une réponse écrite du fournisseur/carrier. L'original doit être conservé hors du dépôt, sur un espace privé sécurisé.

Un produit ne passe plus les requêtes de disponibilité ni le checkout si cette preuve :
- n'est pas liée au **bon VID, PID, SKU variante, SKU produit et transporteur** ;
- n'a pas au moins 3 € de droits et 2 € de frais de traitement attestés pour une montre d'une catégorie tarifaire ;
- ne prouve pas que la TVA à l'importation et les frais de dédouanement du transporteur sont pris en charge ;
- ne garantit pas **0 € de frais supplémentaires dus par le client à la livraison** ;
- ne précise pas que le payeur est le vendeur ou le fournisseur ;
- contient un coût total livré supérieur au plafond EUR approuvé de l'offre ;
- a expiré ou date de plus de sept jours.

L'expiration ou le remplacement du document **après le paiement** fait aussi échouer le contrôle final précédant l'achat CJ, sans tentative de rattrapage par un nouveau paiement automatique. Une résolution manuelle du client reste alors nécessaire.

Le verrou s'applique au **pilote mono-montre, origine CN, France, prix TTC ≤ 150 €**. Il ne prétend pas décider des droits habituels sur les envois de plus de 150 €.

## Mode opérateur privé

Après réception et vérification **manuelle** d'une confirmation écrite CJ couvrant toutes les conditions, créer hors du dépôt un JSON contenant **exactement** les champs suivants : `offerId`, `supplierVid`, `supplierPid`, `supplierVariantSku`, `supplierProductSku`, `logisticsName`, `fromCountryCode` (`CN`), `destinationCountry` (`FR`), `consignmentValueEurCents`, `tariffCategories` (1), `flatDutyEurCents`, `unionHandlingEurCents`, `importVatCovered` (vrai uniquement si justifié), `carrierClearanceCovered`, `buyerExtraEurCents` (0), `landedEurQuoteCents`, `importPayer` (`SELLER` ou `SUPPLIER`), `validUntil` (horodatage UTC, maximum 7 jours) et `operatorReviewed` (vrai après vérification effective).

Ne pas saisir soi-même des valeurs manquantes du fournisseur ni déclarer `operatorReviewed=true` tant que le document n'a pas été authentifié. Le programme calcule l'empreinte SHA-256 du document ; ne pas introduire de champ `supplierEvidenceSha256` dans le JSON.

Depuis un environnement privé autorisé disposant du dépôt et de Node.js 22 :

```bash
node commerce/record-eu-import-proof.mjs inspect /private/devis.json /private/reponse-cj.pdf
DATABASE_URL='postgresql://...' node commerce/record-eu-import-proof.mjs record /private/devis.json /private/reponse-cj.pdf
```

Le mode `inspect` ne lit pas la base et ne fait aucun paiement. Le mode `record` vérifie l'offre existante sous verrou transactionnel et enregistre une seule preuve sans l'écraser. Il exige l'accès à la base de données de l'exploitant ; **ne jamais exposer DATABASE_URL ou un document fournisseur privé dans GitHub Actions ou une PR publique**. Il est interdit de réécrire silencieusement la preuve d'une offre active.

L'existence de ce document **n'active pas** `approved`, `COMMERCE_ENABLED` ou `checkoutMode`, ni l'API de création de commandes CJ. Les contrôles déjà existants de marge, paiement marchand, stock, prix, conformité GPSR, garantie, photos et droits du consommateur restent obligatoires.

## Tests

Le workflow commercial utilise une base PostgreSQL 16 **locale isolée**, sans paiement ni fournisseur réel, pour vérifier : absence de preuve, preuve expirée, incohérences VID/SKU, droits et frais sous-estimés, blocage d'un achat CJ après expiration et non-approbation automatique lors de l'enregistrement. Les montants synthétiques des tests ne sont jamais proposés sur la vitrine.
