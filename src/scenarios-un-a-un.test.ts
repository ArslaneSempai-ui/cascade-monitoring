/**
 * CHAQUE SCÉNARIO, UN À UN — les témoins du lot L1, sur des cas écrits À LA MAIN ICI.
 *
 * Les cas du lot L2 n'entrent pas dans ce fichier : un scénario éprouvé sur les cas qui
 * serviront à le mesurer apprendrait ses propres témoins. Chaque scénario a ici son
 * archétype (le cas qu'il doit voir), son sosie (le cas bénin qu'il ne doit PAS confondre)
 * et ses refus définitionnels — dans les deux sens quand la définition a deux bords
 * (au seuil / sous la bande, rond / presque rond, avec / sans historique).
 *
 * Les invariants transverses (déterminisme, [0, 1], échelles empoisonnées, registre
 * complet) vivent dans scenarios.test.ts, le fichier de la couture : rien n'est répété ici.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { exigerCas, type Cas, type Transaction } from "./cas.ts";
import type { Echelles } from "./scenario.ts";
import { amount } from "./scenarios/amount.ts";
import { velocity } from "./scenarios/velocity.ts";
import { structuring, PART_BASSE } from "./scenarios/structuring.ts";
import { round } from "./scenarios/round.ts";
import { zscore, Z_BARRE } from "./scenarios/zscore.ts";
import { passthrough } from "./scenarios/passthrough.ts";
import { peer } from "./scenarios/peer.ts";
import { registre } from "./scenarios/index.ts";

const E: Echelles = {
  seuilDeclaration: 10_000, echelleMontant: 25_000, echelleVelocite: 40,
  joursStructuration: 7, joursPassage: 3, pairs: { moyenne: 1_800, ecartType: 1_200 },
};

/** Un cas en une ligne : des triplets (jour de juin 2026, heure, montant, sens, canal). */
function cas(id: string, lignes: [number, number, number, "in" | "out", Transaction["channel"]][],
  historique: Transaction[] = []): Cas {
  return exigerCas({
    id, finFenetre: "2026-06-30", historique,
    fenetre: lignes.map(([jour, heure, montant, sens, canal]) => ({
      ts: `2026-06-${String(jour).padStart(2, "0")}T${String(heure).padStart(2, "0")}:00:00Z`,
      amount: montant, direction: sens, channel: canal,
    })),
  });
}

/** Un historique plat : n transactions autour d'une moyenne, les mois d'avant. */
function historiquePlat(n: number, moyenne: number, amplitude = 0): Transaction[] {
  return Array.from({ length: n }, (_, i) => ({
    ts: `2026-${String(1 + (i % 5)).padStart(2, "0")}-${String(1 + Math.floor(i / 5)).padStart(2, "0")}T09:00:00Z`,
    amount: moyenne + (i % 3 - 1) * amplitude, direction: "in" as const, channel: "transfer" as const,
  })).sort((a, b) => a.ts.localeCompare(b.ts));
}

const VIDE = cas("vide", []);

test("une fenêtre vide note 0 sur les sept : aucun scénario n'invente d'inquiétude sans transaction", () => {
  for (const s of registre().values()) assert.equal(s.score(VIDE, E), 0, s.id);
});

test("amount : le pic seul décide, l'historique et le nombre ne pèsent pas", () => {
  const unGros = cas("un-gros", [[10, 9, 25_000, "in", "wire"]]);
  const beaucoupDePetits = cas("petits", Array.from({ length: 8 }, (_, i) =>
    [2 + i * 3, 9, 800, "in", "transfer"] as [number, number, number, "in", "transfer"]));
  assert.ok(Math.abs(amount.score(unGros, E) - (1 - Math.exp(-1))) < 1e-12,
    "un pic à l'échelle doit noter exactement 1 - exp(-1)");
  assert.ok(amount.score(unGros, E) > amount.score(beaucoupDePetits, E));
  const memePicGrosPasse = cas("gros-passe", [[10, 9, 25_000, "in", "wire"]], historiquePlat(6, 500_000));
  assert.equal(amount.score(memePicGrosPasse, E), amount.score(unGros, E),
    "amount est absolu : le passé du compte ne change pas le pic de la fenêtre");
});

test("velocity : le nombre seul décide, pas les montants", () => {
  const agite = cas("agite", Array.from({ length: 40 }, (_, i) =>
    [1 + Math.floor(i / 2), 8 + (i % 2), 5, "out", "card"] as [number, number, number, "out", "card"]));
  const calme = cas("calme", [[5, 9, 900_000, "in", "wire"]]);
  assert.ok(velocity.score(agite, E) > velocity.score(calme, E),
    "quarante mouvements de 5 doivent inquiéter velocity plus qu'un seul de 900 000");
  assert.ok(Math.abs(velocity.score(agite, E) - (1 - Math.exp(-1))) < 1e-12,
    "quarante transactions à l'échelle 40 notent exactement 1 - exp(-1)");
});

test("structuring : la bande est [PART_BASSE × seuil, seuil), espèces entrantes, et rien d'autre", () => {
  const archetype = cas("arch", [[20, 9, 9_400, "in", "cash"], [21, 10, 9_500, "in", "cash"],
    [22, 11, 9_300, "in", "cash"], [23, 9, 9_600, "in", "cash"]]);
  assert.ok(structuring.score(archetype, E) > 0.9, "quatre dépôts sous le seuil en quatre jours");
  /* Les deux bords de la bande, chacun dans les deux sens. */
  const auSeuil = cas("au-seuil", [[20, 9, 10_000, "in", "cash"], [21, 10, 10_000, "in", "cash"]]);
  assert.equal(structuring.score(auSeuil, E), 0, "un dépôt AU seuil est déclaré, pas structuré");
  const justeSous = cas("juste-sous", [[20, 9, 9_999.99, "in", "cash"]]);
  assert.ok(structuring.score(justeSous, E) > 0, "un centime sous le seuil est dans la bande");
  const sousLaBande = cas("sous-bande", [[20, 9, E.seuilDeclaration * PART_BASSE - 1, "in", "cash"]]);
  assert.equal(structuring.score(sousLaBande, E), 0, "un dépôt ordinaire sous la bande ne compte pas");
  const auBordBas = cas("bord-bas", [[20, 9, E.seuilDeclaration * PART_BASSE, "in", "cash"]]);
  assert.ok(structuring.score(auBordBas, E) > 0, "le bord bas de la bande est dedans");
  /* Le canal et le sens font partie de la définition. */
  const parVirement = cas("virement", [[20, 9, 9_400, "in", "wire"], [21, 10, 9_500, "in", "transfer"]]);
  assert.equal(structuring.score(parVirement, E), 0, "la structuration de CE scénario est un schéma d'espèces");
  const retraits = cas("retraits", [[20, 9, 9_400, "out", "cash"], [21, 10, 9_500, "out", "cash"]]);
  assert.equal(structuring.score(retraits, E), 0, "des retraits ne sont pas des dépôts");
  /* La sous-fenêtre sépare le concentré du dispersé : mêmes dépôts, autre calendrier. */
  const disperse = cas("disperse", [[2, 9, 9_400, "in", "cash"], [12, 9, 9_500, "in", "cash"],
    [22, 9, 9_300, "in", "cash"]]);
  const concentre = cas("concentre", [[20, 9, 9_400, "in", "cash"], [20, 15, 9_500, "in", "cash"],
    [21, 9, 9_300, "in", "cash"]]);
  assert.ok(structuring.score(concentre, E) > structuring.score(disperse, E),
    "trois dépôts en deux jours doivent inquiéter plus que les mêmes étalés sur trois semaines");
});

test("round : il faut les deux signatures ; chacune seule plafonne à 0,5", () => {
  const archetype = cas("rond-rapide", [[10, 9, 5_000, "in", "transfer"], [10, 14, 5_000, "out", "wire"],
    [15, 9, 2_000, "in", "transfer"], [16, 10, 2_000, "out", "wire"]]);
  assert.equal(round.score(archetype, E), 1, "tout rond, toute sortie dans le délai : le plein score");
  const paie = cas("paie", [[5, 9, 2_347.18, "in", "transfer"], [12, 10, 89.9, "out", "card"],
    [19, 11, 1_204.5, "out", "card"], [26, 12, 63.75, "out", "card"]]);
  assert.ok(round.score(paie, E) <= 0.5, "une paie aux centimes près, dépensée au fil du mois");
  const rondsSansSortie = cas("ronds-figes", [[3, 9, 1_000, "in", "transfer"], [10, 9, 2_000, "in", "transfer"]]);
  assert.equal(round.score(rondsSansSortie, E), 0.5, "tout rond mais rien ne sort : la moitié du score");
  const presqueRond = cas("presque", [[3, 9, 1_000.01, "in", "transfer"]]);
  assert.equal(round.score(presqueRond, E), 0, "un centime de plus et le montant n'est plus rond");
  const lent = cas("lent", [[2, 9, 5_000, "in", "transfer"], [20, 9, 5_000, "out", "wire"]]);
  assert.equal(round.score(lent, E), 0.5, "ronds mais dix-huit jours de délai : la sortie n'est pas rapide");
});

test("zscore : le même pic est criant sur un compte plat et banal sur un compte qui vit large", () => {
  const pic = [[15, 9, 9_000, "in", "transfer"]] as [number, number, number, "in", "transfer"][];
  const dormantQuiSEveille = cas("dormant", pic, historiquePlat(12, 1_200, 20));
  const negoce = cas("negoce", pic, historiquePlat(12, 8_000, 2_500));
  assert.ok(zscore.score(dormantQuiSEveille, E) > 0.95, "9 000 sur un compte à 1 200 ± 20");
  assert.ok(zscore.score(negoce, E) < 0.2, "9 000 sur un compte à 8 000 ± 2 500 est un mardi ordinaire");
  assert.ok(zscore.score(dormantQuiSEveille, E) > zscore.score(negoce, E));
  /* Les refus : pas d'historique, ou pas assez pour un écart-type. */
  assert.equal(zscore.score(cas("sans-passe", pic), E), 0, "sans historique : 0, compté à part par le rapport");
  assert.equal(zscore.score(cas("un-point", pic, historiquePlat(1, 1_200)), E), 0,
    "un écart-type ne se calcule pas sur un point");
  /* Un pic SOUS la moyenne du passé n'est pas une aberration vers le haut. */
  const enDessous = cas("en-dessous", [[15, 9, 300, "in", "transfer"]], historiquePlat(12, 1_200, 20));
  assert.equal(zscore.score(enDessous, E), 0);
  /* L'historique constant ne rend pas un z infini : l'écart-type est plancheré à 1. */
  const passeConstant = cas("constant", pic, historiquePlat(12, 1_200, 0));
  const s = zscore.score(passeConstant, E);
  assert.ok(s > 0.99 && s <= 1, `un pic à 7 800 sigmas planchérés reste dans [0, 1] : ${s}`);
});

test("passthrough : l'aller-retour note haut, la paie dépensée note bas, et il faut les deux facteurs", () => {
  const relais = cas("relais", [[10, 9, 20_000, "in", "wire"], [10, 16, 19_500, "out", "wire"]]);
  assert.ok(passthrough.score(relais, E) > 0.95, "entré le matin, ressorti le soir, presque tout");
  const paieDepensee = cas("paie-dep", [[1, 9, 3_000, "in", "transfer"], [8, 9, 700, "out", "card"],
    [15, 9, 700, "out", "card"], [22, 9, 700, "out", "card"], [29, 9, 700, "out", "card"]]);
  assert.ok(passthrough.score(paieDepensee, E) < 0.25,
    "la même valeur ressort, mais elle séjourne des semaines : le facteur séjour doit l'écraser");
  const entreEtReste = cas("reste", [[10, 9, 20_000, "in", "wire"]]);
  assert.equal(passthrough.score(entreEtReste, E), 0, "rien ne sort : pas de relais");
  const videUnSolde = cas("vide-solde", [[10, 9, 20_000, "out", "wire"]]);
  assert.equal(passthrough.score(videUnSolde, E), 0,
    "une sortie sans entrée dans la fenêtre vide un solde d'avant : rien à apparier");
  /* Le premier-entré premier-sorti : la sortie tardive consomme l'entrée ANCIENNE. */
  const fifo = cas("fifo", [[1, 9, 10_000, "in", "wire"], [28, 9, 10_000, "in", "wire"],
    [28, 16, 10_000, "out", "wire"]]);
  assert.ok(passthrough.score(fifo, E) < 0.5,
    "la sortie du 28 est rattachée à l'entrée du 1er (27 jours), pas à celle du matin même");
});

test("peer : l'écart au profil déclaré, dans les deux sens, et 0 sans historique", () => {
  const passe = historiquePlat(6, 1_800, 100);
  const dansLeProfil = cas("profil", [[5, 9, 1_700, "in", "transfer"], [15, 9, 1_900, "out", "transfer"]], passe);
  const tresAuDessus = cas("dessus", [[5, 9, 60_000, "in", "wire"]], passe);
  const tresAuDessous = cas("dessous", [[5, 9, 2, "out", "card"], [6, 9, 2, "out", "card"]], passe);
  assert.ok(peer.score(dansLeProfil, E) < 0.1, "un compte dans son groupe n'inquiète pas ce scénario");
  assert.ok(peer.score(tresAuDessus, E) > 0.99);
  assert.ok(peer.score(tresAuDessous, E) > peer.score(dansLeProfil, E),
    "très au-dessous du groupe est hors profil aussi : c'est l'écart qui compte, pas le sens");
  const sansPasse = cas("peer-sans-passe", [[5, 9, 60_000, "in", "wire"]]);
  assert.equal(peer.score(sansPasse, E), 0,
    "sans passé, l'appartenance au groupe n'est pas étayée : 0, compté à part par le rapport");
  /* La barre est celle de zscore : à un écart d'exactement Z_BARRE sigmas, 1 - exp(-1). */
  const aTroisSigmas = cas("trois-sigmas",
    [[5, 9, E.pairs.moyenne + Z_BARRE * E.pairs.ecartType, "in", "wire"]], passe);
  assert.ok(Math.abs(peer.score(aTroisSigmas, E) - (1 - Math.exp(-1))) < 1e-12);
});

test("les rangs vont de 1 à 7 sans trou, dans l'ordre du contrat : la frontière peut ordonner par coût", () => {
  assert.deepEqual([...registre().values()].map((s) => s.rang), [1, 2, 3, 4, 5, 6, 7]);
});
