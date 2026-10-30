# Conseiller de montres : préférence de taille et comparateur — 30 octobre 2026

## Fonctionnement

Le conseiller éditorial sur `/conseiller.html` permet de choisir quatre préférences indépendantes : **gamme**, **style**, **mouvement** et **taille de boîtier**. Toutes les recommandations restent déterministes et s'appuient sur les quinze références du catalogue `site/selection-affiliation.json`. Aucun modèle IA, service externe, compte utilisateur ou serveur de données personnelles n'est nécessaire.

La taille de boîtier est facultative. Les options sont :
- **Toutes les tailles** (choix par défaut, dont les références sans diamètre documenté).
- **Compacte : jusqu'à 38 mm inclus** (3 modèles actuellement documentés).
- **Intermédiaire : 38,1 à 40 mm inclus** (6 modèles actuellement documentés).

Les 6 références dont le diamètre n'est pas indiqué restent explorables : un modèle sans mesure ne peut jamais être classé comme correspondance exacte au critère de taille ; une mention `Diamètre non renseigné : à vérifier chez le fabricant` prévient l'acheteur. Aucune correspondance entre diamètre et tour de poignet n'est garantie.

Le parseur n'accepte que des valeurs simples de la forme `38,4 mm` ou `40 mm` avec virgule ou point décimal, sans autre texte. Les valeurs invalides sont considérées manquantes ; aucun nombre n'est reconstruit ou interpolé. Le chiffre obtenu sert uniquement à classer la taille et ne sert pas de prix ni de coefficient de conversion.

## Classement et transparence

Les quatre critères contribuent au classement. Une correspondance exacte de taille augmente le score et compte comme un critère satisfait. Une taille inconnue ou différente n'est jamais étiquetée « correspond à vos critères » si la taille demandée n'est pas respectée. Le conseiller conserve les trois alternatives pertinentes et précise les limites éventuelles.

Les résultats peuvent être partagés grâce aux paramètres d'URL `tier`, `style`, `movement` et `size`, sans stockage côté serveur. Un lien **Comparer mes 3 suggestions côte à côte** ouvre directement le comparateur existant avec leurs identifiants vérifiés. Cela réutilise la vue interactive et ses contrôles de comparaison ; aucune technologie d'achat ou de paiement n'est ajoutée.

## Frontend et vérification

- `site/conseiller-engine.js` : normalisation des préférences, contrôle des mesures, déterminisme et classement.
- `site/conseiller.js` : restaurations via URL, mentions de données manquantes, lien de comparaison prérempli.
- `site/conseiller.html` et `site/conseiller.css` : quatrième question, aide au choix, accessibilité et Android.
- `scripts/test-watch-advisor.mjs` : 135 combinaisons et invariants de données manquantes.
- `scripts/test-adviser-browser.mjs` : parcours Chromium Android/desktop, nouvelle préférence, deeplink, navigation vers le vrai comparateur.

## Limites commerciales

Les gammes **Essentielle**, **Signature** et **Prestige** sont éditoriales, non des plafonds de prix. Les anciennes fourchettes chiffrées non synchronisées ont été supprimées du conseiller. Les visiteurs doivent vérifier les caractéristiques, tarifs, stocks, dimensions et garanties chez le fabricant ou le marchand. L'affiliation reste inactive avant les autorisations nécessaires.
