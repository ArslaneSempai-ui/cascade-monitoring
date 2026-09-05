/**
 * LA COUTURE ENTRE LES LOTS : ce que tout scénario promet, et rien de plus.
 *
 * Trois lots construisent en parallèle : les scénarios (src/scenarios/), les cas écrits et
 * générés (cas-etiquetes.json, synthetic.ts), la mesure client et la frontière
 * (your-alerts.ts, optimise.ts). Ils ne se parlent que par ce fichier et par `cas.ts`. Une
 * interface décrite en prose est une intention ; celle-ci est du code, et les tests des
 * trois lots l'importent.
 *
 * Un scénario rend un SCORE dans [0, 1] pour un cas, déterministe, sans réseau, sans état.
 * Le seuil n'est pas dans le scénario : il est balayé par la mesure (SEUILS), parce que la
 * question de l'outil est précisément « à quel seuil ». Les ÉCHELLES qui écrasent un brut
 * (un montant, un compte) vers [0, 1] ne sont pas non plus dans le scénario : elles sont
 * déclarées, avec leur provenance, dans assumptions.ts (lot L3), et passées ici. Un
 * scénario qui inventerait la sienne cacherait une hypothèse dans du code.
 */
import type { Cas } from "./cas.ts";

export type Score = number;   /* dans [0, 1] ; 1 = le cas le plus suspect que le scénario sache voir */

/** Les échelles déclarées (assumptions.ts) que les scénarios lisent. Chaque scénario dit,
 *  dans son fichier, lesquelles il consomme ; il n'en lit aucune autre. */
export interface Echelles {
  /** le seuil de déclaration des espèces (10 000 par défaut) : la structuration vit juste dessous */
  seuilDeclaration: number;
  /** le montant au-delà duquel `amount` tend vers 1 : score = 1 - exp(-montant / echelleMontant) */
  echelleMontant: number;
  /** le nombre de transactions au-delà duquel `velocity` tend vers 1 */
  echelleVelocite: number;
  /** la sous-fenêtre de structuration, en jours (7 par défaut) */
  joursStructuration: number;
  /** le délai de passage entrée → sortie, en jours (3 par défaut) */
  joursPassage: number;
  /** le profil de pairs par défaut : moyenne et écart-type du montant, quand le client n'en donne pas */
  pairs: { moyenne: number; ecartType: number };
}

export interface Scenario {
  /** identifiant stable, celui du contrat */
  readonly id: PalierId;
  /** une phrase, pour le rapport : ce que le scénario regarde, sans jargon */
  readonly description: string;
  /** le coût relatif, du plus bête (1) au plus cher (7) ; sert à ordonner la frontière */
  readonly rang: number;
  /** les échelles que ce scénario lit : nommées, pour que la relecture voie ce qui est supposé */
  readonly echellesLues: readonly (keyof Echelles)[];
  score(cas: Cas, echelles: Echelles): Score;
}

/** Les paliers du contrat, dans l'ordre du coût. Un huitième palier appris (modèle local)
 *  est nommé ABSENT tant qu'il n'existe pas : il ne sera jamais deviné. */
export const PALIERS = ["amount", "velocity", "structuring", "round", "zscore", "passthrough", "peer"] as const;
export type PalierId = (typeof PALIERS)[number];

/** La grille de seuils balayée par la mesure : 0,50 → 1,00 par pas de 0,01, arrondie au
 *  centième pour que deux lots qui la recalculent obtiennent les MÊMES nombres. */
export const SEUILS: readonly number[] = Array.from({ length: 51 }, (_, i) => Math.round((0.5 + i * 0.01) * 100) / 100);

/** Un score hors de [0, 1] est un défaut du scénario, pas une valeur : on le nomme. */
export function exigerScore(s: number, id: string, cas: Cas): Score {
  if (!Number.isFinite(s) || s < 0 || s > 1) {
    throw new Error(`scenario "${id}" returned ${s} for case "${cas.id}"; a score lives in [0, 1].`);
  }
  return s;
}

/** L'écrasement commun d'un brut positif vers [0, 1] : 1 - exp(-x / echelle). À l'échelle,
 *  le score vaut 0,63 ; au triple, 0,95. Un seul endroit pour que tous les scénarios
 *  écrasent pareil, et que le rapport puisse l'expliquer en une phrase. */
export function ecraser(x: number, echelle: number): Score {
  if (!(echelle > 0)) throw new Error(`ecraser: a scale must be positive, got ${echelle}`);
  if (!(x >= 0)) return 0;
  return 1 - Math.exp(-x / echelle);
}

/** Le registre : le lot des scénarios l'alimente dans src/scenarios/index.ts ; la mesure
 *  l'importe. Vide au départ, et un test du lot exige qu'il porte les sept paliers. */
export type Registre = ReadonlyMap<PalierId, Scenario>;
