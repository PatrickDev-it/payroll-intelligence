/**
 * German closed forms — primitive 9.
 *
 * §32a EStG is the reason this primitive exists at all. The German income tax
 * is not a bracket table: zones 2 and 3 are quadratic polynomials whose
 * marginal rate rises CONTINUOUSLY from 14% to 42%. A bracket table is not an
 * approximation of that function, it is a different function, and modelling it
 * as one is the classic error in German net calculators.
 *
 * All arithmetic is exact integer arithmetic on bigints. The polynomial has a
 * squared term, so a float would accumulate error precisely where the statute
 * is most sensitive — and the statute itself is stated to the cent.
 */

import type { Money } from "@engine/money/money.ts";
import { fromCents } from "@engine/money/money.ts";
import { registerFormula } from "@engine/primitives/lookup.ts";
import type { Decimal, PrimitiveResult } from "@engine/primitives/types.ts";
import { amt, num } from "@engine/primitives/format.ts";

/** A decimal string as an exact bigint of hundredths (cents). */
function cents(decimal: Decimal): bigint {
  const [whole = "0", fraction = ""] = decimal.split(".");
  const padded = (fraction + "00").slice(0, 2);
  const magnitude = BigInt(whole.replace("-", "")) * 100n + BigInt(padded);
  return decimal.startsWith("-") ? -magnitude : magnitude;
}

function param(params: Readonly<Record<string, Decimal>>, name: string): Decimal {
  const value = params[name];
  if (value === undefined) throw new TypeError(`DE.ESTG.32A needs params.${name}`);
  return value;
}

/** Whole euros, rounded DOWN — §32a Abs. 1: the tax is computed on `x`, the zvE truncated. */
function wholeEuros(m: Money): bigint {
  return BigInt(Math.floor(m.cents / 100));
}

/**
 * §32a Abs. 1 EStG, ab Veranlagungszeitraum 2026.
 *
 *   x ≤ 12 348                 0
 *   12 349 … 17 799            (914,51 · y + 1 400) · y        y = (x − 12 348)/10 000
 *   17 800 … 69 878            (173,10 · z + 2 397) · z + 1 034,87   z = (x − 17 799)/10 000
 *   69 879 … 277 825           0,42 · x − 11 135,63
 *   ab 277 826                 0,45 · x − 19 470,38
 *
 * The resulting amount is rounded down to a full euro.
 *
 * Every coefficient above comes from the rule file, not from this code: the
 * §32a numbers are re-legislated most years and a reader must be able to diff
 * them without reading TypeScript.
 */
export function einkommensteuer(base: Money, params: Readonly<Record<string, Decimal>>): PrimitiveResult {
  const x = wholeEuros(base);
  const currency = base.currency;

  const grundfreibetrag = BigInt(param(params, "grundfreibetrag"));
  const zone2Upper = BigInt(param(params, "zone2Upper"));
  const zone3Upper = BigInt(param(params, "zone3Upper"));
  const zone4Upper = BigInt(param(params, "zone4Upper"));

  if (x <= grundfreibetrag) {
    return {
      amount: fromCents(0, currency),
      formula: `${amt(base)} ≤ ${amt(fromCents(Number(grundfreibetrag) * 100, currency))} (Grundfreibetrag) → 0,00`,
    };
  }

  if (x <= zone2Upper) {
    // (a · y + b) · y with y = d/10 000, in cents:
    //   100 · (a · d² / 10⁸ + b · d / 10⁴) = (a₍cents₎ · d² + b₍cents₎ · d · 10⁴) / 10⁸
    const d = x - grundfreibetrag;
    const a = cents(param(params, "zone2QuadraticCoefficient"));
    const b = cents(param(params, "zone2LinearCoefficient"));
    const taxCents = (a * d * d + b * d * 10_000n) / 100_000_000n;
    return {
      amount: floorToEuro(taxCents, currency),
      formula:
        `(${num(param(params, "zone2QuadraticCoefficient"))} × y + ` +
        `${num(param(params, "zone2LinearCoefficient"))}) × y, y = ${ratio(d)} (§ 32a Abs. 1 Nr. 2)`,
    };
  }

  if (x <= zone3Upper) {
    const e = x - zone2Upper;
    const a = cents(param(params, "zone3QuadraticCoefficient"));
    const b = cents(param(params, "zone3LinearCoefficient"));
    const c = cents(param(params, "zone3Constant"));
    const taxCents = (a * e * e + b * e * 10_000n + c * 100_000_000n) / 100_000_000n;
    return {
      amount: floorToEuro(taxCents, currency),
      formula:
        `(${num(param(params, "zone3QuadraticCoefficient"))} × z + ` +
        `${num(param(params, "zone3LinearCoefficient"))}) × z + ` +
        `${num(param(params, "zone3Constant"))}, z = ${ratio(e)} (§ 32a Abs. 1 Nr. 3)`,
    };
  }

  const proportional = x <= zone4Upper;
  const rateKey = proportional ? "zone4Rate" : "zone5Rate";
  const subtrahendKey = proportional ? "zone4Subtrahend" : "zone5Subtrahend";
  const rateCents = cents(param(params, rateKey)); // 0,42 → 42 hundredths
  const taxCents = rateCents * x - cents(param(params, subtrahendKey));

  return {
    amount: floorToEuro(taxCents, currency),
    formula:
      `${num(param(params, rateKey))} × ${x} − ${num(param(params, subtrahendKey))} ` +
      `(§ 32a Abs. 1 Nr. ${proportional ? 4 : 5})`,
  };
}

/** "1,6761" — the y/z of the statute, a ten-thousandth of the excess. */
function ratio(excessEuros: bigint): string {
  const whole = excessEuros / 10_000n;
  const fraction = (excessEuros % 10_000n).toString().padStart(4, "0");
  return `${whole},${fraction}`;
}

function floorToEuro(taxCents: bigint, currency: Money["currency"]): Money {
  const clamped = taxCents < 0n ? 0n : taxCents;
  return fromCents(Number((clamped / 100n) * 100n), currency);
}

registerFormula("DE.ESTG.32A", einkommensteuer);

/** Importing this module registers the formulas. Nothing else to call. */
export const DE_FORMULAS = ["DE.ESTG.32A"] as const;
