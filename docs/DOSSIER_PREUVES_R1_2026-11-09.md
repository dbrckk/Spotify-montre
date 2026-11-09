# R1 — Dossier de preuves photographiques et identité de l’éditeur

**État : documentation et outillage préparés, preuves externes encore manquantes.**

Ce registre opérationnel complète la [charte de production](OBJECTIF_FINAL_PRODUCTION_READY_2026-11-09.md). Il n’autorise aucune publication nouvelle et ne prétend pas certifier les images déjà publiées.

## Situation source

- 52 montres : 15 principales et 37 complémentaires.
- 40 photographies locales déclarées par l’exploitant, sans contrôle indépendant des autorisations écrites enregistré dans le dépôt.
- 12 fiches complémentaires sans photo locale : les laisser en présentation typographique tant que l’image exacte et les droits ne sont pas documentés.
- Page légale **incomplète** et `noindex` : identité et coordonnées de l’éditeur non publiées.
- Amazon et Awin : la présence de liens ne démontre ni l’acceptation finale du programme, ni une vente, ni une commission.

## Récupérer les pièces sans exposer de données privées

Exécuter, depuis le dépôt GitHub local ou un workflow de lecture seule :

```sh
npm run compliance:r1
npm run compliance:r1:csv > preuves-r1-a-controler.csv
npm run compliance:r1:check
```

Le CSV de **52 lignes** mentionne pour chaque modèle la marque, l’identifiant, l’URL source de la photo lorsqu’elle est publiée, son fichier, son SHA-256, le fondement déclaré et la preuve attendue. Il permet de regrouper les demandes par marque **sans prétendre avoir contacté un ayant droit**.

Pour chaque photo publiée, conserver dans un dossier privé sécurisé une preuve permettant de déterminer **qui** autorise **quelle photo ou catalogue**, pour **quel site**, l’affiliation et l’usage commercial, le droit de **réhéberger localement** et de convertir en WebP, le territoire, la durée, la révocation et la signature ou identité de l’émetteur. Vérifier les tiers éventuels (photographe, agence, licence concurrente). Une URL fabricant ou une attestation générale ne prouve pas à elle seule l’autorisation de réutilisation.

Conserver les documents écrits, identités, signatures et coordonnées **hors du dépôt public**. Après contrôle juridique authentique, mettre à jour les déclarations du registre en reliant une empreinte du document aux images couvertes ; aucune case `permissionIndependentlyVerified` ne doit être modifiée sans vérification réelle. Le SHA-256 du fichier image atteste seulement l’intégrité des octets, pas la licence.

## Informations légales restant à fournir

Recueillir auprès de l’exploitant son statut professionnel réel, son identité ou sa dénomination, les coordonnées publiques applicables, le responsable de publication le cas échéant, les mentions de registre/TVA pertinentes et les modalités de contact. Faire valider les obligations applicables en France et l’alignement avec `site/confidentialite.html` et les services réellement activés. Ne pas inventer de nom, d’adresse, de SIREN, de numéro fiscal ou de coordonnées. Tant que le contenu est incomplet, conserver la page `site/informations-legales.html` en `noindex,follow` et le jalon R1 en **bloqué**.

## Signaux financiers distincts

L’affiliation requiert l’accord du programme/annonceur, le lien attribué réel, et l’export des ventes **effectivement éligibles et versées**. Un clic ou un ASIN ne vaut pas commission. Le paiement direct reste verrouillé jusqu’aux vérifications juridiques, fournisseur et PSP complètes.

## Critère de sortie

Le dossier R1 est recevable seulement lorsque toutes les informations légalement requises sont publiées, que chaque photographie publiée dispose d’une permission contrôlée pour son usage réel, que l’exactitude des mentions et des parcours tiers a été auditée et qu’un responsable accepte formellement la conformité. **Le rapport automatisé ne suffit jamais à signer R1.**
