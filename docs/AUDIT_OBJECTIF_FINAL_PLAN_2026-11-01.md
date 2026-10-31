# Atelier Montres — audit de production, objectif final et feuille de route
**État contrôlé : 1er novembre 2026 · `dbrckk/Spotify-montre` · `main` à `d3511f374e9b86723ca27d0f7e0b082ff6dd49c8`**

> **Périmètre et limites.** Audit du dépôt GitHub, de ses scripts, de son README, des configurations publiques et des pages de production. Un crawl effectué via navigateur distant a interrogé **70/70 URL présentes dans `sitemap.xml`**, sans échec ; toutes étaient associées à un titre, une description et une canonical cohérente. Cela **ne valide ni l'indexation Google ni les classements**, ni l'absence de bugs interactifs sur chaque appareil. Aucune mesure Lighthouse de laboratoire, aucun relevé de Core Web Vitals terrain, aucune capture d'écran comparative ni tableau de bord Amazon/Search Console n'ont été récupérés pendant cet audit. Les scores suivants sont des **estimations qualitatives de maturité**, pas des statistiques d'audience ou de performance.

## 1. Définition du produit final

**Atelier Montres : le guide d'achat francophone, accessible, visuellement premium et réellement utile pour choisir une montre au meilleur rapport style/usage/budget, puis acheter chez un marchand vérifié par des liens partenaires attribuables.**

**Le métier est l'affiliation éditoriale, PAS la vente directe.** Aucune commande, aucun panier propre, aucune prétention de vendeur ; toute transaction, garantie, livraison ou retour se conclut chez le marchand. La piste « notre future marque » est hors priorité et n'est pas une justification pour détourner l'accueil.

**Promesse côté visiteur :** en moins de deux minutes sur Android, trouver une montre adaptée à son usage, son esthétique, ses dimensions et son budget ; voir la **vraie photo du modèle**, ses caractéristiques étayées, deux alternatives argumentées et la **bonne offre marchande**. Les vues IA ne servent qu'à l'éditorial et sont toujours désignées comme non contractuelles.

**Positionnement différenciant :** beaux modèles réellement abordables (SKMEI, Casio, ADDIESDIVE, Pagani Design, etc.) pour la découverte, complétés par des montres de moyenne gamme et de référence afin de satisfaire différentes intentions ; comparaison indépendante, non prétendue issue d'essais non réalisés. L'ambition d'être visible sur « montres » est **à long terme** : les premières opportunités concernent des recherches spécifiques à intention d'achat (modèle, style, budget, usage, format).

**Succès business :** commissions réelles et vérifiées dans les rapports des programmes, attribuables à un trafic organique qualifié, sans inventer de stocks, prix, remises ni volumes de ventes.

## 2. État constaté — faits vérifiés

| Élément | Constat au 01/11/2026 | Source |
| --- | --- | --- |
| Catalogue public | **52 modèles** : 15 fiches principales, 37 complémentaires | Accueil + `site/selection-affiliation.json` et `site/selection-populaires.json` |
| Pages en sitemap | **70/70 accessibles**, titre/description/canonical présents et canoniques cohérentes | Crawl des 70 URL de production |
| Visuels | 15 photos principales déclarées autorisées ; **21 photographies complémentaires** sur attestation du responsable du site, **9 concepts IA SKMEI** identifiés | `site/popular-photo-rights.json`, `site/popular-ai-visuals.json` |
| Monétisation | 13 correspondances Amazon.fr exactes sur 15 fiches principales, 3 ASIN complémentaires documentés ; **34/37 complémentaires ouvrent une recherche Amazon** | `site/affiliate-links.json`, `research/amazon-fr-popular-verified.json`, boutique en ligne |
| Amazon Partenaires | Identifiant `drackk04-21` déclaré ; `enabled=true`, mais `approved=false`, `enrollmentStatus=enrolled_approval_unverified` : **aucune commission ni acceptation finale indépendamment vérifiée** | Configuration publique |
| Parcours principal | Accueil et conseiller valorisent **15 modèles**, tandis que 37 autres restent dans un second parcours | Accueil en production ; `site/conseiller-engine.js` |
| Mesure | `site/analytics.js` sait émettre des événements Umami sur les clics Amazon, uniquement lorsque l'identifiant Umami est configuré. **Activation en production et données de performance non vérifiées** | Code + absence de rapport analytique |
| Mentions légales | `informations-legales.html` signale expressément des informations d'identification/coordonnées encore **incomplètes** | Production |
| URL héritée | `/affiliation.html` retourne visuellement le même contenu que `/` et une canonical vers `/` ; le site comporte encore des liens internes vers cet ancien chemin | Pages publiques et source `site/affiliation.html` |
| Tests | Workflows GitHub SEO, vitrine, catalogue Android, WCAG déclarés réussis sur la PR #44 | Actions de la PR #44 ; ces tests ne mesurent pas les revenus ni les positions Google |
| Ancienne documentation | README contient les états historiques « 36 », « 45 », « 15 » ; information chronologique utile, mais le résumé du catalogue actif devrait annoncer 52 | `README.md` |

### Principaux points forts

Architecture statique légère, catalogue aux références précises, photos locales, filtres et conseiller fonctionnels dans les validations automatisées, pages modèle distinctes, guide, comparatifs, mentions d'affiliation proches des liens, navigation HTML accessible, canonical et sitemap cohérents. Les fichiers d'images et liens sont contrôlés lors du build.

### Dette/risk majeurs

1. **P0 — conformité/confiance.** La page légale dit elle-même être incomplète. Un site professionnel doit identifier l'éditeur et l'hébergeur dans les conditions prescrites. Aucun détail personnel ne doit être inventé.
2. **P0 — sortie commerciale.** 34 liens complémentaires sur 37 aboutissent à une **recherche Amazon**, pas à la fiche exacte. Cela ajoute une étape, introduit des variantes et rend la conversion moins fiable. La validité et la disponibilité actuelles des trois ASIN historiques doivent aussi être revérifiées.
3. **P1 — proposition de valeur dispersée.** Le visiteur voit une « sélection 15 montres » en vitrine alors que le catalogue réel en propose 52. Le conseiller ne travaille que sur 15. La future marque propre prend de l'espace alors qu'elle n'est pas vendue.
4. **P1 — prix/budget.** La promesse de belles montres pas chères ne se traduit par **aucun véritable filtre de budget tarifé** ni comparateur de vendeurs. Le souci de ne pas afficher de prix périmé est justifié, mais les catégories « Essentielle/Signature/Prestige » ne remplacent pas une tranche de prix documentée.
5. **P1 — valeur éditoriale.** Plusieurs fiches complémentaires reposent sur les mêmes modules (points forts génériques, quatre faits, avant achat). Consolider des comparatifs distinctifs et des conseils spécifiques à l'usage pour ne pas être assimilé à de l'affiliation pauvre en contenu.
6. **P1 — acquisition non mesurée.** Pas de rapport Search Console/Umami/Amazon consultable dans cet audit ; le bon crawl ne prouve aucune croissance réelle.
7. **P2 — direction visuelle.** Des concepts IA et des photos réelles coexistent ; ils sont signalés, mais doivent rester séparés en toute circonstance. L'image principale doit toujours représenter le produit à acheter. Audit visuel mobile par **captures d'écran** requis ; aucun score visuel définitif sans cette preuve.
8. **P2 — duplication/maintenabilité.** `index.html` source et `affiliation.html` sont historiquement utilisés comme surfaces distinctes, puis réécrits au build ; README et certaines limites de 15 modèles sont figées. Documenter l'unique source de vérité et éliminer les chemins hérités sans casser les 70 URL.

## 3. Notes qualitatives de maturité (0–10), non benchmark concurrentiel

| Dimension | Note estimée | Ce qui limite la note |
| --- | ---: | --- |
| Structure technique / publication | **7,5** | Bonne génération statique et CI ; dépendance aux ressources CDN externes |
| SEO technique | **7,5** | 70 pages accessibles ; indexation et Core Web Vitals terrain non mesurés |
| Richesse fonctionnelle | **6,5** | Comparateur, filtres, conseiller ; 37 références exclues du conseiller |
| Photo / merchandising | **6,0** | 21 photos complémentaires ; 16 autres sans photo sur cette sélection, images IA auxiliaires |
| Contenu utile et original | **5,5** | Sources et faits ; besoin d'analyses différenciantes et de preuves éditoriales fortes |
| Parcours achat / conversion | **4,0** | 34 recherches génériques, pas de budget/prix exploitable, CTA peu hiérarchisés |
| Mesure des conversions | **3,0** | Code de tracking présent, rapports et résultat commercial non vérifiés |
| Confiance / conformité | **3,0** | Mentions légales incomplètes ; régime d'affiliation final non confirmé |
| **Maturité globale estimative** | **~5,5** | Produit crédible en développement, pas encore un comparateur affilié mature et rentable |

Ces notes sont des **hypothèses de priorisation** et non des résultats d'une étude d'utilisateurs ou d'un Lighthouse.

## 4. Backlog priorisé, avec définition de terminé

Les priorités sont ordonnées **fiabilité → fonctionnement réel → sécurité/conformité → architecture → performance → interface → options secondaires**. Chaque chantier doit être terminé et validé avant d'empiler des fonctionnalités.

### P0 — rendre le site commercialement sûr et vérifiable (prérequis)

**P0.1 — transparence légale** : lister les champs effectivement obligatoires selon le statut de l'éditeur (identification, contact, hébergeur, directeur de publication si applicable) et les alimenter **uniquement avec des faits communiqués ou vérifiables**, sans placeholder public. Conserver le service d'affiliation transparent. **Terminé :** la page ne signale plus de manquement et les coordonnées/identifiants nécessaires sont réels ; vérification selon Service-Public.

**P0.2 — route et source de vérité** : auditer `/` vs `/affiliation.html`, leurs liens et leurs canonical ; choisir `/` comme accueil unique et appliquer redirection permanente appropriée ou suppression des liens internes dupliqués, sans 404 ni boucle. Arrêter d'éditer une ancienne copie HTML sans cohérence avec le build. **Terminé :** un seul parcours d'accueil, aucune duplication de navigation, liens testés.

**P0.3 — audit marchand exact** : créer une matrice `model_id → variante/ASIN ou marchand → URL destination → état de preuve → date de contrôle → divulgation`. Revérifier toutes les fiches Amazon.fr déjà étiquetées exactes ; désactiver/fallback en cas d'incohérence. Pas d'ASIN calculé d'après le nom. **Terminé :** aucune association modèle/annonce non sourcée ; chaque CTA décrit son type (« produit précis » ou « recherche »).

**P0.4 — données mesurables** : vérifier activation Umami sur le **site public**, Search Console et rapports Amazon ; tableau de bord de base avec clics entrants, impressions, requêtes, pages de destination, clics sortants **par modèle/placement** et revenus confirmés. Ne jamais inventer des métriques. **Terminé :** un événement de sortie vérifié sur le domaine, et un tableau de bord réel identifié ou un état « source non connectée ».

### P1 — unifier l'expérience des 52 montres (la priorité produit)

**P1.1 — catalogue unique** : architecture commune des 15 modèles historiques et 37 complémentaires, filtres genre/style/type de cadran/boîtier/mouvement/diamètre/budget documenté, recherche accent-insensitive, favoris et URLs partageables. Préserver les fiches SEO, la navigation et les filtres sans JS. **Terminé :** 52 modèles accessibles depuis la recherche principale et un parcours mobile cohérent ; aucun doublon.

**P1.2 — conseiller 52 modèles** : remplacer la limitation `15` du moteur par le registre normalisé 52 ; afficher compatibilité avec les critères, désaccords et incertitudes plutôt que des notes artificielles. Proposer 3 suggestions + alternatives. **Terminé :** chaque modèle pertinent peut être recommandé ; sélection reproductible ; cas « données manquantes » explicites.

**P1.3 — fiche achat orientée décision** : vraie photo au-dessus de la ligne de flottaison, nom exact, trois bénéfices, dimensions utiles, matériaux/étanchéité correctement nuancés, réserves, variantes, raison de la recommandation, alternatives comparables, CTA marchand prioritaire. Les images IA restent un module éditorial secondaire. **Terminé :** 52 fiches sans confusion entre rendu IA et produit vendu ; une action d'achat principale et une preuve de modèle.

**P1.4 — budget sans prix inventé** : ajouter un **filtre de tranches de prix uniquement lorsque des prix publics vérifiables et datés sont disponibles**, ou des fourchettes clairement identifiées comme prix publics conseillés/indicatifs, pas un prix Amazon courant. Supprimer tout filtre vide ou incertain. **Terminé :** aucun prix périmé présenté comme transactionnel, aucune fausse bonne affaire.

### P2 — monétisation effective, d'abord sur les meilleurs candidats

**P2.1 — sélection commerciale prioritaire** : choisir 12–20 références selon l'attrait visuel, disponibilité réelle, précision de la fiche, potentiel de recherche et accessibilité ; intégrer SKMEI/Casio/ADDIESDIVE/Pagani en premier si les liens marchands existent réellement. **Terminé :** chaque référence prioritaire est visible en page d'accueil, a une vraie photo, une fiche utile et une destination d'achat vérifiée.

**P2.2 — couverture des liens** : faire passer progressivement le maximum de **34 liens de recherche** vers des fiches d'annonce exactes, éventuellement chez d'autres programmes partenaires **autorisés et effectivement activés**. Laisser la recherche explicite quand aucun SKU exact n'existe. **Terminé :** au moins **90 % des 20 références prioritaires** disposent d'une destination produit précise et valide, sans prétendre couvrir les 52.

**P2.3 — expérience d'achat** : tester le parcours « requête Google → catégorie → modèle → comparaison → marchand ». Un CTA visible mais sans fausse urgence, une mention de commission adjacente, un clic vers le bon modèle et une solution de repli sans inventer d'offre. **Terminé :** toutes les sorties marchandes prioritaires contrôlées sur Android et PC.

**P2.4 — économie unitaire** : utiliser les rapports réels des partenaires pour calculer : `commissions validées / clics sortants`, `revenu / 1 000 sessions`, `conversions validées / clics affiliés`, par catégorie et marchand. Prioriser la contribution réelle, pas le nombre de montres ou un taux de commission théorique.

### P3 — référencement organique à valeur ajoutée

**P3.1 — clarifier les pages principales** : titre et message de l'accueil alignés avec 52 modèles et la promesse « modèles beaux, accessibles, comparés ». Réduire les répétitions, recentrer l'appel à l'action. Conserver « 15 modèles comparés en profondeur » uniquement là où c'est pertinent.

**P3.2 — prioriser des intentions réelles** : blocs « SKMEI », « Casio vintage », « montre homme élégante pas chère », « montre femme petit poignet », « montre à cadran vert », « montre quartz ou automatique », « bracelet acier pas cher » uniquement avec contenu distinct, photos véritables et références fiables. Éviter des dizaines de pages quasi-dupliquées.

**P3.3 — guides originaux** : analyses documentées de différences de qualité, matériaux, lisibilité, dimension et entretien ; critères « pour qui / pour qui non », tableaux exacts, sources, date de révision, illustrations pédagogiques originales. Ne pas simuler d'essai pratique.

**P3.4 — crawl/index** : garder les 70 pages déjà accessibles ; vérifier réellement les pages indexées, impressions et erreurs de Search Console, traiter canoniques/facettes et maillage ; aucune promesse de première position pour « montres ». **Terminé :** toutes les pages stratégiques sont découvrables via liens HTML, sans URL dupliquée et avec rapport d'indexation réel.

### P4 — finition visuelle premium et mobile

**P4.1 — audit visuel par captures** : Android 360/393/430 px et bureau, parcours accueil → filtre → fiche → comparer → marchand, sur le site déployé (capture réelle, pas simple inspection de CSS). Corriger ruptures de grille, hiérarchie, états vides et visuels trop peu lisibles.

**P4.2 — système de design** : tokens de couleurs/espacements, typographies, ratios des cartes et contrastes unifiés ; image produit exacte en premier. Quelques animations micro-interactives pertinentes (transition de galerie, filtres, sélection) mais réduction des mouvements respectée et aucun effet qui dissimule un achat.

**P4.3 — Web Vitals** : mesurer d'abord. Objectifs utilisateur p75 : **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1** (seuils Google), avec compression WebP/AVIF appropriée, dimensions d'images, CSS critique et contrôle des requêtes CDN. Le budget de performance doit inclure les ressources Shopify des concepts IA.

### P5 — architecture, maintenance et contrôle qualité

**P5.1 — données comme source unique** : modèle normalisé `Product`, `MerchantOfferReference`, `ImageRights`, `EditorialEvidence`, `LinkAudit`. Générer conseiller, catégories, fiches, compteurs, sitemap, recherche et homepage depuis la même source. Supprimer les quantités en dur « 15/37 » lorsqu'elles ne désignent pas intentionnellement la collection principale.

**P5.2 — pipeline reproductible** : build déterministe, contrôle des liens, duplication canonique, échec de validation des variantes/ASIN, gestion des images, balises sponsorisées, tests mobile WCAG et smoke post-déploiement. Tests approfondis avant fusion et publication (plutôt qu'à chaque micro-retouche).

**P5.3 — fraîcheur du catalogue** : revue automatique **quotidienne ou hebdomadaire, selon la fiabilité du marchand**, des URL sources et offres ; rapport de divergences, sans scrape interdit, sans mise à jour silencieuse de faits sensibles et sans auto-publication d'une référence douteuse. Utiliser `dbrckk/star-list` comme bibliothèque optionnelle après vérification licences, maintenance et compatibilité.

**P5.4 — observabilité** : alerte en cas d'indisponibilité des pages critiques, dégradation des Core Web Vitals, échec des médias CDN, baisse des clics ou dysfonctionnement du build ; sauvegardes des registres et procédure de retour arrière.

### P6 — expansion après preuve de fonctionnement

Élargir par catégories à forte intention et données disponibles (diversité de modèles, vendeurs affiliés, gammes). Une newsletter n'est ajoutée qu'avec double opt-in, désinscription et base légale. Une éventuelle marque propre, boutique Shopify ou vente directe constitue **un projet séparé**, à ne pas faire dépendre de cette phase d'affiliation.

## 5. Définition de succès et métriques — pas de chiffres inventés

| KPI | Situation actuelle | Cible / règle de décision |
| --- | --- | --- |
| Pages sitemap accessibles | **70/70 testées** | 100 % au contrôle de publication |
| Liens vers mauvaise référence | Non mesuré sur les 52 en temps réel | **0** sur les 20 références commerciales prioritaires |
| Couverture ASIN/URL exacte | **16 liens documentés** (13+3), sans garantie de stock actuel | ≥90 % des **20 prioritaires** vers une fiche produit exacte ou vendeur directement réservable ; date de vérification |
| Images principales fidèles | 15 + 21 photos déclarées ; 9 IA éditoriales distinctes | 100 % des 20 prioritaires avec photo réelle du modèle/variante ; 0 image IA présentée comme photo |
| Engagement / sortie vers marchands | Inconnu | Baseline mesurée, optimisation sur CTR sortant et progression de la part de clics vers références exactes |
| Conversion / commissions | **Non vérifiées** | Au moins une commission réellement confirmée, puis croissance positive documentée sur plusieurs mois ; aucun objectif financier présenté comme garanti |
| SEO et indexation | 70 URL en sitemap, données GSC non récupérées | Impressions, clics et requêtes suivis pour les pages prioritaires ; erreurs d'indexation résolues |
| Expérience mobile | CI Android passée, pas de mesure terrain | Réussite du scénario achat complet 360–430 px ; seuils Core Web Vitals Google |
| Conformité | Page de mentions légales publiquement incomplète | Informations requises vraies et complètes selon le statut, sans fausse identité |

### Ordre d'exécution recommandé

**Release A — P0.1–P0.4 :** transparence, route canonique, vérifications des liens et visibilité des données.  
**Release B — P1.1–P1.3 :** catalogue + conseiller réellement unifiés à 52, pages de décision.  
**Release C — P2.1–P2.3 :** 20 produits prioritaires, fiches commerciales exactes, tests du tunnel.  
**Release D — P3.1–P3.4 :** SEO orienté demandes réelles et contenu unique.  
**Release E — P4 + P5 :** finition visuelle validée par captures, performances et maintien automatique fiable.  
**Release F — P6 :** expansion uniquement sur résultats observés.

**Prochaine tâche concrète à commencer : P0.2 + P1.1 (source de vérité et unification du catalogue),** en gardant P0.1 en blocage de conformité à résoudre sans fabriquer d'informations personnelles. Ce chantier est prioritaire sur l'ajout de nouveaux modèles, d'effets 3D ou de pages SEO.

## 6. Références et preuves

- Public : https://atelier-montres-selection-fr.onrender.com/
- Sélection 37 : https://atelier-montres-selection-fr.onrender.com/montres/modeles-populaires.html
- Exemple de fiche SKMEI avec création IA : https://atelier-montres-selection-fr.onrender.com/montres/skmei-2056.html
- Juridique incomplet : https://atelier-montres-selection-fr.onrender.com/informations-legales.html
- 70 URL : https://atelier-montres-selection-fr.onrender.com/sitemap.xml
- Google, contenu d'affiliation et spam : https://developers.google.com/search/docs/essentials/spam-policies
- Google, contenu utile : https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google, liens internes : https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Google, Core Web Vitals : https://developers.google.com/search/docs/appearance/core-web-vitals
- Service-Public (mise à jour 13/10/2026), mentions d'un site professionnel : https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- Barème Amazon Partenaires FR, sujet à modification : https://partenaires.amazon.fr/help/operating/advertisingfees/
- GitHub : `site/selection-affiliation.json`, `site/selection-populaires.json`, `site/affiliate-links.json`, `site/popular-photo-rights.json`, `site/popular-ai-visuals.json`, `site/analytics.js`, `site/conseiller-engine.js`, `scripts/build-seo.mjs`, `scripts/build-shopper-selections.mjs`.

**Ni les revenus Amazon ni le classement Google ne sont déductibles du seul code ou d'un crawl public.**
