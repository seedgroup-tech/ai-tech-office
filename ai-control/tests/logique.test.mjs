import { test } from "node:test";
import assert from "node:assert/strict";
import {
  etatInitial, normaliser, lireEtat, lireCsv, parseNombre, parseDate,
  importerDepenses, importerUsages, resumeMois, alertes, agreger, moisPrecedents, parJour, projeterMois,
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
