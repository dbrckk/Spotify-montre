# Parcours mobile — recherche → fiche → comparaison → résultats

**Date :** 31 octobre 2026 · **Branche :** `main` · **Site :** https://atelier-montres-selection-fr.onrender.com/

## Contrat fonctionnel

Un visiteur peut filtrer le catalogue des 15 montres par gamme, marque, mouvement, diamètre documenté, recherche multicritère et ordre de tri. Quand il ouvre une fiche interactive, les critères **effectivement sélectionnés** sont transportés dans un paramètre `from` de l'URL de la montre.

Exemple lisible :

`/montre.html?id=tissot-prx-auto&from=tier%3Dprestige%26brand%3DTissot%26movement%3Dautomatic%26diameter%3Dmedium%26q%3DPRX%26sort%3Dname`

La fiche propose **« Retour à ma sélection »**, au-dessus du titre, qui retourne à `/affiliation.html` avec les mêmes paramètres et l'ancre `#montres`. Le fil d'Ariane « Collection » mène au même état. Les modèles voisins et les trois suggestions conservent ce contexte. En cas d'accès direct, le lien devient **« Retour au catalogue »** sans paramètres.

La liste de comparaison transporte également les critères et ses propres identifiants `compare` (maximum trois montres). La navigation existante reste compatible avec le stockage de la comparaison dans `sessionStorage`.

Le partage d'une **fiche individuelle** reste **propre et sans trace de navigation** : seulement `/montre.html?id=<id>`. Le partage d'une **sélection** comprend désormais le filtre de diamètre `diameter=compact|medium|unknown` et les deux tris par diamètre, en plus de la gamme, marque, mouvement, recherche et ordre. Les pages SEO canoniques restent inchangées.

## Sécurité, vie privée, performances

- Pas de compte utilisateur, de cookies, de transmission serveur de filtres, ni de dépendance JavaScript supplémentaire.
- `from` est borné à **400 caractères** et reconstruit via une liste fermée de clés et de valeurs valides ; il ne peut pas fournir d'URL de redirection, ni de domaine externe.
- La marque est vérifiée contre les marques du catalogue réellement chargé. La recherche `q` est limitée à 100 caractères.
- Aucun prix, stock, avis, photographie ou droit d'auteur n'est ajouté ou inventé.
- La visionneuse, les favoris et les liens fabricants restent indépendants du contexte de retour.

## Contrôles de non-régression

Le navigateur Chromium Android (`scripts/test-selection-share.mjs`) vérifie dans un même parcours :

1. Les six critères d'une sélection Tissot PRX (gamme, maison, mouvement, diamètre, recherche, tri).
2. Le partage natif et la réouverture du lien filtré.
3. L'ouverture de la fiche exacte avec `from`, le retour et le fil d'Ariane.
4. Le lien de comparaison portant à la fois la montre choisie et le diamètre filtré.
5. Le partage d'une fiche **sans** ses critères privés de navigation.
6. La visite d'un modèle proche, puis le retour à **l'unique résultat d'origine**.
7. Le retrait d'un filtre et l'effacement total, sans modifier les autres critères.

Le workflow `Validate shared watch selections on Android` exécute les tests locaux sans coûts de services externes. `Validate premium mobile catalogue interactions` les inclut avant publication. `Verify production Render watch storefront on Android` attend les **octets exacts** de `selection-share.js`, `affiliation.js`, `fiche.js` et des styles publiés avant de vérifier le site public.

## Fichiers

- `site/affiliation.js` : encodage des critères de la sélection dans les liens produit.
- `site/fiche.js` : validation de `from`, construction sûre du retour, maintien des liens vers les autres modèles et la comparaison.
- `site/montre.html`, `site/fiche.css` : lien accessible de retour au-dessus du nom de la montre.
- `site/selection-share.js` : ajout du diamètre et des ordres de tri par diamètre dans le partage et sa restauration.
- `scripts/test-selection-share.mjs` : vérification du trajet complet en navigateur Android.
- `scripts/test-mobile-live-storefront.mjs` : la mesure du bloc photo SEO attend l'application réelle du CSS mobile, pour éviter une fausse régression sur une page encore non stylée.

**Limite restante :** la comparaison entre quatre montres reste limitée à trois références. Le bandeau existant explique la limite au moment de la sélection ; ne pas remplacer silencieusement une montre enregistrée.
