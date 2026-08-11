import type { Money } from "@engine/money/money.ts";
import { toMajorNumber } from "@engine/money/money.ts";
import { LOCALE_TAG, type Locale } from "./i18n.ts";

/**
 * `useGrouping: "always"` is not a stylistic preference.
 *
 * CLDR gives Italian `minimumGroupingDigits: 2`, so by default Intl renders
 * 2145,32 € and 45.000,00 € on the same screen — the four-digit figure loses
 * its separator. On a payroll breakdown that is the difference between reading
 * a monthly net at a glance and re-counting the digits, and every payslip an
 * Italian has ever held writes it 2.145,32. Forced, once, here.
 */
function formatter(locale: Locale, fractionDigits: 0 | 2): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  });
}

export function euro(m: Money, locale: Locale = "it"): string {
  return formatter(locale, 2).format(toMajorNumber(m));
}

export function euroWhole(m: Money, locale: Locale = "it"): string {
  return formatter(locale, 0).format(toMajorNumber(m));
}

/** Signed, with an explicit sign so a withholding reads as one at a glance. */
export function euroSigned(m: Money, locale: Locale = "it"): string {
  const eur = formatter(locale, 2);
  if (m.cents === 0) return eur.format(0);
  const formatted = eur.format(Math.abs(toMajorNumber(m)));
  return `${m.cents < 0 ? "−" : "+"}${formatted}`;
}

export function percent(ratio: number, locale: Locale = "it"): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
}

/**
 * "1,37×" — the employer cost as a multiple of the gross. Two decimals, in one
 * place, because it appears both in the summary and on the employer card and
 * the same ratio printed to different precisions reads as two different facts.
 */
export function multiplier(ratio: number, locale: Locale = "it"): string {
  return `${new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ratio)}×`;
}

/** A line's share of gross, for the inline bar. Clamped so a bar never overflows. */
export function shareOf(part: Money, whole: Money): number {
  if (whole.cents === 0) return 0;
  return Math.min(1, Math.abs(part.cents) / Math.abs(whole.cents));
}
