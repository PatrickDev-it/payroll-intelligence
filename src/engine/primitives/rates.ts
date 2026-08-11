/**
 * Primitives 2, 3, 4 and 7: a single rate on a base, variously bounded.
 */

import type { Money } from "../money/money.ts";
import {
  applyRate,
  compare,
  max as maxOf,
  min as minOf,
  moneyFromDecimal,
  rate,
  toMoney,
  toPrecise,
  zero,
} from "../money/money.ts";
import { TIMES, amt, pct } from "./format.ts";
import type { Decimal, PrimitiveResult } from "./types.ts";

/** 2. flat_rate — one rate on the whole base. */
export function flatRate(base: Money, rateDecimal: Decimal): PrimitiveResult {
  const r = rate(rateDecimal);
  return {
    amount: toMoney(applyRate(toPrecise(base), r), base.currency),
    formula: `${amt(base)} ${TIMES} ${pct(r)}`,
  };
}

/** 3. capped_rate — the rate applies only up to a ceiling. */
export function cappedRate(base: Money, rateDecimal: Decimal, ceiling: Decimal): PrimitiveResult {
  const r = rate(rateDecimal);
  const cap = moneyFromDecimal(ceiling, base.currency);
  const effective = minOf(base, cap);
  const capped = compare(base, cap) > 0;
  return {
    amount: toMoney(applyRate(toPrecise(effective), r), base.currency),
    formula: capped
      ? `min(${amt(base)}; ${amt(cap)}) ${TIMES} ${pct(r)}`
      : `${amt(effective)} ${TIMES} ${pct(r)}`,
  };
}

/** 4. floored_rate — contributions are due on at least a minimum base. */
export function flooredRate(base: Money, rateDecimal: Decimal, floor: Decimal): PrimitiveResult {
  const r = rate(rateDecimal);
  const minimum = moneyFromDecimal(floor, base.currency);
  const effective = maxOf(base, minimum);
  const lifted = compare(base, minimum) < 0;
  return {
    amount: toMoney(applyRate(toPrecise(effective), r), base.currency),
    formula: lifted
      ? `max(${amt(base)}; ${amt(minimum)}) ${TIMES} ${pct(r)}`
      : `${amt(effective)} ${TIMES} ${pct(r)}`,
  };
}

/**
 * 7. threshold_exemption — zero at or below the threshold; above it the rate
 * applies to the ENTIRE base, not to the excess.
 *
 * This is a cliff, and it is the rule, not an artefact. Milan's addizionale
 * comunale exempts taxable income up to EUR 23,000 and then charges 0.80% on
 * the whole of it: EUR 23,000 pays nothing, EUR 23,001 pays EUR 184.01. Any
 * model that smooths this is wrong by up to EUR 184 and hides a real
 * discontinuity from the user standing on it.
 */
export function thresholdExemption(
  base: Money,
  threshold: Decimal,
  rateDecimal: Decimal,
): PrimitiveResult {
  const r = rate(rateDecimal);
  const limit = moneyFromDecimal(threshold, base.currency);
  if (compare(base, limit) <= 0) {
    return {
      amount: zero(base.currency),
      formula: `${amt(base)} \u2264 ${amt(limit)} \u2192 0,00`,
    };
  }
  return {
    amount: toMoney(applyRate(toPrecise(base), r), base.currency),
    formula: `${amt(base)} > ${amt(limit)} \u2192 ${amt(base)} ${TIMES} ${pct(r)}`,
  };
}
