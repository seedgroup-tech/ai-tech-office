// Décisions de réveil (fonctions pures : aucun réveil ici, seulement des décisions).
import { jourDouala, isoDouala, enMs } from "./temps.mjs";

export const PLAFOND_JOUR = 6;
export const DELAI_PROJET_MS = 6 * 3600 * 1000;
// Lecture stricte de « au plus 1 réveil par empreinte » : aucune purge, aucun délai.
export const DELAI_REVEIL_EMPREINTE_MS = Infinity;
export const PLAFOND_EMPREINTES = 1000;
const NIVEAUX_REVEIL = ["critique", "eleve"];

// Compteurs du jour : remis à zéro quand le jour de Douala change.
// Un compteur qui n'est pas un entier de 0 à 6 est traité comme 6 (aucun réveil).
export function compteursDuJour(sentinel, maintenant) {
  const jour = jourDouala(maintenant);
  if (sentinel.jour !== jour) return { jour, reveils_du_jour: 0 };
  const n = sentinel.reveils_du_jour;
  return { jour, reveils_du_jour: Number.isInteger(n) && n >= 0 && n <= PLAFOND_JOUR ? n : PLAFOND_JOUR };
}

// Objet simple (ni tableau, ni null) ; absent = vide.
const objetSimple = (v) => v === undefined || (v !== null && typeof v === "object" && !Array.isArray(v));
const copieNue = (v) => Object.assign(Object.create(null), v || {});

const reveilNonFait = (alerte, raison) => ({ alerte, reveil: false, raison });

// candidates : alertes créées pendant ce passage. configuration : { ok, raison }.
// Renvoie { decisions: [{alerte, reveil, raison?}], compteurs, notes }.
export function decisionsReveil({ creees, sentinel, maintenant, configuration, premierPassage }) {
  const { jour, reveils_du_jour } = compteursDuJour(sentinel, maintenant);
  const malformes = !objetSimple(sentinel.reveils_par_empreinte) || !objetSimple(sentinel.dernier_reveil_projet);
  const parEmpreinte = copieNue(sentinel.reveils_par_empreinte);
  const parProjet = copieNue(sentinel.dernier_reveil_projet);
  let total = reveils_du_jour;
  const notes = [];
  if (malformes) notes.push({ cle: "sentinel|registres-malformes", texte: "Registres de réveils illisibles dans sentinel.json : aucun réveil." });
  const decisions = [];
  const candidates = creees
    .filter((a) => NIVEAUX_REVEIL.includes(a.niveau))
    .sort((a, b) => NIVEAUX_REVEIL.indexOf(a.niveau) - NIVEAUX_REVEIL.indexOf(b.niveau));

  for (const a of candidates) {
    const present = Object.prototype.hasOwnProperty.call(parEmpreinte, a.empreinte);
    const ancien = present ? enMs(parEmpreinte[a.empreinte]) : NaN;
    const dernierProjet = enMs(parProjet[a.projet]);
    let raison = null;
    if (malformes) raison = "registres de réveils illisibles";
    else if (sentinel.pause !== false) raison = "bureau en veille";
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
  // Registres malformés : on ne les réécrit pas (aucun réveil n'a eu lieu).
  return {
    decisions, notes,
    compteurs: malformes
      ? { jour, reveils_du_jour: total, reveils_par_empreinte: sentinel.reveils_par_empreinte, dernier_reveil_projet: sentinel.dernier_reveil_projet }
      : { jour, reveils_du_jour: total, reveils_par_empreinte: parEmpreinte, dernier_reveil_projet: parProjet },
  };
}
