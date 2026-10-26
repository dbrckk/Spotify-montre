# Stratégie de sélection et d'encaissement des montres — 26 octobre 2026

## Décision
L'utilisateur souhaite une boutique cohérente visuellement, montrant des montres vendues sur Amazon ou ailleurs, où le client pourrait **payer sur notre propre site sans redirection**.

**Contrainte fondamentale :** Le programme Partenaires Amazon ne permet pas d'encaisser la commande Amazon sur notre site contre une commission d'affiliation. L'acheteur doit suivre le lien de suivi puis acheter sur Amazon. Sources officielles :
- https://partenaires.amazon.fr/help/node/topic/GWJ4AHCH7U5LCL86
- https://partenaires.amazon.fr/help/operating/policies
- https://partenaires.amazon.fr/help/operating/license

Pour un paiement intégré à Atelier Montres :
- Nous agissons comme **vendeur** (identité professionnelle, droit de rétractation, garanties et service client).
- Choisir un fournisseur grossiste ou partenaire dropshipping acceptant d'expédier en notre nom, ou stock propre contrôlé.
- Un partenaire Amazon ne nous verse aucune commission d'affiliation sur un achat encaissé chez nous.
- Intégration techniquement possible via Stripe **Checkout embedded** (`ui_mode=embedded`), API côté serveur protégée, journalisation des commandes, suivi de stock et webhooks signés. Certaines méthodes de paiement peuvent imposer un passage d'authentification externe.
- Hébergement du site statique sans abonnement ; backend/serverless gratuit dans ses quotas si nécessaire, frais de transaction Stripe incompressibles.
- Références Stripe : https://docs.stripe.com/payments/checkout/quickstarts et https://stripe.com/payments/checkout
- AUCUNE activation des paiements sans compte marchand Stripe, fournisseur, vrais prix/stock, logistique, conformité et politique de vente.

## Direction visuelle — sélection actuelle
**Objectif : trois familles de produits réels, présentés en 6 déclinaisons de style maximum au lancement**, avec seulement 2–3 produits effectivement listés lors d'un premier test commercial.

1. **Signature Sport Chic** : bracelet acier intégré, vert émeraude et bleu glacier, index discrets, 38–41 mm idéalement.
2. **Classique** : bracelet acier, noir profond et bleu nuit.
3. **Minimaliste** : maille acier cadran argenté, ou cuir sombre et champagne.

Palette unifiée : vert #1b2925, métal argenté, crème #f7f4ed, doré #d8b987. Présentation graphique homogène; photos réelles droits vérifiés sur fonds harmonisés lorsque les produits sont validés. Ne pas falsifier les images ou effacer les logos des marques : harmoniser via cadrage, éclairage et arrière-plan si licences autorisées.

## Comment sélectionner les vraies montres
Évaluer chaque référence exacte (pas seulement une photo publicitaire) :
| Critère | Points |
|---|---:|
| Allure premium et cohérence avec la collection | 25 |
| Produit vérifiable, vendeur fiable, droit d'usage des photos | 20 |
| Matériaux, confort, mouvement, tests et conformité documentés | 20 |
| Demande prouvée : commentaires crédibles, recherche, classement et historique | 15 |
| Disponibilité, livraison France, politique de retour et SAV | 10 |
| Rentabilité / commission nette après frais | 10 |
**Total 100.** À **80/100 minimum** + aucun critère bloquant de conformité ou droits, possibilité de préqualification. Toute donnée absente est « non vérifiée » et n'autorise pas la vente.

Pour l'affiliation pure, ne présenter ni prix ni stock Amazon sans accès autorisé à des données synchronisées et respecter les obligations de déclaration « lien affilié ». Les liens Amazon dirigent le client vers Amazon; ils ne satisfont pas l'exigence de paiement sans redirection. Les taux de commission varient selon la catégorie et le programme; se référer aux conditions officielles.

## Développement déjà réalisé
- `site/selection.html`, `site/selection.css`, `site/selection.js`.
- 6 concepts graphiques originaux, filtres par famille, favoris enregistrés localement et sélection copiable.
- La page d'accueil pointe vers le sélecteur.
- Aucune marque concurrente apposée à tort; aucun vrai produit, fausse photo, faux prix, avis client ni faux bouton d'achat.

## Priorités avant le catalogue commercial
1. Construire un tableau de recherche de **références exactes** avec fabricant, URL source et autorisation de photographies.
2. Obtenir au moins deux options fournisseurs pour 2 styles principaux, idéalement expédition depuis l'UE pour délais et conformité.
3. Créer/relier le compte Stripe marchand, avec vérification d'identité et statut professionnel par le titulaire.
4. Construire panier et Checkout embarqué **après** accord fournisseur et ajout de références authentiques.
5. Tester le paiement en mode test, anti-survente, sécurité, traitement des webhooks, taxes, expéditions et retours.
6. Publier seulement après validation humaine des éléments commerciaux et réglementaires.

## Conseils d'UX
- Les trois familles doivent utiliser des grilles et fonds identiques; pas de badges « luxe », « exclusif », « best-seller » sans preuve.
- Dans un vrai catalogue, chaque fiche contient au minimum référence, marque réelle, état, prix TTC, disponibilité, matériaux, dimensions, origine/entité, délais et politique de retour.
- Le chatbot existant reste limité aux réponses documentées; ne doit pas inventer le stock ni l'état d'une commande.
