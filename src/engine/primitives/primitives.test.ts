/**
 * Golden cases, not synthetic ones. Every expected value below is taken from
 * docs/countries/IT/ so that a primitive and the knowledge base cannot drift
 * apart silently.
 */

import { describe, expect, it } from "vitest";
import { fromCents, money, moneyFromDecimal } from "../money/money.ts";
import { applyPrimitive } from "./apply.ts";
import { progressiveBrackets } from "./brackets.ts";
import { taperedCredit } from "./credits.ts";
import { UnknownFormulaError, UnknownLookupKeyError, applyFormula, lookupTable } from "./lookup.ts";
import { cappedRate, thresholdExemption } from "./rates.ts";
import type { Band, TaperSegment } from "./types.ts";

/** IT.IRPEF.BRACKETS@2026 — art. 11 TUIR as amended by L. 199/2025 art. 1 c. 3. */
const IRPEF_2026: readonly Band[] = [
  { from: "0", to: "28000", rate: "0.23" },
  { from: "28000", to: "50000", rate: "0.33" },
  { from: "50000", to: null, rate: "0.43" },
];

/** IT.ADDIZIONALE.REGIONALE.LOMBARDIA@2026 — per slice, L.R. 10/2003 art. 72. */
const LOMBARDIA_2026: readonly Band[] = [
  { from: "0", to: "15000", rate: "0.0123" },
  { from: "15000", to: "28000", rate: "0.0158" },
  { from: "28000", to: "50000", rate: "0.0172" },
  { from: "50000", to: null, rate: "0.0173" },
];

/** IT.IRPEF.DETRAZIONE.LAVORO@2026 — art. 13 TUIR, three segments in one rule. */
const DETRAZIONE_LAVORO: readonly TaperSegment[] = [
  { from: "0", to: "15000", max: "1955", floor: "1955" },
  { from: "15000", to: "28000", max: "3100", floor: "1910" },
  { from: "28000", to: "50000", max: "1910", floor: "0" },
];

const TAXABLE_45K = moneyFromDecimal("40864.50", "EUR"); // 45,000 RAL less 9.19% INPS

describe("progressive_brackets", () => {
  it("computes IRPEF lorda on the reference case", () => {
    // 28,000.00 x 23% + 12,864.50 x 33% = 10,685.29
    const result = progressiveBrackets(TAXABLE_45K, IRPEF_2026);
    expect(result.amount.cents).toBe(1_068_529);
    expect(result.formula).toBe("28.000,00 \u00d7 23% + 12.864,50 \u00d7 33%");
  });

  it("computes the Lombardy regional surtax per slice", () => {
    // 184.50 + 205.40 + 221.27 = 611.17
    expect(progressiveBrackets(TAXABLE_45K, LOMBARDIA_2026).amount.cents).toBe(61_117);
  });

  it("crosses the 50,000 boundary into 43% without disturbing the lower slices", () => {
    const at50k = progressiveBrackets(money(50_000, "EUR"), IRPEF_2026);
    const justOver = progressiveBrackets(fromCents(5_000_001, "EUR"), IRPEF_2026);
    expect(at50k.amount.cents).toBe(1_370_000); // 6,440 + 7,260
    expect(justOver.amount.cents - at50k.amount.cents).toBe(0); // 1 cent x 43% rounds to 0
  });

  it("sums slices before rounding, not after", () => {
    // Two half-cent slices: 0.5 + 0.5 = 1 cent, not 1 + 1 = 2 cents.
    const halves: readonly Band[] = [
      { from: "0", to: "0.01", rate: "0.5" },
      { from: "0.01", to: "0.02", rate: "0.5" },
    ];
    expect(progressiveBrackets(fromCents(2, "EUR"), halves).amount.cents).toBe(1);
  });

  it("returns zero when no band is reached", () => {
    expect(progressiveBrackets(fromCents(0, "EUR"), IRPEF_2026).amount.cents).toBe(0);
  });
});

describe("tapered_credit", () => {
  it("computes the art. 13 employment credit at 40,864.50", () => {
    // 1,910 x (50,000 - 40,864.50) / 22,000 = 793.13
    expect(taperedCredit(TAXABLE_45K, DETRAZIONE_LAVORO).amount.cents).toBe(79_313);
  });

  it("computes the middle segment at 27,243 (floor plus tapered remainder)", () => {
    // 1,910 + 1,190 x (28,000 - 27,243) / 13,000 = 1,979.29
    const at27k = taperedCredit(moneyFromDecimal("27243", "EUR"), DETRAZIONE_LAVORO);
    expect(at27k.amount.cents).toBe(197_929);
  });

  it("holds the plateau below 15,000", () => {
    expect(taperedCredit(money(10_000, "EUR"), DETRAZIONE_LAVORO).amount.cents).toBe(195_500);
  });

  it("reaches exactly zero at 50,000 and stays there", () => {
    expect(taperedCredit(money(50_000, "EUR"), DETRAZIONE_LAVORO).amount.cents).toBe(0);
    expect(taperedCredit(money(60_000, "EUR"), DETRAZIONE_LAVORO).amount.cents).toBe(0);
  });
});

describe("threshold_exemption — the Milan cliff", () => {
  const MILANO = { threshold: "23000", rate: "0.008" };

  it("charges nothing at the threshold", () => {
    const at = thresholdExemption(money(23_000, "EUR"), MILANO.threshold, MILANO.rate);
    expect(at.amount.cents).toBe(0);
  });

  it("charges the whole base one euro above it", () => {
    // 23,001 x 0.80% = 184.01 — a EUR 184 drop in net for EUR 1 more gross.
    const over = thresholdExemption(money(23_001, "EUR"), MILANO.threshold, MILANO.rate);
    expect(over.amount.cents).toBe(18_401);
  });

  it("charges the whole base, never the excess, on the reference case", () => {
    const result = thresholdExemption(TAXABLE_45K, MILANO.threshold, MILANO.rate);
    expect(result.amount.cents).toBe(32_692); // 40,864.50 x 0.80%
  });
});

describe("capped_rate", () => {
  it("stops the Italian contribution at the massimale", () => {
    // 122,295 x 9.19% = 11,238.91, regardless of a 150,000 salary
    const result = cappedRate(money(150_000, "EUR"), "0.0919", "122295");
    expect(result.amount.cents).toBe(1_123_891);
    // Symbolic, not prose: the derivation shows the cap being applied.
    expect(result.formula).toBe("min(150.000,00; 122.295,00) \u00d7 9,19%");
  });

  it("leaves an uncapped salary alone", () => {
    expect(cappedRate(money(45_000, "EUR"), "0.0919", "122295").amount.cents).toBe(413_550);
  });
});

describe("fail-closed lookups", () => {
  it("refuses an unknown risk class rather than defaulting", () => {
    expect(() =>
      lookupTable(money(45_000, "EUR"), "rate", { office: "0.004" }, "quarrying", undefined),
    ).toThrow(UnknownLookupKeyError);
  });

  it("refuses an unregistered formula", () => {
    expect(() => applyFormula(money(45_000, "EUR"), "DE.EStG.32a", {})).toThrow(UnknownFormulaError);
  });
});

describe("applyPrimitive dispatch", () => {
  it("routes each shape without ever branching on country", () => {
    const base = money(45_000, "EUR");
    expect(applyPrimitive({ kind: "flat_rate", rate: "0.0919" }, { base }).amount.cents).toBe(413_550);
    expect(
      applyPrimitive({ kind: "progressive_brackets", brackets: IRPEF_2026 }, { base: TAXABLE_45K })
        .amount.cents,
    ).toBe(1_068_529);
    expect(
      applyPrimitive({ kind: "banded_rate", bands: LOMBARDIA_2026 }, { base: TAXABLE_45K }).amount
        .cents,
    ).toBe(70_287); // whole base x 1.72% — deliberately different from the per-slice 611.17
  });
});
