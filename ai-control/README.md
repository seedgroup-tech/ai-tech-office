# AI CONTROL (M-013)

Console autonome de suivi des dépenses et de l'usage de l'IA chez SeedScaleUp. Application
indépendante d'AI TECH OFFICE : son propre projet Cloudflare Pages, sa propre adresse, ses propres données.

## Mode d'accès en service : lien secret (18 novembre 2026)

Décision du propriétaire : pas de compte ni de code de connexion, un seul lien pour toute l'équipe.
Si le secret `CLE_LIEN` est réglé (32 caractères au moins), toute personne qui ouvre
`https://<adresse>/?cle=<CLE_LIEN>` entre avec les droits Direction ; sans la clé, tout est refusé (403).
Limites à connaître : le lien vaut mot de passe partagé, on ne sait pas qui a saisi quoi (le champ
« utilisateur » reçoit les initiales, par convention), et pour couper l'accès il faut changer la clé.
Le mode à deux profils ci-dessous reste disponible : il s'active en retirant `CLE_LIEN`.

## Qui voit quoi (mode à deux profils, par adresse)

| Profil | Voit | Ne voit pas |
|---|---|---|
| **Direction / Finance** (liste `DIRECTION`) | tout : dépenses, budgets, abonnements, crédits, upgrades, usages et projets de chacun, seuils, alertes, anomalies, projection | — |
| **Collaborateur** (liste `COLLABORATEURS`) | son usage (quotidien, hebdomadaire, projets), le budget global, les alertes de budget, des conseils | les usages des collègues, les limites par personne, les auteurs des saisies |

Les droits sont appliqués **sur le serveur** (`lib/donnees.mjs`) : un collaborateur ne reçoit
jamais les lignes d'un collègue, même en appelant l'API directement. Une adresse absente des
deux listes est refusée, même si Cloudflare Access la laisse entrer.

## Déploiement (à faire par le propriétaire)

Rien n'a été déployé. Étapes, dans cet ordre :

1. **Créer la base D1** : tableau de bord Cloudflare, *Storage & Databases*, *D1*, *Create*, nom `ai-control`.
2. **Appliquer le schéma** depuis le dossier `ai-control` :
   `npx wrangler d1 execute ai-control --remote --file=migrations/0001_init.sql`
3. **Créer le projet Pages** : *Workers & Pages*, *Create*, *Pages*, *Connect to Git*, dépôt `ai-tech-office`.
   Réglages : **Root directory** `ai-control`, **Build command** vide, **Build output directory** `public`.
   Ne pas utiliser la branche `main` tant que la fusion n'est pas faite : choisir la branche de travail.
4. **Lier la base** : projet, *Settings*, *Bindings*, *Add*, *D1 database*, variable `DB`, base `ai-control`.
5. **Variables** (*Settings*, *Variables and Secrets*, environnement *Production*) :
   - `DIRECTION` : adresses Direction / Finance, séparées par des virgules ;
   - `COLLABORATEURS` : adresses des collaborateurs, séparées par des virgules ;
   - `ACCESS_TEAM_DOMAIN` et `ACCESS_AUD` : mêmes valeurs que la console (étape 4 de son installation), ou celles d'une nouvelle application Access.
6. **Cloudflare Access** : créer une application *Self-hosted* sur l'adresse du projet, avec une règle
   *Include, Emails* listant **exactement** les mêmes adresses que `DIRECTION` et `COLLABORATEURS`.
7. **Redéployer** le projet (la modification des variables ne prend effet qu'après un nouveau déploiement).

Vérification attendue : une adresse non listée voit « Accès refusé » ; un collaborateur ne voit pas
les onglets Dépenses et Alertes ; un test d'écriture de Direction depuis un compte collaborateur renvoie 403.

## Données

- Les saisies sont partagées : elles sont stockées dans la base D1 et relues depuis le serveur.
- Chaque ligne porte sa source : **réel**, **importé**, **saisi** ou **estimé**. Rien n'est récupéré automatiquement :
  aucune source officielle d'usage IA n'est connectée.
- Les dépenses (abonnements, crédits) et les coûts d'usage API sont séparés ; les quotas d'abonnement ne sont pas des tokens.
- La devise est unique, USD par défaut, modifiable par la Direction dans les seuils.
- Les données saisies dans l'ancien MVP (stockage du navigateur) ne sont pas reprises.

## Tests

Depuis le dossier `ai-control` : `node --test` (Node 22 ou plus récent).
Les tests couvrent le calcul, la validation, les droits sur une base SQLite au même schéma que D1, et la vérification des jetons Access.
