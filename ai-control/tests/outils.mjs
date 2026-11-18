// Outils de test d'AI CONTROL : faux jetons Access et base SQLite en mémoire (même schéma que D1).
// Toutes les clés sont générées à chaque exécution ; aucune vraie valeur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

export const DOMAINE = "equipe-test.cloudflareaccess.com";
export const AUD = "aud-de-test";
export const EMAIL = "direction@example.com";

const b64url = (texte) => Buffer.from(texte).toString("base64url");

export async function paireRsa(kid = "cle-1") {
  const paire = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", paire.publicKey);
  return { prive: paire.privateKey, jwk: { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", kid, use: "sig" }, kid };
}

export async function fabriquerJeton(paire, charge) {
  const h = b64url(JSON.stringify({ alg: "RS256", kid: paire.kid, typ: "JWT" }));
  const p = b64url(JSON.stringify(charge));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", paire.prive, new TextEncoder().encode(h + "." + p));
  return `${h}.${p}.${Buffer.from(sig).toString("base64url")}`;
}

export function chargeValide(email = EMAIL, maintenant = Math.floor(Date.now() / 1000)) {
  return { iss: `https://${DOMAINE}`, aud: [AUD], email, exp: maintenant + 3600, iat: maintenant - 10, nbf: maintenant - 10, type: "app" };
}

export function fauxCerts(...paires) {
  const fetchFn = async (url) => {
    if (url !== `https://${DOMAINE}/cdn-cgi/access/certs`) return new Response("{}", { status: 404 });
    return Response.json({ keys: paires.map((p) => p.jwk) });
  };
  return { fetchFn };
}

// Base SQLite en mémoire, avec l'interface utilisée par D1 (prepare / bind / all / first / run / batch).
export function fausseBase() {
  const sql = readFileSync(fileURLToPath(new URL("../migrations/0001_init.sql", import.meta.url)), "utf8");
  const db = new DatabaseSync(":memory:");
  db.exec(sql);
  const liaison = (texte, args) => ({
    bind: (...a) => liaison(texte, a),
    async all() { return { results: db.prepare(texte).all(...args) }; },
    async first() { return db.prepare(texte).get(...args) ?? null; },
    async run() { const r = db.prepare(texte).run(...args); return { success: true, meta: { changes: r.changes } }; },
  });
  return {
    prepare: (texte) => liaison(texte, []),
    async batch(liste) { const out = []; for (const s of liste) out.push(await s.run()); return out; },
    compter: (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
  };
}
