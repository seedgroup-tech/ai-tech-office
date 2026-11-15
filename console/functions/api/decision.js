// POST /api/decision : enregistre une décision signée du propriétaire
// dans etat/decisions.json (commit sur main), puis une entrée dans etat/journal.json.
// Corps attendu : { demande_id, choix: "approuvee" | "refusee", commentaire }

import { enregistrerDecision, reponseJson } from "../../lib/api.mjs";

export async function onRequest({ request, env, data }) {
  if (request.method !== "POST") return reponseJson({ erreur: "Méthode non permise." }, 405);
  return enregistrerDecision({ request, env, email: data.email });
}
