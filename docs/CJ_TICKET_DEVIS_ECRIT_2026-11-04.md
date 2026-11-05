# Demande de devis CJ directement depuis GitHub Actions — 4 novembre 2026

## Objectif

Débloquer l'étape actuellement manquante du projet `Atelier Montres` : obtenir de CJdropshipping un **devis écrit, détaillé et daté**, couvrant toutes les sommes dues avant/après la livraison en France, pour **une montre précise**. L'offre reste **non vendable** tant qu'aucune pièce ne justifie l'identité du vendeur, le régime d'importation, les coûts, le paiement, les retours, le service après-vente et la conformité.

La requête porte uniquement sur la référence CJ déjà vérifiée :

- Product SKU : `CJZBNSET00031` ; variante noire : `CJZBNSET00031-black`.
- VID : `74F64E7D-7D90-425D-AFB3-487D28B1D09F`.
- PID canonique : `EC60873E-E5A2-4081-82F7-427BC84A8A3D` (différent du PID de catalogue).
- Entrepôt `CN`, destination d'échantillon `FR 75002`, quantité 1, poids déclaré 45 g, propriété `BATTERY`.
- Les deux appels de devis déjà exécutés n'ont renvoyé **aucune** route avec preuve complète et explicite des montants d'import. Le transport n'est **pas gratuit** ; les champs absents ne sont **pas égaux à zéro**.

## Procédure Android (sans copier de clé)

1. Ouvrir [CJ written full landed-cost quote — Actions](https://github.com/dbrckk/Spotify-montre/actions/workflows/request-cj-landed-quote.yml).
2. Dans **Run workflow**, choisir `main` et l'opération : `preview` pour vérifier la catégorie CJ sans envoi ; `status` pour chercher un ticket déjà ouvert et déterminer si une réponse nécessite lecture ; `send` pour **envoyer explicitement une seule demande écrite**. Valider avec **Run workflow**.
3. Lire la conclusion de l'exécution. Le résultat `submitted_to_cj` signifie que CJ a accepté le dépôt du ticket par son API ; le ticket et la réponse se consultent dans **CJdropshipping > My CJ > Ticket**. Ce résultat n'est **pas** un devis obtenu ou une confirmation de vente.

Le workflow utilise le secret GitHub `CJ_API_KEY` existant, jamais affiché ni copié dans les paramètres. Il n'utilise **aucune** clé de paiement, base de données client, adresse d'acheteur ni endpoint d'achat. Les modes `preview` et `status` ne créent aucun ticket. Le mode `status` ne publie dans GitHub Actions que l'état normalisé (`AWAITING_CJ_REPLY`, `AWAITING_YOUR_REPLY`, etc.) et la nécessité de consulter CJ ; **jamais le numéro privé du ticket, son texte ou la réponse fournisseur**. `ticket_found` ne signifie pas que le devis est complet ou approuvé.

## Mesures anti-doublons

CJ précise que `requestNo` ne protège que les soumissions répétées sur **5 secondes**, et **n'est pas une clé d'idempotence durable**. Avant chaque envoi, le programme interroge les tickets récents et leurs contenus, à la recherche de la référence stable `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031`.

- Si le ticket existe déjà : `already_requested`, **aucun nouvel envoi**.
- Le contrôle vérifie jusqu'à **150 tickets** sur trois pages de 50 en inspectant leurs messages initiaux. Si l'historique est plus long, incomplet, modifié entre pages ou illisible : **échec fermé, aucun envoi**. Une catégorie sans informations exigées ne doit jamais être fabriquée.
- Si la création du ticket échoue, renvoie un délai dépassé, ou si sa réponse est incertaine : **aucun retry automatique**. Vérifier les tickets depuis le compte CJ avant de relancer manuellement. Le workflow interdit les exécutions concurrentes.
- Le modèle de message est borné à 1000 caractères par champ et la catégorie est retrouvée par `GET /ticket/types` ; aucune catégorie numérique n'est inventée.

## Ce que le ticket demande

Une ventilation écrite du prix du produit, du transport, de la TVA/import, des droits, du dédouanement et des frais de traitement, avec les éventuels montants à payer par l'acheteur à réception, les régimes DDP/DAP et IOSS, les conditions et délais, les identifiants douaniers C127/C128/C129/Y081 et la conformité transport batterie/GPSR. Il précise qu'aucune commande ou transaction fournisseur n'est demandée.

Si CJ répond « frais applicables » sans prix global, le devis **reste incomplet**. L'étape suivante sera un contrôle de marge conservateur, fondé sur les montants réels et sur la durée de validité écrite, puis la qualification juridique du vendeur et des produits. Ne jamais déclarer `checkoutMode=active` sur la seule base d'un ticket déposé.

## Documentation externe

- [API CJ Ticket](https://developers.cjdropshipping.com/en/api/api2/api/ticket.html) : `/ticket/types`, `/ticket/list`, `/ticket/detail`, `/ticket/create` ; limitation 1 requête/s et doublon non durable.
- [API CJ Freight](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html) : calcul logistique simplifié, puis `freightCalculateTip`.
- [Diagnostic de la variante](CJ_DEVIS_DETAILLE_2026-11-04.md) et [demande de devis complète initialement rédigée](CJ_DEMANDE_DEVIS_LIVRE_FR_2026-11-04.md).

**Historique :** à la livraison initiale du workflow, la demande était prête mais non envoyée. Le 5 novembre, son enregistrement a été confirmé ; voir l'état vérifié ci-dessous.

## Diagnostic réel de la tentative du 4 novembre

La demande GitHub Actions [41916356364](https://github.com/dbrckk/Spotify-montre/actions/runs/41916356364) a exécuté le mode `send`, puis **échoué** avec un message auparavant trop générique. Ce résultat ne prouve ni la création du ticket ni son absence ; **ne pas relancer `send` sans vérifier d'abord l'historique CJ**.

La correction suivante introduit le mode `diagnose`, strictement **en lecture seule**. Le workflow [CJ ticket supplier read-only live diagnosis](https://github.com/dbrckk/Spotify-montre/actions/workflows/cj-ticket-readonly-check.yml) le lance lors d'une mise à jour de la logique de tickets sur `main`. Il cherche dans l'historique du compte la référence exacte, puis valide la catégorie de consultation actuellement proposée par CJ. Aucun POST de création, aucune commande, aucun débit CJ et aucun accès aux paiements ne sont possibles. Le mode manuel `status` demeure disponible dans l'autre workflow.

Les journaux ne présentent que : `ticket_found` / `not_requested`, l'état normalisé éventuel du ticket, `eligible` ou un code technique fixe (`CJ_TICKET_CATEGORY_NEEDS_REVIEW`, `CJ_TICKET_LIST_REJECTED`, `CJ_TICKET_RATE_LIMIT`, etc.). En cas de sélection impossible, quelques noms *sanitisés* de catégories de support peuvent être visibles pour aider à corriger le routage. Ils ne comprennent ni secrets, ni texte des tickets, ni contenu de réponse, ni identité d'acheteur. Un diagnostic vert signifie seulement que les points API en lecture seule sont utilisables, **pas** qu'un devis TTC ou un ticket ait été validé.

**Décision suivante :** si `ticket_found`, consulter la demande dans CJ plutôt que d'en créer une nouvelle. Si `not_requested` et `eligible`, un nouvel essai de `send` peut être envisagé après vérification de la cause précédente. Si l'authentification, l'historique ou la catégorie échoue, corriger la source de l'échec ; ne jamais forcer `send` ni activer le checkout.

## Diagnostic du fournisseur exécuté après la PR #140

Exécution [41930583672](https://github.com/dbrckk/Spotify-montre/actions/runs/41930583672), en lecture seule : la clé GitHub `CJ_API_KEY` a permis de contacter CJ ; l'historique accessible ne contient pas la référence attendue (`historyCheck: not_requested`) ; CJ renvoie **13 catégories et 66 rubriques**, mais le système a répondu `CJ_TICKET_CATEGORY_NEEDS_REVIEW`. Le fournisseur expose bien **Service Consultation → Fulfillment Service Consultation** avec aucun champ obligatoire dans cette rubrique. Le ticket n'a pas été envoyé.

Cause probable du refus : le code de la PR #139 imposait par erreur `Number.isSafeInteger` aux `ticketTypeId` et `questionTypeId`, alors que CJ les définit comme des entiers `long` pouvant dépasser la précision exacte de `Number` en JavaScript.

**Correction :** validation des chaînes entières positives sur 64 bits, conservation des chiffres exacts avec `BigInt` pour la borne supérieure, et encodage de ces deux seuls identifiants comme littéraux JSON numériques sans conversion arrondie. Les IDs mal formés, hors plage ou retournés déjà arrondis par un fournisseur sont refusés. Les autres champs restent encodés par `JSON.stringify`. Des tests couvrent la borne `9223372036854775807`, la non-perte de précision et le rejet d'un ID invalide.

**Critère d'acceptation :** un nouveau diagnostic réel doit afficher `historyCheck: not_requested` et `categoryCheck: eligible` avant une nouvelle tentative manuelle `send`. Si le diagnostic reste en échec, **ne pas envoyer**, analyser la cause ; aucun mécanisme d'achat n'est modifié.

## État fournisseur vérifié le 5 novembre 2026

La tentative manuelle du 4 novembre [41916356364](https://github.com/dbrckk/Spotify-montre/actions/runs/41916356364) avait échoué avant confirmation. La correction des identifiants de catégorie CJ sur 64 bits a été validée en direct, puis un nouvel examen du fournisseur n'a détecté **aucun ticket préexistant** pour cette référence.

À la suite de l'autorisation déjà donnée par le propriétaire du dépôt, **un unique dépôt de demande** a été exécuté depuis GitHub Actions :

- [Exécution fournisseur réelle 41984237373](https://github.com/dbrckk/Spotify-montre/actions/runs/41984237373) : réponse de l'API CJ `submitted_to_cj`, sans commande ni débit.
- Référence interne non sensible : `AM-CJ-FR-QUOTE-20261104-CJZBNSET00031`.
- [Diagnostic fournisseur indépendant 41931382381 — tentative 3](https://github.com/dbrckk/Spotify-montre/actions/runs/41931382381) : `historyCheck=ticket_found`, `supplierState=AWAITING_CJ_REPLY`, `categoryCheck=eligible` ; CJ attend sa propre réponse.
- Le déclencheur de soumission automatique à usage unique est supprimé dans le changement de suivi. L'envoi `send` redevient exclusivement manuel.

**IMPORTANT :** `submitted_to_cj` et `AWAITING_CJ_REPLY` ne sont pas des confirmations du coût complet, des délais, de la conformité, ni de la capacité à commander. Le devis détaillé, le prix TTC vendeur, la marge et les conditions de SAV restent à vérifier. Aucun changement de `checkoutMode=inactive`.

## Surveillance sans frais et sans manipulation quotidienne

Le workflow [CJ ticket supplier read-only live diagnosis](https://github.com/dbrckk/Spotify-montre/actions/workflows/cj-ticket-readonly-check.yml) exécute `watch` chaque jour à **07 h 34 UTC** (08 h 34 heure d'hiver française ; 09 h 34 heure d'été). Le planificateur GitHub peut retarder ou ne pas lancer certaines exécutions.

- Tant que la réponse CJ est `AWAITING_CJ_REPLY`, le suivi termine **vert**, sans action.
- Si CJ demande une réponse, ferme le ticket, change son état ou si le ticket n'est plus trouvable, il affiche le signal fixe `CJ_TICKET_OPERATOR_REVIEW_REQUIRED` et termine **en échec** ; les notifications GitHub Actions dépendent des réglages de ton compte.
- Le workflow ne lit que la liste et le détail du ticket, avec une clé temporaire en mémoire ; il ne crée **aucun ticket**, ne répond pas à CJ, ne commande rien et ne débite rien. Les contenus privés des tickets ne sont pas publiés.
- Lorsqu'une réponse doit être examinée, ouvrir **CJdropshipping > My CJ > Ticket** et lire le ticket correspondant. Ne pas coller la clé API, les données d'acheteurs ou le contenu privé dans une issue GitHub publique.

La bonne prochaine action commerciale n'est plus de rechercher des dizaines de montres : c'est de **qualifier ce devis écrit unique**, en gardant la preuve fournisseur privée et les coûts/conditions vérifiés, puis de valider les marges et les exigences légales avant la moindre vente directe.
