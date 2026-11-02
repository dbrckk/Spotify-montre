# Atelier Montres — système de vente directe indépendant du 2 novembre 2026

## Décision définitive

**Conserver notre propre site, notre marque, notre catalogue et notre hébergement Render.**
Aucune boutique gérée par une plateforme e-commerce tierce. L'intégration commerciale sera un **backend HTTPS distinct** relié à notre vitrine statique et à une base durable. Le paiement lui-même sera confié à un prestataire de paiement réglementé : **Mollie** en premier choix, **PayPal** en solution de repli. Ces prestataires ne gèrent ni notre catalogue ni notre boutique ; ils se chargent de l'encaissement sécurisé.

**En production aujourd'hui :** 52 montres, liens affiliés, filtres, comparateur et favoris. `site/config.json` conserve `checkoutMode: "inactive"`. Aucun panier encaissable, aucune commande réelle, aucun fournisseur ni compte de paiement validé. Ne pas faire croire le contraire.

### Architecture opérationnelle cible

```text
Visiteur → atelier-montres-selection-fr.onrender.com
                  │
                  ├─ catalogue / conseiller / avis / favoris existants
                  │
                  └─ seulement les références approuvées : acheter
                         │
                  API HTTPS indépendante (Workers / service serveur)
                         ├─ registre des variantes et prix TTC réels
                         ├─ stock / devis / import / livraison France
                         ├─ commande persistée + clé d'idempotence
                         ├─ adresse client chiffrée et accès restreint
                         └─ prestataire Mollie → checkout hébergé
                                  │
                           webhook paiement
                                  │
                       contrôle Mollie par API serveur
                       montant + devise + référence + mode
                                  │
                      état PAID, événement unique en DB
                                  │
                     commande fournisseur CJ validée
                         ├─ contrôle variante, port et prix
                         ├─ plafond de coût / provisions
                         ├─ CJ API payType=2 (solde préfinancé)
                         └─ preuve fournisseur / suivi
                                  │
                           suivi / SAV / retours
```

**Attention :** le client paie notre entreprise ; nous devenons responsable de la commande, de la conformité, de l'expédition, des remboursements et des garanties, même si le colis part directement de Chine. Aucune connexion à un compte de paiement n'a été réalisée lors de cette étape.

## Code déjà prêt pour notre propre site

- `scripts/evaluate-dropship-offer.mjs` et `research/dropship-offer.schema.json` : évaluation réelle en centimes, TVA selon statut vendeur, frais d'import et de paiement, contribution et **blocage si fournisseur/API/compte marchand/back-end non validés**. Un devis positif autorise seulement une revue, jamais une mise en vente.
- `scripts/commerce-mollie.mjs` : fonctions Node/serveur **réelles** de création d'un paiement hébergé en EUR et de relecture authentifiée du paiement via l'API officielle. Contrôle montant, devise, référence interne, identifiant de paiement et mode `live`/`test` ; l'URL de paiement est limitée aux hôtes du prestataire. Une notification ou une simple redirection client n'est **jamais** une preuve de règlement.
- `scripts/check-commerce-mollie.mjs` : tests hors réseau avec réponses contrôlées. Aucune donnée fictive n'est publiée comme offre commerciale.
- `site/config.json` : aucun encaissement activé tant que le backend, la persistance et les comptes ne sont pas réellement opérationnels.

La bibliothèque n'est **pas** un service de paiement déployé : il manque encore le serveur opérationnel, les accès du prestataire, les devis réels, le registre et les opérations fournisseur. Aucun token ni secret dans GitHub ou dans le JavaScript servi aux visiteurs.

## Ordre de réalisation de la version transactionnelle

1. **Dossiers légaux** : identité vendeur, statut et TVA, coordonnées authentiques, CGV, livraison, rétractation, garantie légale, médiateur, Règlement général sur la sécurité des produits, conformité batterie/emballage, importations.
2. **Fournisseur** : contrôler 2 ou 3 variantes exactes de montres. Échantillons, qualité, photos autorisées, coûts et livraison France TTC avec douane (DDP si possible), retours. Contrôler les prix dans la devise de paiement de CJ et le change.
3. **Backend indépendant** : choisir Cloudflare Workers + D1 (offres gratuites soumises à quotas) ou un serveur Render distinct ; utiliser un stockage durable, chiffrement pour adresses, limitation des requêtes, anti-abus, journal d'audit, gestion des doublons, reprise et sauvegarde. Le site Render statique reste inchangé.
4. **Prestataire de paiement** : ouvrir un compte marchand Mollie avec l'identité et le compte bancaire correspondants, puis tester paiements, refus, annulations, retours. Aucun besoin de demander les coordonnées bancaires des acheteurs sur notre site.
5. **Machine de commandes** : créer l'ordre idempotent AVANT le paiement ; verrouiller prix/TVA/port ; enregistrer le `paymentId`; traiter les notifications seulement après GET API authentifié. Vérifier le rapprochement paiement/commande dans une transaction DB, même après reprises et callbacks répétés.
6. **Automatisation CJ** : vérifier l'accès OpenAPI à CJ, les devis et le solde réel, puis `createOrderV2`/`createOrderV3` avec `payType=2` ou `payType=3` + paiement par solde. Avant tentative, bloquer si coût majoré, stock ou wallet incertains. Conserver le numéro fournisseur et vérifier son état, jamais un simple succès HTTP.
7. **Exploitation** : état `PENDING_PAYMENT` → `PAID` → `SUPPLIER_ORDERING` → `SUPPLIER_PAID` → `SHIPPED` → `DELIVERED`. En cas de timeout fournisseur, passer en **revue manuelle sans réessayer aveuglément**, faute de quoi une même commande peut être achetée deux fois. Prévoir `EXCEPTION` et `REFUNDED`.
8. **Activation très limitée** : une commande témoin réelle de bout en bout (avec autorisation), factures et suivi confirmé, puis seulement publication du bouton « Acheter » pour les SKU approuvés. Les autres modèles restent affiliés.

### Exigences de sécurité incontournables

- Montant serveur calculé sur une offre approuvée ; ne jamais faire confiance à un prix ou au statut `paid` transmis par le navigateur.
- Preuve de paiement : API officielle, référence DB, montant TTC et mode exact ; webhooks sans effet si inconnus, répétés ou discordants.
- Pas d'adresses en URL, logs publics ou dépôt GitHub ; chiffrement au repos et rétention minimale.
- Aucun appel CJ après simple retour navigateur ; uniquement après transaction persistante `PAID` et validation économique.
- Réserves pour remboursement, chargeback, SAV, commission de paiement, change et import ; bénéfice net confirmé seulement après dépenses et obligations fiscales.
- La vente directe n'est pas nécessairement sans frais supplémentaires : paiement, hébergement backend et frais fournisseur existent, même avec des solutions gratuites pour le calcul et le stockage.

## Pourquoi cette solution

**Mollie** : paiement hébergé et API par paiement, notification serveur suivie d'une requête authentifiée de vérification. Fonctionne sur un site web codé sur mesure sans plateforme de vente.

**CJ OpenAPI** : le paramètre `payType=2` peut régler les commandes avec le solde CJ **uniquement si le compte, la commande et le financement sont compatibles**. Le solde doit être provisionné avant le règlement fournisseur. Un prestataire de paiement peut différer le versement des fonds : prévoir la trésorerie.

**Workers + D1** : environnement indépendant et disponible avec des quotas gratuits ; non connecté à ce jour. La mise en place d'un compte et de secrets privés sera nécessaire au déploiement.

## Sources officielles

- Mollie : [accepter des paiements](https://docs.mollie.com/docs/accepting-payments), [créer un paiement](https://docs.mollie.com/reference/create-payment), [vérifier et traiter le webhook](https://docs.mollie.com/reference/webhooks).
- CJ : [API des commandes, payType et paiements par solde](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html).
- Cloudflare : [tarification Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/).
- DGCCRF : [obligations en dropshipping](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation).

**Décision de release :** aucune vente directe en production avant que les huit étapes aient une preuve positive. La monétisation affiliée reste disponible entre-temps.
