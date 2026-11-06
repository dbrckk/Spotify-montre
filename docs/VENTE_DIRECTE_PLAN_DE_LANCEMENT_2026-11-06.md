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

## Documents de vente : validation obligatoire avant le premier paiement

Une nouvelle vérification indépendante du backend (`commerce/merchant-publication.mjs`) empêche **toute création de paiement Mollie et tout nouvel achat chez CJ** tant que les quatre fichiers publics suivants n'ont pas été examinés et approuvés ensemble :

- `site/informations-legales.html` : identité juridique réelle du vendeur, immatriculation applicable (SIREN/SIRET), contact et adresse ; retirer les mentions expliquant que ces données sont manquantes.
- `site/confidentialite.html` : document couvrant réellement les données de commande, adresse de livraison, destinataires CJ/PSP et droits RGPD ; ne plus affirmer qu'aucune commande ne peut avoir lieu.
- `site/conditions-generales-vente.html` : CGV réellement applicables, prix TTC, livraison, droit de rétractation, garanties légales, retours, service client et médiation lorsque requise. **Ce fichier n'est pas encore publié : ne pas inventer les données du vendeur pour le créer.**
- `site/acheter.html` : lien direct et accessible aux CGV réelles à côté de la case d'acceptation.

**Vérification gratuite depuis un terminal Node 22**, après avoir rempli les documents avec les informations exactes :

`node commerce/merchant-publication.mjs`

Cette commande produit la liste des pièces manquantes sans afficher les informations personnelles et, seulement si le dossier paraît complet, son empreinte SHA-256. Un résultat « documents présents » ne suffit **pas** à garantir que leur contenu est juridiquement exact : le responsable doit vérifier et approuver les mentions.

Après validation humaine, configurer **uniquement dans l'environnement privé du service API Render** :
- `MERCHANT_LEGAL_VERIFIED=true`
- `MERCHANT_LEGAL_BUNDLE_SHA256=<empreinte SHA-256 générée>`

Le backend relit les quatre documents à chaque vérification d'autorisation. Si l'un change, disparaît, ou si les variables Render sont absentes, **la caisse et toute nouvelle transmission de commande CJ se ferment**, même avec une clé Mollie live, un devis fournisseur et `COMMERCE_ENABLED=true`. Les anciennes commandes continuent à bénéficier du suivi et des rapprochements existants.

Cette validation s'ajoute aux deux verrous historiques : `checkoutMode=active` dans le site **et** `COMMERCE_ENABLED=true` dans l'API. Elle ne doit être configurée qu'après les preuves commerciales et fiscales, pas pour rendre des boutons visibles.

## Surveillance concrète du premier fournisseur

Le code versionné comprend le contrôle **en lecture seule** de la demande écrite déjà ouverte pour `CJZBNSET00031-black` (marqueur `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031`). La consultation automatique est définie dans `.github/workflows/cj-pilot-written-quote-watch.yml` : une exécution à l'intégration initiale, puis chaque jour à 08:23 UTC, et déclenchement manuel possible dans GitHub Actions.

- Le job utilise uniquement le secret GitHub `CJ_API_KEY`, jamais un jeton public. Sans secret ou en cas de panne API, **le contrôle échoue** : il ne prétend pas avoir reçu une réponse.
- Seuls la date, l'état et le nombre de messages fournisseurs **sanitisés** sont traités ; ni correspondance privée, ni identifiant de ticket privé ne sont publiés.
- Une réponse fournisseur, **même déjà marquée « lue »** alors que le statut reste `AWAITING_CJ_REPLY`, déclenche une intervention : l'existence d'un message de CJ ne prouve jamais que le devis est approuvé. L'absence inexpliquée du ticket existant est également signalée.
- Une réponse ou un ticket introuvable ouvre **au maximum une issue GitHub** associée à la référence du devis. Une répétition du contrôle ne crée pas de doublon. L'issue signale un contrôle humain nécessaire, **pas** un accord commercial.
- Le workflow n'appelle jamais la création de commande CJ, le portefeuille, l'API de caisse, ni la création d'un nouveau ticket fournisseur.
- Le seul chemin vers une mise en vente reste la **preuve écrite** du coût rendu en France (TVA, transport, droits, dédouanement, frais), des identifiants fournisseur (PID + VID + SKU), de l'importateur et de la conformité, suivie des contrôles documentés ci-dessous.
- Sur Android : GitHub → `dbrckk/Spotify-montre` → **Actions** → **CJ pilot written quote — read-only watch** → **Run workflow** ; le résultat figure dans le résumé du job. Si le fournisseur a répondu, ouvrir l'issue créée et consulter son portail CJ pour examiner le document de façon privée.

**Ne pas interpréter un job « vert » comme une approbation du devis** : cela signifie seulement que le ticket est encore en attente et que la récupération des métadonnées n'a pas échoué.

## Ordre de lancement (pilote : une seule référence)

1. **Vendeur responsable** : immatriculation et identité légale réelles, contact SAV, CGV, livraison, rétractation, garanties et politique de données ; ni adresses fictives ni clauses inventées.
2. **Devis fournisseur** : PID + VID + SKU variant + SKU produit pinés ; fournisseur identifié ; stock CJ, transporteur, délai à destination de la France, Incoterm et taxes/frais acquittés, importateur/opérateur économique, conformité produit/GPSR, retours et rappel. Obtenir les confirmations adaptées au SKU exact.
3. **Rentabilité TTC** : coût produit + expédition + taxes et dédouanement + change + frais PSP + réserves SAV/retour. Plafond de débit CJ et rentabilité minimale contrôlés côté serveur. Aucune marge calculée à partir d'un prix fictif.
4. **Paiement** : compte marchand Mollie vérifié, clés live **dans les secrets Render uniquement**, domaine, URL de webhook et configuration antifraude ; aucune clé dans GitHub ni frontend. Financement CJ contrôlé sans paiement à l'aveugle.
5. **Offre en base** : `commerce/offer-intake.mjs` revalide CJ et crée un brouillon non approuvé. Les preuves légales/fournisseur/importation sont ajoutées puis l'offre est qualifiée avec les vérifications SQL strictes ; `GET /api/offers` doit alors exposer exactement cette référence.
6. **Parcours acheteur** : clic « Acheter sur Atelier Montres » sur la fiche du modèle **uniquement si** l'API confirme cette référence → `acheter.html?modele=<id>` → contrôle du SKU exact, TTC, délais, adresse FR et CGV → Mollie → statut commande → ordre CJ unique → suivi livraison.
7. **Recette réelle encadrée** : vérifier réception effective du paiement, débit fournisseur unique, même VID/SKU, tracking réel, livraison et remboursement/retour. Ni tests d'argent réel non supervisés ni clients utilisés comme testeurs.

**Activation** : garder `checkoutMode=inactive` et `COMMERCE_ENABLED` désactivé tant que les jalons 1–5 et les essais requis n'ont pas été validés. Ce sont deux verrous indépendants. Ne jamais configurer `checkoutMode=active` uniquement pour rendre un bouton visible.

## Parcours client déjà intégré (contrôles toujours requis)

- Un `?modele=<id>` absent de `/api/offers` doit afficher une indisponibilité et laisser le paiement fermé ; **ne jamais présélectionner un autre SKU**.
- Pour chaque SKU qualifié, les boutons de commande directe seront insérés en priorité sur l'accueil, le catalogue 52, le comparatif 15, les fiches SEO principales/complémentaires et la fiche interactive ; aucune offre API = aucun bouton d'achat direct.
- Le texte commercial de l'accueil et des fiches change **uniquement lorsque des offres live sont exposées par l'API**. Les liens affiliés restent secondaires et clairement désignés comme achats indépendants.
- Contrôles de non-régression : aucun faux prix/stock, navigation Android, référence exacte, panne API, pages sans JavaScript, accessibilité et verrou de paiement.

**Livraison à considérer comme fonctionnelle seulement après preuve de commande réussie et d'expédition réelle.** Les contrôles GitHub et Render ne prouvent pas une transaction réelle.
