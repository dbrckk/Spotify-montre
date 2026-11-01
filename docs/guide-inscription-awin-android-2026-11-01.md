# Awin — inscription éditeur Atelier Montres depuis Android
**Vérifié sur les pages officielles Awin le 1er novembre 2026.** Ce document n'est pas une preuve de création ou d'approbation d'un compte.

## État commercial réel

- Site publié : **https://atelier-montres-selection-fr.onrender.com/**, 52 montres (15 fiches principales + 37 complémentaires).
- Compte Amazon déclaré enregistré : 13 ASIN principaux et 7 complémentaires documentés, approbation finale/commissions non contrôlées.
- **Awin :** inscription éditeur, acceptation annonceurs **AliExpress FR (26009)** et **ADDIESDIVE (94513)** non confirmées, **zéro lien Awin actif**. Registre bloqué par défaut.
- **Attention :** les [mentions légales publiques](https://atelier-montres-selection-fr.onrender.com/informations-legales.html) restent incomplètes sur l'identité, le statut et le contact de l'éditeur. Les coordonnées institutionnelles de Render ont été complétées depuis ses sources officielles ; elles ne remplacent pas celles de l'éditeur. Une activité professionnelle française doit afficher les mentions applicables ; choisir et déclarer son statut réel, sans fabriquer d'immatriculation, d'adresse ou de téléphone. Source officielle : https://entreprendre.service-public.gouv.fr/vosdroits/F37351?lang=fr

## 1. S'inscrire comme éditeur et non comme annonceur

**Formulaire officiel en français :** https://ui.awin.com/publisher-signup/fr/awin/step1

Le formulaire public affiche notamment quatre étapes : **configuration du compte**, **canal publicitaire**, **espace publicitaire**, **vérification**. À la première étape, renseigner les véritables informations de résidence fiscale, prénom, nom, adresse e-mail et mot de passe. Le champ « Nom de la société » peut recevoir **Atelier Montres** comme nom d'activité si aucune entreprise n'est enregistrée, conformément à la précision du formulaire lui-même. Cette valeur n'est pas une immatriculation ni une qualification de micro-entreprise.

Pour le site/espace promotionnel :`https://atelier-montres-selection-fr.onrender.com/`

**Description du site à recopier :**

> Atelier Montres est un guide français de découverte et de comparaison de 52 modèles de montres. Nous publions des fiches techniques sourcées, des sélections éditoriales et des conseils d'achat. Notre modèle économique repose sur des liens d'affiliation identifiés vers des marchands tiers. Le site ne traite pas de commandes ni de paiements.

Choisir les catégories de promotion les plus proches proposées par l'interface (site de contenu / guide d'achat / mode ou accessoires, selon les choix effectifs). Ne pas se déclarer marque, vendeur ou société enregistrée si ce n'est pas exact.

**Coût :** Awin décrit son inscription éditeur comme gratuite mais indique qu'un **dépôt de garantie unique** est requis pendant le parcours et **recrédité quand le premier seuil de paiement est atteint**. Le montant exact doit être vérifié dans le formulaire, pas deviné ni confondu avec les offres payantes destinées aux annonceurs. Source : https://www.awin.com/fr/faq

**Sécurité :** ne jamais envoyer dans ChatGPT ou sur GitHub son mot de passe Awin, un code d'activation, numéro de carte bancaire, identifiant fiscal privé ou pièce d'identité.

## 2. Terminer le profil et vérifier le site

Une fois accepté par Awin, ajouter/vérifier notre espace promotionnel, s'il n'a pas été ajouté durant l'inscription :

**Compte → Profil → Espaces Promotionnels → Ajouter un site de contenu**. Entrer l'URL ci-dessus, décrire le site et sélectionner le secteur exact. Source officielle : https://success.awin.com/articles/fr/Knowledge/How-do-I-add-or-edit-my-promotional-sites

Publier sur le site les mentions légales de l'éditeur réellement applicables (identité, statut, contact, coordonnées, immatriculation le cas échéant). Utiliser `npm run publisher:preflight` : cet outil signale clairement les pièces manquantes sans inventer de statut ou d'accord commercial. Le mode `npm run publisher:strict` échoue volontairement tant que toutes les étapes requises par la préparation actuelle ne sont pas documentées.

## 3. Demander l'acceptation des deux annonceurs

Depuis Awin : **Annonceurs → Rejoindre des programmes**, rechercher **AliExpress FR (ID 26009)** puis **ADDIESDIVE Watches (ID 94513)**. Ouvrir la fiche, appuyer sur **Rejoindre le Programme** (ou **+ Rejoindre**), sélectionner le type de promotion, accepter les conditions et envoyer la candidature. Un message optionnel de présentation doit comporter au maximum **150 caractères**.

**Message court à copier :**

> Atelier Montres : guide français de 52 montres, comparatifs et fiches sourcées. Liens affiliés signalés, sans vente directe.

La demande peut rester « En attente » ; suivre **Annonceurs → Mes Programmes → En attente**. Le délai dépend de l'annonceur et l'accès aux liens n'est pas garanti. Le statut « Rejoint » peut mettre jusqu'à 24 heures à apparaître après une approbation, selon Awin. Source officielle : https://success.awin.com/articles/fr/Knowledge/How-do-I-join-an-advertiser-programme

## 4. Générer les liens SKMEI et ADDIESDIVE seulement après approbation

**Boîte à outils → Générateur de liens** puis sélectionner l'annonceur réellement **Rejoint**, coller l'URL originale propre et précise du produit, cliquer sur **Générer un lien**, copier l'URL non raccourcie. Si le programme n'offre pas de liens profonds, ne pas fabriquer d'URL. Source : https://success.awin.com/articles/fr/Knowledge/How-can-I-use-Link-Builder-to-create-Deep-Links

Pour **SKMEI 2056 et 2514**, les références actuelles dans `research/aliexpress-skmei-candidates.json` ne sont que quatre **identifiants repérés sur des index tiers anciens** ; il faut, sur la page primaire AliExpress, vérifier vendeur, **SKU sélectionné**, possibilité de commande/livraison en France et admissibilité Awin. Pour la **SKMEI 2256**, aucune URL d'item suffisamment solide n'est enregistrée. Aucun de ces modèles n'est déjà rémunéré par Awin.

Pour **ADDIESDIVE AD2030**, vérifier que la campagne autorise exactement la fiche source et sa variante. Ne pas présumer qu'une commission Awin sera supérieure à une commission Amazon.

La configuration `research/partner-affiliate-offers.json` ne doit passer à `enabled:true` qu'après revue de preuves réelles dans GitHub. Elle exige l'identifiant éditeur, l'acceptation des annonceurs et les liens profonds spécifiques. Un simple clic vers une recherche AliExpress n'est jamais promu comme offre exacte.

## 5. Vérification technique et suivi

```bash
npm run publisher:preflight
npm run partner:status
npm test
```

Seules les données publiquement partageables et les URLs de suivi produit approuvées sont nécessaires à l'intégration ; l'accès au compte, la création des candidatures et le traitement du dépôt éventuel nécessitent l'intervention du titulaire du compte. Aucun achat AliExpress n'est automatisé sur notre site.

**Actions minimales du titulaire :** remplir le formulaire Awin en ses informations exactes ; compléter le statut et les mentions légales applicables ; candidater aux deux annonceurs. Ensuite transmettre le statut d'approbation et, si autorisé, des URLs LinkBuilder non raccourcies. Ne pas transmettre de secret de connexion.
