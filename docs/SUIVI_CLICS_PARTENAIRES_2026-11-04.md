# Mesure des clics du parcours partenaires (version opt-in)

Date : 4 novembre 2026. Le catalogue contient 13 liens Amazon.fr de références exactes, mais **aucune commission, commande ou conversion Amazon ne peut être inférée d'un clic sur notre site**.

## Correction appliquée

Le constructeur `scripts/build-seo.mjs` connecte désormais la page `acheter.html` au même code facultatif de statistiques que l'accueil et les pages SEO.

- **Sans** variable d'environnement Render `UMAMI_WEBSITE_ID` : zéro script Umami et zéro appel de mesure depuis la page partenaires.
- **Avec** un identifiant de site Umami valide : insertion d'un script Umami et du fichier local `analytics.js`, avec `data-domains` limité au domaine du site et `data-do-not-track="true"`.
- Le suivi client est fait à partir des liens réels validés par `site/achat-partenaires.js` ; l'événement d'intérêt prend la forme `amazon:<identifiant-public-de-montre>:showroom` et n'ajoute aucune URL d'achat, adresse, nom, e-mail ou donnée de paiement.
- Le navigateur reste libre de bloquer les statistiques ; le clic vers le vendeur n'est **jamais** retardé ou remplacé.
- La génération HTML est idempotente : un rebuild avec Umami n'insère pas deux scripts ; une désactivation supprime les scripts et remet la notice de confidentialité en mode sans statistiques.
- Le site reste indépendant de Shopify ; aucun changement au checkout inactif ni aux règles de sécurité CJ.

Les tests `scripts/check-affiliate-publication.mjs`, `scripts/check-merchant-analytics.mjs` et `scripts/validate-seo.mjs` vérifient l'injection conditionnelle, le respect de Do Not Track, l'absence de doublons et le nom d'événement de la vraie référence Citizen Tsuyosa.

## Mesurer les résultats réels

Pour activer les statistiques, il faut un **Website ID Umami issu du compte légitime du commerçant**, puis l'enregistrer dans les variables d'environnement de la vitrine Render. **Aucun identifiant n'est généré ou deviné automatiquement.** Le déploiement vérifie son format. Le logiciel de mesure peut être désactivé immédiatement en supprimant la variable.

Une fois les statistiques disponibles, comparer pour chaque modèle :
1. Vues de la page d'achat et clics `amazon:<id>:showroom` (intention de quitter notre site vers un marchand).
2. Dans le tableau de bord **Amazon Partenaires France**, les rapports de commandes éligibles, retours, articles expédiés et commissions **réellement acquises**.
3. Utiliser des fenêtres temporelles cohérentes ; les clics Umami ne peuvent pas être joints à une commande Amazon individuelle et ne démontrent pas la rentabilité du programme.

## État de déploiement

L'activation des statistiques nécessite toujours la vérification des obligations de transparence et de protection de la vie privée ; elle n'est pas provoquée par la fusion de ce changement. Le site continue d'afficher uniquement les offres documentées et laisse le client payer chez le vendeur partenaire.
