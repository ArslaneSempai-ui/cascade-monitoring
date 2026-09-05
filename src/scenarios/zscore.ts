/**
 * PALIER 5 : `zscore`. Le pic de la fenêtre, rapporté à ce que CE compte faisait AVANT.
 *
 * Le premier scénario relatif : il ne compare pas à une échelle déclarée mais à
 * l'historique du compte lui-même — moyenne et écart-type des montants d'avant la
 * fenêtre. Un pic à 9 000 est banal pour un négoce et criant pour un compte qui vivait à
 * 1 200 ± 20 : c'est exactement ce que les quatre scénarios absolus ne savent pas voir
 * (l'archétype « compte dormant qui s'éveille »).
 *
 * Le contrat tranche le cas sans historique : le scénario rend 0, et le rapport compte
 * ces cas « sans historique » à part — un 0 ici n'est pas « ce compte est sain », c'est
 * « ce scénario n'a rien pour juger ». Moins de deux transactions d'historique, même
 * verdict : un écart-type ne se calcule pas sur un point.
 *
 * Le z est écrasé par Z_BARRE = 3 : trois écarts-types est LA barre classique de
 * l'aberration — une constante de définition (le z est sans dimension, il porte sa propre
 * échelle), pas une hypothèse client. À z = 3 le score vaut 0,63 ; à z = 9, 0,95.
 * L'écart-type est plancheré à 1 unité de devise : un historique parfaitement constant
 * rendrait sinon un z infini.
 *
 * Échelles lues : AUCUNE — tout vient du cas lui-même.
 */
import { ecraser, type Scenario } from "../scenario.ts";

/** Trois sigmas, la barre classique : constante de définition, voir l'en-tête. */
export const Z_BARRE = 3;

export const zscore: Scenario = {
  id: "zscore",
  description: "the window's peak amount measured in standard deviations above this account's own pre-window history",
  rang: 5,
  echellesLues: [],
  score: (cas) => {
    if (cas.historique.length < 2) return 0;
    let somme = 0;
    for (const t of cas.historique) somme += t.amount;
    const moyenne = somme / cas.historique.length;
    let carres = 0;
    for (const t of cas.historique) carres += (t.amount - moyenne) ** 2;
    const ecartType = Math.max(Math.sqrt(carres / cas.historique.length), 1);
    let pic = 0;
    for (const t of cas.fenetre) if (t.amount > pic) pic = t.amount;
    const z = (pic - moyenne) / ecartType;
    return z <= 0 ? 0 : ecraser(z, Z_BARRE);
  },
};
