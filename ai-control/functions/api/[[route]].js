// Point d'entrée unique de l'API d'AI CONTROL. La logique et les droits sont dans lib/donnees.mjs.
import { traiter } from "../../lib/donnees.mjs";

const LIMITE_CORPS = 512 * 1024;

const json = (corps, statut) => new Response(JSON.stringify(corps), {
  status: statut,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});

export async function onRequest({ request, env, data, params }) {
  const segments = Array.isArray(params.route) ? params.route : [params.route].filter(Boolean);
  const chemin = "/" + segments.join("/");
  let corps = null;
  if (request.method === "POST" || request.method === "PUT") {
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) {
      return json({ erreur: "Content-Type application/json requis." }, 415);
    }
    const texte = await request.text();
    if (texte.length > LIMITE_CORPS) return json({ erreur: "Corps trop volumineux." }, 413);
    try {
      corps = texte ? JSON.parse(texte) : null;
    } catch {
      return json({ erreur: "JSON invalide." }, 400);
    }
  }
  if (!env.DB) return json({ erreur: "Base de données non liée au projet." }, 500);
  const r = await traiter({ method: request.method, chemin, corps, email: data.email, role: data.role, db: env.DB });
  return json(r.corps, r.statut);
}
