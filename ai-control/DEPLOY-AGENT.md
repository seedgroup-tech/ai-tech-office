# AI CONTROL — procédure de déploiement pour un agent

Cette procédure est destinée à un agent chargé de mettre AI CONTROL en ligne. Elle ne crée aucun identifiant : les jetons sont fournis par le propriétaire, via le coffre de secrets de l'agent. **Ne jamais écrire un jeton dans le dépôt, un ticket ou un message.**

## 0. Prérequis (fournis par le propriétaire)

| Variable (coffre de l'agent) | Contenu |
|---|---|
| *(secret réseau, invisible)* | jeton Cloudflare, rangé par le propriétaire dans les « Secrets réseau » de l'environnement cloud pour l'hôte `api.cloudflare.com`. Le proxy l'ajoute à chaque requête vers cet hôte : l'agent ne le voit jamais et **n'écrit aucun en-tête `Authorization` lui-même**. |
| `CLOUDFLARE_ACCOUNT_ID` | identifiant du compte Cloudflare (variable d'environnement, non secrète) |
| `DIRECTION` | adresses Direction / Finance, séparées par des virgules |
| `COLLABORATEURS` | adresses collaborateurs, séparées par des virgules |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | valeurs de l'équipe Access |

GitHub : aucun jeton à fournir. L'accès au dépôt passe par la liaison GitHub de Claude Code.

Vérifier l'accès Cloudflare avant tout :
- `curl -s https://api.cloudflare.com/client/v4/user/tokens/verify` (sans en-tête) → doit répondre `"status":"active"`.
- Si la réponse est `Missing "Authorization" header`, la session ne tourne pas dans l'environnement qui porte le secret (ou a démarré avant son ajout) : arrêter et signaler, ne pas demander le jeton.
- `echo $CLOUDFLARE_ACCOUNT_ID` doit afficher 32 caractères.

Les commandes `wrangler` des sections suivantes supposent que wrangler accepte de s'authentifier par ce proxy, ce qui **n'a pas été vérifié**. Si wrangler réclame un jeton, faire les mêmes opérations par l'API Cloudflare (`https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/...` : `d1/database`, `pages/projects`, `access/apps`) avec `curl`, sans en-tête d'authentification.

Si l'accès est refusé ou expiré : arrêter et signaler. Expiration du jeton Cloudflare : 18 novembre 2027.

## Garde-fous

- **Ne jamais pousser ni fusionner dans `main`.** La protection de `main` (PR avec approbation, pas de force-push, pas de suppression) est fixée par le propriétaire ; ne pas la modifier.
- **Sauvegarde avant toute migration** : `npx wrangler d1 export ai-control --remote --output=../sauvegarde-ai-control-AAAA-MM-JJ.sql`. Ce fichier reste **hors du dépôt**, il contient des données financières.
- **Migration une seule fois** : avant la section 1 étape 2, lister les tables (étape 3). Si `depenses`, `usages` et `config` existent déjà, ne pas rejouer le fichier SQL.
- **Rotation du jeton** : signaler au propriétaire quinze jours avant l'expiration ; ne jamais recréer un jeton soi-même.
- **Aucun secret** dans les fichiers du dépôt, les messages de commit, les journaux ou les réponses.

## 1. Base D1

1. Créer la base `ai-control` (si elle n'existe pas) : `npx wrangler d1 create ai-control`.
2. Depuis `ai-control/` : `npx wrangler d1 execute ai-control --remote --file=migrations/0001_init.sql`.
3. Contrôle : `npx wrangler d1 execute ai-control --remote --command="SELECT name FROM sqlite_master WHERE type='table'"` doit lister `depenses`, `usages`, `config`.

## 2. Projet Pages

1. Créer le projet `ai-control` (tableau de bord, ou `npx wrangler pages project create ai-control`).
2. Réglages de build : **Root directory** `ai-control`, build vide, sortie `public`. Branche : `agent/M-013-ai-control-partage` (ou la branche validée par le propriétaire).
3. Lier la base : binding D1 nom `DB` → `ai-control`. Ne pas modifier `wrangler.toml` pour cela.
4. Renseigner les variables `DIRECTION`, `COLLABORATEURS`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` (environnement production).
5. Déployer la branche. Ne pas fusionner dans `main`.

## 3. Cloudflare Access

Créer une application *self-hosted* sur l'adresse du projet, avec une règle *Include → Emails* listant **exactement** les adresses de `DIRECTION` et `COLLABORATEURS`. Contrôle : une adresse hors liste doit être refusée par Access.

## 4. Vérifications (à faire avant de rendre compte)

- Direction : onglets Dépenses et Alertes visibles ; création d'une dépense visible après rechargement.
- Collaborateur : onglets Dépenses et Alertes absents ; aucune ligne d'un autre collaborateur à l'écran.
- Collaborateur : `POST /api/depenses` renvoie 403.
- Adresse hors liste : « Accès refusé ».
- Devise par défaut : USD.

## Points d'arrêt (ne pas contourner)

- Accès Cloudflare refusé ou expiré : arrêter et signaler.
- Une liste d'adresses incertaine ou différente entre les variables et Access : arrêter, c'est une décision du propriétaire.
- Toute opération hors de cette procédure (fusion, changement de droits, création d'autres ressources) : demander l'accord du propriétaire.

## Retour attendu

Adresse publique du projet, identifiant de la base, résultat de chaque vérification de la section 4, et tout écart constaté.
