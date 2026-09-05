/**
 * PALIER 7 : `peer`. L'écart au profil d'un groupe de pairs DÉCLARÉ — une hypothèse, et
 * elle est nommée comme telle.
 *
 * Ce que les six autres ne demandent pas : « et par rapport aux comptes COMME lui ? ».
 * Le profil de pairs (moyenne et écart-type du montant d'une transaction) vient
 * d'`assumptions.ts` avec sa provenance ; il n'est PAS mesuré ici, et le rapport le dit.
 * Le scénario note l'écart ABSOLU du montant moyen de la fenêtre à cette moyenne de
 * pairs, en écarts-types de pairs : un compte très au-dessus ET un compte très au-dessous
 * de son groupe sont tous deux hors profil — c'est l'écart qui inquiète, pas le sens.
 *
 * Le contrat tranche le cas sans historique : 0, compté « sans historique » à part. La
 * raison est honnête : sans aucun passé, rien n'étaye que ce compte appartient au groupe
 * de pairs supposé, et un écart mesuré contre un groupe non étayé serait une hypothèse
 * déguisée en mesure. Même z écrasé par la même barre que `zscore` (Z_BARRE = 3), pour
 * que deux scores « en écarts-types » se lisent sur la même règle. L'écart-type de pairs
 * est plancheré à 1 unité de devise, comme dans `zscore`.
 *
 * Échelle lue : `pairs`, et elle seule.
 */
import { ecraser, type Scenario } from "../scenario.ts";
import { Z_BARRE } from "./zscore.ts";

export const peer: Scenario = {
  id: "peer",
  description: "how far the window's mean amount sits from a declared peer-group profile, in peer standard deviations",
  rang: 7,
  echellesLues: ["pairs"],
  score: (cas, echelles) => {
    if (cas.historique.length === 0 || cas.fenetre.length === 0) return 0;
    let somme = 0;
    for (const t of cas.fenetre) somme += t.amount;
    const moyenneFenetre = somme / cas.fenetre.length;
    const z = Math.abs(moyenneFenetre - echelles.pairs.moyenne) / Math.max(echelles.pairs.ecartType, 1);
    return ecraser(z, Z_BARRE);
  },
};
