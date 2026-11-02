# ATELIER MONTRES — FEUILLE DE ROUTE VENTE DIRECTE AUTOMATISÉE
*Version 1.0 — 2 novembre 2026 — source de vérité commerciale et technique*

## 0. Objectif final, définition de « terminé »

**Notre propre site**, sans boutique Shopify : présenter des montres réelles et attrayantes, afficher un prix final fiable, accepter un paiement sécurisé, commander automatiquement la **variante exacte** chez un fournisseur contractuellement autorisé, payer ce fournisseur, expédier à **l'adresse donnée par l'acheteur**, transmettre un suivi réel, traiter retours/incidents et calculer une **marge commerciale nette traçable**. Notre activité est **vendeur de biens** (pas une commission d'affiliation) pour les commandes directes. L'affiliation sur les autres produits reste possible en parallèle.

**Succès vérifié seulement si** une vraie commande autorisée a abouti à : paiement capturé par le prestataire, **une** commande payée chez le fournisseur, variante/quantité/adresse concordantes, tracking et livraison prouvés, rapprochement financier positif, facture, capacité à rembourser/retourner et zéro divulgation de données. Une démonstration locale, une réponse HTTP 200 ou un « paiement en attente » **ne suffisent pas**.

**Priorités** : fiabilité > flux réel > sécurité/conformité > marge > architecture > mobile > SEO. Ne pas désactiver les garde-fous pour accélérer le premier achat.

## 1. État audité (02/11/2026)

| Composant | Existant / vérifié | Manquant ou non démontré |
| --- | --- | --- |
| Site statique Render | `atelier-montres-selection-fr.onrender.com` en ligne ; 52 montres, comparateur et liens affiliés | Les achats directs sont volontairement inactifs |
| Backend Render | `atelier-montres-commerce-api.onrender.com`, Node 22, API /healthz, /api/offers, /api/checkout, /api/webhooks/mollie, /api/orders/:id | Pas d'essai réel Mollie/CJ ; offres activées = 0 |
| Base Neon | Projet `lively-fog-40766725`, région Frankfurt ; tables offres/commandes/événements | Offres = 0 ; commandes = 0 ; aucune preuve de financement fournisseur |
| Commerce de bout en bout | Source code Mollie/CJ, chiffrement de l'adresse, audit, idempotence, anti-double commande, contrôles avant débit et quarantaine | Procédures humaines d'incident, tests d'intégration avec comptes réels, notifications clients, facturation, remboursements |
| Paiement | Mollie Payments API prête côté serveur, vérification GET et gardes remboursement/rétrofacturation | Compte marchand live, KYC, compte bancaire, frais contractuels et contrats validés |
| Fournisseurs | CJ OpenAPI envisagée : `createOrderV2 payType=2`, solde et suivi ; vérifications coût/stock | **Aucun VID réel**, prix/devis vérifié, justificatif images ou conformité UE ; token et solde CJ absents |
| Légal / RGPD | Pages informatives et architecture de non-exposition des cartes | Identité vendeur authentique, CGV, délais, médiation, politique traitement/transfert au fournisseur hors UE, conformité produits |
| Exploitation | Logs Render, statut commande, blocage par défaut | Alertes poussées opérateur, mesure SLA, rapprochement quotidien, sauvegardes/restauration, gestion autonome des litiges |

Les vérifications techniques de la PR #95 ont été validées, les deux services déployés, `checkoutMode: inactive`, `COMMERCE_ENABLED=false`.

## 2. Choix d'architecture et alternatives

| Bloc | Option prioritaire | Alternative vérifiée/à qualifier | Pourquoi/condition |
| --- | --- | --- | --- |
| Site et catalogue | Notre HTML/JS sur Render statique, code GitHub | Migration de l'hébergement uniquement si nécessaire | Préserve SEO, historique et coûts |
| Backend | Service Node sur Render + PostgreSQL Neon | Cloudflare Workers + D1, si charges et coûts mieux adaptés | Clés secrètes **uniquement côté serveur**, transactions et suivi |
| Paiement | **Mollie** hébergé (paiement EUR, GET après webhook) | **PayPal Orders v2** avec capture vérifiée et webhooks, ou prestataire bancaire français | Aucun besoin de Stripe ; le prestataire doit accepter le secteur/marchand. Pas d'auto-encaissement sans KYC |
| Fournisseur automatique | **CJdropshipping** OpenAPI + paiement sur solde préfinancé (`payType=2`) | Fournisseur UE/BigBuy API **uniquement** si vraie commande + règlement automatique vérifiés, conditions financières acceptables | AliExpress + DSers standard = règlement souvent manuel ; **non conforme à l'automatisation complète** |
| Modèles non compatibles | Liens affiliés existants | Fournisseur direct/API agréé à négocier | Ne pas inventer de SKU, de marque, d'image ou de stock |
| Remontée incidents | Journaux PostgreSQL + alerte exploitant | Email transactionnel/webhook vers canal validé | Pas d'alerte contenant une adresse, une carte ou un token |
| Notifications client | Email transactionnel après commande, paiement, suivi | Page de suivi avec token privé déjà présente | Consentement marketing séparé des emails contractuels |

**Principe juridique :** achat à notre nom → fournisseur réglé par nous → marge = prix HT effectivement acquis − coûts variables réels (fournisseur, port, TVA non récupérable, douanes, frais de paiement/FX, retours, SAV, provisions) et charges/fiscalité résiduelles. N'utiliser le mot « commission » que pour **l'affiliation** ou un **mandat de marketplace contractuellement et techniquement réel**.

## 3. Étapes et critères d'acceptation — séquence obligatoire

### P0-A — Fiabiliser les API et l'argent (en cours)

- [x] Ne jamais payer fournisseur sur simple retour du navigateur ; vérifier l'API Mollie côté serveur.
- [x] Idempotence de la création de paiement, pas de double achat fournisseur après timeout, états persistés, plafond quotidien.
- [x] Revalidation paiement + coût + stock + transport + solde avant de débiter CJ.
- [ ] Corriger les **montants TTC** des devis CJ : `totalPostageFee` *inclut déjà* taxes et douanes si ce champ est fourni (ne jamais les compter deux fois) ; vérifier `tariff` et la méthode exacte.
- [ ] Rendre le montant fournisseur et sa marge **vérifiables avec conversion USD/EUR prudente, frais FX et réserve** ; seuil de marge réaliste et configurable, aucun prix basé sur estimation.
- [ ] Tester les réponses officielles CJ : `result: true` (le champ `success` peut être absent), `createOrderV2` retourne parfois un identifiant tardif ; ne pas confondre « commande créée » et « payée ».
- [ ] En cas d'adresse non livrable, devis incomplet ou coût supérieur : refus AVANT paiement ; si après paiement : `EXCEPTION` + procédure de remboursement vérifiable.
- [ ] Séparer clairement `ORDER_CREATED`, `CUSTOMER_PAID`, `SUPPLIER_CREATED`, `SUPPLIER_PAID`, `SHIPPED`, `DELIVERED`, `REFUND_PENDING`, `REFUNDED`, `EXCEPTION`.
- [ ] Interdire la mise en ligne sur un fournisseur avec paiement manuel ; **aucune** clé/API personnelle exposée côté navigateur.

**Acceptation :** tests de non-régression des cas à double débit, surcoût, 0 stock, webhook falsifié, paiement remboursé, délai réseau, redéploiement pendant commande ; une commande fournisseur *au maximum* par commande client.

### P0-B — Légalité, conformité et données (dépendances vendeur)

- [ ] Identité légale et adresse de contact véritable, SIREN/SIRET selon situation, gestion des taxes, TVA/OSS/IOSS, modalités facturation, compte pro ; faire valider la situation avec un professionnel.
- [ ] CGV réelles : prix TTC transport inclus/indiqué, délai et date limite **précis**, pays desservis, garantie légale, service client, médiateur, formulaire de rétractation 14 jours, remboursement et retours.
- [ ] **GPSR** : fabricants, importateurs/opérateur responsable UE selon catégorie, documentation des risques et traçabilité ; **CE seulement lorsque réglementation applicable**, règles piles et DEEE/emballages, environnement.
- [ ] Photos de marque : justificatifs conservés, variantes exactes, droits et éventuelles interdictions commerciales ; échantillon par référence.
- [ ] RGPD : destinataires des données pour la livraison, base légale, sous-traitance, conservation, suppression et garanties de transfert hors UE (CJ en Chine), accès minimal au déchiffrement.
- [ ] Les fiches des montres vendues directement indiquent clairement que **nous** sommes le vendeur ; supprimer les mentions « nous ne vendons pas » de ces fiches uniquement à l'activation.

**Acceptation :** checklist vendeur signée, mentions accessibles sur mobile avant l'écran du prestataire, pas d'identité ni de prix inventés. Pas d'ouverture commerciale sans cette étape.

### P0-C — Compte de paiement véritable (dépendance externe)

- [ ] Choisir Mollie (premier choix) ou PayPal/PSP équivalent selon éligibilité, ouverture et approbation KYC ; confronter commissions, délais de versement et frais de litige/FX.
- [ ] Intégrer des clés `live` via variables Render secrètes ; jamais GitHub, jamais site statique.
- [ ] Configurer webhook public, tester statut `paid`, `pending`, `failed`, `canceled`, `expired`, remboursements partiels, chargebacks, requêtes rejouées.
- [ ] Réconcilier versements reçus et commandes en PostgreSQL ; enregistrer transaction prestataire et frais réels.
- [ ] Mettre une méthode de remboursement opérateur sûre et idempotente ; ne jamais annoncer « remboursé » avant preuve PSP.

**Acceptation :** paiement test dans l'environnement du PSP, puis paiement réel autorisé et réconciliation bancaire ; personne ne paie avant marchand approuvé.

### P0-D — Fournisseur automatique réel (dépendance externe)

- [ ] Créer/autoriser CJ, récupérer API Token en sécurité et confirmer le solde en USD et les limites API.
- [ ] Identifier les **2–3 références pilotes** : idéalement SKMEI, ADDIESDIVE ou Pagani *uniquement si* le VID et la marque correspondent exactement à la montre présentée ; sinon choisir d'autres références réellement traçables.
- [ ] Vérifier qualité, prix, photos, variantes, preuve de marque, facture fournisseur, disponibilité entrepôt, pays de destination, transporteur, frais complets, DDP/IOSS, délai, retours, pays du client et conformité UE.
- [ ] Configurer la trésorerie pour payer CJ **avant** que Mollie verse les fonds ; plafond de dépenses, alerte solde bas, réserve remboursements.
- [ ] Utiliser `payType=2` uniquement après confirmation que le solde et l'API de ce compte sont compatibles ; interroger le détail de commande après la création, puis tracking.
- [ ] En cas de réponse fournisseur incertaine : rechercher l'ordre par `orderNumber` **avant tout** nouveau débit. Ne pas relancer à l'aveugle.

**Acceptation :** commande d'échantillon autorisée à l'adresse prévue, fournisseur effectivement payé, colis suivi et livré, coûts finaux concordants, simulation de retard/incidents.

### P1 — Parcours premium et conversion, à mettre en ligne après P0

- [ ] 3 fiches pilotes premium avec photos légitimes, prix TTC exact, livraison, disponibilité, politique retours, « Acheter sur Atelier Montres ».
- [x] Acheter.html + commande.html développés ; la vitrine garde les liens d'affiliation.
- [ ] Mobile-first : panier multi-modèles **uniquement si** calcul total des frais et stock cohérent ; commencer par 1 pièce, vente multi-pièces plus tard.
- [ ] Retrouver commande malgré fermeture du téléphone ou navigateur : notification email contractuelle et suivi avec accès fort ; ne pas exposer le jeton en URL ni dans les logs.
- [ ] Emails commande payée, préparation, tracking, exception, remboursement, livraison ; limite de fréquence et pas de marketing non consenti.
- [ ] Comparateur actif sur 52 montres, boutons achat visibles **seulement** pour offres serveur réellement approuvées.

**Acceptation :** Android et PC, faible réseau, interruptions, retours navigateur, accessibilité WCAG, parcours complet sans fausse promesse.

### P1 — Exploitation et finance

- [ ] Dashboard admin authentifié : commandes en attente, payées, expédiées, incidents, marge, risque doublon, fournisseurs, remboursements.
- [ ] Notifications exploitant avec journal et acquittement ; escalade en cas de paiement reçu sans ordre fournisseur confirmé en quelques minutes ; ne pas envoyer de PII dans l'alerte.
- [ ] Réconciliation automatique quotidienne : paiement ↔ commande ↔ débit wallet CJ ↔ tracking ↔ règlement PSP ↔ marge réalisée.
- [ ] Sauvegarde DB et test de restauration, rotation clés AES-GCM, rétention des adresses limitée, journal d'audit immuable ou vérifiable.
- [ ] Rate limiting distribué, anti-bot, captcha si trafic suspect, authentification admin MFA, logs sans données personnelles, CORS/CSRF, secrets.
- [ ] Calculs financiers détaillés en centimes intégraux et devises séparées ; jamais de chiffre de bénéfice artificiel.

**Acceptation :** après panne ou déploiement, aucune double facturation, aucune commande oubliée, tous incidents visibles et traitables.

### P2 — Diversifier et étendre

- [ ] Test de 10 à 15 autres références avec preuves et coûts, privilégier entrepôt UE / réassort stable, photos et conformité.
- [ ] Comparer fournisseur CJ à un grossiste européen avec API et paiement automatisé réellement contractuel : taux d'incident, délai, coûts, retours, marge.
- [ ] Paiement secondaire PayPal lorsque Mollie refuse certaines cartes ; ne jamais contourner KYC.
- [ ] SEO produits et collection, avis **authentiques** après livraison, performances mobile, variantes et comparatifs originaux.
- [ ] Règles de prix et marge par SKU (FX/transport/taxes), mise en pause automatique en cas de rupture ou hausse.
- [ ] Expansion zone d'expédition uniquement après contrôle légal, fiscal, logistique et service client.

**Acceptation :** expansion basée sur commandes livrées, taux de remboursement, satisfaction client et marge vérifiée, non sur projections.

## 4. Calcul économique et garde-fou

Distinguer :
- **Chiffre d'affaires TTC** encaissé (prix de vente + port facturé au client).
- **TVA collectée et déclarée** selon régime réel, sans double compter import et vente.
- Prix fournisseur en USD + coût logistique complet + taxes/droits + conversion EUR, PSP, litiges, retours/SAV, stockage, conformité, charges sociales et fiscales.
- **Contribution** = recette économique après TVA − dépenses variables et provisions ; **bénéfice net** seulement après frais fixes, charges, impôt et pertes.
- **Fonds de roulement** = coût CJ des commandes en cours + remboursement possible − liquidité disponible (paiements PSP non encore versés exclus).

**Garde 1** : devis horodaté et variante exacte ; **garde 2** : marge positive et seuil de prudence ; **garde 3** : confirmation PSP ; **garde 4** : disponibilité+coût+solde à l'instant du débit CJ ; **garde 5** : suivi et réconciliation. Une seule garde en échec = pas de vente, ou arrêt de l'expédition avec résolution et remboursement.

Aucun coût fixe chiffré arbitrairement : tarifs Render/Neon/PSP, fiscalité, fournisseur et taux de change seront relevés **sur les comptes concernés** avant publication. Une formule claire vaut mieux qu'un « 30 % de commission » fictif.

## 5. Décisions techniques et risques classés

| Risque | Sévérité | Mesure |
| --- | --- | --- |
| Paiement acheteur accepté mais fournisseur introuvable | CRITIQUE | Pas de mise en vente sans contrat/stock ; stop + incident et remboursement contrôlé |
| Double achat CJ après timeout | CRITIQUE | Identifiant fournisseur unique + verrou DB + quarantaine + réconciliation avant toute reprise |
| Livraison France avec taxe non annoncée | CRITIQUE | Montant TTC complet et DDP/IOSS vérifié, sinon bloquer |
| Mauvaise variante ou contrefaçon | CRITIQUE | VID, photo, code SKU et autorisation fournisseur exacts |
| Débit client sans réponse API | ÉLEVÉ | Idempotency-Key Mollie + récupération de paiement, événement et alerte |
| Rétractation/défaut conforme non traité | ÉLEVÉ | Processus SAV/retours et provision financière avant ouverture |
| Adresse personnelle exposée | CRITIQUE | AES-GCM, clé serveur, minimisation et RGPD/transfert hors UE encadré |
| Frais change/taxes effacent marge | ÉLEVÉ | Preflight complet et budget de coût maximal + réserve en devise |
| Page d'accueil promet des prix/stock fictifs | ÉLEVÉ | Afficher prix serveur que si offre approuvée et checkout actif |
| Service gratuit se met en veille | MOYEN/ÉLEVÉ | Vérifier disponibilité au moment de chaque achat ; monitorer et plan d'hébergement adapté |

## 6. Livraison et suivi du travail — pas de prototypes trompeurs

**Déjà livré dans GitHub :** #91 calcul marge, #92 indépendance PSP, #93 moteur PostgreSQL/Mollie/CJ et pages achat/suivi, #94 lien conditionnel au catalogue, #95 reprise sûre après panne et vérification avant débit.

**Lot en cours dans cette branche :** sécurisation des devis CJ en évitant le double comptage, vérifications documentaires réelles, calculs sensibles, validation adaptée, monitoring et contrats techniques. Les critères de passage restent les tests CI + déploiement réussi + validation de non-activation du paiement.

**Dépendances que seul le titulaire du compte ou un responsable légal peut fournir/autoriser** : identité, banque et KYC Mollie/PayPal, compte CJ et wallet, autorisations marques/photos, vrais devis, CGV et politique retour définitives, première commande témoin. Le code peut être préparé sans ces accès, **l'exécution commerciale ne peut pas être honnêtement déclarée fonctionnelle sans eux**.

## 7. Sources originales et références de contrôle

1. [CJ OpenAPI V2 — création de commande / payType / statut](https://developers.cjdropshipping.com/en/api/api2/api/shopping.html)
2. [CJ OpenAPI — frais de transport, taxes et totalPostageFee](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html)
3. [CJ — variantes exactes et stock](https://developers.cjdropshipping.com/en/api/api2/api/product.html)
4. [Mollie — création paiement, remboursement, flux de statuts](https://docs.mollie.com/reference/create-payment)
5. [Mollie — idempotence, limitée à une heure](https://docs.mollie.com/reference/api-idempotency)
6. [PayPal Orders API alternative (non intégrée)](https://developer.paypal.com/whats-an-order/)
7. [DGCCRF — règles dropshipping France](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/dropshipping-comment-respecter-la-reglementation)
8. [DGCCRF — e-commerce B2C / rétractation](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/e-commerce-les-regles-entre-professionnels-et-consommateurs)
9. [CNIL — transferts de données hors UE](https://www.cnil.fr/fr/responsables-de-traitement-comment-identifier-et-traiter-des-transferts-de-donnees-hors-ue)
