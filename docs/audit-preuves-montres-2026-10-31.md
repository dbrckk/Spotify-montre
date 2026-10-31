# Audit des preuves : caractéristiques des montres et photographies

**Date :** 31 octobre 2026 · **Site :** Atelier Montres · **Source de vérité :** `site/selection-affiliation.json`.

Ce dossier distingue **deux validations indépendantes** :

1. **Spécifications produit :** les pages constructeur de références exactes ont été consultées pour les champs enregistrés dans `specReview.verifiedFields`. Les autres spécifications du catalogue n'ont pas été à nouveau recoupées dans cette opération.
2. **Droits photographiques :** le responsable du site a déclaré l'autorisation de publier les 15 images le 30 octobre 2026. **Aucun des 15 dossiers ne comporte une vérification indépendante de cette autorisation**, ni un document de licence ou de cession reproduit dans le dépôt. Le fait qu'une image provienne d'un fabricant ou d'un revendeur n'en autorise pas automatiquement la reproduction.

**Bilan technique :** 15 références exactes ; 5 modèles avec vérifications datées des caractéristiques ; 11 diamètres numériques enregistrés. Les largeurs de montres rectangulaires sont distinctes de ces diamètres. **Bilan photo :** 15 autorisations déclarées par le propriétaire, **0 autorisation vérifiée indépendamment**.

## Registre des sources et priorités

| Référence interne | Modèle | Hôte original de la photo | Examen des droits à compléter | Champs techniques recoupés |
| --- | --- | --- | --- | --- |
| `casio-mtp-1302` | MTP-1302PD-2A2V | www.casio.com | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `casio-mtp-b145` | MTP-B145D-2A2V | www.casio.com | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `casio-a168wa` | A168WA-1 | www.casio.com | Domaine de marque (droit à documenter) | [caseSize, glass](https://www.casio.com/fr/watches/casio/vintage/product.A168WA-1/) |
| `casio-mdv107` | MDV-107-1A1V | www.casio.com | Domaine de marque (droit à documenter) | [caseSize, glass, waterResistance](https://www.casio.com/fr/watches/casio/product.MDV-107-1A1V/) |
| `casio-ltp1302` | LTP-1302PD-7A1V | www.casio.com | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `swatch-clearly` | Clearly Gent SO28K100-S06 | www.watchit.ca | Tiers revendeur : preuve spécifique à obtenir | Non recoupé depuis une source exacte dans cette révision |
| `citizen-eco` | Eco-Drive AW0100-86EC | images.hbjo-online.com | Tiers revendeur : preuve spécifique à obtenir | Non recoupé depuis une source exacte dans cette révision |
| `citizen-openheart` | NH9131-73L Open Heart | fr.citizenwatch.eu | Domaine de marque (droit à documenter) | [movement, glass, waterResistance](https://fr.citizenwatch.eu/fr/p/nh9131-73l/) |
| `citizen-tsuyosa` | Tsuyosa NJ0150-81X | fr.citizenwatch.eu | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `orient-bambino` | Bambino 38 RA-AC0M12L | i8.amplience.net | CDN : rattachement au fabricant à confirmer | Non recoupé depuis une source exacte dans cette révision |
| `seiko-5` | 5 Sports SRPD55 | www.seikowatches.com | Domaine de marque (droit à documenter) | [diameter, movement, glass, waterResistance](https://www.seikowatches.com/fr-fr/products/5sports/srpd55) |
| `tissot-prx-quartz` | PRX Quartz T1374101104100 | www.tissotwatches.com | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `tissot-prx-auto` | PRX Powermatic 80 T1374071104100 | www.tissotwatches.com | Domaine de marque (droit à documenter) | Non recoupé depuis une source exacte dans cette révision |
| `hamilton-khaki` | Khaki Field Auto H70455133 | www.lepage.fr | Tiers revendeur : preuve spécifique à obtenir | Non recoupé depuis une source exacte dans cette révision |
| `seiko-sharp` | Presage Sharp Edged SPB165 | www.seikowatches.com | Domaine de marque (droit à documenter) | [diameter, movement, glass, waterResistance](https://www.seikowatches.com/uk-en/products/presage/spb165j1) |

### Informations et ambiguïtés documentées

- **Casio A168WA-1** : la marque fournit la taille **L × l × H** (38,6 × 36,3 × 9,6 mm), non un diamètre. Sa mention d'étanchéité sans bar chiffré n'est pas transformée en indice.
- **Casio MDV-107-1A1V** : taille L × l × H (49,5 × 44,2 × 12,1 mm), verre minéral et 20 bar. La largeur du boîtier n'est pas publiée comme diamètre.
- **Citizen NH9131-73L** : mouvement 8229, verre cristal, 5 bar. Le fabricant mentionne 40 mm dans le texte et « 38 mm, 40 mm » dans la liste des mesures. Aucun diamètre unique n'a été imposé.
- **Seiko SRPD55** : calibre 4R36, **42,5 mm**, verre Hardlex et 10 bar. Cette fiche concerne la référence SRPD55, pas la variante de bracelet SRPD55K2.
- **Seiko Presage SPB165** : calibre 6R35, **39,3 mm**, saphir antireflet et 10 bar ; lien vers une fiche Seiko correspondant au modèle exact.

### Preuves photographiques à compléter

L'origine des octets et la somme SHA-256 garantissent la **traçabilité technique des fichiers**, pas la propriété intellectuelle. Les domaines `watchit.ca` (Swatch), `images.hbjo-online.com` (Citizen Eco-Drive), `lepage.fr` (Hamilton) et le CDN `i8.amplience.net` (Orient) exigent une attention particulière sur la chaîne de provenance. L'origine de l'image ne prouve aucune licence.

Pour obtenir une preuve exploitable, conserver pour chaque image : identité du titulaire des droits, référence exacte du visuel, licence écrite et portée (site, publicité, réseaux sociaux, durée, pays), date d'autorisation et fichier de preuve privé. **Ne pas enregistrer des documents contenant des identités ou contrats privés dans un dépôt GitHub public.**

### Contrôle reproductible

- Les champs publiés ont une référence de source dans `specReview.sourceUrl`, une date `verifiedOn` et une liste explicite `verifiedFields`.
- `scripts/validate-seo.mjs` empêche un contrôle constructeur sans champ enregistré, une source qui ne correspond pas à la fiche produit et les faux diamètres issus de L × l × H.
- `scripts/validate-photo-review.mjs` confirme le statut **déclaré et non vérifié indépendamment** des permissions. Les contrôles WebP comparent également les hash des fichiers locaux.
- Les pages canoniques et interactives distinguent les caractéristiques recoupées des autres données et proposent le lien du fabricant. Aucun lien ne doit inventer un prix, un stock, une note ou un contrat de droits.
