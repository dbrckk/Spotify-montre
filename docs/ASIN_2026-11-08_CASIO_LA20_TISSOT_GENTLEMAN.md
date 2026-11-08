# Atelier Montres — Deux correspondances Amazon.fr supplémentaires (8 novembre 2026)

## Décision de publication

Deux fiches marchandes sont identifiées par **redirection Amazon.fr d'un comparateur**, et corroborées par une autre source liant le **même ASIN** à la référence fabricant. Une redirection de comparateur n'est **pas** une inspection directe d'Amazon.fr et n'établit **jamais** la disponibilité de la montre, le prix, l'identité du vendeur, les délais ou une commission.

Le registre commercial passe de **25 à 27 ASIN documentés** sur **52 références** : 13 historiques et 14 supplémentaires. Les 23 autres montres complémentaires restent assorties d'une recherche explicitement étiquetée ou d'une source fabricant selon les modes d'affiliation disponibles. Le paiement sur Atelier Montres reste désactivé.

| Modèle | Code sur Amazon / variante régionale | ASIN | Source de redirection | Corroboration |
|---|---|---|---|---|
| Casio LA-20WH-4A1 (rose) | LA-20WH-4A1EF | `B077YZHF21` | [123comparer](https://www.123comparer.fr/Montres-femme/go4ueqjige5dnpt38yhur.html) | [Preisgenau](https://www.preisgenau.de/1290344851-product) : ASIN et MPN `LA-20WH-4A1EF`, EAN `4549526169892` |
| Tissot Gentleman Powermatic 80, cadran bleu | T1274071104100 (T127.407.11.041.00) | `B07XTVQ3W7` | [123comparer](https://www.123comparer.fr/Montres-homme/gh5dncjsgyhdrqj1gahug.html) | [Preisgenau](https://www.preisgenau.de/1648823068-product) : ASIN, MPN complet et EAN `7611608292693` ; [Vivre Riche](https://www.vivre-riche.com/test-de-la-montre-automatique-tissot-gentleman-t127-407-11-041-00) recoupe également les codes |

### Méthode reproductible

1. Ouvrir la page du comparateur, relever le modèle et la variante affichés.
2. Suivre le **lien commercial Amazon** de la fiche. Lors du contrôle du 08/11/2026, la redirection aboutissait respectivement à `https://www.amazon.fr/dp/B077YZHF21` et `https://www.amazon.fr/dp/B07XTVQ3W7` (sans conserver les paramètres d'affiliation du comparateur).
3. Ouvrir Preisgenau, rechercher chaque ASIN et vérifier l'identité du modèle, le MPN et l'EAN.
4. Consigner les limites : aucune page Amazon.fr n'a pu être consultée directement de façon stable ; les prix rapportés par les comparateurs avaient une date de relevé antérieure au contrôle et ne doivent **pas** être republiés.
5. Les associations sont publiées exclusivement par `research/amazon-fr-popular-verified.json` et le validateur `scripts/popular-verified-affiliate.mjs`. Le nom du modèle régional est visible sur les fiches client ; le statut du stock reste inconnu.

## Ne pas promouvoir sans preuve supplémentaire

- `seiko-5-srpk29` : source Amazon.fr disponible mais offre marquée **indisponible** par le comparateur.
- `skmei-2056` : variante blanche transparente SKM-2056F01 antérieurement signalée indisponible ; ne pas généraliser l'ASIN à toutes les couleurs.
- `citizen-promaster-bn0150` : source ASIN tierce mais pas de redirection Amazon.fr actuelle confirmée.
- `seiko-presage-srpe43` : ASIN cité par une revue mentionnant Amazon.fr mais pas de seconde redirection Amazon.fr actuelle confirmée ; le comparateur référence d'autres détaillants.

Ces pistes restent dans `research/amazon-fr-popular-asin-candidates.json` et sont bloquées pour les liens directs.

## Contrôles de qualité

- 52 montres, 27 codes de fiche documentés, 23 recherches complémentaires : compte exact sans omission ni double comptage.
- Validation du code fabricant, domaine HTTPS, ASIN unique, source du comparateur, preuve indépendante et variante affichée.
- Tests navigateur Android/desktop des URL exactes, des attributs `rel=sponsored`, des informations de prudence et des exclusions de candidats.
- Attribution `site/analytics.js` alignée sur la liste source. Un clic n'est pas une vente.
- Vérification sur Render du HTML des fiches, du catalogue 52 modèles, des CSS/JS publiés et des performances Lighthouse avant déclaration de succès.

À cette date, l'état du compte Partenaires Amazon (`approved: false` / `enrolled_approval_unverified`) reste inchangé. Les revenus, l'approbation et l'existence d'une offre réellement achetable ne peuvent être déduits du site.
