// Contrôles d'un projet : site, workflows, demandes de fusion, Dependabot.
// Chaque contrôle renvoie :
//   { projet, type, ok, anomalies, fermeture, erreur?, note? }
// - ok : le contrôle a été exécuté (sinon « inconnu » : ni échec, ni succès) ;
// - fermeture : true (l'absence d'anomalie prouve la correction), false (aucune preuve),
//   ou la liste des cibles dont la correction est prouvée ;
// - erreur : true si le contrôle a échoué pour une raison technique (compté dans `erreurs`).
import { nettoyer, lienGitHub } from "./texte.mjs";
import { HOTE_GITHUB, HOTE_ANTHROPIC } from "./reseau.mjs";

export const SEUILS = Object.freeze({ site: 2, workflow: 1, pr: 1, dependabot: 1 });
export const PAGE_RUNS = 30;
export const PAGE_LISTES = 100;
const SEPT_JOURS_MS = 7 * 24 * 3600 * 1000;
const ECHECS_WORKFLOW = new Set(["failure", "timed_out", "startup_failure"]);
const IGNORES_WORKFLOW = new Set(["cancelled", "skipped"]);

export const empreinte = (projet, type, cible) => `${projet}|${type}|${cible}`;

const inconnu = (projet, type, erreur = true, note = null) =>
  ({ projet, type, ok: false, anomalies: [], fermeture: false, erreur, note });

// Un site est contrôlable s'il est en https, sans identifiants, et n'est pas une API du bureau.
export function siteValide(site) {
  if (typeof site !== "string" || !site.startsWith("https://")) return false;
  try {
    const u = new URL(site);
    return !u.username && !u.password && u.hostname !== HOTE_GITHUB && u.hostname !== HOTE_ANTHROPIC;
  } catch { return false; }
}

export async function controleSite(p, reseau) {
  const echec = (detail) => ({
    projet: p.id, type: "site", ok: true, fermeture: true,
    anomalies: [{
      empreinte: empreinte(p.id, "site", p.site), cible: p.site, niveau: "critique", lien: p.site,
      titre: `${p.nom} : le site ne répond pas`, detail,
    }],
  });
  let rep;
  try {
    rep = await reseau(p.site, { method: "GET", redirect: "manual", headers: { "User-Agent": "ai-tech-office-sentinel" } });
  } catch (e) {
    if (e && e.garde) return inconnu(p.id, "site");
    return echec("Erreur réseau ou délai dépassé.");
  }
  try { await rep.body?.cancel(); } catch { /* sans importance */ }
  // Protection Cloudflare : le contrôle ne prouve rien.
  if (rep.status === 403 && rep.headers.get("cf-mitigated") === "challenge") return inconnu(p.id, "site", false);
  if (rep.status >= 400) return echec(`Le site répond avec le statut ${Number(rep.status)}.`);
  return { projet: p.id, type: "site", ok: true, fermeture: true, anomalies: [] };
}

export async function controleWorkflows(p, client) {
  const r = await client.depot();
  const branche = r.ok ? r.donnees.default_branch : null;
  if (typeof branche !== "string" || !branche) return inconnu(p.id, "workflow");
  const e = await client.executions(branche);
  if (!e.ok || !Array.isArray(e.donnees.workflow_runs)) return inconnu(p.id, "workflow");
  const vus = new Map(); // workflow_id -> décision (première exécution utile, la plus récente)
  for (const run of e.donnees.workflow_runs) {
    if (!run || run.workflow_id === undefined || vus.has(run.workflow_id)) continue;
    if (IGNORES_WORKFLOW.has(run.conclusion) || !run.conclusion) continue;
    vus.set(run.workflow_id, run);
  }
  const anomalies = [];
  const corrects = [];
  for (const [id, run] of vus) {
    const cible = String(id);
    if (ECHECS_WORKFLOW.has(run.conclusion)) {
      anomalies.push({
        empreinte: empreinte(p.id, "workflow", cible), cible, niveau: "eleve",
        lien: lienGitHub(run.html_url) || `https://github.com/${p.depot}/actions`,
        titre: `${p.nom} : le workflow « ${nettoyer(run.name, 80)} » est en échec`,
        detail: `Dernière exécution terminée : ${nettoyer(run.conclusion, 40)}.`,
      });
    } else corrects.push(cible);
  }
  // Un workflow absent de la page lue n'est pas « corrigé » : il reste inconnu.
  return { projet: p.id, type: "workflow", ok: true, anomalies, fermeture: corrects };
}

export async function controlePr(p, client, maintenant) {
  const r = await client.demandesFusion();
  if (!r.ok || !Array.isArray(r.donnees)) return inconnu(p.id, "pr");
  const anomalies = [];
  for (const pr of r.donnees) {
    const cree = Date.parse(pr && pr.created_at);
    if (!Number.isInteger(pr && pr.number) || !(maintenant.getTime() - cree > SEPT_JOURS_MS)) continue;
    // Le titre (texte libre de tiers) n'est pas repris.
    anomalies.push({
      empreinte: empreinte(p.id, "pr", pr.number), cible: String(pr.number), niveau: "info",
      lien: lienGitHub(pr.html_url) || `https://github.com/${p.depot}/pulls`,
      titre: `${p.nom} : demande de fusion n° ${pr.number} ouverte depuis plus de 7 jours`,
      detail: "Demande de fusion en attente depuis plus de 7 jours.",
    });
  }
  return { projet: p.id, type: "pr", ok: true, anomalies, fermeture: r.donnees.length < PAGE_LISTES };
}

export async function controleDependabot(p, client) {
  const r = await client.alertesDependabot();
  if (r.statut === 403 || r.statut === 404) {
    return inconnu(p.id, "dependabot", false, { cle: `${p.id}|dependabot`, texte: `${nettoyer(p.nom, 60)} : accès non permis ou Dependabot désactivé.` });
  }
  if (!r.ok || !Array.isArray(r.donnees)) return inconnu(p.id, "dependabot");
  const anomalies = [];
  for (const a of r.donnees) {
    if (!Number.isInteger(a && a.number)) continue;
    const resume = nettoyer(a.security_advisory && a.security_advisory.summary, 120);
    anomalies.push({
      empreinte: empreinte(p.id, "dependabot", a.number), cible: String(a.number), niveau: "eleve",
      lien: lienGitHub(a.html_url) || `https://github.com/${p.depot}/security/dependabot`,
      titre: `${p.nom} : alerte Dependabot n° ${a.number} (${nettoyer(a.security_advisory && a.security_advisory.severity, 20)})`,
      detail: resume || "Vulnérabilité signalée par Dependabot.",
    });
  }
  return { projet: p.id, type: "dependabot", ok: true, anomalies, fermeture: r.donnees.length < PAGE_LISTES };
}

// Tous les contrôles d'un projet, l'un après l'autre. Une erreur technique rend le contrôle « inconnu ».
export async function controlerProjet(p, { reseau, client, maintenant }) {
  const securise = async (type, f) => { try { return await f(); } catch { return inconnu(p.id, type); } };
  const resultats = [];
  if (siteValide(p.site)) resultats.push(await securise("site", () => controleSite(p, reseau)));
  if (client) {
    resultats.push(await securise("workflow", () => controleWorkflows(p, client)));
    resultats.push(await securise("pr", () => controlePr(p, client, maintenant)));
    resultats.push(await securise("dependabot", () => controleDependabot(p, client)));
  }
  return resultats;
}
