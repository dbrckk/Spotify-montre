# Parcours commercial des 13 montres supplémentaires — 31 octobre 2026

## Amélioration livrée

Les 13 références complémentaires, classées en trois gammes, possèdent désormais chacune une **fiche HTML indexable** `/montres/<identifiant>.html`, distincte du comparateur photo de 15 montres historiques. Le site passe de **30 à 43 URL** dans le sitemap.

Chaque fiche contient :

1. La référence exacte et une composition graphique originale **explicitement non contractuelle**, sans photographie fabricant copiée.
2. Quatre informations techniques documentées : mouvement, boîtier, verre et étanchéité.
3. Une analyse documentaire originale : intérêt, réserve avant achat et source de popularité lorsqu'elle existe.
4. Le lien vers le fabricant où consulter les **vraies photographies** et les caractéristiques complètes.
5. Une recherche Amazon.fr balisée **`tag=drackk04-21`**, clairement signalée comme lien rémunéré. Le code de modèle est inclus dans les termes de recherche, mais **l'ASIN et la variante ne sont pas encore certifiés**.
6. Trois pistes de comparaison déjà documentées parmi les 15 montres du catalogue existant, avec maillage vers leurs pages.
7. Des repères concrets pour vérifier le vendeur, la variante, le prix, les retours et la garantie avant toute commande.

Le carrousel de six modèles en page d'accueil et les treize cartes de la collection renvoient désormais vers la **fiche individuelle** en cliquant sur le nom du modèle. La sortie commerciale Amazon et la fiche fabricant restent accessibles immédiatement.

## Traçabilité et conformité

- Le contenu provient de `site/selection-populaires.json`. La documentation comporte la source exacte de chaque modèle et le statut de son signal de popularité. Les sélections de Montre.com, Casio ou Citizen ne doivent pas être réinterprétées comme des statistiques nationales ou Amazon.
- Les **13 liens produits ASIN précédemment vérifiés**, les photos du comparateur, ses fonctions et l'ID du compte ne changent pas.
- Les nouveaux modèles n'utilisent **aucune photographie non autorisée**, avis client, tarif, inventaire ou note fictive ; les données structurées `Product` contiennent uniquement marque, référence et caractéristiques, sans `Offer`, `Review`, `AggregateRating` ou image non vérifiée.
- `research/amazon-fr-popular-asin-candidates.json` conserve deux candidats **non publiables** (Tissot Gentleman, G-SHOCK GW-M5610U), identifiés par des sources secondaires. Un ASIN d'une boutique étrangère n'est pas une preuve d'une fiche Amazon.fr équivalente. Aucun lien `/dp/` nouveau n'est généré avant contrôle exact chez Amazon.fr.
- Les liens affiliés sont disponibles pendant l'inscription, mais le statut d'approbation finale et la réalité des commissions doivent être mesurés sur Amazon Partenaires.
- La présence de liens affiliés ne constitue pas un avis personnalisé, une recommandation de prix ou la garantie qu'un vendeur commercialise la variante recherchée.

## Tests obligatoires

- `node scripts/build-seo.mjs && node scripts/build-seo.mjs` : construction reproductible/idempotente.
- `node scripts/validate-seo.mjs` : 13 nouvelles URL canoniques, `Product` / `BreadcrumbList`, quatre caractéristiques, sources, non-publication des images, absence d'offres fictives, lien search + tag + disclosure.
- `scripts/test-mobile-storefront-v8.mjs` : **13 routes** testées à 393 px avec contrôle de contenu, liens sortants, source fabricant, débordement, et réagencement à 320 px ; captures Citizen 37 mm et Tissot Gentleman.
- Audit WCAG strict et Lighthouse mobile avant de déclarer une version publique stable.
- `scripts/check-affiliate-publication.mjs` : les scénarios d'activation/désactivation des liens sont exécutés en environnement isolé.

## Suite commerciale prioritaire

1. Confirmer les ASIN sur **amazon.fr** depuis les fiches publiques ou via les outils du compte Partenaires ; vérifier le modèle et la variante exacts. Ne jamais importer automatiquement un ASIN étranger.
2. Obtenir des autorisations explicites de réutilisation des photographies des nouvelles références, ou disposer d'images originales réellement représentatives de la montre.
3. Mesurer le taux de clic sortant par modèle avec les rapports Amazon et, si configuré, les événements Umami anonymisés, puis réduire les étapes pour les meilleures références.
4. Fournir les mentions légales réelles du responsable de site ; à ce stade il est interdit d'inventer identité ou justificatifs de licences.
5. Déterminer quelles références ajoutées méritent d'entrer dans le comparateur après validation des droits et de leurs données.

La création de pages SEO n'apporte aucune garantie d'indexation ou de ventes. Elle améliore en revanche la pertinence des pages d'arrivée et la vérifiabilité du contenu.
