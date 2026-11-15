// Outils communs aux tests : faux GitHub en mémoire, faux jetons Access.
// Toutes les clés sont générées localement à chaque exécution ; aucune vraie valeur.

export const CLE_TEST = "cle-de-test-uniquement-0123456789abcdef-0123456789abcdef";
export const JETON_GITHUB_TEST = "jeton-github-factice";
export const DOMAINE = "equipe-test.cloudflareaccess.com";
export const AUD = "aud-de-test";
export const EMAIL = "proprietaire@example.com";

export const ENV = {
  GITHUB_TOKEN: JETON_GITHUB_TEST,
  DECISION_KEY: CLE_TEST,
  ACCESS_TEAM_DOMAIN: DOMAINE,
  ACCESS_AUD: AUD,
  OWNER_EMAIL: EMAIL,
};

const b64 = (octets) => Buffer.from(octets).toString("base64");
const b64url = (texte) => Buffer.from(texte).toString("base64url");

// Faux dépôt : { "etat/x.json": valeur }. Chaque écriture change le sha.
export function fauxGitHub(fichiers, options = {}) {
  const depot = new Map(Object.entries(fichiers).map(([k, v]) => [k, { valeur: v, sha: "sha-0" }]));
  let compteur = 0;
  const appels = [];
  let conflitsRestants = options.conflits || 0;
  const fetchFn = async (url, init = {}) => {
    const methode = init.method || "GET";
    appels.push({ url, methode, init });
    const m = /\/repos\/seedgroup-tech\/ai-tech-office-memoire\/contents\/([^?]+)/.exec(url);
    if (!m) return new Response("{}", { status: 404 });
    const chemin = m[1];
    if (methode === "GET") {
      const f = depot.get(chemin);
      if (!f) return new Response("{}", { status: 404 });
      return Response.json({ encoding: "base64", content: b64(new TextEncoder().encode(JSON.stringify(f.valeur))), sha: f.sha });
    }
    if (methode === "PUT") {
      const corps = JSON.parse(init.body);
      if (conflitsRestants > 0) {
        conflitsRestants--;
        // Simule une modification concurrente : quelqu'un d'autre a écrit avant nous.
        const f = depot.get(chemin);
        if (options.surConflit) options.surConflit(chemin, f);
        f.sha = "sha-concurrent-" + ++compteur;
        return new Response("{}", { status: 409 });
      }
      const f = depot.get(chemin);
      if (f && corps.sha !== f.sha) return new Response("{}", { status: 409 });
      const valeur = JSON.parse(Buffer.from(corps.content, "base64").toString("utf8"));
      depot.set(chemin, { valeur, sha: "sha-" + ++compteur, message: corps.message, branche: corps.branch });
      return Response.json({ content: { sha: "sha-" + compteur } });
    }
    return new Response("{}", { status: 405 });
  };
  return { fetchFn, depot, appels };
}

export async function paireRsa(kid = "cle-1") {
  const paire = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", paire.publicKey);
  return { prive: paire.privateKey, jwk: { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", kid, use: "sig" }, kid };
}

export async function fabriquerJeton(paire, charge, entete = {}) {
  const h = b64url(JSON.stringify({ alg: "RS256", kid: paire.kid, typ: "JWT", ...entete }));
  const p = b64url(JSON.stringify(charge));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", paire.prive, new TextEncoder().encode(h + "." + p));
  return `${h}.${p}.${Buffer.from(sig).toString("base64url")}`;
}

export function chargeValide(maintenant = Math.floor(Date.now() / 1000)) {
  return { iss: `https://${DOMAINE}`, aud: [AUD], email: EMAIL, exp: maintenant + 3600, iat: maintenant - 10, nbf: maintenant - 10, type: "app" };
}

export function fauxCerts(...paires) {
  let appels = 0;
  const fetchFn = async (url) => {
    appels++;
    if (url !== `https://${DOMAINE}/cdn-cgi/access/certs`) return new Response("{}", { status: 404 });
    return Response.json({ keys: paires.map((p) => p.jwk) });
  };
  return { fetchFn, appels: () => appels };
}
