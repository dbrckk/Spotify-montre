# Recherche multicritère du catalogue — 31 octobre 2026

## But
Trouver une **référence exacte** parmi les quinze montres d'Atelier Montres en combinant les caractéristiques réellement enregistrées dans `site/selection-affiliation.json`. L'interface conserve les filtres de gamme, maison, type de mouvement et diamètre documenté, la comparaison de trois modèles, les favoris et les liens partageables. Aucun prix ou stock n'est inventé et aucun appel à un moteur externe n'est ajouté.

## Recherches concrètes

| Texte | Références documentées |
| --- | --- |
| `saphir 40 mm` | Citizen Tsuyosa NJ0150-81X, Tissot PRX Quartz T1374101104100, Tissot PRX Powermatic 80 T1374071104100 |
| `Seiko 42,5 Hardlex` | Seiko 5 Sports SRPD55 |
| `casio 20 bar` | Casio MDV-107-1A1V |
| `T1374101104100` | Tissot PRX Quartz, même sans ponctuation |
| `casio MTP-B145` | Casio MTP-B145D-2A2V |
| `Seiko 20bar` | **Aucun résultat** : cette étanchéité n'est pas documentée pour une Seiko dans la sélection |

Le texte est normalisé sans distinction d'accents ni de casse, avec prise en compte de `42,5 mm` et `42.5mm`, ou de `20bar` et `20 bar`. Tous les termes doivent être présents dans les champs de la même montre (sauf pour la reconnaissance directe d'un code de modèle). Aucun résultat n'est créé pour une caractéristique qui n'existe pas dans les fiches.

## Sources et code

- `site/affiliation.js` indexe localement les champs texte, les vrais codes fabricant, les catégories, les faits éditoriaux et les spécifications vérifiées (`specs.movement`, `diameter`, `caseSize`, `glass`, `waterResistance`).
- `site/affiliation.html` présente une aide accessible et un clavier de recherche sur Android, limité à 100 caractères sans envoyer le texte à un serveur.
- `site/horlogerie.css` ajoute seulement une ligne d'aide discrète.
- `scripts/test-mobile-storefront-v8.mjs` vérifie les résultats concrets avec Chromium Android, le reset sans résultat et les interactions non affectées.

Les pages SEO canoniques existantes ne changent pas. La recherche n'ouvre aucune page supplémentaire susceptible de diluer le référencement. La vérification des droits photographiques reste indépendante de la qualité des caractéristiques techniques.
