/**
 * Integer helpers shared by Money and Rate. No floating point, no domain.
 */

/** An exact decimal string: "0.0919", "2840.51", "-13.5". */
export const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export type Rounding = "half-up" | "half-even" | "floor" | "ceil";

/** Micro-cents: an intermediate with 1e6 the resolution of a cent. */
export type Precise = bigint;

/** 1 cent, in micro-cents. */
export const MICRO = 1_000_000n;

/** 1.0, in parts per billion. */
export const PPB = 1_000_000_000n;

export type DecimalParts = {
  readonly negative: boolean;
  readonly whole: string;
  readonly fraction: string;
};

export function splitDecimal(decimal: string): DecimalParts {
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  return { negative, whole, fraction };
}

/**
 * Integer division with an EXPLICIT rounding mode, exact for any sign.
 *
 * Explicit because the statute decides: Italian IRPEF rounds half-up to the
 * euro (art. 11 c. 4 TUIR), and a default would let that decision be made by
 * whoever wrote the call site.
 */
export function divideRounded(numerator: bigint, denominator: bigint, mode: Rounding): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) return quotient;

  const negative = numerator < 0n !== denominator < 0n;
  const twiceRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
  const absDenominator = denominator < 0n ? -denominator : denominator;

  switch (mode) {
    case "floor":
      return negative ? quotient - 1n : quotient;
    case "ceil":
      return negative ? quotient : quotient + 1n;
    case "half-up":
      if (twiceRemainder < absDenominator) return quotient;
      return negative ? quotient - 1n : quotient + 1n;
    case "half-even":
      if (twiceRemainder < absDenominator) return quotient;
      if (twiceRemainder > absDenominator) return negative ? quotient - 1n : quotient + 1n;
      return quotient % 2n === 0n ? quotient : negative ? quotient - 1n : quotient + 1n;
  }
}
