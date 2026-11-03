# Intégrer un véritable modèle CJ dans la base commerciale

Ce flux est réservé à l'exploitant. Il fonctionne **sans boutique Shopify** et ne crée **ni paiement Mollie, ni commande CJ**. Un contrôle ne représente ni une autorisation réglementaire ni un prix garanti pour tous les codes postaux français.

## Deux opérations disponibles

1. `node commerce/stage-offer.mjs inspect /chemin/prive/candidat-reel.json` : le serveur interroge l'API CJ sur la variante précise, le stock du pays d'expédition, le transport vers le code postal échantillon et le solde disponible. Il affiche une simulation financière, sans écrire en base.
2. `node commerce/stage-offer.mjs stage /chemin/prive/candidat-reel.json` : **relit obligatoirement le fournisseur CJ au moment précis de l'enregistrement** (variante, stock, frais de port/import et solde) puis ajoute une référence **brouillon et non vendable** dans PostgreSQL, accompagnée d'une ligne d'audit du devis. Une référence existante n'est jamais remplacée. La fonction de staging refuse un « plan » JSON de montants pré-calculés : elle doit obtenir un nouveau devis via l'API.

Le fichier privé contient **uniquement les données réelles provenant du fournisseur et du vendeur** :

| Champ JSON | Justificatif et format attendu |
| --- | --- |
| `id`, `label` | Identifiant interne stable et désignation de la montre, sans informations personnelles |
| `supplierVid`, `logisticsName`, `originCountry` | VID exact CJ, transporteur exact du devis CJ, code origine ISO à deux lettres |
| `samplePostalCode` | Code postal métropolitain utilisé **uniquement pour la simulation** ; ne vaut pas validation nationale |
| `amountEurCents` | Prix de vente envisagé, TTC, en centimes |
| `unitCostEurCents` | Borne prudente du coût unitaire fournisseur converti en EUR |
| `supplierLandedEurCeilingCents` | Plafond **tout compris** fournisseur, transport, import/douane et conversion EUR |
| `supplierMaxUsdCents` | Plafond total de débit CJ en USD, en centimes |
| `fxMaxEurPerUsdBps` | Nombre entier documentant le taux maximal EUR par USD ×10 000 ; ce **n'est pas** un taux de marché obtenu par l'outil |
| `vatRateBps` | Hypothèse documentée du taux TVA vendeur ×10 000, sans approbation automatique |
| `reservesEurCents` | Réserve pour frais de paiement, retours, SAV, chargebacks et charges variables non incluses |
| `deliveryMinBusinessDays`, `deliveryMaxBusinessDays` | Délai fournisseur annoncé pour ce canal de livraison, en jours ouvrés |

La structure exige ces **15 champs exactement**. Aucun numéro de compte, mot de passe, jeton d'API ni adresse client ne doit figurer dans le JSON. Le fichier réel doit rester **hors GitHub**.

L'environnement du processus doit disposer de `CJ_ACCESS_TOKEN` pour les deux modes ; le mode `stage` exige aussi `DATABASE_URL`. Le jeton CJ sert uniquement aux appels de lecture, de devis de transport et de consultation de solde ; **aucun appel `createOrderV2` n'est effectué**. Le compte CJ doit disposer d'un solde suffisant même pour être qualifié à l'étape actuelle, puisqu'il s'agit d'un prérequis du parcours réel.

### Garde-fous

- Les prix fournisseur sont obtenus via les appels authentifiés déjà utilisés par le backend ; le coût rendu et son plafond sont comparés en USD **et** après taux maximum EUR/USD. Le prix de l'article lui-même ne doit pas être sous-évalué dans le dossier.
- La marge estimée après TVA, plafond fournisseur et réserves doit représenter au moins **25 % du revenu vendeur net de TVA**. Une valeur manquante, incohérente ou non entière échoue immédiatement.
- Aucun statut `approved`, `stock_confirmed`, `legal_verified`, `tax_treatment_verified` ou `supplier_fx_verified` n'est octroyé par l'importateur. Aucun `verified_until` n'est créé. Les autres contrôles de droit à l'image, conformité GPSR, retours, douane et transfert de données restent également non vérifiés.
- Le détail de la lecture CJ est consigné dans `commerce_offer_preflight_quotes` : montant du produit et du port en USD, total, taux plafond déclaré, plafond EUR calculé et **préfixe de deux chiffres** du code postal échantillon. Aucun secret ni adresse personnelle n'est enregistré.
- La migration SQL est effectuée avant la qualification. Le plafond de change `supplier_fx_max_eur_per_usd_bps` est **obligatoirement** enregistré avec la référence et ne peut plus être écarté silencieusement sous prétexte d'une ancienne structure de base. L'échec d'écriture annule intégralement la transaction.
- Le même identifiant d'offre ne peut jamais écraser une offre précédemment saisie ou déjà liée à des commandes.

## Provenance et impossibilité de falsifier un devis enregistré

Le mode `inspect` est un contrôle en lecture seule et n'autorise aucune
publication. Le mode `stage` ne peut pas recycler la sortie `inspect` :
il effectue **ses propres lectures CJ authentifiées**, impose l'identité de
la variante, du transporteur et de l'entrepôt, la présence de tous les frais
d'import/douane, le respect des plafonds USD/EUR et le solde nécessaire.

Une donnée financière issue d'un objet « observed », d'un export JSON local
ou d'une page publique ne remplace pas une réponse de CJ dans le processus
de staging. Le contrôle PostgreSQL de CI utilise un transport simulé
**exclusivement dans une base locale isolée** ; en exploitation, le CLI
ne fournit aucun transport alternatif et utilise toujours l'API CJ réelle.
Ce mécanisme n'est pas un certificat d'authenticité du fournisseur : le
résultat dépend du compte CJ réellement associé au jeton privé.

Le programme ne conserve pas de jeton CJ dans le catalogue ni dans la table
d'audit. L'activation commerciale est toujours séparée et demeure inactive
même après une qualification économique réussie.

## Vérifications et passage en production

Le pipeline `.github/workflows/commerce-check.yml` lance des validations réelles contre une base PostgreSQL 16 isolée et des données **strictement synthétiques confinées aux tests**. Cela ne prouve pas que des références CJ sont disponibles en production.

Avant de rendre une offre achetable, il reste indispensable d'apporter les documents de conformité et de livraison, la preuve du régime fiscal applicable, l'identité du vendeur, le droit aux images, les conditions de retour, une vérification du taux plafond et du prix fournisseur pour les régions réellement desservies, la trésorerie et une transaction de bout en bout contrôlée. Les comptes Mollie/CJ ne sont pas connectés ici ; aucune activation de `checkoutMode` n'est autorisée.

**État actuel :** infrastructure d'intégration fournisseur préparée, mais **zéro modèle prétendument qualifié en production** tant que les API et justificatifs réels ne sont pas disponibles.
