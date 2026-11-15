import { test } from "node:test";
import assert from "node:assert/strict";
import { signer, verifierSignature, texteASigner } from "../lib/signature.mjs";
import { CLE_TEST } from "./outils.mjs";

const base = { demande_id: "S-001-entetes", choix: "approuvee", decide_le: "2026-11-15T16:00:00.000Z", par: "proprietaire@example.com" };

test("le texte signé est demande_id|choix|decide_le|par", () => {
  assert.equal(texteASigner(base), "S-001-entetes|approuvee|2026-11-15T16:00:00.000Z|proprietaire@example.com");
});

test("signature HMAC-SHA256 : 64 caractères hexadécimaux, stable", async () => {
  const s1 = await signer(base, CLE_TEST);
  const s2 = await signer(base, CLE_TEST);
  assert.match(s1, /^[0-9a-f]{64}$/);
  assert.equal(s1, s2);
});

test("signature conforme à une valeur de référence calculée par node:crypto", async () => {
  const { createHmac } = await import("node:crypto");
  const attendu = createHmac("sha256", CLE_TEST).update(texteASigner(base), "utf8").digest("hex");
  assert.equal(await signer(base, CLE_TEST), attendu);
});

test("vérification : acceptée si rien n'a changé", async () => {
  const d = { ...base, signature: await signer(base, CLE_TEST) };
  assert.equal(await verifierSignature(d, CLE_TEST), true);
});

test("vérification : refusée si le choix, la demande, la date ou l'auteur changent", async () => {
  const sig = await signer(base, CLE_TEST);
  for (const modif of [{ choix: "refusee" }, { demande_id: "M-001-fiches" }, { decide_le: "2026-11-16T16:00:00.000Z" }, { par: "autre@example.com" }]) {
    assert.equal(await verifierSignature({ ...base, ...modif, signature: sig }, CLE_TEST), false, JSON.stringify(modif));
  }
});

test("vérification : refusée avec une autre clé, une signature mal formée ou absente", async () => {
  const sig = await signer(base, CLE_TEST);
  assert.equal(await verifierSignature({ ...base, signature: sig }, CLE_TEST + "x"), false);
  assert.equal(await verifierSignature({ ...base, signature: "abc" }, CLE_TEST), false);
  assert.equal(await verifierSignature({ ...base, signature: null }, CLE_TEST), false);
  assert.equal(await verifierSignature({ ...base, signature: sig.toUpperCase() }, CLE_TEST), false);
});

test("une clé trop courte est refusée", async () => {
  await assert.rejects(() => signer(base, "courte"));
});
