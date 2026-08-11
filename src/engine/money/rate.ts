/**
 * Rate — an exact decimal held as integer parts-per-billion.
 *
 * Built from a STRING, never a number: `0.0919 * 1e9` is 91899999.99999999 in
 * IEEE 754, and a contribution rate must not depend on binary floating point.
 */

import { DECIMAL_PATTERN, PPB, type Precise, splitDecimal } from "./decimal.ts";

export type Rate = {
  /** Parts per billion. 0.0919 -> 91_900_000n */
  readonly ppb: bigint;
};

export class InvalidRateError extends Error {
  constructor(input: string, why: string) {
    super(`Invalid rate ${JSON.stringify(input)}: ${why}`);
    this.name = "InvalidRateError";
  }
}

export function rate(decimal: string): Rate {
  if (!DECIMAL_PATTERN.test(decimal)) {
    throw new InvalidRateError(decimal, 'expected a decimal like "0.0919"');
  }
  const { negative, whole, fraction } = splitDecimal(decimal);
  if (fraction.length > 9) {
    throw new InvalidRateError(decimal, "more than 9 decimal places (sub-ppb precision)");
  }
  const scaled = BigInt(whole) * PPB + BigInt(fraction.padEnd(9, "0") || "0");
  return { ppb: negative ? -scaled : scaled };
}

/**
 * Apply a rate to a precise amount. Exact: truncates at micro-cent resolution,
 * i.e. below one millionth of a cent.
 */
export function applyRate(base: Precise, r: Rate): Precise {
  return (base * r.ppb) / PPB;
}

/** For display only — never feed this back into arithmetic. */
export function ratePercent(r: Rate): number {
  return Number(r.ppb) / 1e7;
}
