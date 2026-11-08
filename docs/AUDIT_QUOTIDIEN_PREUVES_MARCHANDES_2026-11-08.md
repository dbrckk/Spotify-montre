# Audit quotidien des preuves marchandes — Atelier Montres (08/11/2026)

## Pourquoi

Le catalogue contient 52 montres éditoriales. Les liens rémunérés Amazon.fr renvoient à des **ASIN documentés**, non à une offre avec prix ou stock certifié en temps réel. Les sources historiques perdent progressivement de leur valeur si les variantes et les destinations changent.

Le contrôle existant [Audit production SEO URLs](../.github/workflows/audit-live-seo.yml) est exécuté quotidiennement à `05:17 UTC` et peut aussi être lancé manuellement depuis GitHub Actions. Il vérifie déjà l'indexabilité, les 37 fiches complémentaires, le sitemap, des URL d'images et les indications commerciales. Cette évolution réutilise le workflow existant sans tâche payante supplémentaire.

## Ce qui est automatiquement contrôlé

- La cohérence des **27 correspondances ASIN actuellement documentées**, issues des deux registres source `research/amazon-fr-exact-products.json` et `research/amazon-fr-popular-verified.json`. Le nombre est calculé dynamiquement pour permettre des recherches futures.
- Le modèle de montre exact, un ASIN de format valide, l'absence de doublons entre registres, une date ISO réelle non future, et une présence dans les 52 modèles connus.
- L'**âge de la dernière preuve documentaire** et le seuil éditorial de **45 jours**, sans aucun rafraîchissement automatique de cette date. Une preuve ancienne apparaît dans une file de recontrôle, sans changer son statut commercial ni faire échouer le site.
- Pour les correspondances obtenues via **redirection de comparateur**, la présence dans les fiches publiques du modèle, de l'ASIN, des deux URL de corroboration, du panneau d'avertissement et de la feuille CSS mobile. Les deux liens restent éditoriaux et ne sont pas marqués `sponsored`.
- Une régression de publication, de HTML ou de lien documentaire constatée en production fait échouer **l'audit**. Le simple fait qu'une preuve dépasse 45 jours ne fait pas échouer la publication, car il ne s'agit pas d'une preuve de rupture de stock.

## Où consulter le résultat

Ouvrir le dernier run du workflow **Audit production SEO URLs** dans [GitHub Actions](https://github.com/dbrckk/Spotify-montre/actions/workflows/audit-live-seo.yml). L'onglet *Summary* indique le nombre d'ASIN documentés et les références à recontrôler. L'artefact `live-seo-audit` contient `artifacts/live-seo-audit.json`, notamment `sourceEvidenceReview.records` avec :

- `id`, `asin`, `collection` et `evidenceKind` ;
- `checkedOn` et `ageDays` ;
- `needsReview` et `dueCount` (file de revue).

Pour relancer le calcul purement documentaire, sans navigateur ni réseau :

```bash
node scripts/test-source-evidence-review.mjs
```

## Limites et actions

**Aucun code ne confirme le prix, le stock, la livraison, l'approbation finale Amazon Partenaires ou la commission.** Une page accessible, une fiche de fabricant ou un ancien ASIN sont des pistes de recherche, pas une offre achetable. Pour renouveler une date, il faut une nouvelle vérification humaine ou une preuve externe suffisamment solide datée, puis une modification du registre source et la validation GitHub CI.

Le paiement direct sur Atelier Montres reste désactivé en l'absence de fournisseur et de parcours de paiement réellement qualifiés.
