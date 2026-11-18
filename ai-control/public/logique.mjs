// Contrôle des dépenses et de l'usage IA (M-012) — logique pure, sans dépendance.
// Aucune donnée n'est inventée : chaque ligne porte sa source (réel, importé, saisi, estimé).
// Les dépenses (abonnements, crédits) et les coûts d'usage API sont calculés séparément.

export const SOURCES = {
  reel: { libelle: "Réel", aide: "Facture, relevé ou export officiel" },
  importe: { libelle: "Importé", aide: "Fichier CSV" },
  manuel: { libelle: "Saisi", aide: "Saisie manuelle" },
  estime: { libelle: "Estimé", aide: "Ordre de grandeur à confirmer" },
};

export const TYPES = {
  abonnement: "Abonnement",
  mise_a_niveau: "Mise à niveau",
  credits: "Crédits supplémentaires",
  achat: "Achat",
  autre: "Autre",
};

export const NATURES = {
  api: "Usage API (tokens)",
  abonnement: "Quota d'abonnement (sans coût)",
};

const REGEX_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function etatInitial() {
  return {
    version: 1,
    config: {
      budgetMensuel: 0,
      devise: "USD",
      seuilAlerte: 80,
      seuilCritique: 100,
      ratioAnormal: 2,
      limiteUtilisateurTokens: null,
      limiteProjetTokens: null,
      limiteProjetTokensSemaine: null,
    },
    depenses: [],
    usages: [],
  };
}

export function nouvelId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function dateValide(s) {
  if (typeof s !== "string" || !REGEX_ISO.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function valideDepense(d) {
  return d && dateValide(d.date) && TYPES[d.type] && SOURCES[d.source]
    && typeof d.montant === "number" && Number.isFinite(d.montant) && d.montant >= 0 && typeof d.libelle === "string";
}

export function valideUsage(u) {
  return u && dateValide(u.date) && NATURES[u.nature] && SOURCES[u.source]
    && typeof u.utilisateur === "string" && typeof u.projet === "string"
    && typeof u.valeur === "number" && Number.isFinite(u.valeur) && u.valeur >= 0
    && (u.cout === null || (typeof u.cout === "number" && Number.isFinite(u.cout) && u.cout >= 0));
}

// Lit l'état sauvegardé ; tout élément invalide est écarté, jamais réparé par supposition.
export function normaliser(o) {
  const base = etatInitial();
  if (!o || typeof o !== "object") return base;
  return {
    version: 1,
    config: { ...base.config, ...(o.config && typeof o.config === "object" ? o.config : {}) },
    depenses: Array.isArray(o.depenses) ? o.depenses.filter(valideDepense) : [],
    usages: Array.isArray(o.usages) ? o.usages.filter(valideUsage) : [],
  };
}

export function lireEtat(json) {
  try {
    return normaliser(JSON.parse(json));
  } catch {
    return etatInitial();
  }
}

export function moisCourant(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function moisPrecedents(mois, n) {
  const [a, m] = mois.split("-").map(Number);
  const liste = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    liste.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return liste;
}

export const depensesDuMois = (etat, mois) => etat.depenses.filter((d) => d.date.slice(0, 7) === mois);
export const usagesDuMois = (etat, mois) => etat.usages.filter((u) => u.date.slice(0, 7) === mois);
const somme = (liste, f) => liste.reduce((s, x) => s + (f(x) || 0), 0);

function mediane(valeurs) {
  if (!valeurs.length) return 0;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

function compterSources(lignes) {
  const c = { reel: 0, importe: 0, manuel: 0, estime: 0 };
  for (const l of lignes) c[l.source] += 1;
  return c;
}

// ---------- périodes et sessions ----------

// Date ISO (AAAA-MM-JJ) moins n jours.
export function moinsJours(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Les 7 derniers jours, aujourd'hui compris. Les lignes « cumul » (total d'une session sans
// répartition dans le temps) n'en font jamais partie : leur date n'est pas celle de la consommation.
export const usagesSemaine = (usages, aujourdhui) =>
  usages.filter((u) => !u.cumul && u.date >= moinsJours(aujourdhui, 6) && u.date <= aujourdhui);

// Une session (conversation) peut avoir plusieurs lignes, une par relevé : on les regroupe.
export function sessionsAgregees(usages) {
  const par = new Map();
  for (const u of usages) {
    if (u.nature !== "api") continue;
    const cle = u.session || u.id;
    const e = par.get(cle) || { cle, conversation: u.conversation || "(sans titre)", projet: u.projet, tokens: 0, cout: 0, date: "", cumul: false };
    e.tokens += u.valeur;
    e.cout += u.cout || 0;
    if (u.date > e.date) { e.date = u.date; if (u.conversation) e.conversation = u.conversation; }
    if (u.cumul) e.cumul = true;
    par.set(cle, e);
  }
  return [...par.values()];
}

// Agrège les usages API (tokens) et les quotas d'abonnement par utilisateur ou par projet.
export function agreger(usages, cle) {
  const par = new Map();
  for (const u of usages) {
    const nom = u[cle];
    const e = par.get(nom) || { nom, tokens: 0, quota: 0, cout: null, lignes: 0, sources: new Set() };
    if (u.nature === "api") e.tokens += u.valeur;
    else e.quota += u.valeur;
    if (u.cout !== null) e.cout = (e.cout || 0) + u.cout;
    e.lignes += 1;
    e.sources.add(u.source);
    par.set(nom, e);
  }
  return [...par.values()]
    .map((e) => ({ ...e, sources: [...e.sources] }))
    .sort((a, b) => b.tokens - a.tokens || a.nom.localeCompare(b.nom, "fr"));
}

// Où partent les crédits de sessions : coût, tokens et nombre de sessions par projet.
// Une ligne d'usage API = une session (conversation). `tri` : "cout", "tokens" ou "sessions".
export function creditsParProjet(usages, tri = "cout") {
  const par = new Map();
  for (const x of sessionsAgregees(usages)) {
    const e = par.get(x.projet) || { nom: x.projet, cout: 0, tokens: 0, sessions: 0, derniere: "" };
    e.cout += x.cout;
    e.tokens += x.tokens;
    e.sessions += 1;
    if (x.date > e.derniere) e.derniere = x.date;
    par.set(x.projet, e);
  }
  const cle = ["cout", "tokens", "sessions"].includes(tri) ? tri : "cout";
  const liste = [...par.values()].sort((a, b) => b[cle] - a[cle] || b.cout - a.cout || a.nom.localeCompare(b.nom, "fr"));
  const total = liste.reduce((s, e) => s + e.cout, 0);
  return {
    total,
    tokens: liste.reduce((s, e) => s + e.tokens, 0),
    sessions: liste.reduce((s, e) => s + e.sessions, 0),
    projets: liste.map((e) => ({ ...e, part: total > 0 ? (e.cout / total) * 100 : 0 })),
  };
}

// Conversations (sessions) qui consomment : filtre par projet et par seuils, trié par `tri`.
export function listerConversations(usages, { projet = "", tokensMin = 0, coutMin = 0, tri = "cout" } = {}) {
  const cle = ["cout", "tokens", "date"].includes(tri) ? tri : "cout";
  return sessionsAgregees(usages)
    .filter((x) => (!projet || x.projet === projet) && x.tokens >= tokensMin && x.cout >= coutMin)
    .map((x) => ({ id: x.cle, conversation: x.conversation, projet: x.projet, tokens: x.tokens, cout: x.cout, date: x.date, cumul: x.cumul }))
    .sort((a, b) => (cle === "date" ? b.date.localeCompare(a.date) : b[cle] - a[cle]) || b.cout - a.cout || a.conversation.localeCompare(b.conversation, "fr"));
}

export function resumeMois(etat, mois) {
  const dep = depensesDuMois(etat, mois);
  const us = usagesDuMois(etat, mois);
  const depense = somme(dep, (d) => d.montant);
  const budget = Number(etat.config.budgetMensuel) || 0;
  const coutsApi = us.filter((u) => u.nature === "api" && u.cout !== null);
  return {
    mois,
    depense,
    budget,
    restant: budget - depense,
    pourcentage: budget > 0 ? (depense / budget) * 100 : null,
    utilisateursActifs: new Set(us.map((u) => u.utilisateur)).size,
    projetsActifs: new Set(us.filter((u) => u.nature === "api").map((u) => u.projet)).size,
    tokens: somme(us.filter((u) => u.nature === "api"), (u) => u.valeur),
    coutApi: coutsApi.length ? somme(coutsApi, (u) => u.cout) : null,
    provenance: compterSources([...dep, ...us]),
  };
}

// Historique des dépenses sur plusieurs mois (pour le graphique).
export function depensesParMois(etat, mois, n = 6) {
  return moisPrecedents(mois, n).map((m) => ({ mois: m, montant: somme(depensesDuMois(etat, m), (d) => d.montant) }));
}

export function alertes(etat, mois, aujourdhui = new Date().toISOString().slice(0, 10)) {
  const c = etat.config;
  const r = resumeMois(etat, mois);
  const out = [];
  if (r.budget > 0) {
    if (r.pourcentage >= c.seuilCritique) {
      out.push({ niveau: "critique", categorie: "Budget", message: `Budget mensuel atteint à ${Math.round(r.pourcentage)} % (${formaterMontant(r.depense, c.devise)} sur ${formaterMontant(r.budget, c.devise)}).` });
    } else if (r.pourcentage >= c.seuilAlerte) {
      out.push({ niveau: "attention", categorie: "Budget", message: `${Math.round(r.pourcentage)} % du budget mensuel consommé.` });
    }
  }
  const api = usagesDuMois(etat, mois).filter((u) => u.nature === "api");
  const users = agreger(api, "utilisateur");
  const projets = agreger(api, "projet");
  if (c.limiteUtilisateurTokens) {
    for (const u of users) {
      if (u.tokens > c.limiteUtilisateurTokens) out.push({ niveau: "critique", categorie: "Limite", message: `${u.nom} dépasse la limite de ${formaterNombre(c.limiteUtilisateurTokens)} tokens (${formaterNombre(u.tokens)}).` });
    }
  }
  if (c.limiteProjetTokens) {
    for (const p of projets) {
      if (p.tokens > c.limiteProjetTokens) out.push({ niveau: "critique", categorie: "Limite", message: `Le projet ${p.nom} dépasse la limite de ${formaterNombre(c.limiteProjetTokens)} tokens (${formaterNombre(p.tokens)}).` });
    }
  }
  if (c.limiteProjetTokensSemaine) {
    for (const p of agreger(usagesSemaine(etat.usages, aujourdhui).filter((u) => u.nature === "api"), "projet")) {
      if (p.tokens > c.limiteProjetTokensSemaine) out.push({ niveau: "critique", categorie: "Limite", message: `Le projet ${p.nom} a consommé ${formaterNombre(p.tokens)} tokens ces 7 derniers jours, au-dessus de la limite hebdomadaire de ${formaterNombre(c.limiteProjetTokensSemaine)}.` });
    }
  }
  if (users.length >= 3) {
    const med = mediane(users.map((u) => u.tokens));
    if (med > 0) {
      for (const u of users) {
        if (u.tokens > c.ratioAnormal * med) out.push({ niveau: "attention", categorie: "Usage", message: `${u.nom} consomme ${(u.tokens / med).toFixed(1).replace(".", ",")} fois la médiane des utilisateurs.` });
      }
    }
  }
  const cr = creditsParProjet(api);
  if (cr.total > 0 && cr.projets.length >= 2 && cr.projets[0].part >= 50) {
    const top = cr.projets[0];
    const lignes = sessionsAgregees(api).filter((x) => x.projet === top.nom).sort((a, b) => b.cout - a.cout);
    const conv = lignes[0] && top.cout > 0 && lignes[0].cout / top.cout >= 0.6 ? ` Une seule conversation en est la cause : « ${lignes[0].conversation} ».` : "";
    out.push({ niveau: "attention", categorie: "Projet", message: `Le projet ${top.nom} concentre ${Math.round(top.part)} % du coût estimé du mois (${formaterMontant(top.cout, c.devise)} sur ${formaterMontant(cr.total, c.devise)}).${conv}` });
  }
  if (r.depense > 0 && r.coutApi !== null && r.coutApi > 3 * r.depense) {
    out.push({ niveau: "info", categorie: "Estimation", message: `Le coût estimé des sessions (${formaterMontant(r.coutApi, c.devise)}) vaut ${Math.round(r.coutApi / r.depense)} fois vos dépenses réelles du mois (${formaterMontant(r.depense, c.devise)}) : c'est une valeur de référence au tarif des tokens, pas une facture.` });
  }
  if (r.budget <= 0) {
    out.push({ niveau: "info", categorie: "Configuration", message: "Aucun budget mensuel défini : les alertes de dépassement sont inactives. Renseignez-le dans Alertes." });
  }
  const rang = { critique: 0, attention: 1, info: 2 };
  return out.sort((a, b) => rang[a.niveau] - rang[b.niveau]);
}

// Grand nombre lisible : 58 777 512 396 devient « 58,8 milliards ».
export function formaterCompact(n) {
  const f = (v, un, pl) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")} ${v < 2 ? un : pl}`;
  if (Math.abs(n) >= 1e9) return f(n / 1e9, "milliard", "milliards");
  if (Math.abs(n) >= 1e6) return f(n / 1e6, "million", "millions");
  return formaterNombre(n);
}

// Tokens du mois, ce qu'ils valent au tarif des tokens, et ce qui a réellement été dépensé.
export function bilanTokens(etat, mois) {
  const r = resumeMois(etat, mois);
  const coutEstime = r.coutApi || 0;
  return {
    tokens: r.tokens,
    coutEstime,
    depense: r.depense,
    part: coutEstime > 0 ? (r.depense / coutEstime) * 100 : null,
    parMillion: r.tokens > 0 ? r.depense / (r.tokens / 1e6) : null,
  };
}

const TITRE_GENERIQUE = /^(chat session|new session|pm|op|\(sans titre\))$/i;

// Bonnes pratiques pour réduire la consommation, projet par projet, d'après les usages API.
export function conseilsParProjet(usages, devise = "USD", max = 8) {
  const api = usages.filter((u) => u.nature === "api");
  const cr = creditsParProjet(api);
  return cr.projets.slice(0, max).map((p) => {
    const lignes = sessionsAgregees(api).filter((x) => x.projet === p.nom).sort((a, b) => b.cout - a.cout);
    const top = lignes[0];
    const partTop = p.cout > 0 ? (top.cout / p.cout) * 100 : 0;
    const conseils = [];
    if (top.cout >= 100 && partTop >= 50) {
      conseils.push(`La conversation « ${top.conversation} » pèse ${Math.round(partTop)} % du coût du projet (${formaterMontant(top.cout, devise)}, ${formaterCompact(top.tokens)} de tokens). Plus une conversation est longue, plus chaque message coûte cher : ouvrez une conversation par tâche et notez l'état d'avancement dans un fichier (CLAUDE.md ou notes) pour repartir proprement.`);
    }
    if (cr.total > 0 && p.part >= 30) {
      conseils.push(`Ce projet représente ${Math.round(p.part)} % du coût estimé total : fixez-lui une limite de tokens dans Alertes et gardez un modèle plus léger pour les tâches courantes.`);
    }
    if (p.sessions >= 5) {
      conseils.push(`${p.sessions} conversations : regroupez celles qui portent sur la même tâche, car chaque nouvelle conversation recharge son contexte.`);
    }
    if (lignes.some((x) => TITRE_GENERIQUE.test(x.conversation))) {
      conseils.push("Certaines conversations n'ont pas de titre parlant (« Chat session », « New session »…) : nommez-les par tâche pour retrouver ce qui coûte.");
    }
    if (!conseils.length) conseils.push("Rien d'anormal : continuez avec une conversation par tâche.");
    return { projet: p.nom, cout: p.cout, part: p.part, sessions: p.sessions, conseils };
  });
}

// Deux décimales au plus : un coût API de quelques centimes ne doit pas s'arrondir à zéro.
export function formaterMontant(n, devise) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n)} ${devise}`;
}

export function formaterNombre(n) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
}

// ---------- Lecture CSV et imports ----------

function sansAccents(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function lireCsv(texte) {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim() !== "") || "";
  const nbPV = (premiere.match(/;/g) || []).length;
  const nbVirgules = (premiere.match(/,/g) || []).length;
  const sep = nbPV > nbVirgules ? ";" : ",";
  const lignes = [];
  let ligne = [];
  let champ = "";
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') { champ += '"'; i++; } else guillemets = false;
      } else champ += c;
    } else if (c === '"') {
      guillemets = true;
    } else if (c === sep) {
      ligne.push(champ); champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = "";
    } else {
      champ += c;
    }
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const utiles = lignes.filter((l) => l.some((c) => c.trim() !== ""));
  if (!utiles.length) return { entetes: [], lignes: [] };
  const entetes = utiles[0].map(sansAccents);
  const corps = utiles.slice(1).map((l) => Object.fromEntries(entetes.map((e, i) => [e, (l[i] ?? "").trim()])));
  return { entetes, lignes: corps };
}

export function parseNombre(s) {
  if (s === null || s === undefined) return null;
  let t = String(s).replace(/[\s  ]/g, "");
  if (t === "") return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(s) {
  const t = String(s).trim();
  const fr = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : t;
  return dateValide(iso) ? iso : null;
}

function cleType(s) {
  const k = sansAccents(s).replace(/[\s-]+/g, "_");
  return TYPES[k] ? k : null;
}

function cleSource(s) {
  const k = sansAccents(s);
  return SOURCES[k] ? k : null;
}

function colonnesManquantes(entetes, requis) {
  return requis.filter((r) => !entetes.includes(r));
}

export function importerDepenses(texte) {
  const { entetes, lignes } = lireCsv(texte);
  const manque = colonnesManquantes(entetes, ["date", "type", "libelle", "montant"]);
  if (manque.length) return { ajouts: [], erreurs: [`Colonnes manquantes : ${manque.join(", ")}.`] };
  const ajouts = [];
  const erreurs = [];
  lignes.forEach((l, i) => {
    const num = i + 2;
    const date = parseDate(l.date);
    const type = cleType(l.type);
    const montant = parseNombre(l.montant);
    const source = l.source ? cleSource(l.source) : "importe";
    const probs = [];
    if (!date) probs.push("date (AAAA-MM-JJ ou JJ/MM/AAAA)");
    if (!type) probs.push("type inconnu");
    if (montant === null || montant < 0) probs.push("montant");
    if (!l.libelle) probs.push("libellé vide");
    if (!source) probs.push("source inconnue");
    if (probs.length) erreurs.push(`Ligne ${num} ignorée : ${probs.join(", ")}.`);
    else ajouts.push({ id: nouvelId(), date, type, libelle: l.libelle, montant, source });
  });
  return { ajouts, erreurs };
}

export function importerUsages(texte) {
  const { entetes, lignes } = lireCsv(texte);
  const manque = colonnesManquantes(entetes, ["date", "utilisateur", "projet"]);
  if (manque.length || !(entetes.includes("valeur") || entetes.includes("tokens"))) {
    return { ajouts: [], erreurs: [`Colonnes manquantes : ${[...manque, ...(entetes.includes("valeur") || entetes.includes("tokens") ? [] : ["valeur (ou tokens)"])].join(", ")}.`] };
  }
  const ajouts = [];
  const erreurs = [];
  lignes.forEach((l, i) => {
    const num = i + 2;
    const date = parseDate(l.date);
    const nature = l.nature ? (sansAccents(l.nature).startsWith("abon") ? "abonnement" : sansAccents(l.nature).startsWith("api") ? "api" : null) : "api";
    const valeur = parseNombre(l.valeur || l.tokens);
    const coutBrut = l.cout ? parseNombre(l.cout) : null;
    const source = l.source ? cleSource(l.source) : "importe";
    const probs = [];
    if (!date) probs.push("date");
    if (!nature) probs.push("nature inconnue");
    if (valeur === null || valeur < 0) probs.push("valeur");
    if (nature === "abonnement" && coutBrut !== null) probs.push("coût non applicable à un quota d'abonnement");
    if (coutBrut !== null && coutBrut < 0) probs.push("coût négatif");
    if (!l.utilisateur) probs.push("utilisateur vide");
    if (!l.projet) probs.push("projet vide");
    if (!source) probs.push("source inconnue");
    if (probs.length) erreurs.push(`Ligne ${num} ignorée : ${probs.join(", ")}.`);
    else ajouts.push({ id: nouvelId(), date, utilisateur: l.utilisateur, projet: l.projet, nature, valeur: Math.round(valeur), cout: nature === "api" ? coutBrut : null, source });
  });
  return { ajouts, erreurs };
}

// Consommation API par jour sur les n derniers jours se terminant à finIso (AAAA-MM-JJ).
export function parJour(usages, finIso, n = 7) {
  const base = new Date(finIso + "T00:00:00Z");
  const jours = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    jours.push(d.toISOString().slice(0, 10));
  }
  return jours.map((date) => ({
    date,
    tokens: somme(usages.filter((u) => u.nature === "api" && u.date === date), (u) => u.valeur),
  }));
}

// Projection linéaire de fin de mois, uniquement pour le mois en cours. Estimation, à présenter comme telle.
export function projeterMois(depense, mois, aujourdhuiIso) {
  if (!aujourdhuiIso || aujourdhuiIso.slice(0, 7) !== mois) return null;
  const jourCourant = Number(aujourdhuiIso.slice(8, 10));
  const [a, m] = mois.split("-").map(Number);
  const joursDuMois = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (jourCourant < 1) return null;
  return (depense / jourCourant) * joursDuMois;
}
