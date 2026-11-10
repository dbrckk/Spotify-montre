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

## Préparer les demandes de droits par marque (sans envoi)

Le registre peut désormais produire un brouillon spécifique à chaque groupe de marques. Le dossier Casio regroupe Edifice et G-SHOCK pour éviter les doublons, sans prétendre identifier juridiquement le détenteur des images. Le texte différencie les images déjà publiées des modèles encore sans photo.

```sh
npm run compliance:r1:requests
npm run compliance:r1:requests -- --brand "SKMEI"
npm run compliance:r1:requests -- --all
npm run compliance:r1:requests -- --all --json
npm run compliance:r1:requests:check
```

L'export est aussi régénéré automatiquement sur les changements du registre et des scripts concernés. Sur Android, utiliser **GitHub → Actions → Export R1 photo permission packets (unsent)** (ou **Run workflow** pour le renouveler), puis récupérer l’artefact contenant les brouillons Markdown et les données JSON. Ce workflow **n’envoie aucune communication**. Il n’identifie pas non plus les coordonnées d’un titulaire de droits.

Chaque brouillon fournit la référence du modèle, son URL source, le chemin exact du WebP et le SHA-256 pour aider à vérifier le périmètre des autorisations de reproduction. Une source fabricant ou une empreinte de fichier n’est pas une licence. Le message doit être relu, envoyé au véritable ayant droit par l’exploitant, et la réponse doit être contrôlée hors du dépôt avant toute modification du registre ou du jalon R1.

## Incident de droits — cartographier le retrait d'une photographie

Le site réutilise un original, des versions WebP responsives, des miniatures, des pages statiques et des archives de déploiement. **Enlever seulement une entrée du registre ou masquer une image par CSS ne constitue pas un retrait.** Cette procédure permet d'identifier les dépendances **sans supprimer quoi que ce soit** :

```sh
npm run compliance:photo:impact
npm run compliance:photo:impact -- --id casio-mtp-1302
npm run compliance:photo:impact -- --id skmei-1251 --json
npm run compliance:photo:impact:check
```

Sur Android, GitHub → Actions → **Preview watch photo withdrawal impact (read-only)** → **Run workflow**, saisir l'identifiant précis du modèle et télécharger les deux rapports Markdown/JSON. L'outil recense les fichiers originaux, les variantes mobiles, les pages HTML/JS/JSON qui pointent vers ces chemins et les anciennes archives du générateur de déploiement.

Si un titulaire de droits conteste un visuel, un opérateur devra contrôler la demande, empêcher toute resynchronisation de la photographie, retirer les fichiers concernés du dépôt et de la livraison, regénérer le site et les paquets, et vérifier les URL directes sur Render et le cache éventuel. Les validateurs historiques demandent encore 15 photographies principales : leur adaptation et des tests de remplacement par une présentation sans photo sont nécessaires avant de pouvoir retirer sans régression une photo principale. **Ce rapport ne réalise pas lui-même le retrait et ne confirme ni purge ni conformité.**

## Contrôle de retrait complet sur copie isolée

`npm run compliance:photo:rehearsal` prépare une copie temporaire de `site/`, `scripts/` et `research/`, puis désactive **uniquement dans cette copie** deux photographies principales (dont l’image de couverture Citizen Tsuyosa) et une complémentaire SKMEI. Le test regénère la vitrine, vérifie les pages et le SEO, assemble les paquets statiques et refuse toute présence des WebP retirés. Les 52 références doivent rester navigables.

Les fiches sans photo sont autorisées par le filtre du catalogue et illustrées sans reprendre le visuel du fabricant. Les synchroniseurs refusent de republier un visuel explicitement retiré. **Ce contrôle ne supprime aucun fichier de la version publique ni ses caches précédents**. La procédure de retrait réel nécessite toujours un incident dûment identifié et une modification ciblée sur branche de publication, suivie de la vérification des URLs publiques.
