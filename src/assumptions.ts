/**
 * What is not measured — and never dressed as if it were.
 *
 * The measurement on a client's dispositioned alerts produces rates with intervals;
 * everything else — the scales that squash a raw amount into [0, 1], what an analyst
 * costs, how many accounts a month are monitored — nobody here can know. Those are
 * ASSUMPTIONS, declared with provenance, unit and bounds so a reader substitutes their
 * own figure and sees what moves.
 *
 * The SCALES matter doubly here: every scenario score depends on them, so a scale is an
 * assumption that reaches every cell of the frontier. That is why `Echelles` lives in
 * this file and travels to `score(cas, echelles)` as an argument — a scenario that
 * invented its own scale would hide an assumption inside code (scenario.ts says so), and
 * the sealed record snapshots the scales it was measured under.
 *
 * Modelled on the red tool's `assumptions.ts` (ASSUMPTIONS / STATUSES / UNITS / BOUNDS,
 * complete Records so an assumption added tomorrow does not compile until its provenance,
 * unit and bounds are written).
 */
import type { Echelles } from "./scenario.ts";

/**
 * Where a number came from — the shared vocabulary of the house, plus one word.
 * `synthetic`: measured on FABRICATED cases (authored archetypes and their seeded
 * variants — no real transaction is public). A real measurement of the code, of
 * manufactured inputs; merging it with client-history rates would launder it into a
 * measured figure. The vocabulary keeps them apart, and the report renders them apart.
 */
export type Provenance = "retrieved" | "measured" | "assumed" | "chosen" | "synthetic";

export type Assumptions = {
  /**
   * The cash reporting threshold the structuring scenario watches just under.
   * 10,000 is the US CTR figure and a common default elsewhere — still assumed:
   * yours depends on jurisdiction.
   */
  seuilDeclaration: number;
  /** Amount at which the `amount` scenario reads 0.63 (1 - exp(-x/scale)). Assumed. */
  echelleMontant: number;
  /** Transaction count at which `velocity` reads 0.63. Assumed. */
  echelleVelocite: number;
  /** The structuring sub-window, in days. Assumed. */
  joursStructuration: number;
  /** The pass-through delay, in days: money in, money out within this. Assumed. */
  joursPassage: number;
  /** The default peer profile (mean and standard deviation of an amount), when the
   *  client declares none. Assumed, and the weakest assumption here: a real peer group
   *  is the client's to declare. */
  pairsMoyenne: number;
  pairsEcartType: number;
  /** Minutes an analyst spends clearing one monitoring alert. Assumed — yours differ. */
  minutesPerAlert: number;
  /** Loaded annual cost of one analyst. Assumed. */
  analystAnnualCost: number;
  /** Hours genuinely productive per day. Assumed, and never eight. */
  productiveHoursPerDay: number;
  workingDaysPerYear: number;
  /**
   * Accounts monitored per month when `--volume` is not supplied. Used ONLY by the
   * optimiser's budget arithmetic, never to print alerts-per-thousand: a rate over an
   * assumed denominator would read as a measurement, so that column simply does not
   * appear without a supplied volume.
   */
  accountsPerMonth: number;
  /**
   * The recall a monitoring programme is held to before anything else is weighed.
   * The tool's own recommendation rule (contract, section 6): recall lower bound at or
   * above this, then the fewest false alerts. Assumed — the figure a compliance
   * committee owns, and `optimise -- --recall=<min>` replaces it with yours.
   */
  recallFloor: number;
};

export const ASSUMPTIONS: Assumptions = {
  seuilDeclaration: 10_000,
  echelleMontant: 20_000,
  /* arbitrage du chef, 7/09, sur le constat de la mesure publique (L4) : à 60, la ligne
     `velocity` était PLATE à 0 sur les 51 seuils, deux moitiés — aucun cas écrit ne
     dépasse 20 transactions par fenêtre de trente jours (médiane 10). Réglée pour qu'une
     fenêtre deux fois plus chargée que la médiane écrite note 0,63 ; assumed, bornée,
     et toute retouche re-scelle le relevé. */
  echelleVelocite: 15,
  joursStructuration: 7,
  joursPassage: 3,
  pairsMoyenne: 900,
  pairsEcartType: 1_200,
  minutesPerAlert: 20,
  analystAnnualCost: 62_000,
  productiveHoursPerDay: 6,
  workingDaysPerYear: 220,
  accountsPerMonth: 100_000,
  recallFloor: 0.90,
};

/** All assumed, and that is the honest answer: each is an input the reader substitutes. */
export const STATUSES: Record<keyof Assumptions, Provenance> = {
  seuilDeclaration: "assumed",
  echelleMontant: "assumed",
  echelleVelocite: "assumed",
  joursStructuration: "assumed",
  joursPassage: "assumed",
  pairsMoyenne: "assumed",
  pairsEcartType: "assumed",
  minutesPerAlert: "assumed",
  analystAnnualCost: "assumed",
  productiveHoursPerDay: "assumed",
  workingDaysPerYear: "assumed",
  accountsPerMonth: "assumed",
  recallFloor: "assumed",
};

/**
 * L'unité de chaque hypothèse, parce qu'un nombre nu se fait attribuer la mauvaise :
 * la maison a déjà publié « humanSeconds $45.00 » le jour où une page a deviné l'unité.
 * Composées, avec leur dénominateur : c'est la moitié qui fait les facteurs cinq.
 */
export const UNITS: Record<keyof Assumptions, string> = {
  seuilDeclaration: "account currency/report",
  echelleMontant: "account currency at 0.63 score",
  echelleVelocite: "transactions per window at 0.63 score",
  joursStructuration: "days/sub-window",
  joursPassage: "days in-to-out",
  pairsMoyenne: "account currency/transaction",
  pairsEcartType: "account currency/transaction",
  minutesPerAlert: "minutes/alert",
  analystAnnualCost: "usd/year",
  productiveHoursPerDay: "hours/day",
  workingDaysPerYear: "days/year",
  accountsPerMonth: "accounts/month",
  recallFloor: "suspicious cases recalled/confirmed case",
};

/** Les bornes de balayage : hors d'elles, la valeur est un défaut de saisie, pas un scénario. */
export const BOUNDS: Record<keyof Assumptions, [number, number]> = {
  seuilDeclaration: [1_000, 1_000_000],
  echelleMontant: [100, 10_000_000],
  echelleVelocite: [1, 10_000],
  joursStructuration: [1, 30],
  joursPassage: [1, 30],
  pairsMoyenne: [1, 1_000_000],
  pairsEcartType: [1, 1_000_000],
  minutesPerAlert: [1, 240],
  analystAnnualCost: [20_000, 200_000],
  productiveHoursPerDay: [1, 8],
  workingDaysPerYear: [180, 260],
  accountsPerMonth: [100, 1_000_000_000],
  recallFloor: [0.5, 1],
};

/**
 * Les ÉCHELLES sous la forme que `score(cas, echelles)` attend : la vue de scenario.ts
 * sur ces hypothèses, dans un seul objet, pour que la mesure les passe telles quelles et
 * que le relevé scellé photographie EXACTEMENT ce sous quoi il a été mesuré.
 */
export const ECHELLES: Echelles = {
  seuilDeclaration: ASSUMPTIONS.seuilDeclaration,
  echelleMontant: ASSUMPTIONS.echelleMontant,
  echelleVelocite: ASSUMPTIONS.echelleVelocite,
  joursStructuration: ASSUMPTIONS.joursStructuration,
  joursPassage: ASSUMPTIONS.joursPassage,
  pairs: { moyenne: ASSUMPTIONS.pairsMoyenne, ecartType: ASSUMPTIONS.pairsEcartType },
};

/**
 * Le symbole d'une unité monétaire, POUR L'AFFICHAGE — le seul endroit du dépôt où le
 * couple « usd → $ » est écrit ; le site de rendu lit ce symbole, jamais sa mémoire.
 */
export function symboleDe(unite: string): string {
  if (unite.startsWith("usd")) return "$";
  throw new Error(`no display symbol declared for unit "${unite}" — declare it here rather than typing one at the render site.`);
}

/** Ce qu'une heure d'analyste coûte, dérivé des hypothèses — jamais tapé ailleurs. */
export function analystHourlyCost(a: Assumptions = ASSUMPTIONS): number {
  return a.analystAnnualCost / (a.workingDaysPerYear * a.productiveHoursPerDay);
}

/**
 * Une ligne d'hypothèse pour un rapport : la valeur, l'unité, la provenance — ensemble,
 * parce qu'un dollar affiché sans son hypothèse à côté se lit comme une mesure.
 */
export function ligneDHypothese(cle: keyof Assumptions, a: Assumptions = ASSUMPTIONS): string {
  return `${cle} = ${a[cle]} ${UNITS[cle]} (${STATUSES[cle]})`;
}
