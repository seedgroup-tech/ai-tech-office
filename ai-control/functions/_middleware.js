// Garde d'entrée d'AI CONTROL : toutes les requêtes (pages, fichiers, API).
// Deux modes, choisis par l'environnement :
//  - lien secret (CLE_LIEN réglée) : qui possède le lien entre, avec les droits Direction ;
//  - Cloudflare Access (sinon) : jeton valide + adresse dans DIRECTION ou COLLABORATEURS.
// Sinon 403. Le rôle est transmis aux Functions via context.data.

import { lireConfigAcces, verifierJeton } from "../lib/acces.mjs";
import { avecEntetes, refus } from "../lib/entetes.mjs";
import { cleLien, verifierLien } from "../lib/lien.mjs";
import { ROLES, roleDe } from "../lib/roles.mjs";

export const IDENTITE_LIEN = "equipe";

export async function onRequest(context) {
  const { request, env } = context;
  const chemin = new URL(request.url).pathname;

  const cle = cleLien(env);
  if (cle) {
    const lien = await verifierLien(request, cle);
    if (!lien.ok) return refus();
    if (lien.redirection) {
      return avecEntetes(new Response(null, {
        status: 302,
        headers: { Location: lien.redirection, "Set-Cookie": lien.cookie, "Cache-Control": "no-store" },
      }), chemin);
    }
    context.data.email = IDENTITE_LIEN;
    context.data.role = ROLES.direction;
    return avecEntetes(await context.next(), chemin);
  }

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
  return avecEntetes(await context.next(), chemin);
}
