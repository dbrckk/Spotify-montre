# Découverte CJ directement depuis Android — sans paiement ni commande

**Objectif :** trouver la première **variante réelle** de montre potentiellement
distribuable vers la France métropolitaine. Ce n'est pas encore une offre
commercialisable, ni une preuve de conformité du modèle, de son fabricant ou de
son prix final consommateur.

## Activation initiale (une seule fois)

1. Dans le compte CJdropshipping, installer l'application **API** si nécessaire,
   puis créer et copier une clé d'API depuis
   [l'espace officiel CJ](https://www.cjdropshipping.com/my.html#/authorize/API).
   La clé est un secret, **ne jamais la coller dans une issue, un commit, une
   conversation, un champ de workflow ou un fichier publié**.
2. Depuis le navigateur Android, ouvrir
   [Secrets GitHub Actions](https://github.com/dbrckk/Spotify-montre/settings/secrets/actions)
   et créer **New repository secret** : nom exact `CJ_API_KEY`, valeur =
   clé d'API CJ. Une clé `CJ_ACCESS_TOKEN` existante peut aussi être utilisée,
   mais `CJ_API_KEY` est privilégiée afin de récupérer automatiquement un
   jeton d'accès lors de chaque exécution.

Ne jamais mettre `MOLLIE_API_KEY` ni `DATABASE_URL` dans ce workflow de
découverte : le compte marchand et la base n'y sont pas nécessaires.

## Recherche automatique par mot-clé, sans connaître un VID

Le nouveau workflow **[Rechercher des montres CJ sans VID ni achat](https://github.com/dbrckk/Spotify-montre/actions/workflows/search-cj-watches.yml)**
supprime l'étape manuelle de recherche de l'identifiant de variante.

Sur Android : ouvrir le lien, **Run workflow**, conserver `SKMEI` et
`75002`, puis confirmer. Le workflow utilise le secret
`CJ_API_KEY` (ou `CJ_ACCESS_TOKEN`) déjà indiqué plus haut.
Aucun identifiant de variante ne doit être saisi.

Le script `commerce/search-cj.mjs` :
1. consulte **une seule page de 12 références** via l'API officielle
   `/product/listV2`, filtrée sur les entrepôts CN ;
2. retient au maximum **deux fiches** qui décrivent des montres plutôt
   que des bracelets ou accessoires ;
3. récupère les **VID réels** via `/product/variant/query` et choisit
   une variante clairement identifiée ;
4. recontrôle son prix via `variant/queryByVid`, le stock CJ CN et,
   uniquement si du stock existe, les frais d'envoi et d'importation
   vers le code postal de référence ;
5. affiche les **VID et méthodes de transport acceptables** dans le
   journal du workflow. Les frais en USD ne sont pas convertis en EUR
   avant une validation explicite du taux et du régime TVA.

Coût API plafonné : **une requête de liste à 50 points**, puis au plus
**deux fois 40 points** (liste des variantes 10, détail VID 10,
stock 10, transport 10) = **130 points CJ par exécution au maximum**,
hors appel d'authentification. Le workflow est **manuel**, pas
quotidien, pour ne pas consommer les points fournisseur inutilement.
Une sélection vide ou un devis incomplet ne déclenche aucune vente.

Le compteur `listedNum` de CJ représente des annonces/listings,
**pas les ventes** : ne pas l'utiliser pour affirmer qu'une montre
est best-seller. Les noms produits, marques, photos, conformité GPSR,
droit d'exploitation et délais doivent encore être validés sur une
variante précise. Les journaux GitHub sont publics sur un dépôt public
et exposent les identifiants et prix fournisseurs résumés, **jamais**
les clés, adresses clients ou commandes.

Depuis un environnement privé avec `CJ_API_KEY` :
```sh
CJ_SEARCH_KEYWORD=SKMEI CJ_POSTAL_CODE=75002 node commerce/search-cj.mjs
```

La sortie `sample_shipping_available` **n'approuve pas l'offre**.
Vérifier ensuite le portefeuille CJ, le taux de change et les frais,
les garanties, les documents légaux, les photos et la conformité, puis
passer au processus `stage-offer.mjs inspect|stage` documenté ci-dessous.
Le mode `stage` reste un brouillon non achetable, et l'ouverture
des paiements continue à nécessiter toutes les validations marchandes.

## Examiner une variante réelle en moins de quatre interactions

1. Relever le **VID exact**, qui identifie une variante précise dans le
   catalogue CJ (ce n'est ni un nom de marque, ni un PID générique).
2. Ouvrir
   [GitHub Actions : Examiner une variante CJ sans achat](https://github.com/dbrckk/Spotify-montre/actions/workflows/discover-cj-variant.yml).
3. Sélectionner `Run workflow`, saisir le **VID** et conserver `75002`
   comme code postal d'échantillon (ou un autre code postal de France
   métropolitaine), puis lancer l'exécution sur `main`.
4. Ouvrir le job `supplier-read-only` : le bloc JSON indique le coût du
   produit en **centimes USD**, la disponibilité d'au moins un entrepôt CN,
   les transporteurs réellement calculés vers ce code postal, leurs montants
   rendu/port/import **en centimes USD**, ainsi que les options exclues
   lorsque les informations de douane sont incomplètes ou contradictoires.

**Ce journal de workflow est accessible publiquement si le dépôt est public.**
Il ne contient ni API key, ni access token, ni données clients, mais les
identifiants de variante et les montants fournisseur sont visibles. Ne pas
y saisir de renseignements commerciaux que l'on souhaite garder privés.

## Interprétation et limites

- Une sortie `stockConfirmed: true` signifie uniquement que l'API CJ a
  déclaré au moins une unité dans l'entrepôt du pays choisi **au moment du
  relevé**. Ce n'est pas une réservation de stock.
- `landedUsdCents` = prix variante CJ + transport + import selon la réponse
  fournisseur pour le code postal renseigné. Le champ `totalPostageFee`,
  s'il est fourni, inclut déjà les montants fiscaux déclarés. Une information
  de douane absente entraîne l'exclusion de la méthode concernée.
- Aucune conversion USD/EUR ni TVA vendeur n'est inventée. Il faudra
  confirmer les taux, les frais de paiement, la marge, les garanties,
  la traçabilité GPSR et la disponibilité réelle auprès du fournisseur.
- Aucune consultation du solde du compte CJ n'est nécessaire pour découvrir
  une variante. Les contrôles de trésorerie seront effectués lors de la
  qualification ultérieure.
- Les appels sont limités à une variante et espacés pour les plafonds de
  fréquence CJ. Les trois lectures
  `variant/queryByVid`, `stock/queryByVid` et `freightCalculate`
  consomment chacune **10 points CJ** selon la grille du fournisseur, soit
  **30 points maximum par découverte d'une variante en stock** hors
  authentification. Sans stock confirmé, la lecture transport est évitée.
- Le workflow ne possède **aucune** permission GitHub d'écriture, aucun
  accès PostgreSQL, aucun appel `createOrderV2`, aucun droit de publication
  de produits, et n'active ni `COMMERCE_ENABLED` ni `checkoutMode`.

## Après un résultat prometteur

Une fois la variante et le transporteur confirmés, préparer un véritable
dossier commercial (prix TTC, plafond fournisseur, hypothèse EUR/USD,
réserves, TVA, délais), puis utiliser le processus existant :

```sh
node commerce/stage-offer.mjs inspect /chemin/prive/candidat-reel.json
node commerce/stage-offer.mjs stage /chemin/prive/candidat-reel.json
```

Le mode `stage` refait obligatoirement **de nouvelles lectures CJ** et
nécessite `CJ_ACCESS_TOKEN` et `DATABASE_URL` privés. Il n'enregistre
qu'un **brouillon non approuvé**. Toute activation reste conditionnée à la
validation des obligations légales et à un essai marchand complet autorisé.

Documentation CJ consultée :
- https://developers.cjdropshipping.com/en/api/api2/api/product.html
- https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
- https://developers.cjdropshipping.com/en/api/api2/api/auth.html
- https://developers.cjdropshipping.com/en/api/api2/standard/points.html
