# Droits photo et liens d'affiliation vérifiables — 31 octobre 2026

## Liens directs documentés
Au-delà des treize liens du catalogue principal, les montres complémentaires disposent désormais de trois correspondances **référence–ASIN** dans `research/amazon-fr-popular-verified.json` :
- Casio G-SHOCK GW-M5610U-1 / édition européenne GW-M5610U-1ER : `B09BCPP68Q` ;
- Casio F-91W-1 / code régional F-91W-1YER : `B000J34HN4` ; preuve : lien Amazon.fr explicite sur [BFM Shopping](https://www.bfmtv.com/pratique/mode/avec-un-prix-pareil-cette-montre-casio-ne-va-pas-rester-tres-longtemps-en-stock_AB-202309220018.html) et [Clubpromos](https://www.clubpromos.fr/threads/montre-casio-homme-f-91w-1xy-%C3%A0-4-95%E2%82%AC-sur-amazon.117921/).
- Casio A168WG-9 / code régional A168WG-9EF : `B002LAS086` ; preuve : ancien [lien Amazon.fr](https://www.dameskarlette.com/2011/12/amazon-et-concours.html) et [fiche corroborante datée du 25/09/2026](https://www.tickclip.ai/verdict/p_atpbmdjna3qx-casio-collection-a168wg-9ef-digital-watch-for).

**Limite :** Amazon.fr refuse l'accès public automatisé à ses fiches dans cet environnement. Ces ASIN ont une association historique aux références exactes, sans garantie sur leur disponibilité actuelle, leur prix ou leur variante sélectionnée aujourd'hui. Les 27 autres montres complémentaires, dont les neuf SKMEI, conservent donc une recherche explicitement annoncée et balisée avec l'identifiant Partenaires du propriétaire.

## Photos : aucun droit d'auteur transféré par la permission de modifier le site
L'autorisation du propriétaire de la boutique permet de modifier et publier **son site**, pas de reproduire automatiquement les photos détenues par SKMEI, un vendeur ou un photographe. Aucune photographie nouvelle des 30 montres complémentaires n'a été copiée ni publiée sans autorisation.

Nouveau flux `site/popular-photo-rights.json` + `scripts/popular-photo-rights.mjs` :
- aucun enregistrement autorisé par défaut ;
- seul un cliché du modèle exact en `site/assets/watches-popular/<id>.webp` peut être chargé ;
- pour chaque cliché : titulaire des droits identifié, preuve écrite de licence commerciale conservée, date et périmètre de reproduction, hachage SHA-256 du justificatif et du fichier image ;
- le build échoue si un fichier non approuvé se trouve dans le dossier public, si son intégrité diffère ou si la licence manque ;
- si le dossier est vide, les visuels graphiques originaux sont conservés. Aucun faux packshot photoréaliste n'est présenté comme une photo du produit.

**N'inscrivez pas des clés d'API, justificatifs de droits privés ou informations personnelles dans GitHub public.** Les empreintes cryptographiques seules peuvent figurer dans le manifeste. Une déclaration du propriétaire sans licence du titulaire n'est pas une preuve suffisante.

## Demande prête à envoyer à SKMEI
Adresse trouvée sur le [site du fabricant SKMEI](https://www.skmei.com/contact-us) : `alex@skmei.com`. Cette demande n'a pas été envoyée automatiquement : aucun service e-mail expéditeur n'était connecté à cette session.

**Objet : Request for permission to use SKMEI product photos on French affiliate watch website**

Hello SKMEI team,

I operate Atelier Montres, a French watch discovery and affiliate website: https://atelier-montres-selection-fr.onrender.com/.

I feature nine SKMEI references (1251, 1257, 2056, 2514, 9156, 9353, 1874, 2471, 1220), and would like to display their **accurate official product photographs** on the product catalogue and individual review pages.

Could you please confirm in writing whether you own or control the image rights and can grant our website a non-exclusive commercial licence to:
1. reproduce, locally host, resize (without misrepresenting the product) and display the exact-model packshots and approved lifestyle photographs;
2. use them on our French-language affiliate website, including SEO and social-sharing thumbnails;
3. maintain their use while the respective product pages remain live, with any conditions of attribution, takedown or licence expiry clearly specified?

If you can authorise this, please share a media kit or a contact responsible for the image rights, with a list of permitted model and colour variants. We will credit SKMEI and immediately remove materials upon valid notice.

Thank you,
Atelier Montres

## Amazon official product images
Do not scrape Amazon.fr thumbnails into the repository. The Amazon EU [programme IP licence](https://partenaires.amazon.fr/help/operating/policies) permits conditional use of Product Advertising Content through approved tools (Creators API / PA API); photo caching/local hosting is restricted. Once API access is granted to this account, this can become a separate integration with on-demand URLs, no storage of remote image binaries in GitHub. API availability and account entitlements are not assumed.

## Vérification
```sh
node scripts/check-affiliate-publication.mjs
node scripts/build-seo.mjs
node scripts/validate-seo.mjs
npm test
```
Tests must fail if an ASIN is changed without a matching source or an unlicensed image is introduced. No live sales or commission claims unless supported by Amazon's own reports.
