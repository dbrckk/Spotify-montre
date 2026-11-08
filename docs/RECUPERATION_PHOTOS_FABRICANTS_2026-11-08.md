# Récupération contrôlée des photos officielles — 8 novembre 2026

## Situation de départ
Le catalogue public compte **52 montres** : 15 modèles historiques avec photo et 22 modèles complémentaires avec une image locale traçable. **15 modèles complémentaires restent sans image publiée**. Leur présentation doit demeurer documentaire et ne jamais emprunter l'image d'une variante.

Le collecteur existant refusait neuf fiches Casio en réponse HTTP 403, trois fiches Orient/Tissot sans image de galerie récupérable et d'autres cas ambigus. **Aucun blocage HTTP Casio n'est contourné.**

## Sources indépendantes désormais admissibles
Les exceptions sont identifiées explicitement dans `research/official-watch-photo-sources.json` :

- **Orient Bambino 38 RA-AC0M04Y** : fiche internationale Orient du code exact, alternative officielle à la fiche française lorsque celle-ci ne présente pas d'image exploitable : https://orient-watch.com/en/orient/collection/classic/classic-and-simple-style-38/RA-AC0M04Y/
- **Orient Mako 40 RA-AC0Q01B** : fiche internationale Orient du code exact : https://orient-watch.com/en/orient/collection/sports/diver-design-40/RA-AC0Q01B/
- **Tissot Gentleman Powermatic 80 T1274071104100** : packshot officiel directement lié au SKU `T127-407-11-041-00`, sur le domaine Tissot : https://www.tissotwatches.com/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw71cff7f4/product-pictures/778fa7b2-de38-441e-bb28-f179037ebb29_T127-407-11-041-00_shadow.png

## Règles de publication
1. La page fabricant doit confirmer **la marque et le code modèle** avant téléchargement ; les pages alternatives sont sur le domaine officiel Orient et liées à une entrée source précise.
2. Les fichiers doivent être de vraies images JPEG/PNG/WebP/AVIF décodables, de dimensions suffisantes, provenant exclusivement du même fabricant/domaine ou d'un CDN déjà autorisé.
3. Le WebP local et sa source exacte, ses dimensions et son SHA-256 sont inscrits au registre des droits. La base légale inscrite reste **`site_owner_attested_brand_authorization`, non vérifiée indépendamment**. Cette attestation ne doit jamais être présentée comme un accord écrit vérifié.
4. Le build échoue en cas de source différente, modèle étranger, photographie non enregistrée ou empreinte altérée. Les photos déjà publiées sont conservées strictement sans retéléchargement.
5. Les URLs marchandes et affiliées, les prix, les stocks et les conditions de vente ne sont pas modifiés. **Une photo obtenue ne valide pas une offre ou une commission**.
6. Une source inaccessible ou une image insuffisante laisse le modèle en mode documentaire sans photographie — jamais d'image inventée.

## Validation
Le workflow `source-popular-watch-photos.yml` exécute les tests hors réseau, tente la récupération en HTTPS sur les sites officiels, génère et valide le site, puis publie sur `main` uniquement des photos dont l'identité, la source et l'intégrité sont acceptées. Le nombre final est confirmé **après son exécution**, pas présumé.
