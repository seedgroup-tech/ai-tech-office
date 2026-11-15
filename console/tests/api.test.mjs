import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { lireEtat, enregistrerDecision } from "../lib/api.mjs";
import { clientGitHub } from "../lib/github.mjs";
import { verifierSignature } from "../lib/signature.mjs";
import { viderCacheCertificats } from "../lib/acces.mjs";
import { onRequest as middleware } from "../functions/_middleware.js";
import { onRequest as routeEtat } from "../functions/api/etat.js";
import { ENV, EMAIL, JETON_GITHUB_TEST, CLE_TEST, fauxGitHub, paireRsa, fabriquerJeton, chargeValide, fauxCerts } from "./outils.mjs";

const etatEssai = () => ({
  "etat/agents.json": [{ id: "cto", statut: "disponible" }],
  "etat/missions.json": [{ numero: "M-006", statut: "en_cours", tri: 60 }],
  "etat/demandes.json": [{ id: "S-001-entetes", titre: "Ajouter des en-têtes", mission: "S-001" }, { id: "M-001-fiches", titre: "Préciser trois fiches", mission: "M-001" }],
  "etat/alertes.json": [],
  "etat/journal.json": [{ id: "J-001", date: "2026-11-13", texte: "a" }, { id: "J-019", date: "2026-11-15", texte: "b" }],
  "etat/decisions.json": [{ id: "H-001", demande_id: null, titre: "x", choix: "approuvee", decide_le: "2026-11-14", par: "propriétaire", signature: null, origine: "historique, enregistrée par Claude" }],
  "etat/meta.json": { maj: "2026-11-15", par: "AI CTO" },
});

const requete = (corps, entetes = {}) => new Request("https://console.example.com/api/decision", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "https://console.example.com", ...entetes },
  body: typeof corps === "string" ? corps : JSON.stringify(corps),
});

test("GET /api/etat : un seul objet, statuts calculés, jeton GitHub jamais renvoyé", async () => {
  const gh = fauxGitHub(etatEssai());
  const rep = await lireEtat(ENV, { fetchFn: gh.fetchFn });
  assert.equal(rep.status, 200);
  assert.equal(rep.headers.get("Cache-Control"), "no-store");
  const texte = await rep.text();
  assert.equal(texte.includes(JETON_GITHUB_TEST), false);
  assert.equal(texte.includes(CLE_TEST), false);
  const j = JSON.parse(texte);
  for (const k of ["agents", "missions", "demandes", "alertes", "journal", "decisions", "meta", "lu_le"]) assert.ok(k in j, k);
  assert.deepEqual(j.demandes.map((d) => d.statut), ["en_attente", "en_attente"]);
  assert.equal(j.decisions[0].verification, "historique");
  assert.equal(j.journal[0].id, "J-019", "journal du plus récent au plus ancien");
  // Le jeton n'est envoyé qu'à api.github.com, et seulement en lecture.
  assert.ok(gh.appels.every((a) => a.url.startsWith("https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/etat/")));
  assert.ok(gh.appels.every((a) => a.methode === "GET"));
});

test("GET /api/etat : configuration absente -> erreur, rien n'est lu", async () => {
  const gh = fauxGitHub(etatEssai());
  const rep = await lireEtat({ ...ENV, DECISION_KEY: "" }, { fetchFn: gh.fetchFn });
  assert.equal(rep.status, 500);
  assert.equal(gh.appels.length, 0);
});

test("GET /api/etat : erreur GitHub -> message générique", async () => {
  const rep = await lireEtat(ENV, { fetchFn: async () => new Response("secret interne", { status: 500 }) });
  assert.equal(rep.status, 502);
  assert.equal((await rep.text()).includes("secret interne"), false);
});

test("POST /api/decision : crée une décision signée valide et une entrée de journal", async () => {
  const gh = fauxGitHub(etatEssai());
  const rep = await enregistrerDecision({ request: requete({ demande_id: "S-001-entetes", choix: "approuvee", commentaire: "  ok pour moi \u0007" }), env: ENV, email: EMAIL, fetchFn: gh.fetchFn, maintenant: Date.parse("2026-11-15T16:00:00Z") });
  assert.equal(rep.status, 200);
  const decisions = gh.depot.get("etat/decisions.json");
  const d = decisions.valeur.at(-1);
  assert.equal(d.demande_id, "S-001-entetes");
  assert.equal(d.choix, "approuvee");
  assert.equal(d.par, EMAIL);
  assert.equal(d.decide_le, "2026-11-15T16:00:00.000Z");
  assert.equal(d.commentaire, "ok pour moi");
  assert.equal(d.titre, "Ajouter des en-têtes");
  assert.equal(d.origine, "console du propriétaire");
  assert.equal(await verifierSignature(d, CLE_TEST), true);
  assert.equal(decisions.message, "Décision du propriétaire : approuvee — Ajouter des en-têtes");
  assert.equal(decisions.branche, "main");
  assert.equal(decisions.valeur.length, 2, "l'historique est conservé");
  const journal = gh.depot.get("etat/journal.json").valeur;
  assert.equal(journal.at(-1).id, "J-020");
  assert.equal(journal.at(-1).mission, "S-001");
  // Seuls ces deux fichiers sont écrits.
  const ecrits = gh.appels.filter((a) => a.methode === "PUT").map((a) => a.url.split("/contents/")[1]);
  assert.deepEqual(ecrits, ["etat/decisions.json", "etat/journal.json"]);
  // Le statut devient « approuvee ».
  const etat = await (await lireEtat(ENV, { fetchFn: gh.fetchFn })).json();
  assert.equal(etat.demandes.find((x) => x.id === "S-001-entetes").statut, "approuvee");
});

test("POST /api/decision : conflit d'écriture -> relit et réessaie une fois, sans écraser", async () => {
  const gh = fauxGitHub(etatEssai(), {
    conflits: 1,
    surConflit: (chemin, f) => { if (chemin === "etat/decisions.json") f.valeur = [...f.valeur, { id: "AUTRE", demande_id: null, signature: null, origine: "historique, enregistrée par Claude" }]; },
  });
  const rep = await enregistrerDecision({ request: requete({ demande_id: "M-001-fiches", choix: "refusee" }), env: ENV, email: EMAIL, fetchFn: gh.fetchFn });
  assert.equal(rep.status, 200);
  const ids = gh.depot.get("etat/decisions.json").valeur.map((d) => d.id);
  assert.ok(ids.includes("AUTRE"), "la modification concurrente est conservée");
  assert.equal(ids.length, 3);
});

test("POST /api/decision : deux conflits de suite -> 409, rien d'écrasé", async () => {
  const gh = fauxGitHub(etatEssai(), { conflits: 2 });
  const rep = await enregistrerDecision({ request: requete({ demande_id: "M-001-fiches", choix: "refusee" }), env: ENV, email: EMAIL, fetchFn: gh.fetchFn });
  assert.equal(rep.status, 409);
  assert.equal(gh.depot.get("etat/decisions.json").valeur.length, 1);
});

test("POST /api/decision : demande déjà décidée par une décision signée -> 409", async () => {
  const gh = fauxGitHub(etatEssai());
  const r1 = await enregistrerDecision({ request: requete({ demande_id: "S-001-entetes", choix: "approuvee" }), env: ENV, email: EMAIL, fetchFn: gh.fetchFn });
  assert.equal(r1.status, 200);
  const r2 = await enregistrerDecision({ request: requete({ demande_id: "S-001-entetes", choix: "refusee" }), env: ENV, email: EMAIL, fetchFn: gh.fetchFn });
  assert.equal(r2.status, 409);
});

test("POST /api/decision : entrées invalides refusées", async () => {
  const gh = fauxGitHub(etatEssai());
  const cas = [
    [requete({ demande_id: "inconnue", choix: "approuvee" }), 404],
    [requete({ demande_id: "S-001-entetes", choix: "peut-etre" }), 400],
    [requete({ demande_id: "../../x", choix: "approuvee" }), 400],
    [requete({ demande_id: "S-001-entetes", choix: "approuvee", commentaire: 5 }), 400],
    [requete("pas du json"), 400],
    [requete({ demande_id: "S-001-entetes", choix: "approuvee", commentaire: "x".repeat(5000) }), 413],
    [requete({ demande_id: "S-001-entetes", choix: "approuvee" }, { Origin: "https://attaquant.example" }), 403],
    [requete({ demande_id: "S-001-entetes", choix: "approuvee" }, { "Sec-Fetch-Site": "cross-site" }), 403],
    [requete({ demande_id: "S-001-entetes", choix: "approuvee" }, { "Content-Type": "text/plain" }), 415],
  ];
  for (const [req, attendu] of cas) {
    const rep = await enregistrerDecision({ request: req, env: ENV, email: EMAIL, fetchFn: gh.fetchFn });
    assert.equal(rep.status, attendu);
  }
  const rep = await enregistrerDecision({ request: requete({ demande_id: "S-001-entetes", choix: "approuvee" }), env: ENV, email: null, fetchFn: gh.fetchFn });
  assert.equal(rep.status, 403);
  assert.equal(gh.appels.filter((a) => a.methode === "PUT").length, 0);
});

test("le client GitHub refuse d'écrire ailleurs que decisions.json et journal.json", async () => {
  const gh = fauxGitHub(etatEssai());
  const c = clientGitHub("x", gh.fetchFn);
  for (const chemin of ["etat/agents.json", "etat/demandes.json", "CLAUDE.md", "etat/../CLAUDE.md"]) {
    await assert.rejects(() => c.ecrire(chemin, [], "sha-0", "m"));
  }
  await assert.rejects(() => c.lire("../CLAUDE.md"));
  assert.equal(gh.appels.length, 0);
});

// --- Garde d'entrée (middleware) ---
const paire = await paireRsa("cle-mw");
let fetchOriginal;
beforeEach(() => { viderCacheCertificats(); fetchOriginal = globalThis.fetch; globalThis.fetch = fauxCerts(paire).fetchFn; });
afterEach(() => { globalThis.fetch = fetchOriginal; });

function contexte(entetes, env = ENV) {
  let suivant = false;
  const ctx = {
    request: new Request("https://console.example.com/api/etat", { headers: entetes }),
    env,
    data: {},
    next: async () => { suivant = true; return new Response("contenu protégé"); },
  };
  return { ctx, aAppeleSuivant: () => suivant };
}

test("middleware : sans jeton -> 403, la page n'est pas servie", async () => {
  const { ctx, aAppeleSuivant } = contexte({});
  const rep = await middleware(ctx);
  assert.equal(rep.status, 403);
  assert.equal(aAppeleSuivant(), false);
  assert.equal(rep.headers.get("X-Frame-Options"), "DENY");
  assert.equal(rep.headers.get("Cache-Control"), "no-store");
});

test("middleware : jeton d'un autre e-mail -> 403", async () => {
  const jeton = await fabriquerJeton(paire, { ...chargeValide(), email: "intrus@example.com" });
  const { ctx, aAppeleSuivant } = contexte({ "Cf-Access-Jwt-Assertion": jeton });
  assert.equal((await middleware(ctx)).status, 403);
  assert.equal(aAppeleSuivant(), false);
});

test("middleware : configuration absente -> 403 même avec un jeton valide", async () => {
  const jeton = await fabriquerJeton(paire, chargeValide());
  const { ctx, aAppeleSuivant } = contexte({ "Cf-Access-Jwt-Assertion": jeton }, { ...ENV, OWNER_EMAIL: "" });
  assert.equal((await middleware(ctx)).status, 403);
  assert.equal(aAppeleSuivant(), false);
});

test("middleware : jeton valide -> page servie avec les en-têtes de sécurité", async () => {
  const jeton = await fabriquerJeton(paire, chargeValide());
  const { ctx, aAppeleSuivant } = contexte({ "Cf-Access-Jwt-Assertion": jeton });
  const rep = await middleware(ctx);
  assert.equal(rep.status, 200);
  assert.equal(aAppeleSuivant(), true);
  assert.equal(ctx.data.email, EMAIL);
  assert.match(rep.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.equal(rep.headers.get("Referrer-Policy"), "no-referrer");
  assert.equal(rep.headers.get("Cache-Control"), "no-store");
});

test("route /api/etat : autre méthode que GET refusée", async () => {
  const rep = await routeEtat({ request: new Request("https://c.example/api/etat", { method: "DELETE" }), env: ENV });
  assert.equal(rep.status, 405);
});
