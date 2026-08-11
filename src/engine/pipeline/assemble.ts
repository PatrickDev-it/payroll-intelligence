/**
 * The last step of every country pipeline: take the two computed halves and
 * assemble the result the UI reads.
 *
 * What lives here is everything that must behave IDENTICALLY in every
 * jurisdiction or the cross-country comparison is meaningless — the citability
 * assertion, the five rates, the confidence floor, the provenance list. What
 * does not live here is the order of the calculation, which is genuinely
 * national: Italy deducts contributions before tax, Germany deducts a notional
 * `Vorsorgepauschale` instead of the actual ones, France taxes
 * `net + CSG non déductible`.
 *
 * See rfc/001.
 */

import { ENGINE_VERSION } from "../version.ts";
import type {
  CalculationLine,
  MarginalRatePolicy,
  PayrollCalculation,
  Rates,
} from "../model/calculation.ts";
import { allLines, assertCitable } from "../model/calculation.ts";
import { lowestConfidence, type ConfidenceTier } from "../model/confidence.ts";
import type { EmployeeProfile } from "../model/employee-profile.ts";
import type { RuleRef, RuleSet } from "../model/rule.ts";
import { toRuleRef } from "../model/rule.ts";
import type { Money } from "../money/money.ts";
import { add, divide, money, subtract } from "../money/money.ts";
import { ruleOf } from "./helpers.ts";

/** The step used to probe the marginal rate: what you keep from a EUR 1,000 raise. */
const MARGINAL_STEP_UNITS = 1_000;

/** What a country's employee half must produce. */
export type EmployeeComputation = {
  readonly gross: Money;
  readonly socialSecurity: readonly CalculationLine[];
  readonly totalContributions: Money;
  readonly taxableIncome: Money;
  readonly taxes: readonly CalculationLine[];
  readonly totalTaxes: Money;
  readonly credits: readonly CalculationLine[];
  readonly totalCredits: Money;
  readonly netAnnual: Money;
};

/** What a country's employer half must produce. */
export type EmployerComputation = {
  readonly gross: Money;
  readonly contributions: readonly CalculationLine[];
  readonly insurance: readonly CalculationLine[];
  readonly severanceAccrual: readonly CalculationLine[];
  readonly otherCosts: readonly CalculationLine[];
  readonly totalCost: Money;
  readonly costOverGross: number;
};

type AssemblyBase = {
  readonly profile: EmployeeProfile;
  readonly rules: RuleSet;
  readonly employee: EmployeeComputation;
  readonly employer: EmployerComputation;
  /**
   * Re-runs the employee half at a different gross. Passed as a function
   * because the marginal rate is MEASURED, not derived from a bracket table —
   * that is the only way it can see a credit taper.
   */
  readonly notes: readonly string[];
};

export type Assembly = AssemblyBase &
  (
    | {
        readonly marginalRatePolicy?: Exclude<MarginalRatePolicy, "unavailable">;
        readonly recomputeEmployee: (profile: EmployeeProfile) => EmployeeComputation;
      }
    | {
        readonly marginalRatePolicy: "unavailable";
        readonly recomputeEmployee?: never;
      }
  );

export function assembleCalculation(assembly: Assembly): PayrollCalculation {
  const { profile, rules, employee, employer, notes } = assembly;
  const currency = profile.grossAnnual.currency;
  const lines = topLevelLines(employee, employer);

  assertCitable(lines);

  const netAnnual = employee.netAnnual;

  return {
    input: profile,
    currency,
    employee: {
      gross: employee.gross,
      socialSecurity: employee.socialSecurity,
      taxableIncome: employee.taxableIncome,
      taxes: employee.taxes,
      credits: employee.credits,
      netAnnual,
      netPerPayPeriod: divide(netAnnual, profile.payPeriods),
      netMonthlyEquivalent: divide(netAnnual, 12),
    },
    employer: {
      gross: employer.gross,
      contributions: employer.contributions,
      insurance: employer.insurance,
      severanceAccrual: employer.severanceAccrual,
      otherCosts: employer.otherCosts,
      totalCost: employer.totalCost,
      costOverGross: employer.costOverGross,
    },
    rates: deriveRates(assembly),
    meta: {
      engineVersion: ENGINE_VERSION,
      rulesetVersion: rules.version,
      confidence: lowestConfidence(allConfidences(lines)),
      rulesApplied: collectRules(rules, lines),
      notes,
    },
  };
}

function topLevelLines(
  employee: EmployeeComputation,
  employer: EmployerComputation,
): readonly CalculationLine[] {
  return [
    ...employee.socialSecurity,
    ...employee.taxes,
    ...employee.credits,
    ...employer.contributions,
    ...employer.insurance,
    ...employer.severanceAccrual,
    ...employer.otherCosts,
  ];
}

/**
 * The marginal rate is probed, not derived: the employee half is run again at
 * gross + 1,000 and the extra withholding is measured. That is what catches the
 * credit tapers a nominal bracket rate cannot show — in Italy at EUR 45,000 the
 * effective rate is 24% and the marginal rate on gross is 49%.
 */
function deriveRates(assembly: Assembly): Rates {
  const { profile, employee, employer } = assembly;
  const grossCents = employee.gross.cents;
  const netCents = employee.netAnnual.cents;
  const withheldNow = grossCents - netCents;
  const effectiveRates = {
    effectiveTaxRate: safeRatio(employee.totalTaxes.cents, grossCents),
    effectiveSocialRate: safeRatio(employee.totalContributions.cents, grossCents),
    totalEffectiveRate: safeRatio(withheldNow, grossCents),
    taxWedge: safeRatio(employer.totalCost.cents - netCents, employer.totalCost.cents),
  };

  if (assembly.marginalRatePolicy === "unavailable") {
    return { ...effectiveRates, marginalRate: null, marginalRatePolicy: "unavailable" };
  }

  const marginalRatePolicy = assembly.marginalRatePolicy ?? "recompute";
  const recomputeEmployee = assembly.recomputeEmployee;
  const stepped = recomputeEmployee({
    ...profile,
    grossAnnual: add(profile.grossAnnual, money(MARGINAL_STEP_UNITS, profile.grossAnnual.currency)),
  });

  const stepCents = MARGINAL_STEP_UNITS * 100;
  const withheldThen = stepped.gross.cents - stepped.netAnnual.cents;

  return {
    ...effectiveRates,
    marginalRate: safeRatio(withheldThen - withheldNow, stepCents),
    marginalRatePolicy,
  };
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function allConfidences(lines: readonly CalculationLine[]): ConfidenceTier[] {
  return lines.flatMap((line) => [
    line.confidence,
    ...(line.children ? allConfidences(line.children) : []),
  ]);
}

function collectRules(rules: RuleSet, lines: readonly CalculationLine[]): readonly RuleRef[] {
  const ids = new Set<string>();
  const walk = (items: readonly CalculationLine[]): void => {
    for (const line of items) {
      for (const id of line.ruleIds) ids.add(id);
      if (line.children) walk(line.children);
    }
  };
  walk(lines);
  return [...ids].sort().map((id) => toRuleRef(ruleOf(rules, id)));
}

/**
 * The invariant every country must satisfy: gross plus every signed top-level
 * employee line equals the net. Exported so each country's tests assert it
 * without rebuilding the sum — and so they all assert the SAME sum.
 */
export function reconciles(result: PayrollCalculation): boolean {
  const signedTotal = allLines(result)
    .filter((line) => isTopLevelEmployeeLine(result, line))
    .reduce((total, line) => total + line.amount.cents, result.employee.gross.cents);
  return signedTotal === result.employee.netAnnual.cents;
}

function isTopLevelEmployeeLine(result: PayrollCalculation, line: CalculationLine): boolean {
  return (
    result.employee.socialSecurity.includes(line) ||
    result.employee.taxes.includes(line) ||
    result.employee.credits.includes(line)
  );
}

/** Kept for the invariant test: gross minus every withholding equals the net. */
export function withheld(result: PayrollCalculation): number {
  return subtract(result.employee.gross, result.employee.netAnnual).cents;
}
