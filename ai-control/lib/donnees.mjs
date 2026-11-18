// Données partagées d'AI CONTROL (M-013) : lecture, écriture et droits, côté serveur.
// Les règles de droits sont appliquées ici, pas dans l'interface :
//   - Direction : tout lire, tout écrire, tout supprimer, modifier les seuils.
//   - Collaborateur : ne lit que ses propres usages et le budget global ; ne saisit
//     et ne supprime que ses propres usages ; ne lit ni les limites ni les auteurs.
// Les identifiants et les auteurs sont posés par le serveur, jamais repris du client.

import { etatInitial, normaliser, valideDepense, valideUsage } from "../public/logique.mjs";
import { ROLES } from "./roles.mjs";

export const MAX_LOT = 500;
const MAX_LIBELLE = 200;
const MAX_TEXTE = 80;
const MAX_CONVERSATION = 120;
const COLONNES_DEPENSE = "id, date, type, libelle, montant, source";
const COLONNES_USAGE = "id, date, utilisateur, projet, nature, valeur, cout, source, conversation, session, cumul, cache";

const reponse = (corps, statut = 200) => ({ statut, corps });
const erreur = (statut, message) => ({ statut, corps: { erreur: message } });
const texte = (v, max) => (typeof v === "string" && v.trim() !== "" && v.trim().length <= max ? v.trim() : null);
const nombre = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ---------- validation des lignes envoyées par le client ----------

export function preparerDepense(l) {
  const libelle = texte(l?.libelle, MAX_LIBELLE);
  const candidat = { id: "x", date: l?.date, type: l?.type, libelle: libelle ?? "", montant: nombre(l?.montant), source: l?.source };
  if (!libelle || !valideDepense(candidat)) return null;
  return { date: candidat.date, type: candidat.type, libelle, montant: candidat.montant, source: candidat.source };
}

// Un collaborateur ne peut saisir que ses propres usages : l'auteur est forcé.
export function preparerUsage(l, emailAppelant, role) {
  const utilisateur = role === ROLES.direction ? texte(l?.utilisateur, MAX_TEXTE) : emailAppelant;
  const projet = texte(l?.projet, MAX_TEXTE);
  const coutBrut = l?.cout === null || l?.cout === undefined ? null : nombre(l.cout);
  if (!utilisateur || !projet) return null;
  if (l?.nature !== "api" && coutBrut !== null) return null; // pas de coût sur un quota d'abonnement
  const candidat = {
    id: "x", date: l?.date, utilisateur, projet, nature: l?.nature,
    valeur: nombre(l?.valeur) === null ? null : Math.round(l.valeur),
    cout: l?.nature === "api" ? coutBrut : null, source: l?.source,
  };
  if (!valideUsage(candidat)) return null;
  const conversation = typeof l?.conversation === "string" && l.conversation.trim() ? l.conversation.trim().slice(0, MAX_CONVERSATION) : null;
  const session = texte(l?.session, MAX_TEXTE);
  return { date: candidat.date, utilisateur, projet, nature: candidat.nature, valeur: candidat.valeur, cout: candidat.cout, source: candidat.source, conversation, session };
}

export function preparerConfig(c) {
  const optNombre = (v) => (v === null || v === undefined ? null : nombre(v));
  const budget = optNombre(c?.budgetMensuel) ?? 0;
  const seuilAlerte = optNombre(c?.seuilAlerte);
  const seuilCritique = optNombre(c?.seuilCritique);
  const ratio = optNombre(c?.ratioAnormal);
  const limU = optNombre(c?.limiteUtilisateurTokens);
  const limP = optNombre(c?.limiteProjetTokens);
  const limPS = optNombre(c?.limiteProjetTokensSemaine);
  const devise = texte(c?.devise, 10) || "USD";
  if (budget < 0 || seuilAlerte === null || seuilAlerte < 1 || seuilAlerte > 100) return null;
  if (seuilCritique === null || seuilCritique < 1 || seuilCritique > 200) return null;
  if (ratio === null || ratio < 1) return null;
  if ((limU !== null && limU < 0) || (limP !== null && limP < 0) || (limPS !== null && limPS < 0)) return null;
  return { budgetMensuel: budget, devise, seuilAlerte, seuilCritique, ratioAnormal: ratio, limiteUtilisateurTokens: limU, limiteProjetTokens: limP, limiteProjetTokensSemaine: limPS };
}

// ---------- lecture ----------

export async function lireConfig(db) {
  const ligne = await db.prepare("SELECT valeur FROM config WHERE cle = 'config'").first();
  if (!ligne) return etatInitial().config;
  try {
    return normaliser({ config: JSON.parse(ligne.valeur) }).config;
  } catch {
    return etatInitial().config;
  }
}

// Le collaborateur ne reçoit pas les limites par personne ni par projet.
const configCollaborateur = (c) => ({
  budgetMensuel: c.budgetMensuel, devise: c.devise, seuilAlerte: c.seuilAlerte, seuilCritique: c.seuilCritique,
});

export async function chargerDonnees(db, email, role) {
  const config = await lireConfig(db);
  const depenses = await db.prepare(`SELECT ${COLONNES_DEPENSE} FROM depenses ORDER BY date`).all();
  if (role === ROLES.direction) {
    const usages = await db.prepare(`SELECT ${COLONNES_USAGE} FROM usages ORDER BY date`).all();
    return { role, email, config, depenses: depenses.results, usages: usages.results };
  }
  const usages = await db.prepare(`SELECT ${COLONNES_USAGE} FROM usages WHERE utilisateur = ? ORDER BY date`).bind(email).all();
  return { role, email, config: configCollaborateur(config), depenses: depenses.results, usages: usages.results };
}

// ---------- écriture ----------

async function ajouterLot(db, lignes, preparer, sql, liaison) {
  if (!Array.isArray(lignes) || lignes.length === 0 || lignes.length > MAX_LOT) {
    return erreur(400, `Envoyez entre 1 et ${MAX_LOT} lignes.`);
  }
  const preparees = lignes.map(preparer);
  const rejetees = preparees.filter((p) => p === null).length;
  if (rejetees) return erreur(400, `${rejetees} ligne(s) invalide(s) : rien n'a été enregistré.`);
  const maintenant = new Date().toISOString();
  await db.batch(preparees.map((p) => db.prepare(sql).bind(crypto.randomUUID(), ...liaison(p), maintenant)));
  return reponse({ ajoutees: preparees.length }, 201);
}

export function ajouterDepenses(db, lignes, email) {
  return ajouterLot(db, lignes, preparerDepense,
    "INSERT INTO depenses (id, date, type, libelle, montant, source, cree_par, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    (p) => [p.date, p.type, p.libelle, p.montant, p.source, email]);
}

export function ajouterUsages(db, lignes, email, role) {
  return ajouterLot(db, lignes, (l) => preparerUsage(l, email, role),
    "INSERT INTO usages (id, date, utilisateur, projet, nature, valeur, cout, source, conversation, session, cree_par, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    (p) => [p.date, p.utilisateur, p.projet, p.nature, p.valeur, p.cout, p.source, p.conversation, p.session, email]);
}

export async function supprimer(db, table, id, email, role) {
  let requete;
  if (role === ROLES.direction) {
    requete = db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id);
  } else if (table === "usages") {
    requete = db.prepare("DELETE FROM usages WHERE id = ? AND utilisateur = ?").bind(id, email);
  } else {
    return erreur(403, "Accès réservé à la Direction / Finance.");
  }
  const r = await requete.run();
  if (!r.meta || r.meta.changes === 0) return erreur(404, "Ligne introuvable.");
  return reponse({ supprimee: true });
}

export async function ecrireConfig(db, corps) {
  const propre = preparerConfig(corps);
  if (!propre) return erreur(400, "Seuils invalides : vérifiez les valeurs.");
  await db.prepare("INSERT INTO config (cle, valeur) VALUES ('config', ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur")
    .bind(JSON.stringify(propre)).run();
  return reponse(propre);
}

// ---------- routeur ----------

const ID = "([0-9a-fA-F-]{36})";

export async function traiter({ method, chemin, corps, email, role, db }) {
  const direction = role === ROLES.direction;
  if (method === "GET" && chemin === "/moi") return reponse({ email, role });
  if (method === "GET" && chemin === "/donnees") return reponse(await chargerDonnees(db, email, role));

  if (method === "PUT" && chemin === "/config") {
    if (!direction) return erreur(403, "Accès réservé à la Direction / Finance.");
    return ecrireConfig(db, corps);
  }
  if (method === "POST" && chemin === "/depenses") {
    if (!direction) return erreur(403, "Accès réservé à la Direction / Finance.");
    return ajouterDepenses(db, corps?.lignes, email);
  }
  if (method === "POST" && chemin === "/usages") {
    // Un collaborateur ne peut pas saisir pour un autre : refus explicite, pas de correction silencieuse.
    if (!direction && Array.isArray(corps?.lignes) && corps.lignes.some((l) => l?.utilisateur && String(l.utilisateur).trim().toLowerCase() !== email)) {
      return erreur(403, "Vous ne pouvez saisir que vos propres usages.");
    }
    return ajouterUsages(db, corps?.lignes, email, role);
  }
  let m = new RegExp(`^/(depenses|usages)/${ID}$`).exec(chemin);
  if (method === "DELETE" && m) return supprimer(db, m[1], m[2], email, role);
  return erreur(404, "Route inconnue.");
}
