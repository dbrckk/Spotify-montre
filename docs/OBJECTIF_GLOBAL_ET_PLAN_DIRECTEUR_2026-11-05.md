# Atelier Montres — objectif global et plan directeur exécutable
**Version 1.0 · 5 novembre 2026 · Dépôt `dbrckk/Spotify-montre` · Branche `main` · Base auditée `b056c27ee30935ab3fd3ba847405e11c1faa0c2a`**

> **Document directeur actuel.** Les anciens audits, roadmaps sectorielles et guides de sourcing restent des références historiques ou spécialisées. En cas de contradiction sur l'état du projet ou l'ordre des travaux, ce document prévaut ; le code, les factures/preuves réelles, les journaux CI/Render et le droit applicable prévalent toujours sur ce plan. Un jalon est **terminé seulement avec des preuves**, non parce qu'il a été codé.

## 1. Objectif global — la définition du produit final

**Construire Atelier Montres comme une boutique-guide française indépendante, visuellement premium, particulièrement performante sur Android, où le visiteur trouve rapidement une montre réelle et adaptée à son style/budget, puis l'achète par un parcours fiable, transparent et commercialement rentable.**

### Expérience cible pour l'acheteur

1. Trouver sa montre par budget, style, dimensions, mécanisme et usage ; une sélection pertinente en moins de deux minutes **à viser, puis mesurer**.
2. Comparer les modèles avec photos exactes autorisées, caractéristiques sourcées, avantages **et limites**, sans fausses notes, stocks, promotions, essais ou classements de ventes.
3. Voir clairement **qui vend** : lien rémunéré vers un vendeur tiers ou achat direct sur notre propre site ; prix final, frais, livraison et garanties explicités selon le mode.
4. Pour les références en **vente directe autorisée** : payer sur une page sécurisée du prestataire, obtenir une confirmation et un suivi, recevoir la variante exacte à son adresse sans surprise douanière, disposer d'un vrai service retours/remboursements.
5. Bénéficier d'une interface rapide, lisible, accessible, agréable sur petit téléphone, sans effets lourds ni parcours trompeurs.

### Modèle économique double — précision indispensable

- **Affiliation :** l'acheteur paie un marchand tiers ; nous sommes éventuellement rémunérés par une **commission partenaire vérifiée**. Nous ne prétendons pas être le vendeur de ces commandes.
- **Vente directe :** l'acheteur nous paie ; notre entreprise prend la commande et paie un fournisseur CJ autorisé pour la préparation/expédition ; la rémunération est **la marge du vendeur**, pas une commission CJ. Nous assumons les obligations vendeur, retours, garanties et conformité.
- **Orientation :** affiliation fiable et revenus prouvables pendant la préparation de la vente directe ; ensuite un **pilote d'une seule montre**, suivi de l'expansion par catégories seulement si rentable et conforme.
- **Architecture imposée :** site autonome existant, HTML/CSS/JS + génération SEO sur GitHub/Render, API Node séparée et stockage PostgreSQL, pas Shopify ni migration lourde sans preuve de nécessité. Mollie reste une option prioritaire de paiement sans Stripe, mais aucune activation sans compte marchand réel.

### Critère de « produit abouti »

Un visiteur peut choisir et acheter **au moins une référence réelle** sur notre site ; paiement confirmé par le PSP, commande fournisseur **unique**, bon SKU/VID/adresse, livraison prouvée, marge calculée à partir de coûts réellement déboursés, service après-vente et remboursement testés, sécurité et conformité documentées. Le site attire en parallèle un trafic qualifié et des commissions partenaires attestées dans les tableaux de bord officiels. **Pas de qualification “finalisé”** sur seule base d'un mock, d'une URL en ligne, d'une CI verte ou d'une simulation de paiement.

## 2. Situation factuelle auditée au 5 novembre 2026

| Domaine | Acquis dans le dépôt / les outils | État réel ou limite non levée |
| --- | --- | --- |
| Code et production | `main` à `b056c27` ; vitrine `atelier-montres-selection-fr.onrender.com` ; API `atelier-montres-commerce-api.onrender.com` ; les déploiements du dernier commit ont été constatés `live` sur Render lors du travail précédent | Un service déployé ne valide pas une transaction réelle |
| Catalogue | Catalogue éditorial de **52 montres** déjà présent dans les sélections et les pages générées ; 15 fiches principales, 37 complémentaires, conseiller, comparaisons | `site/catalogue.json` est un **registre distinct** avec `products: []` : ne pas le prendre à tort pour la totalité de la sélection éditoriale ; harmonisation des sources de données à planifier |
| Offres partenaires | **13 liens Amazon.fr exacts** dans `site/affiliate-links.json`, reliés au parcours `acheter.html` ; vérification de cohérence des ASIN, photographies et variantes | `approved:false`, statut `enrolled_approval_unverified` : acceptation définitive Amazon et **commissions réelles non confirmées** ; d'autres liens historiques ne sont pas des offres directes actives |
| Photographies | Bibliothèque locale, registres de droits et illustrations éditoriales, nombreuses améliorations mobiles | Chaîne documentaire individuelle des licences/photos et actualité des sources à confirmer ; image IA jamais présentée comme photo exacte du produit |
| SEO & interface | Pages indexables générées, sitemap/canonicals, tests d'accessibilité et Playwright Android, audits production réguliers | Indexation/rangs Google, trafic GSC, taux de conversion et Core Web Vitals **non établis** ici par une série mesurée ; esthétique à harmoniser |
| Moteur commercial | API Node/PostgreSQL, états des paiements, idempotence, anti-double commande CJ, quotas, validation stock/coût/identité, garde-fous et récupération, tests PostgreSQL ; PR #145–148 intégrées | Aucune preuve de vente, livraison, remboursement ou déploiement marchand complet de bout en bout |
| Verrou de paiement | `site/config.json`: `checkoutMode: inactive` ; verrou supplémentaire côté serveur vérifié ; démarrage Render `checkoutEnabled: false` | **Ne pas activer** `COMMERCE_ENABLED` ni `checkoutMode` sans l'ensemble des jalons P0 ; les webhooks de commandes existantes doivent fonctionner pendant le gel |
| Fournisseur CJ | Un ticket de devis **réel** déposé : `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031` ; VID `74F64E7D-7D90-425D-AFB3-487D28B1D09F`, SKU `CJZBNSET00031-black` ; vérification en lecture seule quotidienne | Dernier résultat consulté : `AWAITING_CJ_REPLY`, **0 réponse fournisseur**, aucun coût final livré documenté ; les simulations de fret ne valent pas devis |
| Prix et douane | Calculateur privé du plancher TTC/25 % de contribution (PR #146), import UE, vérifications de cohérence et preuves expirantes | Chiffres financiers réels, rôle d'importateur, TVA, port, droits, sécurité batterie, conformité, remise et SAV **non attestés** |
| Paiement marchand | Adaptateur Mollie, webhooks authentifiés côté GET, récupération et tests CI | Pas de KYC marchand live, grille de frais et premier paiement réel certifiés dans les preuves disponibles ; Stripe indisponible n'impose pas Shopify |
| Exploitation & finances | CI build/SEO/commerce, surveillance CJ, logs Render, documentation | Notifications opérationnelles clients, réconciliation réelle PSP/CJ, garanties, procédure d'incident/remboursement et métriques de ventes à démontrer |

**État du commerce au moment de ce document :** PR #148 fusionnée ; workflow commerce sur `main` réussi (`42058476768`), contrôle vitrine réussi (`42058476774`), vérification CJ récente réussie (`42058265883`) sans approbation de devis. La vérification visuelle mobile de la PR #148 a également conclu avec succès (`42057901149`). Les résultats peuvent changer : toujours réinterroger le dépôt et Render au prochain cycle.

## 3. Priorités, méthode de travail et dépendances

**Priorité globale :** fiabilité > exécution de bout en bout > sécurité et conformité > rentabilité mesurée > architecture simple > performance et UX > croissance/catalogue supplémentaire. La qualité **visuelle premium** est une exigence produit, mais ne remplace jamais un produit exact ou une offre honnête.

Les chantiers indépendants peuvent avancer sans attendre la réponse CJ, **sans ouvrir de nouvelles fonctionnalités inachevées** :

```text
SOCLE ET CONFIANCE ──────► AFFILIATION EXACTE ───────► MESURE DES REVENUS
        │                          │                         │
        ├──────────────────────► UX PREMIUM ─────────────► SEO & CRO
        │
        └────► DEVIS CJ ÉCRIT ─► DOUANE/CONFORMITÉ ─► KYC/PSP
                                      │                │
                                      └────► MARGE ──► PILOTE RÉEL ─► EXTENSION
```

**Une tâche = un résultat complet** : audit des fichiers + risque et hypothèse, modification du bon dépôt/branche, contrôle en CI correspondant, revue, PR, fusion, preuve de déploiement Render si concerné, mise à jour de l'état ci-dessous. Ne pas multiplier de prototypes, mocks permanents, tests publics avec argent réel ou copies contradictoires de roadmaps. Réutiliser `dbrckk/star-list` seulement si l'outil est adapté, maintenu, compatible avec les licences et bénéfique au produit ; **pas de code externe exécuté automatiquement sans vérification**.

## 4. Backlog directeur : tâches, ordre et critères de fin

Statuts : **[FAIT]** confirmé par code+contrôle décrit ; **[À FAIRE]** exécutable par code seul ; **[BLOQUÉ]** dépend d'une preuve ou d'un droit externe ; **[SUIVI]** récurrent. Les travaux existants ne doivent pas être recommencés sans raison.

### Axe 0 — Sécurité, fiabilité et droit de vendre (P0, toujours prioritaire)

**AM-00 · [FAIT] Verrouiller et fiabiliser l'encaissement préparatoire**
- Acquis : devise/coût plafonné, VID/PID/SKU exacts, paiement Mollie revérifié, reprise après erreur réseau, protection anti-double commande, expédition et audit, blocage vente côté serveur (PR #147), webhooks maintenus pendant un gel (PR #148).
- Fin réelle : checks PostgreSQL/commerce verts, déploiement Render `live`, endpoint `/healthz` avec `checkoutEnabled=false` tant que conditions manquantes. Régression déclenchée à chaque modification sensible. **Cela ne prouve pas une vraie vente.**

**AM-01 · [À FAIRE + dépendances externes] Consolider l'identité légale et la confiance**
- Clarifier identité/status de l'activité vendeuse, adresse professionnelle/contact public appropriés, immatriculation et références légales applicables, CGV, politique de livraison, rétractation/remboursement, garantie, médiation, confidentialité et affichage du rôle vendeur/affilié. Ne **jamais inventer** SIRET, adresse d'entreprise, téléphone ni régime TVA.
- Livrables : registre documentaire privé, pages légales publiques complètes et cohérentes, revue des textes applicables, `npm run publisher:strict` lorsque la documentation existe.
- Fin : aucune donnée fausse ou obligatoire manquante pour le mode **réellement actif** ; validation juridico-fiscale faite par la personne responsable.

**AM-02 · [À FAIRE] Audit continuel de sécurité et reprise après incidents**
- Contrôles d'authentification, secrets, ACL, accès DB, protection contre requêtes falsifiées, RGPD, CSP, synchronisation des stocks, plafonds, monitoring des erreurs, sauvegarde/restauration Postgres, audit des fournisseurs et protection contre l'abus. Privilégier contrôles ciblés de jalon, pas une cascade de tests coûteux sur des modifications triviales.
- Fin : retrait d'un secret ou bascule `checkoutMode=inactive` immédiatement efficace ; aucune adresse ni contenu du ticket CJ dans logs publics ; exercices de restauration et de gestion d'incident documentés.

### Axe 1 — Monétisation réelle sans attendre CJ (P1 exécutable)

**AM-03 · [À FAIRE] Parcours d'achat partenaire crédible et exact — **prochaine tâche autonome prioritaire****
- Audit **des 13 liens Amazon FR effectivement présents** dans `site/affiliate-links.json` et de la correspondance avec `site/amazon-product-links.json`, `site/selection-affiliation.json`, images autorisées, ASIN/variante et libellé rémunéré.
- Une page produit ou un CTA principal ne doit jamais annoncer un prix, stock, livraison ou « promotion » non confirmé. Fallback honnête si lien inutilisable, distinction fabricant / recherche / lien rémunéré.
- Livraison : parcours complet `accueil → sélection/conseiller → fiche/comparaison → destination du produit exact`, sans perdre le contexte sur Android. Contrôles Android/CI et vérification externe ciblée des liens dans les limites autorisées.
- Fin : 100 % des CTA commerciaux affichés ont une source et une nature exactes ; zéro mauvais SKU/ASIN détecté ; aucun utilisateur dirigé vers un paiement prétendument interne non actif.

**AM-04 · [MESURE CORRIGÉE / PREUVE DE COMPTE MANQUANTE] Validation des revenus d'affiliation**
- Lire les contrats/statuts Amazon Partenaires et, seulement après compte accepté, Awin/fournisseurs compatibles ; confirmer les identifiants de suivi, rapports des commandes éligibles, remboursements et **commissions réellement réglées**.
- Ne pas considérer `ownerConfirmedEnrollment=true` comme preuve de validation définitive ni les clics comme revenus. Ne jamais enregistrer des mots de passe ou clés dans Git.
- Amélioration du 05/11 : `site/analytics.js` différencie strictement `amazon:` (lien balisé du propriétaire), `amazon-unpaid:` (ASIN non rémunéré) et `amazon-search:` (recherche balisée). Contrôles CI contre les mauvais tags ; le rapport `npm run affiliate:status` affiche désormais les ventes, commissions et date de candidature comme **inconnues**, avec les règles officielles Amazon. Dossier : [AM04](AM04_PREUVES_REVENUS_AFFILIATION_2026-11-05.md).
- Fin : au moins une commission réelle identifiable dans le rapport officiel, ou diagnostic documenté « aucune vente confirmée » sans extrapolation.

**AM-05 · [EN COURS — 1er lot codé] Rationaliser la sélection commerciale**
- Conserver les 52 références éditoriales consultables ; construire un groupe de 6–10 montres mises en avant, choisi selon **preuve d'offre/variante, utilité, qualité photo, intention d'achat et diversité de budgets** (pas des « meilleures ventes » fictives).
- Pour chaque modèle : statut `editorial-only / supplier-unverified / exact-affiliate / direct-approved`, preuves photo, liens, dernière révision et contraintes. Le `products:[]` du registre `site/catalogue.json` ne doit pas être confondu avec les 52 sélections existantes.
- Fin : une source de vérité exploitable par la fiche, le conseiller et les liens commerciaux ; aucun modèle ajouté sans référence, droit image et voie d'achat honnête.
- Premier lot du 05/11 : les **10 références existantes** sont organisées par niveau de preuve dans une seule page accessible : **6 ASIN Amazon.fr documentés** devant **4 sources vendeurs/fabricants sans ASIN publié**, avec dates/variantes et limites conservées. La page d'accueil annonce cette distinction et pointe vers les deux groupes. Tests SEO et Playwright Android vérifient les comptes et les parcours ; voir [AM05](AM05_SELECTION_COMMERCIALE_PREUVES_2026-11-05.md). **La preuve d'achat réel, l'approbation partenaire et les droits image indépendants restent à obtenir**.

### Axe 2 — Produit premium et référencement (P1, en parallèle du fournisseur)

**AM-06 · [À FAIRE] Refonte visuelle cohérente, globale, perceptible**
- Auditer `site/index.html`, catalogue, fiche, conseiller, comparateur, achat, statuts, CSS hérités ; réutiliser le système graphique actuel plutôt que superposer un nouveau thème. Grille/espacements, contrastes, typographie, iconographie, photos de produit nettes, interactions légères, hiérarchie et CTA cohérents.
- Mobile-first (320/360/390/393 px) et desktop (1280/1440 px) ; animations utiles avec `prefers-reduced-motion`, sans carrousel automatique ni « image IA » assimilée à une photo réelle.
- Fin : captures avant/après, 5 parcours utilisateurs essentiels vérifiés, aucun débordement horizontal, aucun focus caché, aucun CTA mort. Cohérence visuelle de **toutes** les pages clés, pas d'une seule landing page.

**AM-07 · [À FAIRE] Performance et accessibilité de production**
- Optimiser médias locaux (formats/tailles, srcset, poids, LCP), chargement progressif, CSS/JS bloquants, cache, scroll, ergonomie tactile, mode sans JS, contrastes et reflow zoom 200 %.
- Mesurer les Core Web Vitals **terrain** si données suffisantes ; cibles de qualité usuelles pour p75 : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 ; sinon les résultats du laboratoire sont explicitement étiquetés comme tels. Viser WCAG 2.2 AA sur les parcours principaux.
- Fin : vrais scénarios sur Android et build Render vert, résultats comparables avant/après sans détérioration des pages importantes.

**AM-08 · [À FAIRE] SEO de forte utilité, fondé sur des requêtes réelles**
- Récupérer les exports GSC/performances et indexation **réels**, auditer les URLs canoniques/sitemap/robots/H1/balisage, intention des pages et cannibalisation. Distinguer indexé, détecté, exploré et classé.
- Prioriser requêtes longue traîne : modèle exact, comparaison de références, poignet/taille, budget/style/usage ; utiliser les données GSC dès qu'elles existent. Enrichir d'abord les fiches actuelles, puis publier quelques pages uniques et vérifiables plutôt que des dizaines de variantes quasi identiques.
- Fin : aucune page « produit disponible » mensongère, pas de note/avis/stock inventés, comparaison 28/56 jours d'impressions/clics/CTR lorsque les volumes suffisent. **Aucune promesse de première position** sur « montres ».

**AM-09 · [À FAIRE] Acquisition organique maîtrisée**
- Maillage utile, pages de conseils, photos/vidéos sourcées et licenciées, éventuellement Pinterest/Shorts ; automatisation de publication uniquement lorsque le contenu et les droits sont réellement validés.
- Fin : trafic sourcé et qualifié par canal, coût de production suivi, zéro achat artificiel de liens ou faux avis. Un domaine personnalisé reste optionnel et doit préserver 301/canonical/GSC si adopté.

### Axe 3 — Première montre CJ vendue/livrée sans risque (P0 commercial, séquence strictement ordonnée)

**AM-10 · [SUIVI/BLOQUÉ CJ] Obtenir le devis CJ écrit de la variante noire**
- Ticket confirmé `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031` ; SKU variante `CJZBNSET00031-black` ; PID parent `EC60873E-E5A2-4081-82F7-427BC84A8A3D`.
- Le suivi quotidien `.github/workflows/cj-ticket-readonly-check.yml` ne doit lire que les métadonnées. Pas de second ticket automatique. Une réponse doit être lue dans le compte CJ **privé** (texte/pièces jamais dans les logs GitHub publics).
- Exiger par écrit : coût exact produit+variante+quantité, frais transport pour France métropolitaine et transporteur, TVA/droits/handling/dédouanement **inclus ou dus séparément**, payeur, stock, délai réaliste, numéro de suivi, retours, batterie/étiquetage et responsabilité des documents douaniers.
- Fin : devis authentique **complet et daté** ; référence et montant traçables ; absence de champ considéré zéro faute de donnée.

**AM-11 · [BLOQUÉ par AM-10] Valider la rentabilité et la conformité d'importation**
- Utiliser `commerce/price-cj-pilot.mjs` **localement et en privé**, avec pièces chiffrées réelles : coût rendu, borne EUR/USD et conversion, TVA vendeur, frais du PSP, retour/SAV, douane et marge.
- Référence d'import **à vérifier à la date de la commande** : pour une catégorie tarifaire à valeur ≤150 €, 3 € de droit forfaitaire + 2 € de frais de traitement depuis 2026, **hors TVA import et frais éventuels du transporteur**. Ne pas les additionner si CJ atteste déjà leur inclusion. Sources : https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne et https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes.
- Confirmer la déclaration douanière, les identifiants produits obligatoires et le déclarant, classification tarifaire, IOSS ou autre traitement TVA réel, et **0 € de frais inattendus à la livraison**. Conformité GPSR, étiquetage, sécurité produit/pile, EPR/DEEE/emballages selon l'assujettissement, droits d'image et responsabilité après vente.
- Seuil logiciel existant : au moins **25 % de marge de contribution sur chiffre d'affaires HT** après coûts variables documentés ; ce n'est **pas** un bénéfice net après charges fixes, impôts ou acquisition. Si la première montre n'est pas viable, **changer de SKU ou de fournisseur**, pas inventer le prix.
- Fin : dossier accepté par l'opérateur responsable, montant TTC documenté, marge prudente positive et aucune obligation douanière/sécurité ouverte.

**AM-12 · [BLOQUÉ externe] Activer un compte marchand légitime, sans Stripe obligatoire**
- Priorité : contrat Mollie avec acceptation KYC/IBAN/identité vendeur, conditions, retours, méthodes EUR, frais fixes et variables **contractuels**. Si non disponible, étudier PayPal Orders v2 / banque compatible ; comparer coûts, webhook, captures et remboursement avant **toute** adaptation.
- Valider URL HTTPS, politique de protection des adresses (chiffrement déjà présent), conservation/suppression, page des mentions légales et données personnelles. Pas de collecte directe de numéros de carte.
- Fin : un PSP réellement autorisé, frais attestés et test de transaction/retour dans son environnement légitime ; secret privé Render uniquement.

**AM-13 · [BLOQUÉ par AM-11/12] Vérifier la capacité de payer CJ et de traiter les exceptions**
- Vérifier statut CJ (droits de commande), solde préfinancé réel, mode `payType=2`, plafond journalier, compatibilité createOrderV2, idempotence, reprise des échecs, remboursements, retards, colis perdus et litiges, facture/document d'achat fournisseur.
- **Ne jamais créditer le portefeuille, créer de commande CJ ni dépenser des fonds sans action explicitement autorisée pour l'opération réelle.**
- Fin : dossier opérationnel complet, procédure manuel/fail-closed et capacité de récupération sans double débit.

**AM-14 · [À FAIRE sous prérequis] Première commande contrôlée de bout en bout**
- Parcours pilote autorisé : SKU identique, adresse de test légitime, frais TTC réels, paiements vérifiés **sur serveur**, correspondance identité client/commande, 1 seul paiement, 1 seul achat CJ, confirmation, expédition, tracking, livraison, facture, retours/rétractation et éventuel remboursement réellement traités.
- Distinguer sandbox PSP du **pilote physique réel**. Aucun mock ne suffit à valider livraison ou solde.
- Fin : **preuve de livraison et de rapprochement**, marge de contribution constatée, événements en base cohérents, manuel d'exploitation testé, aucune donnée privée publiée.

**AM-15 · [BLOQUÉ par AM-14] Ouvrir prudemment la vente directe**
- Checklist d'autorisation *conjonctive* : vendeur et CGV conformes ; devise/proofs non expirés ; import et produit conformes ; stock/marge/PSP/CJ/solde vérifiés ; surveillance & remboursements opérationnels ; pilote réussi ; approbation humaine documentée.
- Ensuite seulement : publication de l'offre, `COMMERCE_ENABLED` et `checkoutMode: active` sur la **même version**. Maintenir désarmement immédiat possible ; pas de disponibilité fictive.
- Fin : la référence pilote est réellement commandable **et livrable** ; le vendeur sait stopper et rembourser sans ouvrir de second paiement.

### Axe 4 — Exploitation et mesure (P1/P2)

**AM-16 · [À FAIRE] Tableaux de bord vérifiables et rentabilité**
- Indicateurs séparés : clics sortants (analytics seulement si activation responsable/consentement applicable), ventes et commissions dans rapports Amazon/Awin ; ventes directes et prix payés dans Mollie ; achats et coûts CJ ; remboursements ; suivi ; marges et charges.
- Indicateurs principaux : **revenu net vérifié / 1000 visites organiques qualifiées** ; taux de clic vers liens exacts ; recettes/commandes éligibles ; marge de contribution par SKU ; taux de livraisons conformes ; incidents et retours ; p75 UX.
- Chaque métrique stocke période, source, définition du dénominateur et statut **« non mesuré » distinct de zéro**. Agrégations sans adresses client.
- Fin : rapport périodique reproductible, actions de conversion décidées sur données réelles.

**AM-17 · [À FAIRE] Exploitation semi-autonome robuste et coûts minimaux**
- Maintenir GitHub Actions pour contrôles et surveillance de CJ/SEO, Render/DB actuels, alertes à faible volume, backups et procédure de restauration, vérification des changements fournisseurs, anomalies de commandes et fin de validité des devis.
- Scanner `dbrckk/star-list` comme source d'outils possibles ; ne fusionner que ceux qui améliorent prouvablement performances, visuel, SEO, qualité/fiabilité et licences. Éviter tout service premium à crédits non nécessaire.
- Gestion des incidents : aucun achat repris aveuglément après timeout, travail de rapprochement GET-only, alerte privée, gel automatique possible et traitement manuel si achat incertain.
- Fin : disponibilité, erreurs, consommation API et coûts de service suivis ; restaurations et alertes testées à un jalon important.

**AM-18 · [APRÈS pilotes réussis] Étendre le catalogue marchand**
- Étendre à 3–5 références qualifiées, puis davantage **uniquement** si coût rendu, statut légal, preuves de conformité, marge, retours et couverture logistique comparables sont vérifiés pour **chaque variante**.
- Favoriser des modèles visuels premium et abordables réellement disponibles (dont SKMEI et alternatives) ; les références coûteuses restent éditoriales ou affiliées si la vente directe n'est pas viable.
- Fin : chaque nouveau SKU passe exactement les mêmes verrous ; profitabilité et qualité maintenues malgré le volume.

## 5. Ordre d'exécution concret : livraisons plutôt que calendrier fictif

| Lot | Tâches à traiter dans l'ordre | Livrable vérifiable / décision |
| --- | --- | --- |
| **L0 · Après ce plan** | AM-03 puis audit ponctuel AM-02 | 13 liens et parcours Android exhaustivement justes, aucune régression paiement/affiliation |
| **L1 · Première monétisation** | AM-04 (dépendance partenaire), AM-05 | Rapport de validation du programme et sélection commerciale réaliste, sans revenu inventé |
| **L2 · Perception premium** | AM-06 puis AM-07 | Refonte cohérente accueil/fiche/catalogue/conseiller/achat + preuve Android/perf |
| **L3 · Visibilité et croissance** | AM-08, AM-09, AM-16 | Pages de forte valeur, GSC, clics vs commissions réelles, SEO non trompeur |
| **L4 · Offre CJ unique** | AM-10 → AM-11, en parallèle AM-01 et AM-12 | Devis écrit, coût livré/VAT/douane et conformité, identité vendeur, PSP |
| **L5 · Vente pilote** | AM-13 → AM-14 → AM-15 | Une commande réelle, unique, livrée, marge démontrée ; autorisation avant activation |
| **L6 · Industrialisation maîtrisée** | AM-17 puis AM-18 | Surveillance, alertes, sauvegardes, puis extension SKU par SKU |

Les lots **L0–L3 peuvent avancer sans attendre CJ**. L4–L5 sont **bloqués par des actions/preuves externes**, jamais contournés par de faux devis, des identifiants imaginaires ou des achats non approuvés.

## 6. Critères quantifiables d'acceptation et garde-fous

| Dimension | Mesure et objectif qualité | Preuve exigée |
| --- | --- | --- |
| Sécurité paiement | 0 double paiement/achat attribuable aux flux normaux/reprises ; nouveaux paiements **impossibles** si gel | Tests de concurrence PostgreSQL, statut live `checkoutEnabled=false` tant que gel, audits d'incidents |
| Produit réel | 100 % des offres directes visibles reliées à VID/PID/SKU/stock/devis actuels | API fournisseur + preuves privées + contrôles avant autorisation |
| Economie vente directe | Contribution **≥25 % du CA vendeur HT** selon le garde-fou actuel ; analyse de bénéfice net séparée | Devis, PSP, FX, TVA, retours/SAV, import/transport, réconciliation PSP/CJ |
| Preuve livraison | 1 commande autorisée de bout en bout **livrée et documentée**, puis taux de litiges/retours suivi | Paiement PSP, commande CJ, tracking, preuve livraison, support et comptabilité |
| Affiliation | 100 % des CTA valorisés avec destination exacte/documentée, mention sponsorisée et statut du programme | Contrôles de liens + contrat/rapport officiel ; pas d'affirmation de commission avant preuve |
| Expérience | Aucune navigation cassée/horizontale sur 320–393 px ; WCAG AA visé ; test navigation/tactile | Playwright/Android, captures avant/après, audits clavier/zoom |
| Performance | LCP ≤2,5 s ; INP ≤200 ms ; CLS ≤0,1 au p75 **si mesures de terrain suffisantes** | GSC/CrUX/RUM (sinon lab sans prétention terrain) |
| SEO | Zéro schéma inventé, sitemap cohérent, meilleure couverture d'intentions, clics/impressions en croissance **si réellement mesurés** | GSC daté, audit SEO et crawl réel |
| Coûts | Hébergement et automatisation au **minimum compatible avec fiabilité et sécurité** | Factures et budget mensuel réel, alertes dépassement, pas d'achat superflu |
| Transparence | « inconnu » ≠ zéro, aucun prix/stock/review/vente/croissance fictif | Source et date d'observation pour toute métrique publiée |

## 7. Risques, arbitrages, responsabilités

| Risque | Parades / décision de blocage |
| --- | --- |
| Devis CJ incomplet ou non livré en France | Pas de prix public ; garder l'affiliation, sélectionner un nouveau SKU uniquement avec preuves |
| Fournisseur à bas prix mais frais douane/TVA/SAV élevés | Prix TTC calculé à partir de coûts tout compris ; rejeter si contribution insuffisante |
| Paiement sans compte marchand actif | Aucune activation ; PSP compatible légalement, sans Stripe obligatoire |
| Débit effectué mais CJ indisponible | Quarantaine de commande, GET-only, reprise manuelle et remboursement si nécessaire ; pas de nouveau POST incertain |
| Produit/batterie ou visuel non conformes | Retirer de la vente directe et du visuel exact jusqu'à justificatif, assurer traçabilité |
| Compte Amazon non définitivement accepté | Ne jamais comptabiliser les clics comme revenu ; afficher uniquement les destinations licites |
| Trop de catégories, documents contradictoires ou ajout de frameworks | Un lot complet à la fois, source de vérité unifiée, refactorings mesurés sans réécrire le projet |
| Frais inattendus ou retard au client | Aucun achat tout compris sans répartition douanière explicite et délais réalistes |
| Rupture API/CI, collecte de données sensibles | Limiteurs, contrôles, secrets privés, aucun journal client, monitoring et arrêt sûr |

**Responsabilités :**
- *Automatisable sans demande :* audit GitHub, correction de bugs, design, SEO, liens documentés, validation, tests, PR, déploiements autorisés déjà configurés, suivi CJ en lecture seule.
- *Obligatoirement attesté par acteur extérieur :* acceptation PSP/Amazon, identité légale, statut TVA, autorisations des marques/photos, devis authentique, déclaration douanière, conformité fabricant, remboursements.
- *Autorisation ponctuelle requise :* débit d'un moyen de paiement, crédit d'un portefeuille fournisseur, achat CJ réel ou ouverture de la caisse au public. Une autorisation générale de modifier GitHub n'autorise pas implicitement la dépense.

## 8. Définition stricte de terminé et prochaine action

Pour chaque ticket **AM-nn**, consigner dans la PR : problème mesuré, fichiers réellement modifiés, preuves de non-régression, résultat CI, capture Android si UI, déploiement Render si applicable, nouveaux risques et état de l'étape. Ne pas reprendre un travail déjà certifié tant que son état n'a pas changé.

**Prochaine action directement exécutable au prochain “Go” : AM-03.** Auditer le registre des 13 liens Amazon exacts et les parcours Android depuis accueil, conseiller, fiches et `acheter.html`. Corriger **un vrai défaut de conversion ou de correspondance de SKU** si constaté, vérifier CI/Render, puis mettre à jour ce plan. **Ne pas attendre CJ pour améliorer le site ; ne pas ouvrir le paiement sans les prérequis.**

## 9. Documents de référence spécialisés et sources

- [Roadmap détaillée du moteur de vente directe](ROADMAP_VENTE_DIRECTE_AUTOMATISEE_2026-11-02.md) — documentation technique et historique (certains états datent du 2 novembre).
- [Etat du ticket CJ](CJ_TICKET_DEVIS_ECRIT_2026-11-04.md) ; [prix TTC privé](CJ_PRIX_MINIMUM_AVANT_VENTE_2026-11-05.md) ; [preuves import UE](UE_IMPORT_2026_PREUVES_CJ.md).
- [Parcours partenaire vérifié](ACHATS_PARTENAIRES_MODELES_VERIFIES_2026-11-04.md) ; [mesure des clics](SUIVI_CLICS_PARTENAIRES_2026-11-04.md).
- [Plan UX/SEO initial](PLAN_EVOLUTION_COMPLET_2026-11-02.md), [correction prioritaire mobile](PLAN_EXECUTION_STABILITE_CONVERSION_2026-11-04.md) — historiques, non source d'état actuel.
- Sources officielles à revérifier lors du pilote : [Douane française — petits colis](https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne), [mesures UE](https://www.douane.gouv.fr/fiche/mesures-e-commerce-europeennes), réglementation GPSR et textes sectoriels produits/batteries applicable à la référence.

**Principe final :** ne jamais confondre une boutique attractive, un code testé, un partenaire inscrit, une marge théorique et **une entreprise qui vend, livre, rembourse et gagne réellement de l'argent**.
