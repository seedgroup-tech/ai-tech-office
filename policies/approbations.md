# Demandes d'approbation

## Contenu obligatoire d'une demande N3

Le AI CTO prépare la demande ; rien n'est exécuté sans l'accord écrit du propriétaire. Une demande incomplète n'est pas présentée.

1. **Ce qui change**, en une phrase.
2. **Le produit** concerné.
3. **Le lien d'aperçu** (et le lien de comparaison de la branche).
4. **Le résultat des tests** (rapport du QA Engineer).
5. **Le résultat de la revue de sécurité** (rapport du Security Engineer).
6. **L'effet pour les utilisateurs** : ce qu'ils verront ou ce qui changera pour eux.
7. **La marche arrière en une étape** : comment revenir à l'état précédent.

## Validité d'une approbation

- L'approbation porte sur la **version exacte** présentée (le dernier commit de la branche au moment de l'accord).
- **Une approbation devient caduque si le code change après l'accord.** Une nouvelle demande est alors nécessaire.

## Demandes N2

Une demande N2 suit le même esprit, en plus court : ce qui change, pourquoi, le risque, et comment revenir en arrière. L'agent n'exécute qu'après l'accord écrit du propriétaire.
