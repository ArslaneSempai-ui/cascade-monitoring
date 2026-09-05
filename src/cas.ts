/**
 * LE CAS : l'unité que l'outil note. Un compte, sur une fenêtre de trente jours, avec ses
 * transactions dans la fenêtre et son historique avant elle (jusqu'à cent quatre-vingts
 * jours) pour les scénarios relatifs. C'est la couture entre les lots avec `scenario.ts` :
 * les scénarios (L1) lisent un Cas, les cas écrits et générés (L2) produisent des Cas, la
 * mesure client (L3) reconstruit des Cas depuis les deux CSV du client.
 *
 * Les dates sont des chaînes ISO ; les montants sont positifs ; la direction dit le sens
 * pour le compte (`in` : l'argent arrive, `out` : il part). Rien ici n'est une valeur du
 * client qui pourrait ressortir : un Cas vit en mémoire, le rapport n'en cite que le verdict.
 */

export type Direction = "in" | "out";
export const DIRECTIONS = ["in", "out"] as const;

export type Channel = "cash" | "wire" | "card" | "transfer" | "other";
export const CHANNELS = ["cash", "wire", "card", "transfer", "other"] as const;

export interface Transaction {
  /** date-heure ISO 8601 */
  ts: string;
  /** montant strictement positif, dans la devise du compte */
  amount: number;
  direction: Direction;
  channel: Channel;
  /** ISO 3166-1 alpha-2 de la contrepartie, quand il est connu */
  country?: string;
}

export interface Cas {
  /** l'alert_id du client, ou l'identifiant du cas écrit (jamais un account_id) */
  id: string;
  /** les transactions DANS la fenêtre de trente jours qui finit à finFenetre, triées par ts croissant */
  fenetre: Transaction[];
  /** les transactions AVANT la fenêtre (jusqu'à cent quatre-vingts jours), triées ; vide si inconnu */
  historique: Transaction[];
  /** le dernier jour de la fenêtre, ISO (AAAA-MM-JJ) */
  finFenetre: string;
}

/** La fenêtre, en jours, et la profondeur de l'historique : les deux constantes du contrat. */
export const JOURS_FENETRE = 30;
export const JOURS_HISTORIQUE = 180;

/** Un Cas mal formé est un défaut de celui qui l'a produit, pas une donnée : on le nomme. */
export function exigerCas(c: Cas): Cas {
  if (!c.id) throw new Error("a case needs an id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.finFenetre)) {
    throw new Error(`case "${c.id}": finFenetre must be an ISO day (YYYY-MM-DD), got "${c.finFenetre}"`);
  }
  for (const [nom, liste] of [["fenetre", c.fenetre], ["historique", c.historique]] as const) {
    let precedent = "";
    for (const t of liste) {
      if (!(t.amount > 0) || !Number.isFinite(t.amount)) {
        throw new Error(`case "${c.id}", ${nom}: an amount must be a positive finite number`);
      }
      if (!DIRECTIONS.includes(t.direction)) throw new Error(`case "${c.id}", ${nom}: direction "${t.direction}" is not in/out`);
      if (!CHANNELS.includes(t.channel)) throw new Error(`case "${c.id}", ${nom}: channel "${t.channel}" is not one of ${CHANNELS.join("/")}`);
      if (Number.isNaN(Date.parse(t.ts))) throw new Error(`case "${c.id}", ${nom}: unreadable timestamp "${t.ts}"`);
      if (precedent && t.ts < precedent) throw new Error(`case "${c.id}", ${nom}: transactions must be sorted by ts`);
      precedent = t.ts;
    }
  }
  return c;
}
