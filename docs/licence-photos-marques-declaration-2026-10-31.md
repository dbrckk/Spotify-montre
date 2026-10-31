# Photographies commerciales — autorisation déclarée par le propriétaire (31 octobre 2026)

## Déclaration reçue

Le propriétaire d'Atelier Montres a indiqué le 31 octobre 2026 que **toutes les marques représentées lui ont donné leur autorisation** pour utiliser leurs photographies sur ce site.

Cette indication constitue une **attestation de l'exploitant**, pas une preuve de licence écrite vérifiée par le dépôt ou par l'assistant. Elle ne doit pas être publiée sous la forme « permission écrite vérifiée » ni confondue avec un accord d'Amazon.fr pour recopier son contenu publicitaire. L'exploitant doit conserver les conditions reçues (marques, photographies, durée, territoires, usages commerciaux et éventuelle révocation).

## Workflow technique

- `scripts/sync-popular-watch-images.py` : parcourt les 37 fiches produits complémentaires avec la référence exacte, refuse les pages/URLs ne correspondant pas au modèle, extrait seulement les images des fiches et des galeries produit, télécharge les images depuis le domaine de la fiche ou un CDN commercial autorisé, vérifie MIME et résolution, transforme en WebP de 1200 px maximum et écrit le SHA-256.
- `site/popular-photo-rights.json` : enregistre chaque résultat réellement disponible sous `site_owner_attested_brand_authorization`, avec `permissionIndependentlyVerified:false`, la source et la licence déclarée. Aucune empreinte de document écrit n'est inventée.
- `scripts/popular-photo-rights.mjs` : conserve la validation stricte de modèle, fichier, intégrité et provenance. Les anciennes autorisations écrites signées restent un cas distinct; les photographies non enregistrées ne sont pas publiées.
- `scripts/build-popular-picks.mjs`, `scripts/build-popular-product-pages.mjs` et `scripts/build-shopper-selections.mjs` : affichent une vraie image locale seulement lorsqu'elle figure dans le registre validé, y compris dans les pages femme, homme et automatique.
- `.github/workflows/source-popular-watch-photos.yml` : s'exécute sur `main` après intégration ou sur lancement manuel, construit et valide le site, puis publie les WebP et les paquets statiques avec les sources.
- `docs/popular-watch-photo-report.json` : contient les modèles réussis et ceux pour lesquels aucune photo fiable n'a été trouvée.

## Règles qui ne changent pas

1. Ne jamais copier un visuel Amazon.fr ni inventer une référence commerciale, une couleur, un prix ou un stock.
2. Ne pas utiliser une image prise sur une page de résultat générique, un logo ou un autre modèle. Ne pas contourner une restriction technique ou un refus d'accès.
3. Une fiche indisponible, un visuel ambigu ou un téléchargement échoué reste illustré par le repère graphique non contractuel existant; cela ne bloque pas l'ensemble du site.
4. Les utilisateurs sont informés que les autorisations des marques sont **déclarées par l'éditeur, non vérifiées indépendamment**.
5. Chaque photo peut être désactivée en retirant son entrée de registre et son WebP.
6. Les rapports de déploiement distinguent les 15 modèles principaux déjà photographiés des 37 modèles complémentaires.

## Vérification

```bash
python scripts/sync-popular-watch-images.py
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
node scripts/check-affiliate-publication.mjs
python scripts/build-shipstatic-bundle.py
```

GitHub Actions dispose du réseau pour télécharger les visuels. La session de travail ChatGPT ne peut pas télécharger ces images depuis les serveurs externes; le workflow est donc l'exécuteur prévu. L'absence de résultat de ce workflow ne signifie **pas** que les photos ont été publiées.
