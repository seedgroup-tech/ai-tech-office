// Outils communs aux tests : faux monde (GitHub mémoire + dépôts produits, sites, routine), horloge, logs.
// Aucune vraie valeur : tous les jetons sont factices.

export const JETONS = Object.freeze({
  GITHUB_TOKEN_ORG: "jeton-factice-org-AAAA1111",
  GITHUB_TOKEN_PERSO: "jeton-factice-perso-BBBB2222",
  GITHUB_TOKEN_MEMOIRE: "jeton-factice-memoire-CCCC3333",
  ROUTINE_ID: "routine_FAUX0123",
  ROUTINE_TOKEN: "jeton-factice-routine-DDDD4444",
});
export const ENV = Object.freeze({ ...JETONS });
export const SESSION = "https://claude.ai/code/session_FACTICE";
export const QUINZE_MIN = 15 * 60 * 1000;
export const MEMOIRE = "https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/";

const b64 = (texte) => Buffer.from(texte, "utf8").toString("base64");

export function projet(n, extra = {}) {
  return { id: `p${n}`, nom: `Projet ${n}`, depot: `seedgroup-tech/p${n}`, site: `https://p${n}.example.com`, proprietaire_cle: "org", actif: true, ...extra };
}

export function sentinelInitial(extra = {}) {
  return { pause: false, dernier_passage: "2026-11-15T09:00:00+01:00", reveils_du_jour: 0, notes: [], ...extra };
}

export function depotSain() {
  return { workflows: [{ id: 1, name: "CI", state: "active", conclusion: "success" }], pulls: [], dependabot: [] };
}

// Horloge réglable : maintenant() renvoie toujours une nouvelle Date.
export function horloge(iso = "2026-11-15T10:00:00+01:00") {
  let t = Date.parse(iso);
  return { maintenant: () => new Date(t), avancer: (ms) => { t += ms; }, regler: (i) => { t = Date.parse(i); } };
}

// options : projets, sentinel, alertes, journal, conflits { chemin: n }, surConflit(chemin, fichier)
export function creerMonde({ projets, sentinel = sentinelInitial(), alertes = [], journal = [{ id: "J-001", date: "2026-11-14", texte: "Début", agent: null, mission: null }], conflits = {}, surConflit = null } = {}) {
  const fichiers = new Map(Object.entries({
    "etat/projets.json": projets, "etat/alertes.json": alertes, "etat/journal.json": journal,
    "etat/sentinel.json": sentinel, "etat/decisions.json": [],
  }).map(([k, v]) => [k, { valeur: v, sha: "sha-0" }]));
  const monde = {
    fichiers, appels: [], conflits: { ...conflits }, surConflit,
    sites: {},                 // hôte -> statut (nombre) | "panne" | "abandon" | "challenge"
    depots: {},                // "seedgroup-tech/p1" -> { workflows, pulls, dependabot }
    routine: { appels: [], statut: 200, corps: { claude_code_session_url: SESSION } },
    memoireEnPanne: false,
    ecritures: [],             // { chemin, valeur, message }
  };
  let compteur = 0;

  function memoire(chemin, methode, init) {
    if (monde.memoireEnPanne) return new Response("{}", { status: 500 });
    const f = fichiers.get(chemin);
    if (methode === "GET") {
      if (!f) return new Response("{}", { status: 404 });
      const texte = JSON.stringify(f.valeur);
      return Response.json({ encoding: "base64", content: b64(texte), sha: f.sha, size: f.taille ?? texte.length });
    }
    if (methode === "PUT") {
      const corps = JSON.parse(init.body);
      if ((monde.conflits[chemin] || 0) > 0) {
        monde.conflits[chemin]--;
        if (monde.surConflit) monde.surConflit(chemin, f);
        f.sha = "sha-concurrent-" + ++compteur;
        return new Response("{}", { status: 409 });
      }
      if (!f || corps.sha !== f.sha) return new Response("{}", { status: 409 });
      const valeur = JSON.parse(Buffer.from(corps.content, "base64").toString("utf8"));
      fichiers.set(chemin, { valeur, sha: "sha-" + ++compteur });
      monde.ecritures.push({ chemin, valeur, message: corps.message });
      return Response.json({ content: { sha: "sha-" + compteur } });
    }
    return new Response("{}", { status: 405 });
  }

  function produit(depot, suite) {
    const d = monde.depots[depot];
    if (!d) return new Response("{}", { status: 404 });
    if (suite.startsWith("/actions/workflows?")) {
      return Response.json({ workflows: d.workflows.map((w) => ({ id: w.id, name: w.name, state: w.state })) });
    }
    const m = /^\/actions\/workflows\/(\d+)\/runs\?/.exec(suite);
    if (m) {
      const w = d.workflows.find((x) => String(x.id) === m[1]);
      const runs = w && w.conclusion ? [{ conclusion: w.conclusion, name: w.name, html_url: `https://github.com/${depot}/actions/runs/1` }] : [];
      return Response.json({ workflow_runs: runs });
    }
    if (suite.startsWith("/pulls?")) return Response.json(d.pulls.slice(0, 1));
    if (suite.startsWith("/dependabot/alerts?")) {
      if (typeof d.dependabot === "number") return new Response("{}", { status: d.dependabot });
      return Response.json(d.dependabot.slice(0, 1));
    }
    return new Response("{}", { status: 404 });
  }

  monde.fetchFn = async (url, init = {}) => {
    const methode = (init.method || "GET").toUpperCase();
    monde.appels.push({ url, methode, init });
    const u = new URL(url);
    if (u.hostname === "api.github.com") {
      const m = /^\/repos\/seedgroup-tech\/ai-tech-office-memoire\/contents\/(.+)$/.exec(u.pathname);
      if (m) return memoire(m[1], methode, init);
      const r = /^\/repos\/([^/]+\/[^/]+)(\/.*)?$/.exec(u.pathname);
      if (r && methode === "GET") return produit(r[1], (r[2] || "") + u.search);
      return new Response("{}", { status: 404 });
    }
    if (u.hostname === "api.anthropic.com") {
      monde.routine.appels.push({ url, init });
      if (monde.routine.statut !== 200) return new Response("{}", { status: monde.routine.statut });
      return Response.json(monde.routine.corps);
    }
    const etat = monde.sites[u.hostname];
    if (etat === "panne") throw new TypeError("fetch failed");
    if (etat === "abandon") { const e = new Error("abandon"); e.name = "AbortError"; throw e; }
    if (etat === "challenge") return new Response("", { status: 403, headers: { "cf-mitigated": "challenge" } });
    return new Response("ok", { status: typeof etat === "number" ? etat : 200 });
  };
  monde.lire = (chemin) => fichiers.get(chemin).valeur;
  monde.nonGet = () => monde.appels.filter((a) => a.methode !== "GET");
  return monde;
}

// Capture console.log / console.error ; restaurer() remet les originaux.
export function capturerLogs() {
  const lignes = [];
  const orig = { log: console.log, error: console.error };
  const noter = (...a) => lignes.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  console.log = noter; console.error = noter;
  return { lignes, restaurer: () => { console.log = orig.log; console.error = orig.error; } };
}

// Monde complet prêt à simuler : projets n°1..n avec sites et dépôts sains.
export function mondeSimule(n, options = {}) {
  const projets = Array.from({ length: n }, (_, i) => projet(i + 1));
  const monde = creerMonde({ projets, ...options });
  for (const p of projets) { monde.depots[p.depot] = depotSain(); monde.sites[new URL(p.site).hostname] = 200; }
  return monde;
}
