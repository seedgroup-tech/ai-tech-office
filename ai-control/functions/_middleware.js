// Garde d'entrée d'AI CONTROL : toutes les requêtes (pages, fichiers, API).
// 1) jeton Cloudflare Access valide ; 2) adresse présente dans DIRECTION ou COLLABORATEURS.
// Sinon 403. Le rôle est transmis aux Functions via context.data.

import { lireConfigAcces, verifierJeton } from "../lib/acces.mjs";
import { avecEntetes, refus } from "../lib/entetes.mjs";
import { roleDe } from "../lib/roles.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  const config = lireConfigAcces(env);
  if (!config) return refus();
  let resultat;
  try {
    resultat = await verifierJeton(request.headers.get("Cf-Access-Jwt-Assertion"), config);
  } catch {
    return refus();
  }
  if (!resultat.ok) return refus();
  const role = roleDe(resultat.email, env);
  if (!role) return refus();
  context.data.email = resultat.email;
  context.data.role = role;
  const reponse = await context.next();
  return avecEntetes(reponse, new URL(request.url).pathname);
}
