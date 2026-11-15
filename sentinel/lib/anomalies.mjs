// Fusion des observations d'un passage avec les alertes ouvertes (fonctions pures : aucun réseau).
import { SEUILS } from "./controles.mjs";
import { isoDouala, enMs } from "./temps.mjs";
import { nettoyer } from "./texte.mjs";

export const MAX_NOTES = 50;
export const RAFRAICHISSEMENT_MS = 24 * 3600 * 1000;   // derniere_observation : au plus 1 fois par 24 h
const OBSERVATION_PEREMPTION_MS = 24 * 3600 * 1000;    // une observation sans échec depuis 24 h est retirée
const CONTROLES_POUR_FERMER = 2;

// Compteur lu dans un fichier : entier >= 0, sinon 0.
const entier = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const estAlerteSentinel = (a) => a && typeof a === "object" && a.source === "sentinel";

// Identifiant : SN-AAAAMMJJHHmm (heure de Douala) + 6 hexa du SHA-256 de l'empreinte.
export function idAlerte(empreinte, date, sha6) {
  const horodatage = isoDouala(date).slice(0, 16).replace(/\D/g, "");
  return `SN-${horodatage}-${sha6(empreinte)}`;
}

// Un contrôle exécuté prouve-t-il la correction de cette cible ?
function preuve(resultat, cible) {
  if (resultat.fermeture === true) return true;
  return Array.isArray(resultat.fermeture) && resultat.fermeture.includes(String(cible));
}

// Entrées : alertes (liste complète du fichier), observation, résultats des contrôles, date.
// Sortie : { observation, creees, modifiees: [{id, champs}], fermees, ouvertes_apres }
export function fusionner({ alertes, observation = {}, resultats, maintenant, sha6 = () => "000000" }) {
  const iso = isoDouala(maintenant);
  const ouvertes = (Array.isArray(alertes) ? alertes : []).filter((a) => estAlerteSentinel(a) && a.statut === "ouverte");
  const etat = new Map(ouvertes.map((a) => [a.id, { ...a, controles_corrects: entier(a.controles_corrects) }]));
  const parEmpreinte = new Map();
  for (const a of ouvertes) if (!parEmpreinte.has(a.empreinte)) parEmpreinte.set(a.empreinte, etat.get(a.id));
  const changees = new Set();
  const creees = [];
  const fermees = [];

  // Une empreinte est en observation OU ouverte, jamais les deux ; observation périmée retirée.
  const obs = Object.create(null);
  for (const [e, v] of Object.entries(observation && typeof observation === "object" ? observation : {})) {
    if (v === null || typeof v !== "object") continue;
    const vu = enMs(v.vu);
    if (parEmpreinte.has(e) || !(maintenant.getTime() - vu <= OBSERVATION_PEREMPTION_MS)) continue;
    obs[e] = { ...v, echecs: entier(v.echecs) };
  }

  for (const r of resultats.filter((x) => x.ok)) {
    const vues = new Set(r.anomalies.map((a) => a.empreinte));
    for (const a of r.anomalies) {
      const ouverte = parEmpreinte.get(a.empreinte);
      if (ouverte) {
        if (!(maintenant.getTime() - enMs(ouverte.derniere_observation) < RAFRAICHISSEMENT_MS)) { ouverte.derniere_observation = iso; changees.add(ouverte.id); }
        if (ouverte.controles_corrects !== 0) { ouverte.controles_corrects = 0; changees.add(ouverte.id); }
        continue;
      }
      const entree = obs[a.empreinte] || { projet: r.projet, type: r.type, cible: a.cible, echecs: 0, depuis: iso };
      entree.echecs += 1;
      entree.vu = iso;
      if (entree.echecs >= (SEUILS[r.type] || 1)) {
        delete obs[a.empreinte];
        const nouvelle = {
          id: idAlerte(a.empreinte, maintenant, sha6), titre: nettoyer(a.titre, 200), detail: nettoyer(a.detail, 300),
          niveau: a.niveau, statut: "ouverte", date: iso, lien: a.lien,
          source: "sentinel", empreinte: a.empreinte, projet: r.projet, type: r.type, cible: a.cible,
          premiere_observation: iso, derniere_observation: iso, controles_corrects: 0,
        };
        creees.push(nouvelle);
        parEmpreinte.set(a.empreinte, nouvelle);
      } else obs[a.empreinte] = entree;
    }
    // Alerte ouverte de ce projet et de ce type, non revue, avec preuve de correction.
    for (const ouverte of etat.values()) {
      if (ouverte.projet !== r.projet || ouverte.type !== r.type || vues.has(ouverte.empreinte) || !preuve(r, ouverte.cible)) continue;
      ouverte.controles_corrects = ouverte.controles_corrects + 1;
      changees.add(ouverte.id);
      if (ouverte.controles_corrects >= CONTROLES_POUR_FERMER) {
        ouverte.statut = "close";
        ouverte.close_le = iso;
        fermees.push(ouverte);
      }
    }
    // Les échecs doivent être consécutifs : observation non revue = retirée.
    for (const [e, v] of Object.entries(obs)) {
      if (v.projet === r.projet && v.type === r.type && !vues.has(e) && preuve(r, v.cible)) delete obs[e];
    }
  }

  const modifiees = [...changees].map((id) => {
    const a = etat.get(id);
    const champs = { derniere_observation: a.derniere_observation, controles_corrects: a.controles_corrects };
    if (a.statut === "close") { champs.statut = "close"; champs.close_le = a.close_le; }
    return { id, champs };
  });
  const ouvertes_apres = ouvertes.length - fermees.length + creees.length;
  return { observation: obs, creees, modifiees, fermees, ouvertes_apres };
}

// Applique le résultat sur une liste d'alertes (éventuellement plus fraîche que celle lue au départ).
// Ajoute les alertes absentes, met à jour par id les seules alertes Sentinel encore ouvertes,
// et garde au plus une alerte Sentinel ouverte par empreinte. Les autres alertes ne sont jamais touchées.
export function appliquerAlertes(liste, { creees, modifiees }) {
  const sortie = liste.map((a) => (a && typeof a === "object" ? { ...a } : a));
  for (const m of modifiees) {
    const a = sortie.find((x) => estAlerteSentinel(x) && x.id === m.id);
    if (a && a.statut === "ouverte") Object.assign(a, m.champs);
  }
  for (const c of creees) {
    const existe = sortie.some((x) => x && x.id === c.id)
      || sortie.some((x) => estAlerteSentinel(x) && x.statut === "ouverte" && x.empreinte === c.empreinte);
    if (!existe) sortie.push({ ...c });
  }
  return sortie;
}

// Une note par clé, jamais répétée ; au plus 50 (les nouvelles sont refusées au-delà).
export function ajouterNote(notes, cle, texte, maintenant) {
  const liste = Array.isArray(notes) ? notes : [];
  if (liste.some((n) => n && n.cle === cle) || liste.length >= MAX_NOTES) return liste;
  return [...liste, { cle: nettoyer(cle, 100), date: isoDouala(maintenant), texte: nettoyer(texte, 200) }];
}
