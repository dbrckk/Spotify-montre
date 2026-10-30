# Atelier Montres — boutique de montres indépendante

## Nouvelle photographie éditoriale — 30 octobre 2026

**Refonte visuelle réelle :** couverture interactive avec quatre véritables packshots de montres, galerie photographique de trois modèles (Seiko 5 Sports, Orient Bambino, Tissot PRX), fiches accessibles d'un clic et visionneuse plein écran. Les images proviennent uniquement des fichiers `site/assets/watches/<id>.webp` associés à la référence exacte ; le statut de publication du modèle est contrôlé avant chargement. Un SVG est affiché en secours, sans le présenter comme une vraie photo.

Interactions entièrement locales, compatibles Android, flèches clavier et réduction du mouvement ; aucun framework, crédit IA ou hébergement d'images extérieur. Les 13 liens Amazon balisés, le catalogue et le SEO sont conservés et testés. [Revue visuelle : Tissot, Seiko, Chrono24, Hodinkee et star-list](docs/refonte-photographique-2026-10-30.md).


## Activation Amazon Partenaires — situation actuelle (30 octobre 2026)

Le propriétaire a confirmé depuis son tableau de bord Amazon Partenaires France que **`drackk04-21` est son ID de suivi** et que **`https://atelier-montres-selection-fr.onrender.com/` figure parmi les sites inscrits**. En conséquence, **13 liens de produits exacts ont été créés par le site au format balisé `?tag=drackk04-21`**. Les deux modèles sans ASIN exact n'ont pas de lien inventé. Cette méthode de création directe est autorisée dans les règles officielles du programme : https://partenaires.amazon.fr/help/operating/linkingrequirement.

La configuration active porte `approved:false` et `enrollmentStatus:"enrolled_approval_unverified"` : **l'inscription et la propriété du tag sont confirmées par le propriétaire, mais l'approbation finale, le statut précis du compte et les commissions ne sont pas vérifiés indépendamment**. Le site doit afficher les mentions obligatoires et ne promet ni paiement ni ventes attribuées. Le contrôle d'attribution doit s'effectuer depuis le Vérificateur de liens et les rapports Amazon. Documentation : [validation Partenaires France](docs/validation-amazon-partenaires-fr.md).

**Les sections plus bas relatant une affiliation désactivée constituent l'historique de préparation antérieur à cette activation.**


## Images des modèles et programme Amazon — 30 octobre 2026

**15 photographies des modèles exacts activées sur déclaration d'autorisation du responsable du site.** Chaque entrée porte une provenance explicite (`site_owner_explicit_confirmation_2026-10-30`) et ne prétend pas avoir fait l'objet d'une vérification documentaire indépendante. Les images locales et leur empreinte SHA-256 sont vérifiées lors du build SEO ; les SVG originaux restent des solutions de secours.

**Amazon Partenaires non validé à ce stade** : le site a 25 URL et 13 références Amazon.fr repérées, mais `site/affiliate-links.json` demeure désactivé. Le tag candidat présent dans la recherche n'est **pas** une preuve de propriété ni d'approbation. Amazon examine les candidatures après au moins 3 ventes éligibles en 180 jours et demande notamment 10 publications originales ; le nombre de fiches produit ne garantit pas leur appréciation.

Le mécanisme sait désormais distinguer une candidature **inscrite et en attente d'examen** (liens spéciaux d'un compte confirmé, approbation définitive encore `false`) d'un compte totalement approuvé : cette distinction est nécessaire pour obtenir les premières ventes éligibles. Aucun lien rémunéré n'a été publié sans identifiant vérifié du compte utilisateur. Les étapes réelles et le statut de candidature sont documentés dans [Validation Amazon Partenaires France](docs/validation-amazon-partenaires-fr.md) ; la traçabilité des photos est dans [Licences visuels](docs/licences-visuels-publication.md).


## Conseiller évolué : 4 critères et comparaison directe (30 octobre 2026)

Le conseiller gratuit et 100 % local sur `site/conseiller.html` permet désormais de choisir **la gamme, le style, le mouvement et le diamètre souhaité**. Les 3 montres aux boîtiers compacts (≤ 38 mm) et les 6 intermédiaires (38,1–40 mm) sont identifiées grâce aux dimensions présentes dans les sources ; les 6 autres mesures manquantes restent explicitement signalées, sans approximation.

Les recommandations s'ajustent immédiatement sur Android, sont partageables par URL, et un bouton envoie les trois résultats vers le **comparateur interactif** prérempli. Les prix indicatifs non vérifiés ont été retirés du formulaire. La validation couvre 135 combinaisons de filtres et le parcours navigateur Android/desktop.

Méthode, limites et tests : [documentation du conseiller de tailles](docs/conseiller-taille-boitier.md).

## Comparateur : 4 duels approfondis et 25 pages SEO (30 octobre 2026)

Quatre comparaisons détaillées de références exactes (PRX quartz/automatique, Tsuyosa/PRX, Casio MTP-B145/MTP-1302, Orient Bambino/Hamilton Field Auto) sont désormais générées avec le site. Chaque page possède ses caractéristiques sourcées depuis le catalogue, des SVG originaux, des liens fabricants et, quand le modèle est confirmé, un accès Amazon.fr non rémunéré par défaut. Les pages sont liées depuis l'accueil et les fiches produits ; elles entrent au sitemap et aux contrôles Android/desktop.

La **sécurité des correspondances ASIN** est renforcée : même avec un compte partenaire déclaré approuvé, un lien rémunéré vers une mauvaise référence fait désormais échouer la publication. Le compte Partenaires et les licences photographiques ne sont pas présumés approuvés.

[Guide technique des comparatifs](docs/comparaisons-horlogeres.md).


## Publication des visuels sans licence constructeur — 30 octobre 2026

**Correctif de conformité :** les quinze photographies constructeur du dépôt indiquent `publicUsageApproved:false`. Le générateur du site public les remplace donc par les **15 illustrations vectorielles originales** et retire les fichiers photographiques non autorisés du dossier public Render. Les visiteurs accèdent à la vraie photographie exacte via le lien du fabricant. Cette mesure couvre le catalogue, les fiches, les pages SEO, le conseiller et le comparateur.

Les fichiers sources restent dans l'historique/dépôt pour recherche ; leur accès public GitHub peut encore nécessiter une régularisation distincte. Toute autorisation doit être documentée avant de passer `publicUsageApproved:true`. **Un build statique seul ne régularise pas les droits sur une image.** Les vérifications CI contrôlent désormais l'absence des fichiers non approuvés dans la sortie publiée.

Voir [procédure de publication des images et limites](docs/licences-visuels-publication.md).

## Commerce : affiliation puis marque propre (30 octobre 2026)

**Objectif : une seule boutique, avec affiliation en première phase et vente directe de nos propres montres dans une deuxième phase.**

- **Phase 1 — affiliation Amazon.fr :** module disponible dans `site/affiliate-links.json`, strictement **inactif** jusqu'à l'approbation du vrai compte, la confirmation de chaque lien produit et des droits sur les photos. Les boutons sont affichés uniquement sur les produits validés ; le paiement affilié s'effectue toujours chez Amazon.
- **Phase 2 — notre marque :** fournisseurs chinois en prospection seulement. Outil `npm run supplier:check -- chemin/devis-reel.json` pour vérifier coûts rendus, marge de contribution et preuves de conformité. Aucune montre, photo ou spécification propre n'est présentée comme vendable.
- **Boutique directe :** pas de panier ni de checkout actif tant que stocks, vendeur légal, taxes, conditions de vente, garanties, webhooks et paiements réels ne sont pas disponibles.
- **Publication :** hébergement Render statique sans abonnement ajouté ; build et contrôles fonctionnels via GitHub Actions. Les 21 URL SEO demeurent accessibles.

[Feuille de route commerciale complète](docs/commerce-affiliation-marque-propre.md) · [Schéma d'un devis fournisseur](research/supplier-quote.schema.json) · [Vitrine publique](https://atelier-montres-selection-fr.onrender.com/).

## Mesure gratuite du trafic et des clics (30 octobre 2026)

- **Umami (open source)** : instrumentation des pages vues et clics Amazon par montre, facultative, via `UMAMI_WEBSITE_ID` dans Render. Aucun appel analytics tant que la variable n'est pas renseignée.
- **Statut commercial inchangé** : les 13 liens Amazon.fr exacts sont accessibles, sans activation rémunérée par défaut. Seuls les rapports Amazon Partenaires peuvent prouver clics attribués, commandes et commissions réellement dues.
- Tests de génération avec analytics activées/désactivées, notice de confidentialité cohérente et navigation non bloquée.
- Guide Android : [Analytics gratuites et rapports Amazon](docs/analytics-gratuites-et-revenus-amazon.md).

## Publication SEO sur Render — 30 octobre 2026

**[Ouvrir le catalogue de montres](https://atelier-montres-selection-fr.onrender.com/)** (nouvelle adresse stable, déploiement automatique depuis `main`).

- [15 fiches de montres générées côté build](https://atelier-montres-selection-fr.onrender.com/montres/citizen-tsuyosa.html), [guide d'achat](https://atelier-montres-selection-fr.onrender.com/montres/guide-choisir-montre.html) et [sitemap.xml](https://atelier-montres-selection-fr.onrender.com/sitemap.xml).
- Construction gratuite : `npm test && node scripts/build-seo.mjs && node scripts/validate-seo.mjs` ; publication du dossier `site/`.
- Les 15 fiches éditoriales sont des pages HTML indexables, sans prix de vente ni stock supposés. Les pages produit interactives historiques et la vitrine ShipStatic restent conservées.
- SEO technique validé par GitHub Actions et build Render. Une indexation dans Google ou l'obtention de trafic ne sont **pas** encore confirmées : la propriété Search Console et l'acceptation du sitemap restent à faire.
- **Aucun paiement n'est actif.** Une affiliation Amazon FR exige un compte Partenaires autorisé et des liens spécifiques. Une vente encaissée sur Atelier Montres impose d'être vendeur et de disposer d'un prestataire de paiement, de stocks, de CGV et d'obligations légales conformes.
- Les droits commerciaux des 15 photos constructeur ne sont pas vérifiés : obtenir des autorisations ou réaliser des photos originales avant un lancement marchand.

Voir [le guide d'exploitation SEO et commercial](docs/seo-publication-et-affiliation.md).

**Statut au 30 octobre 2026 : vitrine multimarque gratuite publiée, affiliation non activée, aucun paiement.**

## Version actuelle — V10 : interface mobile stabilisée (30 octobre 2026)

**Boutique publique : https://pulsing-ghost-y8qb527.shipstatic.com/**

- 15 photographies WebP authentiques des références sélectionnées (6 Essentielle, 6 Signature, 3 Prestige), conservées dans la publication.
- Comparaison de 2 à 3 montres persistante dans l'onglet, navigation vers une fiche et restauration après rafraîchissement.
- Correctif CSS : le comparateur flottant ne masque plus la page avant sélection ni après effacement ; le panneau d'assistance reste fermé jusqu'à l'ouverture explicite.
- [PR #2 fusionnée](https://github.com/dbrckk/Spotify-montre/pull/2), [tests Chromium Android réussis](https://github.com/dbrckk/Spotify-montre/actions/runs/41019092552) et [contrôles complémentaires réussis](https://github.com/dbrckk/Spotify-montre/actions/runs/41019092432).
- Déploiement ShipStatic réussi : 45 fichiers, sans expiration configurée, avec la vitrine multimarque en page d'accueil. Les pages internes d'étude fournisseurs ne font pas partie de cette publication.
- **Toujours en pré-lancement :** aucun suivi d'affiliation, prix marchand synchronisé, paiement ou stock actif. Les autorisations de réutilisation commerciale des photographies fabricant restent à régulariser.

**Fichiers principaux :** site/affiliation.js, site/affiliation.css, site/features.css, scripts/test-compare-persistence.mjs.

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
