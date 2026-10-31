# Comparateur de montres — remplacement d'un modèle à sélection complète

**Atelier Montres · 31 octobre 2026 · `dbrckk/Spotify-montre`, branche `main`**

## Besoin utilisateur

Le comparateur accepte **au maximum trois montres parmi les quinze références vérifiées**. Avant cette amélioration, cocher un quatrième modèle était refusé, ce qui imposait de retrouver et de retirer manuellement une des trois montres avant de revenir à la quatrième.

Le nouveau parcours conserve les règles de comparaison et remplace uniquement le modèle explicitement choisi par le visiteur.

## Parcours Android et desktop

1. Cocher une, deux puis trois montres. Le bandeau indique « 3/3 · Cochez une autre montre pour remplacer un modèle » et conserve les miniatures des trois références.
2. Cocher un **quatrième modèle** (encore hors comparaison) : la case reste décochée tant que l'utilisateur n'a rien confirmé. Une boîte de dialogue modale ouvre un choix de **trois boutons**, un par modèle déjà sélectionné. Le modèle entrant est cité par sa maison et sa référence exacte.
3. Choisir la montre à remplacer : **seul ce créneau change**. Les deux autres montres restent sélectionnées dans leur ordre initial ; la nouvelle montre est cochée, l'ancienne ne l'est plus.
4. Annuler, toucher le fond de la boîte ou appuyer sur **Échap** ferme le choix sans modifier la moindre montre.
5. Recharger la page ou ouvrir un lien de comparaison partagé : les trois identifiants restent persistants dans `sessionStorage` et sont synchronisés avec le paramètre `compare` lorsqu'il est présent. Les autres filtres du catalogue ne sont pas réinitialisés.

Le dialogue est intégré à la page, accessible au clavier, avec **cible tactile de 44 px minimum**, focus visible, vrais noms des modèles et miniatures WebP locales. Il n'existe pas de remplacement automatique ni de faux prix, disponibilité ou avis.

## Implémentation

- `site/affiliation.html` : nouveau dialogue natif `#affCompareReplaceDialog`, liste `#affReplaceChoices`, texte de confirmation explicite et bouton d'annulation.
- `site/affiliation.js` : `requestReplacement(id)` ouvre le sélecteur après une tentative de quatrième case cochée. La confirmation remplace l'identifiant **au même index**, ferme le dialogue puis appelle `render()`, qui met à jour l'interface, la session et l'URL si nécessaire.
- `site/horlogerie.css` : surfaces de choix photographiques homogènes, responsive Android, contraste du texte, focus clavier et animation désactivée en cas de mouvement réduit.
- `scripts/test-mobile-storefront-v8.mjs` : trois montres choisies, annulation, remplacement du troisième créneau, vérification des deux autres, cohérence des quatre cases à cocher, rechargement puis comparaison effective.
- `scripts/test-compare-persistence.mjs` : fermeture par Échap, vérification du paramètre `compare` d'un lien partagé, remplacement du premier créneau, rechargement et effacement permanent.

## Vérifications avant publication

Les workflows GitHub Actions `SEO storefront checks`, `Validate premium mobile catalogue interactions` et `Verify production Render watch storefront on Android` assurent respectivement la validité de l'intégration, le scénario Android local et le même scénario sur le site public. La validation finale nécessite le déploiement Render du commit testé, pas seulement un code qui semble correct.

**Contrainte maintenue :** une comparaison de quatre montres simultanées n'est pas proposée ; la capacité demeure limitée à **trois** pour préserver la lisibilité et la cohérence sur smartphone.
