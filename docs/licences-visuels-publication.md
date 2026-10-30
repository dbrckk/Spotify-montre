# Publication des photographies et illustrations — Atelier Montres

## Actualisation — déclaration d'autorisation du responsable, 30 octobre 2026

Le responsable du projet a **déclaré expressément disposer du droit de publier les photographies des marques pour les 15 références**. Sur cette base, la boutique utilise désormais les fichiers WebP locaux des modèles exacts ; les illustrations SVG originales sont conservées en remplacement de secours.

Pour chaque photo : `publicUsageApproved:true`, `permissionDeclaration:site_owner_explicit_confirmation_2026-10-30` et `permissionIndependentlyVerified:false`. Cette dernière valeur est intentionnelle : **aucune pièce justificative du titulaire des droits n'a été fournie et vérifiée ici**, et le programme Amazon ne confère pas automatiquement un droit sur des photos d'origine fabricant ou revendeur.

Le responsable doit conserver hors GitHub les conditions d'autorisation et vérifier la couverture commerciale, les canaux, l'hébergement, les modifications et l'éventuelle révocation. Une photo provenant d'un distributeur (notamment Citizen Eco-Drive) peut relever de droits distincts de ceux de la marque. En cas de retrait d'autorisation, repasser `publicUsageApproved:false` pour la référence et exécuter le build ; le site retombera sur les illustrations d'origine. La diffusion commerciale est une responsabilité réelle, pas une validation juridique automatique.

Le texte historique ci-dessous documente le régime de précaution précédent, **désormais remplacé par cette déclaration de l'éditeur**.


Mise à jour : 30 octobre 2026.

## Décision de publication

Le fichier `site/selection-affiliation.json` référence 15 photographies de montres réelles issues de pages fabricants, mais **aucune autorisation de diffusion commerciale n'est documentée** (`photoReview.publicUsageApproved:false`). Les fichiers WebP sont présents dans le dépôt à titre de recherche et de préparation.

Pour ne pas présenter ces images comme librement réutilisables, le build du site public :
- affiche les illustrations SVG originales de `site/watch-illustrations.js` sur les cartes, le conseiller, les fiches interactives, le comparateur et les pages SEO ;
- ne charge ni les fichiers WebP ni les URL distantes des constructeurs pour les montres sans autorisation ;
- retire les fichiers WebP sans droits documentés du dossier de publication Render `site/assets/watches/` ;
- n'expose plus l'ancienne visionneuse de revue des photos constructeur `revue-photo.html`, `revue-photo.js` et `revue-photo.css` via la publication Render ;
- préserve les liens vers les fiches officielles des fabricants, où les visiteurs peuvent consulter les photographies exactes.

Ces suppressions se produisent pendant le **build de publication**, après les contrôles fonctionnels. Elles n'ont pas vocation à supprimer les ressources historiques du dépôt GitHub.

## Limites et actions restantes

Les images brutes **restent potentiellement accessibles dans le dépôt GitHub et son historique**, même si elles sont retirées du site en ligne. Un audit juridique et une suppression du dépôt/historique public si nécessaire restent des démarches distinctes.

Les illustrations ont un rôle éditorial : elles ne prétendent pas montrer exactement l'apparence matérielle d'un produit. L'affichage des noms de marques, modèles, des codes produits, du prix et de la disponibilité doit rester exact. Ne pas transformer l'illustration en photo pseudo-réaliste faussement attribuée au fabricant.

Pour réintroduire une photographie commerciale :
1. Obtenir par écrit une licence, un flux d'images autorisé ou une confirmation appropriée du titulaire des droits ; vérifier les conditions de réutilisation et d'hébergement.
2. Archiver les preuves et périmètres d'utilisation, puis mettre `publicUsageApproved:true` uniquement pour la référence validée.
3. Vérifier le build Render, les images et la publication des métadonnées produit.

**Le compte Amazon Partenaires ne constitue pas automatiquement une licence pour réhéberger des photographies constructeur.** Les photographies et contenus accessibles via les outils Amazon peuvent dépendre de conditions particulières. Ne pas présumer que l'accès à l'image autorise sa reproduction.

## Contrôles

`npm test` : tests et validation de sources en amont du build.

`node scripts/build-seo.mjs && node scripts/validate-seo.mjs` : suppression des actifs non autorisés du dossier de publication, illustrations SVG, absence de métadonnées contenant des URL WebP non approuvées, conservation des 21 pages SEO.

Le build n'a pas besoin d'un hébergeur d'images tiers ni de crédits IA.
