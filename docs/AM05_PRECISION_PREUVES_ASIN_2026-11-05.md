# AM-05 — Présentation fidèle des références Amazon (05/11/2026)

## Constat
Le registre `site/amazon-product-links.json` établit une correspondance entre 13 identifiants de montres et des ASIN Amazon.fr, datée du **30 octobre 2026**. Il ne certifie ni une disponibilité en temps réel, ni un prix, ni une commission effectivement payée. Quatre références étaient signalées indisponibles au dernier contrôle, neuf n'ont pas de disponibilité vérifiée et deux montres de la sélection historique ne disposent d'aucun ASIN exact.

Le composant catalogue `site/affiliate-ui.js` affichait pourtant « Fiche Amazon vérifiée », et `site/acheter.html` promettait des « fiches vérifiées » : cette formulation pouvait être comprise comme une vérification de stock en direct.

## Correction
- Remplacer « Fiche Amazon vérifiée » par **« ASIN documenté »** sur les cartes des 15 montres.
- Présenter les liens d'achat comme des **références documentées**, avec vérification du prix, du vendeur et du stock chez Amazon.fr.
- Clarifier l'étiquette accessible de la grille d'achat.
- Ajouter un test navigateur qui interdit la réintroduction de l'affirmation trompeuse dans le catalogue.

## Limites et suite
Le programme Amazon est encore déclaré `approved: false` et `enrollmentStatus: enrolled_approval_unverified` dans le registre ; l'approbation finale et les commissions ne peuvent être déduites du code. Pour valider le commerce réel, obtenir les rapports Amazon Partenaires et vérifier chaque destination/variante/stock à la date du contrôle, sans utiliser une réponse HTTP générique comme preuve de disponibilité.

Aucun paiement direct n'est activé et aucun appel de commande fournisseur n'est déclenché par ce lot.
