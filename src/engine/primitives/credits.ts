/**
 * Primitive 6 — a credit that tapers with income.
 *
 * The taper is why effective and marginal rates diverge so widely. Italy's
 * employment credit falls by EUR 1,910 across the EUR 28,000-50,000 band, which
 * adds 8.68 points to the marginal rate on taxable income on top of the nominal
 * 33%. Anyone reading only the bracket table sees 33% and is wrong by a quarter.
 */

import type { Money } from "../money/money.ts";
import {
  applyRate,
  compare,
  moneyFromDecimal,
  rate,
  subtract,
  toMoney,
  toPrecise,
  zero,
} from "../money/money.ts";
import { MINUS, TIMES, amt } from "./format.ts";
import type { PrimitiveResult, TaperSegment } from "./types.ts";

/**
 * 6. tapered_credit — piecewise linear in income.
 *
 * Inside a segment the credit falls from `max` at `from` to `floor` at `to`:
 *
 *     credit = floor + (max - floor) x (to - income) / (to - from)
 *
 * A segment with `max === floor` is a plateau; `to: null` holds `max` upward.
 * Income above every segment yields zero.
 */
export function taperedCredit(
  income: Money,
  segments: readonly TaperSegment[],
): PrimitiveResult {
  const currency = income.currency;

  for (const segment of segments) {
    const from = moneyFromDecimal(segment.from, currency);
    if (compare(income, from) < 0) continue;

    const max = moneyFromDecimal(segment.max, currency);
    const floor = moneyFromDecimal(segment.floor, currency);

    if (segment.to === null) {
      return { amount: max, formula: `${amt(max)} (${amt(from)}+)` };
    }

    const to = moneyFromDecimal(segment.to, currency);
    if (compare(income, to) > 0) continue;

    if (max.cents === floor.cents) {
      return {
        amount: max,
        formula: `${amt(max)} (${amt(from)}\u2013${amt(to)})`,
      };
    }

    const span = subtract(to, from);
    if (span.cents <= 0) continue;

    const remaining = subtract(to, income);
    // fraction = remaining / span, exact to the part-per-billion.
    const fraction = rate(ppbRatio(remaining.cents, span.cents));
    const variable = applyRate(toPrecise(subtract(max, floor)), fraction);

    return {
      amount: toMoney(toPrecise(floor) + variable, currency),
      formula:
        `${amt(floor)} + ${amt(subtract(max, floor))} ${TIMES} ` +
        `(${amt(to)} ${MINUS} ${amt(income)}) / ${amt(span)}`,
    };
  }

  return { amount: zero(currency), formula: `${amt(income)} \u2192 0,00` };
}

/**
 * An exact ratio as a 9-decimal string, for `rate()`. Integer arithmetic: the
 * numerator is scaled before dividing, so no float ever holds the fraction.
 */
function ppbRatio(numerator: number, denominator: number): string {
  const scaled = (BigInt(numerator) * 1_000_000_000n) / BigInt(denominator);
  const whole = scaled / 1_000_000_000n;
  const fraction = (scaled % 1_000_000_000n).toString().padStart(9, "0");
  return `${whole}.${fraction}`;
}
