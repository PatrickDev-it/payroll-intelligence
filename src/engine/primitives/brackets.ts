/**
 * Primitives 1 and 5 — the two ways a band table can behave, and the difference
 * between them is a real source of wrong numbers.
 *
 *   progressive_brackets  each rate applies only to the slice inside its band
 *   banded_rate           the band's rate applies to the WHOLE base
 *
 * Lombardy applies its addizionale regionale per slice (L.R. 10/2003 art. 72);
 * other Italian regions apply one rate to the entire base once a threshold is
 * crossed. Generalising either convention nationally is a systematic error, so
 * the rule data says which one it is.
 */

import type { Money, Precise } from "../money/money.ts";
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
import { TIMES, amt, pct } from "./format.ts";
import type { Band, PrimitiveResult } from "./types.ts";

/**
 * 1. progressive_brackets — marginal rate per slice.
 *
 * The whole table is summed in Precise and materialised once, so slices are not
 * rounded individually: 28,000 x 23% + 12,864.50 x 33% is 10,685.285, which
 * becomes 10,685.29 exactly once, at the end.
 */
export function progressiveBrackets(base: Money, brackets: readonly Band[]): PrimitiveResult {
  let total: Precise = 0n;
  const steps: string[] = [];

  for (const band of brackets) {
    const from = moneyFromDecimal(band.from, base.currency);
    if (compare(base, from) <= 0) continue;

    const upper = band.to === null ? base : minMoney(base, moneyFromDecimal(band.to, base.currency));
    const slice = subtract(upper, from);
    if (slice.cents <= 0) continue;

    const r = rate(band.rate);
    total += applyRate(toPrecise(slice), r);
    steps.push(`${amt(slice)} ${TIMES} ${pct(r)}`);
  }

  return {
    amount: toMoney(total, base.currency),
    formula: steps.length > 0 ? steps.join(" + ") : `${amt(base)} \u2192 0,00`,
  };
}

/**
 * 5. banded_rate — the matching band's rate applies to the entire base.
 * Bands are scanned in order; the first whose range contains the base wins.
 */
export function bandedRate(base: Money, bands: readonly Band[]): PrimitiveResult {
  for (const band of bands) {
    const from = moneyFromDecimal(band.from, base.currency);
    if (compare(base, from) < 0) continue;
    if (band.to !== null && compare(base, moneyFromDecimal(band.to, base.currency)) > 0) continue;

    const r = rate(band.rate);
    return {
      amount: toMoney(applyRate(toPrecise(base), r), base.currency),
      formula: `${amt(base)} \u2265 ${amt(from)} \u2192 ${amt(base)} ${TIMES} ${pct(r)}`,
    };
  }
  return { amount: zero(base.currency), formula: `${amt(base)} \u2192 0,00` };
}

function minMoney(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}
