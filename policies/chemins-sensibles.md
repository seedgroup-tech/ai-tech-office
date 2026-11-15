# Chemins sensibles

Le contrôle automatique **« controle-chemins-sensibles »** surveille les fichiers ci-dessous dans chaque demande de fusion vers un dépôt de référence.

## Motifs surveillés

- `.claude/`
- `.mcp.json`
- `CLAUDE.md`
- `.github/`
- `.env*`
- `*.pem`
- `*.key`
- `package.json` et les fichiers de verrouillage (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, etc.)
- `wrangler.toml`, `wrangler.json`, `wrangler.jsonc`
- `vercel.json`
- `netlify.toml`
- `_headers`
- `_redirects`
- `supabase/`
- `migrations/`
- `policies/` — le contrôle automatique sera mis à jour par le propriétaire dans le dépôt de référence.

## Règle

**Contrôle rouge, absent ou en erreur = pas de fusion sans examen explicite du propriétaire.**

Un contrôle rouge n'est pas forcément une anomalie : il signale qu'un fichier de cadre, de configuration ou de données est modifié. Le propriétaire lit alors ces fichiers un par un avant de décider.
