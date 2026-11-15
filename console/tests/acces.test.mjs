import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { lireConfigAcces, verifierJeton, viderCacheCertificats } from "../lib/acces.mjs";
import { ENV, paireRsa, fabriquerJeton, chargeValide, fauxCerts, DOMAINE, EMAIL } from "./outils.mjs";

const config = lireConfigAcces(ENV);
const paire = await paireRsa("cle-1");
const intrus = await paireRsa("cle-1"); // même identifiant, autre clé
beforeEach(() => viderCacheCertificats());

test("configuration : domaine Access obligatoire, autre adresse refusée", () => {
  assert.ok(config);
  assert.equal(config.domaine, DOMAINE);
  assert.equal(lireConfigAcces({ ...ENV, ACCESS_TEAM_DOMAIN: "evil.example.com" }), null);
  assert.equal(lireConfigAcces({ ...ENV, ACCESS_AUD: "" }), null);
  assert.equal(lireConfigAcces({ ...ENV, OWNER_EMAIL: "" }), null);
  assert.equal(lireConfigAcces({}), null);
  assert.equal(lireConfigAcces({ ...ENV, ACCESS_TEAM_DOMAIN: "https://" + DOMAINE + "/" }).domaine, DOMAINE);
});

test("jeton valide : accepté", async () => {
  const { fetchFn } = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(paire, chargeValide()), config, { fetchFn });
  assert.deepEqual(r, { ok: true, email: EMAIL });
});

test("jeton expiré : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  const maintenant = Math.floor(Date.now() / 1000);
  const r = await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), exp: maintenant - 1 }), config, { fetchFn, maintenant });
  assert.equal(r.ok, false);
  assert.equal(r.raison, "expire");
});

test("mauvaise audience : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), aud: ["autre-application"] }), config, { fetchFn });
  assert.equal(r.ok, false);
  assert.equal(r.raison, "audience");
});

test("mauvais e-mail : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), email: "intrus@example.com" }), config, { fetchFn });
  assert.equal(r.ok, false);
  assert.equal(r.raison, "email");
});

test("e-mail : la casse ne compte pas", async () => {
  const { fetchFn } = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), email: EMAIL.toUpperCase() }), config, { fetchFn });
  assert.equal(r.ok, true);
});

test("signature faite avec une autre clé : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(intrus, chargeValide()), config, { fetchFn });
  assert.equal(r.ok, false);
  assert.equal(r.raison, "signature");
});

test("jeton modifié après signature : refusé", async () => {
  const { fetchFn } = fauxCerts(paire);
  const [h, , s] = (await fabriquerJeton(paire, chargeValide())).split(".");
  const p = Buffer.from(JSON.stringify({ ...chargeValide(), email: "intrus@example.com" })).toString("base64url");
  const r = await verifierJeton(`${h}.${p}.${s}`, config, { fetchFn });
  assert.equal(r.ok, false);
});

test("émetteur, algorithme, format, absence : refusés", async () => {
  const { fetchFn } = fauxCerts(paire);
  assert.equal((await verifierJeton(await fabriquerJeton(paire, { ...chargeValide(), iss: "https://autre.cloudflareaccess.com" }), config, { fetchFn })).raison, "emetteur");
  assert.equal((await verifierJeton(await fabriquerJeton(paire, chargeValide(), { alg: "none" }), config, { fetchFn })).raison, "algorithme");
  assert.equal((await verifierJeton(await fabriquerJeton(paire, chargeValide(), { alg: "HS256" }), config, { fetchFn })).raison, "algorithme");
  assert.equal((await verifierJeton("pas.un-jeton", config, { fetchFn })).ok, false);
  assert.equal((await verifierJeton(null, config, { fetchFn })).ok, false);
  assert.equal((await verifierJeton("", config, { fetchFn })).ok, false);
});

test("clé inconnue : les certificats sont relus une fois (rotation), puis refus", async () => {
  const autre = await paireRsa("cle-2");
  const certs = fauxCerts(paire);
  const r = await verifierJeton(await fabriquerJeton(autre, chargeValide()), config, { fetchFn: certs.fetchFn });
  assert.equal(r.ok, false);
  assert.equal(certs.appels(), 2);
});
