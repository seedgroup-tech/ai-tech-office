// Décisions de réveil (fonctions pures : aucun réveil ici, seulement des décisions).
import { jourDouala, isoDouala, enMs } from "./temps.mjs";

export const PLAFOND_JOUR = 6;
export const DELAI_PROJET_MS = 6 * 3600 * 1000;
// Lecture stricte de « au plus 1 réveil par empreinte » : aucune purge, aucun délai.
export const DELAI_REVEIL_EMPREINTE_MS = Infinity;
export const PLAFOND_EMPREINTES = 1000;
const NIVEAUX_REVEIL = ["critique", "eleve"];

// Compteurs du jour : remis à zéro quand le jour de Douala change.
export function compteursDuJour(sentinel, maintenant) {
  const jour = jourDouala(maintenant);
  const memeJour = sentinel.jour === jour;
  return { jour, reveils_du_jour: memeJour && Number.isInteger(sentinel.reveils_du_jour) ? sentinel.reveils_du_jour : 0 };
}

const reveilNonFait = (alerte, raison) => ({ alerte, reveil: false, raison });

// candidates : alertes créées pendant ce passage. configuration : { ok, raison }.
// Renvoie { decisions: [{alerte, reveil, raison?}], compteurs, notes }.
export function decisionsReveil({ creees, sentinel, maintenant, configuration, premierPassage }) {
  const { jour, reveils_du_jour } = compteursDuJour(sentinel, maintenant);
  const parEmpreinte = { ...(sentinel.reveils_par_empreinte || {}) };
  const parProjet = { ...(sentinel.dernier_reveil_projet || {}) };
  let total = reveils_du_jour;
  const notes = [];
  const decisions = [];
  const candidates = creees
    .filter((a) => NIVEAUX_REVEIL.includes(a.niveau))
    .sort((a, b) => NIVEAUX_REVEIL.indexOf(a.niveau) - NIVEAUX_REVEIL.indexOf(b.niveau));

  for (const a of candidates) {
    const present = Object.prototype.hasOwnProperty.call(parEmpreinte, a.empreinte);
    const ancien = present ? enMs(parEmpreinte[a.empreinte]) : NaN;
    const dernierProjet = enMs(parProjet[a.projet]);
    let raison = null;
    if (sentinel.pause !== false) raison = "bureau en veille";
    else if (premierPassage) raison = "premier passage";
    else if (!configuration.ok) raison = configuration.raison;
    else if (present && !(maintenant.getTime() - ancien >= DELAI_REVEIL_EMPREINTE_MS)) raison = "empreinte déjà réveillée";
    else if (!present && Object.keys(parEmpreinte).length >= PLAFOND_EMPREINTES) {
      raison = "registre des réveils plein";
      notes.push({ cle: "sentinel|registre-reveils-plein", texte: "Registre des réveils plein (1 000 empreintes) : plus aucun réveil." });
    } else if (maintenant.getTime() - dernierProjet < DELAI_PROJET_MS) raison = "projet déjà réveillé il y a moins de 6 h";
    else if (total >= PLAFOND_JOUR) raison = "plafond de 6 réveils par jour atteint";
    if (raison) { decisions.push(reveilNonFait(a, raison)); continue; }
    total += 1;
    parEmpreinte[a.empreinte] = isoDouala(maintenant);
    parProjet[a.projet] = isoDouala(maintenant);
    decisions.push({ alerte: a, reveil: true });
  }
  return {
    decisions, notes,
    compteurs: { jour, reveils_du_jour: total, reveils_par_empreinte: parEmpreinte, dernier_reveil_projet: parProjet },
  };
}
