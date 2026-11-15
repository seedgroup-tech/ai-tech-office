import test from "node:test";
import assert from "node:assert/strict";
import { creerReseau } from "../lib/reseau.mjs";
import { clientMemoire, clientProduit, ECRITURE_PERMISE } from "../lib/github.mjs";
import { creerMonde, JETONS } from "./outils.mjs";

const reponse = () => Response.json({});

test("réseau : hôtes comparés exactement, https obligatoire", async () => {
  const appels = [];
  const r = creerReseau({ fetchFn: async (u) => { appels.push(u); return reponse(); }, sitesPermis: ["ok.example.com"] });
  await r("https://api.github.com/x");
  await r("https://api.anthropic.com/x");
  await r("https://ok.example.com/");
  for (const u of ["https://evil.example.com/", "http://ok.example.com/", "https://api.github.com.evil.com/", "https://ok.example.com.evil.com/", "https://evil.com/?https://api.github.com/", "pas une adresse"]) {
    await assert.rejects(() => r(u), /refus/i, u);
  }
  assert.equal(appels.length, 3);
});

test("réseau : redirections jamais suivies et signal d'abandon fournis", async () => {
  let vu;
  const r = creerReseau({ fetchFn: async (u, init) => { vu = init; return reponse(); } });
  await r("https://api.github.com/x", { redirect: "follow" });
  assert.equal(vu.redirect, "manual");
  assert.ok(vu.signal instanceof AbortSignal);
});

test("réseau : budget unique de 40 appels, le 41e est refusé quelle que soit sa nature", async () => {
  let n = 0;
  const r = creerReseau({ fetchFn: async () => { n++; return reponse(); } });
  for (let i = 0; i < 40; i++) await r("https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/etat/alertes.json", { method: i % 2 ? "PUT" : "GET" });
  await assert.rejects(() => r("https://api.anthropic.com/v1/claude_code/routines/x/fire", { method: "POST" }), /Budget/);
  await assert.rejects(() => r("https://api.github.com/repos/a/b"), /Budget/);
  assert.equal(n, 40);
});

test("réseau : les contrôles s'arrêtent à 26 appels, la réserve de 14 reste aux écritures et réveils", async () => {
  const r = creerReseau({ fetchFn: async () => reponse() });
  for (let i = 0; i < 26; i++) await r("https://api.github.com/repos/seedgroup-tech/p1");
  assert.equal(r.restantControles(), 0);
  await assert.rejects(() => r("https://api.github.com/repos/seedgroup-tech/p1"), /Budget/);
  await r("https://api.anthropic.com/v1/claude_code/routines/x/fire", { method: "POST" });
  await r("https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/etat/alertes.json");
});

test("réseau : délai dépassé = erreur d'abandon remontée", async () => {
  const r = creerReseau({ fetchFn: (u, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" })))), plafond: { total: 5, reserve: 0 } });
  const t0 = Date.now();
  const p = r("https://api.github.com/x");
  await assert.rejects(p, { name: "AbortError" });
  assert.ok(Date.now() - t0 >= 9000 && Date.now() - t0 < 12000);
});

test("écriture refusée hors des 3 fichiers, AVANT tout appel réseau", async () => {
  assert.ok(Object.isFrozen(ECRITURE_PERMISE));
  assert.deepEqual([...ECRITURE_PERMISE].sort(), ["etat/alertes.json", "etat/journal.json", "etat/sentinel.json"]);
  const monde = creerMonde({ projets: [] });
  const m = clientMemoire(JETONS.GITHUB_TOKEN_MEMOIRE, creerReseau({ fetchFn: monde.fetchFn }));
  for (const chemin of ["etat/decisions.json", "etat/projets.json", "etat/agents.json", "README.md", "../etat/alertes.json", "etat/alertes.json/../decisions.json", "seedgroup-tech/autre/contents/etat/alertes.json"]) {
    await assert.rejects(() => m.ecrire(chemin, {}, "sha", "x"), /non permise/, chemin);
  }
  await assert.rejects(() => m.lire("etat/../secret.txt"), /non permise/);
  assert.equal(monde.appels.length, 0);
});

test("client produit : uniquement des lectures, refuse le dépôt mémoire et les noms invalides", async () => {
  const monde = creerMonde({ projets: [] });
  monde.depots["seedgroup-tech/p1"] = { workflows: [], pulls: [], dependabot: [] };
  const c = clientProduit("jeton", "seedgroup-tech/p1", creerReseau({ fetchFn: monde.fetchFn }));
  for (const nom of Object.keys(c)) assert.ok(!/ecri|put|post|patch|delete|poster/i.test(nom), nom);
  await c.workflows(); await c.plusAncienneDemandeFusion(); await c.alertesDependabot();
  assert.ok(monde.appels.every((a) => a.methode === "GET"));
  assert.throws(() => clientProduit("j", "seedgroup-tech/ai-tech-office-memoire", () => {}), /mémoire/);
  assert.throws(() => clientProduit("j", "SeedGroup-Tech/AI-Tech-Office-Memoire", () => {}), /mémoire/);
  assert.throws(() => clientProduit("j", "a/b/../c", () => {}), /invalide/);
  assert.throws(() => clientProduit("j", "a b/c", () => {}), /invalide/);
  assert.throws(() => c.executionsWorkflow("1; DROP", "main"), /invalide/);
});

test("lire renvoie aussi la taille du fichier", async () => {
  const monde = creerMonde({ projets: [{ a: 1 }] });
  const m = clientMemoire("j", creerReseau({ fetchFn: monde.fetchFn }));
  const r = await m.lire("etat/projets.json");
  assert.equal(r.size, JSON.stringify([{ a: 1 }]).length);
});

test("F4 réseau : écritures refusées hors PUT mémoire (3 fichiers) et POST de la routine", async () => {
  let n = 0;
  const r = creerReseau({ fetchFn: async () => { n++; return reponse(); } });
  const M = "https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/etat/";
  await r(M + "journal.json", { method: "PUT" });
  await r("https://api.anthropic.com/v1/claude_code/routines/abc-1/fire", { method: "POST" });
  for (const [u, m] of [
    [M + "decisions.json", "PUT"], [M + "alertes.json", "DELETE"], [M + "alertes.json", "POST"], [M + "alertes.json?x=1", "PUT"],
    ["https://api.github.com/repos/seedgroup-tech/p1/contents/etat/alertes.json", "PUT"],
    ["https://api.github.com/repos/seedgroup-tech/p1/issues", "POST"],
    ["https://api.anthropic.com/v1/messages", "POST"], ["https://api.anthropic.com/v1/claude_code/routines/a/fire", "PUT"],
    ["https://api.github.com/repos/seedgroup-tech/p1", "HEAD"], ["https://p1.example.com/", "POST"],
  ]) await assert.rejects(() => r(u, { method: m }), /refus/i, m + " " + u);
  assert.equal(n, 2);
});

test("F3 noms de dépôt : segment commençant par un point refusé", async () => {
  const { depotValide } = await import("../lib/github.mjs");
  for (const d of ["../x", "a/..", ".a/b", "a/.b", "a/b/c", "a", "a b/c"]) assert.equal(depotValide(d), false, d);
  assert.equal(depotValide("seedscaleup/KLOQin"), true);
  assert.equal(depotValide("a/b.c-d_e"), true);
});

test("F1 siteValide : IP, localhost, point final, hôte sans point, trop long refusés", async () => {
  const { siteValide } = await import("../lib/controles.mjs");
  for (const s of ["https://127.0.0.1/", "https://10.0.0.1:8080/", "https://[::1]/", "https://[2001:db8::1]/", "https://localhost/", "https://a.localhost/",
    "https://example.com./", "https://intranet/", "https://" + "a".repeat(190) + ".example.com/", "https://u:p@example.com/", "http://example.com/", "https://api.github.com/", "https://2130706433/"])
    assert.equal(siteValide(s), false, s);
  assert.equal(siteValide("https://kloqin.com"), true);
  assert.equal(siteValide("https://www.xadikoa.com/page"), true);
});

test("F2 nettoyer : caractères invisibles et de sens d'écriture retirés", async () => {
  const { nettoyer } = await import("../lib/texte.mjs");
  assert.equal(nettoyer("a\u200Bb\u200Fc\u202Ad\u202Ee\u2066f\u2069g\uFEFFh"), "abcdefgh");
  assert.equal(nettoyer("a\u202Eb\nc", 50, true), "ab\nc");
});
