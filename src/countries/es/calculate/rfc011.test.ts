import { describe, expect, it } from "vitest";
import { allLines } from "@engine/model/calculation.ts";
import { fromCents } from "@engine/money/money.ts";
import { spanishAdapter } from "../adapter.ts";
import { contributionBase } from "../base.ts";
import { referenceProfile } from "../fixtures.ts";
import { loadSpanishRules } from "../rules/index.ts";

const rules = loadSpanishRules(2026)!;

function withRate(rate: string | number) {
  const profile = referenceProfile(45_000);
  return {
    ...profile,
    countryOptions: { ...profile.countryOptions, aeatWithholdingRate: rate },
  };
}

describe("RFC 011 — AEAT declared withholding", () => {
  it("applies the authority-provided two-decimal rate exactly and labels its origin", () => {
    const result = spanishAdapter.calculate(withRate("21.05"), rules);
    const withholding = result.employee.taxes[0]!;

    expect(withholding.amount.cents).toBe(-947_250);
    expect(withholding.valueOrigin).toBe("declared_input");
    expect(withholding.taxRole).toBe("payroll_withholding");
    expect(withholding.formula).toContain("21.05%");
  });

  it.each([
    ["0.00", 0],
    ["100.00", -4_500_000],
  ])("accepts the AEAT boundary %s without changing its precision contract", (rate, expected) => {
    expect(spanishAdapter.calculate(withRate(rate), rules).employee.taxes[0]!.amount.cents).toBe(
      expected,
    );
  });

  it("rounds the final annual amount half-up to the cent as AEAT REDONDEAR1 requires", () => {
    const profile = {
      ...withRate("0.50"),
      grossAnnual: fromCents(100, "EUR"),
    };
    expect(spanishAdapter.calculate(profile, rules).employee.taxes[0]!.amount.cents).toBe(-1);
  });

  it.each(["21.051", "21.050", "1e1", -0.01, 100.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses an invalid or non-AEAT rate before calculation: %s",
    (rate) => {
      const profile = withRate(rate);
      expect(spanishAdapter.validate(profile).ok).toBe(false);
      expect(() => spanishAdapter.calculate(profile, rules)).toThrow();
    },
  );

  it("classifies the user rate as supported legal method, not verified AEAT output", () => {
    const rule = rules.rules["ES.IRPF.RETENCION.AEAT"]!;
    expect(rule.verification.status).toBe("supported");
    expect(rule.verification.method).not.toMatch(/official_calculator/);
    expect(rule.source.url).toContain("/Retenciones/2026/ALGORITMO_2026.pdf");
    expect(rule.source.article).toContain("TIPO");
  });
});

describe("RFC 011 — payroll and annual-settlement semantics", () => {
  it("keeps the partial annual estimate nested and out of withholding totals", () => {
    const result = spanishAdapter.calculate(withRate("21.05"), rules);
    const withholding = result.employee.taxes[0]!;
    const estimate = allLines(result).find((line) => line.id === "ES.IRPF.LIABILITY_ESTIMATE")!;

    expect(estimate.taxRole).toBe("annual_settlement_estimate");
    expect(estimate.label).toContain("Stima parziale");
    expect(estimate.formula).toContain("esclude figli, ascendenti, disabilità");
    expect(result.employee.netAnnual.cents).toBe(
      result.employee.gross.cents +
        result.employee.socialSecurity.reduce((total, line) => total + line.amount.cents, 0) +
        withholding.amount.cents,
    );
    expect(result.rates.marginalRatePolicy).toBe("hold_external_inputs");
  });

  it("states the stable full-year remuneration boundary in result metadata", () => {
    const result = spanishAdapter.calculate(withRate("20.00"), rules);
    expect(result.meta.notes.join(" ")).toMatch(/remunerazione stabile.*intero anno/i);
    expect(result.meta.notes.join(" ")).toMatch(/paghe straordinarie.*massimale mensile/i);
  });
});

describe("RFC 011 — BOE stable-pay contribution boundaries", () => {
  it.each([
    [61_214_39, 61_214_39],
    [61_214_40, 61_214_40],
    [61_214_41, 61_214_40],
  ])("clamps annual stable remuneration %s cents at the monthly ceiling", (grossCents, expected) => {
    const profile = { ...referenceProfile(45_000), grossAnnual: fromCents(grossCents, "EUR") };
    expect(contributionBase(profile, rules).cents).toBe(expected);
  });

  it("gives every supported autonomous scale a direct official provenance record", () => {
    const autonomous = Object.values(rules.rules).filter((rule) =>
      rule.id.startsWith("ES.IRPF.ESCALA.AUTONOMICA."),
    );
    expect(autonomous).toHaveLength(15);
    for (const rule of autonomous) {
      expect(rule.source.url).toMatch(/^https:\/\/(?:www\.)?hacienda\.gob\.es\/.+\.pdf$/);
      expect(rule.source.article).toMatch(/art\. 74 LIRPF/);
      expect(rule.verification.status).toBe("supported");
    }
  });
});
