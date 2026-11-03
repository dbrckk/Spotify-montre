# Paiements interrompus : reprise sûre du parcours client

**Date : 3 novembre 2026** — dépôt `dbrckk/Spotify-montre`, vitrine indépendante Render, aucun checkout public activé.

## Incident concret identifié

Dans l'ancien parcours, le navigateur conservait sa clé de tentative mais perdait le jeton de commande si le paiement Mollie avait été créé côté serveur et que la réponse HTTP était interrompue. Rejouer la requête retournait alors `409` sans permettre au client de retrouver le paiement : commande bloquée, client sans suivi. Effacer arbitrairement la clé pour réessayer serait dangereux, car cela pourrait ouvrir un second paiement.

## Correction

- `security.mjs` dérive un **jeton d'accès de commande stable**, par HMAC-SHA256 sur la clé d'essai du navigateur et un secret exclusivement serveur. PostgreSQL ne conserve que le SHA-256 du jeton ; la clé HMAC reste côté serveur. La clé de tentative est générée aléatoirement côté navigateur.
- `db.mjs` retrouve une commande par l'empreinte HMAC de cette tentative, vérifie **à l'identique** son panier/adresse via `checkoutFingerprint`, puis vérifie l'empreinte du jeton avant de restituer le même paiement. Un panier différent est refusé.
- `server.mjs` lance cette recherche **avant** les contrôles actuels de stock et de devis, qui pourraient avoir changé après la première commande. La récupération ne crée ni commande, ni paiement Mollie, ni achat CJ.
- Si le paiement est encore en attente et que son URL appartient à Mollie, la réponse réutilise **l'URL de paiement précédemment créée**. Dans tout autre cas, elle renvoie vers la page de suivi authentifiée, sans nouveau débit automatique.
- `acheter-direct.js` traite les deux réponses (`payment` et `status`), conserve le jeton dans la session et suit la commande sur la page de retour.

## Limites et exigences de sécurité

- Les tentatives créées **avant cette migration** utilisaient un jeton non dérivable : leurs réponses perdues restent en revue manuelle, sans second paiement. Aucune migration ne devine les jetons secrets historiques.
- Les requêtes partageant la même clé sont désormais sérialisées par `pg_advisory_xact_lock` dans la transaction de réservation. La seconde réutilise la commande et ne doit jamais créer un second paiement. Si le paiement est encore en préparation, la page conserve la même clé et propose une reprise manuelle ; elle ne produit pas une nouvelle tentative.
- Le contrôle sur PostgreSQL local vérifie deux réservations parallèles, une seule commande, la reprise de l'URL de paiement préexistante et le rejet d'un panier différent. Cela ne prouve **pas** un achat réellement réussi chez Mollie ou CJ.
- La possession de la clé de tentative permet à celui qui la détient de retrouver **la même** commande ; la clé doit rester secrète et aléatoire. Aucune adresse client ne doit figurer dans les journaux, le HTML ou les paramètres d'URL.
- Les URL de paiement autorisées sont strictement `https://www.mollie.com` et `https://checkout.mollie.com`. Une URL différente n'est jamais ouverte.
- Aucun mode test, montant inventé ou signal webhook non vérifié ne peut déclencher l'achat fournisseur.
- Ce travail ne remplace ni l'ouverture et validation du compte Mollie, ni l'identité du vendeur et ses obligations en France/UE, ni les variantes/stock/frais CJ documentés.
- **`site/config.json` reste `checkoutMode: inactive`**. Ne pas l'activer sans essais de paiement réel plafonné, rapprochement Neon/Mollie/CJ et règles de remboursement vérifiées.

## Vérification

Contrôles automatisés ajoutés à `commerce/selfcheck.mjs` : jeton stable, non-collision entre clés distinctes, reprise de l'URL Mollie, redirection vers le suivi d'une commande payée, refus d'URL tierce et rejet d'un jeton inconnu. Les workflows GitHub sont nécessaires avant fusion ; aucun paiement réel n'est simulé comme accompli.

## Prochain blocage commercial

La dernière mise en service nécessite des **comptes et accords réels** : marchand Mollie approuvé, fournisseur CJ avec variantes/devis/solde vérifiés, prix et régime TVA documentés, politique de retour/SAV et mentions légales complètes. Sans ces preuves, la publication de boutons de paiement serait trompeuse et risquée.
