/**
 * PALIER 1 : `amount`. Le plus gros montant de la fenêtre, écrasé par l'échelle déclarée.
 *
 * Le scénario le plus bête du contrat, et c'est sa fonction : il est la ligne de base que
 * les six autres doivent battre pour justifier leur coût. S'il suffit à un seuil donné,
 * l'outil le dira, et c'est une économie, pas une déception.
 *
 * Échelle lue : `echelleMontant`, et elle seule. L'écrasement est celui de la maison
 * (`ecraser` : 1 - exp(-x / échelle)) — à l'échelle le score vaut 0,63, au triple 0,95.
 * Une fenêtre vide note 0 : aucun montant, aucune inquiétude que CE scénario sache voir.
 */
import { ecraser, type Scenario } from "../scenario.ts";

export const amount: Scenario = {
  id: "amount",
  description: "the largest single amount in the window, squashed onto [0, 1] by the declared amount scale",
  rang: 1,
  echellesLues: ["echelleMontant"],
  score: (cas, echelles) => {
    let pic = 0;
    for (const t of cas.fenetre) if (t.amount > pic) pic = t.amount;
    return ecraser(pic, echelles.echelleMontant);
  },
};
