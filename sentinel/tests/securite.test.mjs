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
  for (let i = 0; i < 40; i++) await r("https://api.github.com/repos/seedgroup-tech/ai-tech-office-memoire/contents/etat/x.json", { method: i % 2 ? "PUT" : "GET" });
  await assert.rejects(() => r("https://api.anthropic.com/x", { method: "POST" }), /Budget/);
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
