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

**Statut au moment de la livraison du workflow : demande prête, non envoyée.** Aucune réponse ni facture CJ n'est présumée.
