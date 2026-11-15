import test from "node:test";
import assert from "node:assert/strict";
import { repondre, reinitialiserCacheSante, etatOk } from "../lib/sante.mjs";
import { ENV, JETONS, creerMonde, sentinelInitial, horloge } from "./outils.mjs";

const sentinel = sentinelInitial({
  dernier_passage: "2026-11-15T10:15:00+01:00", pause: true,
  dernier_resultat: { projets: 3, anomalies_ouvertes: 2, erreurs: 1 },
  notes: [{ cle: "kloqin|dependabot", texte: "KLOQin : secret" }], en_observation: { "kloqin|site|https://kloqin.com": {} },
});
const lectures = (monde) => monde.appels.filter((a) => a.url.includes("sentinel.json") && a.methode === "GET").length;
const get = (chemin = "/sante", methode = "GET") => new Request("https://sentinel.example.workers.dev" + chemin, { method: methode });
const demarrer = (s = sentinel) => { reinitialiserCacheSante(); const monde = creerMonde({ projets: [], sentinel: s }); const h = horloge("2026-11-15T10:30:00+01:00"); return { monde, h, opt: { fetchFn: monde.fetchFn, maintenant: h.maintenant } }; };

test("GET /sante : seulement { ok: true }, sans aucune autre information, bons en-têtes", async () => {
  const { opt } = demarrer();
  const rep = await repondre(get(), ENV, opt);
  assert.equal(rep.status, 200);
  assert.equal(rep.headers.get("Content-Type"), "application/json");
  assert.equal(rep.headers.get("Cache-Control"), "no-store");
  assert.equal(rep.headers.get("X-Content-Type-Options"), "nosniff");
  const texte = await rep.text();
  assert.equal(texte, '{"ok":true}');
  assert.deepEqual(Object.keys(JSON.parse(texte)), ["ok"]);
  for (const s of Object.values(JETONS)) assert.ok(!texte.includes(s));
});

test("ok:false si le dernier passage a plus de 2 heures, est absent ou invalide", async () => {
  for (const dp of ["2026-11-15T08:00:00+01:00", null, "n'importe quoi", "2026-11-15T12:00:00+01:00"]) {
    const { opt } = demarrer(sentinelInitial({ dernier_passage: dp }));
    assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: false }, String(dp));
  }
  const { opt } = demarrer(sentinelInitial({ dernier_passage: "2026-11-15T09:00:01+01:00" }));
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: true });
});

test("le calcul de ok suit l'heure même quand la lecture est en cache", async () => {
  const { opt, h } = demarrer();
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: true });
  h.avancer(100 * 60000);   // 1 h 45 plus tard : toujours dans le cache de 5 min ? non : relu
  assert.equal(etatOk("2026-11-15T10:15:00+01:00", new Date(Date.parse("2026-11-15T12:16:00+01:00"))), false);
  assert.equal(etatOk("2026-11-15T10:15:00+01:00", new Date(Date.parse("2026-11-15T12:14:00+01:00"))), true);
});

test("autres chemins et méthodes (HEAD compris) : 404 « Introuvable »", async () => {
  const { monde, opt } = demarrer();
  for (const [chemin, methode] of [["/", "GET"], ["/sante/", "GET"], ["/autre", "GET"], ["/sante", "POST"], ["/sante", "HEAD"], ["/sante", "PUT"], ["/etat/sentinel.json", "GET"]]) {
    const rep = await repondre(get(chemin, methode), ENV, opt);
    assert.equal(rep.status, 404, chemin + " " + methode);
    if (methode !== "HEAD") assert.equal(await rep.text(), "Introuvable");
  }
  assert.equal(monde.appels.length, 0, "aucune lecture GitHub pour un 404");
});

test("cache de 5 minutes : 2 appels rapprochés et une rafale = 1 seule lecture GitHub", async () => {
  const { monde, opt, h } = demarrer();
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

test("GitHub en panne : dernière valeur connue, sinon ok:false ; pas de nouvelle lecture avant 5 minutes", async () => {
  const { monde, opt, h } = demarrer();
  monde.memoireEnPanne = true;
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: false });
  h.avancer(60000);
  await repondre(get(), ENV, opt);
  assert.equal(lectures(monde), 1);
  h.avancer(6 * 60000);
  monde.memoireEnPanne = false;
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: true });
  h.avancer(6 * 60000);
  monde.memoireEnPanne = true;
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: true }, "dernière valeur connue");
  h.avancer(2 * 3600 * 1000);
  assert.deepEqual(await (await repondre(get(), ENV, opt)).json(), { ok: false }, "la valeur connue vieillit");
});

test("sans clé mémoire : ok:false et aucun appel", async () => {
  const { monde, opt } = demarrer();
  assert.deepEqual(await (await repondre(get(), { GITHUB_TOKEN_ORG: JETONS.GITHUB_TOKEN_ORG }, opt)).json(), { ok: false });
  assert.equal(monde.appels.length, 0);
});
