# Photographies réelles — recherche et contrôle des droits (26 octobre 2026)

## Livraison

**Galerie privée déployée :** https://hybrid-mote-39z4dce.shipstatic.com — accès protégé par mot de passe partagé avec le propriétaire. Le déploiement est confirmé `success`, expiration `null`.

Le tableau `site/selection-affiliation.json` référence **15 images réelles de 15 montres exactes**, sous `products[].photoReview` :
- `url` : source distante de la photo originale (aucun téléchargement / fichier image copié dans le dépôt) ;
- `source` : page ayant permis de vérifier la référence ;
- `provider` : marque ou vendeur ;
- `accuracy: "exact"` : correspondance de référence contrôlée ;
- `licence: "permission_required"` et `publicUsageApproved: false` : utilisation publique commerciale non autorisée.

**Statut de livraison :** la galerie PRIVÉE contient les vraies images en chargement direct depuis leur fournisseur. Certaines origines peuvent bloquer l'incorporation par un domaine tiers ; la galerie signale cette panne et garde un lien vers la fiche source. Le front-end public `site/affiliation.js` continue de montrer les illustrations locales et donne l'accès aux photographies officielles via les liens.

## Sélection photographique
Privilégier un packshot face ou 3/4 net et à fond clair, au rendu homogène, sans supprimer les logos réels ou modifier la forme des montres. Les images spécifiques sont consignées dans les métadonnées. Les fiches de marques sont accessibles directement depuis chaque carte.

La recherche couvre :
- 5 Casio (MTP-1302PD-2A2V, MTP-B145D-2A2V, A168WA-1, MDV-107-1A1V, LTP-1302PD-7A1V) ;
- Swatch Clearly Gent SO28K100-S06 ;
- Citizen Eco-Drive AW0100-86EC (photo détaillant identifié), Open Heart NH9131-73L, Tsuyosa NJ0150-81X ;
- Orient Bambino 38 RA-AC0M12L ;
- Seiko 5 Sports SRPD55, Presage Sharp Edged SPB165J1 ;
- Tissot PRX Quartz T1374101104100 et Powermatic 80 T1374071104100 ;
- Hamilton Khaki Field Auto H70455133.

## Conditions avant intégration publique
1. Obtenir un **compte partenaire approuvé** Amazon Partenaires / Awin ou une autorisation écrite du fabricant/distributeur pour la présentation commerciale des visuels.
2. Vérifier exactement quelles images le programme permet d'intégrer, sous quelle forme (URL officielle, API, pack média), sur quels domaines, avec quelles durées/cache/mentions.
3. Enregistrer l'autorisation et son périmètre, remplacer alors la restriction `publicUsageApproved` par un statut auditable et ne publier que les images effectivement couvertes.
4. Respecter les crédits et les logos ; ne pas refaire un cadran original à partir d'un autre modèle.
5. Gérer les images bloquées et les changements d'URL par un fallback vers le fabricant.
6. À terme, lorsque la boutique maison possède réellement ses échantillons, prendre **nos propres photographies** sur fond homogène et utiliser ces photos originales.

## Pourquoi les sources seules ne suffisent pas
Casio indique que copier et réutiliser ses images sur un site tiers nécessite son autorisation expresse : https://www.casio.com/fr/terms/ . Tissot interdit aussi la reproduction et la présentation de ses contenus hors autorisation : https://www.tissotwatches.com/en-us/terms-of-use.html .

Même une URL ouverte et un visuel techniquement affichable ne signifient donc pas que son utilisation commerciale est autorisée. Un flux produit destiné à des affiliés peut fournir une autorisation sous licence limitée lorsque le compte est validé.

## Validation automatique
`npm test` exécute `scripts/validate-photo-review.mjs` pour garantir les 15 URLs HTTPS, le bon nombre de produits (6/6/3), la transparence des droits, l'absence de copie, et l'état public inchangé tant que les permissions ne sont pas acquises. Le site de revue est conçu pour être déployé **avec un mot de passe**, sans publication de la galerie privée dans le menu public.
