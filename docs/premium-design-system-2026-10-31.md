# Design system premium — Atelier Montres — 31 octobre 2026

## Objectif et périmètre
Poursuite de l'[audit AAA](https://github.com/dbrckk/Spotify-montre/issues/20), sans remplacer la stack HTML/CSS/JS existante et sans réinventer des photos.
La feuille `site/premium-system.css` est importée **en dernier** sur la boutique, le conseiller, la fiche interactive et toutes les pages SEO générées, afin d'avoir des tokens et une typographie cohérente.

## Changements
- Palette ivoire / forêt / laiton, bordures et ombres unifiées, composants arrondis sans ornement excessif.
- Lisibilité des cartes réelles : marques >= 12px, titres >= 18px, caractéristiques et liens >= 12px, CTA >= 12px en mode galerie mobile.
- Zones tactiles >= 44px sur filtres ; champ de recherche 48px, taille 16px pour éviter le zoom iOS.
- Les filtres de gamme sont défilables horizontalement au clavier et au toucher sans déborder de la page ; deux colonnes de vrais produits sont préservées à 360-430px (une seule très petit écran).
- Les comparaisons, fiches dynamiques, pages SEO, résultats conseiller et légendes héritent des mêmes standards.
- Transitions uniquement en cas d'autorisation de mouvement ; `prefers-reduced-motion` respecté.
- Aucune modification des pixels des photos, du catalogue, de l'ASIN ou des CTA d'affiliation.

## Vérifications et critères
- `npm test`, double build `node scripts/build-seo.mjs`, `node scripts/validate-seo.mjs` ;
- `WATCH_STOREFRONT_URL=http://127.0.0.1:8765 node scripts/test-premium-readability.mjs` sur un serveur local, après installation Playwright ;
- Captures 360/393/430/768 px, vérification absence de débordement horizontal, lisibilité calculée, zones tactiles, photos exactes et CSS réellement chargé ;
- Playwright existant et CI Render après publication ; Lighthouse médiane mobile >= 95.
- À reprendre ensuite : contrôles réels de contrastes et expérience sur appareils, plusieurs vues authentiques par montre si licences établies, contenu éditorial différencié.

## Limites
Les seuils mesurés sur les éléments clés ne constituent **pas** à eux seuls une conformité WCAG 2.2 AA. Une inspection humaine d'ensemble et des vérifications d'accessibilité complémentaires restent nécessaires.