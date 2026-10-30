# Validation de candidature Amazon Partenaires France — Atelier Montres

Date : 30 octobre 2026.

## Ce que ce dépôt peut vérifier

**Site candidat :** https://atelier-montres-selection-fr.onrender.com/

Le site public doit présenter au minimum :
- une sélection originale, des comparatifs factuels et des guides d'achat présentant une valeur ajoutée ;
- des liens qui mènent à la **référence exacte** du produit, et aucune information de prix, d'avis ou de disponibilité inventée ;
- des photos dont le responsable affirme détenir le droit de publication, avec des justificatifs archivables hors Git ;
- une séparation explicite entre une photo constructeur et du contenu marketing Amazon fourni dans le cadre de son programme ;
- des informations de transparence commerciale et, dès activation de liens rémunérés, la mention officielle Amazon au plus près des liens.

Le catalogue comporte 15 références, 4 guides, 4 comparatifs, un conseiller et 25 URL au sitemap. **Le simple nombre d'URL ne prouve pas la qualité ni les dix publications originales demandées par Amazon.** Lire et enrichir les textes si nécessaire.

## État effectif du compte

Le fichier `site/affiliate-links.json` est désactivé et ne contient aucun lien spécial actif : `enabled:false`, `approved:false`. Le tag `drackk04-21` mentionné dans `research/amazon-fr-exact-products.json` est une **piste de recherche**, et son appartenance au responsable du site ainsi que son éligibilité n'ont pas été vérifiées. Il ne faut pas le déclarer approuvé ou l'activer par simple substitution.

La recherche contient 13 URL Amazon.fr directes associées à des ASIN correspondant aux modèles, et deux modèles sans référence Amazon confirmée. Les 13 liens actuellement publics sont **non balisés et non rémunérés**. La disponibilité des annonces peut changer.

La photographie des 15 références est maintenant activée **sur déclaration expresse du responsable** du 30 octobre 2026 ; les fichiers conservés dans Git sont ceux de cette sélection. Cela ne constitue **pas** une attestation indépendante du fabricant. Les originaux provenant de revendeurs ou de distributeurs nécessitent l'accord du titulaire des droits concerné. Ne pas remplacer des photos par du contenu d'Amazon récupéré hors des outils et licences autorisés.

## Procédure officielle d'examen Amazon

Référence principale : https://partenaires.amazon.fr/help/node/topic/G8TW5AE9XL2VX9VM

Amazon demande au moins **trois ventes éligibles pendant les 180 jours suivant l'inscription** avant l'examen. Les achats personnels ne sont pas éligibles. Le site doit fournir du contenu original significatif (Amazon indique au moins dix publications). L'examen et la décision relèvent exclusivement d'Amazon. Une inscription ou un tag de suivi ne prouvent donc **pas** l'approbation définitive.

### Actions côté compte (Android possible)

1. Ouvrir https://partenaires.amazon.fr/ dans le navigateur, se connecter au compte du programme et vérifier si une candidature existe déjà avant de refaire une inscription.
2. Ajouter exactement `https://atelier-montres-selection-fr.onrender.com/` parmi les sites déclarés. Fournir des informations exactes sur le responsable, son activité et le contenu. Les informations personnelles, bancaires et fiscales se saisissent dans les formulaires **Amazon**, pas dans GitHub.
3. Relever **dans le tableau de bord** l'identifiant partenaire exact et l'état de candidature. Le tag de recherche `drackk04-21` ne doit être utilisé que s'il appartient au compte et que ses liens spéciaux sont autorisés pendant cette étape.
4. Créer de vrais **liens spéciaux** sur les fiches exactes à partir des outils autorisés d'Amazon (par exemple SiteStripe lorsqu'il est disponible) et vérifier chaque ASIN et chaque destination. Les conditions du programme exigent de les identifier comme « lien rémunéré ».
5. Quand la participation permet la publication de ces liens, configurer **explicitement** les ASIN, les URL spéciales, les dates de vérification et les indicateurs d'autorisation dans `site/affiliate-links.json`. La validation automatique du dépôt refuse toute URL non Amazon.fr, tout tag différent et tout ASIN ne correspondant pas à la recherche. Ne pas passer `approved:true` si le compte ou l'usage de liens spéciaux n'est pas autorisé.
6. Une fois la candidature soumise et le site éligible, obtenir les ventes éligibles sans achats personnels, trafic artificiel ni incitation prohibée. Contrôler les résultats et l'état de l'examen **sur le tableau de bord officiel**. Les commissions ne sont jamais déduites des seuls clics enregistrés côté site.

## Transparence et prévention de l'erreur

Amazon demande la phrase « En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises. » et une indication visible des liens rémunérés. Le générateur affiche la divulgation lorsque de vrais liens spéciaux sont configurés et autorisés. Source : https://partenaires.amazon.fr/help/operating/agreement

Le programme Amazon ne permet pas d'encaisser les commandes d'Amazon directement sur Atelier Montres : le paiement et la livraison du vendeur sont assurés par Amazon ou les tiers marchands. Une vente propre sur le site exige une architecture et une responsabilité commerciale distinctes.

## Validation automatique, sans révéler de secrets

Depuis le dépôt, lancer `npm run affiliate:status`. Sur Android : **GitHub > Actions > SEO storefront checks > dernière exécution > Summary**. Le rapport distingue : autorisation des photos **déclarée**, preuve de licence **vérifiée**, liens spéciaux **configurés**, et approbation **déclarée**, sans usurper un statut délivré par Amazon.

Les tests bloquent l'activation lorsque l'identifiant, la référence, le tag, le domaine ou les droits de publication ne satisfont pas au schéma attendu. Aucun code du dépôt n'accède à votre tableau de bord Amazon ni ne peut en confirmer seul le statut.
