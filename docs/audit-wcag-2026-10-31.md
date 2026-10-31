# Accessibilité WCAG — audit reproductible

L'audit utilise Playwright + `@axe-core/playwright` sous Chromium, sur **toutes les pages HTML générées / SEO ainsi que les flux directs** en 393 px et 1366 px. Il ouvre également le comparateur, le mode différences et le menu mobile.

Exécution via **Actions > WCAG accessibility audit — full storefront**. Un JSON détaillé des règles, impacts et sélecteurs est attaché dans les artefacts du workflow. Aucun service payant ni clé API.

### Portée

Règles automatisées WCAG 2.0, 2.1 et 2.2 A/AA ; cette couverture n'est **pas** une certification WCAG 2.2 AA. Les tests manuels clavier et lecteurs d'écran demeurent nécessaires. Un échec de navigation ou d'audit est indiqué séparément, il ne doit pas être confondu avec « zéro violation ».

**Étape initiale :** collecte non bloquante (`A11Y_ENFORCE=0`) afin de mesurer les problèmes existants. **Étape de validation :** passage à l'exécution bloquante, correction des violations puis contrôle de publication.
