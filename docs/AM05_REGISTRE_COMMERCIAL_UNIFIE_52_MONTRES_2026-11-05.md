# AM-05 — Registre commercial unique des 52 montres

## Objectif

Éviter qu'un même modèle soit présenté différemment dans les fiches, la sélection éditoriale, les comparateurs et les liens marchands. Le registre **n'est pas un stock**, un catalogue de commandes CJ ou un tableau de commissions : il fusionne les **preuves techniques et documentaires déjà présentes** dans Git.

## Source et génération

La commande `node scripts/build-seo.mjs` reconstruit `site/commercial-registry.json` à partir de :

- `site/selection-affiliation.json` : **15 références principales** et sources vendeur/fabricant.
- `site/selection-populaires.json` : **37 références complémentaires**.
- `research/amazon-fr-exact-products.json` : **13 ASIN historiques identifiés**, dernier contrôle du 30/10/2026.
- `research/amazon-fr-popular-verified.json` : **10 ASIN complémentaires**, preuves datées distinctes.
- `site/affiliate-links.json` et le validateur d'affiliation : liens balisés autorisés, **sans validation présumée du compte Amazon**.
- `site/popular-photo-rights.json` et les déclarations documentaires des 15 modèles historiques : photographies publiques, nature du droit allégué, absence de preuve indépendante le cas échéant.
- `research/partner-affiliate-offers.json` et le validateur Awin : publication uniquement après approbation du compte et du lien exact.
- `site/catalogue.json` : 0 SKU de vente directe. Si de nouveaux SKU sont ajoutés, la génération échoue jusqu'à intégration de leur véritable qualification fournisseur plutôt que de les traiter comme des références affiliées.

Les 52 lignes comportent : ID exact, marque/modèle, source vendeur, ASIN éventuel, date de rapprochement, statut de disponibilité **historique**, disponibilité **actuelle non vérifiée**, URL rémunérée réellement activée, type de voie marchande, statut photo, non-éligibilité actuelle à l'encaissement direct et absence de preuve de commission réglée.

## États réellement documentés à cette étape

| Indicateur | Valeur | Interprétation |
|---|---:|---|
| Modèles éditoriaux | 52 | 15 + 37, sans doublon |
| ASIN identifiés | 23 | Correspondances documentaires, **pas stocks garantis** |
| Liens Amazon exacts balisés | 23 | Si mode d'affiliation autorisé ; 0 si désactivé |
| Anciennes observations « indisponible » | 4 | Contrôles du 30/10 uniquement |
| Autres modèles sans ASIN | 29 | Conservent leur source fabricant/vendeur ; certaines recherches Amazon peuvent rester disponibles séparément |
| Liens Awin éligibles à publication | 0 | Compte éditeur et offres partenaires non activés dans le registre actuel |
| SKU qualifiés en vente directe | 0 | Devis CJ, paiement et obligations vendeur non validés |
| Commissions réellement prouvées | Aucune | Un clic sortant n'est jamais une commande attribuée |

La disponibilité actuelle, la livraison en France, les frais, le prix TTC et les commissions restent à vérifier sur les systèmes officiels.

## Consommateurs du registre

1. La génération de la **liste prioritaire** vérifie le même statut photo, lien Amazon exact et Awin que ses propres liens publiés.
2. La **grille des 52 références** utilise cette source pour toutes ses sorties Amazon exactes et affiche un état commercial par montre (ASIN documenté, source vendeur seule, ancienne indisponibilité).
3. Les contrôles SEO refusent tout décalage entre le registre public, les sources Amazon datées, les 52 cartes et la collection utilisée par le conseiller.
4. Les tests d'intégration vérifient la configuration sans affiliation : les 23 ASIN restent documentés mais **aucun des 52 modèles ne peut générer de lien Amazon rémunéré** dans cette configuration.

## Travaux suivants

- Réemployer ce registre lors des révisions du conseiller et des fiches individuelles ; garder les preuves de variantes et permissions actuelles dans leurs modules de référence.
- Examiner le compte Amazon Partenaires et les rapports de commissions par les procédures officielles ; cela ne se déduit pas de GitHub.
- Obtenir le devis complet d'un SKU CJ et confirmer les obligations d'importation, livraison et marge avant d'autoriser le paiement direct.
- Rapprocher les chemins de sortie marchands des 52 fiches lors de contrôles datés, sans robots d'achat et sans fausses données temps réel.
