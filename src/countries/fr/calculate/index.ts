/**
 * The French orchestrator.
 */

import { assembleCalculation } from "@engine/pipeline/assemble.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { computeEmployee } from "./employee.ts";
import { computeEmployer } from "./employer.ts";

export function calculateFrance(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
  return assembleCalculation({
    profile,
    rules,
    employee: computeEmployee(profile, rules),
    employer: computeEmployer(profile, rules),
    recomputeEmployee: (stepped) => computeEmployee(stepped, rules),
    marginalRatePolicy: "hold_external_inputs",
    notes: notesFor(profile),
  });
}

function notesFor(profile: EmployeeProfile): readonly string[] {
  const mutuelleProvided = profile.countryOptions?.mutuelleEmployeeAnnual !== undefined;
  const prevoyanceProvided = profile.countryOptions?.prevoyanceEmployeeAnnual !== undefined;
  return [
    "Anno solare intero, un solo datore di lavoro, solo redditi da lavoro dipendente.",
    "Il PAS è una proiezione annualizzata del tasso dichiarato sul net imposable; non riproduce gli arrotondamenti e i cambi di tasso di ogni singolo mese.",
    "La stima annuale usa il barème 2026 legalmente applicabile ai redditi 2025; il barème definitivo dei redditi 2026 non è ancora emanato e la stima non riduce il netto payroll.",
    "La RGDU usa lo SMIC al 1° gennaio 2026 (1.820 × 12,02 €), riproporzionato per il tempo di lavoro, e si azzera a 3 SMIC.",
    `${mutuelleProvided ? "Mutuelle salariale esatta inclusa" : "Mutuelle salariale non conteggiata"}; ${prevoyanceProvided ? "prévoyance salariale esatta inclusa" : "prévoyance salariale non conteggiata"}. Quote datoriali, accordi di categoria, tasso AT/MP e versement mobilité restano specifici dello stabilimento.`,
  ];
}

export { computeEmployee } from "./employee.ts";
export { computeEmployer } from "./employer.ts";
