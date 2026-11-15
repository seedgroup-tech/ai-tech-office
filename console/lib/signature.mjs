// Signature des décisions du propriétaire (HMAC-SHA256, Web Crypto).
// Texte signé : demande_id|choix|decide_le|par
// Aucune valeur secrète ici : la clé vient de env.DECISION_KEY.

const enc = new TextEncoder();
const LONGUEUR_MIN_CLE = 32;

export function texteASigner(d) {
  return [d.demande_id, d.choix, d.decide_le, d.par].map((v) => String(v ?? "")).join("|");
}

export function cleValide(secret) {
  return typeof secret === "string" && secret.length >= LONGUEUR_MIN_CLE;
}

async function importerCle(secret) {
  if (!cleValide(secret)) throw new Error("Clé de signature absente ou trop courte.");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function versHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function depuisHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function signer(d, secret) {
  const cle = await importerCle(secret);
  return versHex(await crypto.subtle.sign("HMAC", cle, enc.encode(texteASigner(d))));
}

// Vérification à temps constant (crypto.subtle.verify).
export async function verifierSignature(d, secret) {
  if (!d || typeof d.signature !== "string" || !/^[0-9a-f]{64}$/.test(d.signature)) return false;
  const cle = await importerCle(secret);
  return crypto.subtle.verify("HMAC", cle, depuisHex(d.signature), enc.encode(texteASigner(d)));
}
