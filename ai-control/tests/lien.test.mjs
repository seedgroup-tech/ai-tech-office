import { test } from "node:test";
import assert from "node:assert/strict";
import { cleLien, memeCle, lireCookie, verifierLien, NOM_COOKIE } from "../lib/lien.mjs";
import { onRequest, IDENTITE_LIEN } from "../functions/_middleware.js";

const CLE = "k".repeat(40);
const requete = (url, cookie) => new Request(url, cookie ? { headers: { Cookie: cookie } } : {});
const contexte = (request, env) => ({ request, env, data: {}, next: async () => new Response("page") });

test("clé : absente ou trop courte = mode lien désactivé", () => {
  assert.equal(cleLien({}), null);
  assert.equal(cleLien({ CLE_LIEN: "courte" }), null);
  assert.equal(cleLien({ CLE_LIEN: ` ${CLE} ` }), CLE);
});

test("comparaison : exacte seulement, jamais sur du vide", async () => {
  assert.equal(await memeCle(CLE, CLE), true);
  assert.equal(await memeCle(CLE + "x", CLE), false);
  assert.equal(await memeCle("", ""), false);
  assert.equal(await memeCle(null, CLE), false);
});

test("cookie : lu parmi d'autres", () => {
  assert.equal(lireCookie(`a=1; ${NOM_COOKIE}=${CLE}; b=2`), CLE);
  assert.equal(lireCookie("a=1"), "");
});

test("lien : bonne clé = redirection propre + cookie protégé", async () => {
  const r = await verifierLien(requete(`https://x.example/?cle=${CLE}&vue=alertes`), CLE);
  assert.equal(r.ok, true);
  assert.equal(r.redirection, "/?vue=alertes");
  assert.match(r.cookie, /HttpOnly; Secure; SameSite=Lax$/);
});

test("lien : mauvaise clé refusée, même avec un bon cookie", async () => {
  const r = await verifierLien(requete("https://x.example/?cle=fausse", `${NOM_COOKIE}=${CLE}`), CLE);
  assert.equal(r.ok, false);
});

test("garde : sans clé ni cookie = 403 ; cookie valide = Direction", async () => {
  const env = { CLE_LIEN: CLE };
  assert.equal((await onRequest(contexte(requete("https://x.example/api/donnees"), env))).status, 403);
  assert.equal((await onRequest(contexte(requete("https://x.example/", `${NOM_COOKIE}=faux`), env))).status, 403);

  const c = contexte(requete("https://x.example/api/moi", `${NOM_COOKIE}=${CLE}`), env);
  const reponse = await onRequest(c);
  assert.equal(reponse.status, 200);
  assert.deepEqual(c.data, { email: IDENTITE_LIEN, role: "direction" });
  assert.ok(reponse.headers.get("Content-Security-Policy"));
});

test("garde : première visite par le lien = 302 sans la clé dans l'adresse", async () => {
  const reponse = await onRequest(contexte(requete(`https://x.example/?cle=${CLE}`), { CLE_LIEN: CLE }));
  assert.equal(reponse.status, 302);
  assert.equal(reponse.headers.get("Location"), "/");
  assert.match(reponse.headers.get("Set-Cookie"), new RegExp(`^${NOM_COOKIE}=`));
});

test("garde : sans CLE_LIEN ni Access configuré = fermé", async () => {
  assert.equal((await onRequest(contexte(requete("https://x.example/"), {}))).status, 403);
});
