# Atelier Montres — catalogue mobile : galerie photographique et fiches

## Objectif

Présenter les 15 références réelles plus clairement sur Android, sans réduire l'accès aux informations fabricant et sans inventer de prix, stock, image ou avis.

## Deux modes de navigation

- **Galerie** : par défaut sur les écrans au plus 620 px (deux colonnes entre 351 et 760 px), photographies du modèle exact, marque, modèle, mouvement et diamètre déclaré ou « Diamètre à vérifier ». Les liens de fiche, de photo officielle, d'Amazon, de favoris, de comparaison et d'analyse restent disponibles.
- **Détails** : la présentation éditoriale complète, avec récit, caractéristiques et cartes plus grandes. Elle est le mode initial sur ordinateur.
- L'utilisateur peut basculer à tout moment. Sa préférence est enregistrée localement dans `localStorage` sous `atelier-montres-catalogue-view-v1`. En cas de stockage bloqué, les commandes continuent de fonctionner pour la session courante.
- La grille ne disparaît jamais en cas d'échec de la préférence, les filtres et l'historique restent indépendants.

## Visuels et transparence commerciale

- Les 15 photographies sont des fichiers WebP locaux déclarés autorisés par l'éditeur. Les déclinaisons optimisées sont utilisées quand disponibles, avec un repli vers l'image principale. Ce document ne constitue **pas** une preuve indépendante de licence.
- En galerie, la photographie privilégie l'espace visuel ; le zoom conserve le contrôle d'agrandissement et les noms complets sont accessibles via les liens.
- La déclaration officielle Amazon **« En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises »** reste visible dans le bloc de transparence avant les cartes. Si le HTML historique ne l'affiche pas encore, le script commercial l'ajoute une fois.
- Tous les liens commissionnables sont individuellement nommés **« lien rémunéré »**, munis de `rel="nofollow sponsored"` et accompagnés d'une mention courte sur la carte. La déclaration intégrale n'est pas répétée sous chacune des 13 montres Amazon.
- Le bouton d'assistance devient circulaire sur Android ; son `aria-label` est conservé. Il s'efface temporairement lorsque le bandeau de comparaison s'affiche pour ne pas recouvrir les actions.

## Vérifications

- `scripts/test-mobile-storefront-v8.mjs` : bascule, deux colonnes Android, affichage détaillé une colonne, persistance après rechargement, aucune largeur excessive, 15 références exactes, lien rémunéré visible, déclaration officielle présente, photos, filtres, favoris, comparateur et assistant.
- `.github/workflows/test-premium-mobile.yml` : construit le site statique, lance Chromium/Playwright et conserve les captures Android et desktop.
- `scripts/validate-seo.mjs` : conserve les URL canoniques, contenus documentés, données structurées et protections d'affiliation.
- `.github/workflows/lighthouse-mobile.yml` : vérification séparée des performances simulées. Ne pas prétendre mesurer l'INP de terrain avec Lighthouse.
