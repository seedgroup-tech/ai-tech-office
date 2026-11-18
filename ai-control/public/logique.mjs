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
    tokens: somme(us.filter((u) => u.nature === "api"), (u) => u.valeur),
    coutApi: coutsApi.length ? somme(coutsApi, (u) => u.cout) : null,
    provenance: compterSources([...dep, ...us]),
  };
}

// Historique des dépenses sur plusieurs mois (pour le graphique).
export function depensesParMois(etat, mois, n = 6) {
  return moisPrecedents(mois, n).map((m) => ({ mois: m, montant: somme(depensesDuMois(etat, m), (d) => d.montant) }));
}

export function alertes(etat, mois) {
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
  if (users.length >= 3) {
    const med = mediane(users.map((u) => u.tokens));
    if (med > 0) {
      for (const u of users) {
        if (u.tokens > c.ratioAnormal * med) out.push({ niveau: "attention", categorie: "Usage", message: `${u.nom} consomme ${(u.tokens / med).toFixed(1).replace(".", ",")} fois la médiane des utilisateurs.` });
      }
    }
  }
  return out.sort((a, b) => (a.niveau === b.niveau ? 0 : a.niveau === "critique" ? -1 : 1));
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
