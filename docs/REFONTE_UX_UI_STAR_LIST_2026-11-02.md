# Atelier Montres — direction UX / UI « Collection Éditoriale »
**02 novembre 2026 — mise en œuvre effective dans le dépôt `Spotify-montre`**

## Sources analysées dans `dbrckk/star-list`

Source principale : [`WEB_RESOURCES.md`](https://github.com/dbrckk/star-list/blob/main/WEB_RESOURCES.md).
Les références sont **des pistes de recherche**, pas des droits de reproduction ou des dépendances à installer.

| Ressource du catalogue | Enseignement retenu | Adaptation sur notre site | Intégration |
| --- | --- | --- | --- |
| [Awwwards](https://www.awwwards.com/) | Composition éditoriale, identité distincte, grande typographie | Hero graphite, cadrage photographique, fortes respirations et accent cuivre | CSS original, aucun modèle recopié |
| [Recent.design](https://recent.design/) | Collections visuelles cohérentes, contraste image/texte | Trois parcours d’achat par intention et showroom hiérarchisé | HTML/CSS original |
| [Mobbin](https://mobbin.com/) | Découverte mobile, liens directs vers tâches réelles, navigation courte | Accès « Rétro », « Automatique », « Sport », puis raccourcis filtres sur 52 montres | Liens natifs vers les paramètres déjà pris en charge |
| [60fps.design](https://60fps.design/) | Micro-interactions fluides non intrusives | Transitions légères sur cartes/photos/onglets ; hover seulement en environnement pointeur | CSS local + reduced motion |
| [Uiverse](https://uiverse.io/) | Contraste, affordances, touches tactiles, hiérarchie boutons | Boutons et sélecteurs reposant sur notre HTML natif, focus visible, cibles ≥44px | Aucun composant tiers importé |
| [21st.dev](https://21st.dev/) | Échelle et structure des cartes/composants | Tuiles et cartes sémantiques avec contrastes cohérents | Aucun React/Tailwind ajouté |
| [React Bits](https://reactbits.dev/) | Effets de qualité adaptés aux sites React | **Non installé :** bibliothèque non pertinente pour ce site HTML statique. Pas de licence ou de charge supplémentaire. | Non utilisé |

## Amélioration effective : home et catalogue

### Palette

- **Graphite profond** : `#151e22` pour les scènes de collection et navigation.
- **Porcelaine chaude** : `#f9f7f1` pour le contenu et les photos.
- **Cuivre / champagne** : `#c5a06d` pour les accents éditoriaux.
- **Texte structurant** : `#21302e` sur surfaces claires, **blanc crème** sur fonds sombres.
- **Bordures pierre** : `#dcd7cd`, ombres faibles et espaces maîtrisés.

La palette remplace l’omniprésence du vert uniforme ; elle ne suppose aucun prix, stock, livraison ni statut commercial non confirmé.

### Expérience utilisateur

1. **Haut de page** : hero de caractère, photo existante de Citizen Tsuyosa, photo contractuellement déclarée autorisée dans le catalogue, grande typographie adaptée sur mobile, CTA « Explorer les 52 montres » et conseiller.
2. **Choisir par style** : trois grandes tuiles photographiques *Rétro / Automatique / Sport*, illustrées exclusivement avec des fichiers WebP locaux déjà publiés pour les modèles exacts SKMEI 2056, Citizen Tsuyosa et Pagani PD-1701. Les liens mènent aux filtres réellement implémentés, jamais vers une page vide.
3. **Catalogue 52** : accès rapides directement dans la page générée vers SKMEI, les automatiques, petits boîtiers et modèles photographiés ; liens de filtre conservés dans l’URL et utilisables sans compte.
4. **Cartes** : proportions, fonds neutres valorisant les photos, distinction visuelle vendeur/fabricant, liens marchands toujours vérifiables, meilleures séparations typographiques, rayons et états de survol cohérents.
5. **Android / petit écran** : mise en page à deux colonnes lorsque lisible, grande carte d’orientation, contrôles tactiles avec focus clavier, affichage d’une seule colonne à largeur très étroite.
6. **Sobriété** : aucune image de fond distante, aucune Google Font, aucun framework, animation annulée sous `prefers-reduced-motion`, aucune capture de données supplémentaire.

### Fichiers

- `site/editorial-atelier-2026.css` — feuille de style source et tokens.
- `site/affiliation.html` — style et sélection photographique ajoutés sans détruire les parcours existants.
- `scripts/build-unified-discovery.mjs` — accès par intention, feuille de style sur le catalogue généré, rédaction commerciale exacte.
- `scripts/check-editorial-watch-ux.mjs` — contrôle de non-régression ; branché à `npm test` et `npm run lint`.

### Portes de validation

- [ ] `npm test` / `npm run lint` et build `scripts/build-seo.mjs` validés sur GitHub Actions.
- [ ] Scénarios navigateur mobile et axe/WCAG validés avant fusion.
- [ ] Déploiement réel du site sur Render contrôlé.
- [x] Les fichiers photographiques sont déjà présents localement ; aucune copie d’images tiers.
- [x] Le mode de paiement reste `inactive` et le moteur fournisseur est inchangé.

## Travail UX suivant, après validation

Audit visuel sur téléphone des cartes à 360px et 412px ; test de lisibilité avec un zoom système 200 %, des liens d'affiliation, des filtres préremplis et des images locales. Vérifier l’accessibilité et les temps de chargement avec Lighthouse ; éviter animations, dépendances ou fonctionnalités non indispensables.

Pour la vente directe, conserver la [feuille de route marchande](ROADMAP_VENTE_DIRECTE_AUTOMATISEE_2026-11-02.md) : le travail graphique n’active ni paiement ni commande fournisseur.
