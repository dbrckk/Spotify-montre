# Amazon.fr — liens exacts des 15 montres (30 octobre 2026)

**Source** : `site/selection-affiliation.json` (15 références), contrôle individuel de chaque ASIN par lecture de la fiche Amazon.fr correspondante.

**Tracking ID communiqué** : `drackk04-21`.

**Résultat : 13 fiches correspondant aux modèles du catalogue sur Amazon.fr, 2 sans ASIN français exact confirmé.** Les versions régionales avec suffixe E/F/J1 ont été contrôlées à partir des numéros de modèle publiés sur les fiches, et non simplement déduites du titre de la recherche.

Le lien reconstruit a le format `https://www.amazon.fr/dp/ASIN?tag=drackk04-21`. Il pointe sur la **fiche de produit exacte** et non une recherche générale. Son bon fonctionnement commercial dépend toujours de l'éligibilité du compte Partenaires, de l'utilisation autorisée du lien spécial et de l'éligibilité de la commande. Le moteur de recherche ne prouve pas une vente ni une commission réelle.

| Nº | Référence dans Atelier Montres | Lien reconstruit ou source officielle | Résultat |
|---:|---|---|---|
| 1 | Casio MTP-1302PD-2A2V | [B0BRPD1FTX](https://www.amazon.fr/dp/B0BRPD1FTX?tag=drackk04-21) | Fiche Amazon indisponible lors du contrôle |
| 2 | Casio MTP-B145D-2A2V | [B0CJRNV2XS](https://www.amazon.fr/dp/B0CJRNV2XS?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 3 | Casio A168WA-1 | [B01D6XLV5A](https://www.amazon.fr/dp/B01D6XLV5A?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 4 | Casio MDV-107-1A1V | [B09TV2TZY9](https://www.amazon.fr/dp/B09TV2TZY9?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 5 | Casio LTP-1302PD-7A1V | [B0039UT5HC](https://www.amazon.fr/dp/B0039UT5HC?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 6 | Swatch Clearly Gent SO28K100-S06 | [B0C3WQ8YXJ](https://www.amazon.fr/dp/B0C3WQ8YXJ?tag=drackk04-21) | Fiche Amazon indisponible lors du contrôle |
| 7 | Citizen Eco-Drive AW0100-86EC | [Fiche officielle](https://fr.citizenwatch.eu/fr/p/aw0100-86ec/) | Amazon.fr non confirmé |
| 8 | Citizen NH9131-73L Open Heart | [B0CSPHFBY4](https://www.amazon.fr/dp/B0CSPHFBY4?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 9 | Citizen Tsuyosa NJ0150-81X | [B0BG7VD5YL](https://www.amazon.fr/dp/B0BG7VD5YL?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 10 | Orient Bambino 38 RA-AC0M12L | [B0DR39WLP9](https://www.amazon.fr/dp/B0DR39WLP9?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 11 | Seiko 5 Sports SRPD55 | [B07WGML3VN](https://www.amazon.fr/dp/B07WGML3VN?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 12 | Tissot PRX Quartz T1374101104100 | [B08TB1MF6F](https://www.amazon.fr/dp/B08TB1MF6F?tag=drackk04-21) | Fiche Amazon indisponible lors du contrôle |
| 13 | Tissot PRX Powermatic 80 T1374071104100 | [Fiche officielle](https://www.tissotwatches.com/fr-fr/T1374071104100.html) | Amazon.fr non confirmé |
| 14 | Hamilton Khaki Field Auto H70455133 | [B001QT1LWK](https://www.amazon.fr/dp/B001QT1LWK?tag=drackk04-21) | ASIN vérifié sur Amazon.fr |
| 15 | Seiko Presage Sharp Edged SPB165 | [B08HR9PC4K](https://www.amazon.fr/dp/B08HR9PC4K?tag=drackk04-21) | Fiche Amazon indisponible lors du contrôle |

## Interprétation des résultats
- Les mentions **« indisponible lors du contrôle »** indiquent une page produit existante, mais sans offre accessible au moment de la recherche. Ces liens peuvent rester utiles pour identifier le produit, pas pour promettre un achat immédiat.
- Citizen Eco-Drive `AW0100-86EC` : une fiche Amazon pour `AW0100-86EE` a été trouvée, **mais ce n'est pas le même suffixe** ; elle n'est pas associée au catalogue sans preuve d'équivalence.
- Tissot PRX Powermatic 80 `T1374071104100` : des annonces sur Amazon UK/US/NL existent, mais aucun ASIN Amazon.fr confirmé ; elles ne sont pas automatiquement transposées.
- Ne jamais inventer de stock, prix, taux de commission, avis clients ni compatibilité de produit.
- En dehors du programme Partenaires, les liens Amazon avec `tag` ne constituent pas une preuve d'achat rémunéré. Les exigences Amazon imposent une **mention visible** et la déclaration « En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises » quand le site utilise des liens rémunérés.

## Intégration au site
- Répertoire source contrôlé : `research/amazon-fr-exact-products.json` ; les 13 liens sont prêts et un enregistrement explicite protège les 2 manquants.
- `npm run amazon:links` : affiche la liste exacte au format Markdown.
- `node scripts/check-amazon-exact-links.mjs` : vérifie tous les IDs, formats d'ASIN, destinations Amazon.fr, tag, variantes et l'absence d'activation commerciale sans accord.
- **`site/affiliate-links.json` reste désactivé** : le dépôt exige le statut Partenaires, le droit d'exploitation des images de montres et une validation des liens spéciaux, et le présent travail ne prétend pas confirmer ces justificatifs.
- Le futur parcours affilié doit **envoyer vers Amazon** pour finaliser le paiement. Une vente encaissée directement par Atelier Montres exigera sa propre activité de marchand et ne déclenchera pas de commission Amazon Partenaires classique.

Contrat technique : `scripts/affiliate-policy.mjs`. Conditions officielles : https://partenaires.amazon.fr/help/operating/policies .
