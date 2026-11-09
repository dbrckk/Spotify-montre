# Atelier Montres — mesure gratuite des parcours et revenus vérifiés

Mise à jour : 9 novembre 2026 · Boutique : https://atelier-montres-selection-fr.onrender.com/

## Ce qui existe réellement

La boutique indépendante publie **52 références documentées** (15 principales et 37 complémentaires). Le registre Amazon.fr contient **27 associations référence/ASIN documentées** (13 modèles principaux et 14 complémentaires). Les autres sorties restent des recherches ou des sources commerciales explicitement identifiées. Une association ASIN n'est pas une garantie d'offre active, de prix, de stock, de variante ou de commission.

Le suivi est **facultatif et désactivé tant que `UMAMI_WEBSITE_ID` n'est pas configuré au déploiement**. Le code prêt à mesurer les clics n'implique pas que des statistiques soient actuellement collectées. Le site n'a ni paiement direct activé, ni chiffre d'affaires attesté, ni accès natif aux achats des partenaires.

## Événements mesurables avec Umami activé

| Nom d'événement | Sens réel | Ce qui n'est **pas** mesuré |
|---|---|---|
| `amazon:<modèle>:<emplacement>` | Clic sur un ASIN documenté avec identifiant Partenaires confirmé | Achat et commission |
| `amazon-search:<modèle>` | Recherche Amazon.fr rémunérée, distincte d'un ASIN | Produit exact trouvé |
| `amazon-unpaid:<modèle>:<emplacement>` | Ouverture d'un ASIN sans lien rémunéré | Revenu |
| `merchant:<modèle>:<emplacement>` | Ouverture d'une source marque/vendeur autorisée | Achat chez le vendeur |
| `awin:<modèle>:popular` | Ouverture d'un lien Awin validé | Conversion Awin |
| `compare:<modèle>:fiche` | Accès au comparatif depuis la fiche complémentaire | Comparaison terminée ou achat |
| `compare:<modèle>:selection` | Accès au comparatif depuis la sélection de dix modèles | Achat |
| `compare:<modèle>:accueil` | Accès au comparatif depuis la sélection abordable de l'accueil | Achat |
| `proof-filter:photo`, `proof-filter:asin`, `proof-filter:both` | Activation d'un filtre fondé sur les registres documentaires | Profil, intention d'achat certaine, volume de vente |

Les clics sont des **intentions, pas des transactions**. Les répétitions et les blocages anti-tracking peuvent fausser les ratios. Les pages vues d'Umami sont des métriques distinctes et non des « visiteurs ayant comparé » identifiés individuellement.

La collecte des nouveaux événements est limitée aux catégories ci-dessus : **aucune recherche libre, valeur de formulaire, adresse, e-mail, commande, URL utilisateur ou identifiant client** n'est ajoutée comme propriété d'événement. Les comparatifs sont validés sur l'origine du site et les seuls identifiants de modèles présents dans les liens source. Les événements ne bloquent ni ne retardent la navigation. L'attribut `data-do-not-track="true"` est conservé dans le script Umami.

## Activation facultative depuis Android

1. Créer un site « Atelier Montres » dans **<https://cloud.umami.is/>** si un compte adapté et des obligations de confidentialité satisfaites sont disponibles.
2. Relever le **Website ID UUID public** dans le code de suivi de ce site. Il ne s'agit ni d'une clé API ni d'un mot de passe.
3. Dans **<https://dashboard.render.com/>**, ouvrir le service de la boutique, puis **Environment** et définir `UMAMI_WEBSITE_ID` avec ce UUID. Publier la nouvelle version.
4. Vérifier dans l'HTML que `https://cloud.umami.is/script.js` apparaît une fois, puis dans **Events** que les clics réellement effectués produisent les catégories ci-dessus. La navigation doit continuer même si le script est bloqué.
5. Pour désactiver : supprimer `UMAMI_WEBSITE_ID` et redéployer. Le build ne doit plus charger Umami ni `analytics.js`, et la notice de confidentialité doit revenir à sa version inactive.

**Avant activation :** compléter les mentions légales et la politique de confidentialité, confirmer la conformité RGPD/CNIL au contexte réel et les paramètres de conservation. « Sans cookie » ne signifie pas automatiquement « sans données personnelles ». Ne pas ajouter d'outils de profilage ou de suivi intersites. Les tarifs, limites et conditions d'Umami peuvent évoluer : vérifier la formule gratuite sur le site de l'éditeur avant souscription.

## Tableau de décision mensuel (à remplir avec des faits)

Comparer deux périodes définies (par exemple 7 et 28 jours), à **canal et période identiques** :

- **Audience par page** : pages vues réellement enregistrées et pages produits effectivement consultées, d'après Umami si actif.
- **Usage du parcours** : nombres des événements `compare:*` et `proof-filter:*` par emplacement, jamais des « utilisateurs uniques » déduits des clics.
- **Sorties marchandes** : clics Amazon-ASIN vs recherches vs Awin vs fournisseurs. Un modèle qui génère des recherches mais pas de fiches identifiées est un candidat à approfondir, pas une vente manquée prouvée.
- **Revenus vérifiés** : commandes et commissions **uniquement** depuis les rapports officiels Amazon Partenaires / Awin, sur leur propre période et après rapprochement des identifiants disponibles. Ne jamais multiplier les événements de clic par un taux hypothétique pour afficher un chiffre d'affaires.
- **Décisions** : traiter d'abord les pages avec trafic avéré mais sorties peu compréhensibles, les références anciennes et les URLs cassées ; tester une seule modification UX puis mesurer sur un intervalle comparable. Ne pas interpréter un petit échantillon comme une tendance fiable.

Une baisse des événements après activation d'un bloqueur ou du paramètre « Do Not Track » ne signifie pas nécessairement une baisse des visites.

## Source des commissions réelles

Les rapports **<https://partenaires.amazon.fr/> → Rapports / Rémunérations** distinguent les clics, les articles commandés/expédiés et les commissions selon les règles du programme. Les conversions Awin sont consultables dans le compte éditeur Awin correspondant. Aucune de ces informations n'est obtenue automatiquement par le JavaScript statique de la boutique.

## Contrôles du dépôt

- `scripts/build-seo.mjs` n'injecte le script Umami et `site/analytics.js` qu'avec un UUID valide ; le paramètre Do Not Track est activé.
- `scripts/check-merchant-analytics.mjs` exécute le **vrai tracker** et vérifie les 27 associations ASIN, les emplacements, les URLs et les trois nouveaux événements de comparatif et de preuve, y compris les cas malveillants ou non autorisés.
- `scripts/check-affiliate-publication.mjs` teste les déploiements avec et sans Umami, la notice de confidentialité et le refus des identifiants malformés.
- `npm test`, `npm run lint`, les workflows SEO, Android, WCAG et Lighthouse restent les barrières de livraison.

Documentation fournisseur : <https://docs.umami.is/docs/track-events> ; <https://docs.umami.is/docs/tracker-configuration> ; <https://partenaires.amazon.fr/help/topic/reports/faq>.
