# P0 — Transparence commerciale et informations légales (31 octobre 2026)

## Réalisé dans cette modification
- Une page publique `/informations-legales.html` accessible depuis les footers statiques et les pages générées, **explicitement signalée comme incomplète**. Il ne s'agit pas d'une certification juridique.
- Mise à jour de `/confidentialite.html`, distinguant `localStorage` (favoris / historiques / préférences), `sessionStorage` (comparaison), assistant local, hébergement Render, affiliation possible et services encore inactifs.
- Suppression de la mention obsolète « liens externes non rémunérés » du pied de page de `montre.html`. Les liens Amazon réellement actifs restent marqués individuellement.
- Le générateur de pages indexables et le contrôle SEO vérifient désormais la présence des liens légaux et l'absence d'ancienne mention contradictoire.
- Aucun nom de responsable, adresse, numéro de téléphone, SIREN, licence photo ou validation Amazon n'a été fabriqué.

## Blocages réels — publication d'une version juridique complète
Les mentions obligatoires d'un site internet professionnel français dépendent du statut de l'éditeur. Les éléments suivants nécessitent une **source réelle** :
1. Identité de l'éditeur (personne physique ou morale), statut légal et les informations de registre/TVA qui s'appliquent.
2. Coordonnées professionnelles et identité du directeur de publication le cas échéant.
3. Informations de l'hébergeur : dénomination légale, adresse et téléphone vérifiés.
4. Base juridique/coordonnées de contact et informations sur les traitements de données, vérifiées selon la configuration de production et les outils de mesure réellement activés.
5. Contrats/autorisations de reproduction des photographies : conserver les justificatifs en privé, hors dépôt public.

**Ne pas déclarer P0 juridique terminé tant que ces données ne sont pas complètes.** La nouvelle page est volontairement `noindex,follow` pendant cette phase.

## Références réglementaires
- Service Public, « Mentions obligatoires sur le site internet d'une entreprise », mis à jour le 13/10/2026 : https://entreprendre.service-public.gouv.fr/vosdroits/F37351
- Page éditeur du site : `site/informations-legales.html`
- Politique des données : `site/confidentialite.html`
- Dossier des preuves des photos : `docs/audit-preuves-montres-2026-10-31.md`

## Gate de vérification
Exécuter `npm test`, puis `node scripts/build-seo.mjs && node scripts/build-seo.mjs && node scripts/validate-seo.mjs`. Vérifier la production sur Render **après publication**, sans prétendre que la branche de travail est déjà déployée.
