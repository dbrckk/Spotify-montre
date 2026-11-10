# CJ — lecture sûre des messages paginés (10 novembre 2026)

## Incident réel
Sur `main@e191623`, le contrôle fournisseur en lecture seule s'arrête avec
`CJ_TICKET_MESSAGES_PAGE_MISMATCH`. La validation comparait `data.total`
à la longueur de la première page : hypothèse incorrecte si le ticket
contient davantage d'entrées que `pageSize`.

Documentation fournisseur : https://developers.cjdropshipping.com/en/api/api2/api/ticket.html
(section **Messages (GET)** : `pageNum`, `pageSize`, au maximum 100
messages par requête ; limite de 1 appel par seconde).

## Contrat de lecture déployable
- Appels GET **uniquement** à `/ticket/messages`, `pageNum=1..5`,
  `pageSize=100`; 500 messages au maximum (échec fermé au-delà).
- `total` représente la quantité **globale** ; chaque page doit contenir
  exactement la tranche attendue. Un total qui change, une page vide au
  milieu ou une erreur de pagination arrête le contrôle.
- Identifiants de message obligatoires et uniques pour les historiques de
  plusieurs pages, afin d'éviter de compter deux fois une page répétée.
- Seuls l'origine du message (`CJ`/`CUSTOMER`) et son horodatage sont
  examinés. Aucun contenu, lien, fichier, numéro privé ou jeton n'est
  stocké dans le dépôt, les sorties CI ou les issues.
- Le contrôleur garde son espacement séquentiel d'au moins 1,2 seconde
  sur les appels fournisseur authentifiés. Les tests mockés contrôlent
  notamment les pages 2/3, les doublons, les comptes incohérents et
  l'absence de commande.
- Si le schéma réel diffère encore, le diagnostic demeure bloquant et
  n'indique qu'un code d'erreur non sensible.

## Ce que le contrôle ne prouve pas
Une réponse de ticket, même vérifiée, **ne vaut pas devis final**. Prix
produit, transport France, TVA, droits, dédouanement, DDP/DAP, délais,
SKU/VID, conformité et risques de retours doivent rester établis par
des pièces officielles hors GitHub avant toute vente.

Le checkout `site/config.json: checkoutMode=inactive` reste inchangé.
Aucune transaction, commande CJ, remboursement, création de ticket ou
débit n'est effectué par cette lecture.

## Retour d'exécution sur le fournisseur réel

Après fusion de la lecture paginée, le workflow CJ en lecture seule
`42906491809` constate : ticket identifié, catégorie support éligible,
mais état fournisseur `EXPIRED`. La lecture des messages reste
non vérifiable : `CJ_TICKET_MESSAGES_PAGE_MISMATCH`.

Pour éviter toute adaptation approximative de l'API, le diagnostic classe
maintenant les erreurs en : total changé, numéro de page incorrect, taille
de page divergente, page trop courte, page trop longue. **Seuls les codes
sont publics ; aucun compteur réel ni échange fournisseur n'est publié.**
Un ticket expiré ne qualifie pas un devis, et ne doit jamais relancer une
création de ticket automatiquement.
