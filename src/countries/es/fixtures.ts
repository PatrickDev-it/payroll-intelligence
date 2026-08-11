/**
 * The Spanish reference profile and the values worth testing at.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";

export function referenceProfile(grossAnnualEuros: number): EmployeeProfile {
  return {
    country: "ES",
    region: "MADRID",
    taxYear: 2026,
    grossAnnual: money(grossAnnualEuros, "EUR"),
    payPeriods: 14,
    employmentType: "employee",
    contractType: "permanent",
    workingTimePercent: 100,
    jobLevel: "grupo5",
    age: 30,
    countryOptions: { cnaeRiskClass: "office", aeatWithholdingRate: 20 },
  };
}

/**
 * Boundaries, not middles. The first two are where the art. 20 reduction
 * changes segment; the last three are the contribution ceiling and the two
 * solidarity bands above it.
 */
export const ES_BOUNDARIES: readonly number[] = [
  14_852, 17_674, 19_748, 61_214, 67_336, 91_822,
];

export const ES_FIXTURES: readonly number[] = [15_000, 25_000, 45_000, 70_000, 120_000];
