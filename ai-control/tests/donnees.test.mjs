import { test } from "node:test";
import assert from "node:assert/strict";
import { traiter, preparerDepense, preparerUsage, preparerConfig } from "../lib/donnees.mjs";
import { roleDe } from "../lib/roles.mjs";
import { fausseBase } from "./outils.mjs";

const DIR = "direction@example.com";
const ANA = "ana@example.com";
const BEN = "ben@example.com";
const ENV = { DIRECTION: DIR, COLLABORATEURS: `${ANA}, ${BEN}` };
const appel = (db, role, email, method, chemin, corps) => traiter({ method, chemin, corps, email, role, db });
const dir = (db, m, c, b) => appel(db, "direction", DIR, m, c, b);
const ana = (db, m, c, b) => appel(db, "collaborateur", ANA, m, c, b);
const ben = (db, m, c, b) => appel(db, "collaborateur", BEN, m, c, b);
const depense = { date: "2026-11-02", type: "abonnement", libelle: "Team", montant: 85000, source: "reel" };
const usage = { date: "2026-11-03", projet: "SeedStore", nature: "api", valeur: 1200, cout: 2.5, source: "importe" };

test("qui est qui : deux listes, casse ignorée, inconnu refusé, double appartenance = Direction", () => {
  assert.equal(roleDe("Direction@Example.com", ENV), "direction");
  assert.equal(roleDe(ANA, ENV), "collaborateur");
  assert.equal(roleDe("intrus@example.com", ENV), null);
  assert.equal(roleDe(ANA, { DIRECTION: ANA, COLLABORATEURS: ANA }), "direction");
  assert.equal(roleDe("", ENV), null);
});

test("validation : rejets explicites, pas de coût sur quota", () => {
  assert.equal(preparerDepense({ ...depense, montant: -1 }), null);
  assert.equal(preparerDepense({ ...depense, libelle: "   " }), null);
  const quota = { ...usage, nature: "abonnement", cout: null };
  assert.equal(preparerUsage(quota, ANA, "collaborateur").cout, null);
  assert.equal(preparerUsage({ ...usage, nature: "abonnement", cout: 5 }, ANA, "collaborateur"), null);
  assert.equal(preparerConfig({ seuilAlerte: 0 }), null);
});

test("collaborateur : l'auteur de l'usage est forcé à son adresse", () => {
  assert.equal(preparerUsage({ ...usage, utilisateur: BEN }, ANA, "collaborateur").utilisateur, ANA);
  assert.equal(preparerUsage({ ...usage, utilisateur: BEN }, DIR, "direction").utilisateur, BEN);
});

test("Direction : écrit, lit tout, modifie les seuils", async () => {
  const db = fausseBase();
  assert.equal((await dir(db, "POST", "/depenses", { lignes: [depense] })).statut, 201);
  assert.equal((await dir(db, "POST", "/usages", { lignes: [{ ...usage, utilisateur: ANA }, { ...usage, utilisateur: BEN }] })).statut, 201);
  const d = await dir(db, "GET", "/donnees");
  assert.equal(d.corps.role, "direction");
  assert.equal(d.corps.usages.length, 2);
  assert.equal(d.corps.depenses.length, 1);
  assert.equal((await dir(db, "PUT", "/config", { budgetMensuel: 100000, devise: "USD", seuilAlerte: 80, seuilCritique: 100, ratioAnormal: 2, limiteUtilisateurTokens: 5000, limiteProjetTokens: null })).statut, 200);
  assert.equal((await dir(db, "GET", "/donnees")).corps.config.limiteUtilisateurTokens, 5000);
});

test("collaborateur : ne lit que ses usages, ni limites ni auteurs des dépenses", async () => {
  const db = fausseBase();
  await dir(db, "POST", "/depenses", { lignes: [depense] });
  await dir(db, "POST", "/usages", { lignes: [{ ...usage, utilisateur: BEN }] });
  await ana(db, "POST", "/usages", { lignes: [{ ...usage, projet: "KLOQIn" }] });
  await dir(db, "PUT", "/config", { budgetMensuel: 100000, devise: "USD", seuilAlerte: 80, seuilCritique: 100, ratioAnormal: 2, limiteUtilisateurTokens: 5000, limiteProjetTokens: 9000 });
  const r = (await ana(db, "GET", "/donnees")).corps;
  assert.equal(r.role, "collaborateur");
  assert.equal(r.usages.length, 1);
  assert.equal(r.usages[0].utilisateur, ANA);
  assert.equal(r.depenses.length, 1);
  assert.equal("cree_par" in r.depenses[0], false);
  assert.equal("limiteUtilisateurTokens" in r.config, false);
  assert.equal(r.config.budgetMensuel, 100000);
});

test("collaborateur : aucune écriture de Direction, pas de saisie pour un autre", async () => {
  const db = fausseBase();
  assert.equal((await ana(db, "POST", "/depenses", { lignes: [depense] })).statut, 403);
  assert.equal((await ana(db, "PUT", "/config", { budgetMensuel: 1, seuilAlerte: 80, seuilCritique: 100, ratioAnormal: 2 })).statut, 403);
  const refus = await ana(db, "POST", "/usages", { lignes: [{ ...usage, utilisateur: BEN }] });
  assert.equal(refus.statut, 403);
  assert.equal(db.compter("usages"), 0);
  assert.equal(db.compter("depenses"), 0);
});

test("collaborateur : supprime ses usages, jamais ceux d'un collègue", async () => {
  const db = fausseBase();
  await dir(db, "POST", "/usages", { lignes: [{ ...usage, utilisateur: BEN }] });
  await ana(db, "POST", "/usages", { lignes: [usage] });
  const { usages } = (await dir(db, "GET", "/donnees")).corps;
  const deBen = usages.find((u) => u.utilisateur === BEN).id;
  const deAna = usages.find((u) => u.utilisateur === ANA).id;
  assert.equal((await ana(db, "DELETE", `/usages/${deBen}`)).statut, 404);
  assert.equal(db.compter("usages"), 2);
  assert.equal((await ana(db, "DELETE", `/usages/${deAna}`)).statut, 200);
  assert.equal(db.compter("usages"), 1);
  assert.equal((await ana(db, "DELETE", `/depenses/${deAna}`)).statut, 403);
});

test("lot invalide : rien n'est enregistré", async () => {
  const db = fausseBase();
  const r = await dir(db, "POST", "/depenses", { lignes: [depense, { ...depense, montant: -5 }] });
  assert.equal(r.statut, 400);
  assert.equal(db.compter("depenses"), 0);
  assert.equal((await dir(db, "POST", "/depenses", { lignes: [] })).statut, 400);
  assert.equal((await dir(db, "POST", "/depenses", { lignes: new Array(501).fill(depense) })).statut, 400);
});

test("configuration invalide refusée par la Direction", async () => {
  const db = fausseBase();
  assert.equal((await dir(db, "PUT", "/config", { budgetMensuel: -1, seuilAlerte: 80, seuilCritique: 100, ratioAnormal: 2 })).statut, 400);
  assert.equal((await dir(db, "PUT", "/config", { budgetMensuel: 1, seuilAlerte: 0, seuilCritique: 100, ratioAnormal: 2 })).statut, 400);
});

test("routes inconnues et identifiants mal formés : 404", async () => {
  const db = fausseBase();
  assert.equal((await dir(db, "GET", "/autre")).statut, 404);
  assert.equal((await dir(db, "DELETE", "/usages/pas-un-id")).statut, 404);
});

test("usage : le titre de conversation est facultatif, nettoyé et borné à 120 caractères", () => {
  const base = { date: "2026-11-01", utilisateur: "equipe", projet: "P", nature: "api", valeur: 10, cout: 1, source: "estime" };
  assert.equal(preparerUsage(base, DIR, "direction").conversation, null);
  assert.equal(preparerUsage({ ...base, conversation: "  Ma session  " }, DIR, "direction").conversation, "Ma session");
  assert.equal(preparerUsage({ ...base, conversation: "x".repeat(300) }, DIR, "direction").conversation.length, 120);
  assert.equal(preparerUsage({ ...base, conversation: 42 }, DIR, "direction").conversation, null);
});
