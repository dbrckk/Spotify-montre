# AM-04 — Séparer les clics, les ventes éligibles et les commissions réellement versées
*État constaté le 5 novembre 2026 sur `dbrckk/Spotify-montre` ; vérifier les faits ultérieurs dans les rapports Amazon officiels.*

## Résultat du contrôle des sources publiques

La configuration du site contient 13 liens Amazon.fr balisés avec le tag propriétaire `drackk04-21`, chacun lié à un ASIN précisément documenté. Elle indique `approved:false` et `enrollmentStatus:enrolled_approval_unverified`. Ces informations attestent seulement de la configuration éditoriale du site et des déclarations du propriétaire — **pas de la validation définitive par Amazon**.

Les 13 références proviennent d'un relevé du **30/10/2026** :
- quatre fiches étaient signalées indisponibles lors de ce relevé ;
- neuf fiches n'avaient aucun contrôle de stock ;
- les deux modèles restants du catalogue principal ne disposent pas d'ASIN exact.
Les quatre URL Amazon.fr testées en lecture publique le 05/11/2026 ne sont pas accessibles par le lecteur utilisé. Cela ne signifie **ni** que les produits sont disponibles, **ni** qu'ils sont supprimés. Aucune demande de paiement ni commande n'a été envoyée.

Le contrôle CJ effectué parallèlement le 05/11/2026 donne toujours `AWAITING_CJ_REPLY` et zéro message fournisseur, sans devis approuvé, commande ou débit. Les deux flux financiers restent indépendants.

## Conditions officielles Amazon Partenaires France

Amazon explique que les candidats doivent obtenir **au moins trois ventes éligibles dans leurs 180 premiers jours** pour déclencher l'examen de leur candidature. Les propres achats du partenaire ne comptent pas. Lors de l'examen, Amazon recherche notamment **au moins dix publications originales**, un site public et du contenu récent (en général moins de 60 jours). Ces règles dépendent des termes en vigueur ; nous ne présumons jamais qu'un site de 78 pages générées remplit automatiquement l'exigence d'originalité.

Sources primaires :
- https://partenaires.amazon.fr/help/node/topic/G8TW5AE9XL2VX9VM (examen des candidatures)
- https://partenaires.amazon.fr/help/node/topic/G7MJTPEP9NC3YKMG (180 jours, compte inactif)
- https://partenaires.amazon.fr/welcome/topic/reports (rapports de commandes, gains et historique des paiements)
- https://partenaires.amazon.fr/help/node/topic/G6253GFSARDQENZR (vérification des liens créés par l'éditeur ; limites du vérificateur)

**Informations non disponibles dans GitHub :** date exacte d'ouverture du compte, ventes éligibles, confirmation d'examen, approbation finale, taux contractuel applicable, montants des commandes éligibles, retours, commission acquise et commission **versée**. Il ne faut attribuer ni zéro (ce qui serait inventé), ni un montant positif à ces champs tant que le tableau de bord officiel n'a pas été lu.

## Correction de l'attribution des clics sur le site

Le script `site/analytics.js` (chargé seulement si `UMAMI_WEBSITE_ID` est activé) distingue maintenant :

| Événement Umami | Signification autorisée | Ce que cela ne prouve pas |
| --- | --- | --- |
| `amazon:<ID>:<emplacement>` | Clic sur un ASIN direct avec le tag du propriétaire, lien clairement `sponsored` | Commande, panier, vente éligible, rémunération |
| `amazon-unpaid:<ID>:<emplacement>` | Sortie vers un ASIN sans balise de suivi ni publicité déclarée | Éligibilité à une commission |
| `amazon-search:<ID>` | Sortie vers une recherche Amazon FR avec le bon tag | Visite d'un ASIN exact ou commande |
| `merchant:<ID>:<emplacement>` | Visite d'une source fabricant ou vendeur autorisée | Affiliation, vente ou rémunération |
| `awin:<ID>:<emplacement>` | Clic d'un programme Awin explicitement paramétré | Vente ou commission Awin acquise |

Les clics sans balise ne sont plus agrégés aux clics Amazon potentiellement rémunérés. Les anciennes séries `amazon:<ID>:<emplacement>` restent compatibles : elles sont **plus strictes à partir de cette version**, donc leur comparaison temporelle doit en tenir compte.

Les liens falsifiés (hôte inattendu, mauvais tag, doublon, paramètres non autorisés, lien prétendument sponsorisé sans tag, ou l'inverse) ne créent **pas** un événement de rémunération. Aucune information personnelle, donnée de commande, prix ou rémunération n'est transmise par le tracker ; il n'intercepte pas la navigation.

**Important :** si Umami n'est pas configuré sur Render, aucun événement n'est envoyé. Le rapport officiel Amazon reste la source de vérité même si des statistiques de clics existent.

## Relevé officiel minimal à faire sur le compte lorsque possible

Sur Android, dans https://partenaires.amazon.fr/ (compte connecté) :
1. Contrôler **l'état de candidature** et la date d'inscription initiale ; ne pas confondre `enrolled` et approbation finale.
2. Aller dans **Rapports** (selon l'interface : *Commandes*, *Rémunérations/Gains*, *Historique des paiements*), sélectionner le tag `drackk04-21` et la période depuis l'inscription. Distinguer clics, articles commandés, articles expédiés, annulations/retours, rémunérations générées et **paiements exécutés**.
3. Contrôler les liens édités dans le compte ; sur une URL spéciale construite sur le site, vérifier son balisage auprès d'Amazon. Un outil de vérification peut refuser certains liens créés directement via Amazon : voir l'aide officielle avant de conclure à un échec.
4. Vérifier qu'Atelier Montres est **exactement** dans les sites déclarés, que l'identité du bénéficiaire est correcte et que le site possède les renseignements légaux exigibles. Ne pas déposer de données d'identification, fiscales, bancaires, mots de passe ou informations client dans le dépôt.
5. Si le compte est en attente, privilégier l'obtention de ventes réelles éligibles par du contenu original et du trafic organique, **sans achat personnel artificiel ni incitation interdite**.

La commande locale `npm run affiliate:status` produit un rapport limité aux fichiers GitHub. `npm test` vérifie la séparation des événements et empêche de remplacer les champs « inconnus » par des statistiques imaginées.

## Critère de clôture d'AM-04

Dossier de vente/commission constaté dans le **compte officiel**, avec vente éligible, remboursement/retour considéré et, pour conclure à des **revenus encaissés**, historique de paiement positif réellement versé. Tant que cette preuve n'existe pas, AM-04 demeure **en attente de preuve de compte**, même si la CI et les liens affichés sont valides.


## Correctif de sécurité des métriques — correspondance modèle/ASIN (suite AM-04)

**Constat après audit du dépôt :** la collecte des clics sortants `site/analytics.js`
distinguait déjà les liens balisés, non rémunérés et les recherches, mais acceptait
encore un événement `amazon:<id>:<placement>` quand la destination `/dp/<ASIN>`
correspondait à **une autre montre**. Le domaine et le tag étaient vérifiés,
pas la correspondance entre modèle affiché et ASIN cliqué. Un lien erroné
pouvait donc polluer les statistiques commerciales sans être détecté par la
télémétrie elle-même.

**Correction :** l'événement `amazon:` et son équivalent `amazon-unpaid:`
sont désormais bloqués si l'ASIN de l'URL ne correspond pas au modèle,
à partir d'une table publique, non personnelle, qui reprend exactement
les **13 références historiques** de `research/amazon-fr-exact-products.json`
et les **10 références supplémentaires** de
`research/amazon-fr-popular-verified.json`. Cette table est **comparée aux
deux registres dans la CI** : en cas d'ajout/retrait d'une montre ou de
changement d'ASIN, les tests échouent au lieu de publier une métrique
silencieusement fausse. Les tests exécutent chaque association réelle et
vérifient aussi les identifiants inconnus, les ASIN échangés, les balises
invalides et les liens non rémunérés.

Le contrôle ne charge aucun script tiers supplémentaire et n'enregistre
aucun cookie, acheteur, donnée personnelle ni prix. Les liens sortants
restent inchangés : il s'agit exclusivement de **mesure des intentions
de visite**, pas de preuve de ventes, d'éligibilité des commandes, de
commission ni de disponibilité en stock.

**À vérifier hors GitHub :** activer/contrôler l'instance Umami uniquement
avec consentement/configuration conforme, puis consulter les rapports
Amazon Partenaires pour les ventes, frais, annulations et commissions
réellement versées. Aucune statistique de compte n'est inventée.
