# Installer la console du bureau

Ce guide est pour vous, Yan. Comptez environ 45 minutes. Coût : 0 FCFA (offres gratuites de GitHub et de Cloudflare).

**À faire seulement après avoir fusionné les lots A et B de la mission M-006.**

La console est une page web privée. Elle lit la mémoire du bureau (le dépôt `ai-tech-office-memoire`) et y enregistre vos décisions, signées. Personne d'autre que vous ne peut l'ouvrir.

Vous allez créer 5 réglages secrets. **Ne les montrez à personne** : ni à Claude, ni aux agents, ni par e-mail ou messagerie. Vous les tapez ou les collez directement dans les pages de GitHub et de Cloudflare, et nulle part ailleurs.

| Nom | Ce que c'est | Où vous le trouvez |
|---|---|---|
| `GITHUB_TOKEN` | la clé qui permet à la console de lire et d'écrire la mémoire | étape 1 |
| `DECISION_KEY` | la clé qui signe vos décisions | étape 3 |
| `ACCESS_TEAM_DOMAIN` | l'adresse de votre équipe Cloudflare Access | étape 4 |
| `ACCESS_AUD` | le code d'identification de l'application Access | étape 4 |
| `OWNER_EMAIL` | votre adresse e-mail, la seule autorisée | vous la connaissez |

Les écrans de GitHub et de Cloudflare changent de temps en temps : si un libellé diffère un peu, cherchez le mot le plus proche.

---

## Étape 1 — Créer la clé GitHub (`GITHUB_TOKEN`)

1. Sur ordinateur, connectez-vous à GitHub.
2. Cliquez sur votre photo en haut à droite, puis **Settings**.
3. Tout en bas du menu de gauche : **Developer settings**.
4. **Personal access tokens**, puis **Fine-grained tokens**, puis **Generate new token**.
5. Remplissez :
   - **Token name** : `console-bureau` ;
   - **Expiration** : **90 days** ;
   - **Resource owner** : **seedgroup-tech** (l'organisation, pas votre compte personnel) ;
   - **Repository access** : **Only select repositories**, puis choisissez **seulement** `seedgroup-tech/ai-tech-office-memoire` ;
   - **Permissions**, partie **Repository permissions** : **Contents** sur **Read and write**. Ne touchez à rien d'autre (« Metadata » passe tout seul en lecture : c'est normal).
6. Cliquez sur **Generate token**.
7. Si GitHub indique que la clé attend l'accord de l'organisation : allez dans l'organisation **seedgroup-tech**, **Settings**, **Personal access tokens**, **Pending requests**, et approuvez votre propre demande.
8. GitHub affiche la clé **une seule fois**. Gardez cette page ouverte : vous la collerez à l'étape 3. Ne la copiez dans aucun fichier, aucun message.

**Rappel de renouvellement.** La clé expire au bout de 90 jours. Mettez dès maintenant un rappel dans votre agenda, **une semaine avant** la date d'expiration affichée par GitHub. Ce jour-là : refaites cette étape 1 (nouvelle clé), remplacez `GITHUB_TOKEN` dans Cloudflare (étape 3, bouton **Edit**), redéployez (étape 3, point 8), puis supprimez l'ancienne clé dans GitHub. Si vous oubliez, la console affichera « Lecture de la mémoire impossible » : rien n'est perdu, il suffit de renouveler.

## Étape 2 — Créer le projet Cloudflare Pages

1. Connectez-vous au tableau de bord Cloudflare.
2. Menu de gauche : **Workers & Pages**, puis **Create**, onglet **Pages**, puis **Connect to Git**.
3. Choisissez le compte GitHub de **seedgroup-tech** et le dépôt **`ai-tech-office`** (le dépôt de référence, pas la copie `-agents`). Si Cloudflare n'a pas encore accès à ce dépôt, il propose d'ajuster l'application GitHub de Cloudflare : autorisez **seulement** `ai-tech-office`, en plus des dépôts déjà autorisés.
4. Réglages de construction :
   - **Project name** : `ai-tech-office-console` ;
   - **Production branch** : `main` ;
   - **Framework preset** : **None** ;
   - **Build command** : laissez **vide** ;
   - **Build output directory** : `public` ;
   - **Root directory** (dans « Advanced » ou « Root directory ») : `console`.
5. **N'ajoutez pas encore de variables ici.** Cliquez sur **Save and Deploy**.
6. Le premier déploiement se fait. La page sera **refusée** (« Accès refusé. ») : c'est normal, les réglages secrets manquent encore.
7. Dans le projet : **Settings**, **Builds & deployments** (ou **Branch control**), réglez **Preview branch** / **Automatic deployments** des autres branches sur **None**. Seule `main` sera publiée. C'est plus sûr : aucune autre branche ne peut faire tourner une autre version de la console.

## Étape 3 — Saisir les 5 réglages secrets

1. Dans le projet `ai-tech-office-console` : **Settings**, puis **Variables and Secrets** (ou **Environment variables**).
2. Environnement : **Production**.
3. Pour chaque réglage : **Add**, type **Secret** (ou cochez **Encrypt**), le nom exact ci-dessous, la valeur, puis **Save**.

| Nom (exactement) | Valeur |
|---|---|
| `GITHUB_TOKEN` | la clé de l'étape 1 (collez-la, puis fermez la page GitHub) |
| `DECISION_KEY` | une valeur aléatoire, voir ci-dessous |
| `ACCESS_TEAM_DOMAIN` | voir l'étape 4, par exemple `monequipe.cloudflareaccess.com` (sans `https://`) |
| `ACCESS_AUD` | voir l'étape 4 |
| `OWNER_EMAIL` | votre adresse e-mail, celle que vous utiliserez pour vous connecter |

4. **Ne remplissez pas l'environnement « Preview ».** Sans ces réglages, un aperçu refuse tout : c'est voulu.

### Créer `DECISION_KEY` sans la montrer à personne

C'est la clé qui signe vos décisions. Il faut une suite de 64 caractères tirés au hasard.

- **Sur Mac** : ouvrez l'application **Terminal**, tapez `openssl rand -hex 32 | pbcopy`, puis Entrée. Rien ne s'affiche : la valeur est copiée directement dans le presse-papiers.
- **Sur Windows** : ouvrez **PowerShell**, tapez la commande suivante, puis Entrée. Rien ne s'affiche : la valeur est copiée.

  ```
  $o = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($o); -join ($o | ForEach-Object { '{0:x2}' -f $_ }) | Set-Clipboard
  ```

Puis collez la valeur dans le champ `DECISION_KEY` de Cloudflare.

Ensuite :

- gardez une copie **uniquement** dans votre gestionnaire de mots de passe personnel (si vous en avez un). Si cette clé est perdue ou changée, les décisions déjà signées s'afficheront « signature invalide » ;
- ne la mettez dans aucun fichier, aucun e-mail, aucune conversation (ni avec Claude) ;
- copiez ensuite n'importe quel autre texte, pour effacer le presse-papiers.

5. Quand l'étape 4 est faite et les 5 réglages saisis : **Deployments**, sur le dernier déploiement de production, menu **⋯**, **Retry deployment** (ou **Redeploy**). Les réglages ne s'appliquent qu'à un nouveau déploiement.

## Étape 4 — Protéger la console avec Cloudflare Access (offre gratuite)

1. Tableau de bord Cloudflare, menu de gauche : **Zero Trust**. La première fois, Cloudflare vous demande un **nom d'équipe** et un plan : choisissez l'offre **Free** (0 $). Il peut demander un moyen de paiement : rien n'est prélevé sur l'offre gratuite, mais si vous ne voulez pas le donner, arrêtez-vous et dites-le au bureau (toute dépense est N3).
2. **Trouver `ACCESS_TEAM_DOMAIN`** : dans Zero Trust, **Settings** (Réglages), puis **Custom Pages** ou **Team name and domain**. Vous y lisez votre domaine d'équipe, de la forme `monequipe.cloudflareaccess.com`. C'est la valeur de `ACCESS_TEAM_DOMAIN` (sans `https://`).
3. **Choisir la connexion par code reçu par e-mail** : **Settings**, **Authentication**, **Login methods** : vérifiez que **One-time PIN** est présent (il l'est d'habitude par défaut). Sinon : **Add new**, **One-time PIN**.
4. **Créer l'application** : **Access**, **Applications**, **Add an application**, **Self-hosted**.
   - **Application name** : `Console du bureau` ;
   - **Session duration** : `24 hours` ;
   - **Public hostname** (ou **Application domain**) : `ai-tech-office-console.pages.dev` ;
   - cliquez sur **Add domain** (ou **+**) pour en ajouter un second : `*.ai-tech-office-console.pages.dev` (avec l'étoile au début). Il couvre **les aperçus** ;
   - **Identity providers** : cochez **One-time PIN** seulement (et, si l'option existe, activez **Instant Auth** / « skip identity provider selection »).
5. **Règle d'accès (Policy)** :
   - **Policy name** : `Propriétaire seulement` ;
   - **Action** : **Allow** ;
   - **Include** : **Emails**, puis votre adresse e-mail (la même que `OWNER_EMAIL`). **Une seule adresse.**
   - N'ajoutez aucune autre règle.
6. Enregistrez l'application (**Save**).
7. **Trouver `ACCESS_AUD`** : rouvrez l'application **Console du bureau** (**Configure** / **Edit**), onglet **Overview** ou **Basic information**. Copiez **Application Audience (AUD) Tag** : une longue suite de chiffres et de lettres. C'est la valeur de `ACCESS_AUD`.
8. Revenez à l'étape 3 pour saisir `ACCESS_TEAM_DOMAIN` et `ACCESS_AUD`, puis redéployez (étape 3, point 5).

## Étape 5 — Vérifier

1. **Dans une fenêtre de navigation privée**, ouvrez `https://ai-tech-office-console.pages.dev`.
   - Vous devez voir la page de connexion Cloudflare Access, et **jamais** la console.
   - Tapez une **autre** adresse e-mail que la vôtre : aucun code ne doit arriver, et l'accès est refusé.
2. Toujours en navigation privée, ouvrez `https://ai-tech-office-console.pages.dev/api/etat` : page de connexion, aucune donnée.
3. Ouvrez une adresse d'aperçu, par exemple celle d'un ancien déploiement (**Deployments**, cliquez sur un déploiement, copiez son adresse en `…ai-tech-office-console.pages.dev`), en navigation privée : page de connexion, aucune donnée.
4. Connectez-vous avec **votre** adresse : vous recevez un code par e-mail, vous le tapez. La console s'affiche, avec en haut à droite « Mémoire du bureau (GitHub) · lue à HH:MM ».
5. Vue 2 · Pilotage : les demandes en attente apparaissent dans « Bureau de la direction ». Le bouton **Actualiser** relit la mémoire.
6. Quand vous approuvez ou refusez une demande, deux enregistrements apparaissent sur GitHub, dans `ai-tech-office-memoire` (onglet **Commits**) : « Décision du propriétaire : … » et « Journal : décision du propriétaire … ».

Si une vérification échoue : arrêtez-vous, n'utilisez pas la console, et décrivez au bureau ce que vous voyez (sans jamais copier une valeur secrète).

## En cas de problème

| Ce que vous voyez | Ce que cela veut dire | Que faire |
|---|---|---|
| « Accès refusé. » après connexion | un des réglages `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` ou `OWNER_EMAIL` ne correspond pas, ou le déploiement n'a pas été refait | vérifiez les 3 valeurs (étapes 3 et 4), puis redéployez |
| « Configuration incomplète de la console. » | `GITHUB_TOKEN` ou `DECISION_KEY` manque (ou `DECISION_KEY` fait moins de 32 caractères) | étape 3, puis redéployez |
| « Lecture de la mémoire impossible. » | la clé GitHub a expiré, ou n'a pas accès au dépôt mémoire | étape 1 (nouvelle clé), puis étape 3 |
| « Connexion expirée » | votre session Access (24 h) est terminée | rechargez la page et reconnectez-vous |
| Une décision marquée « Signature invalide : ne compte pas » | quelqu'un a modifié `etat/decisions.json` à la main, ou `DECISION_KEY` a changé | ne tenez pas compte de cette décision ; regardez l'historique du fichier sur GitHub et prévenez le bureau |

## Ce que la console fait, et ne fait pas

- Elle lit les fichiers `etat/` de la mémoire, sur la branche `main`.
- Elle n'écrit que dans **deux** fichiers : `etat/decisions.json` (vos décisions, signées) et `etat/journal.json` (une ligne par décision).
- La clé GitHub reste chez Cloudflare : elle n'est jamais envoyée à votre navigateur.
- Votre adresse e-mail est enregistrée avec chaque décision, dans la mémoire (dépôt privé).
- Elle ne lance aucune mission et ne prévient aucun agent : une décision n'est utilisée qu'au lancement de la mission suivante.
