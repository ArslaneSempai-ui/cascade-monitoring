/**
 * La couture, éprouvée : le registre porte les sept paliers du contrat, chaque scénario
 * rend un score dans [0, 1] sur des cas écrits ICI (pas ceux du lot L2), est déterministe,
 * et ne lit que les échelles qu'il déclare. Rouge au squelette : c'est l'état du lot L1.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { PALIERS, SEUILS, ecraser, exigerScore, type Echelles } from "./scenario.ts";
import { exigerCas, type Cas } from "./cas.ts";
import { registre, absents } from "./scenarios/index.ts";

export const ECHELLES_TEST: Echelles = {
  seuilDeclaration: 10_000, echelleMontant: 25_000, echelleVelocite: 40,
  joursStructuration: 7, joursPassage: 3, pairs: { moyenne: 1_800, ecartType: 1_200 },
};

const calme: Cas = exigerCas({
  id: "t-calme", finFenetre: "2026-06-30",
  fenetre: [
    { ts: "2026-06-03T09:00:00Z", amount: 1_250, direction: "in", channel: "transfer" },
    { ts: "2026-06-12T10:30:00Z", amount: 340, direction: "out", channel: "card" },
    { ts: "2026-06-27T18:05:00Z", amount: 890, direction: "out", channel: "transfer" },
  ],
  historique: Array.from({ length: 6 }, (_, i) => ({
    ts: `2026-0${i + 1 < 6 ? i + 1 : 5}-15T09:00:00Z`, amount: 1_200 + i * 20, direction: "in" as const, channel: "transfer" as const,
  })).sort((a, b) => a.ts.localeCompare(b.ts)),
});

const structure: Cas = exigerCas({
  id: "t-structure", finFenetre: "2026-06-30",
  fenetre: Array.from({ length: 9 }, (_, i) => ({
    ts: `2026-06-${String(20 + Math.floor(i / 2)).padStart(2, "0")}T1${i % 2}:00:00Z`,
    amount: 9_400 + (i % 3) * 150, direction: "in" as const, channel: "cash" as const,
  })),
  historique: [],
});

test("la grille de seuils est celle du contrat : 51 valeurs de 0,50 à 1,00", () => {
  assert.equal(SEUILS.length, 51);
  assert.equal(SEUILS[0], 0.5);
  assert.equal(SEUILS[50], 1);
  assert.ok(SEUILS.every((s) => Math.round(s * 100) / 100 === s));
});

test("l'écrasement commun : 0 à zéro, 0,63 à l'échelle, croissant, borné", () => {
  assert.equal(ecraser(0, 100), 0);
  assert.ok(Math.abs(ecraser(100, 100) - 0.632) < 0.001);
  assert.ok(ecraser(300, 100) > ecraser(100, 100));
  assert.ok(ecraser(1e9, 100) <= 1);
  assert.throws(() => ecraser(1, 0));
});

test("le registre porte les sept paliers du contrat, dans son ordre, aucun absent", () => {
  const r = registre();
  assert.deepEqual([...r.keys()], [...PALIERS], `paliers manquants : ${absents(r).join(", ") || "aucun"}`);
  assert.deepEqual(absents(r), []);
});

test("chaque scénario note dans [0, 1], le même cas deux fois donne le même score", () => {
  for (const s of registre().values()) {
    for (const cas of [calme, structure]) {
      const a = exigerScore(s.score(cas, ECHELLES_TEST), s.id, cas);
      const b = s.score(cas, ECHELLES_TEST);
      assert.equal(a, b, `${s.id} n'est pas déterministe`);
    }
    assert.ok(s.echellesLues.length >= 0);
    assert.ok(s.rang >= 1 && s.rang <= PALIERS.length, `${s.id}: rang ${s.rang}`);
    assert.ok(s.description.length > 10, `${s.id}: description vide`);
  }
});

test("un cas de structuration inquiète plus qu'un compte calme, pour les scénarios qui la voient", () => {
  const r = registre();
  for (const id of ["structuring", "amount", "velocity"] as const) {
    const s = r.get(id);
    if (!s) continue;                       // le rouge du registre le dit déjà
    assert.ok(s.score(structure, ECHELLES_TEST) > s.score(calme, ECHELLES_TEST), `${id} : structure ≤ calme`);
  }
});

test("un scénario ne lit que les échelles qu'il déclare (les autres sont empoisonnées)", () => {
  for (const s of registre().values()) {
    const propre = s.score(structure, ECHELLES_TEST);
    const poison = { ...ECHELLES_TEST } as Record<string, unknown>;
    for (const k of Object.keys(ECHELLES_TEST) as (keyof Echelles)[]) {
      if (!s.echellesLues.includes(k)) poison[k] = k === "pairs" ? { moyenne: 1e9, ecartType: 1e9 } : 1e9;
    }
    assert.equal(s.score(structure, poison as unknown as Echelles), propre,
      `${s.id} lit une échelle qu'il ne déclare pas`);
  }
});
