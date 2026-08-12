/**
 * The Spanish input surface.
 *
 * The community is not a cosmetic field: it legislates half the income tax, so
 * it is `required` and has no safe default beyond the one the user changes
 * first. The professional group matters only below the minimum contribution
 * base — but below it, it matters a great deal.
 *
 * Labels are Italian with the Spanish term kept where it is the name on the
 * payslip (rfc/002), and each input declares the form section it belongs to.
 */

import type { EmployeeProfile, InputDescriptor } from "@engine/model/employee-profile.ts";
import { COMMUNITIES } from "./geography.ts";
import { COTIZACION_GROUPS, DEFAULT_COTIZACION_GROUP, DEFAULT_REGION } from "./profile.ts";

const GROUP_LABELS: Record<(typeof COTIZACION_GROUPS)[number], string> = {
  grupo1: "1 — Ingegneri e laureati",
  grupo2: "2 — Periti e tecnici",
  grupo3: "3 — Capi amministrativi e di reparto",
  grupo4: "4 — Assistenti non titolati",
  grupo5: "5 — Impiegati amministrativi",
  grupo6: "6 — Subalterni",
  grupo7: "7 — Ausiliari amministrativi",
};

export function spanishInputs(_profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
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
      help: "Salario bruto anual: lordo annuo prima di contributi e IRPF. Non è il costo per l'azienda.",
    },
    {
      field: "region",
      label: "Comunità autonoma",
      kind: "select",
      required: true,
      group: "location",
      defaultValue: DEFAULT_REGION,
      options: COMMUNITIES.map((community) => ({ value: community.key, label: community.label })),
      help: "Legifera metà dell'IRPF. Su 50.000 € di lordo, fra Madrid ed Estremadura ballano 905 € l'anno. Navarra e Paesi Baschi hanno regime forale proprio e non vengono calcolati.",
    },
    {
      field: "contractType",
      label: "Contratto",
      kind: "select",
      required: true,
      group: "company",
      defaultValue: "permanent",
      options: [
        { value: "permanent", label: "Indeterminato" },
        { value: "fixed_term", label: "Determinato" },
      ],
      help: "La disoccupazione costa 7,05% a tempo indeterminato e 8,30% a termine: uno dei divari fisso/temporaneo più larghi dell'UE, e voluto.",
    },
    {
      field: "countryOptions.aeatWithholdingRate",
      label: "Ritenuta AEAT",
      shortLabel: "IRPF AEAT",
      kind: "decimal",
      required: true,
      group: "profile",
      min: 0,
      max: 100,
      help: "Percentuale di ritenuta 2026 restituita dal servizio ufficiale AEAT per questo lavoratore, con al massimo due decimali come TIPO ufficiale. È obbligatoria perché la ritenuta della nómina non coincide con la stima parziale dell'imposta annuale.",
      example: "Se il calcolo AEAT restituisce 21,05%, inserisci 21,05: su 45.000 € la ritenuta annua è 9.472,50 €.",
      source: "Agencia Tributaria — Algoritmo de cálculo de retenciones 2026, pp. 33 e 35 (TIPO e IMPORTE).",
    },
    {
      field: "payPeriods",
      label: "Mensilità",
      kind: "select",
      required: true,
      group: "pay",
      defaultValue: 14,
      options: [
        { value: "12", label: "12" },
        { value: "14", label: "14" },
      ],
      help: "Cambia l'importo di ogni paga, mai il totale annuo: le straordinarie si ripartiscono ai fini contributivi.",
    },
    {
      field: "jobLevel",
      label: "Grupo de cotización",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: DEFAULT_COTIZACION_GROUP,
      options: COTIZACION_GROUPS.map((group) => ({ value: group, label: GROUP_LABELS[group] })),
      help: "Fissa soltanto la base minima mensile: 1.989,30 € per il gruppo 1, 1.649,70 € per il 2, 1.435,20 € per il 3 e 1.424,40 € per i gruppi 4–7.",
    },
    {
      field: "countryOptions.cnaeRiskClass",
      label: "AT/EP",
      kind: "select",
      required: false,
      group: "company",
      advanced: true,
      defaultValue: "office",
      options: [
        { value: "office", label: "Ufficio" },
        { value: "retail", label: "Commercio" },
        { value: "manufacturing", label: "Industria" },
        { value: "construction", label: "Costruzioni" },
      ],
      help: "Valori indicativi: Ufficio 1,5%, Commercio 1,9%, Industria 3,1%, Costruzioni 6,5%. Il premio reale dipende dal codice CNAE.",
    },
    {
      field: "countryOptions.atepRatePercent",
      label: "AT/EP esatta",
      kind: "decimal",
      required: false,
      group: "company",
      advanced: true,
      min: 0,
      max: 10,
      help: "Se inserita, sostituisce la classe indicativa con la percentuale AT/EP applicabile al codice CNAE dell'azienda.",
      source: "Tarifa de primas de accidentes de trabajo e codice CNAE aziendale.",
    },
  ];
}
