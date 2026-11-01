# Atelier Montres — faisabilité de la vente directe / dropshipping AliExpress (France, 1er novembre 2026)

## Décision

**Techniquement faisable, commercialement non activé.** Conserver le catalogue éditorial et l'affiliation publique actuellement en fonctionnement. N'ajouter **aucun bouton de paiement réel**, promesse d'achat automatique, collecte d'adresse client ou prix de vente tant que le régime fiscal, le fournisseur et les obligations consommateur ne sont pas vérifiés.

Une vente directe fait d'Atelier Montres le **vendeur contractuel du consommateur** ; même avec expédition par un fournisseur tiers, l'éditeur porte la responsabilité de la livraison, des remboursements, des garanties et de la conformité.

Sources : [DGCCRF — dropshipping](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation) ; [Service Public — règles e-commerce](https://entreprendre.service-public.gouv.fr/vosdroits/F23455).

## 1. Coût réel d'une montre AliExpress expédiée vers un particulier en France

| Variable | Règle de comptabilisation |
|---|---|
| Prix fournisseur du modèle **et de la variante exacts** | Prix **réel** pour un achat livré en France, devise et taxes incluses/ventilées ; jamais le prix d'appel non disponible |
| Livraison/assurance fournisseur | Devis du fournisseur pour le pays de livraison et le mode de transport (le montant peut être nul, variable ou majoré) |
| Droit de douane UE provisoire | Depuis le 01/07/2026, **3 € par catégorie tarifaire d'article**, en général pour un envoi d'une valeur jusqu'à 150 € ; **ne pas compter 3 € par colis sans vérifier les catégories** |
| Frais de traitement européens | À partir du **01/11/2026 : 2 € par catégorie d'article importé** pour les envois de vente à distance, sans seuil de valeur ; peut se cumuler avec le droit de 3 € |
| Au-delà de 150 € | Droits de douane ordinaires selon le produit, et frais de traitement applicables ; ne pas utiliser le 3 € forfaitaire |
| TVA | Généralement **20 % en France métropolitaine**, mais la **TVA applicable à la vente** et **la TVA à l'importation** dépendent du régime et de qui est importateur/redevable. Vérifier IOSS ou autre dispositif avec un professionnel ; ne pas additionner mécaniquement deux fois la TVA |
| Transporteur / dédouanement | Frais de représentation éventuels selon le service, notamment si non inclus DDP |
| Frais de paiement | Stripe standard cartes EEE : **1,5 % + 0,25 €** par paiement réussi à la date de vérification ; autres cartes et litiges potentiellement plus chers |
| Activité / risque | Cotisations ou charges, gestion du SAV, retours (dont retours en France), remboursements, écarts de change, réexpéditions, litiges, hébergement/backend, domaine |

Sources : [Douane française — petits colis, cumul et frais de 2 €](https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne) ; [mesures e-commerce, mises à jour au 30/10/2026](https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes) ; [IOSS](https://www.douane.gouv.fr/fiche/reglementation-sur-le-guichet-unique-de-tva-ou-ioss) ; [Stripe France](https://stripe.com/fr/pricing).

### Exemple purement illustratif, sans revendication de prix réel ni de bénéfice

Supposons **1 montre**, envoi direct hors UE vers la France, **une seule catégorie douanière**, valeur d'envoi sous 150 €, et taxes d'importation non incluses dans le devis fournisseur :

- Montre fournisseur : 12,00 € (hypothèse).
- Livraison fournisseur : 3,00 € (hypothèse).
- Droit de douane : 3,00 €.
- Frais de traitement : 2,00 €.
- Paiement Stripe sur un prix de vente supposé **39,90 € TTC** : 0,85 € environ (1,5 % + 0,25 €).
- **Somme arithmétique des coûts ci-dessus : 20,85 €**, hors TVA restant à régler, coût commercial, garanties/retours et charges de l'entreprise. **Ce n'est pas la marge ni le bénéfice.**

Ne jamais afficher automatiquement ces **5 €** en sus si le devis ou le contrat de transport les comprend déjà. Obtenir confirmation du régime **DDP / taxes prépayées** et de l'identité du redevable ; éviter que le client doive payer des frais imprévus à la livraison. Si le bien est **déjà physiquement situé dans l'UE au moment de la vente**, l'importation B2C de ce colis depuis un pays tiers n'a pas lieu dans les mêmes conditions.

## 2. Réalité de l'automatisation

**DSers** sait transférer/importer les commandes de boutiques Shopify/WooCommerce et synchroniser les statuts et numéros de suivi. **Pour AliExpress, ses guides 2026 imposent normalement une action de placement puis le paiement chez AliExpress** : le logiciel ne règle pas automatiquement les fournisseurs à partir de la carte du client. Le forfait Basic est gratuit (limites publiées sur le site). Une intégration 100 % autonome réclame un **accès partenaire/API autorisé** et un paiement fournisseur possible par voie officielle.

Sources : [DSers, guide place & pay](https://help.dsers.com/fulfilling-customer-orders-how-to-place-pay-for-supplier-orders/) ; [DSers, sync et limites du manuel](https://help.dsers.com/auto-sync-tracking-numbers-to-your-store/) ; [tarifs Basic](https://www.dsers.com/fr/pricing) ; [Alibaba developer DS API, admission requise](https://developer.alibaba.com/docs/doc.htm?articleId=120418&docType=1&treeId=762).

**Important** : une commande Stripe confirmée ne signifie ni paiement fournisseur effectué ni expédition confirmée. Il faut deux comptabilités / états distincts, et le compte de l'éditeur doit financer la commande fournisseur avant la disponibilité éventuelle des fonds Stripe.

## 3. Architecture compatible avec l'existant

Le site `atelier-montres-selection-fr.onrender.com` est actuellement un **site statique Render** : il n'a ni serveur d'ordres, ni base de données de vente, ni environnement de paiement utilisateur. Conserver le frontend ; déployer un **backend HTTPS** (service Render distinct ou autre service approprié) et un stockage persistant correctement sécurisé.

### Chaîne cible

1. Catalogue : choisir seulement 2-3 SKU/variantes vérifiés (par exemple SKMEI 2056, ADDIESDIVE AD2030), avec fournisseur contractuel identifié, stock ou disponibilité estimée fiable et preuve documentaire de conformité.
2. À l'affichage du panier, demander au backend un devis **signé, expirant** : SKU, variante, pays, quantités, devise, expédition réelle, droits/taxes, délai indicatif justifié et prix **TTC complet**.
3. Créer côté serveur la session Stripe Checkout pour le montant autorisé ; aucun secret Stripe ni identifiant fournisseur dans le JS public. Exiger le nom commercial et les conditions précontractuelles.
4. Recevoir **webhooks Stripe authentifiés** et idempotents ; stocker commande et état dans une base. Ne **jamais** passer commande fournisseur d'après une simple URL de retour ou un clic client.
5. Vérifier une nouvelle fois disponibilité, variante, conformité, adresse, frais et vendeur. Si les coûts ou la disponibilité divergent, bloquer et traiter remboursement/accord client ; ne pas imposer un supplément après commande.
6. Avec DSers : transférer la commande, **validation et paiement AliExpress manuels** par l'éditeur. Avec une API dropshipping légalement accessible : automatiser placement et paiement fournisseur avec budget plafonné, protection anti-doublons et rapprochement comptable. Aucune automatisation via bots capturant identifiants bancaires, captcha ou navigation fragile.
7. Synchroniser preuve de commande fournisseur, suivi et avis au client ; traiter livraison manquante, retours/rétractations/remboursements et chargebacks dans un système réellement opérationnel.

Références : [Stripe webhooks et fulfilment](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted) ; [Render site statique](https://render.com/docs/static-sites).

## 4. Obligations minimales avant encaissement réel

- Entreprise enregistrée, données de l'éditeur visibles, compte Stripe marchand vérifié, compte bancaire et fiscalité déterminés.
- CGV en français, informations légales, politique de confidentialité et de traitement des adresses, preuve du prix **TTC** et des coûts de livraison avant paiement ; politique anti-fraude, médiation et SAV.
- **Droit de rétractation de 14 jours**, fonctionnalité de rétractation en ligne lorsque requise, remboursement conforme ; **garantie légale de conformité de 2 ans** pour les biens.
- Conformité et sécurité des montres vendues dans l'UE, fabricant/importateur/personne responsable selon le cas, mentions et étiquetage, obligations environnementales liées aux produits/piles/emballages selon la catégorie ; droits sur les images et marques.
- TVA/IOSS, valeur douanière, transporteur, droits, service DDP correctement organisés. Selon le rôle d'importateur, vérifier EORI et obligations d'importation. En cas de non-prise en charge des frais import, annoncer le montant prévisible **avant** la commande plutôt que promettre « sans frais ».
- Consentement / fondement légal et minimisation des données de livraison transmises au transporteur/fournisseur, délai de conservation limité, sécurité de la base et webhooks.

Sources : [DGCCRF dropshipping](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation) ; [Service Public e-commerce](https://entreprendre.service-public.gouv.fr/vosdroits/F23455) ; [garantie](https://www.service-public.gouv.fr/particuliers/vosdroits/F11094) ; [IOSS](https://www.douane.gouv.fr/fiche/reglementation-sur-le-guichet-unique-de-tva-ou-ioss).

## 5. Portes de validation avant changement du site public

| Condition | État vérifié au 01/11/2026 |
|---|---|
| Catalogue de 52 montres + affiliation actuelle | En service, **à conserver** |
| Backend de commandes + base persistante sécurisée | **Absent** |
| Stripe marchand de la boutique connecté et validé | **Non vérifié**, aucun encaissement réel autorisé |
| Entreprise / régime TVA / responsabilité douane | **Non vérifiés** |
| Prix / stock / livraison / variantes fournisseurs exactes | **Non vérifiés pour une offre dropshipping exploitable** |
| Accès direct à une API AliExpress passant ET payant les commandes | **Non confirmé** |
| DSers (commande automatique mais paiement manuel AliExpress) | Possible sur plateforme supportée **après connexion** ; compte non confirmé |
| Conditions de retours / SAV / conformité / contrôle de sécurité | **À documenter et valider** |

**Décision de mise en production :** NE PAS activer un checkout sur les pages publiques à ce stade. La première étape de réalisation doit être un parcours de devis et de commandes côté serveur fondé sur **vrais SKU/charges**, sans encaissement jusqu'à levée des portes ci-dessus. L'affiliation demeure une source de monétisation utilisable en attendant.
