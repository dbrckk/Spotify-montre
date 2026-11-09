# Atelier Montres — suivi d'exécution du 9 novembre 2026

Ce suivi complète [le plan directeur](./OBJECTIF_GLOBAL_ET_PLAN_DIRECTEUR_2026-11-05.md) et [le plan du 8 novembre](./PLAN_EVOLUTION_2026-11-08.md). La source de vérité reste le code et les preuves d'exécution ; **les prix et les revenus ne sont pas attestés par Lighthouse**.

## Jalon exécuté : fidélité des recommandations à la gamme

**Constat mesuré sur le générateur précédent :** 19 des 37 fiches complémentaires renvoyaient vers au moins une montre d'une autre gamme éditoriale. Le score marque/style/mouvement pouvait faire recommander une montre Prestige sur une fiche Essentielle ou Signature.

**PR fusionnée :** [#238](https://github.com/dbrckk/Spotify-montre/pull/238) · code source de référence `2fdd326fb0a4ac675798d9030e89d5031a6ee535` · branche `main`.

**Livraison :**
- `scripts/build-popular-product-pages.mjs` : trois modèles distincts par fiche, **de la même gamme** (Essentielle, Signature, Prestige), avec au moins une marque différente et au plus deux modèles d'une même marque. Classement secondaire par style, marque, mouvement et photographie autorisée.
- `site/popular-picks.css` : badge visible de gamme et présentation cohérente avec le showroom, sans contenu marchand simulé.
- `scripts/validate-seo.mjs` : validation de la gamme des 111 recommandations générées, de la diversité des marques, des URLs de références exactes, des badges et de la comparaison existante.

**Résultat source vérifié :** après correction, 0/37 fiches n'exige une recommandation hors de sa gamme ; les 37 fiches conservent trois suggestions, soit 111 relations internes.

## Vérifications effectuées

| Contrôle | Preuve / résultat |
|---|---|
| CI SEO, contenu généré | [Exécution PR réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/42586984105) |
| Navigation Android et ordinateur | [Exécution PR réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/42586984096) |
| Accessibilité WCAG | [Exécution PR réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/42586984158) |
| Compatibilité site existant | [Exécution PR réussie](https://github.com/dbrckk/Spotify-montre/actions/runs/42586984250) |
| Site Render publié | [Contrôle Android post-fusion réussi](https://github.com/dbrckk/Spotify-montre/actions/runs/42587424252) |
| Performance mobile publique | [Lighthouse post-fusion réussi](https://github.com/dbrckk/Spotify-montre/actions/runs/42587424187) |

**Mesures Lighthouse laboratoire du 09/11 (post-fusion) :** accueil 100/100, LCP médian 1 083 ms ; catalogue 52 montres 100/100, LCP 1 432 ms ; fiche Casio 100/100, LCP 1 240 ms ; fiche SKMEI avec photo 100/100, LCP 1 250 ms ; fiche Casio sans photo 100/100, LCP 1 087 ms. CLS = 0 dans ces mesures. Ce ne sont ni des données INP de terrain ni une preuve de classement Google.

## Suite priorisée

1. **P1 visuel réel** — tenter de compléter les 12 photos complémentaires restantes à partir de sources du modèle exact et de droits publiables vérifiables ; conserver les fiches typographiques si une preuve manque.
2. **P2 SEO mesuré** — utiliser les données Google Search Console (clics, impressions, CTR, positions, pages indexées) pour améliorer les pages qui reçoivent de véritables impressions, sans multiplier les pages artificielles.
3. **P2 navigation** — exploiter la nouvelle cohérence des gammes et les parcours `fiche → comparateur → marchand exact` ; mesurer les sorties partenaires sans prétendre à une commission confirmée.
4. **P3 commerce réel** — ne pas activer le paiement direct avant devis CJ final livré France, conformité vendeur, marge vérifiée, PSP réel et parcours de remboursement contrôlé.

**Verrou préservé :** `site/config.json` → `checkoutMode: "inactive"`. Aucune vente directe, aucun prix ou stock fictif, aucune nouvelle photo ni lien affilié inventé.
