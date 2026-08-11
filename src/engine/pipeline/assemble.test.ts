import { describe, expect, it } from "vitest";
import type { CalculationLine } from "../model/calculation.ts";
import type { EmployeeProfile } from "../model/employee-profile.ts";
import type { RuleSet } from "../model/rule.ts";
import { fromCents, money, zero } from "../money/money.ts";
import {
  assembleCalculation,
  type EmployeeComputation,
  type EmployerComputation,
} from "./assemble.ts";

const profile: EmployeeProfile = {
  country: "IT",
  taxYear: 2026,
  grossAnnual: money(1_000, "EUR"),
  payPeriods: 12,
  employmentType: "employee",
  contractType: "permanent",
  workingTimePercent: 100,
};

const rules: RuleSet = {
  country: "IT",
  taxYear: 2026,
  version: "test",
  rules: {
    "TEST.TAX": {
      id: "TEST.TAX",
      country: "IT",
      taxYear: 2026,
      label: "Imposta",
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
  },
};

function taxLine(cents: number): CalculationLine {
  return {
    id: "TEST.TAX",
    label: "Imposta",
    amount: fromCents(-cents, "EUR"),
    basis: profile.grossAnnual,
    formula: "test",
    ruleIds: ["TEST.TAX"],
    confidence: "supported",
    taxRole: "payroll_withholding",
    valueOrigin: "computed_rule",
  };
}

function employee(grossUnits: number, taxCents: number): EmployeeComputation {
  const gross = money(grossUnits, "EUR");
  return {
    gross,
    socialSecurity: [],
    totalContributions: zero("EUR"),
    taxableIncome: gross,
    taxes: [taxLine(taxCents)],
    totalTaxes: fromCents(taxCents, "EUR"),
    credits: [],
    totalCredits: zero("EUR"),
    netAnnual: fromCents(gross.cents - taxCents, "EUR"),
  };
}

const employer: EmployerComputation = {
  gross: profile.grossAnnual,
  contributions: [],
  insurance: [],
  severanceAccrual: [],
  otherCosts: [],
  totalCost: profile.grossAnnual,
  costOverGross: 0,
};

describe("marginal rate policy", () => {
  it("defaults to recomputing the employee calculation", () => {
    const result = assembleCalculation({
      profile,
      rules,
      employee: employee(1_000, 10_000),
      employer,
      recomputeEmployee: () => employee(2_000, 30_000),
      notes: [],
    });

    expect(result.rates.marginalRatePolicy).toBe("recompute");
    expect(result.rates.marginalRate).toBe(0.2);
  });

  it("can declare the marginal rate unavailable without probing", () => {
    const result = assembleCalculation({
      profile,
      rules,
      employee: employee(1_000, 10_000),
      employer,
      marginalRatePolicy: "unavailable",
      notes: [],
    });

    expect(result.rates.marginalRatePolicy).toBe("unavailable");
    expect(result.rates.marginalRate).toBeNull();
  });
});
