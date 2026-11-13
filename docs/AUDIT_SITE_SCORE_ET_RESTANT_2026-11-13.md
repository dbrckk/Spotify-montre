# Audit Atelier Montres — note, preuves et reste à livrer (13 novembre 2026)

> **Audit de l'état publié** : `main@18bf87f7b950ea131b817513d22949428a644ba2`, site `https://atelier-montres-selection-fr.onrender.com/`. Score de maturité éditorial et qualitatif, **non métrique automatique de qualité**. Référentiel : [charte R0 à R4](OBJECTIF_FINAL_PRODUCTION_READY_2026-11-09.md). Ce rapport ne vérifie pas les comptes privés ni des achats réels.

## Verdict

- **Vitrine technique : 8,5 / 10.** Références réelles, navigation mobile, tests de non-régression, site réellement publié et performant.
- **Commercialisation effectivement démontrée : 3 / 10.** Liens d'affiliation documentaires mais approbation finale, ventes et paiements non attestés ; ventes directes désactivées.
- **Maturité vers le produit final R4 : 5,8 / 10.** Appréciation relative au périmètre demandé, pas une moyenne scientifique des scores Lighthouse.
- **Stade : R0 acquis sur le périmètre testé ; R1 non signé ; R2 non démontré ; R3 désactivé ; R4 non atteint.**

L'appréciation esthétique est **provisoire** : le contenu et les classes CSS, ainsi que l'affichage des pages HTML en production, ont été consultés, mais l'audit visuel externe complet avec captures multi-résolutions n'a pas été mené. Ne pas affirmer une revue photographique exhaustive.

## Preuves du 13 novembre 2026

| Domaine | Constat vérifié | Limite |
|---|---|---|
| Publication | Dernier déploiement Render `18bf87f7` = `live` | Statut de déploiement, pas garantie de disponibilité à long terme |
| Mobile | [CI premium mobile réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/43317472538) et [Android production réussi](https://github.com/dbrckk/Spotify-montre/actions/runs/43317472563) | Parcours automatisés couverts, non tous les terminaux |
| SEO technique | [CI SEO réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/43317472798) ; accueil et fiche Citizen ont titre, description, robots indexables, canonical pour accueil/fiche | Clics, impressions, CTR et pages Google indexées **non mesurés** dans l'audit |
| Accessibilité | [Audit WCAG automatisé réussi](https://github.com/dbrckk/Spotify-montre/actions/runs/43317472489) | Audit humain au clavier/lecteur d'écran non complet |
| Vitesse | [Lighthouse 12/11/2026](https://github.com/dbrckk/Spotify-montre/actions/runs/43317443651) = 100/100 sur 6 modèles de pages ; LCP accueil 1 090 ms et catalogue 1 450 ms | Lab synthétique, aucune mesure p75 visiteurs réels |
| Catalogue | 52 produits éditoriaux, 15 principaux et 37 complémentaires ; filtres et comparaison de 2–3 montres | Les fourchettes de gammes ne sont pas des prix courants |
| Photographies | 15 photos principales + 26 photos complémentaires = **41/52** ; **11/52 sans photo** | **0/41 autorisations indépendamment authentifiées** dans les registres du dépôt |
| Affiliation | 13 ASIN principaux + 14 complémentaires = **27/52 références associées à un ASIN** | Une association ASIN ne prouve ni référence actuellement achetable, ni stock, ni montant de commission |
| Partenaires | Amazon `site/affiliate-links.json` : adhésion déclarée, approbation finale non établie ; Awin désactivé, 0 offre | Revenus réels inconnus, pas égaux à zéro |
| Identité | La page publique `informations-legales.html` indique explicitement l'identification et le contact éditeur incomplets | **Blocage R1**, même si SEO, JS et CSS passent |
| Encaissement | `site/config.json` : `checkoutMode: inactive`; `site/catalogue.json` : 0 produit vendable direct | Aucune transaction directe payée/livrée/rapprochée démontrée |
| Mesure | Umami facultatif dans le code, non confirmé actif ; aucun export GSC vérifié | Aucun taux de conversion, chiffre d'affaires ou rendement prouvable |

**Contrôles de mise en production source :** G01, G02, G06 = PASS ; G04, G05, G07 = BLOCKED ; G03, G10, G11, G12, G13 = EXTERNAL_PROOF_REQUIRED ; G08, G09, G14 = NOT_MEASURED. Une CI verte n'est pas une conformité juridique ni une activité profitable.

## Priorités ordonnées et définition de terminé

### P0 — conformité et crédibilité : conditions indispensables pour R1

1. **Éditeur identifiable** — obtenir via canal privé les vraies informations juridiques applicables et un contact fonctionnel ; publier des mentions légales exactes, puis faire valider la rédaction. **Bloqué par données réelles externes.** Ne jamais inventer un statut ou des coordonnées.
2. **Photos : 41 dossiers de droits** — fournir des permissions/licences écrites identifiables par référence, étendue et source ; mettre à jour le registre uniquement sur vérification ; retirer les images sans droit prouvable en préservant les descriptions, textes alternatifs et fiches. **Bloqué par preuves externes.**
3. **Compte Amazon réel** — contrôler l'éligibilité effective au programme, les liens spéciaux, l'attribution et un relevé daté de commissions ; ne pas transformer des clics ou ASIN en chiffre d'affaires. **Bloqué par compte externe.**
4. **QA R1 humaine** — parcourir mobile 320/393 px et ordinateur, retour arrière, zoom à 200 %, clavier/lecteur d'écran et affichage sans JS sur les principaux tunnels. **Travail technique/exploitable sans données personnelles.**

### P1 — monétisation affiliée mesurable sans changer le checkout

5. **Vérifier les 27 destinations ASIN** : exactitude marque/modèle/couleur/suffixe, page réelle, vendeur, fraîcheur des sources ; priorité aux enregistrements historiquement indisponibles. Mettre à jour uniquement avec **preuve datée**, jamais un simple changement automatique de date.
6. **Photographier honnêtement les 11 restantes** : conserver des fiches sans photo tant qu'aucune image autorisée du modèle exact n'est disponible. Ne pas représenter une montre proche comme exacte.
7. **Search Console** : récupérer performances réelles 28/56 jours, indexation, CTR par URL et requêtes ; corriger les pages qui ont des impressions, sans pages de mots-clés artificielles.
8. **Mesure consentie des sorties** : Umami si conditions de confidentialité satisfaites ; distinguer vue, comparaison, clic marchand et conversion partenaire attestée par relevés ; zéro chiffre fictif.
9. **Vérification commerciale** : identifier les premières conversions **effectivement payées et attribuées**, puis mesurer revenu par 100 visites et fiabilité des liens, sous réserve de volumes statistiquement utiles.

### P2 — premium pérenne et exploitation

10. **Revue visuelle réellement observée** des pages clés et du catalogue en grille/photo large : captures Android 320/393 px et desktop 1280/1440 px, cohérence typographie / traitements photos / espaces / CTA, sans perte des scores Lighthouse.
11. **Exploitation** : test de restauration de sauvegarde, scénario rollback d'un mauvais déploiement, alertes réellement reçues, procédure retrait photo ou lien défaillant, réponse aux demandes utilisateurs et budget Render.
12. **Phase vente directe uniquement après validation** : devis CJ référence/variante/port/taxes rendus France, identité vendeur et CGV, KYC PSP, traçabilité produit UE, commandes idempotentes, retour/remboursement, un pilote réel payé → livré → rapproché. Conserver `checkoutMode: inactive` jusque-là.

## Prochain lot technique recommandé

Sans demander de paiement ni d'identifiants : renforcer le **contrôle automatisé des preuves marchandes** et le **rapport périodique des 11 modèles sans photo**, puis produire une revue visuelle sur captures multi-écrans avec axe 'acheteur' (à ne pas confondre avec Lighthouse). Ne pas modifier le catalogue, les commissions ni les permissions sur simple hypothèse.

## Règle de validation

Ne faire passer R1, R2, R3 ou R4 à « atteint » **que sur justificatifs et scénarios effectivement exécutés**. Document d'audit daté : réévaluer après tout changement significatif.
