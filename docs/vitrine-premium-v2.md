# Version premium statique — fonctionnalités et procédure de lancement

Statut validé le 26 octobre 2026 : **vitrine v2 déployée**, aucun produit marchand actif.

Vitrine : https://melded-fog-nbu4dy7.shipstatic.com
Dépôt : https://github.com/dbrckk/Spotify-montre

## Réalisé sur la vitrine
- Identité visuelle vert profond/doré, illustration horlogère CSS sans dépendance payante, adaptation mobile, typographie éditoriale, navigation.
- Sections pédagogiques : inspirations colorées, démarche de sélection, contrôles qualité, préparation du stock en France.
- FAQ interactive native accessible (`<details>`/`<summary>`).
- **Chatbot fonctionnel local** : questions en texte et boutons rapides ; répond aux FAQ depuis des règles déterministes. Il ne consulte pas les commandes, n'utilise pas d'IA distante et ne conserve aucune conversation sur un serveur.
- **Newsletter prête à être raccordée**, actuellement **non active**. Son bouton reste invisible tant qu'aucune URL d'inscription validée n'a été configurée.
- Transparence vie privée : page dédiée, aucun tracker ajouté, pas de cookies de publicité, aucune adresse collectée par le chatbot.
- Catalogue et achat toujours fermés jusqu'à fournisseur, stock, contrat de vente, paiement et conformité réellement confirmés.
- Favicon SVG, balises OG, amélioration du focus clavier, animations réduites.
- GitHub Actions : validation thème historique + structure du site + syntaxe JS + **tests dynamiques de chatbot et de sécurité de newsletter**.

## Architecture et fichiers
- `site/index.html` : page principale, contenus, balisage sémantique.
- `site/features.css` : nouvelles sections responsives et dialogue.
- `site/app.js` : chatbot local et activation contrôlée du lien newsletter.
- `site/config.json` : statuts commerciaux et fournisseur newsletter ; ne jamais y stocker de clé privée.
- `site/confidentialite.html` : information technique non substitutive aux mentions légales définitives.
- `site/favicon.svg` : identité favicon.

## Newsletter réellement opérationnelle, sans abonnement
**Prestataire recommandé : Brevo** (France). Offre gratuite, au 26/10/2026 : 300 emails/jour (limite d'envoi), hébergement du formulaire, double confirmation et désinscription. Sources :
- https://help.brevo.com/hc/fr/articles/208589409-%C3%80-propos-des-offres-d-abonnement-de-Brevo
- https://help.brevo.com/hc/fr/articles/208771869-Cr%C3%A9er-un-formulaire-d-inscription-dans-Brevo

Action propriétaire indispensable pour mettre la newsletter en service :
1. Créer/valider le compte Brevo à https://www.brevo.com/fr/ , puis Marketing > Formulaires > créer un formulaire d'inscription.
2. Activer **confirmation double**, champ de consentement RGPD et lien vers la politique de confidentialité complète avec identité de l'éditeur, et configurer la liste et la désinscription.
3. Copier **l'URL HTTPS hébergée du formulaire**. Dans `site/config.json`, renseigner `newsletterUrl` (hôte autorisé : `sibforms.com`, `brevo.com` ou `buttondown.com`, et leurs sous-domaines ; les hôtes trompeurs sont refusés).
4. Redéployer ces fichiers et tester inscription → email de confirmation → confirmation → liste CRM et désinscription. Ne jamais envoyer une API key Brevo dans le front-end ou dans le dépôt public.

**Aucune adresse n'est collectée tant que la configuration ne pointe pas vers le fournisseur.**
Il n'existe pas de fausse inscription donnant l'illusion que l'email a été enregistré.

## Chatbot : limites volontaires
Les réponses portent sur la préparation des montres, le niveau d'ouverture, le budget, la livraison envisagée, les conditions de retour, les tailles et la newsletter. Tout est local à la page : pas d'historique serveur, pas d'API IA payante. Un prochain vrai support client avec lecture des commandes nécessite authentification et backend sécurisé : ce n'est **pas** déjà fourni.

## Assurance qualité
`npm test`
- Validation JSON/Liquid du thème historique,
- validation markup, CSS responsive, liens d'information et newsletter désactivée sans fournisseur,
- analyse syntaxique `node --check site/app.js`,
- exécution JS en contexte DOM simulé : ouvrir/fermer le chatbot, réponse livraison/retours, sécurité d'affichage `textContent`, touche ESC et hôte newsletter frauduleux.
Les tests ne remplacent pas un audit d'accessibilité complet, un test visuel sur Android ou un essai de paiement Square.

## À faire avant d'ouvrir les ventes
1. Fournisseur et montres **authentiques et conformes à la réglementation UE**, modèle, coût et stock confirmés.
2. Identité juridique, mentions légales, CGV, confidentialité détaillée, politique de livraison/retours, TVA/REP selon le cas.
3. Compte Square validé et URL de boutique HTTPS réelle `*.square.site`.
4. `site/config.json` basculé à `status:"open"` avec URL Square vérifiée, après simulation d'une commande complète.
5. DNS / domaine personnalisé (facultatif, payant selon fournisseur).
6. Test sur plusieurs navigateurs et un appareil Android, sécurité, libellés, taux de conversion.

Ne pas présenter les visuels conceptuels des cadrans comme des photographies des produits réellement vendus. Ne pas afficher de prix, stock ou avis inventés.
