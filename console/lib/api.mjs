// Logique des deux points d'entrée de la console :
//   GET  /api/etat      -> lireEtat
//   POST /api/decision  -> enregistrerDecision
// Les fichiers functions/ ne font qu'appeler ces fonctions.

import { clientGitHub, ErreurConflit } from "./github.mjs";
import { signer, cleValide } from "./signature.mjs";
import { evaluerDecisions, calculerStatuts, statutDemande, ORIGINE_CONSOLE } from "./statuts.mjs";

const FICHIERS = ["agents", "missions", "demandes", "alertes", "journal", "decisions", "meta"];
const LIMITE_JOURNAL = 200;
const LIMITE_COMMENTAIRE = 1000;
const LIMITE_CORPS = 4096;

export function reponseJson(objet, statut = 200) {
  return new Response(JSON.stringify(objet), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const tableau = (v) => (Array.isArray(v) ? v : []);
const numeroJournal = (j) => {
  const m = /^J-(\d+)$/.exec(String(j?.id || ""));
  return m ? Number(m[1]) : 0;
};

function configServeur(env) {
  if (typeof env?.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN) return null;
  if (!cleValide(env?.DECISION_KEY)) return null;
  return { jeton: env.GITHUB_TOKEN, cle: env.DECISION_KEY };
}

export async function lireEtat(env, options = {}) {
  const cfg = configServeur(env);
  if (!cfg) return reponseJson({ erreur: "Configuration incomplète de la console." }, 500);
  try {
    const gh = clientGitHub(cfg.jeton, options.fetchFn);
    const lus = await Promise.all(FICHIERS.map((f) => gh.lire(`etat/${f}.json`)));
    const brut = Object.fromEntries(FICHIERS.map((f, i) => [f, lus[i].valeur]));
    const decisions = await evaluerDecisions(brut.decisions, cfg.cle);
    const journal = tableau(brut.journal).slice().sort((a, b) => numeroJournal(b) - numeroJournal(a)).slice(0, LIMITE_JOURNAL);
    return reponseJson({
      lu_le: new Date().toISOString(),
      agents: tableau(brut.agents),
      missions: tableau(brut.missions),
      demandes: calculerStatuts(tableau(brut.demandes), decisions),
      alertes: tableau(brut.alertes),
      journal,
      decisions,
      meta: brut.meta && typeof brut.meta === "object" ? brut.meta : null,
    });
  } catch {
    return reponseJson({ erreur: "Lecture de la mémoire impossible." }, 502);
  }
}

function nettoyer(texte, max) {
  // Retire les caractères de contrôle (sauf retour à la ligne) et limite la longueur.
  return String(texte).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function validerCorps(corps) {
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) return { erreur: "Requête invalide." };
  const { demande_id, choix, commentaire } = corps;
  if (typeof demande_id !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(demande_id)) return { erreur: "Demande inconnue." };
  if (choix !== "approuvee" && choix !== "refusee") return { erreur: "Choix invalide." };
  if (commentaire != null && typeof commentaire !== "string") return { erreur: "Commentaire invalide." };
  const c = commentaire ? nettoyer(commentaire, LIMITE_COMMENTAIRE) : "";
  return { demande_id, choix, commentaire: c || null };
}

function idDecision(dateIso) {
  const compact = dateIso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `D-${compact}-${crypto.randomUUID().slice(0, 8)}`;
}

// Lit le fichier, applique la modification, écrit avec le sha ; en cas de conflit, relit et réessaie une fois.
async function modifierAvecReessai(gh, chemin, modifier, message) {
  for (let essai = 0; essai < 2; essai++) {
    const { valeur, sha } = await gh.lire(chemin);
    const nouvelle = await modifier(tableau(valeur));
    try {
      await gh.ecrire(chemin, nouvelle, sha, message);
      return;
    } catch (e) {
      if (!(e instanceof ErreurConflit) || essai === 1) throw e;
    }
  }
}

class ErreurMetier extends Error {
  constructor(message, statut) { super(message); this.statut = statut; }
}

export async function enregistrerDecision({ request, env, email, fetchFn, maintenant }) {
  const cfg = configServeur(env);
  if (!cfg) return reponseJson({ erreur: "Configuration incomplète de la console." }, 500);
  if (!email) return reponseJson({ erreur: "Accès refusé." }, 403);

  // Protection contre les requêtes venues d'un autre site.
  const origine = request.headers.get("Origin");
  if (origine && origine !== new URL(request.url).origin) return reponseJson({ erreur: "Origine refusée." }, 403);
  const site = request.headers.get("Sec-Fetch-Site");
  if (site && site !== "same-origin") return reponseJson({ erreur: "Origine refusée." }, 403);
  if (!String(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return reponseJson({ erreur: "Format attendu : JSON." }, 415);
  }

  const texte = await request.text();
  if (texte.length > LIMITE_CORPS) return reponseJson({ erreur: "Requête trop longue." }, 413);
  let corps;
  try { corps = JSON.parse(texte); } catch { return reponseJson({ erreur: "Requête invalide." }, 400); }
  const v = validerCorps(corps);
  if (v.erreur) return reponseJson({ erreur: v.erreur }, 400);

  const gh = clientGitHub(cfg.jeton, fetchFn);
  const decideLe = (maintenant ? new Date(maintenant) : new Date()).toISOString();
  let entree = null;

  try {
    const { valeur: demandes } = await gh.lire("etat/demandes.json");
    const demande = tableau(demandes).find((d) => d && d.id === v.demande_id);
    if (!demande) throw new ErreurMetier("Demande inconnue.", 404);
    const titre = nettoyer(demande.titre || v.demande_id, 200).replace(/\n/g, " ");

    await modifierAvecReessai(gh, "etat/decisions.json", async (liste) => {
      const evaluees = await evaluerDecisions(liste, cfg.cle);
      const { statut } = statutDemande(v.demande_id, evaluees);
      if (statut === "approuvee" || statut === "refusee") throw new ErreurMetier("Cette demande a déjà une décision signée.", 409);
      const base = { id: idDecision(decideLe), demande_id: v.demande_id, titre, choix: v.choix, commentaire: v.commentaire, decide_le: decideLe, par: email };
      entree = { ...base, signature: await signer(base, cfg.cle), origine: ORIGINE_CONSOLE };
      return [...liste, entree];
    }, `Décision du propriétaire : ${v.choix} — ${titre}`);

    let journalOk = true;
    try {
      await modifierAvecReessai(gh, "etat/journal.json", async (liste) => {
        const suivant = liste.reduce((m, j) => Math.max(m, numeroJournal(j)), 0) + 1;
        const lib = v.choix === "approuvee" ? "approuvée" : "refusée";
        return [...liste, {
          id: `J-${String(suivant).padStart(3, "0")}`,
          date: decideLe,
          texte: `Décision du propriétaire : ${lib} — ${titre}`,
          agent: null,
          mission: typeof demande.mission === "string" ? demande.mission : null,
        }];
      }, `Journal : décision du propriétaire — ${titre}`);
    } catch {
      journalOk = false;
    }

    return reponseJson({
      ok: true,
      decision: { id: entree.id, demande_id: entree.demande_id, choix: entree.choix, decide_le: entree.decide_le, verification: "valide" },
      journal: journalOk ? "ok" : "non mis à jour",
    });
  } catch (e) {
    if (e instanceof ErreurMetier) return reponseJson({ erreur: e.message }, e.statut);
    if (e instanceof ErreurConflit) return reponseJson({ erreur: "La mémoire a été modifiée en même temps. Réessayez." }, 409);
    return reponseJson({ erreur: "Enregistrement impossible." }, 502);
  }
}
