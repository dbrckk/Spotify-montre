# Diagnostic ciblé de la variante CJ — 4 novembre 2026

## Constat vérifié

Le scan global [41821292411](https://github.com/dbrckk/Spotify-montre/actions/runs/41821292411) a contrôlé 25 produits dans 14 recherches. La variante **Digital Wrist Watch, noir**, VID `74F64E7D-7D90-425D-AFB3-487D28B1D09F`, avait du stock CN au moment de la mesure, mais ses **13 options de livraison ont été exclues** par la validation du coût complet. Aucune variante n'a été déclarée commercialisable.

La documentation de [`freightCalculate`](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html) illustre un devis simple contenant `logisticPrice`, `logisticName` et `logisticAging` sans certifier systématiquement les frais d'import. Un champ fiscal absent **n'est pas égal à zéro**.

## Amélioration

Le code de lecture `discoverCjVariant` retourne maintenant :
- `shippingQuoteDiagnostics` : nombre d'options reçues, renseignements d'import manquants, transporteurs invalides, incohérences de prix, doublons aux prix contradictoires ;
- `shippingRouteSamples` : au maximum 8 transporteurs avec le **prix du transport de base** lorsque déclaré et les noms exacts des champs fiscaux absents ;
- `shippingMethods` conserve **seulement** les options qui respectent les contrôles monétaires complets. La vente reste désactivée sans devis recevable.

Ce diagnostic ne consigne **jamais** les réponses brutes fournisseur, les clés, les adresses, les jetons, ni les détails de commandes. Les libellés transporteur sont contrôlés et bornés.

Le rapport s'obtient en exécutant une seule fois le workflow manuel
[Diagnostiquer un devis CJ ciblé](https://github.com/dbrckk/Spotify-montre/actions/workflows/audit-cj-freight.yml).
Le tout premier lancement est automatique au moment de l'intégration de ce fichier, afin de limiter toute intervention Android.

Le workflow interroge uniquement `queryByVid`, `stock/queryByVid`, puis `freightCalculate` si le stock CN est confirmé. Environ **30 points API maximum** selon les règles CJ, hors authentification. Aucun paiement ni commande.

## Décision après diagnostic

Si les 13 options de CJ sont bien seulement des tarifs de base, l'étape suivante consistera à récupérer auprès de CJ **un prix livré complet incluant les droits et taxes**, potentiellement par `freightCalculateTip` avec les champs obligatoires `srcAreaCode`, `destAreaCode`, `productProp` et `weight`, **uniquement** lorsqu'on disposera de données exactes fournisseur sur la variante. On ne fabriquera ni poids ni taxe.

Les préconditions légales, TVA, conformité GPSR, garantie, identité fournisseur, prix TTC, marge et paiement marchand restent nécessaires avant vente directe.
