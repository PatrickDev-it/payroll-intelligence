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

  const fisEligibilityInputs: readonly InputDescriptor[] =
    profile?.companySize !== undefined && profile.companySize <= 5
      ? [
          {
            field: "countryOptions.fisReducedRateEligible",
            label: "Riduzione FIS",
            kind: "select",
            required: true,
            group: "company",
            options: [
              { value: "eligible", label: "Spetta" },
              { value: "not_eligible", label: "Non spetta" },
            ],
            help: "Per i datori fino a 5 dipendenti la riduzione richiede che non sia stata presentata alcuna domanda FIS nei 24 mesi precedenti. Il motore non può dedurlo dall'organico.",
            example: "Se l'azienda ha usato il FIS negli ultimi 24 mesi, seleziona Non spetta.",
            source: "INPS — Fondo di integrazione salariale, riduzione contributiva dal 2025.",
          },
        ]
      : [];

  const fixedTermInputs: readonly InputDescriptor[] =
    profile?.contractType === "fixed_term"
      ? [
          {
            field: "countryOptions.naspiApplicability",
            label: "NASpI aggiuntiva",
            kind: "select",
            required: true,
            group: "company",
            options: [
              { value: "ordinary", label: "Dovuta" },
              { value: "exempt", label: "Esente" },
            ],
            help: "I rapporti a termine ordinari versano il contributo addizionale; alcune fattispecie sono escluse e devono essere dichiarate esplicitamente.",
            example: "Un normale contratto a termine seleziona Dovuta; un rapporto compreso in un'esenzione di legge seleziona Esente.",
            source: "L. 92/2012 art. 2 cc. 28-30 e istruzioni INPS NASpI.",
          },
          {
            field: "countryOptions.naspiRenewalCount",
            label: "Rinnovi a termine",
            kind: "integer",
            required: true,
            group: "company",
            min: 0,
            max: 100,
            help: "Ogni rinnovo aggiunge 0,50 punti percentuali al contributo addizionale NASpI. Una proroga non è un rinnovo.",
            example: "Primo contratto: 0. Contratto cessato e poi rinnovato due volte: 2.",
            source: "D.L. 87/2018 art. 3 c. 2 e Circolare INPS n. 121/2019.",
          },
        ]
      : [];

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
      required: true,
      group: "company",
      defaultValue: 20,
      min: 1,
      max: 500_000,
      help: "Media dei dipendenti del semestre precedente: determina la fascia FIS fino a 5 oppure oltre 5. Non determina la destinazione del TFR.",
      example: "Una media semestrale di 5 usa la fascia FIS piccola; una media di 6 usa la fascia oltre 5.",
      source: "INPS — Fondo di integrazione salariale (FIS).",
    },
    ...fisEligibilityInputs,
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
      help: "Il determinato può aggiungere il contributo NASpI al costo aziendale; applicabilità e rinnovi sono richiesti nel passaggio successivo.",
      example: "Due dipendenti con la stessa RAL hanno lo stesso netto; il determinato costa di più all'azienda per il contributo addizionale.",
      source: "INPS — contributo addizionale NASpI sui rapporti a termine.",
    },
    ...fixedTermInputs,
    {
      field: "countryOptions.tfrDestination",
      label: "Destinazione TFR",
      kind: "select",
      required: true,
      group: "company",
      advanced: true,
      hidden: true,
      defaultValue: "unknown",
      options: [
        { value: "unknown", label: "Da verificare" },
        { value: "company", label: "Azienda" },
        { value: "treasury", label: "Tesoreria INPS" },
        { value: "pension_fund", label: "Fondo pensione" },
      ],
      help: "È un dato di destinazione e cassa: non modifica il costo economico annuo del TFR. Non viene inferito dall'organico, perché contano storia aziendale, medie legali e scelta del lavoratore.",
      example: "Per un datore obbligato al Fondo Tesoreria seleziona Tesoreria INPS; il totale costo resta invariato.",
      source: "Art. 2120 c.c.; L. 296/2006; Circolare INPS n. 12/2026.",
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
