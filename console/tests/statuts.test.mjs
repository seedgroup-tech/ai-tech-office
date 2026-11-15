import { test } from "node:test";
import assert from "node:assert/strict";
import { signer } from "../lib/signature.mjs";
import { evaluerDecisions, calculerStatuts, ORIGINE_HISTORIQUE, ORIGINE_CONSOLE } from "../lib/statuts.mjs";
import { CLE_TEST } from "./outils.mjs";

const demandes = [
  { id: "signee", titre: "A" },
  { id: "historique", titre: "B" },
  { id: "falsifiee", titre: "C" },
  { id: "absente", titre: "D" },
  { id: "refusee", titre: "E" },
];

async function decisionSignee(demande_id, choix, decide_le) {
  const d = { id: "D-" + demande_id, demande_id, titre: "t", choix, commentaire: null, decide_le, par: "proprietaire@example.com" };
  return { ...d, signature: await signer(d, CLE_TEST), origine: ORIGINE_CONSOLE };
}

test("statuts : signée, historique, invalide, absente", async () => {
  const signee = await decisionSignee("signee", "approuvee", "2026-11-15T10:00:00.000Z");
  const refusee = await decisionSignee("refusee", "refusee", "2026-11-15T10:00:00.000Z");
  const falsifiee = { ...(await decisionSignee("falsifiee", "refusee", "2026-11-15T10:00:00.000Z")), choix: "approuvee" };
  const historique = { id: "H-1", demande_id: "historique", titre: "B", choix: "approuvee", decide_le: "2026-11-14", par: "propriétaire", signature: null, origine: ORIGINE_HISTORIQUE };

  const evaluees = await evaluerDecisions([signee, refusee, falsifiee, historique], CLE_TEST);
  const parId = Object.fromEntries(calculerStatuts(demandes, evaluees).map((d) => [d.id, d]));

  assert.equal(parId.signee.statut, "approuvee");
  assert.equal(parId.signee.decision.verification, "valide");
  assert.equal(parId.refusee.statut, "refusee");
  assert.equal(parId.historique.statut, "historique");
  assert.equal(parId.falsifiee.statut, "en_attente", "une décision falsifiée ne compte pas");
  assert.equal(parId.absente.statut, "en_attente");
  assert.equal(parId.absente.decision, null);

  const f = evaluees.find((d) => d.id === falsifiee.id);
  assert.equal(f.verification, "invalide");
  assert.equal(f.alerte, "signature invalide");
});

test("la valeur brute de la signature n'est pas renvoyée", async () => {
  const evaluees = await evaluerDecisions([await decisionSignee("signee", "approuvee", "2026-11-15T10:00:00.000Z")], CLE_TEST);
  assert.equal("signature" in evaluees[0], false);
});

test("une décision sans signature qui ne se dit pas historique est invalide", async () => {
  const d = { id: "X", demande_id: "absente", choix: "approuvee", decide_le: "2026-11-15T10:00:00.000Z", par: "x@example.com", signature: null, origine: "agent" };
  const [e] = await evaluerDecisions([d], CLE_TEST);
  assert.equal(e.verification, "invalide");
  assert.equal(calculerStatuts(demandes, [e]).find((x) => x.id === "absente").statut, "en_attente");
});

test("une mention « approuvée » dans la demande elle-même ne compte pas", async () => {
  const [d] = calculerStatuts([{ id: "absente", statut: "approuvee" }], []);
  assert.equal(d.statut, "en_attente");
});

test("la décision signée valide la plus récente l'emporte sur une historique", async () => {
  const hist = { id: "H-2", demande_id: "signee", choix: "approuvee", decide_le: "2026-11-14", signature: null, origine: ORIGINE_HISTORIQUE };
  const recente = await decisionSignee("signee", "refusee", "2026-11-15T12:00:00.000Z");
  const evaluees = await evaluerDecisions([hist, recente], CLE_TEST);
  assert.equal(calculerStatuts(demandes, evaluees).find((x) => x.id === "signee").statut, "refusee");
});
