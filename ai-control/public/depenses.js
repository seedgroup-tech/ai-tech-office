// AI CONTROL (M-013) : page partagée. Les données viennent de l'API (/api), jamais du navigateur.
// Les droits sont appliqués par le serveur ; ce script ne fait que masquer ce qui ne sert pas au rôle.
import {
  etatInitial, moisCourant, resumeMois, alertes, agreger, creditsParProjet, listerConversations, bilanReel, tauxReel, conseilsParProjet, formaterCompact, usagesSemaine, depensesDuMois, usagesDuMois,
  depensesParMois, importerDepenses, importerUsages, formaterMontant, formaterNombre,
  dateValide, parJour, projeterMois, SOURCES, TYPES, NATURES,
} from "./logique.mjs";

const VUES = ["apercu", "projets", "conversations", "depenses", "alertes", "utilisateurs"];
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
    cartes.push(kpi("Projets actifs", aApi ? formaterNombre(r.projetsActifs) : "—", aApi ? "avec un usage mesuré ce mois" : "mesure par période depuis le 18 nov. 2026"));
    cartes.push(kpi("Tokens API (hors relectures)", aApi ? formaterCompact(r.tokens) : "—", aApi ? `${formaterNombre(r.tokens)} tokens` : "mesure par période depuis le 18 nov. 2026"));
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
  const al = alertes(etat, mois, aujourdhui()).filter((a) => dir || a.categorie === "Budget");
  $("alertes-resume").innerHTML = al.length ? al.slice(0, 5).map(alerteHtml).join("") : `<p class="aide">Aucune alerte ce mois.</p>`;

  if (dir) {
    $("graph-mois").innerHTML = svgMois(depensesParMois(etat, mois, 6), c.devise);
    const projets = creditsParProjet(etat.usages.filter((u) => u.nature === "api"), "tokens", tauxReel(etat)).projets.slice(0, 8);
    const max = Math.max(1, ...projets.map((p) => p.tokens));
    $("graph-projets-apercu").innerHTML = projets.length
      ? projets.map((p) => `<div class="ligne-barre"><span>${esc(p.nom)}</span>${barre((p.tokens / max) * 100)}<b>${esc(formaterMontant(p.reel, c.devise))} · ${esc(p.part.toFixed(1).replace(".", ","))} %</b></div>`).join("")
      : `<p class="aide">Aucun usage API enregistré.</p>`;
    rendreBilan(c);
    rendreBonnesPratiques(c);
  } else {
    rendreMonSuivi();
  }
}

function rendreBilan(c) {
  const b = bilanReel(etat, mois);
  if (!b.tokensTotal || !b.depenseTotale) { $("bilan").innerHTML = `<p class="aide">Il faut des dépenses et des usages API pour calculer le coût réel du token.</p>`; return; }
  const parMillion = `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: b.parMillion < 1 ? 4 : 2 }).format(b.parMillion)} ${c.devise}`;
  $("bilan").innerHTML = `<div class="kpi">${[
    kpi(`Dépensé depuis le ${b.depuis}`, formaterMontant(b.depenseTotale, c.devise), "toutes les dépenses enregistrées"),
    kpi("Tokens consommés (hors relectures)", formaterCompact(b.tokensTotal), `${formaterNombre(b.tokensTotal)} tokens`),
    kpi("Coût réel par million de tokens", parMillion, "dépenses ÷ tokens"),
    kpi("Ce mois-ci", formaterMontant(b.depenseMois, c.devise), b.tokensMois > 0 ? `${formaterCompact(b.tokensMois)} de tokens mesurés, soit environ ${formaterMontant(b.reelMois, c.devise)}` : "consommation mesurée à partir du 18 nov. 2026"),
  ].join("")}</div>
    <p class="aide">Méthode : coût réel moyen du token = dépenses réelles ÷ tokens hors relectures de cache. La dépense d'un projet est ses tokens × ce coût. C'est une approximation : tous les tokens sont comptés au même prix, quel que soit le modèle.</p>`;
}

const CONSEILS_GENERAUX = [
  "Une conversation par tâche : quand une étape est terminée, résumez l'état dans un fichier (CLAUDE.md ou notes) et repartez d'une conversation neuve.",
  "Dans une conversation longue, compactez (/compact) ou videz (/clear) régulièrement : chaque message renvoie tout l'historique.",
  "Réservez le modèle le plus puissant aux tâches difficiles ; un modèle plus léger suffit pour les corrections et les tâches répétitives.",
  "Regroupez vos demandes en un seul message plutôt que de multiplier les petites demandes.",
  "Donnez un titre clair à chaque conversation et rattachez-la à son projet : c'est ce qui permet de voir ici ce qui coûte.",
];

function rendreBonnesPratiques(c) {
  const projets = conseilsParProjet(etat.usages, c.devise, 8, tauxReel(etat));
  $("bonnes-pratiques").innerHTML = `<ul class="conseils">${CONSEILS_GENERAUX.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
    + (projets.length
      ? projets.map((p) => `<div class="bp"><h3>${esc(p.projet)} <small>${esc(formaterMontant(p.reel, c.devise))} · ${esc(p.part.toFixed(1).replace(".", ","))} % · ${p.sessions} conversation(s)</small></h3><ul class="conseils">${p.conseils.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")
      : `<p class="aide">Aucune conversation enregistrée.</p>`);
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
        <td data-label="Dépense réelle estimée">${u.tokens ? esc(montantReel(u.tokens * tauxAffiche(), c)) : "—"}</td>
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
        <td data-label="Dépense réelle estimée">${u.nature === "api" ? esc(montantReel(u.valeur * tauxAffiche(), c)) : "—"}</td>
        <td data-label="Source">${badge(u.source)}</td>
        <td><button type="button" class="non petit" data-suppr="usages" data-id="${esc(u.id)}">Supprimer</button></td></tr>`).join("")
    : vide(8, "Aucun usage saisi ce mois.");

  $("dl-users").innerHTML = [...new Set(etat.usages.map((u) => u.utilisateur))].sort().map((v) => `<option value="${esc(v)}">`).join("");
}

const METRIQUES = {
  reel: { titre: "Dépense réelle estimée par projet", valeur: (p, devise) => formaterMontant(p.reel, devise), mesure: (p) => p.tokens },
  sessions: { titre: "Sessions par projet", valeur: (p) => String(p.sessions), mesure: (p) => p.sessions },
};

// Usages API de la période choisie ("tout", le mois sélectionné ou les 7 derniers jours).
const usagesApi = (periode) => (periode === "semaine" ? usagesSemaine(etat.usages, aujourdhui()) : periode === "mois" ? usagesDuMois(etat, mois) : etat.usages).filter((u) => u.nature === "api");

// Le collaborateur ne voit que ses propres tokens : le coût réel du token se calcule sur l'ensemble, il n'est donc pas affiché.
const tauxAffiche = () => (estDirection() ? tauxReel(etat) : 0);
const montantReel = (v, c) => (estDirection() ? formaterMontant(v, c.devise) : "—");

function messageVide(periode) {
  return periode === "tout"
    ? "Aucun usage API enregistré."
    : `Aucune consommation mesurée sur cette période : le suivi par période a démarré le 18 novembre 2026 (un relevé chaque lundi). <button type="button" class="petit" data-voir-tout>Voir toutes périodes</button>`;
}

function rendreProjets() {
  const c = etat.config;
  const periode = $("p-periode").value;
  const tri = $("p-tri").value;
  const m = METRIQUES[tri] || METRIQUES.reel;
  const taux = tauxAffiche();
  const r = creditsParProjet(usagesApi(periode), tri, taux);
  $("kpi-projets").innerHTML = [
    kpi("Dépense réelle estimée", montantReel(r.reel, c), `${r.projets.length} projets`),
    kpi("Tokens (hors relectures)", formaterCompact(r.tokens), `${formaterNombre(r.tokens)} tokens`),
    kpi("Sessions", String(r.sessions), "conversations avec usage"),
  ].join("");
  $("titre-graph-projets").textContent = m.titre;
  const max = Math.max(1, ...r.projets.map(m.mesure));
  $("graph-projets").innerHTML = r.projets.length
    ? r.projets.map((p) => `<div class="ligne-barre"><span>${esc(p.nom)}</span>${barre((m.mesure(p) / max) * 100)}<b>${esc(tri === "sessions" ? m.valeur(p) : montantReel(p.reel, c))}</b></div>`).join("")
    : `<p class="aide">${messageVide(periode)}</p>`;
  $("t-projets").innerHTML = r.projets.length
    ? r.projets.map((p) => `<tr>
        <td data-label="Projet">${esc(p.nom)}</td>
        <td data-label="Dépense réelle estimée">${esc(montantReel(p.reel, c))}</td>
        <td data-label="Part">${esc(p.part.toFixed(1))} %</td>
        <td data-label="Tokens (hors relectures)">${esc(formaterNombre(p.tokens))}</td>
        <td data-label="Sessions">${p.sessions}</td>
        <td data-label="Dernière activité">${esc(p.derniere)}</td></tr>`).join("")
    : `<tr><td colspan="6" class="vide">${messageVide(periode)}</td></tr>`;
  $("dl-projets").innerHTML = [...new Set(etat.usages.map((u) => u.projet))].sort().map((v) => `<option value="${esc(v)}">`).join("");
}

const NB_CONVERSATIONS = 300;

function rendreConversations() {
  const c = etat.config;
  const periode = $("c-periode").value;
  const select = $("c-projet");
  const projets = [...new Set(etat.usages.filter((u) => u.nature === "api").map((u) => u.projet))].sort((a, b) => a.localeCompare(b, "fr"));
  const choisi = projets.includes(select.value) ? select.value : "";
  select.innerHTML = `<option value="">Tous les projets</option>` + projets.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  select.value = choisi;
  const nombre = (id) => { const n = Number($(id).value); return Number.isFinite(n) && n > 0 ? n : 0; };
  const taux = tauxAffiche();
  const liste = listerConversations(usagesApi(periode), {
    projet: choisi, tokensMin: nombre("c-tokens"), reelMin: taux > 0 ? nombre("c-cout") : 0, taux, tri: $("c-tri").value,
  });
  const total = liste.reduce((s, x) => s + x.reel, 0);
  const jetons = liste.reduce((s, x) => s + x.tokens, 0);
  $("conv-compte").textContent = `${liste.length} conversation(s) · ${estDirection() ? formaterMontant(total, c.devise) + " · " : ""}${formaterNombre(jetons)} tokens`
    + (liste.length > NB_CONVERSATIONS ? ` · les ${NB_CONVERSATIONS} premières sont affichées` : "");
  $("t-conversations").innerHTML = liste.length
    ? liste.slice(0, NB_CONVERSATIONS).map((x) => `<tr>
        <td data-label="Conversation">${esc(x.conversation)}</td>
        <td data-label="Projet">${esc(x.projet)}</td>
        <td data-label="Tokens (hors relectures)">${esc(formaterNombre(x.tokens))}</td>
        <td data-label="Dépense réelle estimée">${esc(montantReel(x.reel, c))}</td>
        <td data-label="Dernière activité">${esc(x.date)}${x.cumul ? " · total cumulé" : ""}</td></tr>`).join("")
    : `<tr><td colspan="5" class="vide">${periode === "tout" ? "Aucune conversation ne correspond à ces filtres." : messageVide(periode)}</td></tr>`;
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
  const al = alertes(etat, mois, aujourdhui());
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
  val("limiteProjetTokensSemaine", c.limiteProjetTokensSemaine);
}

function rendre() {
  rendreApercu();
  rendreUtilisateurs();
  rendreProjets();
  rendreConversations();
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
    limiteProjetTokensSemaine: num("limiteProjetTokensSemaine"),
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

for (const id of ["p-periode", "p-tri"]) $(id).addEventListener("change", rendreProjets);
for (const id of ["c-projet", "c-periode", "c-tri", "c-tokens", "c-cout"]) {
  $(id).addEventListener(id === "c-tokens" || id === "c-cout" ? "input" : "change", () => { rendreConversations(); appliquerLargeurs(); });
}
for (const id of ["p-periode", "p-tri"]) $(id).addEventListener("change", appliquerLargeurs);
document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element) || !e.target.closest("[data-voir-tout]")) return;
  $("p-periode").value = "tout";
  $("c-periode").value = "tout";
  rendreProjets();
  rendreConversations();
  appliquerLargeurs();
});
addEventListener("hashchange", vue);

// ---------- démarrage ----------

$("mois").value = mois;
$("f-depense").elements.namedItem("date").value = aujourdhui();
$("f-usage").elements.namedItem("date").value = aujourdhui();
surNature();
vue();
if (await charger()) remplirConfig();
