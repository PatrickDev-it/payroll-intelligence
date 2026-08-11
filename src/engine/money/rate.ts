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

/**
 * A percentage entered in percentage points (for example `9.19`), normalised
 * to the engine's fractional Rate (`0.0919`) without floating-point maths.
 */
export type DeclaredPercentage = {
  readonly decimal: string;
  readonly rate: Rate;
};

export class InvalidRateError extends Error {
  constructor(input: string, why: string) {
    super(`Invalid rate ${JSON.stringify(input)}: ${why}`);
    this.name = "InvalidRateError";
  }
}

export class InvalidDeclaredPercentageError extends Error {
  constructor(input: string | number, why: string) {
    super(`Invalid declared percentage ${JSON.stringify(input)}: ${why}`);
    this.name = "InvalidDeclaredPercentageError";
  }
}

const DECLARED_PERCENTAGE_PATTERN = /^(\d+)(?:\.(\d+))?$/;
const PERCENTAGE_POINT_SCALE = 1_000_000n;

/**
 * Parse an employer/authority percentage exactly. The input is percentage
 * points, capped at six decimals because that maps exactly to a ppb Rate.
 * Numbers remain accepted for compatibility, but are converted to their
 * ordinary decimal spelling immediately; scientific notation is refused.
 */
export function parseDeclaredPercentage(input: string | number): DeclaredPercentage {
  if (typeof input === "number" && !Number.isFinite(input)) {
    throw new InvalidDeclaredPercentageError(input, "expected a finite decimal");
  }

  const text = typeof input === "number" ? String(input) : input;
  const match = DECLARED_PERCENTAGE_PATTERN.exec(text);
  if (!match) {
    throw new InvalidDeclaredPercentageError(
      input,
      'expected percentage points as an ordinary decimal like "9.19"',
    );
  }

  const fraction = match[2] ?? "";
  if (fraction.length > 6) {
    throw new InvalidDeclaredPercentageError(input, "more than six decimal places");
  }

  const whole = BigInt(match[1]!);
  const millionths = whole * PERCENTAGE_POINT_SCALE + BigInt(fraction.padEnd(6, "0") || "0");
  if (millionths > 100n * PERCENTAGE_POINT_SCALE) {
    throw new InvalidDeclaredPercentageError(input, "must be between 0 and 100");
  }

  const canonicalFraction = fraction.replace(/0+$/, "");
  const decimal = `${whole}${canonicalFraction ? `.${canonicalFraction}` : ""}`;
  return {
    decimal,
    // 1 percentage point = 0.01 = 10,000,000 parts per billion.
    rate: { ppb: millionths * 10n },
  };
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
