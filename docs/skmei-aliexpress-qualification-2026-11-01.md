# Qualification commerciale AliExpress — SKMEI 2056, 2256 et 2514
Date de recherche : **1er novembre 2026**. Vitrine de référence : https://atelier-montres-selection-fr.onrender.com/

## Décision de publication

**Quatre identifiants AliExpress candidats et zéro offre AliExpress activée.** Les quatre produits ne sont documentés ici que par des instantanés historiques de comparateurs de prix datant de **septembre 2026**. Leurs URL de catalogue peuvent avoir changé, et l'identité de la variante, les conditions de livraison vers la France et l'éligibilité de chaque article à Awin **n'ont pas été confirmées sur la fiche primaire AliExpress**. Aucun prix ou stock issu de ces instantanés n'est affiché sur Atelier Montres.

| Modèle | ID AliExpress repéré | Source datée | Statut |
| --- | --- | --- | --- |
| SKMEI 2056 | `1005007793914474` | https://fr.pricearchive.org/aliexpress.com/item/1005007793914474 — 11 septembre 2026 | Titre regroupant également « 1123 » ; variante exacte inconnue |
| SKMEI 2056 | `1005008144767722` | https://fr.pricearchive.org/aliexpress.com/item/1005008144767722 — 11 septembre 2026 | Titre mentionnant aussi « 1412 » ; variante exacte inconnue |
| SKMEI 2514 | `1005010347756069` | https://ms.pricearchive.org/aliexpress.com/item/1005010347756069 — 14 septembre 2026 | Référence 2514 dans un index tiers ; variante exacte inconnue |
| SKMEI 2514 | `1005010503818361` | https://pt.pricearchive.org/aliexpress.com/item/1005010503818361 — 20 septembre 2026 | Référence 2514 dans un index tiers ; variante exacte inconnue |
| SKMEI 2256 | Aucune référence suffisamment identifiée | https://www.shopskmei.com/product/skmei-2256-minimalist-steel-quartz-watch/ | Rester sur la fiche fabricant/vendeur tant qu'aucune référence AliExpress exacte n'est établie |

Un index tiers francophone de montres AliExpress, https://fr.watchpricelog.com/marca/skmei, affichait récemment des références **SKMEI 2056** et **2514** et des indications de livraison vers la France. Il s'agit de données **rapportées par un agrégateur**, pas d'un contrôle d'achat, de vendeur, de stock ou de ventes certifiées. Ne pas recopier les nombres de ventes, la note ou le prix comme faits confirmés. **Aucun chiffre de commission ne peut en être déduit.**

## Données source et verrou de sécurité

- `research/aliexpress-skmei-candidates.json` constitue le registre des **pistes seulement**. Les quatre identifiants y sont `third_party_index_only` avec `review:null`.
- `scripts/aliexpress-skmei-research.mjs` vérifie l'identité de chaque modèle, la traçabilité URL ↔ ID, les dates, les doublons et les états de revue.
- `scripts/approved-partner-offers.mjs` refuse désormais un lien Awin AliExpress **même avec identifiant éditeur, annonceur et URL Awin cohérents** si l'item ne figure pas dans notre registre **avec une revue primaire explicite récente**.
- Le statut `merchant_reviewed_exact_variant_fr` exige un objet `review` décrivant : date de contrôle de moins de 30 jours, modèle et variante exacts, nom du vendeur, page AliExpress de l'item, preuve de livraison et passage en caisse France, éligibilité du produit à la campagne Awin et note d'évidence. Les champs sont **des attestations éditoriales à justifier**, pas une preuve cryptographique indépendante de stock ou d'éligibilité. Les documents doivent être contrôlés avant publication.
- Un lien rémunéré exige **en plus** l'approbation du compte Awin, l'acceptation de l'annonceur 26009 et un vrai lien LinkBuilder généré par le compte éditeur, avec destination égale à l'item confirmé et à la variante vérifiée. L'URL `ued` ne doit pas être une recherche générique.

## Processus de qualification depuis Android

1. Ouvrir l'item AliExpress en allant directement à `https://www.aliexpress.com/item/<identifiant>.html`, utiliser la livraison **France**, puis vérifier le vrai titre, la référence, le **SKU de la variante sélectionnée**, le stock, le total TTC et les conditions de retour au passage en caisse. Aucun achat n'est nécessaire pour ce contrôle.
2. Conserver le lien de la fiche et une capture ou preuve datée de ces éléments (sans informations de compte ou de paiement). Si l'item vend plusieurs modèles SKMEI, vérifier la variante du bouton de commande, pas seulement un titre contenant « 2056 » ou « 2514 ».
3. Vérifier dans le compte Awin que l'item est **éligible** au programme AliExpress FR, approuvé pour notre site. Construire **dans Awin LinkBuilder** l'URL réelle liée à l'identifiant éditeur.
4. Mettre à jour le statut du candidat, la revue et l'URL rémunérée dans `research/partner-affiliate-offers.json` au sein d'une même PR ; lancer `npm test`, les contrôles SEO, le parcours Android et la vérification de production avant fusion. **Ne jamais publier de faux prix, fausse commission ou commande déléguée**.

## Vérification reproductible

```bash
npm run partner:status
npm test
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
```

Les tests positifs emploient une **copie temporaire** du registre dans laquelle une revue et un compte éditeur sont simulés, tandis que les données source et le site public restent désactivés. Aucun faux article ne doit être ajouté au registre de production pour satisfaire les tests.

**Priorité commerciale actuelle :** qualifier une variante **SKMEI 2056** en premier, puis une **2514**. Les deux apparaissent sur plusieurs sources tierces, mais ni ces observations ni une commission Awin indicative ne sont des résultats de vente pour Atelier Montres.
