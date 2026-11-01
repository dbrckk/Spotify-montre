# Transparence des accès marchands sur 52 montres — 1er novembre 2026

La page `/montres/toutes-les-montres.html` utilise désormais le type de lien déjà calculé par `build-unified-discovery.mjs`, sans créer de fausse offre ni demander une API payante.

- **Fiche du modèle identifiée** : URL de fiche marchande préalablement associée au modèle par les registres existants. Cela ne prouve ni prix, ni stock, ni variante en temps réel.
- **Recherche Amazon** : recherche rémunérée qui peut renvoyer plusieurs produits et variantes ; rien ne la fait passer pour une fiche produit exacte.
- **Source externe** : page fabricante ou distributrice, sans lien d'achat vérifié sur cette carte.

Le filtre « Accès marchand » est combinable avec marque, style, diamètre, mouvement, gamme et photographie. Le paramètre partageable `?merchant=direct|search|official` est lu uniquement après validation du catalogue JSON ; sans JS ou si le chargement échoue, les 52 cartes HTML restent visibles. La comparaison active conserve les éléments sélectionnés pendant le filtrage.

**Vérification :** `node scripts/build-seo.mjs && node scripts/validate-seo.mjs`, puis `WATCH_STOREFRONT_URL=http://127.0.0.1:8765 node scripts/test-unified-compare-tray.mjs` avec le serveur local déjà configuré dans `test-premium-mobile.yml`. Le test navigateur contrôle les trois types, les effectifs issus de la page, le partage des filtres et la remise à zéro. Aucune donnée de vente, commission, classement ou disponibilité n'est inférée.
