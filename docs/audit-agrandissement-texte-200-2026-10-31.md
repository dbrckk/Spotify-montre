# Agrandissement du texte à 200 % — WCAG 1.4.4

L'audit automatisé de reflow à 320 px (WCAG 1.4.10) existait déjà. Ce contrôle supplémentaire applique `html { font-size: 200% !important; }` à toutes les routes de l'application, à 1280 × 800 px, puis détecte tout débordement horizontal du document.

L'audit enregistre pour chaque page la largeur visible, la largeur défilable, la taille de police racine et les éléments débordants. Une capture complète de l'accueil est conservée dans `artifacts/reflow/text-200pct-home.png`. Toute anomalie bloque le workflow strict et les résultats sont inclus dans `artifacts/accessibility-reflow-report.json` sous `textOnly200Percent`.

**Limite importante :** ce contrôle de l'agrandissement de police racine n'est pas un test complet de l'agrandissement de tous les textes (notamment ceux exprimés en `px`) ni une revue humaine à 200 % dans tous les navigateurs. Il doit être complété par des tests manuels de lisibilité, d'absence de troncature et de fonctionnement des composants.
