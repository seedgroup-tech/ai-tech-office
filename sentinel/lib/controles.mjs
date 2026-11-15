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
export const MAX_WORKFLOWS = 5;
const SEPT_JOURS_MS = 7 * 24 * 3600 * 1000;
const ECHECS_WORKFLOW = new Set(["failure", "timed_out", "startup_failure"]);
const EVENEMENTS_SURS = new Set(["push", "schedule", "workflow_dispatch"]);
const BRANCHE_VALIDE = /^[A-Za-z0-9_.\/-]{1,100}$/;

export const empreinte = (projet, type, cible) => `${projet}|${type}|${cible}`;

const inconnu = (projet, type, erreur = true, note = null) =>
  ({ projet, type, ok: false, anomalies: [], fermeture: false, erreur, note });

// Branche principale : champ facultatif `branche` du projet, sinon « main ».
export const brancheDe = (p) => (typeof p.branche === "string" && BRANCHE_VALIDE.test(p.branche) ? p.branche : "main");

// Un site est contrôlable s'il est en https, sans identifiants, et n'est pas une API du bureau.
export function siteValide(site) {
  if (typeof site !== "string" || site.length > 200 || !site.startsWith("https://")) return false;
  try {
    const u = new URL(site);
    const h = u.hostname;
    if (u.username || u.password || h === HOTE_GITHUB || h === HOTE_ANTHROPIC) return false;
    if (h.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return false;   // adresses IP
    if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".") || !h.includes(".")) return false;
    return true;
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
    if (e && e.garde) return inconnu(p.id, "site", false);   // budget ou hôte refusé : inconnu
    return echec("Erreur réseau ou délai dépassé.");
  }
  try { await rep.body?.cancel(); } catch { /* sans importance */ }
  // Protection Cloudflare : le contrôle ne prouve rien.
  if (rep.status === 403 && rep.headers.get("cf-mitigated") === "challenge") return inconnu(p.id, "site", false);
  if (rep.status >= 400) return echec(`Le site répond avec le statut ${Number(rep.status)}.`);
  return { projet: p.id, type: "site", ok: true, fermeture: true, anomalies: [] };
}

// Workflows : liste (1 appel), puis la dernière exécution terminée de la branche principale
// pour chacun des 5 premiers workflows actifs (1 appel chacun). Le reste est « inconnu ».
export async function controleWorkflows(p, client) {
  const liste = await client.workflows();
  if (!liste.ok || !Array.isArray(liste.donnees.workflows)) return inconnu(p.id, "workflow", true);
  const actifs = liste.donnees.workflows
    .filter((w) => w && w.state === "active" && Number.isInteger(w.id)).slice(0, MAX_WORKFLOWS);
  const branche = brancheDe(p);
  const anomalies = [];
  const corrects = [];
  let erreur = false;
  for (const w of actifs) {
    let r;
    try { r = await client.executionsWorkflow(w.id, branche); } catch (e) { erreur = erreur || !(e && e.garde); continue; }
    const run = r.ok && Array.isArray(r.donnees.workflow_runs) ? r.donnees.workflow_runs[0] : null;
    if (!r.ok) { erreur = true; continue; }
    if (!run) continue;   // aucune exécution : inconnu
    // Seules comptent les exécutions du dépôt lui-même (pas une PR d'un fork dont la branche s'appelle « main »).
    const origine = run.head_repository && run.head_repository.full_name;
    if (!EVENEMENTS_SURS.has(run.event) || typeof origine !== "string" || origine.toLowerCase() !== p.depot.toLowerCase()) continue;
    const cible = String(w.id);
    if (ECHECS_WORKFLOW.has(run.conclusion)) {
      anomalies.push({
        empreinte: empreinte(p.id, "workflow", cible), cible, niveau: "eleve",
        lien: lienGitHub(run.html_url) || `https://github.com/${p.depot}/actions`,
        titre: `${p.nom} : le workflow « ${nettoyer(w.name, 80)} » est en échec`,
        detail: `Dernière exécution terminée : ${nettoyer(run.conclusion, 40)}.`,
      });
    } else if (run.conclusion === "success") corrects.push(cible);
    // cancelled, skipped, autre : inconnu
  }
  return { projet: p.id, type: "workflow", ok: true, anomalies, fermeture: corrects, erreur };
}

// Demandes de fusion : une seule anomalie par projet, sur la plus ancienne (son titre n'est jamais repris).
export async function controlePr(p, client, maintenant) {
  const r = await client.plusAncienneDemandeFusion();
  if (!r.ok || !Array.isArray(r.donnees)) return inconnu(p.id, "pr");
  const pr = r.donnees[0];
  const anomalies = [];
  if (pr && Number.isInteger(pr.number) && maintenant.getTime() - Date.parse(pr.created_at) > SEPT_JOURS_MS) {
    const lien = lienGitHub(pr.html_url) || `https://github.com/${p.depot}/pulls`;
    anomalies.push({
      empreinte: empreinte(p.id, "pr", "anciennes"), cible: "anciennes", niveau: "info", lien,
      titre: `${p.nom} : demande de fusion ouverte depuis plus de 7 jours`,
      detail: `Plus ancienne : n° ${pr.number} (${lien}).`,
    });
  }
  return { projet: p.id, type: "pr", ok: true, anomalies, fermeture: true };
}

// Dependabot : une seule anomalie par projet s'il existe au moins une alerte critique ou élevée.
export async function controleDependabot(p, client) {
  const r = await client.alertesDependabot();
  if (r.statut === 403 || r.statut === 404) {
    return inconnu(p.id, "dependabot", false, { cle: `${p.id}|dependabot`, texte: `${nettoyer(p.nom, 60)} : accès non permis ou Dependabot désactivé.` });
  }
  if (!r.ok || !Array.isArray(r.donnees)) return inconnu(p.id, "dependabot");
  const a = r.donnees[0];
  const anomalies = [];
  if (a && typeof a === "object") {
    const gravite = nettoyer(a.security_advisory && a.security_advisory.severity, 20) || "inconnue";
    const paquet = nettoyer(a.dependency && a.dependency.package && a.dependency.package.name, 80) || "inconnu";
    anomalies.push({
      empreinte: empreinte(p.id, "dependabot", "critique-ou-eleve"), cible: "critique-ou-eleve", niveau: "eleve",
      lien: lienGitHub(a.html_url) || `https://github.com/${p.depot}/security/dependabot`,
      titre: `${p.nom} : alerte Dependabot critique ou élevée`,
      detail: `Gravité : ${gravite} ; paquet : ${paquet}.`,
    });
  }
  return { projet: p.id, type: "dependabot", ok: true, anomalies, fermeture: true };
}

const securise = async (p, type, f) => { try { return await f(); } catch (e) { return inconnu(p.id, type, !(e && e.garde)); } };

// Contrôle du site d'un projet (0 ou 1 résultat).
export async function controlerSiteProjet(p, reseau) {
  return siteValide(p.site) ? [await securise(p, "site", () => controleSite(p, reseau))] : [];
}

// Contrôles GitHub d'un projet, l'un après l'autre (au plus 8 appels).
export async function controlerGitHubProjet(p, client, maintenant) {
  const resultats = [];
  resultats.push(await securise(p, "workflow", () => controleWorkflows(p, client)));
  resultats.push(await securise(p, "pr", () => controlePr(p, client, maintenant)));
  resultats.push(await securise(p, "dependabot", () => controleDependabot(p, client)));
  return resultats;
}
