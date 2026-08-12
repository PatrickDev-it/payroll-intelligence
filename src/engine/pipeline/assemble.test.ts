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

describe("payroll tax semantics", () => {
  it.each([undefined, "annual_settlement_estimate" as const])(
    "refuses a top-level employee tax with role %s",
    (taxRole) => {
      const computation = employee(1_000, 10_000);
      const { taxRole: _existingRole, ...withoutRole } = computation.taxes[0]!;
      const line: CalculationLine =
        taxRole === undefined ? withoutRole : { ...withoutRole, taxRole };

      expect(() =>
        assembleCalculation({
          profile,
          rules,
          employee: { ...computation, taxes: [line] },
          employer,
          recomputeEmployee: () => employee(2_000, 20_000),
          notes: [],
        }),
      ).toThrow(/must declare taxRole "payroll_withholding"/);
    },
  );

  it("allows an annual settlement estimate only as explanatory child", () => {
    const computation = employee(1_000, 10_000);
    const annualEstimate: CalculationLine = {
      ...computation.taxes[0]!,
      id: "TEST.ANNUAL",
      taxRole: "annual_settlement_estimate",
    };
    const payrollTax = { ...computation.taxes[0]!, children: [annualEstimate] };

    expect(() =>
      assembleCalculation({
        profile,
        rules,
        employee: { ...computation, taxes: [payrollTax] },
        employer,
        recomputeEmployee: () => employee(2_000, 20_000),
        notes: [],
      }),
    ).not.toThrow();
  });

  it("refuses an annual estimate attached outside a payroll tax", () => {
    const computation = employee(1_000, 10_000);
    const annualEstimate: CalculationLine = {
      ...computation.taxes[0]!,
      id: "TEST.ANNUAL",
      taxRole: "annual_settlement_estimate",
    };
    const { taxRole: _taxRole, ...taxLineWithoutRole } = computation.taxes[0]!;
    const explanatoryEmployerLine: CalculationLine = {
      ...taxLineWithoutRole,
      id: "TEST.EMPLOYER.INFO",
      amount: fromCents(0, "EUR"),
      children: [annualEstimate],
    };

    expect(() =>
      assembleCalculation({
        profile,
        rules,
        employee: computation,
        employer: { ...employer, otherCosts: [explanatoryEmployerLine] },
        recomputeEmployee: () => employee(2_000, 20_000),
        notes: [],
      }),
    ).toThrow(/annual settlement estimate .* is outside a payroll tax/);
  });

  it("refuses totals that diverge from their signed top-level lines", () => {
    const computation = employee(1_000, 10_000);

    expect(() =>
      assembleCalculation({
        profile,
        rules,
        employee: { ...computation, totalTaxes: zero("EUR") },
        employer,
        recomputeEmployee: () => employee(2_000, 20_000),
        notes: [],
      }),
    ).toThrow(/employee tax total/);
  });
});
