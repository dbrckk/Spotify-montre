# Atelier Montres — OBJECTIF FINAL PRODUCTION READY
**Charte d'exécution de niveau agence · v1.0 · 9 novembre 2026 · Dépôt dbrckk/Spotify-montre**

> **Document directeur pour les prochains « go / continue ».** Le [plan AM-00 → AM-18](OBJECTIF_GLOBAL_ET_PLAN_DIRECTEUR_2026-11-05.md) reste le backlog historique détaillé ; le [plan d'évolution du 8 novembre](PLAN_EVOLUTION_2026-11-08.md) et le [suivi du 9 novembre](SUIVI_EVOLUTION_2026-11-09.md) fournissent les preuves. L'objectif, les niveaux de livraison et le Go/No-Go sont désormais régis par **ce document**. En cas de contradiction, **code et preuves de production réelles > source privée officielle datée > cette charte > plans précédents**.

## 1. Commande, positionnement et finalité

**Mission : faire d'Atelier Montres un véritable produit commercial indépendant, fiable, visuellement premium, accessible sur Android, légalement exploitable, rentable et maintenable.** La cible n'est ni une démonstration, ni un catalogue flatteur sans offre, ni une boutique déclarée « terminée » à partir d'une CI verte.

Le site doit faciliter le choix d'une montre réelle adaptée à un budget modeste, moyen ou plus élevé. Pour situer les gammes auprès d'une personne proche du SMIC : **Essentielle 20–120 €, Signature 150–450 €, Prestige accessible 500–1 200 €**, budgets d'orientation, **jamais présentés comme prix marchands vérifiés**. Références Casio, SKMEI, Citizen, Seiko, Tissot et autres marques documentées, sans inventer notes, stocks, prix ou best-sellers.

**Deux modèles économiques séparés :**
- **Affiliation** : l'acheteur paie chez un marchand tiers, qui gère livraison et retours. Atelier Montres perçoit une éventuelle **commission attribuée et prouvée** par la plateforme partenaire. Un clic n'est pas un achat.
- **Vente directe sélective** : l'acheteur paie **Atelier Montres**, qui reste juridiquement vendeur, encaisse via PSP et commande la variante exacte chez un fournisseur autorisé, avec livraison à l'acheteur, facture, garanties, retours et remboursements. Notre recette économique est une **marge**, pas une commission fournisseur.

Architecture conservée : **site et API indépendants, hébergés actuellement sur Render, moteur Node/PostgreSQL, Mollie et CJ préparés mais désactivés**. Aucun basculement Shopify ou Stripe imposé. Priorité fiabilité > fonctionnement réel > sécurité et conformité > architecture > performances > esthétique > fonctions secondaires ; outils gratuits ou open source quand robustes.

**Critère final ultime :** des visiteurs trouvent, comparent et achètent en confiance ; une transaction réelle autorisée est livrée, rapprochée financièrement, opérable en SAV et bénéfique ; l'entreprise peut surveiller, geler, corriger et faire évoluer le service sans exposer les données.

## 2. Niveaux contractuels de livraison — strictement séparés

| Jalon | Définition et preuve d'acceptation | État au 09/11 |
| --- | --- | --- |
| **R0 — Vitrine technique publique** | Catalogue 52, recherche, fiches, comparateur, tests Android, SEO, WCAG automatisé, Render live, Lighthouse lab | **Atteint sur les périmètres testés**, 7/7 CI après PR #251 |
| **R1 — Vitrine commerciale conforme** | R0 + identité éditeur, contacts, transparence, confidentialité, droits photos prouvables, support, QA humaine et réelle accessibilité des parcours | **Non signé : blocage juridique et preuves externes** |
| **R2 — Affiliation mesurée** | R1 + validation officielle des programmes, destinations traçables, indicateurs GSC/analytics licites et commissions réelles réconciliées | **Non démontré** |
| **R3 — Une vente directe production-ready** | R1 + conformité et devis rendu France du SKU exact, vendeur légal/CGV/PSP, marge, commandes idempotentes, reprise, pilote **payé/livré/rapproché** et SAV opérable | **Bloqué** |
| **R4 — Exploitation durable d'agence** | R2/R3 prouvés ; support, sauvegardes/restore, alertes, budget, rapports, extension à 3–5 SKUs seulement après qualification | **Objectif final, non atteint** |

**R4 est la finalité complète.** Ne jamais confondre R0 et R1 ; aucun « checkout prêt » sans R3. Les améliorations du parcours affilié et du design peuvent progresser sans attendre CJ. La mise en vente et toute dépense nécessitent une autorisation spécifique.

### Base d'audit factuelle, commit `main@70ab24fe`

| Source | État vérifié | Limite |
| --- | --- | --- |
| Catalogue éditorial | **52** modèles = 15 historiques + 37 complémentaires | 0 SKU directement vendable |
| Photographies | **40** photos publiées sur autorisations déclarées (15 + 25) ; **12** sans photo locale ; **0** preuve de droit indépendante enregistrée | Autorisation déclarée ≠ pièce contractuelle revue |
| Amazon.fr | **27** correspondances ASIN documentées (13 + 14) | Prix/stock, variante réellement en vente, approbation finale et commissions non prouvés |
| Awin | Compte éditeur non validé dans le registre ; **0** offre active | Aucun gain Awin établi |
| Commerce direct | `site/config.json` : `checkoutMode: inactive` ; `site/catalogue.json` : **0** produit | Mollie live, conformité et commandes non attestés |
| Éditeur légal | `site/informations-legales.html` publie explicitement que l'identité est incomplète | Impossible de signer R1/R3 |
| CJ | Ticket fournisseur existant ; [dernier diagnostic read-only](https://github.com/dbrckk/Spotify-montre/actions/runs/42667739491) échoué à `CJ_TICKET_MESSAGES_UNVERIFIED` | Ne pas supposer devis final, ne pas recréer de ticket |
| Public technique | [7 contrôles après #251](https://github.com/dbrckk/Spotify-montre/actions/runs/42664574225), Lighthouse laboratoire 100/100 sur six types de pages | Ne prouve ni utilisateurs réels, ni SEO Google, ni rentabilité |

## 3. Expérience finale acheteur — exigences de l'équipe UX, UI et commerce

**Parcours client à vérifier intégralement :** `Accueil → budget/style → catalogue 52 → recherche/filtres → fiche modèle exact → comparaison → vendeur précis`. Une fois R3 autorisé, ajouter `offre totale TTC → paiement sécurisé → confirmation → suivi → livraison → facture/retour`.

1. Accueil immédiatement compréhensible, grandes **photos réelles exactes**, gamme et proposition de valeur sans longue introduction technique.
2. Recherche souple (marque, modèle, budget indicatif, mouvement, dimension, usage, visuel réellement publié, correspondance vendeur), filtre accessible et état vide explicite.
3. Fiches éditoriales composées autour du modèle exact, variantes clairement distinguées, caractéristiques sourcées, limites honnêtes, éléments de décision et trois alternatives cohérentes de même gamme.
4. Comparateur utile, accessible et lisible même à 320 px ; retour à la sélection et partage sans perdre les filtres.
5. Pour toute action marchande, placer **la source la plus étayée d'abord** : ASIN du modèle documenté ou partenaire approuvé ; en absence d'offre exacte, référence constructeur/vendeur, recherche générique secondaire explicitement identifiée.
6. Distinguer réellement et visiblement « acheter chez un vendeur tiers » de « payer Atelier Montres ». Si checkout inactif, **aucun panier, stock, paiement ou livraison directe fictifs**.
7. Assistance : informations avant achat, canal de contact réel lorsque l'activité est lancée, procédure de réclamation et suivi vérifiable après commande.
8. Design system unique vert forêt/ivoire/bronze ou palette validée, images licenciées, composants cohérents, typographie soignée, focus visible, pas de fausse preuve sociale.

**Qualité visuelle et accessibilité** : couvrir 320 / 360 / 393 px Android et 1280 / 1440 px ordinateur, zoom 200 %, clavier, lecteurs d'écran et JS désactivé pour les liens essentiels. Pas de débordement horizontal, de clic inopérant ni de contenu « developer-only ». Cibles tactiles de l'ordre de 44 px, avec justification lorsque non applicable. **Objectif WCAG 2.2 AA évalué humainement**, au-delà de l'outil axe. Ne pas déduire un gain de conversion de simples captures.

## 4. Qualité de production / sécurité / performances

| Domaine | Définition de terminé | Preuves |
| --- | --- | --- |
| Code / architecture | Génération statique reproductible, documentation d'exécution, zéro fonctionnalité publique fictive, compatibilité existante | `npm test`, lint, build SEO, revue PR |
| Parcours | Scénarios réels 320–393 px, desktop, navigation clavier et sans JS, aucune erreur JS ou lien mort | Playwright et captures Android, validation sur le site **déployé** |
| Performance | **Cibles terrain p75 : LCP ≤2,5 s ; INP ≤200 ms ; CLS ≤0,1** lorsque données représentatives ; Lighthouse lab ≥90 sur pages critiques | GSC/CrUX ou RUM conforme, CI Lighthouse datée |
| Sécurité | Zéro vulnérabilité critique connue acceptée, secrets uniquement serveur, données client minimisées/chiffrées, droits minimum, validation des entrées | Revue sécurité, scans et tests de chemins critiques |
| Paiement | Aucune vente sur simple callback navigateur ; GET PSP revalidé côté serveur, idempotence, résistance aux doubles webhooks/timeout, quarantaine et remboursement | Tests PostgreSQL de concurrence et reprise, exercices opérateur |
| Fournisseur | Pas d'expédition ni d'achat fournisseur si devis, variante, prix, stock, import, solde ou paiement restent inconnus | Preuves CJ officielles et garde-fous backend |
| Opérations | Alertes effectivement reçues, restauration DB exercée, retour arrière de déploiement, gel commercial testable, journal sans données sensibles | Runbook, procès-verbal d'exercice et mesures réelles |
| Coût | Minimal compatible avec SLA réel, sauvegardes et sécurité ; aucun SaaS à crédits inutile | Budget mensuel daté, coûts Render/DB/PSP |
| Légal | Identité/contact, RGPD/CNIL, affiliation, photos, CGV et conformité produit selon mode de vente | Signature de revue externe et justificatifs privés |

**Ne promettre aucune disponibilité 99,9 % ou délai de reprise avant mesure réelle** sur les plans effectivement souscrits. Une CI verte valide le code dans son périmètre, jamais un remboursement réel. Les données réelles d'acheteurs ne doivent jamais être placées dans les logs GitHub ou dans un dépôt public.

## 5. Conformité France et UE — Go/No-Go humain

**Avant R1** : identité et statut de l'éditeur, immatriculation selon la forme, contacts réels, hébergeur, licence de chaque photo, transparence affiliation, informations vie privée, sous-traitants et traitements réels. Le dépôt indique actuellement des mentions légales incomplètes ; **ne pas inventer les coordonnées**.

**Avant R3** : identité du vendeur et taxes, CGV et information précontractuelle, tarif TTC définitif/frais de livraison, pays desservis, délai, médiateur, garanties légales, rétractation/formulaire et remboursements, facture, gestion litiges, protection des données transférées à CJ, obligations import/douane, traçabilité et sécurité produit. Pour les montres concernées : **GPSR (UE 2023/988)** et article 19, identité fabricant et responsable UE si applicable, avertissements dans la langue adaptée, piles et obligations sectorielles éventuelles. Seul un spécialiste peut confirmer l'applicabilité précise à un SKU et au vendeur réel.

**Références officielles consultées :**
- [Service Public Entreprendre — règles d'e-commerce](https://entreprendre.service-public.gouv.fr/vosdroits/F23455) ;
- [Service Public — mentions d'un site professionnel](https://entreprendre.service-public.gouv.fr/vosdroits/F37351) ;
- [UE — règlement 2023/988 sur la sécurité des produits](https://eur-lex.europa.eu/eli/reg/2023/988/oj/fra), notamment art. 19 ;
- [CNIL — mesure d'audience et traceurs](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience) ;
- [Google — Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).

## 6. Rentabilité et acquisition : mesures vérifiées, pas indicateurs inventés

**Affiliation** : tracer séparément visites qualifiées, fiches consultées, clics vers ASIN exacts, recherches Amazon, sorties constructeur et commissions effectivement **constatées dans les rapports du partenaire**. CTR sortant = sorties exactes / vues pertinentes, même période et même population. Conversion réelle et rémunération restent `non mesurées` sans les rapports officiels. Aucune garantie de première position Google.

**SEO** : obtenir les données Search Console par requête et par URL, enregistrer 28 jours de base, puis comparer à 28/56 jours les clics, impressions, CTR, position, indexation et intention ; corriger la cannibalisation avant d'ajouter des pages. Prioriser les modèles exacts et les guides utiles plutôt que multiplier des pages quasi identiques. Umami facultatif seulement si légalement configuré : ne pas traiter un événement de clic comme une commande.

**Marge directe** : contribution = CA vendeur HT réellement acquis – coût produit – transport – import/TVA non récupérable – PSP – FX – provisions retours/SAV et frais variables. Reprendre la cible du plan existant : **≥25 % de contribution du CA vendeur HT** à confirmer sur les coûts et le marché du SKU pilote. Si le devis France n'est pas complet, **aucun prix de vente ni offre directe publiés**. Une vente non livrée/réconciliée n'est pas un pilote réussi.

## 7. Organisation de l'agence (fonctions, non personnes fictives)

| Fonction | Responsabilité | Livrable |
| --- | --- | --- |
| Direction produit / PO | Vision, priorités, arbitrages et recette | Backlog strict et décisions Go/No-Go |
| UX research / CRO | Fluidité recherche → fiche → achat, tests de perception | Parcours, constats, métriques, preuves |
| Direction artistique / UI | Design system, photos, composants et finitions | Captures desktop/mobile revues |
| Frontend / SEO technique | HTML, performances, accessibilité, indexation | Build, SEO, QA navigateur |
| Backend / DBA | API, données, commandes, paiements, transactions | Tests concurrence/échecs et audit technique |
| Sécurité / privacy | Secrets, chiffrement, RGPD, threat modeling | Liste vulnérabilités et validations |
| Juridique / conformité | Affiliation, LCEN, CGV, GPSR, import, droits photo | Dossier signé et revu, conservé en privé |
| Sourcing / merchandising | Qualité modèle, SKU, variante, stock, fournisseur | Devis France, facture et conformité |
| Finance / data | Attribution commissions, marges, frais, croissance | Rapport vérifiable, pas de zéro inventé |
| QA / release / DevOps | Tests, CI, publication, monitoring et rollback | PR, CI, captures, exercices |
| Support / exploitation | Livraison, retours, litiges, remboursement | Processus SAV et suivi client réel |
| Marketing éditorial | SEO mesuré, qualité de contenu, acquisition | Priorités GSC et contenus sourcés |

Ces fonctions sont un **standard de qualité**, pas une affirmation qu'une agence est employée. Les tâches logicielles peuvent être automatisées ; les validations juridiques, paiements et contrats ont besoin de personnes/preuves réelles.

## 8. Backlog exécutable : dépendances et priorités

| Lot | Action suivante et responsable principal | Critère de sortie | Blocage |
| --- | --- | --- | --- |
| **GOV-01 (P0)** | Charte, audit automatique des preuves et CI ; PO/QA | Statut source reproductible, sans affirmer de revenu | Aucun |
| **LEGAL-01 (P0)** | Identité, contacts et revue documentaire ; juridique/éditeur | Mentions complètes, signature de revue | Pièces réelles éditeur |
| **MEDIA-01 (P0)** | Droits écrits des 40 photos, sourcing des 12 restantes ; juridique/DA | Images licites ou repli explicite | Autorisations fabricants |
| **AFF-01 (P0)** | Approbation Amazon, tag, programme, relevés ; affiliation/finance | Revenu uniquement si relevé officiel | Accès compte Amazon |
| **UX-01 (P1)** | Audit visuel et parcours sur Android ; UX/UI/frontend | 5 parcours bout en bout, captures, WCAG manuel | Aucun pour améliorer |
| **SEO-01 (P1)** | Baseline Search Console, optimisations des pages utiles ; SEO/data | Rapport GSC 28/56 jours sourcé | Export Google réel |
| **OPS-01 (P1)** | Sauvegardes/restauration, alertes, rollback, budgets ; DevOps | Exercice effectif et journal de validation | Accès services si nécessaire |
| **CJ-01 (P0 commerce)** | Résoudre `CJ_TICKET_MESSAGES_UNVERIFIED` en **lecture seule**, obtenir devis ; sourcing | Devis/variante/prix rendu FR complets | Réponse et accès CJ |
| **LEGAL-02 (P0 commerce)** | CGV, identité vendeur, GPSR, TVA/import, médiateur ; juridique | Dossier conforme revu | Statut vendeur, SKU, preuves |
| **PSP-01 (P0 commerce)** | Mollie live/KYC, frais, remboursement, secrets ; backend/finance | PSP opérationnel, tests d'échecs | Compte marchand validé |
| **FULFILL-01 (P0 commerce)** | Rapprocher paiement → CJ, anti-doublon, suivi ; backend/QA | Une seule commande fournisseur, état fiable | CJ + PSP |
| **PILOT-01 (P0 commerce)** | Commande réelle supervisée autorisée ; équipe transverse | Livraison, facture, marge, retour/remboursement opérables | Tous les lots P0 |
| **GO-01 (P0 commerce)** | Publication progressive d'une seule offre ; PO/QA | Revue Go/No-Go signée et rollback contrôlé | Pilote réussi |
| **SCALE-01 (P2)** | Qualifier 3–5 SKUs selon même procédure ; commerce | Marge/qualité/livraisons mesurées | R3 atteint |

**Un chantier complet à la fois.** Corriger les P0/P1 existants avant des fonctionnalités secondaires, conserver l'architecture, tests et vérification de la version réellement déployée. Les améliorations R1/UX/SEO peuvent avancer pendant l'attente du devis CJ.

## 9. Critères de livraison d'une PR et de la release finale

**Definition of Done d'un lot :** problème et risque identifié ; bon dépôt et bon fichier ; source réelle respectée ; changement complet ; tests/lint/build utiles verts ; conformité et SEO préservés ; captures Android si UI ; zéro secrets / images/prix inventés ; CI sur la PR puis sur `main` ; contrôle Render si public ; état et limites consignés.

**Go R1 :** mentions et droits authentifiés + QA et support + pas de régression critique.
**Go R2 :** R1 + validation programmes + commissions/analytics réellement disponibles, sans chiffre extrapolé.
**Go R3 :** R1 + conformité, vendeur, PSP, CJ, marge, contrôles transactions et un pilote vrai livré/rapproché + accord humain explicite. À défaut : `checkoutMode=inactive` et aucun débit.
**Go R4 :** R2/R3 + alertes, restore, SAV, coûts et fiabilité mesurés.

### Commandes et workflow de vérification sans risque

- `npm run production:status` : rapport de preuves en Markdown et état des 14 gates.
- `node scripts/report-production-readiness.mjs --json` : constat structuré, aucune requête partenaire ni donnée client.
- `npm run production:check` : test de cohérence du rapport, interdit les déclarations de revenu non prouvées.
- `npm run production:gate` : mode strict avec code non nul tant que toutes les preuves nécessaires ne peuvent être attestées. Ce mode **ne doit pas bloquer les PR de développement ordinaires**.
- `.github/workflows/production-readiness.yml` : contrôle PR et hebdomadaire, sans achat, sans ticket fournisseur, sans accès à des secrets.

**Finalité :** vendre et livrer des montres réelles, avec un service fiable, une marque soignée, des clients correctement informés et une rentabilité démontrée — pas une version alpha, pas une vitrine prétendument rentable sur la seule base de tests.

## 10. Livraison R1 Privacy — contrôle local de confidentialité (09/11/2026)

**Défaut client identifié :** la page publique expliquait le stockage local, mais le visiteur ne pouvait effacer au même endroit les favoris, dernières montres, préférences de vue et comparaisons. Le navigateur abrite aussi des références de tentative de paiement et des jetons de suivi *distincts* ; un `localStorage.clear()` serait donc une régression grave.

**Corrigé :** page `site/confidentialite.html` dotée d'un panneau progressif (« Effacer mes préférences »), affiché uniquement avec JavaScript. L'action exige une confirmation volontaire, montre le nombre de préférences réellement présentes, supprime seulement une liste blanche **7 clés locales + 2 clés de session** et confirme un effacement réussi ou partiel. Une procédure manuelle reste disponible sans JS. Aucun transfert réseau, cookie ou donnée privée ajouté. Les préfixes `am_checkout_pending_v1_`, `am_checkout_key_`, `am_order_`, les clés inconnues et les données d'autres fonctionnalités sont **préservés** ; la notice explique les limites de l'effacement et le risque d'un nettoyage global depuis le navigateur.

**Recette requise :** `node scripts/build-seo.mjs && node scripts/validate-seo.mjs` ; tests Playwright sur 320 / 393 / 1366 px avec JS et sans JS, cases à cocher, état du stockage avant/après, non-suppression des jetons de commande, aucune fuite ni débordement ; WCAG automatisé et contrôle de la version publiée. **Ce contrôle ne remplace pas la validation juridique R1**, et n'affirme pas la suppression de journaux techniques hébergeur ou des données d'un marchand tiers.
