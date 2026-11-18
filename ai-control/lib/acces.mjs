// Vérification du jeton Cloudflare Access (en-tête Cf-Access-Jwt-Assertion).
// Copie de console/lib/acces.mjs (M-012). Seule différence : l'e-mail n'est plus
// comparé à un propriétaire unique ; il est renvoyé, et lib/roles.mjs décide
// s'il est autorisé. Signature RS256, émetteur, audience, expiration et date
// de début sont contrôlés comme avant.
// Aucune valeur secrète ici : tout vient de env.

const DUREE_CACHE_MS = 60 * 60 * 1000;
const cacheCerts = new Map(); // domaine -> { keys, expire }
const derniereRelecture = new Map(); // domaine -> horodatage de la dernière relecture forcée
const INTERVALLE_RELECTURE_MS = 60 * 1000;

export function lireConfigAcces(env) {
  const brut = String(env?.ACCESS_TEAM_DOMAIN || "").trim().toLowerCase().replace(/^https:\/\//, "").replace(/\/+$/, "");
  const auds = String(env?.ACCESS_AUD || "").split(",").map((s) => s.trim()).filter(Boolean);
  // Le domaine doit être celui d'une équipe Access : on n'appelle jamais une autre adresse.
  if (!/^[a-z0-9][a-z0-9-]{0,62}\.cloudflareaccess\.com$/.test(brut)) return null;
  if (!auds.length) return null;
  return { domaine: brut, auds };
}

function b64urlVersOctets(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("base64url invalide");
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function lireJson(partie) {
  return JSON.parse(new TextDecoder().decode(b64urlVersOctets(partie)));
}

async function certificats(domaine, fetchFn, forcer) {
  const c = cacheCerts.get(domaine);
  if (c && c.expire > Date.now()) {
    if (!forcer) return c.keys;
    if (Date.now() - (derniereRelecture.get(domaine) || 0) < INTERVALLE_RELECTURE_MS) return c.keys;
  }
  if (forcer) derniereRelecture.set(domaine, Date.now());
  const rep = await fetchFn(`https://${domaine}/cdn-cgi/access/certs`, { headers: { Accept: "application/json" } });
  if (!rep.ok) throw new Error("certificats indisponibles");
  const j = await rep.json();
  const keys = Array.isArray(j?.keys) ? j.keys : [];
  cacheCerts.set(domaine, { keys, expire: Date.now() + DUREE_CACHE_MS });
  return keys;
}

export function viderCacheCertificats() {
  cacheCerts.clear();
  derniereRelecture.clear();
}

// Renvoie { ok: true, email } ou { ok: false, raison }.
export async function verifierJeton(jeton, config, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const maintenant = options.maintenant ?? Math.floor(Date.now() / 1000);
  if (!config) return { ok: false, raison: "configuration" };
  if (typeof jeton !== "string" || jeton.length > 8192) return { ok: false, raison: "absent" };
  const parties = jeton.split(".");
  if (parties.length !== 3) return { ok: false, raison: "format" };

  let entete, charge, sig;
  try {
    entete = lireJson(parties[0]);
    charge = lireJson(parties[1]);
    sig = b64urlVersOctets(parties[2]);
  } catch {
    return { ok: false, raison: "format" };
  }
  if (entete?.alg !== "RS256" || typeof entete.kid !== "string") return { ok: false, raison: "algorithme" };

  let cle;
  try {
    let keys = await certificats(config.domaine, fetchFn, false);
    let jwk = keys.find((k) => k && k.kid === entete.kid && k.kty === "RSA");
    if (!jwk) {
      keys = await certificats(config.domaine, fetchFn, true); // rotation des clés
      jwk = keys.find((k) => k && k.kid === entete.kid && k.kty === "RSA");
    }
    if (!jwk) return { ok: false, raison: "cle inconnue" };
    cle = await crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch {
    return { ok: false, raison: "certificats" };
  }

  const donnees = new TextEncoder().encode(parties[0] + "." + parties[1]);
  const signatureOk = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cle, sig, donnees);
  if (!signatureOk) return { ok: false, raison: "signature" };

  if (charge?.iss !== `https://${config.domaine}`) return { ok: false, raison: "emetteur" };
  const auds = Array.isArray(charge?.aud) ? charge.aud : [charge?.aud];
  if (!auds.some((a) => config.auds.includes(a))) return { ok: false, raison: "audience" };
  if (typeof charge.exp !== "number" || charge.exp <= maintenant) return { ok: false, raison: "expire" };
  if (typeof charge.nbf === "number" && charge.nbf > maintenant + 60) return { ok: false, raison: "pas encore valide" };
  if (typeof charge.email !== "string") return { ok: false, raison: "email" };
  const email = charge.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, raison: "email" };

  return { ok: true, email };
}
