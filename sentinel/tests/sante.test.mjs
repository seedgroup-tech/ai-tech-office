import test from "node:test";
import assert from "node:assert/strict";
import { repondre, reinitialiserCacheSante, corpsSante } from "../lib/sante.mjs";
import { ENV, JETONS, creerMonde, sentinelInitial, horloge } from "./outils.mjs";

const sentinel = sentinelInitial({
  dernier_passage: "2026-11-15T10:15:00+01:00", pause: false,
  dernier_resultat: { projets: 3, anomalies_ouvertes: 2, erreurs: 1 },
  fichiers_trop_gros: { alertes: false, journal: false },
  notes: [{ cle: "kloqin|dependabot", texte: "KLOQin : secret" }], en_observation: { "kloqin|site|https://kloqin.com": {} },
});
const lectures = (monde) => monde.appels.filter((a) => a.url.includes("sentinel.json") && a.methode === "GET").length;
const get = (chemin = "/sante", methode = "GET") => new Request("https://sentinel.example.workers.dev" + chemin, { method: methode });

test("GET /sante : JSON attendu, sans nom de projet, adresse ni jeton, bons en-têtes", async () => {
  reinitialiserCacheSante();
  const monde = creerMonde({ projets: [], sentinel }), h = horloge();
  const rep = await repondre(get(), ENV, { fetchFn: monde.fetchFn, maintenant: h.maintenant });
  assert.equal(rep.status, 200);
  assert.equal(rep.headers.get("Content-Type"), "application/json");
  assert.equal(rep.headers.get("Cache-Control"), "no-store");
  assert.equal(rep.headers.get("X-Content-Type-Options"), "nosniff");
  const texte = await rep.text();
  assert.deepEqual(JSON.parse(texte), {
    service: "ai-tech-office-sentinel", version: "1.0.0", dernier_passage: "2026-11-15T10:15:00+01:00",
    en_veille: false, anomalies_ouvertes: 2, erreurs_dernier_passage: 1, fichiers_trop_gros: false,
  });
  assert.ok(!/kloqin|KLOQin|https?:|secret/i.test(texte));
  for (const s of Object.values(JETONS)) assert.ok(!texte.includes(s));
});

test("autres chemins et méthodes (HEAD compris) : 404 « Introuvable »", async () => {
  reinitialiserCacheSante();
  const monde = creerMonde({ projets: [], sentinel }), h = horloge();
  for (const [chemin, methode] of [["/", "GET"], ["/sante/", "GET"], ["/autre", "GET"], ["/sante", "POST"], ["/sante", "HEAD"], ["/sante", "PUT"], ["/etat/sentinel.json", "GET"]]) {
    const rep = await repondre(get(chemin, methode), ENV, { fetchFn: monde.fetchFn, maintenant: h.maintenant });
    assert.equal(rep.status, 404, chemin + " " + methode);
    if (methode !== "HEAD") assert.equal(await rep.text(), "Introuvable");
  }
  assert.equal(monde.appels.length, 0, "aucune lecture GitHub pour un 404");
});

test("cache de 5 minutes : 2 appels rapprochés et une rafale = 1 seule lecture GitHub", async () => {
  reinitialiserCacheSante();
  const monde = creerMonde({ projets: [], sentinel }), h = horloge();
  const opt = { fetchFn: monde.fetchFn, maintenant: h.maintenant };
  await repondre(get(), ENV, opt);
  h.avancer(60000);
  await repondre(get(), ENV, opt);
  assert.equal(lectures(monde), 1);
  reinitialiserCacheSante();
  await Promise.all(Array.from({ length: 10 }, () => repondre(get(), ENV, opt)));
  assert.equal(lectures(monde), 2, "une seule lecture de plus pour toute la rafale");
  h.avancer(6 * 60000);
  await repondre(get(), ENV, opt);
  assert.equal(lectures(monde), 3);
});

test("GitHub en panne : dernière réponse connue, sinon statut inconnu ; pas de nouvelle lecture avant 5 minutes", async () => {
  reinitialiserCacheSante();
  const monde = creerMonde({ projets: [], sentinel }), h = horloge();
  const opt = { fetchFn: monde.fetchFn, maintenant: h.maintenant };
  monde.memoireEnPanne = true;
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { statut: "inconnu" });
  h.avancer(60000);
  await repondre(get(), ENV, opt);
  assert.equal(lectures(monde), 1);
  h.avancer(6 * 60000);
  monde.memoireEnPanne = false;
  const bon = await (await repondre(get(), ENV, opt)).json();
  assert.equal(bon.anomalies_ouvertes, 2);
  h.avancer(6 * 60000);
  monde.memoireEnPanne = true;
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), bon);
});

test("corpsSante : champs filtrés un par un, valeurs inattendues neutralisées", () => {
  const c = corpsSante({ pause: true, dernier_passage: "<script>", dernier_resultat: { anomalies_ouvertes: "x", erreurs: -1 }, secret: "z" });
  assert.equal(c.dernier_passage, null);
  assert.equal(c.anomalies_ouvertes, null);
  assert.equal(c.erreurs_dernier_passage, null);
  assert.equal(c.en_veille, true);
  assert.ok(!("secret" in c));
});
