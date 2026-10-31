# Accessibilité WCAG — audit reproductible

L'audit utilise Playwright + `@axe-core/playwright` sous Chromium, sur **toutes les pages HTML générées / SEO ainsi que les flux directs** en 393 px et 1366 px. Il ouvre également le comparateur, le mode différences et le menu mobile.

Exécution via **Actions > WCAG accessibility audit — full storefront**. Un JSON détaillé des règles, impacts et sélecteurs est attaché dans les artefacts du workflow. Aucun service payant ni clé API.

### Portée

Règles automatisées WCAG 2.0, 2.1 et 2.2 A/AA ; cette couverture n'est **pas** une certification WCAG 2.2 AA. Les tests manuels clavier et lecteurs d'écran demeurent nécessaires. Un échec de navigation ou d'audit est indiqué séparément, il ne doit pas être confondu avec « zéro violation ».

**Étape initiale :** collecte non bloquante (`A11Y_ENFORCE=0`) afin de mesurer les problèmes existants. **Étape de validation :** passage à l'exécution bloquante, correction des violations puis contrôle de publication.

### État du premier passage

Le premier audit Actions a examiné **40 URL / 85 écrans**, **zéro erreur de chargement**, et a relevé six types de règles : contrastes insuffisants, divergence entre nom accessible et étiquette visible, tailles de cibles, attribut ARIA sans rôle, ainsi que le document de vérification Google qui n'est pas une page destinée aux utilisateurs. Les types réels ont été extraits de [l'exécution 41220210085](https://github.com/dbrckk/Spotify-montre/actions/runs/41220210085).

Le fichier de vérification Search Console `google6d385495b6d15d5e.html` doit rester **octet pour octet intact** ; le scanner l'exclut explicitement des pages utilisateur.

Les corrections visent les éléments signalés (étiquettes de liens, CTA, contrastes des légendes, noms ARIA, taille cliquable de liens, régions accessibles). Prochain passage strict obligatoire, sans prétention de certification.

### État après premier lot de corrections

[Second passage 41220692535](https://github.com/dbrckk/Spotify-montre/actions/runs/41220692535) : **39 URL / 83 écrans, zéro échec d'analyse, deux catégories restantes** (color-contrast et label-content-name-mismatch). Le nombre d'occurrences par écran et règle est passé de 79 à 20, et le nombre de sélecteurs en défaut remontés dans le rapport d'environ 640 à 115 ; les chiffres reflètent des violations automatiques, **pas un taux de conformité WCAG**.
