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
  "Anno solare intero, un solo datore di lavoro e retribuzione stabile: non sono rappresentate Einmalzahlungen; la base U1/U2 le esclude per contratto.",
  "Assicurazione sanitaria e per la non autosufficienza pubbliche: sopra la soglia di 77.400 € (Jahresarbeitsentgeltgrenze) la privata non è modellata.",
  "Il Zusatzbeitrag dipende dalla cassa (media 2026: 2,9%); l'assicurazione infortuni segue il Gefahrtarif della Berufsgenossenschaft.",
  "Steuerklassen V e VI, Faktorverfahren, Freibeträge/Hinzurechnungsbeträge ELStAM e Kinderfreibeträge non sono modellati.",
];

export function calculateGermany(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
  return assembleCalculation({
    profile,
    rules,
    employee: computeEmployee(profile, rules),
    employer: computeEmployer(profile, rules),
    recomputeEmployee: (stepped) => computeEmployee(stepped, rules),
    marginalRatePolicy: "hold_external_inputs",
    notes: [...NOTES, ...employerRateNotes(profile)],
  });
}

function employerRateNotes(profile: EmployeeProfile): readonly string[] {
  const option = (key: string) => profile.countryOptions?.[key];
  const u1 = profile.companySize !== undefined && profile.companySize <= 30
    ? `U1 dichiarata: ${String(option("u1RatePercent"))}% (conteggio AAG ${profile.companySize}).`
    : `U1 non applicata: conteggio AAG ${String(profile.companySize)} superiore a 30.`;
  const u2 = option("u2RatePercent") === undefined
    ? "U2: scenario sperimentale di cassa; nessuna aliquota esatta dichiarata."
    : `U2 dichiarata: ${String(option("u2RatePercent"))}%.`;
  return [u1, u2];
}

export { computeEmployee } from "./employee.ts";
export { computeEmployer } from "./employer.ts";
