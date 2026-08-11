/**
 * Authority-pinned 2026 constants at the points where one stale number changes
 * real output.  These are deliberately independent of each country's fixture
 * totals: a golden total derived from the same rule file cannot detect that the
 * rule file itself is from the wrong year.
 */

import { describe, expect, it } from "vitest";
import { fromCents, money } from "@engine/money/money.ts";
import { applyRule } from "@engine/pipeline/helpers.ts";
import { loadGermanRules } from "./de/rules/index.ts";
import { loadSpanishRules } from "./es/rules/index.ts";
import { loadFrenchRules } from "./fr/rules/index.ts";
import { loadItalianRules } from "./it/rules/index.ts";

describe("2026 authority boundaries", () => {
  it("Italy starts the additional 1% IVS only above EUR 56,224", () => {
    const rules = loadItalianRules(2026)!;
    const below = applyRule(rules, "IT.INPS.EMPLOYEE.ADDITIONAL_1PCT", money(56_224, "EUR"));
    const oneCentAbove = applyRule(
      rules,
      "IT.INPS.EMPLOYEE.ADDITIONAL_1PCT",
      { cents: 5_622_401, currency: "EUR" },
    );

    expect(below.amount.cents).toBe(0);
    expect(oneCentAbove.amount.cents).toBe(0); // 1% of one cent rounds to zero
    expect(
      applyRule(rules, "IT.INPS.EMPLOYEE.ADDITIONAL_1PCT", money(56_225, "EUR")).amount.cents,
    ).toBe(1);
  });

  it("Germany caps health contributions at EUR 69,750 and pension at EUR 101,400", () => {
    const rules = loadGermanRules(2026)!;
    const health = applyRule(rules, "DE.KV.EMPLOYEE.BASE", money(1_000_000, "EUR"));
    const pension = applyRule(rules, "DE.RV.EMPLOYEE", money(1_000_000, "EUR"));
    expect(health.amount.cents).toBe(509_175);
    expect(pension.amount.cents).toBe(943_020);
  });

  it("Spain uses the EUR 5,101.20 monthly ceiling and 0.15% employee MEI", () => {
    const rules = loadSpanishRules(2026)!;
    const annualCeiling = fromCents(6_121_440, "EUR");
    expect(applyRule(rules, "ES.SS.EMPLOYEE.MEI", annualCeiling).amount.cents).toBe(9_182);

    const firstSolidarityEuro = applyRule(
      rules,
      "ES.SS.EMPLOYEE.SOLIDARIDAD",
      { cents: annualCeiling.cents + 100, currency: "EUR" },
    );
    expect(firstSolidarityEuro.amount.cents).toBe(0); // 0.19 cent rounds down at this primitive step
  });

  it("France uses PASS EUR 48,060 for the employee pension band", () => {
    const rules = loadFrenchRules(2026)!;
    const capped = applyRule(rules, "FR.SAL.VIEILLESSE.PLAFONNEE", money(1_000_000, "EUR"));
    expect(capped.amount.cents).toBe(331_614);
  });

  it("France fixes the 2026 RGDU reference at the 1 January SMIC and EUR 65,629.20", () => {
    const rule = loadFrenchRules(2026)!.rules["FR.PAT.REDUCTION_GENERALE"]!;
    expect(rule.config.kind).toBe("formula");
    if (rule.config.kind !== "formula") throw new Error("unreachable");
    const smic = Number(rule.config.params["smicAnnual"]);
    const multiple = Number(rule.config.params["multiple"]);
    expect(smic).toBe(21_876.4);
    expect(smic * multiple).toBeCloseTo(65_629.2, 8);
    expect(rule.source.url).toContain("JORFTEXT000054248488");
  });
});
