/**
 * The German reference profile and the boundaries worth testing.
 *
 * Unlike Italy, there are no hand-computed golden totals here yet: the German
 * net cannot be called reconciled until it is compared against the BMF's own
 * Lohnsteuer interface, which needs a registered access code this build does
 * not have. What IS asserted is stronger than a remembered number — the
 * boundaries of § 32a, where the statute itself tells you what the answer must
 * be because two different polynomials have to meet.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";

export function referenceProfile(grossAnnualEuros: number): EmployeeProfile {
  return {
    country: "DE",
    region: "BE",
    taxYear: 2026,
    grossAnnual: money(grossAnnualEuros, "EUR"),
    payPeriods: 12,
    employmentType: "employee",
    contractType: "permanent",
    workingTimePercent: 100,
    age: 30,
    countryOptions: {
      steuerklasse: "I",
      churchMember: "no",
      children: 0,
      zusatzbeitrag: "average",
      unfallRiskClass: "office",
    },
  };
}

/**
 * The § 32a zone edges, in zu versteuerndes Einkommen (NOT gross). Each is a
 * point where the statute changes function, and the classic German payroll bug
 * is a discontinuity at one of them.
 */
export const DE_TARIFF_BOUNDARIES: readonly number[] = [
  12_347, 12_348, 12_349, 17_799, 17_800, 69_878, 69_879, 277_825, 277_826,
];

/** Gross values that sit on a ceiling or a threshold rather than in the middle of one. */
export const DE_BOUNDARIES: readonly number[] = [
  69_750, // Beitragsbemessungsgrenze Kranken-/Pflegeversicherung
  77_400, // Jahresarbeitsentgeltgrenze — private insurance becomes possible
  101_400, // Beitragsbemessungsgrenze Renten-/Arbeitslosenversicherung
];

/** The gross values the country factsheet is written around. */
export const DE_FIXTURES: readonly number[] = [15_000, 30_000, 45_000, 80_000, 150_000];
