# Atelier Montres — boutique sans abonnement

**Solution actuelle (25 octobre 2026) : vitrine premium statique gratuite + Square Online Gratuit pour le futur panier, les paiements, l'inventaire et les commandes.**

- **Vitrine en ligne** : https://neutral-spark-t96k64b.shipstatic.com/
- **Code de la vitrine** : [site/index.html](site/index.html) et [site/config.json](site/config.json)
- **Guide d'architecture et de lancement** : [docs/architecture-gratuite-square.md](docs/architecture-gratuite-square.md)
- **État** : pré-lancement. Aucune montre fictive, aucun paiement activé, aucun abonnement souscrit.
- **Contrôles automatisés** : `npm test` vérifie le thème Shopify historique et la vitrine autonome, notamment le blocage du lien marchand avant la validation de Square.
- **Hébergement** : ShipStatic plan gratuit, statut du déploiement confirmé `success`, expiration `null`.
- **Compte Square** : à créer par le propriétaire. Aucune intégration marchande ne peut être activée sans son compte et ses informations légales.
- **Frais** : hébergement à 0 €, pas d'abonnement imposé sur Square Gratuit, commissions par paiement et coûts physiques d'achat, livraison, retour, etc.
  
> Le fichier visuel est une vitrine de présentation. Les stocks et l'achat réel seront toujours administrés chez Square une fois la boutique ouverte, sans faux panier ni quantités locales désynchronisées.

## Archive Shopify précédente


Boutique Shopify française en cours de préparation, avec thème premium et catalogue alimenté exclusivement par de vrais produits Shopify.

> **Nom du dépôt historique** : « Spotify-montre ». La plateforme e-commerce employée est **Shopify** (et non Spotify).

## État
- Shopify connecté : `mu9rf9-xp.myshopify.com` (France, EUR, essai gratuit).
- Thème en ligne (à préserver) : Horizon.
- Brouillon personnalisé : **Atelier Montres — Brouillon** (ID `207266382172`), non publié.
- Accueil : section `sections/atelier-landing.liquid` + `assets/atelier-montres.css` + `templates/index.json`.
- Navigation : Accueil, Montres, Notre univers, Contact.
- Catalogue : aucun produit à vendre tant qu'un fournisseur réel, les stocks, les délais et les prix ne sont pas validés.

## Arborescence
```
shopify/
  sections/atelier-landing.liquid
  assets/atelier-montres.css
  templates/index.json
```
Les fichiers du sous-répertoire `shopify/` sont une **surcouche de thème**, conçue pour s'appliquer à une copie du thème Shopify Horizon. Le sous-répertoire n'est pas, à lui seul, un thème complet installable par ZIP.

## Déploiement
Les fichiers Shopify sont synchronisés directement vers le **brouillon** à l'aide de l'Admin GraphQL API. Ne jamais écrire automatiquement dans le thème `MAIN`. La publication doit attendre des tests visuels, des produits réels et la configuration des paiements, des livraisons, des retours et des mentions légales.

Aperçu provisoire dans l'interface d'administration Shopify : **Boutique en ligne > Thèmes > Atelier Montres — Brouillon > Aperçu**.

## Vérifications avant lancement
1. Tester l'affichage Android/desktop : accueil, fiche produit, variantes, panier, recherche, menus.
2. Sélectionner un fournisseur légalement exploitable depuis la France ; vérifier les droits des images, stocks, coûts, délais, origine et garanties.
3. Paramétrer TVA, livraison, retours, CGV, identité du vendeur, confidentialité et droit de rétractation.
4. Activer un forfait Shopify et le système de paiement, puis réaliser une commande test.
5. Publier le thème seulement après une validation complète.

## Règles
Ne pas importer de faux produits comme de vrais articles, ne pas inventer de prix, d'avis clients, de réduction, de garantie ou de délais de livraison. Préserver les thèmes publiés pendant le développement.
