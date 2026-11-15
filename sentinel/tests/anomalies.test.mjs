import test from "node:test";
import assert from "node:assert/strict";
import { fusionner, appliquerAlertes, ajouterNote } from "../lib/anomalies.mjs";

const T0 = new Date("2026-11-15T10:00:00+01:00");
const apres = (min) => new Date(T0.getTime() + min * 60000);
const anomalieSite = { empreinte: "p1|site|https://p1.example.com", cible: "https://p1.example.com", titre: "P1 : site", detail: "d", niveau: "critique", lien: "https://p1.example.com" };
const siteKo = { projet: "p1", type: "site", ok: true, fermeture: true, anomalies: [anomalieSite] };
const siteOk = { projet: "p1", type: "site", ok: true, fermeture: true, anomalies: [] };
const inconnu = { projet: "p1", type: "site", ok: false, fermeture: false, anomalies: [] };

// Applique un passage sur l'état courant (alertes + observation).
function jouer(etat, resultats, date) {
  const f = fusionner({ alertes: etat.alertes, observation: etat.observation, resultats, maintenant: date });
  return { alertes: appliquerAlertes(etat.alertes, f), observation: f.observation, f };
}
const vide = { alertes: [], observation: {} };

test("1 échec de site : aucune alerte, anomalie en observation", () => {
  const r = jouer(vide, [siteKo], T0);
  assert.equal(r.alertes.length, 0);
  assert.equal(r.observation[anomalieSite.empreinte].echecs, 1);
});

test("2 échecs consécutifs de site : une alerte critique ouverte", () => {
  const r1 = jouer(vide, [siteKo], T0);
  const r2 = jouer(r1, [siteKo], apres(15));
  assert.equal(r2.alertes.length, 1);
  assert.equal(r2.alertes[0].niveau, "critique");
  assert.equal(r2.alertes[0].statut, "ouverte");
  assert.deepEqual({ ...r2.observation }, {});
});

test("échecs non consécutifs : pas d'alerte", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [siteOk], apres(15));
  r = jouer(r, [siteKo], apres(30));
  assert.equal(r.alertes.length, 0);
  assert.equal(r.observation[anomalieSite.empreinte].echecs, 1);
});

test("contrôle inconnu entre deux échecs : l'observation est conservée, sans compteur", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [inconnu], apres(15));
  assert.equal(r.observation[anomalieSite.empreinte].echecs, 1);
  r = jouer(r, [siteKo], apres(30));
  assert.equal(r.alertes.length, 1);
});

test("même anomalie sur plusieurs passages : une seule alerte, dernière observation rafraîchie au plus 1 fois par 24 h", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [siteKo], apres(15));
  const premiere = r.alertes[0].derniere_observation;
  r = jouer(r, [siteKo], apres(30));
  r = jouer(r, [siteKo], apres(600));
  assert.equal(r.alertes.length, 1);
  assert.equal(r.alertes[0].derniere_observation, premiere, "pas de mise à jour avant 24 h");
  r = jouer(r, [siteKo], apres(24 * 60 + 30));
  assert.equal(r.alertes.length, 1);
  assert.notEqual(r.alertes[0].derniere_observation, premiere);
});

test("fermeture automatique après 2 contrôles corrects consécutifs", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [siteKo], apres(15));
  r = jouer(r, [siteOk], apres(30));
  assert.equal(r.alertes[0].statut, "ouverte");
  assert.equal(r.alertes[0].controles_corrects, 1);
  r = jouer(r, [siteOk], apres(45));
  assert.equal(r.alertes[0].statut, "close");
  assert.ok(r.alertes[0].close_le);
  assert.equal(r.f.fermees.length, 1);
});

test("un contrôle correct puis un échec remet le compteur à zéro", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [siteKo], apres(15));
  r = jouer(r, [siteOk], apres(30));
  r = jouer(r, [siteKo], apres(45));
  assert.equal(r.alertes[0].controles_corrects, 0);
  r = jouer(r, [siteOk], apres(60));
  assert.equal(r.alertes[0].statut, "ouverte");
});

test("contrôle inconnu (erreur GitHub, Dependabot 403, budget) : ni fermeture ni compteur", () => {
  let r = jouer(vide, [siteKo], T0);
  r = jouer(r, [siteKo], apres(15));
  r = jouer(r, [inconnu], apres(30));
  r = jouer(r, [inconnu], apres(45));
  assert.equal(r.alertes[0].statut, "ouverte");
  assert.equal(r.alertes[0].controles_corrects, 0);
});

test("workflow absent de la liste lue : inconnu, jamais « corrigé »", () => {
  const an = { empreinte: "p1|workflow|7", cible: "7", titre: "wf", detail: "d", niveau: "eleve", lien: "https://github.com/x/y" };
  let r = jouer(vide, [{ projet: "p1", type: "workflow", ok: true, fermeture: [], anomalies: [an] }], T0);
  assert.equal(r.alertes.length, 1, "seuil 1 pour un workflow");
  for (let i = 1; i <= 3; i++) r = jouer(r, [{ projet: "p1", type: "workflow", ok: true, fermeture: ["8"], anomalies: [] }], apres(15 * i));
  assert.equal(r.alertes[0].statut, "ouverte");
  r = jouer(r, [{ projet: "p1", type: "workflow", ok: true, fermeture: ["7"], anomalies: [] }], apres(100));
  r = jouer(r, [{ projet: "p1", type: "workflow", ok: true, fermeture: ["7"], anomalies: [] }], apres(115));
  assert.equal(r.alertes[0].statut, "close");
});

test("une empreinte n'est jamais en observation et ouverte à la fois ; observation périmée retirée", () => {
  const ouverte = { id: "SN-1", source: "sentinel", statut: "ouverte", empreinte: anomalieSite.empreinte, projet: "p1", type: "site", cible: anomalieSite.cible, controles_corrects: 0, derniere_observation: T0.toISOString() };
  const obs = {
    [anomalieSite.empreinte]: { projet: "p1", type: "site", cible: "x", echecs: 1, vu: T0.toISOString() },
    "p2|site|y": { projet: "p2", type: "site", cible: "y", echecs: 1, vu: new Date(T0.getTime() - 30 * 3600e3).toISOString() },
  };
  const f = fusionner({ alertes: [ouverte], observation: obs, resultats: [], maintenant: T0 });
  assert.deepEqual({ ...f.observation }, {});
});

test("les alertes des autres sources ne sont jamais touchées ni fermées", () => {
  const humaine = { id: "A-001", titre: "t", statut: "ouverte", projet: "p1", type: "site", empreinte: anomalieSite.empreinte };
  let r = jouer({ alertes: [humaine], observation: {} }, [siteOk], T0);
  r = jouer(r, [siteOk], apres(15));
  assert.deepEqual(r.alertes, [humaine]);
});

test("appliquerAlertes : au plus une alerte Sentinel ouverte par empreinte, mise à jour par id seulement", () => {
  const f = fusionner({ alertes: [], observation: {}, resultats: [{ ...siteKo, anomalies: [anomalieSite] }], maintenant: T0, sha6: () => "abc123" });
  assert.equal(f.creees.length, 0);
  const g = fusionner({ alertes: [], observation: { [anomalieSite.empreinte]: { projet: "p1", type: "site", cible: anomalieSite.cible, echecs: 1, vu: T0.toISOString() } }, resultats: [siteKo], maintenant: T0, sha6: () => "abc123" });
  assert.match(g.creees[0].id, /^SN-202611151000-abc123$/);
  const deja = { ...g.creees[0], id: "SN-autre" };
  const liste = appliquerAlertes([deja], { creees: g.creees, modifiees: [] });
  assert.equal(liste.length, 1);
});

test("notes : une par clé, jamais répétée, 50 au plus", () => {
  let n = ajouterNote([], "a", "x", T0);
  n = ajouterNote(n, "a", "y", T0);
  assert.equal(n.length, 1);
  for (let i = 0; i < 60; i++) n = ajouterNote(n, "k" + i, "t", T0);
  assert.equal(n.length, 50);
});

test("F8 compteurs illisibles dans une alerte : traités comme 0", () => {
  for (const mauvais of ["abc", -5, null, 1.5, undefined, {}]) {
    const ouverte = { id: "SN-1", source: "sentinel", statut: "ouverte", empreinte: anomalieSite.empreinte, projet: "p1", type: "site", cible: anomalieSite.cible, controles_corrects: mauvais, derniere_observation: T0.toISOString() };
    const f = fusionner({ alertes: [ouverte], observation: { x: { projet: "p1", type: "site", cible: "z", echecs: "abc", vu: T0.toISOString() } }, resultats: [siteOk], maintenant: T0 });
    assert.equal(f.modifiees[0].champs.controles_corrects, 1, String(mauvais));
    assert.equal(f.fermees.length, 0);
  }
});
