/**
 * PALIER 4 : `round`. La part de montants ronds, et la rapidité entrée → sortie.
 *
 * Deux signatures d'argent qui ne vient pas d'une activité réelle :
 *   · les montants RONDS — une paie fait 2 347,18, un commerce fait 89,90 ; les montants
 *     inventés font 2 000 tout rond. « Rond » : multiple exact de 100, la DÉFINITION du
 *     scénario (comme la bande de `structuring`), pas une échelle réglable ;
 *   · les sorties RAPIDES — une sortie qui suit une entrée de moins de `joursPassage`
 *     jours : l'argent ne séjourne pas, il transite.
 *
 * Le score est la moyenne des deux parts : la part de transactions rondes dans la fenêtre,
 * et la part des sorties qui suivent une entrée de près. Chacune vit dans [0, 1] ; leur
 * moyenne aussi. Un compte qui n'a que l'une des deux signatures plafonne à 0,5 : il faut
 * les deux pour inquiéter ce scénario en haut de la grille — c'est voulu, chaque moitié
 * seule a trop de sosies bénins (les loyers sont ronds ; les achats suivent les paies).
 *
 * Échelle lue : `joursPassage`, et elle seule. Une fenêtre vide note 0.
 */
import type { Scenario } from "../scenario.ts";

const JOUR_MS = 86_400_000;

/** Multiple exact de 100 : la division rend un entier, ce qui évite le modulo flottant. */
const estRond = (montant: number): boolean => Number.isInteger(montant / 100);

export const round: Scenario = {
  id: "round",
  description: "the share of round amounts, and how many outgoings follow an incoming within the declared pass-through delay",
  rang: 4,
  echellesLues: ["joursPassage"],
  score: (cas, echelles) => {
    if (cas.fenetre.length === 0) return 0;
    const ronds = cas.fenetre.filter((t) => estRond(t.amount)).length;
    const partRonde = ronds / cas.fenetre.length;

    const delai = echelles.joursPassage * JOUR_MS;
    let sorties = 0;
    let rapides = 0;
    let derniereEntree = Number.NEGATIVE_INFINITY;
    for (const t of cas.fenetre) {
      if (t.direction === "in") { derniereEntree = Date.parse(t.ts); continue; }
      sorties++;
      if (Date.parse(t.ts) - derniereEntree <= delai) rapides++;
    }
    const partRapide = sorties === 0 ? 0 : rapides / sorties;

    return (partRonde + partRapide) / 2;
  },
};
