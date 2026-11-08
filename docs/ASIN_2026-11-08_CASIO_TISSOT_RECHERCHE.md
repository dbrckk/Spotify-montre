# Atelier Montres — preuve ASIN complémentaire (8 novembre 2026)

## Objectif

Augmenter les **fiches marchandes Amazon.fr associées à une référence identifiable**, sans prétendre disposer des prix, stocks ou variantes en temps réel.

À cette date, la recherche éditoriale couvre toujours **52 références** : 15 historiques, 37 complémentaires. Le registre contient désormais **25 ASIN documentés** (13 historiques, 12 complémentaires) au lieu de 23. Les 27 références restantes ne doivent pas être présentées comme disposant d'une fiche marchande Amazon.fr exacte. Ces totaux ne prouvent aucune vente, aucun stock ni aucune approbation finale du compte Amazon Partenaires.

## Références ajoutées (preuve de redirection et corroboration)

| Identifiant | Variante fabricant | ASIN Amazon.fr | Comparateur avec lien Amazon.fr | Corroboration indépendante |
|---|---|---|---|---|
| `casio-dw5600rl-1` | DW-5600RL-1ER | `B0DN6LT6FX` | https://leboncadran.fr/montre/casio-the-origin-dw-5600rl-1er | https://www.clubpromos.fr/threads/montre-casio-g-shock-dw-5600rl-1er-51-46%E2%82%AC-au-lieu-de-89%E2%82%AC-amazon.179585/ |
| `tissot-le-locle-white` | T0064071103300 | `B01N7FXE80` | https://leboncadran.fr/montre/tissot-le-locle-automatique-t0064071103300 | https://www.vivre-riche.com/avis-montre-tissot-le-locle-powermatic-80-elegance-et-precision |

La redirection Amazon.fr du comparateur aboutit à `/dp/<ASIN>`; les documents tiers relient la référence fabricant à ce même ASIN. **Les pages Amazon.fr n'ont pas pu être inspectées directement de façon stable** au moment de la vérification. Leur disponibilité commerciale actuelle reste donc `not_verified`. Le site indique la variante régionale et demande de vérifier la référence, les options, le vendeur et les conditions sur Amazon.fr.

### Contraintes appliquées

- Aucune promotion à partir d'une simple ressemblance visuelle ou d'un code famille.
- Aucun prix, commentaire, note client, stock ou livraison fournisseur importé d'un comparateur.
- Aucune modification des URL ou ASIN historiques, ni des preuves de licence photo.
- La liste publique de télémétrie `site/analytics.js` est synchronisée avec les 25 correspondances du registre, contrôlée en CI. Il s'agit de **clics d'intention**, pas de ventes ni de commissions.
- La publication échoue si le modèle, le code fabricant, l'ASIN, le domaine de comparaison ou la corroboration s'écartent des preuves déclarées.
- Le paiement sur le site reste inactif : l'achat externe est finalisé chez le marchand.

## Candidats non publiés

| Identifiant | ASIN candidat | Blocage |
|---|---|---|
| `seiko-5-srpk29` | `B0C3W82YW5` | Référence SRPK29K1 et lien Amazon.fr corroborés, mais le comparateur indiquait **Amazon indisponible** lors de la vérification. Ne pas substituer une fiche réputée indisponible à une recherche honnête. |
| `citizen-promaster-bn0150` | `B00R7PSW38` | ASIN/model concordants dans deux sources indépendantes, mais aucune redirection Amazon.fr actuelle vers une fiche de modèle exacte n'a été contrôlée. |
| `skmei-2056` | `B0C7W5NNX2` | Variante SKM-2056F01 transparente blanche identifiée et indisponible au contrôle précédent. |
| `tissot-gentleman-auto` | `B07XTVQ3W7` | Sources secondaires seulement ; aucune fiche Amazon.fr confirmée. |

Les fiches non publiées demeurent dans `research/amazon-fr-popular-asin-candidates.json` et ne peuvent être activées par le générateur de pages.

## Vérification de la mise à jour

Contrôles de sources, SEO et commerce dans `npm test` / `node scripts/validate-seo.mjs`, puis Playwright sur le catalogue pour contrôler chaque URL et la bonne présentation des incertitudes. Vérifications WCAG, mobile et Lighthouse de la version réellement publiée dans GitHub Actions et Render après fusion.
