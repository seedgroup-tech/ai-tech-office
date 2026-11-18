import { test } from "node:test";
import assert from "node:assert/strict";
import {
  etatInitial, normaliser, lireEtat, lireCsv, parseNombre, parseDate,
  importerDepenses, importerUsages, resumeMois, alertes, agreger, creditsParProjet, listerConversations, bilanReel, tauxReel, conseilsParProjet, formaterCompact, formaterNombre, usagesSemaine, usagesPlage, moinsJours, sessionsAgregees, moisPrecedents, parJour, projeterMois,
} from "../public/logique.mjs";

function etatAvec({ budget = 0, depenses = [], usages = [], config = {} } = {}) {
  const e = etatInitial();
  e.config = { ...e.config, budgetMensuel: budget, ...config };
  e.depenses = depenses;
  e.usages = usages;
  return e;
}
const dep = (date, montant, source = "reel", type = "abonnement") => ({ id: date + montant, date, type, libelle: "x", montant, source });
const use = (date, utilisateur, valeur, { projet = "P1", nature = "api", cout = null, source = "importe" } = {}) =>
  ({ id: date + utilisateur + valeur + projet, date, utilisateur, projet, nature, valeur, cout, source });

test("lecture CSV : guillemets, séparateur point-virgule et CRLF", () => {
  const r = lireCsv('Date;Libellé;Montant\r\n2026-11-01;"Abonnement; Team";12 500\r\n');
  assert.deepEqual(r.entetes, ["date", "libelle", "montant"]);
  assert.equal(r.lignes[0].libelle, "Abonnement; Team");
  assert.equal(r.lignes[0].montant, "12 500");
});

test("nombres et dates au format français et ISO", () => {
  assert.equal(parseNombre("12 500"), 12500);
  assert.equal(parseNombre("12,5"), 12.5);
  assert.equal(parseNombre("1,234.56"), 1234.56);
  assert.equal(parseNombre(""), null);
  assert.equal(parseNombre("abc"), null);
  assert.equal(parseDate("03/11/2026"), "2026-11-03");
  assert.equal(parseDate("2026-02-30"), null);
});

test("import de dépenses : lignes valides et erreurs explicites", () => {
  const r = importerDepenses("date,type,libelle,montant,source\n2026-11-01,abonnement,Team,20000,reel\n2026-11-02,type-bizarre,X,5,\n2026-11-03,achat,Crédits,abc,\n");
  assert.equal(r.ajouts.length, 1);
  assert.equal(r.ajouts[0].source, "reel");
  assert.equal(r.erreurs.length, 2);
  assert.match(r.erreurs[0], /Ligne 3/);
  assert.match(r.erreurs[1], /Ligne 4/);
});

test("import de dépenses : colonnes obligatoires manquantes", () => {
  const r = importerDepenses("date,libelle\n2026-11-01,X\n");
  assert.equal(r.ajouts.length, 0);
  assert.match(r.erreurs[0], /type, montant/);
});

test("import d'usage : un quota d'abonnement ne peut pas porter de coût", () => {
  const r = importerUsages("date,utilisateur,projet,nature,valeur,cout\n2026-11-01,Ana,P1,abonnement,40,5000\n2026-11-01,Ana,P1,api,12000,3.5\n");
  assert.equal(r.ajouts.length, 1);
  assert.equal(r.ajouts[0].nature, "api");
  assert.equal(r.ajouts[0].cout, 3.5);
  assert.match(r.erreurs[0], /quota d'abonnement/);
});

test("résumé : les dépenses et les coûts API restent séparés", () => {
  const e = etatAvec({
    budget: 100000,
    depenses: [dep("2026-11-01", 20000, "reel"), dep("2026-11-05", 5000, "manuel"), dep("2026-10-30", 999, "reel")],
    usages: [use("2026-11-02", "Ana", 1000, { cout: 2 }), use("2026-11-03", "Ben", 500), use("2026-11-04", "Ana", 40, { nature: "abonnement" })],
  });
  const r = resumeMois(e, "2026-11");
  assert.equal(r.depense, 25000);
  assert.equal(r.restant, 75000);
  assert.equal(r.pourcentage, 25);
  assert.equal(r.utilisateursActifs, 2);
  assert.equal(r.tokens, 1500);
  assert.equal(r.coutApi, 2);
  assert.deepEqual(r.provenance, { reel: 1, importe: 3, manuel: 1, estime: 0 });
});

test("aucun coût API n'est inventé quand il est absent", () => {
  const e = etatAvec({ usages: [use("2026-11-02", "Ana", 1000)] });
  assert.equal(resumeMois(e, "2026-11").coutApi, null);
  assert.equal(resumeMois(e, "2026-11").pourcentage, null);
});

test("alertes budget : attention puis critique", () => {
  const base = { budget: 1000 };
  const attention = alertes(etatAvec({ ...base, depenses: [dep("2026-11-01", 850)] }), "2026-11");
  assert.equal(attention[0].niveau, "attention");
  const critique = alertes(etatAvec({ ...base, depenses: [dep("2026-11-01", 1200)] }), "2026-11");
  assert.equal(critique[0].niveau, "critique");
  assert.equal(alertes(etatAvec({ ...base, depenses: [dep("2026-11-01", 100)] }), "2026-11").length, 0);
});

test("alertes limites et usage anormal (médiane sur au moins 3 utilisateurs)", () => {
  const usages = [
    use("2026-11-01", "Ana", 1000), use("2026-11-01", "Ben", 1000), use("2026-11-01", "Cé", 1000),
    use("2026-11-01", "Dan", 5000),
  ];
  const e = etatAvec({ usages, config: { limiteUtilisateurTokens: 4000 } });
  const a = alertes(e, "2026-11");
  assert.ok(a.some((x) => x.categorie === "Limite" && /Dan/.test(x.message)));
  assert.ok(a.some((x) => x.categorie === "Usage" && /Dan/.test(x.message)));
  const deux = alertes(etatAvec({ usages: usages.slice(0, 1).concat([use("2026-11-01", "Dan", 9000)]) }), "2026-11");
  assert.ok(!deux.some((x) => x.categorie === "Usage"));
});

test("agrégation par utilisateur : tokens API et quota séparés", () => {
  const r = agreger([use("2026-11-01", "Ana", 100), use("2026-11-02", "Ana", 40, { nature: "abonnement" })], "utilisateur");
  assert.equal(r[0].tokens, 100);
  assert.equal(r[0].quota, 40);
  assert.equal(r[0].cout, null);
});

test("normalisation : les entrées invalides sont écartées", () => {
  const e = normaliser({ depenses: [dep("2026-11-01", 5), { date: "pas-une-date", montant: 3, type: "achat", source: "reel", libelle: "x" }], usages: "n'importe quoi" });
  assert.equal(e.depenses.length, 1);
  assert.equal(e.usages.length, 0);
  assert.equal(lireEtat("{ pas du json").depenses.length, 0);
});

test("mois précédents pour le graphique", () => {
  assert.deepEqual(moisPrecedents("2026-02", 3), ["2025-12", "2026-01", "2026-02"]);
});

test("consommation quotidienne : 7 jours, tokens API seulement", () => {
  const usages = [use("2026-11-17", "Ana", 300), use("2026-11-18", "Ana", 50), use("2026-11-18", "Ana", 10, { nature: "abonnement" })];
  const j = parJour(usages, "2026-11-18", 7);
  assert.equal(j.length, 7);
  assert.equal(j[0].date, "2026-11-12");
  assert.equal(j[5].tokens, 300);
  assert.equal(j[6].tokens, 50);
});

test("projection de fin de mois : seulement pour le mois en cours", () => {
  assert.equal(projeterMois(10000, "2026-11", "2026-11-10"), 30000);
  assert.equal(projeterMois(10000, "2026-10", "2026-11-10"), null);
  assert.equal(projeterMois(0, "2026-11", "2026-11-01"), 0);
});

test("projets : tokens, sessions, part et dépense réelle estimée (tokens × coût réel du token)", () => {
  const r = creditsParProjet([
    use("2026-10-01", "equipe", 1000, { projet: "A", cout: 30 }),
    use("2026-11-05", "equipe", 500, { projet: "A", cout: 10 }),
    use("2026-11-06", "equipe", 2500, { projet: "B", cout: 60 }),
    use("2026-11-06", "equipe", 99, { projet: "B", nature: "abonnement" }),
  ], "tokens", 0.01);
  assert.equal(r.tokens, 4000);
  assert.equal(r.sessions, 3);
  assert.equal(r.reel, 40);
  assert.deepEqual(r.projets.map((p) => p.nom), ["B", "A"]);
  assert.equal(r.projets[0].part, 62.5);
  assert.equal(r.projets[0].reel, 25);
  assert.equal(r.projets[1].sessions, 2);
  assert.equal(r.projets[1].derniere, "2026-11-05");
});
test("projets : sans usage, total nul et aucune division par zéro", () => {
  const r = creditsParProjet([]);
  assert.equal(r.tokens, 0);
  assert.equal(r.reel, 0);
  assert.deepEqual(r.projets, []);
});
test("projets : classement par tokens (dépense réelle), par sessions ou par valeur catalogue", () => {
  const u = [
    use("2026-11-01", "e", 5000, { projet: "A", cout: 10 }),
    use("2026-11-02", "e", 100, { projet: "B", cout: 50 }),
    use("2026-11-03", "e", 100, { projet: "B", cout: 1 }),
    use("2026-11-04", "e", 100, { projet: "B", cout: 1 }),
  ];
  assert.deepEqual(creditsParProjet(u, "tokens").projets.map((p) => p.nom), ["A", "B"]);
  assert.deepEqual(creditsParProjet(u, "reel").projets.map((p) => p.nom), ["A", "B"]);
  assert.deepEqual(creditsParProjet(u, "sessions").projets.map((p) => p.nom), ["B", "A"]);
  assert.deepEqual(creditsParProjet(u, "cout").projets.map((p) => p.nom), ["B", "A"]);
  assert.deepEqual(creditsParProjet(u, "n'importe quoi").projets.map((p) => p.nom), ["A", "B"]);
});
test("conversations : filtre par projet et par seuils, tri, titre manquant", () => {
  const u = [
    { ...use("2026-11-01", "e", 900, { projet: "A", cout: 5 }), conversation: "Alpha" },
    { ...use("2026-11-02", "e", 100, { projet: "A", cout: 50 }), conversation: "Beta" },
    { ...use("2026-11-03", "e", 400, { projet: "B", cout: 20 }) },
    use("2026-11-04", "e", 99999, { projet: "A", nature: "abonnement" }),
  ];
  const noms = (o) => listerConversations(u, o).map((x) => x.conversation);
  assert.deepEqual(noms(), ["Alpha", "(sans titre)", "Beta"]);
  assert.deepEqual(noms({ tri: "date" }), ["(sans titre)", "Beta", "Alpha"]);
  assert.deepEqual(noms({ projet: "A" }), ["Alpha", "Beta"]);
  assert.deepEqual(noms({ tokensMin: 400 }), ["Alpha", "(sans titre)"]);
  assert.deepEqual(noms({ reelMin: 5, taux: 0.01 }), ["Alpha"]);
  assert.equal(listerConversations(u, { taux: 0.01 })[0].reel, 9);
});
test("résumé du mois : nombre de projets actifs", () => {
  const e = etatAvec({ usages: [use("2026-11-02", "e", 10, { projet: "A" }), use("2026-11-03", "e", 10, { projet: "A" }), use("2026-11-04", "e", 10, { projet: "B" }), use("2026-10-04", "e", 10, { projet: "C" })] });
  assert.equal(resumeMois(e, "2026-11").projetsActifs, 2);
});

test("grands nombres lisibles", () => {
  assert.equal(formaterCompact(58777512396), "58,8 milliards");
  assert.equal(formaterCompact(1000000000), "1 milliard");
  assert.equal(formaterCompact(2500000), "2,5 millions");
  assert.equal(formaterCompact(1234), formaterNombre(1234));
});

test("coût réel du token : dépenses réelles ÷ tokens, puis dépense du mois et consommation mesurée", () => {
  const e = etatAvec({
    depenses: [dep("2026-10-05", 100), dep("2026-11-05", 300)],
    usages: [
      { ...use("2026-11-02", "e", 1000000, { cout: 999 }), cumul: 1 },
      use("2026-11-10", "e", 1000000, { cout: 5 }),
      use("2026-11-11", "e", 2000000, { cout: 5, nature: "abonnement" }),
    ],
  });
  assert.equal(tauxReel(e), 0.0002);
  const b = bilanReel(e, "2026-11");
  assert.equal(b.depenseTotale, 400);
  assert.equal(b.tokensTotal, 2000000);
  assert.equal(b.parMillion, 200);
  assert.equal(b.depuis, "2026-10-05");
  assert.equal(b.depenseMois, 300);
  assert.equal(b.tokensMois, 1000000);
  assert.equal(b.reelMois, 200);
  assert.equal(tauxReel(etatAvec()), 0);
});

test("mois : l'historique « cumul » n'est jamais rattaché à un mois", () => {
  const e = etatAvec({ usages: [{ ...use("2026-11-18", "e", 100), cumul: 1 }, use("2026-11-18", "e", 7)] });
  assert.equal(resumeMois(e, "2026-11").tokens, 7);
  assert.equal(resumeMois(e, "2026-11").projetsActifs, 1);
});
test("alertes : concentration sur un projet (tokens), pas d'alerte catalogue, budget non défini", () => {
  const e = etatAvec({
    depenses: [dep("2026-11-05", 100)],
    usages: [
      { ...use("2026-11-02", "e", 900, { projet: "Gros", cout: 900 }), conversation: "Session géante" },
      use("2026-11-03", "e", 50, { projet: "Petit", cout: 5000 }),
    ],
  });
  const al = alertes(e, "2026-11");
  assert.deepEqual(al.map((a) => a.categorie), ["Projet", "Configuration"]);
  assert.match(al[0].message, /Gros concentre 95 %/);
  assert.match(al[0].message, /94,74/);
  assert.match(al[0].message, /Session géante/);
  assert.equal(alertes(etatAvec({ budget: 1000, depenses: [dep("2026-11-05", 10)] }), "2026-11").length, 0);
});
test("bonnes pratiques par projet : conversation dominante, poids du projet, titres sans nom", () => {
  const u = [
    { ...use("2026-10-01", "e", 50000000, { projet: "A", cout: 900 }), conversation: "Chat session" },
    { ...use("2026-10-02", "e", 500000, { projet: "A", cout: 10 }), conversation: "Petite" },
    { ...use("2026-10-03", "e", 100, { projet: "B", cout: 1 }), conversation: "Courte" },
  ];
  const r = conseilsParProjet(u, "USD", 8, 0.0000008);
  assert.deepEqual(r.map((p) => p.projet), ["A", "B"]);
  assert.equal(r[0].conseils.length, 3);
  assert.match(r[0].conseils[0], /Chat session/);
  assert.match(r[0].conseils[0], /environ 40 USD/);
  assert.match(r[0].conseils[1], /fixez-lui une limite/);
  assert.match(r[0].conseils[2], /titre parlant/);
  assert.deepEqual(r[1].conseils, ["Rien d'anormal : continuez avec une conversation par tâche."]);
  assert.deepEqual(conseilsParProjet([]), []);
});
test("jours : moins n jours, y compris à cheval sur un mois", () => {
  assert.equal(moinsJours("2026-11-18", 6), "2026-11-12");
  assert.equal(moinsJours("2026-03-02", 6), "2026-02-24");
});

test("7 derniers jours : exclut les lignes de total cumulé et les dates hors fenêtre", () => {
  const u = [
    { ...use("2026-11-18", "e", 100), cumul: 1 },
    use("2026-11-18", "e", 10),
    use("2026-11-12", "e", 20),
    use("2026-11-11", "e", 40),
    use("2026-11-19", "e", 80),
  ];
  assert.deepEqual(usagesSemaine(u, "2026-11-18").map((x) => x.valeur), [10, 20]);
});

test("sessions : plusieurs relevés d'une même session sont regroupés", () => {
  const u = [
    { ...use("2026-11-10", "e", 100, { projet: "P", cout: 5 }), session: "s1", conversation: "Titre", cumul: 1 },
    { ...use("2026-11-17", "e", 50, { projet: "P", cout: 3 }), session: "s1", conversation: "Titre" },
    use("2026-11-17", "e", 7, { projet: "P", cout: 1 }),
  ];
  const s = sessionsAgregees(u);
  assert.equal(s.length, 2);
  const s1 = s.find((x) => x.cle === "s1");
  assert.equal(s1.tokens, 150);
  assert.equal(s1.cout, 8);
  assert.equal(s1.date, "2026-11-17");
  assert.equal(s1.cumul, true);
  assert.equal(creditsParProjet(u).projets[0].sessions, 2);
  assert.equal(listerConversations(u).length, 2);
});

test("alerte hebdomadaire : un projet dépasse la limite sur les 7 derniers jours", () => {
  const e = etatAvec({
    budget: 1000,
    config: { limiteProjetTokensSemaine: 100 },
    usages: [
      { ...use("2026-11-18", "e", 9999, { projet: "Ancien" }), cumul: 1 },
      use("2026-11-17", "e", 150, { projet: "Gros" }),
      use("2026-11-16", "e", 60, { projet: "Petit" }),
      use("2026-11-01", "e", 500, { projet: "Vieux" }),
    ],
  });
  const al = alertes(e, "2026-11", "2026-11-18").filter((a) => a.categorie === "Limite");
  assert.equal(al.length, 1);
  assert.match(al[0].message, /Gros a consommé 150 tokens ces 7 derniers jours/);
  assert.equal(alertes(etatAvec({ budget: 1000, usages: [use("2026-11-17", "e", 150, { projet: "Gros" })] }), "2026-11", "2026-11-18").filter((a) => a.categorie === "Limite").length, 0);
});

test("plage de dates : bornes comprises, relevés uniquement", () => {
  const u = [
    { ...use("2026-11-18", "e", 1), cumul: 1 },
    use("2026-11-02", "e", 2),
    use("2026-11-09", "e", 4),
    use("2026-11-16", "e", 8),
  ];
  assert.deepEqual(usagesPlage(u, "2026-11-02", "2026-11-09").map((x) => x.valeur), [2, 4]);
  assert.deepEqual(usagesPlage(u, "2026-11-10", "").map((x) => x.valeur), [8]);
  assert.deepEqual(usagesPlage(u, "", "").map((x) => x.valeur), [2, 4, 8]);
});

test("projets actifs du mois : dernière activité dans le mois, historique compris", () => {
  const e = etatAvec({ usages: [{ ...use("2026-11-18", "e", 100, { projet: "A" }), cumul: 1 }, use("2026-11-03", "e", 7, { projet: "B" }), use("2026-10-30", "e", 7, { projet: "C" })] });
  assert.equal(resumeMois(e, "2026-11").projetsActifs, 2);
  assert.equal(resumeMois(e, "2026-11").tokens, 7);
});
