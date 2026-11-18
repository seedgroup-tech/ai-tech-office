# AI CONTROL — procédure de déploiement pour un agent

Cette procédure est destinée à un agent chargé de mettre AI CONTROL en ligne. Elle ne crée aucun identifiant : les jetons sont fournis par le propriétaire, via le coffre de secrets de l'agent. **Ne jamais écrire un jeton dans le dépôt, un ticket ou un message.**

## 0. Prérequis (fournis par le propriétaire)

| Variable (coffre de l'agent) | Contenu |
|---|---|
| `CLOUDFLARE_API_TOKEN` | jeton à droits limités (voir le guide du propriétaire) |
| `CLOUDFLARE_ACCOUNT_ID` | identifiant du compte Cloudflare |
| `DIRECTION` | adresses Direction / Finance, séparées par des virgules |
| `COLLABORATEURS` | adresses collaborateurs, séparées par des virgules |
| `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | valeurs de l'équipe Access |

Vérifier le jeton avant tout : `curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` → doit répondre `"status":"active"`. Sinon, arrêter et signaler.

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

- Un jeton refusé, expiré ou trop large : arrêter et signaler.
- Une liste d'adresses incertaine ou différente entre les variables et Access : arrêter, c'est une décision du propriétaire.
- Toute opération hors de cette procédure (fusion, changement de droits, création d'autres ressources) : demander l'accord du propriétaire.

## Retour attendu

Adresse publique du projet, identifiant de la base, résultat de chaque vérification de la section 4, et tout écart constaté.
