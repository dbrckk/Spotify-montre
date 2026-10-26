# Refonte horlogère V6 — sélection multimarque et marque propre
_Mise à jour : 26 octobre 2026_

## Contexte
Atelier Montres expose quinze références réelles (6 Essentielle, 6 Signature, 3 Prestige). Les photos constructeur ne sont pas intégrées dans cette version : l'autorisation commerciale de reproduction n'est pas établie. Les cartes utilisent des **illustrations SVG originales de familles de montres**, visiblement signalées comme non contractuelles. Les liens "Photos officielles" et les fiches de détail mènent vers le fabricant; les recherches Amazon et eBay ne sont pas rémunérées.

## Direction artistique
- Univers : horlogerie éditoriale, proche du rythme visuel des grands sites Cartier / Tissot / Chrono24 **sans copier leurs contenus ni leur mise en page à l'identique**.
- Couleurs principales : vert nocturne (#172c20), ivoire chaud (#faf9f5), laiton doux (#bc9c69), gris minéral.
- Typographie : Georgia pour titres éditoriaux (sans ajout de Google Fonts), system-ui pour texte d'interface.
- Fond produit constant, grand cadran central, variantes de bracelets/carrure et reflets vectoriels selon le modèle.
- Hero : Citizen Tsuyosa vert avec silhouette vectorielle spécifique, accroche plus horlogère.
- Navigation sticky accessible, catégories en trois gammes, recherche, tri, favoris locaux, sélection et comparateur limité à trois produits.
- Des **fiches individuelles** sur `montre.html?id=<id>` détaillent les caractéristiques fabricant réellement confirmées, sans inventer celles des autres. Aucun prix temps réel ou état de stock fictif.
- Mobile : grilles une colonne, contrastes, focus clavier, transitions avec `prefers-reduced-motion`. Pas de carrousel automatique ni de ressources distantes pesantes.
- Marque propre : identité visuelle harmonisée, toujours une présentation de projets à personnaliser, **aucune précommande**.

## Ressources réellement lues dans star-list
- [WEB_RESOURCES.md](https://github.com/dbrckk/star-list/blob/main/WEB_RESOURCES.md) : [recent.design](https://recent.design) et [60fps.design](https://60fps.design) pour les rythmes visuels, micro-interactions et sobriété d'animation.
- [AGENT_SKILLS.md](https://github.com/dbrckk/star-list/blob/main/AGENT_SKILLS.md) : `nextlevelbuilder/ui-ux-pro-max-skill`, `vercel-labs/agent-skills` / Web Design Guidelines, `anthropics/skills` / Frontend Design, `Leonxlnx/taste-skill` / design taste. **Sources consultées en lecture seule**, pas de code ni de licence importés.
- [RECOMMENDER.md](https://github.com/dbrckk/star-list/blob/main/RECOMMENDER.md) : pas d'intégration aveugle de dépôts. Une ressource n'est réutilisable qu'après pertinence technique, licences et vérification de compatibilité avec une vitrine HTML/CSS/JS sans dépendance.
- Résultat concret : design tokens, surfaces de produits homogènes, responsive, taille de clic, visualisation différenciée, reduced-motion, navigation sémantique et poids réseau faible.
- Entrées du catalogue principal (`catalog.json`) trop volumineuses pour inspection complète dans la connexion de cette session ; ne pas prétendre avoir exécuté un scan automatisé exhaustif de ses entrées.

## Inspiration extérieure vérifiée
- [Baymard — Jewellery & Watches UX benchmark](https://baymard.com/ux-benchmark/collections/jewelry-and-watches) : recherches sur grilles, visuels produits, informations et navigation.
- [Cartier](https://www.cartier.com/fr-fr) : narration visuelle et respiration éditoriale.
- [Tissot](https://www.tissotwatches.com/fr-fr/) : fiches techniques et photographies fabricants.
- [Chrono24](https://www.chrono24.fr/) : filtrage et comparaison; ne pas reproduire leurs avis ou métriques.
Sources d'inspiration seulement ; ne pas utiliser directement des photographies, logos tiers ou composants protégés.

## Améliorations fonctionnelles réalisées
- `site/watch-illustrations.js` dessine 15 rendus vectoriels avec formes différenciées :
  Casio numérique rectangulaire, quartz carré rétro, plongeuse, transparente Swatch, sport intégré, ouvert sur le mouvement Citizen, cadran à chiffres Hamilton, motif texturé PRX/Presage.
- `site/horlogerie.css` et `site/affiliation.js` : visuels produit améliorés, recherche par marque/modèle, tri, favoris stockés sur l'appareil, comparaison à 2–3 produits, modal clavier natif.
- `site/montre.html`, `site/fiche.css`, `site/fiche.js` : 15 fiches par identifiant, documentées et protégées contre les valeurs non vérifiées.
- `site/marque-refine.css` : les concepts Émeraude, Glacier, Minuit restent cohérents avec la vitrine multimarque.
- `scripts/test-premium-experience.mjs` teste le rendu de quinze SVG, le numérique Casio, les chiffres de la Hamilton et les règles de publication.

## Exemples de spécifications sourcées
- Citizen Tsuyosa NJ0150-81X : 40 mm, automatique calibre 8210, saphir, 5 bar (https://fr.citizenwatch.eu/fr/p/nj0150-81x/).
- Hamilton Khaki Field H70455133 : 38 mm, calibre H-10 automatique, saphir, 80 h, 10 bar (https://www.hamiltonwatch.com/fr-fr/h70455133-khaki-field-auto.html).
- Tissot PRX Quartz T1374101104100 : 40 mm, quartz, saphir, 10 bar (https://www.tissotwatches.com/fr-fr/T1374101104100.html).
- Orient Bambino RA-AC0M12L : 38,4 mm, calibre F6724, verre minéral, 3 bar (https://www.orientwatch.fr/or/fr_FR/brands/orient/orient-bambino-38mm/p/RA-AC0M12L).
Les autres caractéristiques non confirmées sont indiquées « À confirmer ».

## Contraintes pour monétiser
1. Créer/valider les comptes Amazon Partenaires et/ou Awin avec la vraie URL publique du site.
2. Obtenir les liens de suivi exacts et les permissions d'utiliser les photographies produits via API/flux du partenaire ou accord direct.
3. Ajouter les images et prix dans les conditions des programmes, avec rafraîchissement des disponibilités.
4. Signaler clairement les liens rémunérés et les cookies de suivi imposés si applicables.
5. Conserver les passages vers le marchand pour l'affiliation ; impossible d'encaisser directement sur Atelier Montres une vente Amazon affiliée classique.
6. Pour la marque propre : fournisseurs, conformité UE, disponibilité du logo INPI, vraie entreprise, stock et encaissement distincts.

## Limites de cette version
- Illustrations vectorielles uniques par **famille de conception**, non reproductrices exactes des montres et ne remplaçant pas la photographie produit.
- Sans compte affilié, tous les liens vers les fabricants et recherches Amazon/eBay sont non rémunérés.
- Aucun test de transaction ni statut de stock; publication `noindex` tant que la boutique n'est pas légalement prête.
- Les tests automatisés vérifient le code/DOM simulé; un test visuel réel sur Android reste à faire.
