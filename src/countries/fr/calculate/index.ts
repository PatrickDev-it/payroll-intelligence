/**
 * The French orchestrator.
 */

import { assembleCalculation } from "@engine/pipeline/assemble.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { computeEmployee } from "./employee.ts";
import { computeEmployer } from "./employer.ts";

const NOTES: readonly string[] = [
  "Anno solare intero, un solo datore di lavoro, solo redditi da lavoro dipendente.",
  "Il barème applicato è quello della legge di bilancio 2026: quello che si applicherà davvero ai redditi 2026 sarà votato a dicembre 2026.",
  "La RGDU usa lo SMIC al 1° gennaio 2026 (1.820 × 12,02 €), riproporzionato per il tempo di lavoro, e si azzera a 3 SMIC.",
  "Mutuelle, prévoyance e accordi di categoria non sono conteggiati; il tasso AT/MP e il versement mobilité dipendono dallo stabilimento.",
];

export function calculateFrance(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
  return assembleCalculation({
    profile,
    rules,
    employee: computeEmployee(profile, rules),
    employer: computeEmployer(profile, rules),
    recomputeEmployee: (stepped) => computeEmployee(stepped, rules),
    notes: NOTES,
  });
}

export { computeEmployee } from "./employee.ts";
export { computeEmployer } from "./employer.ts";
