# Atelier Montres — boutique de montres indépendante

**Statut au 26 octobre 2026 : pré-lancement, vitrine gratuite, pas de paiement activé.**

## Deux expériences principales — octobre 2026

**1. Sélection multimarque (affiliation à connecter)** : `site/affiliation.html` présente 15 vraies références (6 Essentielle, 6 Signature, 3 Prestige). Filtres et favoris locaux, liens directs officiels vers les fabricants, aucun prix inventé ni photo piratée. Les liens actuels sont non rémunérés tant que les comptes Amazon Partenaires / Awin ne sont pas acceptés et que les liens spéciaux ne sont pas installés.

**2. Maison Atelier Montres (marque propre)** : `site/marque.html` illustre trois concepts Émeraude, Glacier et Minuit. Leur production, personnalisation et stock restent à confirmer. **Aucun article en vente ni aucun encaissement sur ce site**.

Les deux projets partagent la charte vert profond, or et crème et sont conçus pour un hébergement gratuit indépendant. Tous les fichiers sont conservés dans ce dépôt.

Documents : [Stratégie détaillée des deux vitrines](docs/vitrines-affiliation-et-marque-propre.md).

## Architecture actuelle
- **Vitrine de marque** : `site/index.html`, `site/base.css`, `site/features.css`.
- **Choisir un style** : `site/selection.html` — six illustrations conceptuelles homogènes, favoris locaux, aucun faux produit.
- **Catalogue vérifié** : `site/catalogue.html`, `site/catalogue.json`, `site/catalogue.js` — aucune montre en vente avant vérification fournisseur, photo, conformité et prix.
- **Studio fournisseurs** : `site/studio.html`, `site/fournisseurs.json` — outil d'étude comparatif sans authentification, à usage préparatoire, non destiné au client ; pas de données confidentielles.
- **Données sources** : `research/fournisseurs-candidats.json` — annonces à confirmer.
- **Chatbot FAQ et newsletter** : `site/app.js` — chatbot local sans coût d'API, newsletter inactive tant qu'un formulaire conforme n'est pas connecté.
- **Protection** : `site/config.json` doit rester `status:"prelaunch"` et `checkoutMode:"inactive"` jusqu'au lancement vérifié.

### Vente directe sans redirection

Le précédent projet **Square Online** est abandonné comme parcours commercial parce que l'utilisateur exige le paiement sur Atelier Montres. L'ancien document `docs/architecture-gratuite-square.md` est **historique, non applicable à l'architecture actuelle**.

La direction prévue est un **paiement embarqué** (Stripe Embedded Checkout ou mécanisme équivalent), avec backend sécurisé, authentification du marchand, webhook vérifié, et synchronisation réelle du stock. Le paiement ne peut pas être considéré comme opérationnel ni lancé tant que l'entreprise, les fournisseurs, les conditions de vente et le compte de paiement ne sont pas en règle. Certaines authentifications bancaires peuvent ouvrir une étape externe imposée par les banques.

L'affiliation Amazon standard exige un achat final sur Amazon et n'autorise pas l'encaissement Amazon sur Atelier Montres contre commission classique. Amazon peut servir de **source d'étude de marché**, pas de prestataire de paiement intégré pour des achats affiliés.

### Conditions d'approvisionnement
Objectif : montres élégantes **sans logo tiers**, maximum **20 € rendues en France** par pièce, incluant coûts répartis. **Aucun fabricant confirmé, aucune commande d'échantillon.** `site/studio.html` conserve quatre pistes et indique les points manquants : référence exacte, autorisation photos, matériaux, conformité/traçabilité UE, MOQ logo, prix importé et SAV.

### Qualité technique
`npm test` vérifie :
- le thème Shopify historique (archive),
- la vitrine, l'accessibilité de base, la sécurité du chatbot et des liens newsletter,
- le sélecteur de concepts,
- le catalogue sans paiement par défaut,
- la parité entre les données fournisseur publiées et leur source,
- la syntaxe JavaScript via `node --check`.

Aucun prix de vente, avis, stock, logo, caractéristique ni garantie non vérifié ne doit être affiché comme réel.

## Hébergement
Le site se déploie sur ShipStatic gratuit, les liens actifs des déploiements sont donnés au fil des mises à jour. Un déploiement `success` prouve que les fichiers sont servis ; **cela ne prouve pas qu'un parcours d'achat est fonctionnel**.

## Ancien thème Shopify (conservé)
`shopify/` contient une surcouche du thème Horizon sauvegardée. Shopify n'est plus le parcours marchand cible. Ne pas publier son ancien brouillon ou modifier le thème principal sans accord.

## Documents
- [Stratégie de vente sans redirection](docs/selection-et-vente-directe-sans-redirection.md)
- [Recherche de fournisseurs à moins de 20 €](docs/selection-montres-20-euros.md)
- [Conformité et lancement France](docs/preparation-lancement-fr.md)
- [Vitrine précédente et newsletter](docs/vitrine-premium-v2.md)

Le projet est expérimental tant que l'identité du vendeur, les conditions légales, les paiements et l'approvisionnement ne sont pas mis en place.
