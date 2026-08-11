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
    countryOptions: { inailRiskClass: "office", pensionCeilingStatus: "subject" },
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
    contributions: 137_850,
    taxableIncome: 1_362_150,
    irpefNet: 117_800,
    surtaxes: 16_754,
    supplements: 192_194, // 1,200.00 trattamento + 721.94 somma
    netAnnual: 1_419_790,
    netPerPayPeriod: 101_414,
    employerCost: 2_070_711,
    taxWedge: 0.3143,
  },
  {
    grossEuros: 20_000,
    contributions: 183_800,
    taxableIncome: 1_816_200,
    irpefNet: 136_700,
    surtaxes: 23_446,
    supplements: 87_178, // somma integrativa, 4.8% — non-taxable
    netAnnual: 1_743_232,
    netPerPayPeriod: 124_517,
    employerCost: 2_756_148,
    taxWedge: 0.3675,
  },
  {
    grossEuros: 30_000,
    contributions: 275_700,
    taxableIncome: 2_724_300,
    irpefNet: 322_200,
    surtaxes: 59_588,
    supplements: 0,
    netAnnual: 2_342_512,
    netPerPayPeriod: 167_322,
    employerCost: 4_127_022,
    taxWedge: 0.4324,
  },
  {
    // The reference case.
    grossEuros: 45_000,
    contributions: 413_550,
    taxableIncome: 4_086_450,
    irpefNet: 989_200,
    surtaxes: 93_809,
    supplements: 0,
    netAnnual: 3_003_441,
    netPerPayPeriod: 214_532,
    employerCost: 6_183_333,
    taxWedge: 0.5143,
  },
  {
    grossEuros: 60_000,
    contributions: 555_176,
    taxableIncome: 5_444_824,
    irpefNet: 1_561_300,
    surtaxes: 128_084,
    supplements: 0,
    netAnnual: 3_755_440,
    netPerPayPeriod: 268_246,
    employerCost: 8_239_644,
    taxWedge: 0.5442230271113655,
  },
  {
    grossEuros: 100_000,
    contributions: 962_776,
    taxableIncome: 9_037_224,
    irpefNet: 3_106_000,
    surtaxes: 218_972,
    supplements: 0,
    netAnnual: 5_712_252,
    netPerPayPeriod: 408_018,
    employerCost: 13_723_141,
    taxWedge: 0.5837503965017922,
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
    atEuros: 8_500,
    why: "somma integrativa 7.1% -> 5.3%, and gross IRPEF crosses the art. 13 credit",
    // 8,500 x 23% = 1,955.00, exactly the art. 13 plateau, so the capienza test
    // flips here and the EUR 1,200 trattamento integrativo switches on. The two
    // thresholds coinciding is the 2025-reform artefact described in the docs.
    cliff: "jump",
  },
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

/** Gross at which taxable income reaches `taxableEuros`, given the 9.19% rate. */
export function grossForTaxable(taxableEuros: number): number {
  return Math.round(taxableEuros / (1 - 0.0919));
}
