// Page « Contrôle des dépenses IA » (M-012). Données dans le stockage de ce navigateur uniquement.
import {
  etatInitial, lireEtat, moisCourant, nouvelId, resumeMois, alertes, agreger,
  depensesDuMois, usagesDuMois, depensesParMois, importerDepenses, importerUsages,
  formaterMontant, formaterNombre, dateValide, SOURCES, TYPES, NATURES,
} from "./logique.mjs";

const CLE = "ai-control:v1";
const VUES = ["apercu", "utilisateurs", "projets", "depenses", "alertes"];
const $ = (id) => document.getElementById(id);

let etat;
try { etat = lireEtat(localStorage.getItem(CLE)); } catch { etat = etatInitial(); }
let mois = moisCourant();
let minuterie;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const badge = (s) => `<span class="badge s-${s}" title="${esc(SOURCES[s].aide)}">${esc(SOURCES[s].libelle)}</span>`;
const vide = (n, texte) => `<tr><td colspan="${n}" class="vide">${esc(texte)}</td></tr>`;
const kpi = (titre, valeur, sous, classe = "") => `<div class="kpi-c ${classe}"><span>${esc(titre)}</span><b>${esc(valeur)}</b><small>${esc(sous)}</small></div>`;
const alerteHtml = (a) => `<div class="alerte ${a.niveau}"><b>${esc(a.categorie)}</b> ${esc(a.message)}</div>`;

// Les largeurs de barres passent par le DOM (CSP : pas de style en ligne).
function barre(pct, classe = "") {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return `<div class="barre"><i class="${classe}" data-pct="${p}"></i></div>`;
}
function appliquerLargeurs() {
  document.querySelectorAll("[data-pct]").forEach((el) => { el.style.width = el.dataset.pct + "%"; });
}

function message(texte, ok = true) {
  const m = $("msg");
  m.textContent = texte;
  m.className = "msg " + (ok ? "ok" : "erreur");
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { m.textContent = ""; m.className = "msg"; }, 6000);
}

function rapport(id, erreurs) {
  $(id).innerHTML = erreurs.map((x) => `<li>${esc(x)}</li>`).join("");
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    message("Impossible d'enregistrer dans ce navigateur (stockage bloqué).", false);
  }
  rendre();
}

function aujourdhui() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function provenanceTexte(p) {
  const total = p.reel + p.importe + p.manuel + p.estime;
  if (!total) return "Aucune donnée ce mois.";
  return `Données du mois : ${p.reel} réelle(s) · ${p.importe} importée(s) · ${p.manuel} saisie(s) · ${p.estime} estimée(s).`;
}

function svgMois(donnees, devise) {
  const W = 640, H = 200, pad = 30;
  const max = Math.max(1, ...donnees.map((d) => d.montant));
  const bw = (W - 2 * pad) / donnees.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dépenses des six derniers mois">`;
  donnees.forEach((d, i) => {
    const h = (d.montant / max) * (H - 50);
    const x = pad + i * bw + bw * 0.2;
    s += `<rect class="bar" x="${x}" y="${H - 30 - h}" width="${bw * 0.6}" height="${h}" rx="6"><title>${esc(d.mois)} : ${esc(formaterMontant(d.montant, devise))}</title></rect>`;
    s += `<text class="axe" x="${x + bw * 0.3}" y="${H - 10}" text-anchor="middle">${esc(d.mois.slice(5))}/${esc(d.mois.slice(2, 4))}</text>`;
  });
  return s + "</svg>";
}

function lignesBarres(liste) {
  const max = Math.max(1, ...liste.map((u) => u.tokens));
  return liste.map((u) => `<div class="ligne-barre"><span>${esc(u.nom)}</span>${barre((u.tokens / max) * 100)}<b>${esc(formaterNombre(u.tokens))}</b></div>`).join("");
}

function rendreApercu() {
  const c = etat.config;
  const r = resumeMois(etat, mois);
  const usages = usagesDuMois(etat, mois);
  const aApi = usages.some((u) => u.nature === "api");
  const depassement = r.budget > 0 && r.restant < 0;
  $("kpi").innerHTML = [
    kpi("Dépenses IA", formaterMontant(r.depense, c.devise), `${depensesDuMois(etat, mois).length} ligne(s) ce mois`),
    kpi("Budget mensuel", r.budget > 0 ? formaterMontant(r.budget, c.devise) : "Non défini", "réglable dans Alertes"),
    kpi("Restant", r.budget > 0 ? formaterMontant(r.restant, c.devise) : "—", depassement ? "dépassement" : "disponible", depassement ? "critique" : ""),
    kpi("Utilisateurs actifs", formaterNombre(r.utilisateursActifs), "avec un usage ce mois"),
    kpi("Tokens API", aApi ? formaterNombre(r.tokens) : "—", aApi ? "usages saisis ou importés" : "aucun usage saisi"),
    kpi("Coût API déclaré", r.coutApi !== null ? formaterMontant(r.coutApi, c.devise) : "—", r.coutApi !== null ? "somme des coûts renseignés" : "aucun coût renseigné"),
  ].join("");

  $("prov").textContent = provenanceTexte(r.provenance);
  if (r.budget > 0) {
    const niveau = r.pourcentage >= c.seuilCritique ? "critique" : r.pourcentage >= c.seuilAlerte ? "attention" : "";
    $("budget").innerHTML = `<div class="budget-ligne"><span>${esc(formaterMontant(r.depense, c.devise))} consommés</span><span>${Math.round(r.pourcentage)} %</span></div>${barre(r.pourcentage, niveau)}`;
  } else {
    $("budget").innerHTML = `<p class="aide">Aucun budget défini. Renseignez-le dans Alertes pour suivre le restant.</p>`;
  }

  const al = alertes(etat, mois);
  $("alertes-resume").innerHTML = al.length ? al.slice(0, 5).map(alerteHtml).join("") : `<p class="aide">Aucune alerte ce mois.</p>`;
  $("graph-mois").innerHTML = svgMois(depensesParMois(etat, mois, 6), c.devise);
  const users = agreger(usages.filter((u) => u.nature === "api"), "utilisateur").slice(0, 8);
  $("graph-users").innerHTML = users.length ? lignesBarres(users) : `<p class="aide">Aucun usage API ce mois.</p>`;
}

function rendreUtilisateurs() {
  const c = etat.config;
  const usages = usagesDuMois(etat, mois);
  const liste = agreger(usages, "utilisateur");
  $("t-users").innerHTML = liste.length
    ? liste.map((u) => `<tr>
        <td data-label="Utilisateur">${esc(u.nom)}</td>
        <td data-label="Tokens API">${u.tokens ? formaterNombre(u.tokens) : "—"}</td>
        <td data-label="Quota abonnement">${u.quota ? formaterNombre(u.quota) : "—"}</td>
        <td data-label="Coût API déclaré">${u.cout !== null ? formaterMontant(u.cout, c.devise) : "Non déclaré"}</td>
        <td data-label="Lignes">${u.lignes}</td>
        <td data-label="Sources">${u.sources.map(badge).join(" ")}</td></tr>`).join("")
    : vide(6, "Aucun usage ce mois. Saisissez-le ci-dessous ou importez un CSV.");

  const recents = [...usages].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  $("t-usages").innerHTML = recents.length
    ? recents.map((u) => `<tr>
        <td data-label="Date">${esc(u.date)}</td>
        <td data-label="Utilisateur">${esc(u.utilisateur)}</td>
        <td data-label="Projet">${esc(u.projet)}</td>
        <td data-label="Nature">${esc(NATURES[u.nature])}</td>
        <td data-label="Valeur">${esc(formaterNombre(u.valeur))}</td>
        <td data-label="Coût">${u.cout !== null ? esc(formaterMontant(u.cout, c.devise)) : "—"}</td>
        <td data-label="Source">${badge(u.source)}</td>
        <td><button type="button" class="non petit" data-suppr="usages" data-id="${esc(u.id)}">Supprimer</button></td></tr>`).join("")
    : vide(8, "Aucun usage saisi ce mois.");

  $("dl-users").innerHTML = [...new Set(etat.usages.map((u) => u.utilisateur))].sort().map((v) => `<option value="${esc(v)}">`).join("");
}

function rendreProjets() {
  const usages = usagesDuMois(etat, mois).filter((u) => u.nature === "api");
  const liste = agreger(usages, "projet");
  const c = etat.config;
  $("t-projets").innerHTML = liste.length
    ? liste.map((p) => `<tr>
        <td data-label="Projet">${esc(p.nom)}</td>
        <td data-label="Tokens API">${formaterNombre(p.tokens)}</td>
        <td data-label="Coût API déclaré">${p.cout !== null ? formaterMontant(p.cout, c.devise) : "Non déclaré"}</td>
        <td data-label="Utilisateurs">${new Set(usages.filter((u) => u.projet === p.nom).map((u) => u.utilisateur)).size}</td>
        <td data-label="Lignes">${p.lignes}</td>
        <td data-label="Sources">${p.sources.map(badge).join(" ")}</td></tr>`).join("")
    : vide(6, "Aucun usage API ce mois.");
  $("graph-projets").innerHTML = liste.length ? lignesBarres(liste) : `<p class="aide">Aucun usage API ce mois.</p>`;
  $("dl-projets").innerHTML = [...new Set(etat.usages.map((u) => u.projet))].sort().map((v) => `<option value="${esc(v)}">`).join("");
}

function rendreDepenses() {
  const c = etat.config;
  const liste = [...etat.depenses].sort((a, b) => b.date.localeCompare(a.date));
  $("t-depenses").innerHTML = liste.length
    ? liste.map((d) => `<tr>
        <td data-label="Date">${esc(d.date)}</td>
        <td data-label="Type">${esc(TYPES[d.type])}</td>
        <td data-label="Libellé">${esc(d.libelle)}</td>
        <td data-label="Montant">${esc(formaterMontant(d.montant, c.devise))}</td>
        <td data-label="Source">${badge(d.source)}</td>
        <td><button type="button" class="non petit" data-suppr="depenses" data-id="${esc(d.id)}">Supprimer</button></td></tr>`).join("")
    : vide(6, "Aucune dépense enregistrée.");
  const r = resumeMois(etat, mois);
  $("total-mois").textContent = `Total du mois sélectionné : ${formaterMontant(r.depense, c.devise)}`;
}

function rendreAlertes() {
  const al = alertes(etat, mois);
  $("alertes-liste").innerHTML = al.length ? al.map(alerteHtml).join("") : `<p class="aide">Aucune alerte pour ce mois.</p>`;
}

function remplirConfig() {
  const f = $("f-config");
  const c = etat.config;
  const val = (n, v) => { f.elements.namedItem(n).value = v ?? ""; };
  val("budgetMensuel", c.budgetMensuel || "");
  val("devise", c.devise);
  val("seuilAlerte", c.seuilAlerte);
  val("seuilCritique", c.seuilCritique);
  val("ratioAnormal", c.ratioAnormal);
  val("limiteUtilisateurTokens", c.limiteUtilisateurTokens);
  val("limiteProjetTokens", c.limiteProjetTokens);
}

function rendre() {
  rendreApercu();
  rendreUtilisateurs();
  rendreProjets();
  rendreDepenses();
  rendreAlertes();
  appliquerLargeurs();
}

function vue() {
  const v = VUES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "apercu";
  for (const x of VUES) {
    $("vue-" + x).hidden = x !== v;
    const lien = document.querySelector(`[data-nav="${x}"]`);
    if (x === v) lien.setAttribute("aria-current", "page");
    else lien.removeAttribute("aria-current");
  }
}

// ---------- saisie ----------

$("f-depense").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const v = (n) => f.elements.namedItem(n).value;
  const montant = Number(v("montant"));
  if (!dateValide(v("date"))) return message("Date invalide.", false);
  if (!v("libelle").trim() || !Number.isFinite(montant) || montant < 0) return message("Libellé ou montant invalide.", false);
  etat.depenses.push({ id: nouvelId(), date: v("date"), type: v("type"), libelle: v("libelle").trim(), montant, source: v("source") });
  f.elements.namedItem("libelle").value = "";
  f.elements.namedItem("montant").value = "";
  sauver();
  message("Dépense enregistrée.");
});

const champUsage = (f) => ({
  nature: f.elements.namedItem("nature"),
  cout: f.elements.namedItem("cout"),
  label: $("label-valeur"),
});
function surNature() {
  const f = $("f-usage");
  const { nature, cout, label } = champUsage(f);
  const abo = nature.value === "abonnement";
  cout.disabled = abo;
  if (abo) cout.value = "";
  label.textContent = abo ? "Quota consommé (unités)" : "Tokens";
}
$("f-usage").elements.namedItem("nature").addEventListener("change", surNature);

$("f-usage").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const v = (n) => f.elements.namedItem(n).value;
  const valeur = Number(v("valeur"));
  const nature = v("nature");
  const coutSaisi = v("cout").trim();
  const cout = nature === "api" && coutSaisi !== "" ? Number(coutSaisi) : null;
  if (!dateValide(v("date"))) return message("Date invalide.", false);
  if (!v("utilisateur").trim() || !v("projet").trim()) return message("Utilisateur et projet sont requis.", false);
  if (!Number.isFinite(valeur) || valeur < 0) return message("Valeur invalide.", false);
  if (cout !== null && (!Number.isFinite(cout) || cout < 0)) return message("Coût invalide.", false);
  etat.usages.push({
    id: nouvelId(), date: v("date"), utilisateur: v("utilisateur").trim(), projet: v("projet").trim(),
    nature, valeur: Math.round(valeur), cout, source: v("source"),
  });
  f.elements.namedItem("valeur").value = "";
  f.elements.namedItem("cout").value = "";
  sauver();
  message("Usage enregistré.");
});

$("f-config").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const num = (n) => {
    const t = f.elements.namedItem(n).value.trim();
    if (t === "") return null;
    const x = Number(t);
    return Number.isFinite(x) ? x : null;
  };
  const c = etat.config;
  etat.config = {
    ...c,
    budgetMensuel: num("budgetMensuel") ?? 0,
    devise: f.elements.namedItem("devise").value.trim() || "FCFA",
    seuilAlerte: num("seuilAlerte") ?? 80,
    seuilCritique: num("seuilCritique") ?? 100,
    ratioAnormal: num("ratioAnormal") ?? 2,
    limiteUtilisateurTokens: num("limiteUtilisateurTokens"),
    limiteProjetTokens: num("limiteProjetTokens"),
  };
  sauver();
  remplirConfig();
  message("Seuils enregistrés.");
});

// ---------- imports CSV ----------

function lireFichierDans(idCible) {
  return async (e) => {
    const f = e.target.files[0];
    if (f) $(idCible).value = await f.text();
  };
}
$("usage-fichier").addEventListener("change", lireFichierDans("usage-csv"));
$("dep-fichier").addEventListener("change", lireFichierDans("dep-csv"));

$("b-usage-import").addEventListener("click", () => {
  const texte = $("usage-csv").value;
  if (!texte.trim()) return message("Choisissez ou collez un CSV d'usage.", false);
  const { ajouts, erreurs } = importerUsages(texte);
  etat.usages.push(...ajouts);
  rapport("usage-rapport", erreurs);
  sauver();
  message(`${ajouts.length} usage(s) importé(s).${erreurs.length ? ` ${erreurs.length} ligne(s) ignorée(s).` : ""}`, erreurs.length === 0);
});

$("b-dep-import").addEventListener("click", () => {
  const texte = $("dep-csv").value;
  if (!texte.trim()) return message("Choisissez ou collez un CSV de dépenses.", false);
  const { ajouts, erreurs } = importerDepenses(texte);
  etat.depenses.push(...ajouts);
  rapport("dep-rapport", erreurs);
  sauver();
  message(`${ajouts.length} dépense(s) importée(s).${erreurs.length ? ` ${erreurs.length} ligne(s) ignorée(s).` : ""}`, erreurs.length === 0);
});

// ---------- suppressions, mois, navigation ----------

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-suppr]");
  if (!b) return;
  if (!confirm("Supprimer cette ligne ?")) return;
  const collection = b.dataset.suppr;
  etat[collection] = etat[collection].filter((x) => x.id !== b.dataset.id);
  sauver();
  message("Ligne supprimée.");
});

$("mois").addEventListener("change", (e) => {
  mois = e.target.value || moisCourant();
  rendre();
});

addEventListener("hashchange", vue);

// ---------- démarrage ----------

$("mois").value = mois;
$("f-depense").elements.namedItem("date").value = aujourdhui();
$("f-usage").elements.namedItem("date").value = aujourdhui();
remplirConfig();
surNature();
vue();
rendre();
