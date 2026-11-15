// Accès au dépôt mémoire par l'API GitHub (contents).
// Le jeton (env.GITHUB_TOKEN) reste côté serveur : il n'est jamais renvoyé au navigateur.
// Écriture limitée à deux fichiers : etat/decisions.json et etat/journal.json.

export const DEPOT = "seedgroup-tech/ai-tech-office-memoire";
export const BRANCHE = "main";
export const ECRITURE_PERMISE = Object.freeze(["etat/decisions.json", "etat/journal.json"]);
const LECTURE_PERMISE = /^etat\/[a-z]+\.json$/;

export class ErreurConflit extends Error {}
export class ErreurGitHub extends Error {
  constructor(message, statut) { super(message); this.statut = statut; }
}

function base64VersTexte(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  const octets = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(octets);
}

function texteVersBase64(texte) {
  const octets = new TextEncoder().encode(texte);
  let bin = "";
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function clientGitHub(jeton, fetchFn = fetch) {
  if (typeof jeton !== "string" || !jeton) throw new Error("Jeton GitHub absent.");
  const entetes = {
    Authorization: `Bearer ${jeton}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-tech-office-console",
  };
  const url = (chemin) => `https://api.github.com/repos/${DEPOT}/contents/${chemin}`;

  // Renvoie { valeur, sha } ; valeur = null si le fichier n'existe pas.
  async function lire(chemin) {
    if (!LECTURE_PERMISE.test(chemin)) throw new Error("Lecture non permise.");
    const rep = await fetchFn(`${url(chemin)}?ref=${BRANCHE}`, { headers: entetes });
    if (rep.status === 404) return { valeur: null, sha: null };
    if (!rep.ok) throw new ErreurGitHub("Lecture GitHub impossible.", rep.status);
    const j = await rep.json();
    if (j.encoding !== "base64" || typeof j.content !== "string") throw new ErreurGitHub("Fichier illisible (trop gros ?).", 500);
    return { valeur: JSON.parse(base64VersTexte(j.content)), sha: j.sha };
  }

  // Un commit sur main. sha = version lue juste avant ; GitHub refuse (409) si le fichier a changé entre-temps.
  async function ecrire(chemin, valeur, sha, message) {
    if (!ECRITURE_PERMISE.includes(chemin)) throw new Error("Écriture non permise : " + chemin);
    const corps = { message, content: texteVersBase64(JSON.stringify(valeur, null, 2) + "\n"), branch: BRANCHE };
    if (sha) corps.sha = sha;
    const rep = await fetchFn(url(chemin), {
      method: "PUT",
      headers: { ...entetes, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    if (rep.status === 409 || rep.status === 422) throw new ErreurConflit("Le fichier a changé entre-temps.");
    if (!rep.ok) throw new ErreurGitHub("Écriture GitHub impossible.", rep.status);
    return true;
  }

  return { lire, ecrire };
}
