/**
 * The Italian input surface — what the form asks for, and why.
 *
 * This is data, not UI. It is a FUNCTION of the profile because the form
 * cascades: the level options depend on the CCNL chosen, and the instalment
 * default comes from it too. A static list could not express that without the
 * component learning what a CCNL is.
 */

import type { EmployeeProfile, InputDescriptor } from "@engine/model/employee-profile.ts";

/** The CCNL tables store an exact decimal string; a reader wants "€ 1.453,94". */
const MONTHLY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  useGrouping: true,
});
const MONTHLY_COMPACT = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
import { CCNL_CATALOG, DEFAULT_CCNL, ccnlByCode } from "./ccnl.ts";
import {
  DEFAULT_MUNICIPALITY,
  DEFAULT_REGION,
  LOCATIONS,
  MUNICIPALITIES,
  REGIONS,
} from "./geography.ts";
import { PENSION_CEILING_STATUSES } from "./profile.ts";
import { ITALIAN_INAIL_RISK_OPTIONS } from "./inail.ts";

export function italianInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
  const ccnl = ccnlByCode(profile?.collectiveAgreement) ?? ccnlByCode(DEFAULT_CCNL)!;
  const hasMinimums = ccnl.levels.some((l) => l.monthlyMinimum);
  const selectedLevel = ccnl.levels.find((level) => level.code === profile?.jobLevel);

  return [
    {
      field: "grossAnnual",
      label: "RAL",
      kind: "money",
      required: true,
      group: "pay",
      min: 1,
      max: 1_000_000,
      help: "Lordo annuo prima di contributi e imposte. Non è il costo per l'azienda.",
      example: "Con una RAL di 45.000 €, il motore parte da 45.000 € annui: mensilità e netto sono risultati derivati, non altri input.",
      source: "Contratto individuale e Certificazione Unica (CU).",
    },
    {
      field: "region",
      label: "Regione",
      kind: "select",
      required: true,
      group: "location",
      hidden: true,
      defaultValue: DEFAULT_REGION,
      options: REGIONS.map((r) => ({ value: r.key, label: r.label })),
      help: "Determina l'addizionale regionale. P.A. indica Provincia autonoma. Su € 45.000 la differenza fra la regione più economica e la più cara è di € 553 l'anno.",
      example: "A parità di RAL, Lombardia e Campania applicano scale regionali diverse: per questo la regione modifica il netto.",
      source: "Dipartimento delle Finanze — addizionali regionali IRPEF 2026.",
    },
    {
      field: "municipality",
      label: "Comune",
      kind: "select",
      required: true,
      group: "location",
      hidden: true,
      defaultValue: DEFAULT_MUNICIPALITY,
      options: MUNICIPALITIES.map((m) => ({ value: m.key, label: m.label })),
      help: "Sopra la soglia di esenzione l'aliquota colpisce l'intero imponibile, non l'eccedenza: è un dirupo, non una franchigia.",
      example: "A Milano, superata la soglia di esenzione, lo 0,8% si applica all'intero imponibile comunale.",
      source: "Dipartimento delle Finanze e delibera comunale applicabile per il 2026.",
    },
    {
      field: "location",
      label: "Comune / città",
      shortLabel: "Località",
      kind: "select",
      required: true,
      group: "location",
      options: LOCATIONS.map((location) => ({
        value: location.key,
        label: location.label,
        assigns: {
          region: location.regionKey,
          municipality: location.municipalityKey,
        },
      })),
      help: "Un'unica scelta mantiene sempre coerenti addizionale regionale e comunale. Le località elencate hanno una regola comunale 2026 nel dataset; scegli Nessuna quando vuoi applicare soltanto l'addizionale regionale.",
      example: "Lazio · Roma seleziona insieme il Lazio e Roma. Lombardia · Nessuna applica la regola regionale lombarda senza stimare un'aliquota comunale non caricata.",
      source: "Dipartimento delle Finanze — addizionali regionali e comunali IRPEF 2026.",
    },
    {
      field: "countryOptions.pensionCeilingStatus",
      label: "Massimale contributivo",
      shortLabel: "Massimale IVS",
      kind: "select",
      required: true,
      group: "profile",
      defaultValue: PENSION_CEILING_STATUSES[0],
      options: [
        { value: "unknown", label: "Da verificare" },
        { value: "subject", label: "Applicabile" },
        { value: "not_subject", label: "Non applicabile" },
      ],
      help: "Il massimale INPS di 122.295 € vale in genere per chi è privo di anzianità contributiva al 31 dicembre 1995 o ha esercitato l'opzione contributiva. Oltre la soglia il sistema rifiuta il calcolo finché questo dato non è confermato.",
      example: "Un dipendente già assicurato nel 1995 normalmente seleziona Non applicabile; un primo iscritto dal 1996 seleziona Applicabile.",
      source: "L. 335/1995 art. 2 c. 18 e Circolare INPS n. 6/2026.",
    },
    {
      field: "collectiveAgreement",
      label: "CCNL",
      kind: "select",
      required: false,
      group: "company",
      defaultValue: DEFAULT_CCNL,
      options: CCNL_CATALOG.map((c) => ({ value: c.code, label: c.name })),
      help: `Terziario / Commercio indica il CCNL Confcommercio; Nessuno non applica un fondo sanitario contrattuale. Il CCNL determina mensilità, minimo e fondo aziendale, non le imposte. ${ccnl.fundNote}.`,
      example: "Il CCNL Terziario / Commercio prevede 14 mensilità; Metalmeccanici industria ne prevede 13.",
      source: "Testo e tabelle retributive del CCNL selezionato.",
    },
    {
      field: "payPeriods",
      label: "Mensilità",
      kind: "select",
      required: true,
      group: "pay",
      defaultValue: ccnl.instalments,
      options: [
        { value: "12", label: "12" },
        { value: "13", label: "13" },
        { value: "14", label: "14" },
      ],
      help: `Il CCNL ${ccnl.name} ne prevede ${ccnl.instalments}. Cambia il valore mensile, mai quello annuo.`,
      example: "30.000 € netti annui equivalgono a 2.500 € su 12 mensilità oppure circa 2.143 € su 14.",
      source: "Numero di mensilità previsto dal CCNL selezionato.",
    },
    {
      field: "companySize",
      label: "N. dipendenti",
      kind: "integer",
      required: false,
      group: "company",
      defaultValue: 20,
      min: 1,
      max: 500_000,
      help: "Determina l'aliquota FIS (0,50% fino a 5, 0,80% oltre) e il Fondo Tesoreria a 50.",
      example: "Il passaggio da 49 a 50 dipendenti attiva il versamento del TFR al Fondo Tesoreria INPS.",
      source: "INPS — Fondo di integrazione salariale e Fondo Tesoreria.",
    },
    {
      field: "jobLevel",
      label: "Livello",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: ccnl.levels.at(-1)?.code ?? "",
      options:
        ccnl.levels.length > 0
          ? ccnl.levels.map((l) => ({
              value: l.code,
              label: compactLevelLabel(l.label, l.monthlyMinimum),
            }))
          : [{ value: "", label: "Nessuno" }],
      help: selectedLevel?.monthlyMinimum
        ? `${selectedLevel.label}: minimo contrattuale ${MONTHLY.format(Number(selectedLevel.monthlyMinimum))} al mese. Serve solo a verificare la RAL; non cambia imposte né contributi.`
        : hasMinimums
          ? "Il minimo contrattuale dipende dal livello selezionato. Serve solo a verificare la RAL; non cambia imposte né contributi."
        : "Tabella retributiva non ancora caricata per questo CCNL, quindi nessun controllo sul minimo.",
      example: "7º · min 873 € significa livello 7 con minimo tabellare mensile arrotondato; il controllo usa comunque il valore esatto di 873,22 €.",
      source: "Tabella retributiva vigente del CCNL selezionato.",
    },
    {
      field: "contractType",
      label: "Tipo di contratto",
      shortLabel: "Contratto",
      kind: "select",
      required: true,
      group: "company",
      defaultValue: "permanent",
      options: [
        { value: "permanent", label: "Indeterminato" },
        { value: "fixed_term", label: "Determinato" },
      ],
      help: "Il determinato aggiunge l'1,40% NASpI al costo aziendale; il netto del dipendente non cambia.",
      example: "Due dipendenti con la stessa RAL hanno lo stesso netto; il determinato costa di più all'azienda per il contributo addizionale.",
      source: "INPS — contributo addizionale NASpI sui rapporti a termine.",
    },
    {
      field: "countryOptions.inailRiskClass",
      label: "INAIL",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: "office",
      options: ITALIAN_INAIL_RISK_OPTIONS,
      help: "Valori indicativi: Ufficio 4‰, Commercio 15‰, Industria 40‰, Edilizia 90‰. Il tasso reale dipende dall'azienda e resta sperimentale.",
      example: "Su 45.000 € di RAL, 4‰ vale circa 180 € annui; 90‰ circa 4.050 €. È un parametro aziendale, non personale.",
      source: "INAIL — Tariffe dei premi, D.M. 27 febbraio 2019 e autoliquidazione aziendale.",
    },
    {
      field: "countryOptions.inailRatePercent",
      label: "INAIL",
      kind: "decimal",
      required: false,
      group: "company",
      advanced: true,
      min: 0,
      max: 13,
      help: "Se inserito, sostituisce lo scenario INAIL con il tasso percentuale effettivo notificato alla PAT aziendale.",
      example: "Un tasso del 4 per mille va inserito come 0,4%.",
      source: "Comunicazione del tasso applicabile alla PAT e autoliquidazione INAIL aziendale.",
    },
  ];
}

function compactLevelLabel(label: string, monthlyMinimum: string | undefined): string {
  const level = label.replace(/ livello$/i, "");
  return monthlyMinimum
    ? `${level} · min ${MONTHLY_COMPACT.format(Number(monthlyMinimum))}`
    : level;
}
