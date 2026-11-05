> **Archive de stratégie du 2 novembre 2026 :** la [roadmap active du 5 novembre](OBJECTIF_GLOBAL_ET_PLAN_DIRECTEUR_2026-11-05.md) prévaut pour l'état des services, les liens partenaires et le pilote CJ. Les étapes historiques ci-dessous restent utiles comme arguments et options, pas comme liste actuelle des blocages.

> **Architecture commerciale mise à jour le 02/11/2026 :** le site public reste notre propre site statique Render ; toute vente directe éventuelle passe par un backend indépendant et un prestataire de paiement, sans plateforme de boutique externe. [Source commerciale active](COMMERCE_INDEPENDANT_ATELIER_MONTRES_2026-11-02.md). Les descriptions historiques de modules tiers dans ce plan ne doivent pas être interprétées comme une dépendance actuelle.

# Atelier Montres — Plan directeur d'évolution produit, acquisition et rentabilité

**Date : 2 novembre 2026.** Référence inspectée : `dbrckk/Spotify-montre`, branche `main`, commit `d43f2be720d2d7c11b0eaaa1df0f14b268980d01`. Site : <https://atelier-montres-selection-fr.onrender.com/>. Ce document complète et actualise `docs/strategie-systemique-rentabilite-2026-11-01.md`. Il propose une trajectoire et des critères de décision, **pas** une preuve de ventes ou de référencement.

## 1. Décision stratégique et cible

**Positionnement :** « le style horloger premium, sans nécessairement payer le prix du luxe ». Guide d'achat francophone indépendant, spécialisé dans les modèles visuellement attractifs et accessibles, documentés par référence exacte, puis dirigés vers un marchand tiers de confiance. Priorités éditoriales : SKMEI, Casio, ADDIESDIVE et Pagani Design ; Citizen, Seiko, Orient, Tissot et Hamilton comme alternatives et comparaisons documentées.

**Objectif 12 mois :** trafic organique qualifié et flux de commissions **réelles** (confirmées par les partenaires), expérience premium Android, sélection de modèles en évolution pilotée par données, conformité robuste et faible coût. Pas de promesse de place n°1 pour « montres ». Le succès est **revenu net vérifié par 1 000 visites organiques qualifiées**, avec qualité et conformité comme garde-fous.

**Modèle économique retenu :** affiliation d'abord. N'activer la vente directe (AliExpress ou stock UE) qu'après validation formelle de tous les prérequis de conformité, coût rendu, fourniture, paiement, retours/SAV et sécurité ; la piste marque propre est encore plus tardive. La présence d'un module Shopify ne prouve ni vente ni checkout en service.

**Promesse visiteur :** trouver sous ~2 minutes une montre adaptée à son usage, à son esthétique, à ses dimensions documentées et à sa préférence de gamme ; voir une vraie photographie du modèle, ses différences face à 2 alternatives, puis un bouton au libellé honnête vers la référence correcte. Ne jamais confondre `Recherche Amazon`, `Fiche ASIN documentée` et `Fiche fabricant`.

## 2. Baseline auditée : connu, mesuré, absent

| Axe | Constat au 02/11/2026 | Limite |
| --- | --- | --- |
| Architecture | Vitrine statique Render ; HTML/SEO construits par scripts Node.js ; GitHub Actions, contrôles mobile/WCAG/SEO. | La production et les configurations métier sont distinctes ; les tests CI ne prouvent pas les ventes. |
| Catalogue | 52 références = 15 principales + 37 complémentaires ; conseiller, filtre, tri, historique et comparateur. | Trop d'actions dispersées si l'offre la plus pertinente n'est pas mise en avant. |
| Liens | 13 ASIN directs sur les 15 principaux, 10 ASIN sur les 37 complémentaires, donc **23/52** destinations Amazon.fr documentées, **29/52** sans ASIN direct. | Une correspondance historique n'est pas une garantie de stock, de variante ou de prix actuels. |
| Visuels | 15 photos principales + 21 photos complémentaires sur déclaration de droits éditeur, soit **36/52** ; 9 visuels IA SKMEI restent secondaires et explicitement non contractuels. | Les licences n'ont pas été vérifiées indépendamment ; **16/52** modèles n'ont pas de photo locale autorisée. |
| Attribution | Tag Amazon.fr `drackk04-21` déclaré confirmé ; liens actifs. | `approved:false` : examen définitif, vente éligible et commissions non vérifiés indépendamment. |
| Awin/AliExpress | Registre, contrôles et programme candidats présents. | Aucun contrat, deeplink ou revenu tiers approuvé n'est établi dans les données du dépôt. |
| Acquisition | Sitemap, canonical, balisage, analyses GSC exportables, audits en production. | Aucune série fiable de clics GSC, impressions, CTR, positions, sessions ou revenus n'a été obtenue pour cet audit. |
| Conformité | Mentions d'affiliation et confidentialité présentes ; page d'informations légales. | Informations éditeur/statut/contact **incomplètes** ; preuves contractuelles de licences à archiver. |
| Paiement | Site statique sans checkout marchand effectif. | Pas de vendeur juridiquement qualifié, devis SKU complet, commande/fournisseur/SAV prouvés. |

État des PR lors de l'audit : #82 fusionnée et déployée ; #83 ouverte (contrôles GitHub verts), #78 ancienne PR de correctif devenue redondante avec #79. Une PR approuvée n'est pas réputée déployée avant merge et confirmation de Render.

**La notation ci-dessous désigne des objectifs**, pas des mesures de performance actuelle ni des prévisions de chiffre d'affaires.

## 3. Les 8 chantiers prioritaires, ordonnés par dépendance

### Chantier A — P0 : crédibilité, légalité et sécurité commerciale (bloquant)

1. Compléter la page publique d'identification de l'éditeur avec les coordonnées et références légales **authentiques** applicables au statut du responsable. Vérifier les informations hébergeur, le responsable de publication, les mentions de rémunération, la confidentialité et le stockage local. Ne pas mettre d'identité privée dans GitHub.
2. Archiver hors du dépôt public les preuves d'autorisations des **36 photographies** annoncées comme utilisables ; rapprocher photo, modèle, variante, titulaire, licence, période, mode de diffusion et empreinte. Si preuve absente, obtenir licence ou retirer le fichier public.
3. Contrôler le vrai statut Amazon Partenaires, la date de candidature et le maintien du compte ; vérifier les rapports d'attribution. Rappeler que **3 ventes éligibles sur 180 jours** font partie de l'examen de candidature, pas une preuve d'approbation actuelle.
4. Ne jamais publier de prix/stock/notes/« best-sellers » sans source conforme et rafraîchie ; le mode affiliation ne permet pas de se qualifier pour les résultats Google **Merchant listings** des vendeurs effectifs.
5. Faire passer `npm run publisher:strict` lorsque toutes les données éditeur et partenaires nécessaires sont justifiées ; séparer les validations qui restent manuelles.

**Acceptation :** aucun lien non autorisé, aucune photo non licenciée, aucune mention légale fictive ; journal des preuves mis à jour ; contrôles des liens sponsorisés et de la confidentialité réussis.

### Chantier B — P1 : fiabilité et qualité des liens marchands (premier levier de conversion)

1. Conserver le registre unifié exact par SKU : `brand`, `canonicalModel`, `marketplaceModel`, `asin` ou `approvedDeeplink`, `variant`, `evidenceType`, `verifiedAt`, `merchant`, `tracking`, `status`.
2. Requalifier en priorité les **10 montres de la shortlist commerciale** : SKMEI 1257/2056/2256/2514, ADDIESDIVE AD2030, Pagani PD-1701/1776 et Casio F-91W/GA-2100/GW-M5610U ; affiner par preuve et potentiel de clic, pas par popularité inventée.
3. Pour les 29 modèles sans ASIN direct : vérifier fournisseur et version exacte ; chercher un deeplink fabricant/partenaire contractuellement autorisé. Ne pas présenter une recherche Amazon comme une offre achetable.
4. Audit de fraîcheur hebdomadaire et contrôle de variantes noir/bleu, bracelet, génération, suffixe régional. En cas de doute ou indisponibilité : retrait du CTA direct ou retour explicite vers le vendeur/source, sans détour trompeur.
5. Développer une stratégie Awin (AliExpress FR, ADDIESDIVE) et fabricant/Pagani **seulement après** acceptation de la régie, identifiant attribué et parcours testable France.

**Acceptation :** 100 % des CTA mis en avant correspondent soit à un SKU/une variante documentés soit à une source/recherche honnêtement qualifiée ; zéro mauvais ASIN détecté ; chaque lien rémunéré possède sa preuve et sa mention. Pas d'objectif arbitraire de 52/52 liens directs.

### Chantier C — P1 : refonte visuelle premium cohérente (vrai gain perceptible)

1. Concevoir un **design system** stable : ivoire chaud / vert profond / accent laiton, typographie éditoriale sobre, espace respirant, grille, icônes SVG locales ; ne pas disperser des styles contradictoires à travers les CSS historiques.
2. Refondre d'un coup **accueil + cartes produit + fiche + comparateur + conseiller**, avec les mêmes composants visuels, pas une succession de retouches marginales. Prototype mobile à 360/390 px et desktop à 1440 px.
3. Premier écran mobile : promesse claire, photo réelle d'une référence accessible, une action `Trouver ma montre`, entrée `Comparer les modèles`, preuve de transparence, sans surcharger de boutons commerciaux.
4. Vitrine courte de 6 à 10 montres : image réelle uniquement ; hiérarchie par style/intention, et non nombre supposé de ventes. Filtres lisibles et recherche modèle. Les 52 restent trouvables dans le catalogue.
5. Fiche modèle : photo nette zoomable, référence/variante, 4 faits vérifiés, « convient à / limites », deux alternatives comparables, provenance, bouton commercial clairement qualifié, mentions d'affiliation visibles. Sur mobile, éventuelle barre d'action compacte seulement si elle n'empiète pas sur le contenu.
6. Ajouter uniquement des micro-animations CSS discrètes (`prefers-reduced-motion` respecté) ; bannir fonds animés lourds, zooms parasites, carrousels auto et effets WebGL coûteux.
7. Valider contrastes, tailles 200 %, ordre clavier, focus, gestes tactiles, reflow 320 px, surfaces tactiles, absence de pop-ups intrusifs.

**Acceptation :** 5 parcours réels Android complets, pas de régression WCAG ; screenshots et comparaison avant/après ; photothèque conforme ; esthétique unifiée sur toutes les pages principales.

### Chantier D — P1/P2 : contenu original et moteur SEO de longue traîne

1. Exploiter d'abord Google Search Console : requêtes/pages ayant impressions, CTR bas ou position entre 5 et 20 ; relever les données réelles avant de prioriser. `scripts/analyze-search-console.py` existe : le brancher sur exports CSV/ZIP réels.
2. Clusters prioritaires de demande possible (à confirmer par GSC) : `montre SKMEI numérique`, `SKMEI 1257`, `Casio F-91W vs SKMEI`, `montre homme petit poignet`, `montre cadran bleu 36 mm`, `ADDIESDIVE AD2030`, `Pagani Design PD-1701`, `montre quartz ou automatique`, `montre style rétro acier`.
3. Produire initialement **6–10 pages décisionnelles fortement différenciées**, pas 100 pages synonymes : comparatifs factuels avec tableau propre, cas d'usage, limites et photos de modèles exacts ; signaler les essais absents.
4. Mettre à jour les fiches existantes peu utiles avant d'étendre le nombre d'URLs : une question précise par page, 2 alternatives argumentées, FAQ réellement utile, sources constructeur datées, lien naturel vers catégorie et comparateur.
5. Auditer cannibalisation, indexabilité, canonical, maillage, entités, H1/titres, descriptions, `sitemap.xml`, robots, OpenGraph et données structurées. **Product.image** enrichit une description sémantique mais ne garantit pas un résultat enrichi Google : les extraits `Product` demandent des propriétés supplémentaires vérifiées (offre/avis/notation), et les fiches marchand exigent un achat sur le site vendeur.
6. Publication de contenu par lots complets ; surveillance de GSC après indexation ; ne pas transformer les modèles en pages d'affiliation fines ou SEO automatisé sans valeur.

**Acceptation :** absence de duplication et de contenu commercial inventé ; pages inspectables dans GSC, progression réelle des impressions/clics sur cohortes 28/56 jours quand les données suffisent ; aucune promesse de position n°1.

### Chantier E — P1/P2 : mesurer et améliorer la conversion sans espionner

1. Mesurer les **visites organiques qualifiées**, vues fiche, utilisations du conseiller, comparaisons et **clics sortants par modèle/placement**. Le code Umami est déjà présent mais l'activation production n'est pas confirmée. Appliquer minimisation, notice et choix RGPD adéquat.
2. Garder séparés les clics Amazon directs, recherches Amazon, liens fabricant, Awin. Un clic ne prouve jamais une commande ni une commission.
3. Consolider **rapports Amazon/Awin officiels** + GSC + analytics dans un rapport local hebdomadaire sans données personnelles ; périodes explicites et sources/denominators visibles.
4. Définir le tunnel : `visite qualifiée → fiche → comparaison/conseiller → clic marchand documenté → commande éligible selon plateforme → commission validée`.
5. Test d'hypothèses seulement avec assez de données : ordre des cartes, textes de CTA, deux modèles de fiche, exposition de comparatifs ; éviter l'A/B testing prématuré à très faible trafic.
6. Ranking éditorial audit-able : preuve de lien 25 %, adéquation à l'intention 25 %, photo exacte 20 %, information utile 20 %, diversité commerciale 10 %. **Score interne de préparation**, jamais « meilleures ventes » ou note qualité client.

**Acceptation :** rapport hebdomadaire exploitable, source de chaque métrique, distinction `non disponible` vs `0`, top 10 clics et pages sans débouché, décisions argumentées par données.

### Chantier F — P2 : acquisition organique et distribution légère

1. Créer quelques contenus visuels authentiques et licenciés en format court/photo (comparaison de styles, vrai modèle vs alternative) pour Pinterest, YouTube Shorts et réseaux pertinents ; publier manuellement au début, sans bot de spam.
2. Maillage depuis ressources pertinentes, communautés horlogères lorsque les règles locales l'autorisent, partage de comparateurs utiles. Aucune campagne de backlinks artificiels ni achats de trafic.
3. Prévoir un nom de domaine personnalisé court pour la crédibilité **après** résolution des mentions éditeur et validation du DNS/301/canonical/GSC ; domaine optionnel payant à budgéter, pas préalable technique obligatoire.
4. Étendre ensuite seulement les catégories qui ont signal de demande, preuves et débouchés marchands.

**Acceptation :** au moins un canal organique hors Google traçable dans les données agrégées, zéro promesse de référencement ; coût d'acquisition payant maintenu à 0 tant que le revenu unitaire n'est pas connu.

### Chantier G — P2 : exploitation, sécurité et automatisation efficace

1. Conserver Render statique et le build Node.js sans backend inutile ; éviter la migration React/Next.js pour une vitrine déjà pré-rendue et rapide.
2. Nettoyer les fichiers générés et docs historiques contradictoires ; instaurer un fichier d'état courant unique et versionné. Éviter que les anciens chiffres (13, 30, 43, 60 URL) soient présentés comme l'état actuel.
3. GitHub Actions : build/lint/SEO/accessibilité/mobile avant PR de release ; audit de production et links/images quotidiens ; monitoring hebdomadaire de conformité commerciale ; rollback sur échec réel. Les tests lourds peuvent rester limités aux jalons de release.
4. Lier `dbrckk/star-list` au seul pipeline de veille d'amélioration : consulter opportunités pertinentes chaque jour, mais **aucune installation/inclusion automatique sans audit licence, ressources, sécurité et bénéfice mesurable**. Préférer HTML/CSS/JS et dépendances open source vérifiées.
5. Politique secrets et provenance : pas de token partenaire ni contrats/licences privés en dépôt public ; CI à permissions minimales, dépendances épinglées, CSP et liens externes sûrs, validation de toutes les URL et champs, sauvegarde et rollback GitHub.
6. Mesurer Core Web Vitals terrain et laboratoire, pas seulement les audits statiques ; objectifs Google : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 au 75e percentile, sur mobile. Surveiller taille images et absence de longues tâches.

**Acceptation :** reprise reproductible sur clone, build déterministe, coût fixe minimal, contrôles Android réellement verts, Render live confirmé, liens externes sécurisés, pas de régression d'indexabilité.

### Chantier H — P3 : commerce direct (option, pas un passage obligé)

Condition : **les données démontrent que l'affiliation ne suffit pas ou qu'une offre directe résoudrait un vrai problème**. Étudier 2–3 SKU documentés, pas tout le catalogue.

- **G0** identité légale, capacité de vendre, fiscalité/TVA, RGPD, CGV, droit de rétractation, garanties, SAV et médiation adaptés.
- **G1** fournisseur véritable, SKU/variante, devis rendu France, conformité produit, échantillon, retours, livraison et frais import/transport clairs ; aucune promesse de tarif AliExpress théorique.
- **G2** contribution unitaire positive après **tous** les frais et réserve de retours sous scénario défavorable. Seuil interne indicatif : ≥25 % de contribution sur recette HT (à adapter après données).
- **G3** backend HTTPS sécurisé, prix/devis signés, Stripe marchand réel, webhooks authentifiés et idempotents, stockage persistant protégé, anti-doublons, remboursement et journal d'état de commandes.
- **G4** passation fournisseur réelle, preuve de paiement, suivi de livraison, réconciliation financière et procédure de secours ; DSers n'implique pas le **paiement AliExpress automatiquement**.
- **G5** pilote limité et réversible ; si un gate échoue, garder seulement le parcours affilié.

**Pas de panier ni de paiement factice sur le site actuel.** Le stock UE / petite marque propre n'est examiné qu'après demande et marge démontrées.

## 4. Feuille de route 90 jours — travaux groupés, pas petites retouches

| Phase | Fenêtre indicative | Grand livrable de bout en bout | Critère de sortie |
| --- | --- | --- | --- |
| **0. Fermer les risques** | Semaines 1–2 | Conformité éditeur, preuves images, état Amazon, PR ouvertes nettoyées, rapport de baseline GSC/affiliation | Zéro problème bloquant connu dans les informations publiées ; métriques non disponibles explicitement marquées. |
| **1. Pack conversion** | Semaines 2–4 | 10 fiches prioritaires + flux marchands exacts, affichages des variantes, CTA et comparaisons utiles, revue Android | 100 % des 10 recommandations ont un lien qualifié et une photo exacte licenciée **ou une transparence explicite sur leur absence**. |
| **2. Refonte premium unique** | Semaines 4–6 | Accueil/catalogue/fiche/conseiller/comparateur harmonisés, visuels, navigation et présentation mobile | 5 parcours Android réussis, WCAG, Core Web Vitals labo satisfaisants, sans rupture SEO. |
| **3. Croissance fondée sur données** | Semaines 6–10 | 6 à 10 dossiers SEO originaux, maillage, export GSC analysé, premier tableau de bord commercial | Publication sans contenu dupliqué, revue 28j des impressions/clics et événements quand mesurables. |
| **4. Décisions économiques** | Semaines 10–12 | Bilan commissions/visites qualifiées, choix des 10 modèles suivants, candidatures partenaires qualifiées, feuille de route du trimestre suivant | Stop/continue fondé sur revenus attribués, conformité et signaux de recherche. |
| **6–12 mois** | Selon les métriques | Croissance contenu/offres sélectionnés ; expérimentation vente directe uniquement après G0–G5 | Aucun coût fixe ni risque de vendeur sans justification commerciale. |

Fenêtres indicatives, **pas délais de livraison garantis**. Les audits transversaux restent actifs toute la période.

## 5. KPI, définitions et cibles opérationnelles

| KPI | Calcul / source de référence | Seuil ou objectif |
| --- | --- | --- |
| Couverture de liens **exacts** | modèles avec ASIN/deeplink preuve du bon SKU ÷ 52 | Base : 23/52 ; augmenter sur modèles prioritaires si preuve, jamais au détriment de l'exactitude |
| Couverture photo exacte | modèles avec WebP licencié ÷ 52 | Base : 36/52 sur déclaration ; viser preuve documentaire 100 % des photos effectivement publiées |
| Clic marchand qualifié | clics documentés direct + vendeur exact / visites fiches éligibles | Baseline à mesurer ; pas de cible de conversion avant minimum de données |
| Revenu officiel / 1 000 visites organiques qualifiées | commissions confirmées / visites organiques * 1 000 | KPI économique principal ; aucune valeur estimée sans rapports réels |
| Conversion mesurée côté partenaire | commandes éligibles confirmées / clics déclarés partenaire | Utiliser uniquement la régie officielle ; différences d'attribution à documenter |
| Search Console | clics, impressions, CTR, position, pages indexées par cohortes 28 et 56 jours | Croissance du trafic **qualifié**, pas du nombre brut de pages |
| Qualité mobile | LCP, INP, CLS mobile, 75e percentile si disponible | ≤2,5 s, ≤200 ms, ≤0,1 ; audits labo en complément |
| Fiabilité production | crawl URL, HTML, canonical, schéma, images, CTA et parcours Android | Zéro régression critique ; rollback si erreur commerciale ou indexabilité |
| Conformité | droits visuels et mentions commerciales prouvés | 100 % des assets et CTA commerciaux actifs conformes |
| Frais fixes | factures Render, domaine, outils, régies et éventuelle base | Quasi 0 à court terme ; valider l'économie avant toute souscription |

**Règle données** : aucune case vide ne devient 0 par défaut ; afficher `non mesuré`, `bloqué`, `non pertinent` ou valeur datée et sourcée.

## 6. Les dix tickets à traiter en premier (ordre strict)

| Ordre | Ticket | Fichiers / systèmes clés | Livrable et preuve |
| --- | --- | --- | --- |
| 1 | Fusionner #83 si CI verte puis nettoyer la PR #78 redondante | GitHub PRs, `scripts/audit-live-seo.mjs` | Merge vérifié et Render `live`, aucun correctif perdu |
| 2 | Avoir une vérité publique sur l'éditeur | `site/informations-legales.html`, `scripts/report-publisher-onboarding.mjs` | Mentions complètes authentiques et `publisher:strict` valide |
| 3 | Réconcilier et archiver les licences photos | `site/popular-photo-rights.json`, `selection-affiliation.json` | Preuve privée pour chaque visuel public, sinon retrait |
| 4 | Récupérer données source réelles GSC et Amazon | `scripts/analyze-search-console.py`, rapports partenaire | Baseline 28j datée, métriques sans chiffres fabriqués |
| 5 | Requalifier les 10 montres à potentiel | `build-commercial-shortlist.mjs`, registry ASIN | Matrice de preuves, lien exact ou fallback honnête |
| 6 | Refondre le parcours Android complet | `site/index.html`, `premium-system.css`, `unified-discovery.css` | Accueil + catalogue + fiche + comparateur + conseiller cohérents |
| 7 | Corriger les 10 premières fiches SEO à intention claire | `scripts/build-popular-product-pages.mjs`, `build-seo.mjs` | Vrai contenu décisionnel, provenance, 2 alternatives |
| 8 | Publier 6–10 comparatifs originaux | `scripts/build-comparisons.mjs`, collections | Pages utiles, indexables, sans contenus synonymes |
| 9 | Activer/valider métriques agrégées RGPD adéquates | `site/analytics.js`, Render env, exports | Tunnel visite → clic → attribution *séparée* |
| 10 | Tableau hebdomadaire et boucle de décision | GitHub Actions, sortie rapport locale, `docs/` | Dix opportunités priorisées, incidents et revenu officiel |

Le responsable conserve les tâches intrinsèquement humaines (données légales authentiques, pièces de droits, autorisations de régie et compte vendeur). Les builds, vérifications GitHub/Render, maillage et créations de pages sourcées sont automatisables.

## 7. Architecture cible sans sur-ingénierie

```text
Données fabricant / références exactes / licences validées
           ↓ contrôle au build
Registre unique 52 SKU + photos + sources + liens commerciaux
           ↓
Générateur Node.js statique SEO (pages + sitemap + JSON-LD)
           ↓
Site Render HTTPS, HTML fonctionnel sans JS, enrichissement mobile local
           ↓
Visiteurs → conseiller / comparaison → lien marchand clairement identifié
           ↓
Search Console + analytics agrégées + rapports officiels régies
           ↓
Décisions éditoriales hebdomadaires + CI/audit public + rollback
```

Dans une phase de vente directe seulement, ajouter un **service transactionnel séparé** avec base chiffrée, devis, webhooks, fournisseur et SAV. Ne jamais introduire de secrets Stripe/Awin dans le JavaScript public.

## 8. Risques bloquants et décision automatique

- **Compte Amazon refusé, changé ou sans attribution** : suspendre les affirmations de commission ; maintenir navigation fabricant, corriger le statut et la régie.
- **Photo sans preuve de droit** : masquer l'image, garder la fiche et la source fabricant ; ne pas générer une fausse photo produit par IA.
- **ASIN incorrect ou variante ambiguë** : désactiver le lien direct et montrer avertissement + source exacte.
- **Indisponibilité fournisseur** : aucune offre « en stock » ; aucun checkout direct.
- **Contenu de faible valeur** : enrichir, fusionner ou mettre hors index la page, pas multiplier les variantes de mots-clés.
- **Régression de production** : ne pas publier ou revenir au dernier commit Render validé.
- **Coût ou RGPD du suivi** : fonctionnement sans analytics, sans cookies requis pour le guide.

## 9. Références officielles utiles

- Google, données structurées `Product` et distinction extrait produit / fiche de marchand : <https://developers.google.com/search/docs/appearance/structured-data/product> et <https://developers.google.com/search/docs/appearance/structured-data/merchant-listing>.
- Google, affiliation légère et création à grande échelle sans valeur : <https://developers.google.com/search/docs/essentials/spam-policies>.
- Google, objectifs Core Web Vitals : <https://developers.google.com/search/docs/appearance/core-web-vitals>.
- Google, sitemap **sans garantie d'indexation** : <https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview>.
- Amazon Partenaires, candidature et conformité des liens spéciaux : <https://partenaires.amazon.fr/help/node/topic/G8TW5AE9XL2VX9VM> et <https://partenaires.amazon.fr/help/operating/agreement>.
- Service Public, mentions obligatoires d'un site professionnel : <https://entreprendre.service-public.gouv.fr/vosdroits/F37351>.
- Dossier interne avant toute vente directe : `docs/dropshipping-automatisation-frais-2026-11-01.md`.

**Instruction de suivi :** à chaque futur `continue`, commencer par le statut GitHub `main` + PR, Render, CI et derniers audits ; traiter le plus haut ticket **non terminé** ; enregistrer preuves et résultats, sans inventer ventes ou tests. Les modifications qui touchent les images ou les liens commerciaux doivent passer leurs contrôles avant le déploiement public.
