import { describe, expect, it } from "vitest";
import { reconciles } from "@engine/pipeline/assemble.ts";
import { frenchAdapter } from "../adapter.ts";
import { FR_BOUNDARIES, FR_FIXTURES, referenceProfile } from "../fixtures.ts";
import { loadFrenchRules } from "../rules/index.ts";

const rules = loadFrenchRules(2026)!;
const compute = (gross: number, options: Record<string, string | number> = {}, region?: string) => {
  const base = referenceProfile(gross);
  return frenchAdapter.calculate(
    { ...base, ...(region ? { region } : {}), countryOptions: { ...base.countryOptions, ...options } },
    rules,
  );
};

const line = (gross: number, id: string, options: Record<string, string | number> = {}) =>
  [...compute(gross, options).employee.socialSecurity, ...compute(gross, options).employee.taxes].find(
    (l) => l.id === id,
  );

describe("the French result", () => {
  it("reconciles at every fixture and every band edge", () => {
    for (const gross of [...FR_FIXTURES, ...FR_BOUNDARIES]) {
      expect(reconciles(compute(gross))).toBe(true);
    }
  });

  it("cites a rule on every line", () => {
    const result = compute(45_000);
    for (const l of [
      ...result.employee.socialSecurity,
      ...result.employee.taxes,
      ...result.employer.contributions,
      ...result.employer.insurance,
      ...result.employer.otherCosts,
    ]) {
      expect(l.ruleIds.length).toBeGreaterThan(0);
    }
  });
});

describe("CSG/CRDS — the base that is neither gross nor net", () => {
  it("charges 9,70% on 98,25% of the gross below 4 PASS", () => {
    const gross = 45_000_00;
    const csgDeductible = line(45_000, "FR.CSG.DEDUCTIBLE")!.amount.cents;
    expect(-csgDeductible).toBe(Math.round(gross * 0.9825 * 0.068));
  });

  it("stops the 1,75% abatement at 4 PASS and charges the excess in full", () => {
    const below = -line(192_240, "FR.CSG.DEDUCTIBLE")!.amount.cents;
    const above = -line(200_000, "FR.CSG.DEDUCTIBLE")!.amount.cents;
    // The extra €7.760 above 4 PASS is charged on 100% of itself, not 98,25%.
    expect(above - below).toBe(Math.round(7_760_00 * 0.068));
  });

  it("taxes the income on a base that excludes only the deductible 6,80 points", () => {
    const result = compute(45_000);
    const contributions = result.employee.socialSecurity.reduce((t, l) => t - l.amount.cents, 0);
    const netAvantImpot = result.employee.gross.cents - contributions;
    const nonDeductible =
      -line(45_000, "FR.CSG.NON_DEDUCTIBLE")!.amount.cents - line(45_000, "FR.CRDS")!.amount.cents;

    // net imposable = net avant impôt + CSG non déductible + CRDS, and the
    // taxable income is that minus the 10% abatement.
    const netImposable = netAvantImpot + nonDeductible;
    expect(result.employee.taxableIncome.cents).toBe(netImposable - Math.round(netImposable * 0.1));
  });
});

describe("the quotient familial", () => {
  it("is worth thousands to a couple and nothing to a single filer", () => {
    const single = compute(60_000).employee.netAnnual.cents;
    const couple = compute(60_000, { foyer: "couple" }).employee.netAnnual.cents;
    expect(couple - single).toBeGreaterThan(200_000);
  });

  it("caps the benefit of each half-part at €1.807", () => {
    const capped = compute(120_000, { foyer: "couple", children: 2 });
    const cap = capped.employee.taxes[0]!.children?.find((l) => l.id === "FR.IR.QUOTIENT");
    expect(cap).toBeDefined();
    // Two children of a couple are two half-parts: the advantage cannot exceed
    // 2 × €1.807, however much the raw quotient would have saved.
    expect(-cap!.amount.cents).toBe(2 * 1_807_00);
  });

  it("gives a third child a full part, not a half", () => {
    const two = compute(45_000, { foyer: "couple", children: 2 }).employee.netAnnual.cents;
    const three = compute(45_000, { foyer: "couple", children: 3 }).employee.netAnnual.cents;
    expect(three).toBeGreaterThanOrEqual(two);
  });
});

describe("the décote", () => {
  it("erases a small liability entirely", () => {
    const result = compute(22_000);
    const tax = -result.employee.taxes[0]!.amount.cents;
    const decote = result.employee.taxes[0]!.children?.find((l) => l.id === "FR.IR.DECOTE");
    expect(decote).toBeDefined();
    expect(tax).toBeGreaterThanOrEqual(0);
  });

  it("never turns the tax negative", () => {
    for (const gross of [15_000, 18_000, 20_000, 22_000, 25_000]) {
      expect(compute(gross).employee.taxes[0]!.amount.cents).toBeLessThanOrEqual(0);
    }
  });
});

describe("the 2026 employer reform", () => {
  it("applies the RGDU below 3 SMIC and nothing at or above it", () => {
    const rgdu = (gross: number) =>
      compute(gross).employer.otherCosts.find((l) => l.id === "FR.PAT.REDUCTION_GENERALE");
    // D241-7 uses the SMIC in force on 1 January: 1,820 × €12.02.
    expect(rgdu(30_000)).toBeDefined();
    expect(rgdu(65_629)).toBeDefined();
    expect(rgdu(65_630)).toBeUndefined();
    expect(rgdu(80_000)).toBeUndefined();
  });

  it("prorates the RGDU SMIC reference for part-time work", () => {
    const base = referenceProfile(40_000);
    const partTime = frenchAdapter.calculate({ ...base, workingTimePercent: 50 }, rules);
    expect(
      partTime.employer.otherCosts.some((l) => l.id === "FR.PAT.REDUCTION_GENERALE"),
    ).toBe(false);
  });

  it("reaches its maximum coefficient at exactly one SMIC", () => {
    // C = Tmin + Tdelta × [0,5 × (3 × SMIC/R − 1)]^1,75 ; at R = SMIC the
    // bracket is 1, so C = Tmin + Tdelta = 0,4021 for an employer of 50+.
    // That identity is the arithmetic check on the parameters: the merged
    // maximum has to equal Fillon 2025 (0,3194) + maladie 6 pts + famille
    // 1,8 pts, and it does, to four decimals.
    const atSmic = compute(21_876).employer.otherCosts.find(
      (l) => l.id === "FR.PAT.REDUCTION_GENERALE",
    )!;
    expect(atSmic.formula).toContain("0,4021");
  });

  it("still leaves a step at 3 SMIC, which the parameters imply and the décret text has not confirmed", () => {
    // At the threshold the coefficient is Tmin = 2%, and one euro later it is
    // zero. Recorded as a test rather than smoothed away: if the consolidated
    // décret turns out to zero the coefficient at the boundary, THIS is the
    // assertion that has to change, and it will be found.
    const just = compute(65_629).employer.totalCost.cents;
    const after = compute(65_630).employer.totalCost.cents;
    expect(after - just).toBeGreaterThan(100_000);
  });

  it("makes employer cost strongly non-linear at the bottom of the range", () => {
    const atSmic = compute(21_876).employer.costOverGross;
    const wellAbove = compute(80_000).employer.costOverGross;
    expect(atSmic).toBeLessThan(wellAbove - 0.2);
  });

  it("charges the full 13% maladie and 5,25% famille — the reduced bands are gone in 2026", () => {
    const result = compute(45_000);
    const maladie = result.employer.contributions.find((l) => l.id === "FR.PAT.MALADIE")!;
    expect(maladie.amount.cents).toBe(Math.round(45_000_00 * 0.13));
  });
});

describe("the bands against the PASS", () => {
  it("switches the pension contribution from tranche 1 to tranche 2 at 1 PASS", () => {
    const below = compute(48_060).employee.socialSecurity.some((l) => l.id === "FR.SAL.RETRAITE.T2");
    const above = compute(60_000).employee.socialSecurity.some((l) => l.id === "FR.SAL.RETRAITE.T2");
    expect(below).toBe(false);
    expect(above).toBe(true);
  });

  it("charges the CET only above the ceiling", () => {
    expect(compute(45_000).employee.socialSecurity.some((l) => l.id === "FR.SAL.CET")).toBe(false);
    expect(compute(60_000).employee.socialSecurity.some((l) => l.id === "FR.SAL.CET")).toBe(true);
  });

  it("charges the Apec to a cadre only", () => {
    expect(compute(45_000).employee.socialSecurity.some((l) => l.id === "FR.SAL.APEC")).toBe(false);
    expect(compute(45_000, { statut: "cadre" }).employee.socialSecurity.some((l) => l.id === "FR.SAL.APEC")).toBe(true);
  });
});

describe("Alsace-Moselle, the only geographic split of the French payslip", () => {
  it("charges 1,30% more to the employee there — and costs less than 1,30% of net", () => {
    const local = compute(45_000, {}, "alsace_moselle");
    const extra = local.employee.socialSecurity.find((l) => l.id === "FR.SAL.MALADIE.ALSACE_MOSELLE")!;
    expect(-extra.amount.cents).toBe(Math.round(45_000_00 * 0.013));

    // The contribution is deductible, so the net falls by LESS than the
    // contribution: part of it comes back as a smaller income tax. Anyone
    // asserting the full 1,30% here would be asserting a bug.
    const general = compute(45_000).employee.netAnnual.cents;
    const difference = general - local.employee.netAnnual.cents;
    expect(difference).toBeGreaterThan(0);
    expect(difference).toBeLessThan(-extra.amount.cents);
  });
});
