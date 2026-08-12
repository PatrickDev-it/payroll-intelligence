/**
 * The French reference profile and the values worth testing at.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";

export function referenceProfile(grossAnnualEuros: number): EmployeeProfile {
  return {
    country: "FR",
    region: "france",
    taxYear: 2026,
    grossAnnual: money(grossAnnualEuros, "EUR"),
    payPeriods: 12,
    employmentType: "employee",
    contractType: "permanent",
    workingTimePercent: 100,
    companySize: 50,
    age: 30,
    countryOptions: {
      statut: "non_cadre",
      pasRatePercent: "8.2",
      foyer: "single",
      children: 0,
      atmpRiskClass: "office",
      versementMobilite: "none",
    },
  };
}

/**
 * Every boundary is a PASS multiple or a SMIC multiple — France bands almost
 * everything against one of the two.
 */
export const FR_BOUNDARIES: readonly number[] = [
  21_876, // 1 SMIC de référence (1 January: 1,820 × EUR 12.02)
  48_060, // 1 PASS
  65_629, // 3 SMIC — the RGDU switches off
  192_240, // 4 PASS — CSG assiette and chômage stop
  384_480, // 8 PASS — tranche 2 ends
];

export const FR_FIXTURES: readonly number[] = [25_000, 35_000, 45_000, 80_000, 200_000];
