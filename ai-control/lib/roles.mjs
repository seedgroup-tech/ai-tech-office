// Qui est qui : deux listes d'adresses dans l'environnement, aucune autre règle.
//   DIRECTION      : adresses Direction / Finance (voient et gèrent tout)
//   COLLABORATEURS : adresses des collaborateurs (voient leur usage et le budget global)
// Une adresse absente des deux listes est refusée. Une adresse dans les deux est Direction.
// La même liste doit figurer dans l'application Cloudflare Access (voir README.md).

export const ROLES = { direction: "direction", collaborateur: "collaborateur" };

export function listeEmails(texte) {
  return String(texte || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
}

export function roleDe(email, env) {
  const adresse = String(email || "").trim().toLowerCase();
  if (!adresse) return null;
  if (listeEmails(env?.DIRECTION).includes(adresse)) return ROLES.direction;
  if (listeEmails(env?.COLLABORATEURS).includes(adresse)) return ROLES.collaborateur;
  return null;
}
