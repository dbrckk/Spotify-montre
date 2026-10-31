# Comparateur — remplacement direct dans le tableau

**Produit :** Atelier Montres · **Dépôt :** `dbrckk/Spotify-montre` · **Date :** 31 octobre 2026

## Problème supprimé

Le comparateur permet déjà de choisir jusqu'à **trois montres** et de remplacer un emplacement en cochant une quatrième montre. En revanche, le visiteur qui consulte le tableau ou les cartes horizontales devait auparavant **fermer le comparateur**, chercher un modèle dans le catalogue et le cocher pour modifier sa sélection.

## Fonctionnement livré

- Dans le **tableau desktop**, chaque colonne de montre possède un sélecteur natif « Changer cette montre » immédiatement sous le modèle.
- Dans le **comparatif Android**, le sélecteur se trouve sur chaque carte, sous le titre et la photographie, avant les caractéristiques.
- Le visiteur choisit une autre des **15 références exactes** sans fermer la fenêtre. Le mouvement, les dimensions, le verre, l'étanchéité et les photos sont immédiatement recalculés à partir de `site/selection-affiliation.json`.
- Les montres déjà sélectionnées dans les autres emplacements sont **désactivées** dans le sélecteur : pas de doublon ni de suppression involontaire.
- Seul l'emplacement choisi est remplacé. Les autres montres gardent leur ordre, comme dans le remplacement à trois emplacements déjà disponible depuis le catalogue.
- La nouvelle sélection est synchronisée avec les cases à cocher, le bandeau fixe, `sessionStorage` et le paramètre `compare` de l'URL si le lien est partagé.
- Sur mobile, la carte modifiée reste active dans le carrousel, et son contrôle récupère le focus. Le composant natif propose une cible tactile d'au moins 44 px, adaptée au clavier et aux lecteurs d'écran.
- Prix, stock, notes, commissions et valeurs techniques non documentées ne sont ni ajoutés ni estimés.

## Limites et compatibilité

La sélection reste plafonnée à trois modèles ; la fenêtre de remplacement à trois choix est conservée pour l'ajout d'une quatrième montre. Les pages produits conservent le retour vers le catalogue filtré et les fiches canoniques SEO ne changent pas. Aucun compte, cookie, service tiers ni dépendance nouvelle n'est nécessaire.

## Contrôles de version

`scripts/test-mobile-storefront-v8.mjs` contrôle les points suivants au moyen de vrais navigateurs Playwright :

1. Sur Android : une comparaison à deux modèles, le contrôle « Changer cette montre » et une option déjà occupée rendue indisponible.
2. Remplacement du deuxième modèle par la Seiko 5 : le premier reste inchangé, les faits affichent **42,5 mm**, la seconde carte reste active, la fenêtre reste ouverte et la case à cocher correspondante est mise à jour.
3. Rechargement : les deux nouveaux identifiants restent enregistrés.
4. Desktop : remplacement depuis la première colonne par la Seiko Presage et actualisation de **39,3 mm**, sans fermeture du tableau.
5. Pas de régression des parcours de comparaison, favoris, liens de fiches, zoom, partage et recherche.

Les workflows `Validate premium mobile catalogue interactions` et `Verify production Render watch storefront on Android` vérifient respectivement le code source et le site public. La seconde vérification attend le contenu exact des ressources CSS/JS sur Render pour éviter les faux résultats provoqués par un ancien déploiement.
