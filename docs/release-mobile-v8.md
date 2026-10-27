# Atelier Montres — Livraison V8 (27 octobre 2026)

## Nouvelle vitrine
https://hyped-logic-88n9yg5.shipstatic.com/

Le déploiement ShipStatic indique **success** : 49 éléments publiés, environ 1,66 Mo de site statique. Les **15 photographies WebP locales** sont intégrées au bundle.

## Changements
- **En-tête mobile** : menu natif, grande zone tactile, liens desktop conservés et fermeture automatique du menu après navigation. La barre collante n'occupe plus plusieurs rangées.
- **Fiches modèles** : navigation précédente/suivante, trois suggestions calculées à partir de la gamme, de la marque, du mouvement et du style. Les visuels utilisent les mêmes fichiers locaux que les cartes.
- **Favoris** : ajout ou retrait depuis les fiches, avec la même clé de stockage local que la collection. Aucun compte ni suivi distant.
- **Partage** : intégration de la fonction native de partage Android lorsque disponible, ou copie de lien.
- **Comparaison** : deux à trois montres avec miniatures photographiques, dans un tableau défilant à l'intérieur du dialogue.

## Validation
- [Tests de l'interface mobile et desktop dans Chromium](https://github.com/dbrckk/Spotify-montre/actions/runs/40490044458) : téléphone 393×852, ordinateur 1366×850, hauteur du menu, absence de débordement horizontal, photographies réelles, filtres, comparateur, favoris, suggestions et navigation de produit.
- [Audit des 15 sources image](https://github.com/dbrckk/Spotify-montre/actions/runs/40418018437) : 15 réponses HTTP image valides lors du contrôle ; l'audit ne garantit ni les droits de réutilisation ni la disponibilité future.
- Validation syntaxique, intégrité de catalogue et mentions commerciales via le workflow de validation du dépôt.

## Conditions
Cette boutique reste une **vitrine éditoriale**, sans paiement, stock synchronisé ou commissions affiliées actives. Les photos des marques restent soumises aux droits de leurs ayants droit ; leur présence dans le site ne vaut pas autorisation commerciale.

## Maintenance
Le générateur scripts/build-shipstatic-bundle.py produit les fichiers docs/deploy-package-*.json contenant les pages du site et les 15 photos WebP. Une nouvelle livraison doit republier **l'ensemble du bundle** ; publier uniquement HTML/CSS/JS sans les images cause des photos manquantes.

## À poursuivre
- Vérification complète sur le téléphone réel en complément des simulations Chromium.
- Accords de licence pour l'utilisation commerciale des photos et activation ultérieure des programmes d'affiliation.
- Prix et disponibilité fiables lorsque des flux partenaires seront disponibles.
- URL stable : l'offre ShipStatic connectée a atteint sa limite de domaines. La boutique utilise donc pour le moment une nouvelle URL à chaque déploiement.
