// Nettoyage des textes venant de l'extérieur (dépôts, réponses, fichiers).
// Caractères de contrôle retirés (sauf le saut de ligne si `sautsDeLigne`), longueur limitée.

export function nettoyer(valeur, max = 120, sautsDeLigne = false) {
  if (valeur === null || valeur === undefined) return "";
  // + caractères invisibles ou de sens d'écriture (U+200B-200F, 202A-202E, 2066-2069, FEFF)
  const motif = sautsDeLigne
    ? /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
    : /[\u0000-\u001F\u007F-\u009F\u2028\u2029\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
  return String(valeur).replace(motif, "").slice(0, max);
}

// Adresse https de GitHub seulement, sinon null.
export function lienGitHub(valeur) {
  return typeof valeur === "string" && valeur.startsWith("https://github.com/") && valeur.length <= 300 ? valeur : null;
}
