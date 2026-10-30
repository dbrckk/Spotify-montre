# Publication SEO — Atelier Montres (30 octobre 2026)

## Source de vérité
- Dépôt : `dbrckk/Spotify-montre`, branche `main`.
- Vitrine actuelle : sélection de 15 références authentiques, **pas un commerçant actif**.
- Catalogue : `site/selection-affiliation.json` (6 Essentielle, 6 Signature, 3 Prestige).
- Génération : `node scripts/build-seo.mjs`, sans appel d'API ni dépendance supplémentaire.
- Sortie du build : `site/index.html` (vraie sélection en page d'accueil), `site/montres/*.html` (15 fiches et guide), `sitemap.xml`, `robots.txt`.

## Publication automatique sur Render (site statique gratuit)
- **Repository** : https://github.com/dbrckk/Spotify-montre
- **Branch** : `main`
- **Build command** : `npm test && node scripts/build-seo.mjs && node scripts/validate-seo.mjs`
- **Publish directory** : `site`
- **Env var** : `PUBLIC_SITE_URL=https://atelier-montres-selection-fr.onrender.com/` (remplacer par l'URL réellement attribuée si nécessaire)
- `autoDeploy=yes` pour publier après validation et fusion du code.
- Préférer un vrai domaine de marque détenu par le vendeur une fois son identité légale confirmée : il évite la dilution SEO en cas de changement d'hébergeur.

**Important :** ne pas déployer `site/index.html` brut sans le build : cette ancienne page est la vitrine de pré-lancement historique. Le générateur met la vraie collection à sa place durant la publication, après les anciens contrôles.

## Référencement opérationnel
1. Une fois l'adresse publique stable et les droits sur les images vérifiés, ajouter la propriété dans [Google Search Console](https://search.google.com/search-console/about).
2. Envoyer `https://atelier-montres-selection-fr.onrender.com/sitemap.xml` dans la rubrique *Sitemaps*. Contrôler l'indexation des pages `/montres/*.html` avec Inspection d'URL.
3. Référencer la même propriété dans [Bing Webmaster Tools](https://www.bing.com/webmasters).
4. Surveiller les impressions, clics, CTR, Core Web Vitals, requêtes et pages exclues. N'indexer que les pages réellement utiles.
5. Ne pas promettre une position Google ni faire de faux avis, textes clonés ou chiffres de vente non vérifiés. Publier régulièrement du contenu original orienté recherche utile : comparaisons approfondies des mouvements, tailles et usages, sources constructeur, guides d'entretien.
6. Aucune régie publicitaire ni analytique intrusive n'est activée. Un système respectueux de la vie privée peut être envisagé après publication des mentions adaptées.

Sources officielles : 
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=fr
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/structured-data/product

## Vente et affiliation : deux parcours distincts

**Amazon Partenaires** : le client clique sur un lien spécial attribué par Amazon puis **paie sur Amazon**. Aucune commande sur le site d'Atelier Montres ne peut être qualifiée de vente affiliée Amazon classique. Ne jamais fabriquer un `tag` ou un identifiant. Afficher la déclaration d'affiliation conforme dès l'activation, vérifier la référence exacte liée, ne pas afficher de prix/stock Amazon sans permission et API/outil autorisés. Les photographies copiées des fabricants demandent une autorisation commerciale : le fichier source signale `publicUsageApproved:false` pour les quinze références. La publication actuelle ne démontre pas de droits suffisants.

**Paiement exclusivement sur Atelier Montres** : passage au statut de **marchand vendeur** pour des produits effectivement sourcés / stockés ou vendus via contrat d'expédition, avec prix réels, marges, conformité produit, information précontractuelle, CGV, droit de rétractation, identité de l'entreprise, gestion des commandes, remboursement et SAV. Le paiement embarqué (Stripe Embedded Checkout, par exemple) nécessite une API backend sécurisée et un traitement des webhooks vérifiés. Aucun montant, bouton de paiement, offre structurée, checkout ni commande ne sera mis en service avant satisfaction de ces conditions.

Amazon : https://partenaires.amazon.fr/help/operating/policies
