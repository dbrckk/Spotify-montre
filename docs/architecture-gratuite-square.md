# Site gratuit + Square Online : architecture de vente

## Objectif
Éviter tout abonnement e-commerce obligatoire, tout en conservant une vitrine premium indépendante.

- **Vitrine statique** : `site/index.html` et `site/config.json`, hébergement gratuit (ShipStatic ou Cloudflare Pages).
- **Vente effective** : Square Online, formule **Gratuit** en France (0 € par mois), sur un sous-domaine gratuit `*.square.site`.
- **Paiement** : Square, tarif annoncé au 25/10/2026 de 1,4 % + 0,25 € pour les cartes UE/EEE et 2,9 % + 0,25 € pour cartes UK/hors EEE.
- **Stocks, panier, commandes, retrait/livraison/expédition** : gérés **uniquement dans Square** pour éviter des données de stock désynchronisées.
- **Stock physique** : montres achetées, contrôlées, stockées et expédiées depuis la France par le vendeur.

## Activer la vente, pas avant
1. Créer/valider le compte professionnel Square (nécessite identité du titulaire ; ne jamais transmettre ses coordonnées bancaires ici).
2. Configurer le catalogue de **vrais** produits conformes, les quantités et prix, et le sous-domaine gratuit Square.
3. Configurer les zones et frais de livraison réels, les paiements, l'identité légale, la TVA, les CGV, le droit de rétractation et la politique de confidentialité.
4. Effectuer un test réel du parcours complet avant publication.
5. Modifier `site/config.json` avec `{"status":"open","squareStoreUrl":"https://MON-SOUS-DOMAINE.square.site/"}`, puis redéployer. Le domaine doit être un `square.site` valide ; sinon la vitrine reste fermée.
6. Conserver l'inventaire et la gestion des commandes dans Square : **aucun faux panier JavaScript** et aucun chiffre de stock statique.

Le contenu du site ne présente aucun produit inventé. Le lien commercial est invisible tant que la boutique Square n'est pas opérationnelle.

## Coûts hors plateforme
Les frais de transaction sont inévitables. L'achat des montres, l'importation, le matériel d'emballage, les étiquettes de transport, les retours et les obligations réglementaires ne sont **pas gratuits**. Un domaine personnalisé est facultatif.

## Pourquoi pas uniquement une vitrine avec des Payment Links ?
De simples liens Stripe peuvent gérer le paiement mais **ne créent pas à eux seuls** un panier, une gestion automatique des stocks, de l'expédition et des commandes physiques. Pour un lancement sans hébergement backend payant, Square Online est la solution plus complète.

## Sources vérifiées
- https://squareup.com/fr/fr/online-store/plans
- https://squareup.com/fr/fr/legal/general/fees
- https://squareup.com/help/fr/fr/article/6861-create-an-order-online-page-with-square-online-store
- https://squareup.com/help/fr/fr/article/8042-create-and-manage-shipping-rate-profiles
- https://developers.cloudflare.com/pages/platform/limits/

## Site historique Shopify
L'ancienne surcouche de thème est conservée dans `shopify/` à titre d'archive. La boutique Shopify payante ne sera pas utilisée comme système de paiement. Aucun abonnement n'est souscrit ni résilié automatiquement.
