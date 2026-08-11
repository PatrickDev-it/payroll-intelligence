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
import {
  applyRate,
  negate,
  parseDeclaredPercentage,
  toMoney,
  toPrecise,
} from "../money/money.ts";
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
  readonly taxRole?: CalculationLine["taxRole"];
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
      valueOrigin: "computed_rule",
      ...(options.taxRole ? { taxRole: options.taxRole } : {}),
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
  percent: string | number,
  options: Pick<ApplyOptions, "sign" | "label" | "taxRole"> = {},
): Applied {
  const rule = ruleOf(rules, id);
  if (rule.config.kind !== "formula") {
    throw new TypeError(`Rule ${id} must be a formula for a declared employer rate`);
  }
  const declared = parseDeclaredPercentage(percent);
  const amount = toMoney(applyRate(toPrecise(base), declared.rate), base.currency);
  const sign = options.sign ?? -1;

  return {
    amount,
    line: {
      id: rule.id,
      label: options.label ?? rule.label,
      amount: sign === -1 ? negate(amount) : amount,
      basis: base,
      formula: `${(base.cents / 100).toFixed(2)} × ${declared.decimal}% (tasso aziendale dichiarato)`,
      ruleIds: [rule.id],
      confidence: rule.verification.status,
      valueOrigin: "declared_input",
      ...(options.taxRole ? { taxRole: options.taxRole } : {}),
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
  semantics: Pick<CalculationLine, "taxRole" | "valueOrigin"> = {},
): CalculationLine {
  return {
    id,
    label,
    amount,
    formula,
    ruleIds,
    confidence,
    valueOrigin: semantics.valueOrigin ?? "computed_rule",
    ...(semantics.taxRole ? { taxRole: semantics.taxRole } : {}),
    ...(children ? { children } : {}),
  };
}
