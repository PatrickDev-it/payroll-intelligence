/**
 * The German orchestrator. Two halves and the assumptions of this jurisdiction;
 * assembling them is `assembleCalculation`, shared with every country.
 */

import { assembleCalculation } from "@engine/pipeline/assemble.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { computeEmployee } from "./employee.ts";
import { computeEmployer } from "./employer.ts";

const NOTES: readonly string[] = [
  "Anno solare intero, un solo datore di lavoro, solo redditi da lavoro dipendente.",
  "Assicurazione sanitaria e per la non autosufficienza pubbliche: sopra la soglia di 77.400 € (Jahresarbeitsentgeltgrenze) la privata non è modellata.",
  "Il Zusatzbeitrag dipende dalla cassa (media 2026: 2,9%); l'assicurazione infortuni segue il Gefahrtarif della Berufsgenossenschaft.",
  "Steuerklassen V e VI e Kinderfreibeträge non sono modellati.",
];

export function calculateGermany(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
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
