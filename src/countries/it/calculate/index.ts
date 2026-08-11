/**
 * The Italian orchestrator. What is left here after rfc/001 is only what is
 * Italian: which two halves to compute, and the notes that describe the
 * assumptions of THIS jurisdiction. Assembling them into a result — citability,
 * rates, confidence floor, provenance — is `assembleCalculation`, shared with
 * every other country so the cross-country comparison means something.
 */

import { assembleCalculation } from "@engine/pipeline/assemble.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { computeEmployee } from "./employee.ts";
import { computeEmployer } from "./employer.ts";

const NOTES: readonly string[] = [
  "Anno solare intero, unico datore di lavoro, solo reddito da lavoro dipendente.",
  "Nessun carico di famiglia, nessun regime agevolato, nessun benefit.",
  "Profilo contributivo ordinario del Terziario; CSC e qualifiche speciali non sono generalizzati.",
  "L'INAIL dipende dall'azienda: la percentuale mostrata è una fascia indicativa per lavoro d'ufficio.",
];

export function calculateItaly(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
  return assembleCalculation({
    profile,
    rules,
    employee: computeEmployee(profile, rules),
    employer: computeEmployer(profile, rules),
    recomputeEmployee: (stepped) => computeEmployee(stepped, rules),
    notes: [...NOTES, tfrDestinationNote(profile)],
  });
}

function tfrDestinationNote(profile: EmployeeProfile): string {
  const destination = profile.countryOptions?.["tfrDestination"];
  if (destination === "treasury") {
    return "TFR destinato al Fondo Tesoreria INPS: cambia il flusso finanziario, non il costo economico esposto.";
  }
  if (destination === "pension_fund") {
    return "TFR destinato a un fondo pensione: cambia il destinatario, non il costo economico esposto.";
  }
  if (destination === "company") {
    return "TFR mantenuto in azienda; la destinazione dichiarata non modifica l'accantonamento economico esposto.";
  }
  return "Destinazione TFR da verificare: non viene inferita dall'organico e non modifica l'accantonamento economico esposto.";
}

export { computeEmployee } from "./employee.ts";
export { computeEmployer } from "./employer.ts";
