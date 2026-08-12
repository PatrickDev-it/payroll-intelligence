/**
 * The German input surface — and it is deliberately NOT the Italian one.
 *
 * No CCNL, no comune, no INAIL class. Instead: the Steuerklasse (worth up to
 * five figures a year), the Land (church tax, and Sachsen's care split), church
 * membership, the health fund's Zusatzbeitrag, and the number of children,
 * which moves the care rate rather than the tax.
 *
 * Labels are Italian with the statutory term in parentheses (rfc/002): the
 * Italian is what a reader scans, the German is what they would quote to a
 * payroll provider or search for in the statute. `group` and `advanced` say
 * where each input belongs in the form; the form itself knows nothing about
 * German payroll.
 */

import type { EmployeeProfile, InputDescriptor } from "@engine/model/employee-profile.ts";
import { DEFAULT_LAND, LAENDER } from "./geography.ts";
import { STEUERKLASSEN, isChurchMember } from "./profile.ts";

const STEUERKLASSE_LABELS: Record<(typeof STEUERKLASSEN)[number], string> = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
};

const FAMILY_STATUS_OPTIONS = [
  {
    value: "none",
    label: "Nessun figlio",
    assigns: {
      "countryOptions.hasParentStatus": false,
      "countryOptions.qualifyingChildrenUnder25": 0,
    },
  },
  {
    value: "parent_0",
    label: "Genitore · nessuno <25",
    assigns: {
      "countryOptions.hasParentStatus": true,
      "countryOptions.qualifyingChildrenUnder25": 0,
    },
  },
  ...[1, 2, 3, 4].map((children) => ({
    value: `parent_${children}`,
    label: `${children} <25`,
    assigns: {
      "countryOptions.hasParentStatus": true,
      "countryOptions.qualifyingChildrenUnder25": children,
    },
  })),
  {
    value: "parent_5plus",
    label: "5+ <25",
    assigns: {
      "countryOptions.hasParentStatus": true,
      "countryOptions.qualifyingChildrenUnder25": 5,
    },
  },
] as const;

export function germanInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
  const churchSelected = isChurchMember((profile ?? {}) as EmployeeProfile);
  const u1Applies = profile?.companySize !== undefined && profile.companySize <= 30;

  return [
    {
      field: "grossAnnual",
      label: "Retribuzione annua lorda",
      shortLabel: "Lordo annuo",
      kind: "money",
      required: true,
      group: "pay",
      min: 1,
      max: 1_000_000,
      help: "Bruttojahresgehalt: lordo annuo prima di imposte e contributi. Non è il costo per l'azienda.",
    },
    {
      field: "region",
      label: "Land",
      kind: "select",
      required: true,
      group: "location",
      defaultValue: DEFAULT_LAND,
      options: LAENDER.map((land) => ({ value: land.code, label: land.label })),
      help: "La Germania non ha imposta regionale sul reddito. Il Land determina solo l'aliquota della Kirchensteuer (8% in Baviera e Baden-Württemberg, 9% altrove) e, in Sassonia, il riparto del contributo Pflege.",
    },
    {
      field: "countryOptions.steuerklasse",
      label: "Steuerklasse",
      kind: "select",
      required: true,
      group: "profile",
      defaultValue: "I",
      options: STEUERKLASSEN.map((code) => ({ value: code, label: STEUERKLASSE_LABELS[code] })),
      help: "I: single; II: genitore solo; III: coniuge monoreddito con tariffa Splitting; IV: coniugi entrambi con reddito. Le classi V e VI non sono modellate.",
    },
    {
      field: "countryOptions.churchMember",
      label: "Kirchensteuer",
      kind: "select",
      required: true,
      group: "location",
      defaultValue: "no",
      options: [
        { value: "no", label: "No" },
        { value: "yes", label: "Sì" },
      ],
      help: churchSelected
        ? "8% o 9% della Lohnsteuer, secondo il Land."
        : "L'imposta di culto è dovuta solo da chi è iscritto a una confessione che la riscuote.",
    },
    {
      field: "countryOptions.familyStatus",
      label: "Genitorialità e figli <25",
      shortLabel: "Figli (Pflege)",
      kind: "select",
      required: true,
      group: "profile",
      defaultValue: "none",
      options: FAMILY_STATUS_OPTIONS,
      help: "La qualità di genitore evita il supplemento per chi è senza figli; separatamente, dal secondo al quinto figlio sotto i 25 anni la Pflegeversicherung scende di 0,25 punti per figlio.",
      source: "§ 55 Abs. 3 SGB XI; dati familiari comunicati al datore di lavoro.",
    },
    {
      field: "countryOptions.hasParentStatus",
      label: "Qualità di genitore",
      kind: "boolean",
      required: true,
      group: "profile",
      hidden: true,
    },
    {
      field: "countryOptions.qualifyingChildrenUnder25",
      label: "Figli rilevanti sotto i 25 anni",
      kind: "integer",
      required: true,
      group: "profile",
      hidden: true,
      min: 0,
      max: 5,
    },
    {
      field: "age",
      label: "Età",
      kind: "integer",
      required: false,
      group: "profile",
      defaultValue: 30,
      min: 15,
      max: 75,
      help: "Serve solo per il supplemento Pflegeversicherung a carico di chi non ha figli, dovuto dai 23 anni.",
    },
    {
      field: "countryOptions.zusatzbeitrag",
      label: "Zusatzbeitrag",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: "average",
      options: [
        { value: "low", label: "Basso" },
        { value: "average", label: "Medio" },
        { value: "high", label: "Alto" },
      ],
      help: "Basso 2,2%, Medio 2,9% nel 2026, Alto 4,3%. È fissato dalla cassa e diviso a metà con l'azienda.",
    },
    {
      field: "countryOptions.zusatzbeitragRatePercent",
      label: "Zusatz esatto",
      kind: "decimal",
      required: false,
      group: "company",
      advanced: true,
      min: 0,
      max: 10,
      help: "Aliquota Zusatzbeitrag complessiva della Krankenkasse. Se inserita sostituisce la fascia indicativa ed è divisa a metà.",
      source: "Beitragssatz 2026 pubblicato dalla Krankenkasse del lavoratore.",
    },
    {
      field: "countryOptions.unfallRiskClass",
      label: "Gefahrtarif",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: "office",
      options: [
        { value: "office", label: "Ufficio" },
        { value: "retail", label: "Commercio" },
        { value: "manufacturing", label: "Industria" },
        { value: "construction", label: "Edilizia" },
      ],
      help: "Valori indicativi: Ufficio 0,5%, Commercio 0,9%, Industria 1,5%, Edilizia 3,5%. Il tasso reale è fissato dalla Berufsgenossenschaft.",
    },
    {
      field: "countryOptions.unfallRatePercent",
      label: "Unfall esatta",
      kind: "decimal",
      required: false,
      group: "company",
      advanced: true,
      min: 0,
      max: 20,
      help: "Se inserita, sostituisce la classe con l'aliquota effettiva della Berufsgenossenschaft.",
      source: "Bescheid della Berufsgenossenschaft aziendale.",
    },
    {
      field: "companySize",
      label: "Addetti rilevanti U1",
      shortLabel: "Addetti U1",
      kind: "integer",
      required: true,
      group: "company",
      min: 1,
      max: 1_000_000,
      help: "Conteggio AAG per la verifica U1: in genere il datore partecipa se impiega non più di 30 lavoratori; apprendisti, persone con disabilità grave e part-time hanno regole di conteggio specifiche.",
      source: "§ 1 AAG e Deutsche Rentenversicherung, Ausgleichsverfahren U1.",
    },
    ...(u1Applies
      ? [
          {
            field: "countryOptions.u1RatePercent",
            label: "U1 esatta",
            kind: "decimal" as const,
            required: true,
            group: "company" as const,
            advanced: true,
            min: 0,
            max: 10,
            help: "Aliquota U1 del tariffario scelto presso la Krankenkasse. È obbligatoria quando il conteggio AAG è 30 o meno.",
            source: "Umlagesatz U1 e tariffa di rimborso pubblicati dalla Krankenkasse aziendale.",
          },
        ]
      : []),
    {
      field: "countryOptions.u2RatePercent",
      label: "U2 esatta",
      kind: "decimal",
      required: false,
      group: "company",
      advanced: true,
      min: 0,
      max: 5,
      help: "Aliquota Umlage U2 della Krankenkasse. Se inserita sostituisce il valore medio.",
      source: "Umlagesatz U2 pubblicato dalla Krankenkasse aziendale.",
    },
  ];
}
