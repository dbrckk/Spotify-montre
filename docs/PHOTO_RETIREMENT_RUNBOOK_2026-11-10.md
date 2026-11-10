# Atelier Montres — retrait physique contrôlé d'une photographie

**R1 · 10 novembre 2026 · publication actuelle non modifiée**

## Périmètre

Le catalogue contient toujours 52 références, avec ou sans photo publiée. En cas de demande de retrait authentique, ce mécanisme retire **une seule photographie exacte et ses dérivés**. Il ne publie pas une autre photographie à sa place, ne crée aucune autorisation et n'active jamais le paiement.

Les 40 photographies actuellement déclarées publiables ne disposent pas, dans le registre actuel, de preuves tierces indépendantes : le statut de publication reste **déclaratif**, et ne remplace pas une licence ou une revue juridique.

## Préparer sans modifier les fichiers

Depuis le dépôt :

```bash
npm run compliance:photo:retire:preview -- --id skmei-1251
```

La commande vérifie : modèle existant, publication active, WebP exact, empreinte SHA-256 et inventaire des variantes. Elle retourne `operation=preview_only`, `cdnPurged=false`, `liveRemovalVerified=false`.

## Déclencher depuis Android (uniquement après une demande de retrait validée)

Dans GitHub > Actions > **Prepare exact watch-photo retirement PR (manual)** > Run workflow :

1. `watch_id` : identifiant exact, par exemple `skmei-1251`.
2. `confirmation` : `RETIRER:skmei-1251`.
3. L'action vérifie d'abord l'image, crée une branche isolée, retire original + variantes, bloque la re-synchronisation, reconstruit les pages et les archives, puis exige les tests.
4. Si les tests réussissent, elle crée **une pull request à examiner**. Elle ne fusionne pas la PR et ne déclenche pas intentionnellement un retrait direct en production.

**Ne pas déclencher sans motif vérifié et identifiant correct.** Les refus et les erreurs doivent laisser `main` inchangé. Aucun droit photographique ne doit être déclaré comme approuvé automatiquement.

## Acceptation de la PR

- Vérifier la demande du titulaire de droits hors dépôt public ; ne pas publier de pièce privée, email ou coordonnées personnelles dans une PR.
- Vérifier que le modèle ciblé a toujours sa fiche et que le catalogue compte 52 références ; conserver sa destination fabricant valide.
- S'assurer que `photo-takedowns.json` contient le retrait ciblé et que les photos (WebP original, thumb, dérivés responsive) ne sont plus dans la PR.
- Exiger `npm test`, `node scripts/validate-seo.mjs`, la vérification du package et les contrôles navigateur/Android pertinents.
- Examiner le diff ; fusionner seulement après validation des droits, des sources et des contrôles.

## Après fusion : preuve indispensable côté hébergement

Le retrait dans GitHub **ne prouve pas** le retrait sur Render/CDN ou d'anciennes URLs.

- Vérifier que le nouveau commit est bien `live` sur Render, et que la page du modèle reste accessible.
- Vérifier chaque ancienne URL exacte du modèle (original et dérivés) sur `https://atelier-montres-selection-fr.onrender.com/` : elles ne doivent plus servir le média retiré.
- Ne pas se contenter d'une réponse HTTP 200 ou d'une page d'accueil actualisée. Contrôler la réponse et l'absence de bytes du média révoqué ; une URL peut rendre une page de repli.
- Rechercher les anciens médias via CDN et caches ; engager la purge auprès de l'hébergeur si une ancienne URL conserve le fichier.
- Archiver hors dépôt public les preuves datées du contrôle, la demande reçue et l'éventuelle résolution. Si l'ancienne URL reste accessible, traiter le retrait comme **incomplet** et ne pas affirmer le contraire.

## Protections / limites

- Les scripts de synchronisation passent sur les médias principaux lorsque `photoReview.publicUsageApproved !== true` ; pour les 37 références complémentaires, `photoPublicationBlocked=true` interdit la reconstitution. Un registre permanent `site/photo-takedowns.json` trace les retraits.
- L'outil refuse les identifiants inconnus, les SHA incohérents, les tentatives de retrait répétées et l'exécution sur `main`.
- Les tests automatisés utilisent **des copies temporaires** : ils ne suppriment pas les 40 photos actuellement exposées.
- La procédure n'est pas une revue juridique, ni un système de purge de CDN, ni une preuve d'absence de copies tierces.
