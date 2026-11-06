# Vente directe Atelier Montres — chemin de mise en production

**État vérifié le 6 novembre 2026.** Objectif commercial fixé : le client passe sa commande **auprès d'Atelier Montres**, paie le vendeur, et reçoit à son domicile l'article exact commandé par l'intermédiaire du fournisseur CJdropshipping. Ce n'est pas une commission d'affiliation. Les liens Amazon existants constituent un parcours distinct.

## Ce qui existe vraiment

- Site indépendant sur Render ; service Node `commerce/server.mjs` sur Render, base PostgreSQL prise en charge par `commerce/db.mjs`.
- Formulaire propriétaire `site/acheter.html`, interface `site/acheter-direct.js`, suivi `site/commande.html` et `site/commande-status.js`.
- `GET /api/offers` expose seulement les offres qualifiées ; `POST /api/checkout` valide l'adresse et la référence, revérifie CJ puis crée une commande et le paiement Mollie.
- Le webhook Mollie ne prouve jamais seul un paiement : statut revérifié côté serveur. Le fournisseur n'est payé qu'après confirmation et contrôle de la même commande. Reprise après timeout et prévention des doubles achats CJ existent dans le code.
- Achat via page de paiement sécurisée Mollie : commande et service après-vente restent **chez Atelier Montres**, sans redirection vers un marchand tiers. L'intégration de champs carte directement dans le site (Mollie Components, encore en bêta à cette date) est **une option distincte**, à évaluer après ouverture du compte marchand et essais supervisés.

## État exact aujourd'hui

- `site/config.json` : `checkoutMode=inactive` ; aucun paiement direct permis.
- `site/catalogue.json` : `products: []` ; ce registre ne contient **pas** les 52 modèles éditoriaux. Aucune de ces références éditoriales ne constitue automatiquement un SKU CJ vendable.
- L'API Render signale dans ses journaux `checkoutEnabled: false`. Le dernier état PostgreSQL détaillé (offres réellement qualifiées et commandes) n'est pas établi par ce journal.
- Un ticket CJ de devis livraison/conformité est ouvert pour le candidat `CJZBNSET00031-black` : réponse écrite et coût final livré non encore attestés dans le contexte disponible. Ne pas interpréter le ticket comme une offre approuvée.
- Identité légale du vendeur, CGV complètes, médiateur, garantie, retour, importation, TVA, preuve de droits image, compte Mollie live/KYC, financement du portefeuille CJ, devis et identité variante exacts : preuves d'activation **non toutes constatées**.

## Ordre de lancement (pilote : une seule référence)

1. **Vendeur responsable** : immatriculation et identité légale réelles, contact SAV, CGV, livraison, rétractation, garanties et politique de données ; ni adresses fictives ni clauses inventées.
2. **Devis fournisseur** : PID + VID + SKU variant + SKU produit pinés ; fournisseur identifié ; stock CJ, transporteur, délai à destination de la France, Incoterm et taxes/frais acquittés, importateur/opérateur économique, conformité produit/GPSR, retours et rappel. Obtenir les confirmations adaptées au SKU exact.
3. **Rentabilité TTC** : coût produit + expédition + taxes et dédouanement + change + frais PSP + réserves SAV/retour. Plafond de débit CJ et rentabilité minimale contrôlés côté serveur. Aucune marge calculée à partir d'un prix fictif.
4. **Paiement** : compte marchand Mollie vérifié, clés live **dans les secrets Render uniquement**, domaine, URL de webhook et configuration antifraude ; aucune clé dans GitHub ni frontend. Financement CJ contrôlé sans paiement à l'aveugle.
5. **Offre en base** : `commerce/offer-intake.mjs` revalide CJ et crée un brouillon non approuvé. Les preuves légales/fournisseur/importation sont ajoutées puis l'offre est qualifiée avec les vérifications SQL strictes ; `GET /api/offers` doit alors exposer exactement cette référence.
6. **Parcours acheteur** : clic « Acheter sur Atelier Montres » sur la fiche du modèle **uniquement si** l'API confirme cette référence → `acheter.html?modele=<id>` → contrôle du SKU exact, TTC, délais, adresse FR et CGV → Mollie → statut commande → ordre CJ unique → suivi livraison.
7. **Recette réelle encadrée** : vérifier réception effective du paiement, débit fournisseur unique, même VID/SKU, tracking réel, livraison et remboursement/retour. Ni tests d'argent réel non supervisés ni clients utilisés comme testeurs.

**Activation** : garder `checkoutMode=inactive` et `COMMERCE_ENABLED` désactivé tant que les jalons 1–5 et les essais requis n'ont pas été validés. Ce sont deux verrous indépendants. Ne jamais configurer `checkoutMode=active` uniquement pour rendre un bouton visible.

## Correctif du parcours (PR en cours)

- Un `?modele=<id>` absent de `/api/offers` doit afficher une indisponibilité et laisser le paiement fermé ; **ne jamais présélectionner un autre SKU**.
- Pour chaque SKU qualifié, les boutons de commande directe seront insérés en priorité sur l'accueil, le catalogue 52, le comparatif 15, les fiches SEO principales/complémentaires et la fiche interactive ; aucune offre API = aucun bouton d'achat direct.
- Le texte commercial de l'accueil et des fiches change **uniquement lorsque des offres live sont exposées par l'API**. Les liens affiliés restent secondaires et clairement désignés comme achats indépendants.
- Contrôles de non-régression : aucun faux prix/stock, navigation Android, référence exacte, panne API, pages sans JavaScript, accessibilité et verrou de paiement.

**Livraison à considérer comme fonctionnelle seulement après preuve de commande réussie et d'expédition réelle.** Les contrôles GitHub et Render ne prouvent pas une transaction réelle.
