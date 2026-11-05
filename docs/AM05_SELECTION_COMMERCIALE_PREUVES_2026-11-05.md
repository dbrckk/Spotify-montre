# AM-05 — Sélection commerciale fondée sur des preuves

**État au 5 novembre 2026 — dépôt `dbrckk/Spotify-montre`.**

## Pourquoi modifier la vitrine

Le catalogue possède **52 montres éditoriales** (15 historiques et 37 complémentaires). La page `montres/modeles-populaires.html` met déjà en avant 10 modèles, mais les montres avec une fiche Amazon.fr correspondant à leur code et les montres disposant seulement d’une source marchand/fabricant étaient mélangées, sans parcours d’achat clairement hiérarchisé.

Cette évolution **ne recherche pas des best-sellers français** et ne présente aucune donnée sur les ventes réalisées, les prix actuels, le stock ou les commissions.

## La sélection en deux parcours

Les informations de la liste sont calculées à la génération depuis **les mêmes registres vérifiés** que les liens marchands, pas depuis un champ « prêt à acheter » saisi manuellement.

### Parcours A — 6 modèles avec ASIN Amazon.fr documenté

| Identifiant | Rôle éditorial | Limite commerciale |
| --- | --- | --- |
| `addiesdive-ad2030` | Cadran compact et épuré | Variante et vendeur à vérifier |
| `pagani-pd1701` | Chronographe sport | Génération et variante à vérifier |
| `skmei-1257` | Numérique noire sport | Finition et étanchéité à vérifier |
| `casio-f91w-1` | Numérique classique | Code régional à vérifier |
| `casio-ga-2100-1a1` | G-SHOCK analogique/numérique | Variante régionale à vérifier |
| `casio-gw-m5610u-1` | G-SHOCK solaire et radiopilotée | Variante régionale à vérifier |

Sources : `research/amazon-fr-popular-verified.json` et `scripts/popular-verified-affiliate.mjs`. Les ASIN sont datés et rapprochés de références documentées ; **leur prix, stock et livraison France ne sont pas confirmés en direct**. Une fiche Amazon peut évoluer ou changer d’ASIN. Le compte Amazon du site n’est pas confirmé comme approuvé définitivement ; aucune commission n’est prouvée.

### Parcours B — 4 modèles avec source vendeur ou fabricant

| Identifiant | Rôle éditorial | Limite commerciale |
| --- | --- | --- |
| `skmei-2056` | Numérique transparente | Pas d’ASIN exact confirmé |
| `skmei-2256` | Analogique acier accessible | Pas d’ASIN exact confirmé |
| `skmei-2514` | Rétro numérique acier | Pas d’ASIN exact confirmé |
| `pagani-pd1776` | Montre compacte habillée | Pas d’ASIN exact confirmé |

La mise en avant de ces quatre modèles ne doit pas faire croire à une offre Amazon directe, à des frais de livraison connus ou à une commission.

## Livraison dans le code

- Source éditoriale **10 modèles, sans duplication** : `scripts/build-commercial-shortlist.mjs`.
- La génération construit deux listes HTML accessibles en fonction de l’existence effective des liens documentés. Un lien absent est reclassé comme **source à explorer** : pas de CTA rémunéré fictif.
- Repères distincts dans chaque fiche : **« ASIN Amazon.fr documenté · variante et stock actuel non confirmés »** ou **« Source vendeur ou fabricant · aucun ASIN exact établi »** ; liens fabricant, détails et comparaison disponibles.
- Sur l’accueil, le teaser annonce les **vrais comptes 6 / 4** lorsque les sorties affiliées sont activées, avec accès direct à la sélection.
- Grille CSS légère, cohérente avec le système existant, adaptée aux téléphones 320 / 393 px et sans JavaScript obligatoire.
- Contrôles `validate-seo.mjs` et `test-intent-collections-browser.mjs` : identité des 10 modèles, classement de preuve, 6 ASIN, 4 sources, absence de débordement, navigation, comparaison et fonctionnement sans JS.

## Ce qui reste à compléter pour l'objectif AM-05

1. Recontrôler auprès des vendeurs les variantes et l’expédition France des modèles candidats ; conserver les preuves **horodatées**, sans « stock en temps réel » imaginé.
2. Vérifier les droits de reproduction de chaque image au-delà des autorisations **déclarées** par l’éditeur ; aucune autorisation indépendante n’est déduite de la simple présence d’un fichier local.
3. Unifier progressivement le **registre de statut commercial des 52 références** : source constructeur, preuve photo, ASIN daté, lien rémunéré déclaré, disponibilité non synchronisée, statut fournisseur CJ. Ne pas confondre `site/catalogue.json` (préparation vente directe) et le catalogue éditorial déjà publié.
4. Après activation légitime d’outils de mesure et validation des comptes, examiner séparément les clics, les commandes éligibles et les commissions **effectivement réglées**.
5. Une vente directe ne peut être ouverte sans devis CJ complet, conformité, identité vendeur et paiement marchand opérationnel.

Aucun paiement, commande CJ ni synchronisation de stock n’a été tenté pour cette évolution.
