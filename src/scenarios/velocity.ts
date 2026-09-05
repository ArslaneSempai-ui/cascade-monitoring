/**
 * PALIER 2 : `velocity`. Le nombre de transactions de la fenêtre, écrasé par l'échelle
 * déclarée.
 *
 * Il ne regarde ni les montants ni les sens : uniquement COMBIEN de mouvements en trente
 * jours. Un compte qui s'agite est le deuxième signal le moins cher après un gros montant,
 * et comme `amount`, il sert de ligne de base : un scénario plus cher doit le battre.
 *
 * Échelle lue : `echelleVelocite`, et elle seule. Une fenêtre vide note 0.
 */
import { ecraser, type Scenario } from "../scenario.ts";

export const velocity: Scenario = {
  id: "velocity",
  description: "how many transactions the window holds, squashed onto [0, 1] by the declared velocity scale",
  rang: 2,
  echellesLues: ["echelleVelocite"],
  score: (cas, echelles) => ecraser(cas.fenetre.length, echelles.echelleVelocite),
};
