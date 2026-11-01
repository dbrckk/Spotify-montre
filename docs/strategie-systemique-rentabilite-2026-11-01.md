# Atelier Montres — plan directeur systémique et modèle de rentabilité

**Révision : 1er novembre 2026.** Dépôt inspecté : `dbrckk/Spotify-montre` (`main`, référence de départ `293f0e3c29cbf628fd83e106ca05583c5bebb360`). Public : https://atelier-montres-selection-fr.onrender.com/.

## 0. Décision stratégique (et ce qui NE doit PAS arriver)

**Vision :** devenir un guide français de confiance permettant de trouver une belle montre, correctement identifiée, adaptée au budget et à l'usage, puis d'acheter chez le vendeur le plus pertinent. La monétisation progresse par **affiliation -> vente directe conditionnelle -> automatisation fournisseur -> éventuelle marque/stock UE**. Le produit final est une entreprise profitable, pas un clone de marketplace à fort risque.

**Positionnement d'entrée :** « de belles montres au style affirmé, sans payer le prix du luxe », en insistant sur le modèle exact, la qualité documentée et les alternatives. Cœur de découverte : SKMEI, Casio, ADDIESDIVE, Pagani Design ; garder Seiko/Tissot/Citizen/Orient comme références de comparaison et passerelles vers un panier plus élevé. Ne pas utiliser des classements de ventes, remises, garanties de stock ou avis non prouvés.

**Décision immédiate :** conserver toute la vitrine affiliée existante et **NE PAS** activer de panier, compte client ou paiement réel tant que les gates G0–G4 ci-dessous ne sont pas validés. Une intégration DSers/AliExpress n'est pas une preuve que le fournisseur sera réglé automatiquement.

**Principe prioritaire :** revenu net attribuable, durable et conforme > clics > SEO > esthétique. L'esthétique haut de gamme est un levier de crédibilité et de conversion, pas une fin isolée.

## 1. Audit réel du dépôt au 01/11/2026 : acquis, risques, preuves absentes

| Domaine | Acquis contrôlés | Dette prioritaire / interdiction de conclure |
|---|---|---|
| Site | Render statique déployé depuis GitHub, structure HTML crawlable, sitemap et canonical, tests CI | Aucun backend transactionnel, aucune base commandes, aucun coffre secret de paiement ; pages HTML seules ne vendent rien |
| Catalogue | 52 références (15 principales + 37 complémentaires) ; filtres, conseiller, comparateur ; modèles sourcés | **30/37 complémentaires** ouvrent toujours une **recherche Amazon** ; modèles / variantes à auditer ; ne pas promouvoir des ASIN non confirmés |
| Monétisation | 13 ASIN principaux, 7 ASIN complémentaires documentés ; tag Amazon.fr `drackk04-21` côté config | `approved:false` et `enrollmentStatus: enrolled_approval_unverified` : approbation finale et revenu réel non indépendamment confirmés ; Awin/Pagani non reliés |
| Images | 15 photos principales, 21 complémentaires, 9 concepts IA SKMEI explicitement secondaires | Autorisations de diffusion fondées sur déclaration de l'éditeur, non preuves contractuelles vérifiées ; concepts IA jamais assimilés à des photos produit |
| Audience/SEO | Search Console déclarée configurée, grands audits techniques et pages par modèle ; approche mobile | Pas de données récentes **impressions, clics, classement, CTR, sessions ni commissions** accessibles dans cet audit : impossible de prouver l'acquisition et la conversion |
| Produits/supply | Registre `research/fournisseurs-candidats.json`, schéma de devis, outil `scripts/evaluate-supplier.mjs` | Toutes les pistes fournisseurs sont `research_only` ; **aucun SKU avec devis livré France, échantillon, conformité, livraison et retours validés** |
| Légal | Page de transparence et notice de confidentialité, liens d'affiliation signalés | Mentions légales identifiées **incomplètes** dans `docs/p0-conformite-juridique-2026-10-31.md` ; CGV, structure vendeuse, TVA/IOSS et conformité à valider avant encaissement |
| Exploitation | GitHub Actions, tests du build, Android et accessibilité WCAG, suivi Umami prévu | Aucun suivi des coûts/commissions terrain ni SLO e-commerce ; publication automatique ne vérifie ni compte partenaire ni stocks tiers |

**Attention au passif documentaire :** `docs/AUDIT_OBJECTIF_FINAL_PLAN_2026-11-01.md` décrivait encore 3 ASIN complémentaires et un conseiller limité à 15 modèles ; des PR ultérieures ont unifié les 52 montres, vérifié 7 ASIN complémentaires et étendu le conseiller. Le présent plan supersède sa photographie historique pour les métriques catalogue et les liens. Les audits historiques restent utiles pour leurs risques structurels.

## 2. Le système économique, pas seulement le site

`Recherche Google / contenus -> pages utiles -> décision assistée -> clic marchand ou achat direct -> attribution / marge réelle -> données agrégées -> meilleurs produits/contenus -> réinvestissement`.

Le système se casse si **l'un** de ces maillons est absent :
- Trafic sans correspondance produit = pas de revenu.
- Belle photo sans référence exacte = retours, perte de confiance, faible conversion.
- Clic sans programme d'affiliation approuvé = revenu non garanti.
- Paiement client sans fournisseur fiable = dette de livraison/remboursement.
- Prix faible sans coût total et réserve SAV = activité déficitaire.
- Automatisation sans observabilité et idempotence = doubles achats, pertes et litiges.
- Croissance sans identité légale et conformité = risque majeur et arrêt possible.

**Boucles de pilotage :**
1. *Acquisition* : impressions -> CTR organique -> visites utiles ; améliorer les pages qui ont déjà une demande.
2. *Conversion* : vues fiche -> clics directs/recherche/vendeur -> commandes reconnues dans la régie ; modifier la sélection en conséquence.
3. *Qualité* : retours / retards / défauts -> score fournisseur -> suspension d'offre et meilleure information.
4. *Marge* : résultat net par commande -> choix d'affiliation, vente ou abandon du SKU.
5. *Risque* : changement de taux de commission, taxes, stocks ou API -> kill switch immédiat, maintien d'un parcours affilié transparent.

## 3. Décider entre les trois modes de monétisation

| Mode | Conditions | Avantage | Risque / décision |
|---|---|---|---|
| **Affiliation Amazon** | Compte/ID et offre du modèle exact, commission validable dans l'espace partenaire | Aucun paiement fournisseur ni SAV produit à gérer | Commission basse sur produits économiques, 30 recherches génériques peu qualifiées ; **continuer, améliorer les 10 meilleures opportunités** |
| **Affiliation Awin / fabricant / AliExpress** | Approbation réelle, contrat FR, deeplink conforme et traçable, autorisation d'usage visuel | Potentiellement bon assortiment SKMEI/ADDIESDIVE/Pagani sans encaisser nous-mêmes | Taux, éligibilité SKU, conversion et attribution non garantis ; **inscrire uniquement les partenaires approuvés** |
| **Vente directe / dropshipping** | G0–G4 remplis, backend, vendeur, coûts totaux, TVA/douane, conditions SAV | Contrôle du prix, du tunnel de paiement et de la relation client ; marge potentiellement supérieure | Besoin de trésorerie, retours, conformité, litiges, frais cachés, fournisseur indisponible ; **pilote très réduit** |
| **Stock UE / fournisseur local** | Demande démontrée et réapprovisionnement/qualité fiables | Délais et expérience de retour plus prévisibles | Capital immobilisé, stockage et invendus ; **évaluer après volume réel** |
| **Marque propre** | Demande, capital, prototypes testés, garanties et conformité | Différenciation et marge contrôlable | MOQ, image de marque, SAV et responsabilité fabricant ; **hors premier cycle de rentabilité** |

**Règle de routage des visiteurs :** la fiche de montre reste informative et inchangée ; une offre est marquée explicitement `Vendu par [marchand]` ou `Vendu par Atelier Montres`, jamais ambiguë. Le même nom de modèle ne permet pas d'interchanger couleurs, générations, matériaux ou fournisseurs.

## 4. Économie unitaire, garde-fous et trésorerie

### 4.1 Affiliation : métrique décisive

`Revenu attribué par 1 000 visites qualifiées = 1 000 × taux de clic marchand × taux d'achat éligible sur le marchand × commission moyenne confirmée`.

Mesurer à partir des **rapports réels partenaires** et de la mesure audience consentie/justifiée. Les clics Umami ne prouvent pas des achats. Ne pas annoncer de commission, de taux ou de bénéfice avant rapprochement. Un produit bon marché peut obtenir de nombreux clics et rapporter peu ; préférer un modèle complémentaire qui rend réellement service plutôt que maximiser les liens.

### 4.2 Vente directe : fiche de coût complète obligatoire par SKU/variante/pays

`Contribution par commande = recette HT réellement acquise - coût réel produit - frais fournisseur/transport - droits/traitement import assumés - frais de paiement/change - préparation/expédition - réserve retours/SAV/litiges - coût d'acquisition variable - autres charges variables`.

Une comparaison de scénarios de TVA ou d'importation doit être **calculée par régime fiscal**, et non par une formule universelle : ne pas soustraire automatiquement la TVA deux fois, ni supposer que les droits sont toujours à payer en plus de la facture fournisseur.

Depuis le 01/07/2026 la douane décrit **3 €** de droits pour les petits envois de ventes à distance jusqu'à 150 €, selon la catégorie tarifaire ; à partir du 01/11/2026 les douanes françaises présentent **2 €** de frais de traitement par catégorie d'article sans seuil. Les modalités réelles et le redevable peuvent varier : vérifier le devis DDP/IOSS et la transaction, éviter tout double compte. Au-delà de 150 €, droits de droit commun et traitement selon le cas. Source : https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne ; textes UE : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32026R0382.

**Seuils de décision internes proposés, PAS des performances observées** :
- Une variante doit avoir un **devis prix rendu France valable, détaillé et actualisé**, preuve de variant matching et zéro frais caché pour le client.
- Pour autoriser un pilote direct, viser **au moins 25 % de contribution / recette HT** avant charges fixes et un résultat **positif sous un scénario dégradé** (livraison +20 %, change défavorable, réserve retours/SAV doublée). Si le prix du marché ne permet pas cette protection : garder l'affiliation.
- Ne jamais engager un ordre fournisseur avant paiement confirmé + anti-fraude + quote revalidée ; conserver un fonds de roulement pour commandes, remboursements et litiges. Stripe peut créditer après la date où AliExpress réclame le paiement.
- **Budget d'acquisition payant = 0 tant que la valeur contributive par commande n'est pas établie.**

### 4.3 Estimation de coûts récurrents : seuils, pas devis

- Vitrine statique Render actuelle : plan à préserver ; surveiller usage bande passante/builds.
- GitHub CI et outils d'image open source : conserver pour le moment.
- Umami : activation facultative, vérifier RGPD, consentement/exemption selon contexte, pas de suivi individuant le client.
- Domaine personnalisé, adresse email métier, services transactionnels et éventuel paiement mensuel dropshipping : dépenses justifiées seulement par besoin concret, devis à obtenir.
- Backend/API/base de données : **coût variable non établi**, ne pas considérer comme gratuit ou illimité à fort volume.
- Stripe standard cartes EEE : grille affichée **1,5 % + 0,25 €** par transaction réussie au 01/11/2026 ; autres cartes/litiges peuvent coûter davantage. Source : https://stripe.com/fr/pricing.

## 5. Roadmap ordonnée par dépendance et résultats vérifiables

### P0 — socle de confiance et vérité commerciale ; avant toute extension

**P0.1 Identité et conformité site (bloquant commercial).** Compléter les mentions légales, statut et coordonnées réelles, hébergeur, notice exacte sur analytics et images. Ne publier ni identité fictive ni justificatif privé. **Fini quand** les informations sont prouvées et contrôlées sur toutes les pages, et qu'aucune mention « incomplet » ne subsiste.

**P0.2 Contrat photographique et preuve produit.** Tenir un registre confidentiel d'autorisations réelles, variante, fournisseur, photo, date et licence ; retirer ou isoler tout visuel non autorisé. Ne jamais utiliser une image IA comme photo produit exacte. **Fini quand** 100 % des images primaires des offres sont traçables au SKU et au droit de publication.

**P0.3 Contrat d'affiliation.** Confirmer le statut du compte Amazon, les rapports de commissions et le tag ; candidater aux deux programmes les plus pertinents selon preuves : AliExpress FR Awin et ADDIESDIVE, puis Pagani. Aucune acceptation présumée ; seul un partenaire qui fournit des liens utilisables et validés devient actif. **Fini quand** chaque lien rémunéré a programme, identifiant propriétaire, référence et preuve datée, ou reste une recherche clairement qualifiée.

### P1 — mesurer et augmenter les conversions existantes (avant nouveaux produits)

**P1.1 Tableau de bord réel et baseline.** Relever avec période/date : Search Console (impressions, pages, requêtes, CTR), Umami si réellement activé (sessions/clics), Amazon/Awin (commandes et commissions), statut des liens, vitesse mobile. Sans accès, indiquer `non mesuré`, pas zéro. **Fini quand** un rapport hebdomadaire remonte 1) sources, 2) 10 fiches en progression, 3) liens cassés, 4) commissions officielles.

**P1.2 Ranger 52 références par opportunité** (intention spécifique, preuve, image exacte, disponibilité et lien direct, qualité du produit, marge potentielle, source fiable). Vitrine initiale courte orientée « très beaux modèles accessibles » avec filtres style, mouvement, format documenté et budget **uniquement si prix fiable**. Les autres restent dans le catalogue et comparateur. **Fini quand** chaque carte a photo authentique ou fallback honnête, taille/mouvement prouvés, provenance et sortie marchande sans confusion.

**P1.3 Convertir les meilleures recherches Amazon en liens exacts, sans en inventer.** Priorités : SKMEI 2056/2256/2514, Pagani PD-1751/1776, ADDIESDIVE autres couleurs, Casio. **Fini quand** un ASIN ou deeplink est lié à modèle + variante + pays exacts, daté, éligible, disponible au contrôle, testé et correctement marqué affilié ; sinon la recherche reste visible comme telle. Éviter de promouvoir SKMEI 2056 `B0C7W5NNX2` tant que l'offre constatée est indisponible.

**P1.4 Faire un audit utilisateur réel sur mobile** : arrivées SEO > choix en 2 minutes > comparateur > lien marchand ; photos lisibles en haute résolution, recadrage photo, légende/photo IA, états focus, CLS/LCP, vérification 320px ; aucun prix et avis inventés. **Fini quand** les 5 principaux parcours Android sont testés en navigateur, avec captures et sans erreurs clavier/WCAG.

### P2 — moteur SEO éditorial et différenciation

**P2.1 Regrouper par intention réelle** : SKMEI rétro/acier, Casio iconiques, montres petit poignet, chronos à bas budget, quartz vs automatique, sélection modèles par situation. Produire **moins de pages, mais vérifiables** ; supprimer les duplications de pages purement synonymes. Ne pas cibler « montres » de manière irréaliste au détriment des références spécifiques.

**P2.2 Comparatifs décisionnels originaux** : tableau SKMEI 2056 vs Casio F-91W ; SKMEI 2256 vs Casio A158 ; ADDIESDIVE AD2030 vs Pagani PD-1701 sur usages différents. Dimensions exactes, avis documentaire distinct des essais réellement effectués, photo et limites. Sources primaires et datation.

**P2.3 Technique Google** : pages indexables cohérentes, sitemap/GSC, liens internes, images réelles WebP, alt approprié, performances LCP/INP/CLS. Schéma `Product/Offer` vendeur **seulement si achat possible sur notre site avec informations exactes et à jour** : Google n'assimile pas les fiches d'affiliation à des annonces marchand hébergées. Sources : https://developers.google.com/search/docs/appearance/structured-data/merchant-listing et https://developers.google.com/search/docs/essentials/spam-policies.

**P2.4 Marque et acquisition libre** : identité visuelle premium cohérente, nom/domaine personnalisés uniquement si faisable, photos avant/après originales et vidéos courtes véridiques (pas de faux porteurs/évaluations), référencement d'articles guides pertinents. S'assurer de droits d'usage de chaque contenu, transparence si généré par IA.

### P3 — qualification opérationnelle de la vente directe : 2 ou 3 SKU, zéro vente avant gate

**P3.1 Sourcing et conditions** : comparer pour chaque SKU un expéditeur AliExpress Chine, un entrepôt UE et un fournisseur B2B spécialisé. Exiger adresse pro vérifiée, devis prix final rendu FR, délais documentés, photos variantes, documentation sécurité et garantie, adresse de retour, facturation, preuve suivi, stratégie rupture de stock. Méfiante envers l'étiquette « livraison gratuite ».

**P3.2 Échantillons réels** : examiner mouvement, bracelet, fermoir, verre, dimensions, finition, résistance annoncée, packaging, notice en français, risque piles/produit ; photographier les modèles réels. Ne pas promettre d'essai sans échantillon.

**P3.3 Conformité** : en tant que vendeur, identifier fabricant/importateur et opérateur responsable UE selon la réglementation générale de sécurité des produits, obligations piles/REP/REACH/emballages selon SKU ; étudier TVA/IOSS, droits et conditions importateur/transporteur. Aucun marquage ou certificat ne peut être supposé par marque ou par marketplace. Sources : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R0988 et https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation.

**P3.4 Vérifier le modèle fiscal, juridique et SAV** : identité de société, moyen d'encaissement marchand, CGV/rétractation (14 jours) et garantie de conformité (2 ans), retours/rappels, service client effectif, politique litiges et responsabilité du transport. Sources : https://entreprendre.service-public.gouv.fr/vosdroits/F37351 ; https://www.service-public.gouv.fr/particuliers/vosdroits/F10485 ; https://www.service-public.gouv.fr/particuliers/vosdroits/F11094.

### P4 — véritable moteur de vente : seulement après P3

**P4.1 Backend transactionnel indépendant**, sans réécrire la vitrine Render ; backend HTTPS, base durable, journaux sécurisés, stock/devis/quotations expirants ; secrets en variables serveur ; aucune donnée bancaire stockée sur le site.

**P4.2 Stripe Checkout serveur** : quote produit + variante + adresse/livraison + prix final + taxes ; PSP vérifié et actif. Idempotence par commande, vérification signature webhooks, journal de paiement, retries sûrs, gestion fraude/rétractations, contrôles contre prix manipulés ; aucun fulfilment depuis l'URL de retour.

**P4.3 Automatisation fournisseur réaliste** : DSers peut synchroniser les commandes mais le règlement des commandes AliExpress demande généralement une étape manuelle. L'option « 100 % automatique » n'est activable qu'après preuve d'une API fournisseur officiellement autorisée **et** d'un mécanisme de paiement fournisseur testable. Ne pas automatiser un checkout AliExpress avec captchas, cookies personnels ou carte non sécurisée. Source : https://help.dsers.com/fulfilling-customer-orders-how-to-place-pay-for-supplier-orders/.

**P4.4 Machine à états résiliente** : `DRAFT -> QUOTED -> PAYMENT_PENDING -> PAID -> PROCUREMENT_PENDING -> SUPPLIER_PAID -> SHIPPED -> DELIVERED`, avec branches `BLOCKED`, `REFUND_REQUIRED`, `CANCELLED`, `RETURN_REQUESTED`, `REFUNDED`. Limites de prix, disponibilité et doublons ; pour l'indisponibilité après paiement, notification et remboursement correct. Voir P4.5 pour l'observabilité.

**P4.5 Observabilité et support** : correspondance payment-intent / order / supplier order / tracking ; alertes non expédiées, webhook en retard, retours/chargebacks ; interface d'administration **protégée**, suivi client minimal RGPD, sauvegardes, export comptable ; kill switch automatique sur fournisseur indisponible, marge négative ou événement incohérent.

### P5 — pilote direct, puis expansion conditionnelle

- **Pilote limité** : 2-3 références, France métropolitaine, variantes exactes et fournisseurs qualifiés ; 0 marketing payant. Aucune commande réelle avant G0–G4 ; commandes réelles seulement après go/no-go.
- Mesurer livraison réelle vs annoncée, erreurs/ruptures, délais de remboursement, chargebacks, satisfaction et marge contributive vs devis. Stopper un SKU déficitaire ou non conforme au lieu de maintenir l'offre.
- Tester prix et présentation **sans affichage trompeur**. Garder un fournisseur de repli qualifié.
- Quand les ventes réellement livrées et bénéficiaires le justifient, négocier entrepôt européen et tarif transport / retours. Ne considérer la marque propre et le stock physique qu'après demande et trésorerie démontrées.

## 6. Gates de mise en production, sans ambiguïté

| Gate | Prérequis démontrables | Action si absent |
|---|---|---|
| **G0** | Mentions légales, politique données, images, partenariat commercial vérifiables | Continuer la mise en conformité, aucun nouveau canal commercial |
| **G1** | Baseline réelle sessions/search/clics/commissions + top 10 modèles intéressants | Continuer l'affiliation et optimiser les données, pas de conclusions de croissance |
| **G2** | Deux SKU réels avec devis exact, fournisseurs et échantillons, conformité, prix total et retour | Pas de paiement, ne pas afficher « Acheter ici » |
| **G3** | Vendeur enregistré, fiscalité TVA/douane, CGV/SAV/garanties, PSP marchand et financement fournisseur | Pas de paiement réel |
| **G4** | Backend Stripe sécurisé et commandes idempotentes, restauration d'incident, suivi et tests navigateur / sécurité | Ne pas publier de checkout |
| **G5** | Fournisseur API et paiement automatique officiellement possibles et testés contre cas d'échec | Rester en traitement manuel surveillé, ne pas promettre 100 % auto |
| **G6** | Pilote réel livré, marge prouvée après incidents/retours, litiges maîtrisés | Ne pas étendre les SKU/stock/dépenses marketing |

## 7. Indicateurs et rituel de décision

**Tableau de bord hebdomadaire** :
- Acquisition : impressions GSC, clics organiques, pages indexées et réellement visitées, CTR par requête/modèle ; périodes comparables.
- Intérêt : vues fiche, clics sortants `amazon:...`, `amazon-search:...`, `merchant:...`, segmentation marque/modèle/surface ; analytique uniquement si licite/configurée.
- Revenus : commandes affiliées **confirmées par régie**, commissions nettes validées, revenu / 1 000 sessions, revenu par groupe de pages.
- Qualité catalogue : pourcentage de fiches avec référence exacte, photo réellement autorisée, modèle marchand exact, statut vérification <30 jours si disponibilité importante.
- Si vente directe : marge contributive réelle par SKU, délai fournisseur payé, délai livraison réel/p95, taux de remboursement/chargeback, frais de traitement/douane, besoin de trésorerie, couverture SAV.

**Objectifs cibles proposés (non observés) :**
- 100 % des CTAs présentent honnêtement vendeur, mode et statut de rémunération.
- 100 % des modèles affichés dans le catalogue ont une référence et une provenance contrôlées.
- 0 paiement pour une offre non qualifiée et 0 commande fournisseur répétée pour un seul paiement.
- 0 frais imprévus ajoutés après validation client ; 0 garantie de délai/stock sans confirmation.
- 100 % des erreurs critiques de checkout/fulfilment détectées par un indicateur et un mécanisme d'arrêt avant l'expansion.
- Pour les modèles à vente directe : contribution positive même en scénario de coûts dégradés ; exact seuil à arbitrer après devis.

**Reporting mensuel** : comparer projets de contenu selon **gain de revenu validé par temps de travail**, supprimer les pages redondantes et ne promouvoir un changement que s'il améliore au moins un des critères (fiabilité, conversion, marge, sécurité, confiance).

## 8. Architecture produit cible, minimale et évolutive

```text
GitHub + actions CI
       |
       v
Render site statique (52 montres, SEO, photos, conseiller)
       |                 |
       v                 v
Liens partenaires        [activé après G2-G4]
(Amazon, Awin, etc.)      API privée + base durable
       |                 |
Rapports officiels        Stripe Checkout + webhooks signés
       |                 |
       |                 v
       |            Commande / devis / états / marges
       |                 |
       |       +---------+-----------+
       |       |                     |
       |   DSers supervisé       API fournisseur
       |   paiement manuel       SI G5 validé
       |       |                     |
       |       +---------+-----------+
       |                 v
       |        Preuve tracking + SAV + retours
       |                 |
       +---------> tableau de bord agrégé
```

Réutiliser prioritairement l'infrastructure existante, le suivi des photos et les outils open source déjà éprouvés ; n'intégrer des outils de `star-list` qu'après vérification de leurs licences, maintenance, permissions et gains. Aucun backend n'est justifié tant que G2/G3 sont faux.

## 9. Ordre des dix premiers tickets exécutable

| Ordre | Ticket | Critère « terminé » | Dépendance |
|---|---|---|---|
| 01 | Actualiser le statut légal/photo et afficher les blocages prouvés | Page légale correcte et références photo documentées ; données personnelles hors Git | G0 |
| 02 | Connecter/rapprocher mesures GSC, Umami, Amazon si comptes disponibles | Rapport daté ; manquants marqués `non mesuré` | Accès comptes |
| 03 | Établir un score des 52 modèles et des sorties marchandes | Top 10 argumenté, 52 modèles conservés, zéro classement de ventes fictif | Audit catalogue |
| 04 | Mettre au premier plan 8-12 montres budget visuellement solides | Parcours Android utile, photo exacte/lien clair, 320px WCAG | 01,03 |
| 05 | Vérifier 10 autres liens produit directs, à défaut ne rien promettre | ASIN/deeplink + variante exacts et preuves horodatées | 03 |
| 06 | Créer 3 comparatifs réellement originaux à intention d'achat | Sources, contexte d'usage, limites documentées, maillage GSC | 03,04 |
| 07 | Activer une affiliation alternative **seulement si acceptée** | Compte approuvé + deeplink + trace sans mélanger les vendeurs | 01 |
| 08 | Recueillir 2 devis fournisseurs + échantillons + frais rendus | `evaluateSupplierQuote` valide sans champ fictif | G2 |
| 09 | Modéliser et tester les états de commande/hypothèses et cas d'échec **sans checkout public** | Calculs reproductibles, fiscalité/retours validés | 08,G3 |
| 10 | Développer et publier un petit checkout réellement sécurisé | G0–G4 satisfaits, parcours de vente réel vérifié, support actif | 08,09 |

**À reporter explicitement** : inventaire de 300 montres, fausses promotions Amazon, paniers factices, internationalisation non demandée, comptes clients inutiles, intégration automatique d'outils `star-list` sans audit, moteur de recommandations opaque, marque propre avant ventes, publicités payantes avant rentabilité.

## 10. Sources et responsabilité des chiffres

### Réglementation / paiement
- https://www.douane.gouv.fr/petits-colis-ce-qui-change-pour-vos-achats-en-ligne
- https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32026R0382
- https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation
- https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- https://www.service-public.gouv.fr/particuliers/vosdroits/F10485
- https://www.service-public.gouv.fr/particuliers/vosdroits/F11094
- https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R0988
- https://stripe.com/fr/pricing
- https://help.dsers.com/fulfilling-customer-orders-how-to-place-pay-for-supplier-orders/

### Référencement et qualité
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://render.com/docs/static-sites

### Preuves locales à auditer à chaque jalon
- `site/selection-affiliation.json`, `site/selection-populaires.json`, `research/amazon-fr-popular-verified.json` ;
- `site/affiliate-links.json`, `site/popular-photo-rights.json`, `site/popular-ai-visuals.json` ;
- `docs/AUDIT_OBJECTIF_FINAL_PLAN_2026-11-01.md`, `docs/p0-conformite-juridique-2026-10-31.md` ;
- `docs/dropshipping-automatisation-frais-2026-11-01.md`, `docs/programmes-affiliation-montres-2026-11-01.md` ;
- `research/fournisseurs-candidats.json`, `research/supplier-quote.schema.json`, `scripts/evaluate-supplier.mjs` ;
- GitHub Actions `validate`, `premium-mobile` et `axe` aux points de release.

**Aucune donnée sur les ventes, conversions, coûts publicitaires, TVA réelle du vendeur ou rentabilité réelle n'est prouvée par ce document.** Les seuils ci-dessus sont des objectifs de pilotage proposés, pas des résultats.
