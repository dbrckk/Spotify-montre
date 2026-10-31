# Expansion commerciale documentée — 31 octobre 2026

## Objectif
Faire progresser les visites utiles et les clics vers Amazon.fr en ajoutant de nouveaux choix de montres, sans compromettre les 15 références actuellement photographiées, comparables et associées à 13 ASIN précis.

## Livré
- **13 modèles supplémentaires** distincts, répartis entre Essentielle (4), Signature (6) et Prestige (3). Le catalogue principal de **15 références exactes reste inchangé** pour préserver photos, filtres, comparateur, historisation, sources et règles Amazon existantes.
- **6 cartes** de découverte sur l’accueil, et une page indépendante `/montres/modeles-populaires.html` présentant les 13 montres par gamme avec détails vérifiables et sources publiques.
- Modèles recherchés sur les pages de meilleures ventes **propres à Montre.com, Casio G-SHOCK et Citizen**, auxquels s’ajoutent des choix éditoriaux Tissot, Orient, Seiko et Hamilton. **Aucune assertion de classement Amazon ou de quantité vendue en France**.
- Chaque carte donne accès à une page détaillée propre, la fiche constructeur exacte et un lien Amazon.fr clairement rémunéré. **Douze modèles conservent une recherche**, tandis que la **G-SHOCK GW-M5610U-1ER** dispose d'un lien produit direct grâce à sa fiche Amazon.fr attestant l'ASIN **B09BCPP68Q** ; prix, vendeur et disponibilité demeurent non confirmés.
- Liens Amazon de recherche `/s?k=marque+référence&tag=drackk04-21` **ou** directs `/dp/ASIN?tag=drackk04-21` si la fiche Amazon.fr du bon modèle a été confirmée ; marquage `rel="sponsored nofollow noopener noreferrer"`, URL jamais dissimulée ni redirigée. Les **13 liens historiques** de référence exacte restent inchangés.
- Instrumentation Umami **optionnelle** d’événements agrégés `amazon-search:<id>` si la variable `UMAMI_WEBSITE_ID` a déjà été configurée. Aucun suivi des visiteurs individuellement, cookie ou transmission d’informations de commande.
- Design typographique original vert profond / ivoire / laiton, sans photographie constructeur copiée ni image générique présentée comme la référence réelle.
- Sitemap et manifeste SEO sont désormais à **43 URL**, dont les **13 pages produit individuelles** ; aucune nouvelle fiche de prix fictif, de faux avis ni de JSON-LD `Offer`.

## Sources de référence (consultées le 31/10/2026)
- G-SHOCK GA-2100-1A1, signal « Top 3 meilleures ventes » Casio : https://gshock.casio.com/fr/products/collection/iconicstyles/2100/lineup/
- Sélections de meilleures ventes du distributeur Montre.com : https://www.montre.com/meilleures-ventes/ et https://www.montre.com/meilleures-ventes/bestsellers-pour-hommes/
- Citizen Tsuyosa NJ0200-50M : https://fr.citizenwatch.eu/fr/meilleures-ventes/
- Caractéristiques exactes et gamme des 13 modèles : `site/selection-populaires.json` (chaque produit contient `officialUrl`, `marketEvidence.url`, raison du choix et réserve éditoriale).
- Amazon : https://partenaires.amazon.fr/help/operating/policies — les listes de résultats de recherche sont un type de liste de produits, les Liens Spéciaux sont autorisés sous conditions d’adhésion et doivent être correctement balisés ; pas de prix sans API ou autorisation appropriée.

## Recommandations prioritaires avant promotion externe
1. **Vérifier les 12 ASIN Amazon.fr encore non documentés** par référence et variante exacte. La correspondance du GW-M5610U-1ER a été constatée sur Amazon.fr le 31 octobre 2026 ; le lien direct respecte le tag du compte, sans garantie de stock ou de prix.
2. **Obtenir les droits explicites** d’utiliser les photos des 13 nouvelles références ; à défaut conserver les visuels graphiques originaux et les liens fabricant. La preuve de droits doit rester hors dépôt public.
3. Finaliser les **mentions légales** avec l’identité réelle de l’éditeur ; ne jamais inventer un responsable éditorial.
4. Contrôler l’attribution dans Amazon Partenaires (vérificateur de liens, rapports de clics et commandes), et seulement ensuite analyser les taux de conversion. L’inscription du compte et son ID ne constituent pas une confirmation de commissions déjà dues.
5. Après validation des photos et des offres exactes, **intégrer progressivement les plus pertinentes dans le comparateur** en rendant le nombre de produits dynamique dans les scripts et workflows de validation. Ne pas doubler les modèles sans cette refonte.

## Vérification / publication
```sh
npm test
node scripts/build-seo.mjs
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
```
Puis workflow navigateur Android et audit WCAG avant fusion. Après fusion : contrôle du rendu Render, des **43 URL**, des **12 recherches + 1 lien direct** rémunérés balisés et de Lighthouse production.

Le design « typographique » n’est pas une photographie de montre ; les modèles supplémentaires sont réellement documentés, mais ne disposent pas encore tous d’un lien Amazon vers un ASIN exact.
