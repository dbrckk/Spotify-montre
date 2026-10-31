# Visionneuse des 15 fiches produits SEO — 31 octobre 2026

## Objectif
Donner aux pages `/montres/<référence>.html` la même capacité de consulter une **vraie photo en grand** que les fiches interactives `/montre.html`, sans publicité supplémentaire, faux angles, nouvelles images externes ni dépendance payante.

## Fonctionnement livré
- Le générateur `scripts/build-seo.mjs` ajoute un lien **Agrandir la photographie** sur les fiches dont `photoReview.publicUsageApproved === true` et la source locale correspond exactement à l'identifiant du modèle.
- Le lien est nativement utilisable **sans JavaScript** : il mène à l'image WebP locale du même modèle, dans un nouvel onglet.
- Avec JavaScript, l'adaptateur `site/seo-product-photo.js` valide l'identifiant, la photo et l'URL constructeur, puis ouvre l'unique visionneuse existante `site/photo-zoom.js`. Elle affiche la source WebP du **modèle exact** depuis le dossier parent, sans se connecter aux hébergeurs d'images tiers.
- Boutons de navigation désactivés quand une seule photo existe : aucune galerie multiangles fictive.
- `Escape` ferme la boîte de dialogue native et rend le focus au lien ; la photo peut être agrandie dans la visionneuse, avec `prefers-reduced-motion`.
- Le nouvel élément du décor photo est ancré en superposition, sans faire bouger sa hauteur réservée et sans remplacer la photographie source.

## Tests de publication
- Validation HTML sur les **15 fiches générées** : une seule commande zoom pour chaque photo autorisée, lien WebP de secours, scripts uniquement sur les pages avec photographie.
- Scénarios navigateur Playwright sur les quinze routes : ouverture du zoom, source et fabricant exacts, image décodable, absence de fausses vues, fermeture au clavier, restauration du focus et absence de débordement à 393 px.
- Scénario avec JavaScript coupé : lien image réel encore fonctionnel.
- Audits existants : WCAG axe-core, 320 px / 400 % de zoom, texte à 200 %, interactions Android et Lighthouse de production.

## Limites
L'indicateur d'autorisation des photographies est déclaré par le propriétaire ; il ne constitue pas une preuve indépendante de licence. Le zoom ne revendique aucun nouvel angle ni essai physique. Les fiches ne montrent aucun prix, stock, avis ou note inventés.
