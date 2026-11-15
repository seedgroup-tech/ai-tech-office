// Réponse de GET /sante : seulement { "ok": true } ou { "ok": false }.
// ok = sentinel.json lu ET dernier_passage valide et de moins de 2 heures.
// Cache en mémoire de l'instance (5 minutes) : au plus une lecture GitHub par instance et par période,
// même sous rafale. Si GitHub échoue : dernière valeur connue, sinon ok = false.
import { creerReseau } from "./reseau.mjs";
import { clientMemoire } from "./github.mjs";
import { enMs } from "./temps.mjs";

export const DUREE_CACHE_MS = 5 * 60 * 1000;
export const AGE_MAX_MS = 2 * 3600 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

let cache = null;     // { t, passage } : passage = dernier_passage lu (texte) ou null
let enCours = null;   // lecture en cours (partagée par les appels simultanés)

export function reinitialiserCacheSante() { cache = null; enCours = null; }

// ok ? Le calcul se fait à chaque appel, avec l'heure courante, sur la dernière valeur lue.
export function etatOk(passage, maintenant) {
  if (typeof passage !== "string" || !ISO.test(passage)) return false;
  const age = maintenant.getTime() - enMs(passage);
  return Number.isFinite(age) && age < AGE_MAX_MS && age > -10 * 60 * 1000;
}

async function lirePassage(env, fetchFn, ancienne) {
  try {
    const memoire = clientMemoire(env.GITHUB_TOKEN_MEMOIRE, creerReseau({ fetchFn, plafond: { total: 3, reserve: 3 } }));
    const { valeur } = await memoire.lire("etat/sentinel.json");
    return valeur && typeof valeur === "object" && typeof valeur.dernier_passage === "string" ? valeur.dernier_passage : null;
  } catch {
    return ancienne;   // GitHub en échec : dernière valeur connue (null au départ)
  }
}

export async function donneesSante(env, { fetchFn = fetch, maintenant = () => new Date() } = {}) {
  const t = maintenant().getTime();
  if (!(cache && t - cache.t < DUREE_CACHE_MS)) {
    if (!enCours) {
      enCours = (async () => {
        const passage = await lirePassage(env, fetchFn, cache ? cache.passage : null);
        cache = { t, passage };   // l'essai compte aussi en cas d'échec : pas de nouvelle lecture avant 5 minutes
      })();
    }
    try { await enCours; } finally { enCours = null; }
  }
  return { ok: etatOk(cache.passage, maintenant()) };
}

const ENTETES = Object.freeze({
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
});

// Seul GET /sante répond ; tout le reste (autre chemin, autre méthode, HEAD) : 404.
export async function repondre(request, env, options = {}) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname !== "/sante") {
    return new Response("Introuvable", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  return new Response(JSON.stringify(await donneesSante(env, options)), { status: 200, headers: ENTETES });
}
