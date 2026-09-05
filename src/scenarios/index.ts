/**
 * LE REGISTRE DES SCÉNARIOS : rempli par le lot L1, un fichier par palier, dans l'ordre du
 * contrat. Vide au squelette : `scenarios.test.ts` rougit tant que les sept ne sont pas là,
 * et c'est ce rouge qui dit où en est le lot. `absents()` se DÉRIVE du registre : jamais
 * une liste récitée (leçon du lot E du rouge : un témoin qui récitait absents=["embed"] a
 * rougi le jour où le palier est arrivé, le mauvais rouge).
 */
import { PALIERS, type PalierId, type Registre, type Scenario } from "../scenario.ts";

const SCENARIOS: Scenario[] = [
  /* L1 : import { amount } from "./amount.ts"; … puis les sept ici, dans l'ordre du contrat */
];

export function registre(): Registre {
  const r = new Map<PalierId, Scenario>();
  for (const s of SCENARIOS) {
    if (r.has(s.id)) throw new Error(`scenario "${s.id}" registered twice`);
    r.set(s.id, s);
  }
  return r;
}

export function absents(r: Registre = registre()): PalierId[] {
  return PALIERS.filter((p) => !r.has(p));
}
