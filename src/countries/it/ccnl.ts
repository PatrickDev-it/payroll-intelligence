/**
 * Collective agreements.
 *
 * A CCNL touches this calculation in exactly three places, and it is worth
 * being precise about which — it explains why supporting more of them is a data
 * problem and not an engineering one:
 *
 *   1. `instalments`  12, 13 or 14. Changes the MONTHLY figure, never the annual.
 *   2. `levels`       the contractual minimum, used as a validation floor only.
 *   3. `fund`         the supplementary healthcare fund — an EMPLOYER-COST line.
 *
 * It does NOT touch IRPEF, INPS, the surtaxes or the credits. Those are statute,
 * identical under every agreement.
 *
 * Italy has roughly 1,000 registered CCNLs (CNEL archive) and their pay tables
 * live in per-renewal PDFs rather than in a machine-readable register like the
 * one the Dipartimento delle Finanze keeps for surtaxes. So each one is manual
 * data entry, and only agreements whose employer fund contribution could be
 * sourced are listed here. The rest are refused, not guessed.
 */

export type CcnlLevel = {
  readonly code: string;
  readonly label: string;
  /** Monthly contractual minimum. Absent where the pay table is not loaded. */
  readonly monthlyMinimum?: string;
};

export type Ccnl = {
  readonly code: string;
  readonly name: string;
  readonly instalments: 12 | 13 | 14;
  readonly levels: readonly CcnlLevel[];
  /** Key into the IT.CCNL.FONDO_SANITARIO lookup table. */
  readonly fundKey: string;
  readonly fundNote: string;
};

export const CCNL_CATALOG: readonly Ccnl[] = [
  {
    code: "CCNL_TERZIARIO_CONFCOMMERCIO",
    name: "Terziario / Commercio",
    instalments: 14,
    fundKey: "CCNL_TERZIARIO_CONFCOMMERCIO",
    fundNote: "Fondo Est — € 12/mese a carico azienda",
    levels: [
      { code: "QUADRI", label: "Quadri", monthlyMinimum: "2183.09" },
      { code: "I", label: "1º livello", monthlyMinimum: "1966.54" },
      { code: "II", label: "2º livello", monthlyMinimum: "1701.04" },
      { code: "III", label: "3º livello", monthlyMinimum: "1453.94" },
      { code: "IV", label: "4º livello", monthlyMinimum: "1257.46" },
      { code: "V", label: "5º livello", monthlyMinimum: "1136.07" },
      { code: "VI", label: "6º livello", monthlyMinimum: "1019.94" },
      { code: "VII", label: "7º livello", monthlyMinimum: "873.22" },
    ],
  },
  {
    code: "CCNL_METALMECCANICI_INDUSTRIA",
    name: "Metalmeccanici industria",
    instalments: 13,
    fundKey: "CCNL_METALMECCANICI_INDUSTRIA",
    fundNote: "Metasalute piano BASE — € 13/mese a carico azienda",
    // The 2021 renewal renamed the levels D1–A1. Only the two endpoints of the
    // 2026 table could be sourced, so the others carry no minimum and skip the
    // validation rather than carrying an invented one.
    levels: [
      { code: "A1", label: "A1", monthlyMinimum: "2907.01" },
      { code: "B1", label: "B1" },
      { code: "B2", label: "B2" },
      { code: "B3", label: "B3" },
      { code: "C1", label: "C1" },
      { code: "C2", label: "C2" },
      { code: "C3", label: "C3" },
      { code: "D2", label: "D2" },
      { code: "D1", label: "D1", monthlyMinimum: "1784.94" },
    ],
  },
  {
    code: "CCNL_STUDI_PROFESSIONALI",
    name: "Studi professionali",
    instalments: 14,
    fundKey: "CCNL_STUDI_PROFESSIONALI",
    fundNote: "Cadiprof + Ebipro — € 27/mese a carico azienda (€ 29 meno € 2 dipendente)",
    levels: [
      { code: "1Q", label: "1º Quadri" },
      { code: "1", label: "1º livello" },
      { code: "2", label: "2º livello" },
      { code: "3S", label: "3º super" },
      { code: "3", label: "3º livello" },
      { code: "4S", label: "4º super" },
      { code: "4", label: "4º livello" },
      { code: "5", label: "5º livello" },
    ],
  },
  {
    code: "NESSUNO",
    name: "Nessuno",
    instalments: 12,
    fundKey: "NESSUNO",
    fundNote: "Nessun fondo contrattuale a carico azienda",
    levels: [],
  },
];

export const DEFAULT_CCNL = "CCNL_TERZIARIO_CONFCOMMERCIO";

/**
 * Agreements deliberately NOT offered, and why. Recorded here rather than
 * omitted silently, because "not listed" and "cannot be modelled additively"
 * are different statements.
 */
export const EXCLUDED_CCNL: readonly { name: string; reason: string }[] = [
  {
    name: "Edilizia industria",
    reason:
      "La Cassa Edile non è un costo che si somma al modello: assorbe ferie, gratifica natalizia e parte del TFR, che qui sono già contati altrove. Modellarla come un +15% produrrebbe un costo azienda doppio su quelle voci. Va modellata sostituendo quelle righe, non aggiungendone una, ed è per provincia.",
  },
  {
    name: "Turismo / Pubblici esercizi",
    reason: "Struttura compatibile, ma la quota azienda del Fondo Fast non è stata reperita.",
  },
  {
    name: "Dirigenti industria",
    reason:
      "Fasi e Previndai sono contributi rilevanti, ma i dirigenti hanno un regime previdenziale e un massimale propri: non è il profilo impiegato che questo prototipo calcola.",
  },
];

export function ccnlByCode(code: string | undefined): Ccnl | undefined {
  return CCNL_CATALOG.find((c) => c.code === code);
}

export function levelOf(ccnl: Ccnl, code: string | undefined): CcnlLevel | undefined {
  return ccnl.levels.find((l) => l.code === code);
}
