// Accès GitHub de Sentinel.
// Origine : console/lib/github.mjs (M-006), recopié et adapté pour M-008.
// - Mémoire : lecture de etat/*.json ; écriture limitée à 3 fichiers (liste figée).
// - Dépôts produits : client séparé, uniquement des fonctions GET.

export const DEPOT = "seedgroup-tech/ai-tech-office-memoire";
export const BRANCHE = "main";
export const ECRITURE_PERMISE = Object.freeze(["etat/alertes.json", "etat/journal.json", "etat/sentinel.json"]);
const LECTURE_PERMISE = /^etat\/[a-z]+\.json$/;
const NOM_DEPOT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

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

function entetes(jeton) {
  return {
    Authorization: `Bearer ${jeton}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-tech-office-sentinel",
  };
}

function verifierJeton(jeton) {
  if (typeof jeton !== "string" || !jeton) throw new Error("Jeton GitHub absent.");
}

// Client de la mémoire. `reseau` est le fetch gardé de lib/reseau.mjs.
export function clientMemoire(jeton, reseau) {
  verifierJeton(jeton);
  const h = entetes(jeton);
  const url = (chemin) => `https://api.github.com/repos/${DEPOT}/contents/${chemin}`;

  // Renvoie { valeur, sha, size } ; valeur = null si le fichier n'existe pas.
  async function lire(chemin) {
    if (!LECTURE_PERMISE.test(chemin)) throw new Error("Lecture non permise.");
    const rep = await reseau(`${url(chemin)}?ref=${BRANCHE}`, { method: "GET", headers: h });
    if (rep.status === 404) return { valeur: null, sha: null, size: 0 };
    if (!rep.ok) throw new ErreurGitHub("Lecture GitHub impossible.", rep.status);
    const j = await rep.json();
    if (j.encoding !== "base64" || typeof j.content !== "string") throw new ErreurGitHub("Fichier illisible (trop gros ?).", 500);
    return { valeur: JSON.parse(base64VersTexte(j.content)), sha: j.sha, size: Number.isFinite(j.size) ? j.size : 0 };
  }

  // Un commit sur main. La liste d'écriture est vérifiée AVANT tout appel réseau.
  async function ecrire(chemin, valeur, sha, message) {
    if (!ECRITURE_PERMISE.includes(chemin)) throw new Error("Écriture non permise : " + chemin);
    const corps = { message, content: texteVersBase64(JSON.stringify(valeur, null, 2) + "\n"), branch: BRANCHE };
    if (sha) corps.sha = sha;
    const rep = await reseau(url(chemin), {
      method: "PUT",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    if (rep.status === 409 || rep.status === 422) throw new ErreurConflit("Le fichier a changé entre-temps.");
    if (!rep.ok) throw new ErreurGitHub("Écriture GitHub impossible.", rep.status);
    return true;
  }

  return { lire, ecrire };
}

// Client d'un dépôt produit : UNIQUEMENT des lectures (GET). Aucune méthode d'écriture.
// Chaque fonction renvoie { ok, statut, donnees } ; une erreur réseau est levée.
export function clientProduit(jeton, depot, reseau) {
  verifierJeton(jeton);
  if (typeof depot !== "string" || !NOM_DEPOT.test(depot)) throw new Error("Nom de dépôt invalide.");
  if (depot.toLowerCase() === DEPOT.toLowerCase()) throw new Error("Le dépôt mémoire n'est pas un produit.");
  const h = entetes(jeton);

  async function obtenir(suite) {
    const rep = await reseau(`https://api.github.com/repos/${depot}${suite}`, { method: "GET", headers: h });
    let donnees = null;
    if (rep.ok) { try { donnees = await rep.json(); } catch { donnees = null; } }
    else { try { await rep.body?.cancel(); } catch { /* sans importance */ } }
    return { ok: rep.ok && donnees !== null, statut: rep.status, donnees };
  }

  return {
    workflows: () => obtenir("/actions/workflows?per_page=10"),
    executionsWorkflow: (id, branche) => {
      if (!Number.isInteger(id)) throw new Error("Identifiant de workflow invalide.");
      return obtenir(`/actions/workflows/${id}/runs?branch=${encodeURIComponent(branche)}&status=completed&exclude_pull_requests=true&per_page=1`);
    },
    plusAncienneDemandeFusion: () => obtenir("/pulls?state=open&sort=created&direction=asc&per_page=1"),
    alertesDependabot: () => obtenir("/dependabot/alerts?state=open&severity=critical,high&per_page=1"),
  };
}
