# Atelier Montres — boutique de montres indépendante

**Statut au 30 octobre 2026 : vitrine multimarque gratuite publiée, affiliation non activée, aucun paiement.**

## Version actuelle — comparaison persistante et parcours Android vérifié (30 octobre 2026)

**Boutique publique : https://neutral-shell-t3y4rs7.shipstatic.com/**

- 15 photographies réelles WebP hébergées avec le site (6 Essentielle, 6 Signature, 3 Prestige).
- La comparaison garde jusqu'à 3 références dans l'onglet même après une fiche produit et un rafraîchissement, sans cookies et sans suivi.
- Les URL de comparaison partagée priment sur la sélection locale. Quand la sélection est vidée, l'URL est nettoyée pour éviter sa réapparition.
- Le bouton « Comparer » sur les fiches conserve les modèles déjà choisis.
- [Validation Android fonctionnelle sur code source](https://github.com/dbrckk/Spotify-montre/actions/runs/41016057161) et [validation du nouveau déploiement public](https://github.com/dbrckk/Spotify-montre/actions/runs/41016368177) : succès.
- Le déploiement gratuit est enregistré sans date d'expiration. Les programmes partenaires et autorisations de diffusion des images restent à régulariser avant une exploitation commerciale.

**Dépôt :** `site/affiliation.js`, `site/fiche.js`, `scripts/test-compare-persistence.mjs` et workflows mobiles.

## Historique — V9 galerie de photographies (27 octobre 2026)

**Boutique : https://slippery-lens-4x9n6zu.shipstatic.com/**

- 15 photographies authentiques **hébergées localement**, 6 montres accessibles, 6 intermédiaires et 3 prestige.
- Visionneuse plein écran sur chaque photo, agrandissement x2, navigation clavier / mobile.
- Nouveaux filtres quartz / automatique / solaire avec restauration du catalogue quand la recherche ne donne rien.
- Comparateur de 2 à 3 montres : photographies et différences techniques mises en évidence.
- Fiches avec vue agrandie, trois suggestions, favoris, partage et accès aux fabricants.
- Tests locaux Chromium avec assertions de la visionneuse, des images et des fiches, tests de navigation Android et vérification du site public.
- Vitrine de pré-lancement : sans paiement, sans inventaire synchronisé et avec droits de diffusion commerciale des photos restant à confirmer.

**Détails techniques :** [notes de livraison V9](docs/release-gallery-v9.md).

## Historique — V8 mobile et photographies réelles (27 octobre 2026)

**Ouvrir la boutique : https://hyped-logic-88n9yg5.shipstatic.com/**

Cette version est une **vitrine éditoriale de pré-lancement**. Elle ne propose ni paiement ni stock synchronisé. Les liens vers les fabricants ne sont pas rémunérés. Les droits de reproduction commerciale des photos de marques restent à confirmer.

- Quinze photos de **quinze références exactes**, converties en WebP et servies avec le site, empreintes SHA-256 contrôlées dans la sélection JSON. Le catalogue et les fiches utilisent les photos locales puis, si nécessaire, l'original externe.
- Menu Android compact et accessible, fermeture automatique au choix d'un lien.
- Fiches détaillées : liens précédent/suivant, trois modèles recommandés avec photos, favoris synchronisés avec le catalogue, partage natif ou copie de lien.
- Comparateur de 2 à 3 montres avec photos réelles, filtres, recherche et tri.
- Aucun prix ou stock inventé, images de secours si les fichiers deviennent indisponibles.

**Tests :** [parcours mobile et desktop Chromium](https://github.com/dbrckk/Spotify-montre/actions/runs/40490044458) et [audit des 15 images](https://github.com/dbrckk/Spotify-montre/actions/runs/40418018437).

Voir [notes de livraison V8](docs/release-mobile-v8.md).

## Historique : version V7 — refonte premium (26 octobre 2026)

- **Vitrine multimarque actualisée** : https://laced-kernel-wfhq43s.shipstatic.com/
- **Page de comparaison et fiche d'une montre** : https://laced-kernel-wfhq43s.shipstatic.com/montre.html?id=citizen-tsuyosa
- **Vitrine alternative marque propre actualisée** : https://piercing-dome-9j8c8zm.shipstatic.com/
- **Documents design / star-list** : [docs/refonte-horlogere-v6.md](docs/refonte-horlogere-v6.md).

Fonctionnalités : 15 montres de marques existantes (6/6/3) avec rendus vectoriels originaux différenciés, navigation, recherche, tri, favoris locaux, comparateur de 2 à 3 modèles, fiches techniques sourcées, liens vers les fabricants et recherches Amazon/eBay. Monogramme provisoire Atelier Montres, style éditorial et smartphone responsive. **FAQ, newsletter désactivée et chatbot local restaurés sur les deux sites.**

Les deux déploiements ont un état `success`, aucun délai d'expiration configuré. À ce stade historique, les visuels n'étaient **pas des photographies de la vraie montre** ; ce point a été corrigé en V8. Aucune licence fabricant/flux affilié n'est encore connectée, **aucun lien rémunéré**, aucun paiement ou stock commercial actif. Les deux sites sont au stade de pré-lancement.

## Photographies exactes des 15 modèles

Une galerie photographique privée a été déployée pour choisir les photos réelles sans copier les fichiers des fabricants dans le dépôt public. Les 15 URL sources exactes sont disponibles dans `site/selection-affiliation.json`, avec `publicUsageApproved: false` tant qu'aucun droit d'utilisation commerciale n'a été accordé. Voir [sources, accès de prévisualisation et conformité](docs/photographies-source-15-montres.md).

## Déploiements consultables (historique V5)

- **Vitrine multimarque (6 + 6 + 3)** : https://baseless-gate-affxm28.shipstatic.com/
- **Vitrine de notre future marque** : https://hazy-glow-qua5m5g.shipstatic.com/
- **Dossier de développement et conditions de lancement** : [docs/vitrines-affiliation-et-marque-propre.md](docs/vitrines-affiliation-et-marque-propre.md)

Les deux adresses correspondent à des sites de pré-lancement en hébergement gratuit, avec statut de déploiement `success` et sans date d'expiration configurée. Il n'y a **ni panier actif, ni commande, ni rémunération d'affiliation configurée**. Les catalogues et les médias sont déclarés comme sélections éditoriales/illustrations, et jamais comme des stocks disponibles.

### À connecter pour percevoir des commissions
1. Créer un compte [Amazon Partenaires](https://partenaires.amazon.fr/) ; le site doit être déclaré, et l'inscription reste soumise à examen et conditions.
2. En parallèle, candidater au réseau [Awin](https://www.awin.com/fr) et aux programmes CLEOR (ID 116169), ICE-WATCH (38756) ou autres marchands de montres adaptés.
3. Utiliser leurs **vrais liens de suivi générés par les tableaux de bord autorisés** pour les produits correspondants, puis déployer les URL après leur validation. Aucun faux identifiant d'affilié ou de commission ne doit être généré.
4. Respecter les obligations de transparence publicitaire et les licences d'images/prix. Les prix Amazon ne seront pas affichés sans accès aux flux/API autorisés.
5. Vérifier une conversion rémunérée réelle dans le tableau de bord avant de qualifier le système d'opérationnel.

### Pour lancer la marque propre
Voir le sourcing, les montants indicatifs, les contrôles matière/conformité et les devis dans le dossier ci-dessus. Le cadran `A · M` est un **logo provisoire non déposé**. Aucun produit à marque propre ne sera commercialisé sans identité du vendeur et vérifications d'importation.

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
