# Atelier Montres — Découverte et parcours d'affiliation (31 octobre 2026)

## Problème observé dans le dépôt

La G-SHOCK GW-M5610U-1 possède une correspondance d'ASIN Amazon.fr documentée (`B09BCPP68Q`) dans `research/amazon-fr-popular-verified.json`, mais les six cartes sélectionnées de la page d'accueil l'omettaient. Les 13 montres complémentaires étaient uniquement classées par trois gammes sans moyen de filtrer par style, mouvement ou référence ; cela exigeait un long défilement sur Android.

## Correction terminée

- **Huit cartes de découverte dans l'accueil** avec répartition entre sportive, rétro, compacte, acier, automatique et habillée. La G-SHOCK GW-M5610U-1 est présentée en premier avec un libellé précis : « Fiche de référence Amazon.fr identifiée · prix et stock à vérifier ».
- **Une seule sortie Amazon.fr directe** parmi ces cartes : `https://www.amazon.fr/dp/B09BCPP68Q?tag=drackk04-21`, source enregistrée et validée par le registre du dépôt. Les **sept autres cartes** continuent à annoncer explicitement une **recherche**, pas une fiche exacte.
- **Une sélection complémentaire filtrable** sur `/montres/modeles-populaires.html` : recherche locale par marque, modèle ou usage, trois gammes, cinq styles et trois catégories de mouvements documentés. Aucun tri de prix, de popularité ou d'avis : ces données ne sont pas vérifiées.
- **Résultat compté en direct**, zone accessible `aria-live`, message d'absence de correspondance, réinitialisation, maintien des liens de navigation par gamme. Les 13 pages de modèles restent indexables, accessibles sans filtre, et le sitemap reste inchangé à **43 URL**.
- **Aucun nouveau droit d'image supposé** : les treize présentations conservent leurs repères typographiques originaux, et la fiche fabricant reste la source des vraies photographies. Les quinze photos du comparateur principal ne changent pas.
- **Sans JavaScript : les treize cartes restent consultables**, les commandes interactives sont masquées, les treize sorties Amazon (1 fiche + 12 recherches) restent disponibles.
- **Vie privée et performance :** le filtre lit les seules cartes déjà livrées et ne transmet ni termes de recherche ni préférence à un service extérieur ; pas de cookie, serveur, librairie, appel API, stockage ou suivi de profil supplémentaire. Script de 2,4 Ko sans dépendance.

## Cas de test requis

1. Génération SEO idempotente et validation des 43 URL.
2. Huit cartes nouvelles sur l'accueil ; une seule présente le lien direct vérifié, les sept autres sont des recherches Amazon clairement signalées.
3. 13 montres initialement visibles, les trois gammes présentes, filtre sport = 3, puis Signature + sport = 2, puis solaire = 1 (GW-M5610U), recherche inexistante = 0.
4. Reset = 13. Recherche accentuée « Tsuyósa » = seule Citizen Tsuyosa. Les liens vers les trois gammes doivent réafficher les sections.
5. Les mêmes 13 cartes et leurs sorties restent accessibles avec JavaScript désactivé.
6. Navigation tactile Android, 320 px, WCAG (axe-core, clavier, contraste, agrandissement), Lighthouse et production Render après fusion.

## Risques encore ouverts

La correspondance enregistrée pour la G-SHOCK provient d'une source Amazon.fr antérieure ; **prix, disponibilité, vendeur, statut du compte Partenaires et montant de commission ne sont pas validés**. Les douze autres montres n'ont pas d'ASIN Amazon.fr confirmé, même si d'autres marchés ou sources secondaires peuvent suggérer des candidats. Ne pas convertir ces recherches en liens directs sans rapprochement exact du code et de la variante. Les 13 nouvelles photographies constructeur ne peuvent être republiées sans droits explicites.

Ce travail améliore la visibilité de la seule correspondance directe documentée et réduit le nombre d'étapes pour parcourir les 13 nouveautés. Il ne prouve pas une hausse de conversion ni de commissions.
