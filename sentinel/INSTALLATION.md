# Installer Sentinel, la veille automatique du bureau

Ce guide est pour vous, Yan. Comptez environ 1 heure. Coût : 0 FCFA de plus (offre gratuite de Cloudflare ; voir l'étape 9 pour l'abonnement Claude).

Sentinel est un petit programme hébergé chez Cloudflare. Toutes les 15 minutes, il regarde si vos sites répondent, si les contrôles automatiques des dépôts sont en échec, si des demandes de fusion traînent et si GitHub signale des failles graves. Il note ce qu'il trouve dans la mémoire du bureau. Quand le problème est grave, il réveille un agent Claude Code. Quand tout va bien, il se tait.

Vous allez créer 4 réglages secrets : `GITHUB_TOKEN_ORG`, `GITHUB_TOKEN_PERSO`, `ROUTINE_ID`, `ROUTINE_TOKEN`. Le bureau vous recommande un 5e, facultatif mais plus sûr : `GITHUB_TOKEN_MEMOIRE` (voir l'étape 1).

> **Ce qu'il ne faut jamais faire**
>
> - Coller une clé dans une conversation (avec Claude, un agent, une messagerie, un e-mail).
> - Coller une clé dans un fichier du dépôt ou dans la mémoire du bureau.
> - Mettre une clé dans `wrangler.toml` (ce fichier ne contient aucun secret).
> - Donner un droit d'écriture sur KLOQin ou XADIKOA. Sentinel y lit seulement.
> - Cocher plus de dépôts ou plus de droits que ce que le guide indique.

Les écrans de GitHub, de Claude et de Cloudflare changent de temps en temps : si un libellé diffère un peu, cherchez le mot le plus proche.

---

## Étape 0 — Avant de commencer

Vérifiez que ces points sont vrais :

- La demande de fusion de la mission M-008 a été relue (le fichier `sentinel/wrangler.toml` a été relu par une session Claude distincte) et fusionnée par vous. Le contrôle des chemins sensibles était rouge à cause de ce seul fichier ; vous l'avez contourné en connaissance de cause.
- Les fichiers `etat/projets.json` et `etat/sentinel.json` sont sur la branche principale (`main`) du dépôt `ai-tech-office-memoire`.

Si l'un de ces points manque, arrêtez-vous et dites-le au bureau.

## Étape 1 — Clé GitHub A (organisation seedgroup-tech)

Cette clé lit les dépôts de l'organisation et écrit dans la mémoire.

> **Choix recommandé par le bureau : deux clés au lieu d'une.** GitHub donne les mêmes droits à une clé sur tous les dépôts qu'elle couvre. Une seule clé A aurait donc aussi le droit d'écrire dans `ai-tech-office` et `site-personnel`, même si Sentinel ne s'en sert pas. Pour l'éviter :
>
> - **clé A1** `sentinel-memoire` : seulement le dépôt `ai-tech-office-memoire`, **Contents** en **Read and write**, **Metadata** en **Read-only** → secret `GITHUB_TOKEN_MEMOIRE` ;
> - **clé A2** `sentinel-org` : seulement `ai-tech-office` et `site-personnel`, en **Read-only** : **Actions**, **Pull requests**, **Dependabot alerts**, **Metadata** ; **aucun** droit sur Contents → secret `GITHUB_TOKEN_ORG`.
>
> Faites les points 1 à 9 ci-dessous deux fois, une par clé. Si vous préférez une seule clé A (votre consigne d'origine), suivez les points tels quels et ne créez pas `GITHUB_TOKEN_MEMOIRE` : Sentinel utilisera alors `GITHUB_TOKEN_ORG` pour la mémoire.

1. Sur ordinateur, connectez-vous à GitHub.
2. Photo en haut à droite, **Settings**, puis tout en bas à gauche **Developer settings**.
3. **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
4. Remplissez :
   - **Token name** : `sentinel-org` ;
   - **Expiration** : **90 days** ;
   - **Resource owner** : **seedgroup-tech** (l'organisation, pas votre compte personnel) ;
   - **Repository access** : **Only select repositories**, puis cochez `ai-tech-office-memoire`, `ai-tech-office` et `site-personnel`, et rien d'autre.
5. **Repository permissions** :
   - pour la mémoire, il faut **Contents** en **Read and write** ;
   - pour les autres dépôts, il faut en **Read-only** : **Actions**, **Pull requests**, **Dependabot alerts** ;
   - **Metadata** en **Read-only** : il est obligatoire, et nécessaire aussi pour la mémoire.
6. Remarque : GitHub applique les permissions à tous les dépôts cochés. Sentinel lui-même n'écrit que dans trois fichiers de la mémoire et ne fait que lire ailleurs. Ne donnez pas d'autre droit d'écriture.
7. Cliquez sur **Generate token**.
8. Si GitHub indique que la clé attend l'accord d'un administrateur de l'organisation (selon la politique de l'organisation) : dans **seedgroup-tech**, **Settings**, **Personal access tokens**, **Pending requests**, approuvez la demande, ou demandez à un administrateur de le faire.
9. GitHub affiche la clé **une seule fois**. Copiez-la dans un endroit sûr et temporaire (par exemple la page ouverte, ou votre gestionnaire de mots de passe). Ne la collez jamais dans une conversation.

## Étape 2 — Clé GitHub B (compte personnel seedscaleup)

Cette clé lit seulement KLOQin et XADIKOA.

1. Connectez-vous à GitHub avec le compte **seedscaleup**.
2. **Settings**, **Developer settings**, **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
3. Remplissez :
   - **Token name** : `sentinel-perso` ;
   - **Expiration** : **90 days** ;
   - **Resource owner** : **seedscaleup** ;
   - **Repository access** : **Only select repositories** : `seedscaleup/KLOQin` et `seedscaleup/xadikoa` **uniquement**.
4. **Repository permissions**, tout en **Read-only** : **Actions**, **Pull requests**, **Dependabot alerts**, **Metadata**.
5. **Aucune permission d'écriture.** Si vous voyez « Read and write » quelque part, remettez sur « Read-only » ou « No access ». C'est la règle C du bureau.
6. **Generate token**, puis copiez la clé dans un endroit sûr et temporaire, comme à l'étape 1.

## Étape 3 — La routine Claude Code « Sentinel – intervention »

La routine est l'agent qui se réveille quand Sentinel lui signale un problème grave.

1. Ouvrez `claude.ai/code/routines`.
2. Créez une nouvelle routine (selon l'interface : **New routine**, **Create**, **Nouvelle routine**).
3. **Nom** : `Sentinel – intervention`.
4. **Instructions** : ouvrez le fichier `sentinel/ROUTINE.md` (rédigé par le AI CTO) et collez son texte **tel quel**, sans rien changer.
5. **Environnement** : `agents`.
6. **Dépôts** : `ai-tech-office-agents` et `ai-tech-office-memoire`.
7. Ajoutez un **déclencheur** de type **API** (selon l'interface, le bouton peut s'appeler **Add trigger**, **Add API trigger** ou **Générer un jeton**).
8. L'interface affiche alors :
   - l'**identifiant de la routine** : ce sera `ROUTINE_ID` ;
   - le **jeton du déclencheur** : ce sera `ROUTINE_TOKEN`. **Il n'est affiché qu'une seule fois.** Copiez-le tout de suite dans un endroit sûr et temporaire.
9. Si vous avez raté l'affichage du jeton : régénérez-le (selon l'interface, **Regenerate** ou **Revoke and create**).
10. Enregistrez la routine.

## Étape 4 — Le Worker Cloudflare

1. Connectez-vous au tableau de bord Cloudflare.
2. Menu de gauche : **Workers & Pages**, puis **Create** (ou **Créer**), puis **Import a repository** (importer un dépôt Git).
3. Choisissez le compte GitHub de **seedgroup-tech** et le dépôt **`ai-tech-office`** (le dépôt de référence, pas la copie `-agents`). Si Cloudflare demande d'autoriser l'accès à ce dépôt, autorisez **seulement** ce dépôt, en plus de ceux déjà autorisés.
4. Réglages :
   - **Project name** (nom) : `ai-tech-office-sentinel` ;
   - **Production branch** : `main` ;
   - **Root directory** (dossier racine, dans « Advanced » ou « Paramètres avancés ») : `sentinel` ;
   - **Deploy command** (commande de déploiement) : laissez la valeur par défaut, `npx wrangler deploy` ;
   - **Build command** : laissez vide si Cloudflare l'accepte.
5. Le Worker se redéploie automatiquement à chaque fusion sur `main`.
6. **Pas de déploiement des autres branches** : si Cloudflare propose des aperçus ou des déploiements de branches (**Non-production branch builds**, **Preview**), **désactivez-les**.
7. Cliquez sur **Save and Deploy**. Le premier déploiement peut se plaindre de secrets manquants ou rester inactif : c'est normal, ils arrivent à l'étape 5.

## Étape 5 — Les secrets dans Cloudflare (4, ou 5 avec la clé mémoire séparée)

1. Dans le Worker `ai-tech-office-sentinel` : **Settings** (Paramètres), puis **Variables and Secrets** (Variables et secrets).
2. Pour chaque ligne : **Add**, type **Secret**, nom exact, valeur, puis **Deploy** ou **Save**.

| Nom (exactement) | Valeur |
|---|---|
| `GITHUB_TOKEN_ORG` | la clé A (ou A2 si vous avez choisi deux clés), étape 1 |
| `GITHUB_TOKEN_MEMOIRE` | facultatif : la clé A1, si vous avez choisi deux clés (étape 1) |
| `GITHUB_TOKEN_PERSO` | la clé B (étape 2) |
| `ROUTINE_ID` | l'identifiant de la routine (étape 3) |
| `ROUTINE_TOKEN` | le jeton du déclencheur (étape 3) |

3. Vérifiez que chaque secret est bien de type **Secret** (la valeur n'est plus lisible après l'enregistrement).
4. Quand tout est saisi, effacez les copies temporaires des clés (page, fichier, presse-papiers : copiez un autre texte pour l'effacer).
5. Si Cloudflare demande de redéployer pour appliquer les secrets, faites-le (**Deployments**, dernier déploiement, **⋯**, **Redeploy** ou **Retry**).

## Étape 6 — Vérifier

### 6.1 La page de santé

1. Ouvrez `https://ai-tech-office-sentinel.<votre-sous-domaine>.workers.dev/sante`. Votre sous-domaine est visible dans Cloudflare, sur la page du Worker.
2. Vous devez voir une réponse en JSON avec :
   - `service` : `ai-tech-office-sentinel` ;
   - `version` ;
   - `dernier_passage` : vide au début, il se remplit au premier passage, **dans les 15 minutes** ;
   - `en_veille` : `false` ;
   - `anomalies_ouvertes` ;
   - `erreurs_dernier_passage` ;
   - `fichiers_trop_gros` : `true` si un fichier de la mémoire devient trop gros (dites-le au bureau).

   Si GitHub ne répond pas et que Sentinel n'a encore rien lu, la page affiche seulement `{"statut":"inconnu"}` : réessayez plus tard.
3. Quand rien ne change, `dernier_passage` est mis à jour **au plus une fois par heure**. Ne vous inquiétez donc pas s'il n'avance pas toutes les 15 minutes.
4. Cette page ne montre aucun nom de projet, aucune adresse, aucune clé.

### 6.2 Test de panne simulée

**Attention : ce test déclenche un vrai réveil de la routine et consomme une session de votre abonnement Claude.** Faites-le une seule fois.

0. Attendez que `dernier_passage` soit rempli dans la page de santé (étape 6.1) : **le tout premier passage ne réveille jamais personne**, pour ne pas réveiller les agents sur des problèmes déjà connus.
1. Sur GitHub, dans le dépôt `ai-tech-office-memoire`, ouvrez `etat/projets.json` et ajoutez ce projet dans la liste (sans oublier la virgule avec l'élément précédent) :

   ```
   { "id": "test-panne", "nom": "Test de panne", "depot": "seedgroup-tech/ai-tech-office", "site": "https://test-panne.invalid", "proprietaire_cle": "org", "actif": true }
   ```

   Le domaine `.invalid` n'existe jamais : le site sera toujours en panne, c'est voulu.
2. Attendez **2 passages**, soit 30 à 45 minutes. Une alerte critique n'est créée qu'après 2 échecs de suite.
3. Constatez :
   - dans la console, une alerte **critique** concernant `test-panne` ;
   - dans le journal, une ligne « Sentinel : … » qui indique le réveil, avec l'**adresse de la session** (ou « adresse non renvoyée »).
4. Ouvrez l'adresse de session pour voir ce que la routine a fait.
5. **Nettoyez** : dans `etat/projets.json`, passez ce projet à `"actif": false` (ne le supprimez pas).
6. Une alerte d'un projet inactif n'est pas fermée automatiquement. Si elle reste ouverte, fermez-la à la main depuis la console, ou demandez au bureau de le faire.

## Étape 7 — Mettre le bureau en veille

La veille veut dire : Sentinel continue de surveiller et de noter, mais ne réveille personne.

1. Dans le dépôt `ai-tech-office-memoire`, ouvrez `etat/sentinel.json`.
2. Passez `"pause"` à `true`. Enregistrez (**Commit changes**).
3. Pour reprendre : repassez `"pause"` à `false`.
4. Sentinel ne modifie jamais ce réglage lui-même. `/sante` indique `en_veille`.

## Étape 8 — Renouveler les clés, et en cas de fuite

**Renouvellement.** Les clés A et B expirent au bout de 90 jours.

1. Mettez **dès maintenant** un rappel dans votre agenda, **une semaine avant** la date d'expiration affichée par GitHub.
2. Ce jour-là : refaites l'étape 1 et l'étape 2 (nouvelles clés), remplacez les secrets `GITHUB_TOKEN_ORG`, `GITHUB_TOKEN_PERSO` (et `GITHUB_TOKEN_MEMOIRE` si vous l'avez créé) dans Cloudflare (étape 5, bouton **Edit**), puis supprimez les anciennes clés dans GitHub.
3. Si vous oubliez, Sentinel ne peut plus lire GitHub : rien n'est perdu, il suffit de renouveler.

**En cas de fuite** (une clé collée par erreur quelque part, ou vue par quelqu'un) :

1. Sur GitHub, **révoquez** tout de suite la clé concernée (**Developer settings**, **Fine-grained tokens**, **Delete** ou **Revoke**).
2. Créez-en une nouvelle (étape 1 ou 2).
3. Remplacez le secret dans Cloudflare (étape 5).
4. S'il s'agit de `ROUTINE_TOKEN` : régénérez le jeton du déclencheur dans la routine (étape 3), puis remplacez le secret.
5. Prévenez le bureau, **sans écrire la valeur de la clé**.

## Étape 9 — Ce que ça coûte

- **Cloudflare** : l'offre gratuite des Workers suffit (le cron et les requêtes restent dans les limites gratuites pour 4 projets). Si Cloudflare vous propose un passage à une offre payante, refusez : toute dépense est de niveau N3 et demande votre accord écrit.
- **Claude** : chaque réveil de la routine démarre une session et consomme votre abonnement Claude. Sentinel réveille **au plus 6 fois par jour**, et jamais deux fois pour la même anomalie, même si elle revient plus tard (règle stricte, voir la note de conception). Pour couper tout réveil : étape 7.

## En cas de problème

| Ce que vous voyez | Que faire |
|---|---|
| `/sante` ne répond pas ou donne une erreur | vérifiez que le Worker est déployé, et l'adresse (sous-domaine) |
| `dernier_passage` reste vide après 30 minutes | vérifiez les 4 secrets (étape 5), puis redéployez ; regardez les journaux du Worker (**Observability**) |
| Aucune alerte ni réveil pendant le test | vérifiez que `"pause"` est à `false`, et que le projet de test est `"actif": true` |
| Alerte sans réveil | la raison est notée sur l'alerte (veille, limite de 6 par jour, déjà réveillé récemment, ou routine non configurée) |

Si une vérification échoue : décrivez au bureau ce que vous voyez, sans jamais copier une valeur secrète.
