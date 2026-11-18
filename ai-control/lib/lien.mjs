// Accès par lien secret : pas de compte, pas de code de connexion.
// Toute personne qui possède le lien entre, avec les droits Direction.
//   CLE_LIEN : clé secrète (au moins 32 caractères), réglée comme secret du projet Pages.
// Lien à partager : https://<adresse>/?cle=<CLE_LIEN>
// La première visite pose un cookie ; la clé disparaît ensuite de la barre d'adresse.
// Pour couper l'accès à tout le monde : changer CLE_LIEN et redéployer.

export const NOM_COOKIE = "aic";
export const LONGUEUR_MIN = 32;
const DUREE_COOKIE = 60 * 60 * 24 * 180; // 180 jours

export function cleLien(env) {
  const cle = String(env?.CLE_LIEN || "").trim();
  return cle.length >= LONGUEUR_MIN ? cle : null;
}

async function empreinte(texte) {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return new Uint8Array(octets);
}

// Comparaison à temps constant (sur les empreintes, donc sans fuite de longueur).
export async function memeCle(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const [x, y] = await Promise.all([empreinte(a), empreinte(b)]);
  let ecart = 0;
  for (let i = 0; i < x.length; i++) ecart |= x[i] ^ y[i];
  return ecart === 0;
}

export function lireCookie(entete, nom = NOM_COOKIE) {
  for (const morceau of String(entete || "").split(";")) {
    const i = morceau.indexOf("=");
    if (i > 0 && morceau.slice(0, i).trim() === nom) return morceau.slice(i + 1).trim();
  }
  return "";
}

export function cookiePour(cle) {
  return `${NOM_COOKIE}=${cle}; Path=/; Max-Age=${DUREE_COOKIE}; HttpOnly; Secure; SameSite=Lax`;
}

// Renvoie { ok:false } | { ok:true } | { ok:true, redirection, cookie }
export async function verifierLien(request, cle) {
  const url = new URL(request.url);
  const fournie = url.searchParams.get("cle");
  if (fournie !== null) {
    if (!(await memeCle(fournie, cle))) return { ok: false };
    url.searchParams.delete("cle");
    return { ok: true, redirection: url.pathname + url.search, cookie: cookiePour(cle) };
  }
  if (await memeCle(lireCookie(request.headers.get("Cookie")), cle)) return { ok: true };
  return { ok: false };
}
