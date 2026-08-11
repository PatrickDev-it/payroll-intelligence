/**
 * Shared plumbing for every country pipeline: resolve a rule, apply its
 * primitive, and return a CalculationLine that already cites it.
 *
 * Building the line here rather than at each call site is what makes
 * `ruleIds` non-empty by construction — a line cannot be produced without
 * naming the rule that produced it.
 */

import { MissingRuleError } from "../errors.ts";
import type { CalculationLine } from "../model/calculation.ts";
import type { Rule, RuleId, RuleSet } from "../model/rule.ts";
import type { Money } from "../money/money.ts";
import { fromCents, negate } from "../money/money.ts";
import { applyPrimitive } from "../primitives/apply.ts";

export type Sign = 1 | -1;

export function ruleOf(rules: RuleSet, id: RuleId): Rule {
  const rule = rules.rules[id];
  if (!rule) throw new MissingRuleError(id, rules.country, rules.taxYear);
  return rule;
}

/** A formula rule's parameter, resolved by name. Throws rather than defaulting. */
export function formulaParam(rule: Rule, name: string): string {
  if (rule.config.kind !== "formula") {
    throw new TypeError(`Rule ${rule.id} is not a formula, so it has no params.${name}`);
  }
  const value = rule.config.params[name];
  if (value === undefined) throw new TypeError(`Rule ${rule.id} has no params.${name}`);
  return value;
}

export type Applied = {
  /** Unsigned magnitude, for arithmetic. */
  readonly amount: Money;
  /** Signed and cited, for the breakdown. */
  readonly line: CalculationLine;
};

export type ApplyOptions = {
  readonly sign?: Sign;
  readonly key?: string;
  readonly label?: string;
  readonly children?: readonly CalculationLine[];
};

export function applyRule(
  rules: RuleSet,
  id: RuleId,
  base: Money,
  options: ApplyOptions = {},
): Applied {
  const rule = ruleOf(rules, id);
  const result = applyPrimitive(rule.config, options.key === undefined ? { base } : { base, key: options.key });
  const sign = options.sign ?? -1;

  return {
    amount: result.amount,
    line: {
      id: rule.id,
      label: options.label ?? rule.label,
      amount: sign === -1 ? negate(result.amount) : result.amount,
      basis: base,
      formula: result.formula,
      ruleIds: [rule.id],
      confidence: rule.verification.status,
      ...(options.children ? { children: options.children } : {}),
    },
  };
}

/**
 * Applies a percentage notified for one employer while still citing the legal
 * rule that authorises that company-specific rate. Six decimal places of a
 * percent are retained before the multiplication; money is rounded once.
 */
export function applyDeclaredPercentageRule(
  rules: RuleSet,
  id: RuleId,
  base: Money,
  percent: number,
  options: Pick<ApplyOptions, "sign" | "label"> = {},
): Applied {
  const rule = ruleOf(rules, id);
  if (rule.config.kind !== "formula") {
    throw new TypeError(`Rule ${id} must be a formula for a declared employer rate`);
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError(`Declared percentage for ${id} must be between 0 and 100`);
  }

  const scale = 1_000_000;
  const scaledPercent = Math.round(percent * scale);
  const amount = fromCents(
    Math.round((base.cents * scaledPercent) / (100 * scale)),
    base.currency,
  );
  const sign = options.sign ?? -1;

  return {
    amount,
    line: {
      id: rule.id,
      label: options.label ?? rule.label,
      amount: sign === -1 ? negate(amount) : amount,
      basis: base,
      formula: `${(base.cents / 100).toFixed(2)} × ${percent.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}% (tasso aziendale dichiarato)`,
      ruleIds: [rule.id],
      confidence: rule.verification.status,
    },
  };
}

/** A line the pipeline composes itself — statutory rounding, a capienza test. */
export function derivedLine(
  id: string,
  label: string,
  amount: Money,
  formula: string,
  ruleIds: readonly RuleId[],
  confidence: CalculationLine["confidence"],
  children?: readonly CalculationLine[],
): CalculationLine {
  return {
    id,
    label,
    amount,
    formula,
    ruleIds,
    confidence,
    ...(children ? { children } : {}),
  };
}
