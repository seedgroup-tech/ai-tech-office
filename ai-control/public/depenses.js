// AI CONTROL (M-013) : page partagée. Les données viennent de l'API (/api), jamais du navigateur.
// Les droits sont appliqués par le serveur ; ce script ne fait que masquer ce qui ne sert pas au rôle.
import {
  etatInitial, moisCourant, resumeMois, alertes, agreger, depensesDuMois, usagesDuMois,
  depensesParMois, importerDepenses, importerUsages, formaterMontant, formaterNombre,
  dateValide, parJour, projeterMois, SOURCES, TYPES, NATURES,
} from "./logique.mjs";

const VUES = ["apercu", "utilisateurs", "projets", "depenses", "alertes"];
const VUES_DIRECTION = ["depenses", "alertes"];
const $ = (id) => document.getElementById(id);

let etat = etatInitial();
let role = null;
let email = "";
let mois = moisCourant();
let minuterie;
const estDirection = () => role === "direction";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const badge = (s) => `<span class="badge s-${s}" title="${esc(SOURCES[s].aide)}">${esc(SOURCES[s].libelle)}</span>`;
const vide = (n, texte) => `<tr><td colspan="${n}" class="vide">${esc(texte)}</td></tr>`;
const kpi = (titre, valeur, sous, classe = "") => `<div class="kpi-c ${classe}"><span>${esc(titre)}</span><b>${esc(valeur)}</b><small>${esc(sous)}</small></div>`;
const alerteHtml = (a) => `<div class="alerte ${a.niveau}"><b>${esc(a.categorie)}</b> ${esc(a.message)}</div>`;
const aujourdhui = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

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
  minuterie = setTimeout(() => { m.textContent = ""; m.className = "msg"; }, 7000);
}

function rapport(id, erreurs) {
  $(id).innerHTML = erreurs.map((x) => `<li>${esc(x)}</li>`).join("");
}

// ---------- réseau ----------

async function appeler(methode, chemin, corps) {
  const init = { method: methode, headers: {} };
  if (corps !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(corps);
  }
  const r = await fetch("/api" + chemin, init);
  let donnees = null;
  try { donnees = await r.json(); } catch { /* réponse non JSON */ }
  return { ok: r.ok, statut: r.status, donnees };
}

function erreurDe(r) {
  if (r.statut === 403) return r.donnees?.erreur || "Action non autorisée pour votre profil.";
  if (r.statut === 401 || r.statut === 403) return "Accès refusé : votre adresse n'est pas autorisée.";
  return r.donnees?.erreur || `Erreur ${r.statut}. Réessayez.`;
}

async function charger() {
  const r = await appeler("GET", "/donnees");
  if (!r.ok) {
    document.querySelector("main").hidden = true;
    $("qui").textContent = "";
    message(r.statut === 403 ? "Accès refusé : votre adresse n'est pas autorisée." : erreurDe(r), false);
    return false;
  }
  role = r.donnees.role;
  email = r.donnees.email;
  etat = { config: r.donnees.config, depenses: r.donnees.depenses, usages: r.donnees.usages };
  appliquerRole();
  rendre();
  return true;
}

// Après une écriture : on relit l'état serveur pour afficher ce qui est réellement enregistré.
async function ecrire(methode, chemin, corps, succes) {
  const r = await appeler(methode, chemin, corps);
  if (!r.ok) {
    message(erreurDe(r), false);
    return false;
  }
  await charger();
  message(succes);
  return true;
}

// ---------- rôles ----------

function appliquerRole() {
  const dir = estDirection();
  document.querySelectorAll("[data-dir]").forEach((el) => { el.hidden = !dir; });
  document.querySelectorAll("[data-collab]").forEach((el) => { el.hidden = dir; });
  $("qui").textContent = `Connecté : ${email} · ${dir ? "Direction / Finance" : "Collaborateur"}`;
  $("titre-utilisateurs").textContent = dir ? "Utilisateurs" : "Mon usage";
  $("nav-utilisateurs").textContent = dir ? "Utilisateurs" : "Mon usage";
  const champ = $("f-usage").elements.namedItem("utilisateur");
  if (!dir) { champ.value = email; champ.readOnly = true; }
  else { champ.readOnly = false; }
  vue();
}

// ---------- rendu ----------

function rendreApercu() {
  const c = etat.config;
  const r = resumeMois(etat, mois);
  const dir = estDirection();
  const depassement = r.budget > 0 && r.restant < 0;
  const aApi = usagesDuMois(etat, mois).some((u) => u.nature === "api");
  const cartes = [
    kpi("Dépenses IA", formaterMontant(r.depense, c.devise), `${depensesDuMois(etat, mois).length} ligne(s) ce mois`),
    kpi("Budget mensuel", r.budget > 0 ? formaterMontant(r.budget, c.devise) : "Non défini", dir ? "réglable dans Alertes" : "budget global SeedScaleUp"),
    kpi("Restant", r.budget > 0 ? formaterMontant(r.restant, c.devise) : "—", depassement ? "dépassement" : "disponible", depassement ? "critique" : ""),
  ];
  if (dir) {
    cartes.push(kpi("Utilisateurs actifs", formaterNombre(r.utilisateursActifs), "avec un usage ce mois"));
    cartes.push(kpi("Tokens API", aApi ? formaterNombre(r.tokens) : "—", aApi ? "tous collaborateurs" : "aucun usage saisi"));
    cartes.push(kpi("Coût API déclaré", r.coutApi !== null ? formaterMontant(r.coutApi, c.devise) : "—", r.coutApi !== null ? "somme des coûts renseignés" : "aucun coût renseigné"));
  } else {
    cartes.push(kpi("Mes tokens API", aApi ? formaterNombre(r.tokens) : "—", aApi ? "ce mois" : "aucun usage saisi"));
  }
  $("kpi").innerHTML = cartes.join("");

  $("prov").textContent = provenanceTexte(r.provenance);
  if (r.budget > 0) {
    const niveau = r.pourcentage >= c.seuilCritique ? "critique" : r.pourcentage >= c.seuilAlerte ? "attention" : "";
    $("budget").innerHTML = `<div class="budget-ligne"><span>${esc(formaterMontant(r.depense, c.devise))} consommés</span><span>${Math.round(r.pourcentage)} %</span></div>${barre(r.pourcentage, niveau)}`;
  } else {
    $("budget").innerHTML = `<p class="aide">Aucun budget défini.${dir ? " Renseignez-le dans Alertes." : ""}</p>`;
  }
  const p = projeterMois(r.depense, mois, aujourdhui());
  $("projection").textContent = p !== null && dir ? `Projection de fin de mois (estimation linéaire, à confirmer) : ${formaterMontant(p, c.devise)}` : "";

  // Le collaborateur ne voit que les alertes générales de budget.
  const al = alertes(etat, mois).filter((a) => dir || a.categorie === "Budget");
  $("alertes-resume").innerHTML = al.length ? al.slice(0, 5).map(alerteHtml).join("") : `<p class="aide">Aucune alerte ce mois.</p>`;

  if (dir) {
    $("graph-mois").innerHTML = svgMois(depensesParMois(etat, mois, 6), c.devise);
    const users = agreger(usagesDuMois(etat, mois).filter((u) => u.nature === "api"), "utilisateur").slice(0, 8);
    $("graph-users").innerHTML = users.length ? lignesBarres(users) : `<p class="aide">Aucun usage API ce mois.</p>`;
  } else {
    rendreMonSuivi();
  }
}

function rendreMonSuivi() {
  const jours = parJour(etat.usages, aujourdhui(), 7);
  const semaine = jours.reduce((s, j) => s + j.tokens, 0);
  const moisTokens = resumeMois(etat, mois).tokens;
  $("mon-total").textContent = `7 derniers jours : ${formaterNombre(semaine)} tokens · ${mois} : ${formaterNombre(moisTokens)} tokens`;
  const max = Math.max(1, ...jours.map((j) => j.tokens));
  $("mon-suivi").innerHTML = jours.map((j) => `<div class="suivi-ligne"><span>${esc(j.date.slice(8))}/${esc(j.date.slice(5, 7))}</span>${barre((j.tokens / max) * 100)}<b>${esc(formaterNombre(j.tokens))}</b></div>`).join("");
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
  if (estDirection()) {
    rendreDepenses();
    rendreAlertes();
  }
  appliquerLargeurs();
}

function vue() {
  let v = VUES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "apercu";
  if (!estDirection() && VUES_DIRECTION.includes(v)) v = "apercu";
  for (const x of VUES) {
    $("vue-" + x).hidden = x !== v || (VUES_DIRECTION.includes(x) && !estDirection());
    const lien = document.querySelector(`[data-nav="${x}"]`);
    if (x === v) lien.setAttribute("aria-current", "page");
    else lien.removeAttribute("aria-current");
  }
}

// ---------- saisie ----------

$("f-depense").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const v = (n) => f.elements.namedItem(n).value;
  const montant = Number(v("montant"));
  if (!dateValide(v("date"))) return message("Date invalide.", false);
  if (!v("libelle").trim() || !Number.isFinite(montant) || montant < 0) return message("Libellé ou montant invalide.", false);
  const ok = await ecrire("POST", "/depenses", {
    lignes: [{ date: v("date"), type: v("type"), libelle: v("libelle").trim(), montant, source: v("source") }],
  }, "Dépense enregistrée.");
  if (ok) { f.elements.namedItem("libelle").value = ""; f.elements.namedItem("montant").value = ""; }
});

function surNature() {
  const f = $("f-usage");
  const abo = f.elements.namedItem("nature").value === "abonnement";
  const cout = f.elements.namedItem("cout");
  cout.disabled = abo;
  if (abo) cout.value = "";
  $("label-valeur").textContent = abo ? "Quota consommé (unités)" : "Tokens";
}
$("f-usage").elements.namedItem("nature").addEventListener("change", surNature);

$("f-usage").addEventListener("submit", async (e) => {
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
  const ok = await ecrire("POST", "/usages", {
    lignes: [{ date: v("date"), utilisateur: v("utilisateur").trim(), projet: v("projet").trim(), nature, valeur: Math.round(valeur), cout, source: v("source") }],
  }, "Usage enregistré.");
  if (ok) { f.elements.namedItem("valeur").value = ""; f.elements.namedItem("cout").value = ""; }
});

$("f-config").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const num = (n) => {
    const t = f.elements.namedItem(n).value.trim();
    if (t === "") return null;
    const x = Number(t);
    return Number.isFinite(x) ? x : null;
  };
  const corps = {
    budgetMensuel: num("budgetMensuel") ?? 0,
    devise: f.elements.namedItem("devise").value.trim() || "USD",
    seuilAlerte: num("seuilAlerte"),
    seuilCritique: num("seuilCritique"),
    ratioAnormal: num("ratioAnormal"),
    limiteUtilisateurTokens: num("limiteUtilisateurTokens"),
    limiteProjetTokens: num("limiteProjetTokens"),
  };
  if (await ecrire("PUT", "/config", corps, "Seuils enregistrés.")) remplirConfig();
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

$("b-usage-import").addEventListener("click", async () => {
  const texte = $("usage-csv").value;
  if (!texte.trim()) return message("Choisissez ou collez un CSV d'usage.", false);
  const { ajouts, erreurs } = importerUsages(texte);
  rapport("usage-rapport", erreurs);
  if (!ajouts.length) return message("Aucune ligne valide à importer.", false);
  // Ligne envoyée telle quelle : le serveur refuse un collaborateur qui importe pour un autre.
  const lignes = ajouts.map(({ id, ...l }) => l);
  const ok = await ecrire("POST", "/usages", { lignes }, `${lignes.length} usage(s) importé(s).${erreurs.length ? ` ${erreurs.length} ligne(s) ignorée(s).` : ""}`);
  if (ok) $("usage-csv").value = "";
});

$("b-dep-import").addEventListener("click", async () => {
  const texte = $("dep-csv").value;
  if (!texte.trim()) return message("Choisissez ou collez un CSV de dépenses.", false);
  const { ajouts, erreurs } = importerDepenses(texte);
  rapport("dep-rapport", erreurs);
  if (!ajouts.length) return message("Aucune ligne valide à importer.", false);
  const lignes = ajouts.map(({ id, ...l }) => l);
  const ok = await ecrire("POST", "/depenses", { lignes }, `${lignes.length} dépense(s) importée(s).${erreurs.length ? ` ${erreurs.length} ligne(s) ignorée(s).` : ""}`);
  if (ok) $("dep-csv").value = "";
});

// ---------- suppressions, mois, navigation ----------

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-suppr]");
  if (!b) return;
  if (!confirm("Supprimer cette ligne ?")) return;
  const collection = b.dataset.suppr;
  await ecrire("DELETE", `/${collection}/${b.dataset.id}`, undefined, "Ligne supprimée.");
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
surNature();
vue();
if (await charger()) remplirConfig();
