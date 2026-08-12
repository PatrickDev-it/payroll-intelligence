/**
 * The Spanish orchestrator.
 */

import { assembleCalculation } from "@engine/pipeline/assemble.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { computeEmployee } from "./employee.ts";
import { computeEmployer } from "./employer.ts";

const NOTES: readonly string[] = [
  "Contratto di calcolo: remunerazione stabile per l'intero anno solare, un solo datore di lavoro e soli redditi da lavoro dipendente.",
  "Nessun mínimo per figli o ascendenti, nessuna deduzione autonomica, nessuna disabilità.",
  "Le basi contributive sono annualizzate: esatte con remunerazione mensile stabile; non rappresentano paghe straordinarie o componenti irregolari che superano da sole il massimale mensile.",
  "Il premio AT/EP dipende dal codice CNAE dell'azienda; Navarra e Paesi Baschi hanno regime forale proprio e non vengono calcolati.",
  "Il netto usa la percentuale di ritenuta esterna restituita da AEAT e mantenuta invariata nelle simulazioni marginali; la scala statale e autonomica resta un confronto parziale sul debito annuale e non viene sottratta due volte.",
];

export function calculateSpain(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
  return assembleCalculation({
    profile,
    rules,
    employee: computeEmployee(profile, rules),
    employer: computeEmployer(profile, rules),
    recomputeEmployee: (stepped) => computeEmployee(stepped, rules),
    marginalRatePolicy: "hold_external_inputs",
    notes: NOTES,
  });
}

export { computeEmployee } from "./employee.ts";
export { computeEmployer } from "./employer.ts";
