import { describe, expect, it } from "vitest";
import type { RuleSet } from "../model/rule.ts";
import { fromCents, money } from "../money/money.ts";
import { applyDeclaredPercentageRule, applyRule } from "./helpers.ts";

const rules: RuleSet = {
  country: "IT",
  taxYear: 2026,
  version: "test",
  rules: {
    "TEST.FLAT": {
      id: "TEST.FLAT",
      country: "IT",
      taxYear: 2026,
      label: "Regola calcolata",
      basis: "gross",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      config: { kind: "flat_rate", rate: "0.1" },
      source: {
        authority: "Test",
        type: "legislation",
        document: "Test",
      },
      verification: { status: "supported" },
      version: 1,
    },
    "TEST.DECLARED": {
      id: "TEST.DECLARED",
      country: "IT",
      taxYear: 2026,
      label: "Percentuale dichiarata",
      basis: "gross",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      config: { kind: "formula", formulaId: "declared-rate", params: {} },
      source: {
        authority: "Test",
        type: "legislation",
        document: "Test",
      },
      verification: { status: "supported" },
      version: 1,
    },
  },
};

describe("calculation line semantics", () => {
  it("marks computed rules and carries an explicit tax role", () => {
    const applied = applyRule(rules, "TEST.FLAT", money(1_000, "EUR"), {
      taxRole: "payroll_withholding",
    });

    expect(applied.line.valueOrigin).toBe("computed_rule");
    expect(applied.line.taxRole).toBe("payroll_withholding");
  });

  it("applies a declared decimal percentage exactly and marks its origin", () => {
    const applied = applyDeclaredPercentageRule(
      rules,
      "TEST.DECLARED",
      money(45_000, "EUR"),
      "1.234567",
    );

    expect(applied.amount.cents).toBe(55_556);
    expect(applied.line.valueOrigin).toBe("declared_input");
    expect(applied.line.formula).toContain("1.234567%");
  });

  it("rounds money once, half-up, after exact percentage arithmetic", () => {
    const applied = applyDeclaredPercentageRule(
      rules,
      "TEST.DECLARED",
      fromCents(1, "EUR"),
      "50",
    );
    expect(applied.amount.cents).toBe(1);
  });

  it("refuses a declared percentage instead of silently rounding it", () => {
    expect(() =>
      applyDeclaredPercentageRule(
        rules,
        "TEST.DECLARED",
        money(1_000, "EUR"),
        "1.2345678",
      ),
    ).toThrow(/six decimal places/i);
  });
});
