# Atelier Montres — analytics gratuites et commissions Amazon.fr

Date : 30 octobre 2026. Boutique : https://atelier-montres-selection-fr.onrender.com/

## Objectifs et limites réelles

- **Trafic et clics sortants** : Umami peut mesurer les visites et les clics vers les 13 fiches Amazon.fr identifiées, avec la référence et l'emplacement du clic, **uniquement après configuration explicite**.
- **Commissions et commandes réelles** : le Club Partenaires Amazon.fr fait foi. Le site ne peut pas connaître les achats, annulations, expéditions ou commissions sans accès aux rapports Amazon. Les clics du site et ceux d'Amazon peuvent différer.
- **État actuel** : `site/affiliate-links.json` est encore inactif. Les liens produit publics sont non rémunérés. Aucune transaction n'est encaissée ici.
- **Coûts** : aucune base de données ni service payant nécessaire. Umami Cloud Hobby était affiché à **0 $ jusqu'à 100 000 événements par mois, 1 site, conservation 6 mois** au 30 octobre 2026. Au-delà, consulter la tarification actuelle avant de passer sur un forfait supérieur.

## Mise en route sur smartphone Android (une fois la conformité vérifiée)

1. Aller sur https://cloud.umami.is/ et créer un compte **Hobby gratuit**, sans choisir un essai payant.
2. Dans Umami : **Settings → Websites → Add website**, nom `Atelier Montres`, domaine `atelier-montres-selection-fr.onrender.com`. Copier uniquement l'identifiant UUID **Website ID** affiché dans le code de suivi.
3. Depuis le navigateur : https://dashboard.render.com/ → sélectionner `atelier-montres-selection-fr` → **Environment** → ajouter la variable `UMAMI_WEBSITE_ID` avec le UUID exact → enregistrer et déclencher/reprendre le déploiement.
4. Visiter la boutique puis ouvrir une fiche produit Amazon.fr depuis une carte, une fiche interactive ou une fiche SEO. Dans Umami : **Events**, filtrer les événements `amazon:<id>:<emplacement>`.
5. Dans Umami, vérifier le nombre de visites et les événements du site. Aucun prix, achat ni commission Amazon n'est transmis à Umami.

Aucun identifiant personnel, e-mail, URL de commande ni ID de suivi Amazon n'est transmis dans les événements. Les noms des événements sont des catégories publiques (ex. `amazon:citizen-tsuyosa:catalogue`, `amazon:citizen-tsuyosa:fiche`, `amazon:citizen-tsuyosa:seo`), en un événement par clic sans propriété supplémentaire. Une extension anti-tracking peut bloquer Umami ; ne pas retarder le clic Amazon pour tenter de contourner ce choix.

La variable est **facultative** : en son absence, le build ne charge aucun script Umami et ne contacte pas ce fournisseur. Un UUID invalide bloque le build. Désactiver consiste à supprimer `UMAMI_WEBSITE_ID` de Render et redéployer. La notice de confidentialité publiée revient automatiquement à l'état sans analytics. Les réglages `Do Not Track` sont respectés.

**Juridique :** Umami utilise normalement aucun cookie mais traite certaines données de navigation. L'absence de cookies ne dispense pas automatiquement de vérifier les exigences RGPD/CNIL applicables à l'analyse d'audience. Compléter l'identité de l'éditeur et la notice de confidentialité avant activation effective. Ne pas configurer un suivi identifiant les personnes.

## Rapports de commissions Amazon.fr

Quand le compte Partenaires est effectivement approuvé et les liens spéciaux activés avec ses autorisations :

1. Ouvrir https://partenaires.amazon.fr/ → **Rapports / Rémunérations**.
2. Examiner les **clics**, **articles sans commandes**, **articles commandés**, **articles expédiés**, **commissions** et le **résumé des ID de suivi**.
3. Télécharger les rapports CSV ou XLSX si nécessaire. Ils sont la seule source fiable pour les conversions/commissions Amazon ; **ne pas** déduire un revenu des clics Umami.
4. Réévaluer les modèles liés à des fiches actuellement indisponibles, sans afficher de stock fictif ni relier une variante erronée.

Source officielle : https://partenaires.amazon.fr/help/topic/reports/faq

## Règles techniques testées

- `scripts/build-seo.mjs` injecte `https://cloud.umami.is/script.js` uniquement lorsque `UMAMI_WEBSITE_ID` est valide.
- `site/analytics.js` n'enregistre que les clics sur de vrais liens `https://www.amazon.fr/dp/ASIN`, classés par ID de montre et emplacement.
- L'ajout, la suppression et le changement de configuration sont vérifiés par `scripts/check-affiliate-publication.mjs`.
- `scripts/validate-seo.mjs` vérifie aussi les 15 pages produit, l'existence des 13 liens exacts et la cohérence de la notice publiée.
- Pas de cookies ajoutés, ni redirections d'affiliation cachées, ni dépendance serveur.

Références techniques :
- https://docs.umami.is/docs/track-events
- https://docs.umami.is/docs/cloud/faq
- https://umami.is/pricing
- https://docs.umami.is/docs/tracker-configuration
