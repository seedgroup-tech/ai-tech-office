// Garde d'entrée de la console : s'applique à TOUTES les requêtes
// (pages, fichiers, API), en production comme sur les aperçus.
// Sans jeton Cloudflare Access valide pour l'e-mail du propriétaire : 403.

import { lireConfigAcces, verifierJeton } from "../lib/acces.mjs";
import { avecEntetes, refus } from "../lib/entetes.mjs";

export async function onRequest(context) {
  const { request, env } = context;
  const config = lireConfigAcces(env);
  if (!config) return refus(); // configuration absente : on ferme tout
  let resultat;
  try {
    resultat = await verifierJeton(request.headers.get("Cf-Access-Jwt-Assertion"), config);
  } catch {
    return refus();
  }
  if (!resultat.ok) return refus();
  context.data.email = resultat.email;
  const reponse = await context.next();
  return avecEntetes(reponse, new URL(request.url).pathname);
}
