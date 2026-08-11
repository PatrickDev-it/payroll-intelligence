/**
 * The output. The net figure is the least interesting number here: the product
 * is the BREAKDOWN — what was withheld, on which base, under which rule.
 *
 * Hence the hard invariant on CalculationLine: `ruleIds` is non-empty. A line
 * that cannot cite the rule that produced it is a bug, not a rounding detail.
 *
 * Signs: withholdings are NEGATIVE, credits and supplements POSITIVE, so any
 * breakdown sums to the net by construction rather than by convention.
 */

import type { Money } from "../money/money.ts";
import type { ConfidenceTier } from "./confidence.ts";
import type { EmployeeProfile } from "./employee-profile.ts";
import type { RuleId, RuleRef } from "./rule.ts";

export type CalculationLine = {
  readonly id: string;
  readonly label: string;
  /** Signed: negative = withheld, positive = received. */
  readonly amount: Money;
  /** What the rate was applied to. Absent only for fixed amounts. */
  readonly basis?: Money;
  /** Human-readable derivation, e.g. "28,000 x 23% + 12,864.50 x 33%". */
  readonly formula: string;
  /** Non-empty. Enforced by assertCitable(). */
  readonly ruleIds: readonly RuleId[];
  readonly confidence: ConfidenceTier;
  readonly children?: readonly CalculationLine[];
};

export type EmployeeResult = {
  readonly gross: Money;
  readonly socialSecurity: readonly CalculationLine[];
  readonly taxableIncome: Money;
  readonly taxes: readonly CalculationLine[];
  readonly credits: readonly CalculationLine[];
  readonly netAnnual: Money;
  readonly netPerPayPeriod: Money;
  readonly netMonthlyEquivalent: Money;
};

export type EmployerResult = {
  readonly gross: Money;
  readonly contributions: readonly CalculationLine[];
  readonly insurance: readonly CalculationLine[];
  readonly severanceAccrual: readonly CalculationLine[];
  readonly otherCosts: readonly CalculationLine[];
  readonly totalCost: Money;
  readonly costOverGross: number;
};

export type Rates = {
  readonly effectiveTaxRate: number;
  readonly effectiveSocialRate: number;
  readonly totalEffectiveRate: number;
  readonly marginalRate: number;
  /** OECD: (employerCost - net) / employerCost. The only cross-country measure. */
  readonly taxWedge: number;
};

export type CalculationMeta = {
  readonly engineVersion: string;
  readonly rulesetVersion: string;
  readonly confidence: ConfidenceTier;
  readonly rulesApplied: readonly RuleRef[];
  readonly notes: readonly string[];
};

export type PayrollCalculation = {
  readonly input: EmployeeProfile;
  readonly currency: Money["currency"];
  readonly employee: EmployeeResult;
  readonly employer: EmployerResult;
  readonly rates: Rates;
  readonly meta: CalculationMeta;
};

/** Every line in a result tree, depth-first. */
export function allLines(result: PayrollCalculation): CalculationLine[] {
  const roots = [
    ...result.employee.socialSecurity,
    ...result.employee.taxes,
    ...result.employee.credits,
    ...result.employer.contributions,
    ...result.employer.insurance,
    ...result.employer.severanceAccrual,
    ...result.employer.otherCosts,
  ];
  const flat: CalculationLine[] = [];
  const walk = (lines: readonly CalculationLine[]): void => {
    for (const line of lines) {
      flat.push(line);
      if (line.children) walk(line.children);
    }
  };
  walk(roots);
  return flat;
}

export class UncitedLineError extends Error {
  constructor(lineId: string) {
    super(
      `Line "${lineId}" cites no rule. Every displayed number must trace to a rule id ` +
        `(practices/veracity-and-provenance.md).`,
    );
    this.name = "UncitedLineError";
  }
}

/** Called by the engine before a result leaves it. Not optional. */
export function assertCitable(lines: readonly CalculationLine[]): void {
  for (const line of lines) {
    if (line.ruleIds.length === 0) throw new UncitedLineError(line.id);
    if (line.children) assertCitable(line.children);
  }
}
