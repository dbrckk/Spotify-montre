# Achat partenaire immédiatement accessible, sans fausse vente directe

Date : 4 novembre 2026. Notre propre site reste indépendant de Shopify.

## Situation du catalogue

- **52 montres documentées**, 15 fiches éditoriales approfondies.
- **13 fiches Amazon.fr exactes** dans le registre propriétaire `site/affiliate-links.json`, tag `drackk04-21`, sans prétendre connaître le stock ou le prix actuel.
- Le programme Amazon est déclaré inscrit par le propriétaire, mais **son approbation finale et les commissions effectivement perçues ne sont pas vérifiées**.
- Le paiement sur notre site reste inactif (`site/config.json` : `checkoutMode: inactive`) faute de coût livré CJ complet, de conformité produit, de prestataire de paiement marchand et de test de commande réelle.

## Fonctionnalité

La page [Où acheter une montre](https://atelier-montres-selection-fr.onrender.com/acheter.html#amPartnerSelection) présente les modèles dont l'ASIN et les photos sont documentés, avec leurs catégories Essentielle, Signature et Prestige. Elle est désormais reliée à l'accueil/collection.

Chaque carte offre : photographie locale autorisée de la variante publiée, marque et modèle, **fiche exacte sur Amazon.fr** avec mention `lien rémunéré`, lien vers la fiche de comparaison indépendante et avertissement de revérification de prix/variante/vendeur/stock/livraison/retours chez le marchand.

Le chargement est **fail closed** : trois sources doivent être cohérentes :
1. `site/affiliate-links.json` (configuration Amazon propriétaire et liens attribués) ;
2. `site/amazon-product-links.json` (correspondance exacte ASIN/URL non suivie générée par le build SEO à partir du registre de sourcing) ;
3. `site/selection-affiliation.json` (référence, gamme, droit de publication et empreinte de la photo locale).

Une configuration désactivée, une URL de produit modifiée, un ASIN incohérent, une photo sans approbation ou une source inaccessible affiche un message de repli **sans aucun lien de vente fabriqué**.

Les liens rémunérés utilisent `https://www.amazon.fr/dp/ASIN?tag=...` existants uniquement, `rel="noopener noreferrer nofollow sponsored"`, cible nouvel onglet ; pas de redirection cachée, pas d'appel au portefeuille CJ, pas de commande et pas de données acheteur. Les photos sont chargées en lazy-load et les contrôles sont accessibles clavier / tactile.

## Parcours observables à vérifier

- Depuis l'accueil : choisir le lien **« Voir les fiches chez nos vendeurs partenaires »**.
- Depuis la page d'achat : notre formulaire de paiement reste caché, mais les 13 cartes partenaires sont accessibles lorsque la configuration est valide.
- Filtrer par gamme sur Android, consulter la fiche éditoriale, ou ouvrir la fiche sur Amazon.fr.
- En cas de source non fiable : abandon automatique du panneau rémunéré, sans ouvrir une fausse caisse.

Le workflow `Validate premium mobile catalogue interactions` vérifie **réellement dans Chromium** le nombre de fiches, le lien exact et son tag, la présence de photos locales, le fonctionnement des filtres, l'absence de débordement sur 390 px, le fonctionnement sur 1280 px, ainsi que les scénarios de falsification d'ASIN, de retrait du droit photo et de désactivation de l'affiliation. Les captures sont publiées comme artefacts temporaires de la CI.

## Prochaine étape économique

Ne pas déduire de commissions d'un clic : **les revenus réels proviennent seulement des rapports Amazon Partenaires**, après vérification du compte et des achats éligibles. Sans données Analytics validées, aucun taux de conversion n'est affirmé. Pour augmenter les références commissionnables, vérifier un ASIN français exact ou obtenir un lien éditeur Awin réellement approuvé ; ne pas convertir des pages de recherche en fiches disponibles fictives.

La vente directe reste conditionnée à la réception d'un **devis CJ complet confirmé**, des documents douaniers M-PID/NS-PID/S-PID/Y081, de la conformité GPSR et du compte marchand. L'expérience partenaire constitue une alternative transparente pendant ces vérifications.
