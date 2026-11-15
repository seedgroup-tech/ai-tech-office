// Un passage complet de Sentinel : lecture, contrôles, décisions, écritures, réveils.
// Ordre anti-boucle : les compteurs de réveil sont écrits dans sentinel.json AVANT l'appel de la routine.
import { creerReseau } from "./reseau.mjs";
import { clientMemoire, clientProduit, ErreurConflit, DEPOT } from "./github.mjs";
import { controlerSiteProjet, controlerGitHubProjet, siteValide } from "./controles.mjs";
import { fusionner, appliquerAlertes, ajouterNote } from "./anomalies.mjs";
import { decisionsReveil } from "./garde-fous.mjs";
import { configurationRoutine, declencher } from "./routine.mjs";
import { isoDouala, enMs } from "./temps.mjs";
import { nettoyer } from "./texte.mjs";

const SIGNE_DE_VIE_MS = 3600 * 1000;
const TAILLE_ALERTE_OCTETS = 700 * 1024;
const MOTIF_ID = /^[A-Za-z0-9_.-]{1,64}$/;
const MOTIF_DEPOT = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CLE_PAR_PROPRIETAIRE = { "seedgroup-tech": "org", "seedscaleup": "perso" };
const SENTINEL_INITIAL = { pause: false, dernier_passage: null, reveils_du_jour: 0, notes: [] };
const APPELS_GITHUB_MAX = 8;   // 1 liste de workflows + 5 exécutions + 1 demande de fusion + 1 Dependabot
const NIVEAUX_JOURNAL = ["critique", "eleve"];

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Texte JSON stable (clés triées), pour comparer deux états.
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (estObjet(v)) return `{${Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",")}}`;
  return JSON.stringify(v);
}

async function sha6(texte) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return [...new Uint8Array(h)].slice(0, 3).map((o) => o.toString(16).padStart(2, "0")).join("");
}

// Projets actifs valides, avec la clé GitHub qui leur correspond. Les autres sont sautés (note unique).
function preparerProjets(liste, env, reseau, notes) {
  const jetons = { org: env.GITHUB_TOKEN_ORG, perso: env.GITHUB_TOKEN_PERSO };
  const prets = [];
  for (const brut of liste) {
    if (!estObjet(brut) || brut.actif !== true || typeof brut.id !== "string" || !MOTIF_ID.test(brut.id)) continue;
    const p = { id: brut.id, nom: nettoyer(brut.nom, 60) || brut.id, depot: brut.depot, site: brut.site, branche: brut.branche };
    const note = (suffixe, texte) => notes.push({ cle: `${p.id}|${suffixe}`, texte: `${p.nom} : ${texte}` });
    if (typeof p.depot !== "string" || !MOTIF_DEPOT.test(p.depot)) { note("depot", "dépôt invalide, projet sauté."); continue; }
    if (p.depot.toLowerCase() === DEPOT.toLowerCase()) { note("memoire", "le dépôt mémoire n'est pas contrôlé comme produit, projet sauté."); continue; }
    const attendue = CLE_PAR_PROPRIETAIRE[p.depot.split("/")[0]];
    if (!attendue || attendue !== brut.proprietaire_cle) { note("cle", "clé GitHub incohérente avec le dépôt, projet sauté."); continue; }
    let client = null;
    if (typeof jetons[attendue] === "string" && jetons[attendue]) client = clientProduit(jetons[attendue], p.depot, reseau);
    else note("jeton", "clé GitHub absente, contrôles du dépôt sautés.");
    if (p.site !== null && p.site !== undefined && !siteValide(p.site)) { note("site", "adresse du site non valide (https obligatoire), contrôle du site sauté."); p.site = null; }
    if (p.site) reseau.autoriserSite(new URL(p.site).hostname);
    prets.push({ p, client });
  }
  return prets;
}

// Calcule, sur des versions données de sentinel.json et alertes.json, tout ce qu'il y a à écrire.
function planifier({ sentinel, alertes, resultats, notesNouvelles, now, config, hashes, trop_gros, nbProjets, rotation }) {
  const premier = sentinel.dernier_passage === null || sentinel.dernier_passage === undefined;
  const f = fusionner({ alertes, observation: sentinel.en_observation, resultats, maintenant: now, sha6: (e) => hashes[e] || "000000" });
  const g = decisionsReveil({ creees: f.creees, sentinel, maintenant: now, configuration: config, premierPassage: premier });
  let notes = sentinel.notes;
  for (const n of [...notesNouvelles, ...g.notes]) notes = ajouterNote(notes, n.cle, n.texte, now);
  const aReveil = g.decisions.some((d) => d.reveil);
  const nouveau = {
    ...sentinel,
    en_observation: f.observation,
    reveils_par_empreinte: g.compteurs.reveils_par_empreinte,
    dernier_reveil_projet: g.compteurs.dernier_reveil_projet,
    notes,
    fichiers_trop_gros: trop_gros,
    ...rotation,
    dernier_passage: isoDouala(now),
    dernier_resultat: { projets: nbProjets, anomalies_ouvertes: f.ouvertes_apres, erreurs: resultats.filter((r) => r.erreur).length },
  };
  if (aReveil) { nouveau.jour = g.compteurs.jour; nouveau.reveils_du_jour = g.compteurs.reveils_du_jour; }
  const sans = (s) => { const { dernier_passage, dernier_resultat, ...reste } = s; return canon(reste); };
  const vieux = !(now.getTime() - enMs(sentinel.dernier_passage) < SIGNE_DE_VIE_MS);
  return { fusion: f, decisions: g.decisions, nouveau, doitEcrire: premier || vieux || sans(nouveau) !== sans(sentinel) };
}

// Lit, applique `modifier` sur la version lue, écrit. Un conflit : relit, réapplique (une seule fois).
async function modifierFichier(memoire, chemin, lu, modifier, message) {
  let courant = lu;
  for (let essai = 0; essai < 2; essai++) {
    if (essai === 1) courant = await memoire.lire(chemin);
    const apres = modifier(courant.valeur);
    if (apres === null) return false;
    try { await memoire.ecrire(chemin, apres, courant.sha, message); return true; }
    catch (e) { if (!(e instanceof ErreurConflit) || essai === 1) throw e; }
  }
  return false;
}

function ajouterJournal(textes, now) {
  return (liste) => {
    if (!Array.isArray(liste)) throw new Error("Journal illisible.");
    let n = liste.reduce((m, e) => { const r = /^J-(\d+)$/.exec(e && e.id); return r ? Math.max(m, Number(r[1])) : m; }, 0);
    const date = isoDouala(now);
    return [...liste, ...textes.map((texte) => ({ id: `J-${String(++n).padStart(3, "0")}`, date, texte, agent: null, mission: null }))];
  };
}

function lignesJournal(plan) {
  const lignes = [];
  for (const a of plan.fusion.creees.filter((x) => NIVEAUX_JOURNAL.includes(x.niveau))) {
    lignes.push(`Sentinel : alerte ${a.niveau} ouverte : ${a.titre}`);
    const r = a.reveil;
    if (!r) continue;
    if (r.statut === "fait") lignes.push(`Sentinel : agent réveillé pour « ${a.titre} ». Session : ${r.session || "adresse non renvoyée"}.`);
    else if (r.statut === "echec") lignes.push(`Sentinel : réveil en échec pour « ${a.titre} » (${r.raison}).`);
    else lignes.push(`Sentinel : pas de réveil pour « ${a.titre} » (${r.raison}).`);
  }
  for (const a of plan.fusion.fermees.filter((x) => NIVEAUX_JOURNAL.includes(x.niveau))) {
    lignes.push(`Sentinel : alerte fermée après 2 contrôles corrects : ${a.titre}`);
  }
  return lignes;
}

export async function passage(env, { fetchFn = fetch, maintenant = () => new Date() } = {}) {
  const resume = { statut: "ok", projets: 0, nouvelles: 0, fermees: 0, reveils: 0, erreurs: 0 };
  const jetonMemoire = env.GITHUB_TOKEN_MEMOIRE || env.GITHUB_TOKEN_ORG;
  if (typeof jetonMemoire !== "string" || !jetonMemoire) {
    console.error("Sentinel : configuration absente, passage arrêté.");
    return { ...resume, statut: "configuration_absente" };
  }
  const now = maintenant();
  const reseau = creerReseau({ fetchFn });
  const memoire = clientMemoire(jetonMemoire, reseau);
  const abandon = (statut) => { console.error("Sentinel : passage abandonné (" + statut + ")."); return { ...resume, statut, reveils: 0 }; };

  // 1. Lecture
  let projetsF, alertesF, sentinelF, journalF;
  try {
    [projetsF, alertesF, sentinelF, journalF] = await Promise.all(["projets", "alertes", "sentinel", "journal"].map((n) => memoire.lire(`etat/${n}.json`)));
  } catch { return { ...abandon("lecture_impossible"), erreurs: 1 }; }
  if (!Array.isArray(projetsF.valeur)) return { ...abandon("projets_illisibles"), erreurs: 1 };
  if (alertesF.valeur !== null && !Array.isArray(alertesF.valeur)) return { ...abandon("alertes_illisibles"), erreurs: 1 };
  if (sentinelF.valeur !== null && !estObjet(sentinelF.valeur)) return { ...abandon("sentinel_illisible"), erreurs: 1 };
  const sentinelLu = { valeur: sentinelF.valeur === null ? { ...SENTINEL_INITIAL } : sentinelF.valeur, sha: sentinelF.sha };
  const alertesLues = { valeur: alertesF.valeur || [], sha: alertesF.sha };

  // 2. Contrôles
  const notesNouvelles = [];
  const trop_gros = { alertes: alertesF.size >= TAILLE_ALERTE_OCTETS, journal: journalF.size >= TAILLE_ALERTE_OCTETS };
  if (trop_gros.alertes) notesNouvelles.push({ cle: "sentinel|taille-alertes", texte: "alertes.json dépasse 700 Ko : archivage à prévoir par le propriétaire." });
  if (trop_gros.journal) notesNouvelles.push({ cle: "sentinel|taille-journal", texte: "journal.json dépasse 700 Ko : archivage à prévoir par le propriétaire." });
  const prets = preparerProjets(projetsF.valeur, env, reseau, notesNouvelles);
  // Budget : GitHub = UN projet par passage, à tour de rôle (au plus 8 appels) ;
  // sites = à chaque passage, dans la limite du budget restant (sinon rotation des sites).
  const avecClient = prets.filter((x) => x.client);
  let idxGh = avecClient.findIndex((x) => x.p.id === sentinelLu.valeur.rotation_github);
  if (idxGh < 0) idxGh = 0;
  const choisi = avecClient[idxGh] || null;
  const rotation = { rotation_github: avecClient.length ? avecClient[(idxGh + 1) % avecClient.length].p.id : null };
  const avecSite = prets.filter((x) => x.p.site);
  const place = Math.max(0, reseau.restantControles() - (choisi ? APPELS_GITHUB_MAX : 0));
  const nbSites = Math.min(avecSite.length, place);
  const debutSites = avecSite.length ? (Number.isInteger(sentinelLu.valeur.rotation_sites) ? sentinelLu.valeur.rotation_sites : 0) % avecSite.length : 0;
  const lot = Array.from({ length: nbSites }, (_, i) => avecSite[(debutSites + i) % avecSite.length]);
  rotation.rotation_sites = avecSite.length ? (debutSites + nbSites) % avecSite.length : 0;
  const groupes = await Promise.all([
    ...lot.map(({ p }) => controlerSiteProjet(p, reseau)),
    choisi ? controlerGitHubProjet(choisi.p, choisi.client, now) : [],
  ]);
  const resultats = groupes.flat();
  for (const r of resultats) if (r.note) notesNouvelles.push(r.note);
  resume.projets = prets.length;
  resume.erreurs = resultats.filter((r) => r.erreur).length;
  const hashes = {};
  for (const r of resultats) for (const a of r.anomalies) hashes[a.empreinte] = await sha6(a.empreinte);

  // 3. Décisions, puis écriture de sentinel.json (compteurs AVANT tout réveil)
  const config = configurationRoutine(env);
  const entree = { resultats, notesNouvelles, now, config, hashes, trop_gros, nbProjets: prets.length, rotation };
  let plan = planifier({ ...entree, sentinel: sentinelLu.valeur, alertes: alertesLues.valeur });
  let alertesCourantes = alertesLues;
  if (plan.doitEcrire) {
    const ecrireSentinel = (p, sha) => memoire.ecrire("etat/sentinel.json", p.nouveau, sha, "Sentinel : passage de surveillance");
    try {
      await ecrireSentinel(plan, sentinelLu.sha);
    } catch (e) {
      if (!(e instanceof ErreurConflit)) return { ...abandon("ecriture_impossible"), erreurs: resume.erreurs + 1 };
      // Conflit : tout recalculer sur les versions fraîches (la pause a pu changer).
      try {
        const [s, a] = await Promise.all([memoire.lire("etat/sentinel.json"), memoire.lire("etat/alertes.json")]);
        if (!estObjet(s.valeur) || (a.valeur !== null && !Array.isArray(a.valeur))) return abandon("conflit_illisible");
        alertesCourantes = { valeur: a.valeur || [], sha: a.sha };
        plan = planifier({ ...entree, sentinel: s.valeur, alertes: alertesCourantes.valeur });
        if (plan.doitEcrire) await ecrireSentinel(plan, s.sha);
      } catch { return { ...abandon("conflit_persistant"), erreurs: resume.erreurs + 1 }; }
    }
  }

  // 4. Réveils (seulement les alertes créées dans ce passage)
  const date = isoDouala(now);
  for (const d of plan.decisions) {
    if (!d.reveil) { d.alerte.reveil = { statut: "non_fait", raison: d.raison, date }; continue; }
    const r = await declencher(env, d.alerte, reseau);
    d.alerte.reveil = r.statut === "fait" ? { statut: "fait", ...(r.session ? { session: r.session } : {}), date } : { statut: "echec", raison: r.raison, date };
    if (r.statut === "fait") resume.reveils++;
  }

  // 5. Alertes puis journal
  const { creees, modifiees, fermees } = plan.fusion;
  resume.nouvelles = creees.length;
  resume.fermees = fermees.length;
  let alertesEcrites = true;
  if (creees.length || modifiees.length) {
    try {
      await modifierFichier(memoire, "etat/alertes.json", alertesCourantes, (liste) => {
        if (liste !== null && !Array.isArray(liste)) throw new Error("Alertes illisibles.");
        const avant = liste || [];
        const apres = appliquerAlertes(avant, { creees, modifiees });
        return canon(apres) === canon(avant) ? null : apres;
      }, "Sentinel : mise à jour des alertes");
    } catch { alertesEcrites = false; resume.erreurs++; console.error("Sentinel : écriture des alertes impossible."); }
  }
  const lignes = lignesJournal(plan);
  if (!alertesEcrites && creees.length) lignes.push("Sentinel : alerte non enregistrée (écriture de alertes.json impossible).");
  if (lignes.length && Array.isArray(journalF.valeur)) {
    try {
      await modifierFichier(memoire, "etat/journal.json", { valeur: journalF.valeur, sha: journalF.sha }, ajouterJournal(lignes, now), "Sentinel : journal");
    } catch { resume.erreurs++; console.error("Sentinel : écriture du journal impossible."); }
  }

  if (resume.erreurs > 0) resume.statut = "partiel";
  console.log(`Sentinel : passage terminé. projets=${resume.projets} nouvelles=${resume.nouvelles} fermees=${resume.fermees} reveils=${resume.reveils} erreurs=${resume.erreurs}`);
  return resume;
}
