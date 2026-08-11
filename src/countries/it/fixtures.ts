/**
 * Golden cases for Italy — the regression fixtures from
 * docs/countries/IT/worked-example.md §6, computed by hand from the statutes and
 * reconciled line by line.
 *
 * These are the bar for the adapter: not "close", but equal to the cent. When
 * `calculate()` lands, the todo tests in adapter.test.ts become these.
 *
 * They are NOT yet reconciled against the Agenzia delle Entrate calculator —
 * that is the last step before the Italian result may be called verified, and
 * it is listed as open in the handoff.
 */

import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";

/**
 * The profile every fixture shares. Each field is an INPUT with a default, not
 * a hardcoded assumption — the distinction between "simplified" and "limited".
 */
export function referenceProfile(grossAnnualEuros: number): EmployeeProfile {
  return {
    country: "IT",
    region: "LOMBARDIA",
    municipality: "MILANO",
    taxYear: 2026,
    grossAnnual: money(grossAnnualEuros, "EUR"),
    payPeriods: 14,
    employmentType: "employee",
    contractType: "permanent",
    workingTimePercent: 100,
    collectiveAgreement: "CCNL_TERZIARIO_CONFCOMMERCIO",
    jobLevel: "III",
    companySize: 20,
    age: 30,
    countryOptions: {
      inailRiskClass: "office",
      pensionCeilingStatus: "subject",
      tfrDestination: "unknown",
    },
  };
}

export type Fixture = {
  readonly grossEuros: number;
  /** All values in cents. */
  readonly contributions: number;
  readonly taxableIncome: number;
  readonly irpefNet: number;
  readonly surtaxes: number;
  readonly supplements: number;
  readonly netAnnual: number;
  readonly netPerPayPeriod: number;
  readonly employerCost: number;
  readonly taxWedge: number;
};

export const IT_FIXTURES: readonly Fixture[] = [
  {
    // Exercises BOTH cash supplements: the trattamento integrativo passes the
    // capienza test here, and the somma integrativa lands in the 5.3% band.
    grossEuros: 15_000,
    contributions: 141_900,
    taxableIncome: 1_358_100,
    irpefNet: 116_863,
    surtaxes: 16_705,
    supplements: 191_979,
    netAnnual: 1_416_511,
    netPerPayPeriod: 101_179,
    employerCost: 2_066_661,
    taxWedge: 0.3145895722617304,
  },
  {
    grossEuros: 20_000,
    contributions: 189_200,
    taxableIncome: 1_810_800,
    irpefNet: 134_934,
    surtaxes: 23_361,
    supplements: 86_918,
    netAnnual: 1_739_423,
    netPerPayPeriod: 124_245,
    employerCost: 2_750_748,
    taxWedge: 0.36765454341873555,
  },
  {
    grossEuros: 30_000,
    contributions: 283_800,
    taxableIncome: 2_716_200,
    irpefNet: 319_555,
    surtaxes: 59_396,
    supplements: 0,
    netAnnual: 2_337_249,
    netPerPayPeriod: 166_946,
    employerCost: 4_118_922,
    taxWedge: 0.4325580819447419,
  },
  {
    // The reference case.
    grossEuros: 45_000,
    contributions: 425_700,
    taxableIncome: 4_074_300,
    irpefNet: 984_151,
    surtaxes: 93_502,
    supplements: 0,
    netAnnual: 2_996_647,
    netPerPayPeriod: 214_046,
    employerCost: 6_171_183,
    taxWedge: 0.5144128767531282,
  },
  {
    grossEuros: 60_000,
    contributions: 571_376,
    taxableIncome: 5_428_624,
    irpefNet: 1_554_308,
    surtaxes: 127_674,
    supplements: 0,
    netAnnual: 3_746_642,
    netPerPayPeriod: 267_617,
    employerCost: 8_223_444,
    taxWedge: 0.5443950247609153,
  },
  {
    grossEuros: 100_000,
    contributions: 989_776,
    taxableIncome: 9_010_224,
    irpefNet: 3_094_396,
    surtaxes: 218_289,
    supplements: 0,
    netAnnual: 5_697_539,
    netPerPayPeriod: 406_967,
    employerCost: 13_696_141,
    taxWedge: 0.5840040636263893,
  },
];

/**
 * Boundary points on TAXABLE income that must be tested at +/- one cent.
 * Source: docs/countries/IT/income-tax.md §6.
 *
 * `cliff` marks the two points where the law is genuinely discontinuous. They
 * are declared here rather than tolerated by a loose assertion, because a cliff
 * the engine knows about is a feature and a cliff it does not is a bug — and
 * from the outside the two look identical.
 */
export type Boundary = {
  readonly atEuros: number;
  readonly why: string;
  /** Most thresholds use taxable income; contribution ceilings use gross. */
  readonly basis?: "taxable" | "gross";
  /** "drop": net falls as gross rises. "jump": net rises faster than gross. */
  readonly cliff?: "drop" | "jump";
};

export const IT_BOUNDARIES: readonly Boundary[] = [
  {
    atEuros: 8_173.91,
    why: "gross IRPEF crosses the art. 13 credit reduced by EUR 75",
    cliff: "jump",
  },
  { atEuros: 8_500, why: "somma integrativa 7.1% -> 5.3%", cliff: "drop" },
  { atEuros: 15_000, why: "credit formula changes; trattamento integrativo full -> partial" },
  { atEuros: 20_000, why: "somma integrativa ends, ulteriore detrazione begins" },
  {
    atEuros: 23_000,
    why: "Milan municipal surtax exemption — the rate then applies to the whole base",
    cliff: "drop",
  },
  { atEuros: 25_000, why: "EUR 65 bonus window opens" },
  { atEuros: 28_000, why: "IRPEF 23% -> 33%; regional 1.58% -> 1.72%" },
  { atEuros: 32_000, why: "ulteriore detrazione taper starts" },
  { atEuros: 35_000, why: "EUR 65 bonus window closes" },
  { atEuros: 40_000, why: "ulteriore detrazione reaches zero" },
  { atEuros: 50_000, why: "IRPEF 33% -> 43%; employment credit hits zero; regional 1.72% -> 1.73%" },
  { atEuros: 56_224, basis: "gross", why: "employee contribution 9.19% -> 10.19%" },
  { atEuros: 122_295, basis: "gross", why: "contributory ceiling (massimale)" },
  { atEuros: 200_000, why: "EUR 440 deduction clawback" },
];

/** Gross at which taxable income reaches `taxableEuros`, including ordinary FIS 0.27%. */
export function grossForTaxable(taxableEuros: number): number {
  return Math.ceil(taxableEuros / (1 - 0.0919 - 0.0027));
}
