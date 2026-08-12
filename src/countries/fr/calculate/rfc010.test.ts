import { describe, expect, it } from "vitest";
import type { CalculationLine } from "@engine/model/calculation.ts";
import { fromCents } from "@engine/money/money.ts";
import { frenchAdapter } from "../adapter.ts";
import { referenceProfile } from "../fixtures.ts";
import { loadFrenchRules } from "../rules/index.ts";

const rules = loadFrenchRules(2026)!;

function calculate(
  grossEuros: number,
  pasRatePercent: string | number,
  options: Record<string, string | number> = {},
) {
  const base = referenceProfile(grossEuros);
  return frenchAdapter.calculate(
    {
      ...base,
      countryOptions: { ...base.countryOptions, pasRatePercent, ...options },
    },
    rules,
  );
}

function annualEstimate(pas: CalculationLine): CalculationLine {
  const annual = pas.children?.find((child) => child.taxRole === "annual_settlement_estimate");
  if (!annual) throw new Error("Missing French annual settlement estimate");
  return annual;
}

describe("RFC 010 — PAS is the payroll tax", () => {
  it.each(["0", "7.35", "100"])("applies the declared %s%% exactly to net imposable", (rate) => {
    const result = calculate(45_000, rate);
    const pas = result.employee.taxes[0]!;
    const basis = pas.basis!.cents;
    const rateParts = rate.split(".");
    const whole = rateParts[0]!;
    const fraction = rateParts[1] ?? "";
    const millionthsOfPercent =
      BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
    const expected = Number((BigInt(basis) * millionthsOfPercent + 50_000_000n) / 100_000_000n);

    expect(pas.id).toBe("FR.PAS.DECLARED");
    expect(pas.taxRole).toBe("payroll_withholding");
    expect(pas.valueOrigin).toBe("declared_input");
    expect(Math.abs(pas.amount.cents)).toBe(expected);
    expect(result.rates.marginalRatePolicy).toBe("hold_external_inputs");
  });

  it("keeps the annual liability nested and excludes it from payroll net", () => {
    const result = calculate(80_000, "8.2");
    const pas = result.employee.taxes[0]!;
    const annual = annualEstimate(pas);
    const contributions = result.employee.socialSecurity.reduce(
      (total, contribution) => total - contribution.amount.cents,
      0,
    );

    expect(annual.amount.cents).toBeLessThan(0);
    expect(annual.taxRole).toBe("annual_settlement_estimate");
    expect(result.employee.netAnnual.cents).toBe(
      result.employee.gross.cents - contributions + pas.amount.cents,
    );
    expect(result.employee.netAnnual.cents).not.toBe(
      result.employee.gross.cents - contributions + pas.amount.cents + annual.amount.cents,
    );
  });

  it("fails closed when PAS is missing, malformed, over-precise or out of range", () => {
    const base = referenceProfile(45_000);
    const { pasRatePercent: _pas, ...countryOptions } = base.countryOptions!;
    const withoutPas = frenchAdapter.validate({ ...base, countryOptions });
    expect(withoutPas.ok).toBe(false);
    expect(withoutPas.issues.some((issue) => issue.field === "countryOptions.pasRatePercent")).toBe(true);

    for (const invalid of ["not-a-rate", "12.1234567", -0.01, 100.01]) {
      const profile = {
        ...base,
        countryOptions: { ...base.countryOptions, pasRatePercent: invalid },
      };
      expect(frenchAdapter.validate(profile).ok).toBe(false);
    }
  });
});

describe("RFC 010 — parent isolé annual comparison", () => {
  it("represents one parent with one child as two parts and uses the dedicated cap", () => {
    const result = calculate(120_000, "8.2", { foyer: "parent_isole", children: 1 });
    const annual = annualEstimate(result.employee.taxes[0]!);
    const cap = annual.children?.find((child) => child.id === "FR.IR.QUOTIENT");

    expect(annual.formula).toContain("/ 2 part(s)");
    expect(cap).toBeDefined();
    expect(-cap!.amount.cents).toBe(4_262_00);
  });

  it("keeps PAS and contributions invariant when only the annual household changes", () => {
    const single = calculate(80_000, "8.2", { foyer: "single", children: 1 });
    const isolated = calculate(80_000, "8.2", { foyer: "parent_isole", children: 1 });

    expect(isolated.employee.socialSecurity).toEqual(single.employee.socialSecurity);
    expect(isolated.employee.taxes[0]!.amount).toEqual(single.employee.taxes[0]!.amount);
    expect(annualEstimate(isolated.employee.taxes[0]!).amount.cents).not.toBe(
      annualEstimate(single.employee.taxes[0]!).amount.cents,
    );
  });

  it("rejects parent isolé without a child", () => {
    const base = referenceProfile(45_000);
    const profile = {
      ...base,
      countryOptions: {
        ...base.countryOptions,
        pasRatePercent: "8.2",
        foyer: "parent_isole",
        children: 0,
      },
    };
    expect(frenchAdapter.validate(profile).ok).toBe(false);
  });

  it.each([
    ["single", 0, "1"],
    ["single", 1, "1,5"],
    ["single", 2, "2"],
    ["single", 3, "3"],
    ["couple", 0, "2"],
    ["couple", 1, "2,5"],
    ["couple", 2, "3"],
    ["couple", 3, "4"],
    ["parent_isole", 1, "2"],
    ["parent_isole", 2, "2,5"],
    ["parent_isole", 3, "3,5"],
  ])("maps %s with %i child(ren) to %s parts from rule data", (foyer, children, parts) => {
    const annual = annualEstimate(calculate(45_000, "8.2", { foyer, children }).employee.taxes[0]!);
    expect(annual.formula).toContain(`/ ${parts} part(s)`);
  });

  it("switches onto the dedicated cap at the first taxable cent that exceeds it", () => {
    const hasCap = (grossCents: number) => {
      const base = referenceProfile(45_000);
      const result = frenchAdapter.calculate(
        {
          ...base,
          grossAnnual: fromCents(grossCents, "EUR"),
          countryOptions: {
            ...base.countryOptions,
            pasRatePercent: "8.2",
            foyer: "parent_isole",
            children: 1,
          },
        },
        rules,
      );
      return annualEstimate(result.employee.taxes[0]!).children?.some(
        (child) => child.id === "FR.IR.QUOTIENT",
      ) ?? false;
    };

    let low = 30_000_00;
    let high = 150_000_00;
    while (low < high) {
      const midpoint = Math.floor((low + high) / 2);
      if (hasCap(midpoint)) high = midpoint;
      else low = midpoint + 1;
    }

    expect(hasCap(low - 1)).toBe(false);
    expect(hasCap(low)).toBe(true);
    expect(hasCap(low + 1)).toBe(true);
  });
});

describe("RFC 010 — employer-plan deductions are declared, never invented", () => {
  it("includes exact employee mutuelle and prévoyance amounts only when supplied", () => {
    const withoutPlan = calculate(45_000, "7.35");
    const withPlan = calculate(45_000, "7.35", {
      mutuelleEmployeeAnnual: "1200.50",
      prevoyanceEmployeeAnnual: "340.25",
    });
    const mutuelle = withPlan.employee.socialSecurity.find(
      (line) => line.id === "FR.SAL.MUTUELLE.DECLARED",
    );
    const prevoyance = withPlan.employee.socialSecurity.find(
      (line) => line.id === "FR.SAL.PREVOYANCE.DECLARED",
    );

    expect(withoutPlan.employee.socialSecurity.some((line) => line.id.includes("MUTUELLE"))).toBe(false);
    expect(mutuelle?.amount.cents).toBe(-1200_50);
    expect(prevoyance?.amount.cents).toBe(-340_25);
    expect(mutuelle?.valueOrigin).toBe("declared_input");
    expect(
      withoutPlan.employee.taxes[0]!.basis!.cents - withPlan.employee.taxes[0]!.basis!.cents,
    ).toBe(1540_75);
  });

  it("rejects sub-cent amounts and deductions above gross", () => {
    const base = referenceProfile(45_000);
    for (const options of [
      { mutuelleEmployeeAnnual: "12.345" },
      { mutuelleEmployeeAnnual: "30000", prevoyanceEmployeeAnnual: "20000" },
    ]) {
      expect(
        frenchAdapter.validate({
          ...base,
          countryOptions: { ...base.countryOptions, ...options },
        }).ok,
      ).toBe(false);
    }
  });
});
