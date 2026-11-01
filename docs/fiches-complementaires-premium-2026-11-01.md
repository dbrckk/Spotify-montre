# Fiches complémentaires : photographie vérifiable et comparaison directe

**1er novembre 2026 — version premium des 37 fiches complémentaires.**

## Objectif
Donner au visiteur une raison concrète de rester sur Atelier Montres : voir la photographie exacte **seulement lorsque sa publication est déclarée autorisée**, comparer immédiatement les caractéristiques et examiner les références alternatives de façon reproductible.

## Implémentation
- `scripts/build-popular-product-pages.mjs` génère les 37 pages SEO existantes. Il n’ajoute aucune offre ni aucun prix.
- Pour les 21 montres dotées d’une photographie locale inscrite au registre `site/popular-photo-rights.json`, le visuel est présenté plus largement, sous une typographie contrastée, avec un bouton **Agrandir la photo du modèle**. `site/extra-product-viewer.js` vérifie que l’identifiant et le chemin local `../assets/watches-popular/<id>.webp` concordent avant de révéler le bouton. La visionneuse réutilise `site/photo-zoom.js` et `site/photo-zoom.css` : fenêtre modale, touche Échap, zoom ×2 et lien fabricant vérifié HTTPS. **Le registre constitue une déclaration du propriétaire, pas une preuve de licence vérifiée indépendamment.**
- Les 16 autres fiches n’affichent ni bouton inopérant ni photographie fabriquée : aucun chargement de visionneuse, représentation éditoriale non photographique et possibilité d’accéder au fabricant.
- Chaque fiche propose près des liens marchands et des recommandations un raccourci **Comparer cette montre à deux alternatives**, format `./toutes-les-montres.html?compare=id-current,id-related-1,id-related-2#comparer`. Les trois identifiants sont tirés des 37 fiches sources, sans doublons ; les recommandations restent issues de la marque, du mouvement, du style et de la catégorie déclarés. Le tableau existant compare les spécifications du même catalogue unifié de 52 modèles, **pas des notes ou un prétendu test réel**.
- La page complète reste lisible sans JavaScript ; les liens vers les produits, les sources et la comparaison fonctionnent sans service extérieur. La visionneuse est la seule amélioration progressive.

## Contrôles de publication
`scripts/validate-seo.mjs` vérifie chaque trio, la double présence du lien de comparaison, l’absence de zoom sur les produits non photographiés, le chargement conditionnel du JS et la conservation des trois propositions sourcées.
`scripts/test-mobile-storefront-v8.mjs` teste les 37 pages à largeur Android : exactitude des liens, zoom réel des photos **SKMEI 2056** et **Pagani PD1701**, fermeture Échap, puis clic sur la comparaison SKMEI et vérification du tableau factuel (trois montres).

**Aucune donnée de vente, approbation Awin ou licence supplémentaire n’a été créée par cette évolution.** Les actions de candidatures éditeur sont volontairement laissées pour plus tard.
