// Réponse de GET /sante. Aucun nom de projet, aucune adresse, aucune clé.
// Cache en mémoire de l'instance (5 minutes) : au plus une lecture GitHub par instance et par période,
// même sous rafale. Si GitHub échoue : dernière réponse connue, sinon { statut: "inconnu" }.
import { creerReseau } from "./reseau.mjs";
import { clientMemoire } from "./github.mjs";

export const VERSION = "1.0.0";
export const DUREE_CACHE_MS = 5 * 60 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

let cache = null;     // { t, corps }
let enCours = null;   // lecture en cours (partagée par les appels simultanés)

export function reinitialiserCacheSante() { cache = null; enCours = null; }

const entier = (v) => (Number.isInteger(v) && v >= 0 ? v : null);

// Corps de réponse construit depuis sentinel.json (champs filtrés, un par un).
export function corpsSante(s) {
  const r = s && typeof s.dernier_resultat === "object" && s.dernier_resultat ? s.dernier_resultat : {};
  const gros = s && s.fichiers_trop_gros && typeof s.fichiers_trop_gros === "object" ? s.fichiers_trop_gros : {};
  return {
    service: "ai-tech-office-sentinel",
    version: VERSION,
    dernier_passage: typeof s.dernier_passage === "string" && ISO.test(s.dernier_passage) ? s.dernier_passage : null,
    en_veille: s.pause !== false,
    anomalies_ouvertes: entier(r.anomalies_ouvertes),
    erreurs_dernier_passage: entier(r.erreurs),
    fichiers_trop_gros: gros.alertes === true || gros.journal === true,
  };
}

export async function donneesSante(env, { fetchFn = fetch, maintenant = () => new Date() } = {}) {
  const t = maintenant().getTime();
  if (cache && t - cache.t < DUREE_CACHE_MS) return cache.corps;
  if (enCours) return enCours;
  enCours = (async () => {
    let corps;
    try {
      const jeton = env.GITHUB_TOKEN_MEMOIRE || env.GITHUB_TOKEN_ORG;
      const memoire = clientMemoire(jeton, creerReseau({ fetchFn, plafond: { total: 3, reserve: 3 } }));
      const { valeur } = await memoire.lire("etat/sentinel.json");
      corps = valeur && typeof valeur === "object" ? corpsSante(valeur) : { statut: "inconnu" };
    } catch {
      corps = cache ? cache.corps : { statut: "inconnu" };
    }
    cache = { t, corps };   // l'essai compte aussi en cas d'échec : pas de nouvelle lecture avant 5 minutes
    return corps;
  })();
  try { return await enCours; } finally { enCours = null; }
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
