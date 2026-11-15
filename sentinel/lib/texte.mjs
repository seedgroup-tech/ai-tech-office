// Nettoyage des textes venant de l'extérieur (dépôts, réponses, fichiers).
// Caractères de contrôle retirés (sauf le saut de ligne si `sautsDeLigne`), longueur limitée.

export function nettoyer(valeur, max = 120, sautsDeLigne = false) {
  if (valeur === null || valeur === undefined) return "";
  const motif = sautsDeLigne ? /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029]/g : /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g;
  return String(valeur).replace(motif, "").slice(0, max);
}

// Adresse https de GitHub seulement, sinon null.
export function lienGitHub(valeur) {
  return typeof valeur === "string" && valeur.startsWith("https://github.com/") && valeur.length <= 300 ? valeur : null;
}
