# Secrets

Un secret est toute information qui donne un accès : clé d'API, jeton, mot de passe, clé privée, chaîne de connexion à une base, etc.

## Règles

- **Aucun secret** dans un prompt, dans un fichier versionné, ni dans une variable d'environnement de session.
- **Seuls les noms de variables** sont écrits (par exemple : « la variable `NOM_DE_LA_VARIABLE` doit être définie »), jamais leurs valeurs.
- Aucun agent ne lit, ne copie ni n'écrit un secret. Les fichiers de secrets (`.env*`, `*.pem`, `*.key`) ne sont pas ouverts.
- **Tout secret découvert est signalé immédiatement** au AI CTO, qui prévient le propriétaire, **sans le recopier** : on indique seulement le fichier et l'emplacement.
- La correction (révocation, remplacement) est décidée par le propriétaire.
