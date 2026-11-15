# Niveaux de risque

Chaque action d'un agent est classée dans l'un des quatre niveaux ci-dessous. **En cas de doute, on retient le niveau supérieur.**

| Niveau | Nature | Exemples | Qui décide | Qui exécute |
|---|---|---|---|---|
| **N0** | Lecture | Lire du code, de la documentation, des comptes rendus. | L'agent | L'agent |
| **N1** | Changement réversible et isolé, sur une branche `agent/` | Modifier du code, ajouter un test, écrire une note sur une branche de mission. | L'agent | L'agent, qui note l'action dans le compte rendu |
| **N2** | Changement de cadre | Nouvelle dépendance, nouvelle connexion, fichier de CI, permission ou hook, modification de `CLAUDE.md`, `.claude/` ou `policies/`, message envoyé à un tiers. | Le propriétaire | L'agent, **après** l'accord écrit du propriétaire |
| **N3** | Production, données, argent, irréversible | Fusion dans un dépôt de référence, migration de production, suppression, domaine et DNS, toute dépense. | **Le propriétaire seul** | Le propriétaire (la fusion est faite par lui) |

## Mises à jour de dépendances

Une mise à jour de dépendance, mineure ou majeure, peut être préparée sur une branche `agent/` (N1) ; son intégration exige l'accord écrit du propriétaire, et une montée de version majeure exige en plus l'avis préalable de l'Architecte.

L'ajout d'une **nouvelle** dépendance reste de niveau N2.

## Règles propres au niveau N3

- L'accord écrit du propriétaire est lié à la **version exacte** présentée (voir `approbations.md`).
- Si le code change après l'accord, l'accord devient caduc.
- Aucun agent ne fusionne, ne déploie, ne supprime ni ne dépense.
