/**
 * PALIER 6 : `passthrough`. Le ratio sortant/entrant, et le temps de séjour des fonds.
 *
 * Le schéma : un compte-relais. L'argent entre, ressort presque entièrement, et vite.
 * Deux facteurs, MULTIPLIÉS (il faut les deux, un seul ne fait pas un relais) :
 *   · le RATIO : la valeur sortie rapportée à la valeur entrée, plafonné à 1 — un compte
 *     qui sort plus qu'il n'entre dans la fenêtre vidait un solde, pas un flux ;
 *   · le SÉJOUR : la part de la valeur sortie qui a séjourné au plus `joursPassage` jours.
 *     L'appariement est premier-entré, premier-sorti sur la fenêtre triée : chaque unité
 *     sortie est rattachée aux entrées les plus anciennes non encore consommées — la
 *     convention comptable la plus simple, déterministe, et déclarée ici. Une sortie sans
 *     entrée préalable dans la fenêtre n'est pas appariée : elle vidait un solde d'avant,
 *     et ne compte ni rapide ni lente.
 *
 * Une paie dépensée au fil du mois note bas (séjour long) ; un aller-retour dans la
 * journée note près de 1 × 1. Fenêtre vide, ou sans entrée, ou sans sortie appariée : 0.
 *
 * Échelle lue : `joursPassage`, et elle seule.
 */
import type { Scenario } from "../scenario.ts";

const JOUR_MS = 86_400_000;

export const passthrough: Scenario = {
  id: "passthrough",
  description: "how much of what came in went back out, and how briefly the funds stayed (first-in, first-out)",
  rang: 6,
  echellesLues: ["joursPassage"],
  score: (cas, echelles) => {
    const delai = echelles.joursPassage * JOUR_MS;
    let entrant = 0;
    let sortant = 0;
    /* La file des entrées non consommées : { instant, reste }. exigerCas garantit le tri. */
    const file: { instant: number; reste: number }[] = [];
    let tete = 0;
    let valeurAppariee = 0;
    let valeurRapide = 0;
    for (const t of cas.fenetre) {
      if (t.direction === "in") {
        entrant += t.amount;
        file.push({ instant: Date.parse(t.ts), reste: t.amount });
        continue;
      }
      sortant += t.amount;
      let aApparier = t.amount;
      const instantSortie = Date.parse(t.ts);
      while (aApparier > 0 && tete < file.length) {
        const e = file[tete]!;
        const pris = Math.min(aApparier, e.reste);
        e.reste -= pris;
        aApparier -= pris;
        valeurAppariee += pris;
        if (instantSortie - e.instant <= delai) valeurRapide += pris;
        if (e.reste === 0) tete++;
      }
    }
    if (entrant === 0 || valeurAppariee === 0) return 0;
    const ratio = Math.min(sortant / entrant, 1);
    const sejourCourt = valeurRapide / valeurAppariee;
    return ratio * sejourCourt;
  },
};
