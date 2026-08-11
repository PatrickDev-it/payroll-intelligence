/**
 * Money — an integer number of cents, and nothing else.
 *
 * Three types, three jobs:
 *
 *   Money    the settled, presentable amount: integer cents.
 *   Precise  an intermediate in MICRO-cents (see ./decimal.ts). Primitives
 *            compute in Precise and materialise once, so summing bracket slices
 *            does not round each slice.
 *   Rate     an exact decimal in parts-per-billion (see ./rate.ts).
 *
 * On rounding. The statute decides where it happens, and `roundToUnit` is always called
 * explicitly. Rounding Precise -> Money is a different thing: the cent is the
 * smallest representable unit of money and every payslip line is expressed in
 * cents, so materialising a line at cent resolution is faithful. What would be
 * wrong is rounding an intermediate, and Precise exists to make that impossible
 * by accident.
 */

import {
  DECIMAL_PATTERN,
  MICRO,
  type Precise,
  type Rounding,
  divideRounded,
  splitDecimal,
} from "./decimal.ts";

export type { Precise, Rounding } from "./decimal.ts";
export type { Rate } from "./rate.ts";
export type { DeclaredPercentage } from "./rate.ts";
export {
  InvalidDeclaredPercentageError,
  InvalidRateError,
  applyRate,
  parseDeclaredPercentage,
  rate,
  ratePercent,
} from "./rate.ts";

export type Currency = "EUR" | "BGN" | "CZK" | "DKK" | "HUF" | "PLN" | "RON" | "SEK";

export type Money = {
  readonly cents: number;
  readonly currency: Currency;
};

export class CurrencyMismatchError extends Error {
  constructor(a: Currency, b: Currency) {
    super(`Cannot combine ${a} with ${b}: currencies must match`);
    this.name = "CurrencyMismatchError";
  }
}

// ─── Constructors ────────────────────────────────────────────────────────────

export function zero(currency: Currency): Money {
  return { cents: 0, currency };
}

/** `money(45_000, "EUR")` — from a whole major unit. */
export function money(major: number, currency: Currency): Money {
  if (!Number.isInteger(major)) {
    throw new TypeError(`money() takes a whole major unit; got ${major}. Use fromCents().`);
  }
  return { cents: major * 100, currency };
}

export function fromCents(cents: number, currency: Currency): Money {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`Money must be an integer number of cents; got ${cents}`);
  }
  return { cents, currency };
}

/**
 * Build Money from an exact decimal string: `moneyFromDecimal("2840.51", "EUR")`.
 *
 * Rule data stores every numeric value as a decimal STRING — thresholds and
 * rates alike. Two reasons, and the second is the one that matters: JSON numbers
 * are IEEE 754 doubles, so a threshold could arrive already approximated; and a
 * string keeps the file readable to the person checking it against the statute,
 * where "2840.51" appears verbatim.
 */
export function moneyFromDecimal(decimal: string, currency: Currency): Money {
  if (!DECIMAL_PATTERN.test(decimal)) {
    throw new TypeError(`Expected a decimal amount like "2840.51"; got ${JSON.stringify(decimal)}`);
  }
  const { negative, whole, fraction } = splitDecimal(decimal);
  if (fraction.length > 2) {
    throw new TypeError(`Amount ${JSON.stringify(decimal)} has sub-cent precision`);
  }
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || "0");
  return { cents: negative ? -cents : cents, currency };
}

// ─── Precise <-> Money ───────────────────────────────────────────────────────

export function toPrecise(m: Money): Precise {
  return BigInt(m.cents) * MICRO;
}

export function toMoney(p: Precise, currency: Currency, mode: Rounding = "half-up"): Money {
  return fromCents(Number(divideRounded(p, MICRO, mode)), currency);
}

/**
 * Explicit statutory or presentation-unit rounding.
 */
export function roundToUnit(m: Money, unitCents: number, mode: Rounding = "half-up"): Money {
  if (!Number.isInteger(unitCents) || unitCents <= 0) {
    throw new TypeError(`roundToUnit needs a positive integer unit; got ${unitCents}`);
  }
  const unit = BigInt(unitCents);
  return fromCents(Number(divideRounded(BigInt(m.cents), unit, mode) * unit), m.currency);
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { cents: a.cents + b.cents, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { cents: a.cents - b.cents, currency: a.currency };
}

export function sum(items: readonly Money[], currency: Currency): Money {
  return items.reduce<Money>((total, item) => add(total, item), zero(currency));
}

/**
 * `-0` is normalised to `0`. JavaScript distinguishes them under `Object.is`
 * and JSON.stringify emits `-0` as `0`, so a negated zero would compare unequal
 * to itself across a serialisation boundary — and a zero-amount line is exactly
 * what a threshold exemption produces.
 */
export function negate(m: Money): Money {
  return { cents: m.cents === 0 ? 0 : -m.cents, currency: m.currency };
}

/**
 * Split an amount into equal parts — annual net into 12, 13 or 14 instalments.
 * The rounding mode is explicit because the remainder has to land somewhere.
 */
export function divide(m: Money, divisor: number, mode: Rounding = "half-up"): Money {
  if (!Number.isInteger(divisor) || divisor === 0) {
    throw new TypeError(`divide() needs a non-zero integer divisor; got ${divisor}`);
  }
  return fromCents(Number(divideRounded(BigInt(m.cents), BigInt(divisor), mode)), m.currency);
}

// ─── Comparison ──────────────────────────────────────────────────────────────

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.cents === b.cents ? 0 : a.cents < b.cents ? -1 : 1;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.cents === b.cents;
}

export function min(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}

export function max(a: Money, b: Money): Money {
  return compare(a, b) >= 0 ? a : b;
}

export function isZero(m: Money): boolean {
  return m.cents === 0;
}

export function isNegative(m: Money): boolean {
  return m.cents < 0;
}

/** Credits reduce tax to zero, never below (art. 13 TUIR). */
export function clampAtZero(m: Money): Money {
  return m.cents < 0 ? zero(m.currency) : m;
}

// ─── Presentation ────────────────────────────────────────────────────────────

export function toMajorNumber(m: Money): number {
  return m.cents / 100;
}

export function format(m: Money, locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency }).format(
    toMajorNumber(m),
  );
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
}
