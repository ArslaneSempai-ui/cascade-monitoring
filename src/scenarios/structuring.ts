/**
 * PALIER 3 : `structuring`. Les dépôts en espèces JUSTE SOUS le seuil de déclaration,
 * accumulés sur des sous-fenêtres courtes.
 *
 * Le schéma qu'il cherche : découper une somme en dépôts qui passent chacun sous le seuil
 * de déclaration, rapprochés dans le temps. Trois refus définissent « juste sous » :
 *   · un dépôt AU seuil ou au-dessus n'est PAS de la structuration — il est déclaré, c'est
 *     l'inverse du schéma ;
 *   · un petit dépôt ordinaire non plus : la bande commence à PART_BASSE × seuil ;
 *   · une carte ou un virement non plus : la structuration au sens de ce scénario est un
 *     schéma d'ESPÈCES entrantes (channel cash, direction in).
 *
 * La somme de ces dépôts est prise sur la PIRE sous-fenêtre glissante de
 * `joursStructuration` jours, puis écrasée par le seuil de déclaration lui-même : un seul
 * dépôt à 9 400 sous un seuil de 10 000 note déjà 0,61, et cinq en trois jours notent
 * au-delà de 0,99. Échelles lues : `seuilDeclaration` et `joursStructuration`, rien d'autre.
 */
import { ecraser, type Scenario } from "../scenario.ts";

/**
 * La bande « juste sous » : [PART_BASSE × seuil, seuil). C'est la DÉFINITION du scénario,
 * comme la forme exponentielle est la définition d'`ecraser` — pas une échelle qu'un
 * client règle : la déplacer changerait ce que « structuration » veut dire ici, et le
 * rapport la cite avec le scénario. Un cinquième sous le seuil : à 10 000, la bande est
 * [8 000, 10 000), celle que les typologies publiques décrivent.
 */
export const PART_BASSE = 0.8;

const JOUR_MS = 86_400_000;

export const structuring: Scenario = {
  id: "structuring",
  description: "cash deposits sitting just under the declaration threshold, summed over short sliding sub-windows",
  rang: 3,
  echellesLues: ["seuilDeclaration", "joursStructuration"],
  score: (cas, echelles) => {
    const seuil = echelles.seuilDeclaration;
    const bande = cas.fenetre.filter((t) =>
      t.direction === "in" && t.channel === "cash" && t.amount < seuil && t.amount >= seuil * PART_BASSE);
    if (bande.length === 0) return 0;
    /* La pire sous-fenêtre glissante : deux index sur la liste triée par ts (exigerCas
       garantit le tri) ; une sous-fenêtre couvre strictement moins de joursStructuration
       jours, pour que « 7 jours » veuille dire ce qu'un analyste entend par une semaine. */
    const bornes = echelles.joursStructuration * JOUR_MS;
    let pire = 0;
    let somme = 0;
    let debut = 0;
    for (let fin = 0; fin < bande.length; fin++) {
      somme += bande[fin]!.amount;
      while (Date.parse(bande[fin]!.ts) - Date.parse(bande[debut]!.ts) >= bornes) {
        somme -= bande[debut]!.amount;
        debut++;
      }
      if (somme > pire) pire = somme;
    }
    return ecraser(pire, seuil);
  },
};
