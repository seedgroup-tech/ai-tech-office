# Console du bureau (M-006)

Page privée du propriétaire, hébergée sur Cloudflare Pages. Elle lit et écrit directement dans le dépôt `ai-tech-office-memoire` (dossier `etat/`), seule source de vérité. Aucune base de données, aucune dépendance, aucune étape de construction.

| Dossier | Contenu |
|---|---|
| `public/` | la page (HTML, CSS, JavaScript sans bibliothèque) et `_headers` (en-têtes de sécurité) |
| `functions/_middleware.js` | garde d'entrée : jeton Cloudflare Access obligatoire sur toutes les requêtes |
| `functions/api/etat.js` | `GET /api/etat` : lecture de `etat/` |
| `functions/api/decision.js` | `POST /api/decision` : décision signée du propriétaire |
| `lib/` | logique commune (vérification du jeton, signature HMAC, statuts, accès GitHub) |
| `tests/` | tests sans dépendance |
| `INSTALLATION.md` | guide d'installation pour le propriétaire |

Tests : `cd console && node --test` (Node 22 ou plus récent).

Réglages lus dans `env` (secrets saisis par le propriétaire dans Cloudflare, jamais dans le code) : `GITHUB_TOKEN`, `DECISION_KEY`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `OWNER_EMAIL`.

Format des fichiers lus : `etat/SCHEMA.md` dans `ai-tech-office-memoire`.
