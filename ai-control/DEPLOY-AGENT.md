# AI CONTROL — procédure de déploiement pour un agent

Cette procédure est destinée à un agent chargé de mettre AI CONTROL en ligne. Elle ne crée aucun identifiant : les jetons sont fournis par le propriétaire, via le coffre de secrets de l'agent. **Ne jamais écrire un jeton dans le dépôt, un ticket ou un message.**

## 0. Prérequis (fournis par le propriétaire)

| Variable (coffre de l'agent) | Contenu |
|---|---|
| *(secret réseau, invisible)* | jeton Cloudflare, rangé par le propriétaire dans les « Secrets réseau » de l'environnement cloud pour l'hôte `api.cloudflare.com`. Le proxy l'ajoute à chaque requête vers cet hôte : l'agent ne le voit jamais et **n'écrit aucun en-tête `Authorization` lui-même**. |
| `CLOUDFLARE_ACCOUNT_ID` | identifiant du compte Cloudflare (variable d'environnement, non secrète) |
| `CLE_LIEN` | **créée par l'agent pendant le déploiement** (voir section 3), jamais écrite dans le dépôt |

Mode d'accès retenu par le propriétaire le 18 novembre 2026 : **lien secret**, sans compte ni code de connexion. Toute personne qui a le lien entre avec les droits Direction. Les variables `DIRECTION`, `COLLABORATEURS`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` ne sont pas réglées (elles serviront si le propriétaire passe un jour à une adresse par personne).

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
3. Lier la base : la liaison D1 `DB` → `ai-control` est **déclarée dans `wrangler.toml`** (bloc `[[d1_databases]]`, l'identifiant de la base n'est pas secret). Ne pas la poser dans le tableau de bord ni par l'API : tant que `wrangler.toml` contient `pages_build_output_dir`, il fait autorité et Cloudflare efface toute liaison posée ailleurs à chaque déploiement (l'API répond alors « Base de données non liée au projet »). Si la base est recréée, mettre à jour `database_id` dans `wrangler.toml`.
4. Déployer la branche (envoi direct du dossier `public` avec les Functions, ou build depuis GitHub). Ne pas fusionner dans `main`.

## 3. Lien secret

1. Créer la clé : `openssl rand -hex 24` (48 caractères). Ne l'écrire dans aucun fichier.
2. L'enregistrer comme **secret** du projet Pages, nom `CLE_LIEN`, environnement production, puis redéployer.
3. Remettre au propriétaire, dans le compte rendu uniquement, le lien : `https://<adresse du projet>/?cle=<clé>`.
4. Ne créer aucune application Cloudflare Access.

## 4. Vérifications (à faire avant de rendre compte)

- Adresse du projet **sans** la clé : « Accès refusé » (403), pour la page comme pour `/api/donnees`.
- Lien complet : la page s'ouvre, la clé disparaît de la barre d'adresse, les onglets Dépenses et Alertes sont visibles.
- Création d'une dépense de test, visible après rechargement, puis supprimée.
- Mauvaise clé : 403.
- Devise par défaut : USD.
- `/api/donnees` (avec le lien) répond sans erreur « Base de données non liée ».

## Points d'arrêt (ne pas contourner)

- Accès Cloudflare refusé ou expiré : arrêter et signaler.
- Le lien fonctionne sans clé, ou la clé apparaît dans un fichier, un commit ou un journal : arrêter, changer la clé, signaler.
- Toute opération hors de cette procédure (fusion, changement de droits, création d'autres ressources) : demander l'accord du propriétaire.

## Retour attendu

Lien complet à partager, identifiant de la base, résultat de chaque vérification de la section 4, et tout écart constaté.
