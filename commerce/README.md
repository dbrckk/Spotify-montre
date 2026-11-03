# Atelier Montres — moteur de commandes directes

**Plan directeur :** [vente directe entièrement automatisée](../docs/ROADMAP_VENTE_DIRECTE_AUTOMATISEE_2026-11-02.md).

### Nouvelles conditions de publication obligatoires (novembre 2026)

Un SKU ne peut apparaître dans `GET /api/offers` ni être commandé sans :
- plafond de coût fournisseur **livré tout compris** exprimé en EUR (`supplier_landed_eur_ceiling_cents`), limite USD du débit CJ (`supplier_max_usd_cents`) et taux maximal prudent EUR/USD (`supplier_fx_max_eur_per_usd_bps`) avec risque de change documenté (`supplier_fx_verified`) ;
- régime TVA vendeur vérifié (`vat_rate_bps` et `tax_treatment_verified`) ; **marge contributive d'au moins 25 % du revenu net de TVA**, après réserves ;
- stock, fournisseur, données produits et variante exacte, photo autorisée, dossier de conformité/traçabilité GPSR ;
- politique retours, garanties et transferts de données fournisseur validés ;
- délai annoncé de livraison en jours ouvrés, entre 1 et 120, avec valeur mini et maxi cohérentes ;
- devis `verified_until` non expiré et compte/paiement fournisseur automatisable.

**Nouveau garde-fou devises :** une offre reste inactive si son taux de change plafond est absent, inférieur à 0,10 EUR/USD ou supérieur à 2,00 EUR/USD. Le taux est stocké en points de base (exemple : `10500` = **1 USD au plus 1,05 EUR** selon l'hypothèse de risque validée, et non un cours live). Le montant conservateur est calculé en entiers : `ceil(plafond_USD_centimes × taux_bps / 10000)`; il doit rester **inférieur ou égal** au plafond de coût rendu en EUR. Cette comparaison est faite dans PostgreSQL avant publication, dans le calcul de marge, puis sur le devis réel CJ **avant paiement client et avant achat fournisseur**, avec une copie immuable du taux dans la commande. Requalifier le taux et la réserve avant expiration du devis ; aucun taux réel n'est inventé par le moteur. Les anciennes offres sans taux deviennent indisponibles.

Le fournisseur CJ fournit les montants en USD. Quand `totalPostageFee` est disponible, il **inclut déjà les frais de dédouanement, taxes et droits** selon la documentation CJ ; ne jamais les additionner une seconde fois. En l'absence de ventilation taxes/tariff, ne pas présumer zéro. La conversion USD vers le plafond EUR et sa réserve de volatilité doivent être vérifiées avant approbation de l'offre.

Ces champs arrivent sur Neon via une migration SQL **sans perte** exécutée au prochain démarrage de l'API ; les offres existantes non qualifiées deviennent non achetables, même si le drapeau marchand est actif. Le prix, taux TVA et délai de livraison sont enregistrés dans chaque commande au moment de la vente, indépendamment des évolutions du catalogue.

**Une base initialisée sans offre = fonctionnement attendu.** Ne créer ni SKU, ni prix ou droits fictifs pour « débloquer » l'achat. Une commande client ne doit pas être autorisée pendant l'attente de CGV validées ou d'un prestataire marchand réel.


Ce service est **indépendant des plateformes de boutique**. Il ne remplace pas la vitrine
[Atelier Montres](https://atelier-montres-selection-fr.onrender.com/) : celle-ci reste hébergée
sur Render statique avec le catalogue 52 montres et ses liens d'affiliation.

## Flux de production conçu

1. Notre API ne publie que les offres enregistrées en base PostgreSQL, approuvées,
   en stock et assorties de preuves de conformité, photo, livraison, taxes et coût.
2. Le navigateur soumet l'adresse française, le consentement aux CGV et une clé
   d'idempotence. Le serveur calcule **lui-même** le prix complet en euros ;
   le navigateur ne fournit aucun prix.
3. La commande unique est écrite en base, l'adresse chiffrée par AES-256-GCM.
4. Mollie crée un lien HTTPS de paiement hébergé. Notre site ne traite aucun numéro
   de carte. Le webhook Mollie n'est **pas** interprété comme une preuve de paiement :
   un GET Mollie avec la clé privée vérifie référence, montant, monnaie et mode.
5. Une commande payée passe dans une file persistante. Le worker réserve
   une seule tentative CJ dans une transaction SQL avec budget quotidien global.
6. CJ vérifie le solde en USD, reçoit le bon VID, la méthode de transport, le
   nom et l'adresse du client et `payType=2` pour régler depuis le portefeuille.
   Une réponse incertaine passe en état **EXCEPTION** : il est interdit de payer
   une seconde fois sans réconciliation manuelle.
7. Le worker interroge le détail de commande CJ et met à jour paiement fournisseur,
   expédition, suivi et livraison. Le client consulte son statut avec une preuve
   de possession, sans exposition d'adresse en public.

**Aucun SKU n'est préinstallé.** L'offre est toujours vide lorsque `COMMERCE_ENABLED`
est absent ou différent de `true`.

## Environnement nécessaire

Service Node >=22, PostgreSQL persistant, HTTPS, connexion fournisseur et prestataire
de paiement. Variables privées à renseigner **dans le serveur** (jamais dans le site statique
ni sur GitHub) :

| Variable | Usage |
| --- | --- |
| `DATABASE_URL` | PostgreSQL durable ; tables créées au démarrage |
| `COMMERCE_ENABLED` | `true` seulement après validation légale et opérationnelle |
| `MOLLIE_API_KEY` | Clé **live** du compte marchand Mollie vérifié |
| `CJ_ACCESS_TOKEN` | Jeton CJ OpenAPI valide avec droits de commande |
| `ADDRESS_ENCRYPTION_KEY` | Clé aléatoire 32 octets en hexadécimal (64 caractères) |
| `IDEMPOTENCY_SECRET` | Chaîne cryptographiquement aléatoire d'au moins 40 caractères |
| `CJ_DAILY_CAP_USD_CENTS` | Plafond d'engagement fournisseur quotidien en cents USD |
| `STOREFRONT_ORIGIN` | Origine HTTPS publique de notre site, sans chemin |
| `COMMERCE_PUBLIC_URL` | Origine HTTPS du service de commandes, avec / final |
| `PORT` | Fourni par Render ; 8787 localement |

**Initialisation locale :**

```sh
npm --prefix commerce install --omit=dev --no-audit --no-fund
npm --prefix commerce run check
npm --prefix commerce start
```

`GET /healthz` répond sans données sensibles et indique si le checkout est désactivé.
`GET /api/offers` répond avec une liste vide tant que les conditions ne sont pas levées.
Les endpoints `/api/checkout`, `/api/webhooks/mollie` et
`/api/orders/:id` exigent des vérifications effectives avant toute action.

## Conditions **avant activation**

- Entreprise établie, CGV, politique de confidentialité, rétractation, mentions légales
  authentiques, TVA, garanties, conformité et responsabilité importateur.
- Compte marchand et banque **validés par Mollie**, approvisionnement CJ suffisant.
- Une à trois montres physiquement échantillonnées, fournisseur et VID exacts,
  photos autorisées, stock, frais transport et taxes DDP documentés, retours garantis.
- Devis fournisseurs approuvés avec une marge après paiement, TVA, douanes, SAV
  et chargebacks. `scripts/evaluate-dropship-offer.mjs` permet une vérification
  **préparatoire** d'un devis réel ; celle-ci ne remplace pas les validations humaines.
- Trésorerie suffisante pour payer CJ avant le versement des fonds Mollie.
- End-to-end sur un véritable environnement autorisé : paiement, webhook, commande
  CJ confirmée, livraison, remboursement, panne fournisseur et restauration de DB.
- Journal de surveillance des `EXCEPTION`, des `PAYMENT_REVIEW` et
  `SUPPLIER_SENDING` abandonnés. Un remboursement ne doit pas être annoncé
  sans preuve du prestataire ; aucune reprise de paiement fournisseur à l'aveugle.

## Rapprochement CJ avant d'annoncer une livraison

Le statut `getOrderDetail` contient **plusieurs identifiants distincts** :
`orderId` est l'identifiant CJ, `orderNum` peut être différent du numéro marchand,
et `productList[].storeLineItemId` correspond à notre ligne de commande.
La fonction `verifyCjOrderDetail` exige une correspondance du numéro de commande
dans la ligne fournisseur, l'identifiant CJ enregistré, la même variante et
quantité, le bon destinataire/adresse française, le transport prévu et un coût
USD inférieur au plafond accepté. Les réponses sandbox, les litiges, les
mauvaises devises ou les états inattendus sont mis en **EXCEPTION** (aucun
réapprovisionnement automatique). Sans `paymentDate` CJ, on n'affiche pas
« fournisseur payé ». Sans numéro de suivi cohérent, on n'affiche pas « expédié ».

**Références** : [CJ Query Order](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html#1-7-query-order-get)
et [statuts fournisseur](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html#order-status).

## Récupération automatisée d'un achat CJ interrompu

Lorsque le serveur a réservé une commande fournisseur mais n'a pas reçu la réponse
`createOrderV2`, il stocke l'état `EXCEPTION`. **Il ne tente jamais de
créer ou de payer une seconde commande.** En présence d'une API CJ réellement
connectée et d'un paiement acheteur toujours confirmé chez Mollie, le worker
utilise uniquement `GET /shopping/order/getOrderDetail?orderId=ord_...`
(la documentation CJ accepte l'identifiant marchand personnalisé).

L'ordre CJ n'est rattaché à notre base qu'après vérification : référence de
ligne, VID et quantité, identité CJ, adresse/destinataire, devise, coût plafonné,
mode non-sandbox et preuve de règlement. Si CJ indique un état créé mais
non payé, la commande reste en `EXCEPTION` avec son ID fournisseur pour
traitement humain (aucun débit automatique du wallet). Si CJ confirme son
règlement puis son expédition, le suivi reprend sans achat supplémentaire.

Même si les **nouvelles ventes sont mises en pause** (`COMMERCE_ENABLED=false`), les vérifications en lecture seule des paiements, du suivi et des commandes fournisseurs existantes continuent tant que leurs clés sont disponibles ; aucun débit fournisseur nouveau ne peut partir pendant cette pause.

Au maximum **12 vérifications espacées d'au moins 10 minutes** ;
`SUPPLIER_RECOVERY_EXHAUSTED` est journalisé si aucune correspondance fiable
n'a été trouvée. Une réponse CJ inaccessible ou ambiguë n'est jamais une
autorisation de recommander la montre. L'absence d'un compte fournisseur
actif laisse naturellement les commandes en attente de résolution manuelle.

Source : [CJ OpenAPI 1.7 Query Order — accepts custom order ID](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html#1-7-query-order-get).

## Limites actuellement non levées

Le code des connexions Mollie et CJ et la logique de paiement/commande sont réels,
mais **aucun compte marchand, offre ni portefeuille CJ n'est encore validé ici**.
Le checkout reste désactivé. Les dépôts et webhooks de clients réels ne sont pas
testables tant que ces comptes ne sont pas opérationnels. Une commission d'affiliation
versée par un fournisseur tiers serait un autre modèle contractuel ; dans ce parcours
nous conservons la **marge** de vendeur, et supportons ses obligations.

Le site statique n'est pas une base de commandes : ne jamais écrire les adresses ou
les secrets dans les fichiers publiés. PostgreSQL est la source durable et les
statuts publics ne révèlent jamais l'adresse.

## Références de protocole

- [Mollie Payments : création et webhook, contrôle GET serveur](https://docs.mollie.com/docs/accepting-payments).
- [CJ OpenAPI : `createOrderV2` `payType=2`, balance, détail](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html).
- [DGCCRF : obligations du vendeur en dropshipping](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation).
