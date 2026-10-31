# Extension commerciale documentée : 52 montres — 31 octobre 2026

## Périmètre livré

15 montres photographiées existantes + 37 montres complémentaires documentées = **52 références distinctes**. Le catalogue complémentaire passe de 30 à 37, avec 7 nouvelles pages indexables, et le sitemap généré de 60 à **67 URL**, sous réserve que la compilation et la publication réussissent.

Les trois gammes **Essentielle**, **Signature** et **Prestige** sont conservées. La première mise à jour cible les lacunes : heure mondiale, acier minimaliste accessible, cadran texturé en 36 mm, chronographe en acier, automatique compacte, montre-bijou féminine et modèle cuir féminin. Les signaux commerciaux reflètent les sélections propres à chaque vendeur, **pas** des volumes Amazon ou une liste des meilleures ventes françaises.

| Référence | Segment | Origine des caractéristiques | Nature du signal |
|---|---|---|---|
| Casio AE-1200WH-1AV | Digital rétro / heure mondiale | https://www.casio.com/fr/watches/casio/product.AE-1200WH-1AV/ | Choix éditorial |
| ADDIESDIVE AD2030 | Quartz VH31/VH60, acier 36 mm, cadran texturé | https://www.addiesdivewatches.com/products/new-addiesdive-36mm-quartz-watch-vh31-movement-ad2030 | Choix éditorial |
| Pagani Design PD-1701 | Chronographe VK63 acier / saphir | https://www.paganidesignwatch.com/fr/pagani-design-pd-1701/ | Sélection chronographes du vendeur https://www.paganidesignwatch.com/fr/ |
| Pagani Design PD-1751 | Automatique NH35 compacte | https://www.paganidesignwatch.com/fr/pagani-design-pd-1751 | Sélection hommage du vendeur https://www.paganidesignwatch.com/fr/ |
| Pagani Design PD-1776 | Quartz féminin 32 mm | https://www.paganidesignwatch.com/fr/pagani-design-pd-1776 | Sélection quartz du vendeur https://www.paganidesignwatch.com/fr/ |
| Curren CUR210 | Cuir et cadran cœur femme | https://www.currenwatches.com/products/curren-womens-blanche-heart-watch-dial-3-3cm-cur210 | Best Seller annoncé par https://www.currenwatches.com/pages/women-watches |
| SKMEI 2256 | Quartz acier minimaliste 42 mm | https://www.shopskmei.com/product/skmei-2256-minimalist-steel-quartz-watch/ | Modèle affiché parmi les produits populaires de https://www.shopskmei.com/ |

## Parcours commercial

- Références mises en avant sur l’accueil : G-SHOCK GW-M5610U-1, SKMEI 2056, SKMEI 2256, Curren CUR210, Pagani PD-1776, Casio F-91W, ADDIESDIVE AD2030 et Pagani PD-1701.
- **3 références complémentaires** seulement possèdent un ASIN Amazon.fr documenté et explicitement associé au modèle exact. Les **34 autres** conservent une recherche Amazon.fr avec le tag `drackk04-21` et un libellé « Rechercher ».
- Tous les liens Amazon portent `rel="sponsored nofollow noopener noreferrer"`. Prix, stock et avis non vérifiés ne sont ni affichés ni intégrés aux données structurées.
- Les nouveaux visuels ne sont **pas** récupérés ni republiés sans droits, conformément à la politique `popular-photo-rights.json`. Les vrais packshots sont consultables depuis la fiche du fabricant ou distributeur. L'ajout de droits d'usage commercial serait la prochaine amélioration visuelle à plus fort impact.

## Exigences de validation

```sh
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
npm test
npm run lint
```

Le test Android/Playwright associé à la collection doit vérifier 37 cartes (34 liens de recherche, 3 directs), les filtres, le retour sans JavaScript, les pages détails, l’absence de débordement et les URL de destination. Les contrôles stricts de droits d’images et de correspondance ASIN sont maintenus.

## Priorités suivantes

1. Vérifier les ASIN et offres **exactes et actuelles** sur Amazon.fr, sans supposer que les références sont disponibles.
2. Obtenir des photos officielles réutilisables **et une autorisation écrite** pour chacune des nouveautés avant d'ajouter les packshots.
3. Ajouter des comparaisons par usages (femme budget, quartz acier, digital rétro) uniquement lorsque les sources sont suffisantes.
4. Mesurer clics sortants et commandes éligibles via rapports Amazon; ajuster la mise en avant sur des résultats observés, non des ventes inventées.

**Statut :** contenu ajouté sur branche de travail; la publication dépend des contrôles CI, de la fusion puis du déploiement.
