// GET /api/etat : lit le dossier etat/ de la mémoire et renvoie un seul objet JSON.
// Le statut de chaque demande est calculé à partir des décisions signées.

import { lireEtat, reponseJson } from "../../lib/api.mjs";

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return reponseJson({ erreur: "Méthode non permise." }, 405);
  return lireEtat(env);
}
