/**
 * Derivation formatting. Lives next to the arithmetic on purpose: the formula
 * string is built where the numbers are computed, so the Explain drawer can
 * never disagree with the result it explains.
 *
 * Derivations are SYMBOLIC, never prose: `min(45.000,00; 122.295,00) × 9,19%`
 * rather than "capped at the ceiling". Two reasons — adapters own national
 * terminology, and a reader
 * checking a figure against a statute wants the arithmetic, not a sentence
 * about it. Words that are genuinely country-specific belong in the country
 * adapter, which is allowed to speak its own language.
 */

import type { Money, Rate } from "../money/money.ts";
import { ratePercent, toMajorNumber } from "../money/money.ts";

// `useGrouping: "always"`: Italian CLDR omits the separator on four-digit
// numbers, which would print a derivation as "1034,87" beside "28.000,00".
const AMOUNT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // `true` is the legacy spelling of "always" and is what this TS lib types.
  useGrouping: true,
});

const PERCENT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

/** "28.000,00" */
export function amt(m: Money): string {
  return AMOUNT.format(toMajorNumber(m));
}

/** "23%", "9,19%", "0,8%" */
export function pct(r: Rate): string {
  return `${PERCENT.format(Number(ratePercent(r).toFixed(7)))}%`;
}

/** "13,5" — a bare decimal that is not money and not a rate. */
export function num(decimal: string): string {
  return decimal.replace(".", ",");
}

export const TIMES = "×";
export const MINUS = "−";
