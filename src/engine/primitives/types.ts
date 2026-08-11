/**
 * The nine rule SHAPES (docs/01-common-model.md §5).
 *
 * These are the only calculation forms the engine knows. Every supported
 * member states is expressed by configuring them — which is what makes "adding
 * a country adds files, not code" true rather than aspirational. A tenth
 * primitive needs a statute that genuinely does not fit, not a `switch`.
 *
 * Every numeric value is an exact decimal STRING; see moneyFromDecimal().
 */

import type { Money } from "../money/money.ts";

export type Decimal = string;

/** `to: null` means "and above". */
export type Band = {
  readonly from: Decimal;
  readonly to: Decimal | null;
  readonly rate: Decimal;
};

/**
 * One segment of a tapered credit. Between `from` and `to` the credit falls
 * linearly from `max` to `floor`; `to: null` holds `max` indefinitely.
 *
 * Italian art. 13 TUIR is three segments in one rule:
 *   { from 0,     to 15000, max 1955, floor 1955 }   flat
 *   { from 15000, to 28000, max 3100, floor 1910 }   1910 + 1190 x (28000-R)/13000
 *   { from 28000, to 50000, max 1910, floor 0    }   1910 x (50000-R)/22000
 */
export type TaperSegment = {
  readonly from: Decimal;
  readonly to: Decimal | null;
  readonly max: Decimal;
  readonly floor: Decimal;
};

export type PrimitiveConfig =
  /** 1. Marginal rate per slice. IT IRPEF, ES IRPF, FR IR, PT IRS. */
  | { readonly kind: "progressive_brackets"; readonly brackets: readonly Band[] }
  /** 2. One rate on the whole base. Most contributions. */
  | { readonly kind: "flat_rate"; readonly rate: Decimal }
  /** 3. Rate up to a ceiling. DE, FR and ES contributions. */
  | { readonly kind: "capped_rate"; readonly rate: Decimal; readonly ceiling: Decimal }
  /** 4. Rate on the base, floored at a minimum. IT minimale, ES base minima. */
  | { readonly kind: "floored_rate"; readonly rate: Decimal; readonly floor: Decimal }
  /** 5. The band's rate applies to the WHOLE base, not the slice. Some regional surtaxes. */
  | { readonly kind: "banded_rate"; readonly bands: readonly Band[] }
  /** 6. A credit that tapers with income. Italian detrazioni and Spanish art. 20. */
  | { readonly kind: "tapered_credit"; readonly segments: readonly TaperSegment[] }
  /** 7. Zero below a threshold, then the rate on the ENTIRE base. IT addizionale comunale. */
  | {
      readonly kind: "threshold_exemption";
      readonly threshold: Decimal;
      readonly rate: Decimal;
    }
  /** 8. A discrete value by key. IT INAIL risk class, DE church tax by Land. */
  | {
      readonly kind: "lookup_table";
      readonly valueKind: "rate" | "amount";
      readonly entries: Readonly<Record<string, Decimal>>;
      readonly defaultKey?: string;
    }
  /**
   * 9. A closed-form expression the other eight cannot express. German
   * Einkommensteuer is a piecewise polynomial under §32a EStG — modelling it as
   * brackets is the classic error. Implementations live in a named registry so
   * that rule data still contains no code.
   */
  | {
      readonly kind: "formula";
      readonly formulaId: string;
      readonly params: Readonly<Record<string, Decimal>>;
    };

export type PrimitiveKind = PrimitiveConfig["kind"];

/** What a primitive needs beyond its configuration. */
export type PrimitiveInput = {
  /** The amount the rule applies to — its `basis`, resolved by the adapter. */
  readonly base: Money;
  /** For lookup_table: the risk class, Land, sector code. */
  readonly key?: string;
};

/**
 * The result carries its own derivation. `formula` is what the Explain drawer
 * shows, so it is built where the arithmetic happens and nowhere else — a
 * derivation reconstructed later is a second implementation that can disagree
 * with the first.
 */
export type PrimitiveResult = {
  readonly amount: Money;
  readonly formula: string;
};
