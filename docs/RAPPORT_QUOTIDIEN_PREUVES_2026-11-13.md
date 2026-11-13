# Rapport quotidien des preuves marchandes et photographiques — 13/11/2026

## Rôle

Le workflow existant [Audit production SEO URLs](../.github/workflows/audit-live-seo.yml) s'exécute tous les jours (05 h 17 UTC), sur changement de code ou manuellement. Il crée désormais une **file de vérification des 52 références**, en plus de l'audit SEO de production.

Cette file est **strictement documentaire**. Elle ne teste pas en direct le stock Amazon, ne certifie pas un vendeur, n'invente ni prix ni commission, ne modifie pas une date source ou un statut public. Elle classe les tâches selon des informations réellement enregistrées et laisse la validation humaine/externe obligatoire.

## Résultat de référence au 13/11

- 52 fiches, 27 correspondances ASIN historiquement documentées, 25 sans ASIN documenté.
- **4 fiches signalées indisponibles à une date passée** : Casio MTP-1302, Swatch Clearly, Tissot PRX Quartz, Seiko Presage Sharp Edged. Leur stock **actuel est inconnu**.
- **6 ASIN documentés indirectement** par comparaison/redirection, sans certitude d'inspection directe de la fiche Amazon.
- **41 photographies publiées**, **11 fiches sans photo locale**, **aucune permission indépendante authentifiée dans les registres**.
- Seuil de contrôle documentaire de 45 jours, préavis de 14 jours, calculé à partir de dates réelles non modifiées.

## Comment l'utiliser

[Ouvrir le workflow](https://github.com/dbrckk/Spotify-montre/actions/workflows/audit-live-seo.yml) → dernière exécution → onglet **Summary** pour les urgences → **Artifacts** pour :
- `merchant-evidence-action-plan.json` : 52 lignes structurées, priorités, points de preuve manquants ;
- `merchant-evidence-action-plan.csv` : inventaire exploitable sur Android et ordinateur ;
- `merchant-evidence-action-plan.md` : résumé des modèles prioritaires et des photos manquantes ;
- `live-seo-audit.json` : vérifications HTTP du site réellement publié.

Commandes gratuites, en lecture seule :

```bash
npm run merchant:evidence:check
npm run merchant:evidence
node scripts/report-merchant-evidence.mjs --json
node scripts/report-merchant-evidence.mjs --as-of=2026-12-09 --json
```

**Ordre de priorité :** une ancienne indisponibilité ou une date expirée doit être revue en premier ; ensuite les ASIN corroborés indirectement ; puis les preuves proches de l'échéance ; enfin les 25 modèles sans ASIN précis. La partie photo distingue absence d'image et absence de permission contrôlée, sans autoriser de remplacement par une autre montre.

### Garde-fous

Aucune exécution ne traite les clics comme des ventes ou les correspondances ASIN comme des offres. Le rapport n'est pas un justificatif de droits d'auteur. Les éléments légaux P0 (éditeur, permissions, éligibilité du compte) restent en attente de preuves réelles. Le paiement direct reste désactivé.

## Extension du 13/11 — contrôle HTTP prudent des sources officielles

Le workflow vérifie désormais, après la construction du rapport documentaire, jusqu'à **10 URLs de sources officielles prioritaires** (P1/P2, puis suivantes selon les besoins). Le contrôle public suit uniquement les redirections **sur le même hôte HTTPS**, avec un maximum de deux redirections, trois requêtes simultanées et une limite de temps par requête. Il ne suit pas les destinations tierces inattendues.

Le résultat est conservé dans `official-source-http-probe.json` et `official-source-http-probe.md` à côté du rapport marchand. Les réponses sont classées ainsi :

- **HTTP 2xx** : page joignable, mais la référence exacte, le stock et le vendeur restent inconnus ;
- **HTTP 404/410** : URL source à examiner humainement, sans retirer le produit ;
- **HTTP 401/403/429** : site inaccessible à l'automate ou restriction ; état commercial inconnu ;
- **Redirection vers un autre hôte, erreur serveur ou délai** : contrôle indéterminé ; aucune suppression ni mise à jour automatique.

Les pages Amazon **ne sont pas sondées** par ce mécanisme : la correspondance historique des ASIN est maintenue dans sa file documentaire distincte. Les dates de preuve ne sont jamais rafraîchies sur simple réponse HTTP.

Commandes : `npm run merchant:evidence:scan` (audit réseau limité et artefacts locaux) ; `npm run merchant:evidence:check` (tests sans réseau). Le générateur accepte désormais un nombre de correspondances ASIN évolutif (pas de blocage codé en dur sur 27) tout en maintenant les 52 références uniques du catalogue.
