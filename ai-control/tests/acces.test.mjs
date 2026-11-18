import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { lireConfigAcces, verifierJeton, viderCacheCertificats } from "../lib/acces.mjs";
import { paireRsa, fabriquerJeton, chargeValide, fauxCerts, DOMAINE, AUD, EMAIL } from "./outils.mjs";

const ENV = { ACCESS_TEAM_DOMAIN: DOMAINE, ACCESS_AUD: AUD };
const config = lireConfigAcces(ENV);
const paire = await paireRsa("cle-1");
beforeEach(() => viderCacheCertificats());

test("configuration : domaine Access et audience obligatoires", () => {
  assert.ok(config);
  assert.equal(lireConfigAcces({ ...ENV, ACCESS_TEAM_DOMAIN: "evil.example.com" }), null);
  assert.equal(lireConfigAcces({ ...ENV, ACCESS_AUD: "" }), null);
  assert.equal(lireConfigAcces({}), null);
});

test("jeton valide : renvoie l'adresse vérifiée (le rôle est décidé ailleurs)", async () => {
  const { fetchFn } = fauxCerts(paire);
  assert.deepEqual(await verifierJeton(await fabriquerJeton(paire, chargeValide("ana@example.com")), config, { fetchFn }), { ok: true, email: "ana@example.com" });
});

test("jeton expiré, mauvaise audience, mauvaise clé : refusés", async () => {
  const { fetchFn } = fauxCerts(paire);
  const maintenant = Math.floor(Date.now() / 1000);
  assert.equal((await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), exp: maintenant - 1 }), config, { fetchFn, maintenant })).raison, "expire");
  assert.equal((await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), aud: ["autre"] }), config, { fetchFn })).raison, "audience");
  const intrus = await paireRsa("cle-1");
  assert.equal((await verifierJeton(await fabriquerJeton(intrus, chargeValide()), config, { fetchFn })).ok, false);
});

test("jeton sans adresse exploitable : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  assert.equal((await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), email: "pas-une-adresse" }), config, { fetchFn })).raison, "email");
  assert.equal((await verifierJeton("n'importe quoi", config, { fetchFn })).ok, false);
});
