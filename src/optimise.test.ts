/**
 * La frontière du bleu, éprouvée sur des cellules construites à la main. La règle qui la
 * distingue du rouge : sous l'exigence tenue à la borne basse, c'est le MOINS DE FAUSSES
 * ALERTES qui gagne (contrat §6) — le coût d'analyste que le client paie chaque jour.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  meilleureSousRappel, meilleureSousBudget, lireRappelMin, lireBudget, lireReleve,
  plusForteBorne, heuresDAnalyste, cellulesDe, MINIMUM_SUSPECTS, type CellulePlacee,
} from "./optimise.ts";
import { rate } from "./interval.ts";
import { SEUILS } from "./scenario.ts";
import { empreinteDuReleve } from "./empreinte.ts";
import { ASSUMPTIONS, analystHourlyCost } from "./assumptions.ts";
import { mesurer, lireAlertes, lireTransactions } from "./your-alerts.ts";
import { registreFactice } from "./your-alerts.test.ts";

function cellule(palier: string, rang: number, seuil: number, tirees: number,
  rappel: [number, number], fa: [number, number]): CellulePlacee {
  return {
    palier: palier as CellulePlacee["palier"], rang, seuil, tirees,
    rappel: rate(rappel[0], rappel[1]),
    faussesAlertes: rate(fa[0], fa[1]),
  };
}

test("sous l'exigence, la borne BASSE décide, puis le MOINS de fausses alertes gagne", () => {
  /* Le point de 23/24 dépasse 0,85, sa borne basse plonge dessous : écarté. */
  const pointHaut = cellule("amount", 1, 0.9, 50, [23, 24], [2, 100]);
  const bruyante = cellule("velocity", 2, 0.8, 90, [24, 24], [40, 100]);
  const calme = cellule("zscore", 5, 0.7, 60, [24, 24], [10, 100]);
  const choix = meilleureSousRappel([pointHaut, bruyante, calme], 0.85);
  assert.equal(choix, calme,
    "la cellule chère mais CALME bat la bruyante : la règle du bleu est le coût d'analyste");
});

test("égalités : fausses alertes, puis alertes levées, puis rang, puis seuil strict", () => {
  const a = cellule("amount", 1, 0.90, 40, [24, 24], [5, 100]);
  const b = cellule("amount", 1, 0.91, 40, [24, 24], [5, 100]);
  const c = cellule("velocity", 2, 0.91, 40, [24, 24], [5, 100]);
  assert.equal(meilleureSousRappel([a, c, b], 0.8), b);
  const moinsLevees = cellule("velocity", 2, 0.7, 30, [24, 24], [5, 100]);
  assert.equal(meilleureSousRappel([a, b, moinsLevees], 0.8), moinsLevees,
    "à fausses alertes égales, le moins d'alertes levées");
});

test("dès CINQ suspects la borne peut tenir une exigence ; sous cinq, jamais ; vide : null", () => {
  assert.notEqual(meilleureSousRappel([cellule("amount", 1, 0.9, 10, [6, 6], [5, 100])], 0.5), null);
  assert.equal(meilleureSousRappel([cellule("amount", 1, 0.9, 10, [4, 4], [5, 100])], 0.5), null);
  assert.equal(meilleureSousRappel([cellule("amount", 1, 0.9, 10, [15, 24], [5, 100])], 0.9), null);
});

test("la plus forte borne est un nombre fini ou null : jamais -Infinity", () => {
  const borne = plusForteBorne([cellule("amount", 1, 0.9, 10, [5, 6], [5, 100])]);
  assert.ok(borne !== null && Number.isFinite(borne) && borne > 0.3);
  assert.equal(plusForteBorne([cellule("amount", 1, 0.9, 10, [4, 4], [5, 100])]), null);
});

test("sous budget mensuel : conversion par la période, borne basse maximisée, fausses alertes en départage", () => {
  const calme = cellule("amount", 1, 0.95, 60, [22, 24], [5, 100]);    /* 30/mois à 60 j */
  const fort = cellule("velocity", 2, 0.80, 90, [24, 24], [30, 100]);  /* 45/mois */
  assert.equal(meilleureSousBudget([calme, fort], 50, 60), fort);
  assert.equal(meilleureSousBudget([calme, fort], 35, 60), calme);
  assert.equal(meilleureSousBudget([calme, fort], 10, 60), null);
});

test("--recall et --alert-budget stricts, refus en nommant ce qui a été reçu", () => {
  assert.equal(lireRappelMin("0.9"), 0.9);
  for (const brut of ["90", "90%", "", "abc", "1.5"]) {
    assert.throws(() => lireRappelMin(brut), /not a recall/);
  }
  assert.equal(lireBudget("800"), 800);
  for (const brut of ["0", "", "8.5", "1e3"]) assert.throws(() => lireBudget(brut), /not a budget/);
});

test("un relevé retouché est refusé AVANT la frontière, les deux empreintes citées", () => {
  const a = [ "alert_id,account_id,window_end,disposition" ];
  const t = [ "account_id,ts,amount,direction,channel" ];
  for (let i = 0; i < 30; i++) {
    a.push(`x-${i},acc-${i},2026-08-30,${i < 6 ? "suspicious" : "benign"}`);
    t.push(`acc-${i},2026-08-20T10:00:00Z,900000,in,cash`);
  }
  const { alertes } = lireAlertes(a.join("\n") + "\n");
  const { parCompte } = lireTransactions(t.join("\n") + "\n");
  const m = mesurer(alertes, parCompte, registreFactice(), {
    alerts: "x.csv", alertsSha: "0".repeat(64), tx: "y.csv", txSha: "1".repeat(64), txRows: 30,
  }, null);
  m.empreinte = empreinteDuReleve(m);

  const d = mkdtempSync(join(tmpdir(), "lapis-opt-"));
  const sain = join(d, "x-measured.json");
  writeFileSync(sain, JSON.stringify(m));
  assert.equal(lireReleve(sain).source.alerts, 30);
  assert.equal(cellulesDe(lireReleve(sain)).length, 2 * SEUILS.length,
    "deux paliers factices, la grille entière chacun : le compte est TENU par la constante");

  const retouche = JSON.parse(JSON.stringify(m)) as typeof m;
  retouche.source.suspicious = 26;
  const chemin = join(d, "retouche-measured.json");
  writeFileSync(chemin, JSON.stringify(retouche));
  assert.throws(() => lireReleve(chemin), /it carries [0-9a-f]{16}, its content computes to [0-9a-f]{16}/);
  writeFileSync(chemin, JSON.stringify({ kind: "autre-chose" }));
  assert.throws(() => lireReleve(chemin), /is not a monitoring record/);
});

test("les heures d'analyste suivent les hypothèses déclarées, et le plancher vaut 5", () => {
  const h = heuresDAnalyste(120);
  assert.equal(h.heures, (120 * ASSUMPTIONS.minutesPerAlert) / 60);
  assert.equal(h.usd, h.heures * analystHourlyCost());
  assert.equal(MINIMUM_SUSPECTS, 5, "le plancher contractuel du rappel");
});
