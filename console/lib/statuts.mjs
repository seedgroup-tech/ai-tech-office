// Calcul du statut des demandes à partir de etat/decisions.json.
// Règle : une demande n'est approuvée ou refusée que par une décision signée valide.

import { verifierSignature } from "./signature.mjs";

export const ORIGINE_HISTORIQUE = "historique, enregistrée par Claude";
export const ORIGINE_CONSOLE = "console du propriétaire";
const CHOIX = new Set(["approuvee", "refusee"]);

// Ajoute à chaque décision : verification = "valide" | "historique" | "invalide".
// La valeur brute de la signature n'est pas renvoyée au navigateur.
export async function evaluerDecisions(decisions, secret) {
  const liste = Array.isArray(decisions) ? decisions : [];
  const sortie = [];
  for (const d of liste) {
    if (!d || typeof d !== "object") continue;
    const { signature, ...reste } = d;
    let verification;
    if (signature == null && d.origine === ORIGINE_HISTORIQUE) {
      verification = "historique";
    } else if (CHOIX.has(d.choix) && (await verifierSignature(d, secret))) {
      verification = "valide";
    } else {
      verification = "invalide";
    }
    const e = { ...reste, verification };
    if (verification === "invalide") e.alerte = "signature invalide";
    sortie.push(e);
  }
  return sortie;
}

const plusRecente = (a, b) => (String(b.decide_le || "").localeCompare(String(a.decide_le || "")));

// Statut d'une demande : approuvee | refusee (signée valide), historique, en_attente.
export function statutDemande(demandeId, decisionsEvaluees) {
  const siennes = decisionsEvaluees.filter((d) => d.demande_id === demandeId);
  const valides = siennes.filter((d) => d.verification === "valide").sort(plusRecente);
  if (valides.length) return { statut: valides[0].choix, decision: valides[0] };
  const hist = siennes.filter((d) => d.verification === "historique").sort(plusRecente);
  if (hist.length) return { statut: "historique", decision: hist[0] };
  return { statut: "en_attente", decision: null };
}

export function calculerStatuts(demandes, decisionsEvaluees) {
  return (Array.isArray(demandes) ? demandes : []).map((d) => {
    const { statut, decision } = statutDemande(d.id, decisionsEvaluees);
    return {
      ...d,
      statut,
      decision: decision
        ? { id: decision.id, choix: decision.choix, decide_le: decision.decide_le, commentaire: decision.commentaire ?? null, verification: decision.verification }
        : null,
    };
  });
}
