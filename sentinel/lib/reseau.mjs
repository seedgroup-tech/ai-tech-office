// Réseau gardé : un seul point de passage pour tous les appels sortants de Sentinel.
// Règles : https obligatoire, hôte comparé EXACTEMENT, redirections non suivies,
// délai maximal par appel, budget unique d'appels externes par passage (offre gratuite Cloudflare :
// 50 au plus ; Sentinel s'en tient à 40, dont 14 réservés aux écritures, relectures et réveils).

export const HOTE_GITHUB = "api.github.com";
export const HOTE_ANTHROPIC = "api.anthropic.com";
const DELAIS_MS = { [HOTE_GITHUB]: 10000, [HOTE_ANTHROPIC]: 15000 };
const DELAI_SITE_MS = 10000;
const MEMOIRE = "/repos/seedgroup-tech/ai-tech-office-memoire/";

export class ErreurReseau extends Error {
  constructor(message) { super(message); this.garde = true; }
}

// plafond : { total, reserve } ; `reserve` sous-requêtes sont gardées aux écritures,
// aux réveils et aux lectures de la mémoire.
export function creerReseau({ fetchFn = fetch, sitesPermis = [], plafond = { total: 40, reserve: 14 } } = {}) {
  const sites = new Set(sitesPermis);
  let compte = 0;

  async function garde(url, init = {}) {
    let u;
    try { u = new URL(url); } catch { throw new ErreurReseau("Adresse refusée."); }
    if (u.protocol !== "https:") throw new ErreurReseau("Protocole refusé.");
    const hote = u.hostname;
    if (hote !== HOTE_GITHUB && hote !== HOTE_ANTHROPIC && !sites.has(hote)) throw new ErreurReseau("Hôte refusé.");

    const methode = (init.method || "GET").toUpperCase();
    const reserve = methode !== "GET" || (hote === HOTE_GITHUB && u.pathname.startsWith(MEMOIRE));
    if (compte >= plafond.total || (!reserve && compte >= plafond.total - plafond.reserve)) throw new ErreurReseau("Budget d'appels atteint.");
    compte++;

    const controleur = new AbortController();
    const minuteur = setTimeout(() => controleur.abort(), DELAIS_MS[hote] || DELAI_SITE_MS);
    try {
      return await fetchFn(url, { ...init, redirect: "manual", signal: controleur.signal });
    } finally {
      clearTimeout(minuteur);
    }
  }

  garde.autoriserSite = (hote) => { sites.add(hote); };
  garde.sousRequetes = () => compte;
  // Appels encore disponibles pour les contrôles (hors réserve).
  garde.restantControles = () => Math.max(0, plafond.total - plafond.reserve - compte);
  return garde;
}
