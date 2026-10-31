# Comparateur de montres — filtrer les différences (31 octobre 2026)

## Livré
Le comparateur de 2 ou 3 références propose le compteur « X critères différents sur 5 » et un bouton « Différences uniquement ». Les cinq critères issus du catalogue sont : gamme, mouvement, taille du boîtier, verre et étanchéité. Les informations non documentées restent affichées « À vérifier ».

- Le filtre agit simultanément sur les lignes du tableau desktop et les cartes mobiles, tout en laissant les liens vers les fiches accessibles.
- Le filtre reste actif lors du remplacement d'une référence dans la modale ; son état est annoncé par `aria-pressed`. Il est désactivé quand aucun critère ne diffère.
- Les en-têtes du tableau sont balisés via `scope=col` et `scope=row`. Un titre de tableau et un résumé `role=status` sont accessibles aux lecteurs d'écran.
- Sur Android : bouton tactile d'au moins 44 px, polices agrandies, guide d'utilisation des flèches et navigation avec les touches du clavier.
- Animations du rail supprimées si `prefers-reduced-motion` est actif.
- Les photos et valeurs fabricant sont préservées, sans prix, stock ni avis inventés.

## Vérifications avant publication
Le test `scripts/test-mobile-storefront-v8.mjs` couvre l'affichage des différences calculées, la restauration des cinq lignes, l'activation clavier, les en-têtes sémantiques et la conservation du filtre après remplacement.

La CI Playwright et les vérifications sur Render doivent réussir avant de déclarer le déploiement validé. La revue exhaustive WCAG 2.2 AA reste hors de portée de ces seuls contrôles.

## Interprétation des chiffres
Une différence entre « À vérifier » et une valeur connue reflète la documentation disponible, **pas une supériorité démontrée** de l'un des modèles.
