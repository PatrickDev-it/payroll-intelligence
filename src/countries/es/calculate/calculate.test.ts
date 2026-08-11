import { describe, expect, it } from "vitest";
import { reconciles } from "@engine/pipeline/assemble.ts";
import { allLines } from "@engine/model/calculation.ts";
import { spanishAdapter } from "../adapter.ts";
import { ES_BOUNDARIES, ES_FIXTURES, referenceProfile } from "../fixtures.ts";
import { COMMUNITIES } from "../geography.ts";
import { loadSpanishRules } from "../rules/index.ts";

const rules = loadSpanishRules(2026)!;
const compute = (gross: number, overrides: Partial<Parameters<typeof spanishAdapter.calculate>[0]> = {}) =>
  spanishAdapter.calculate({ ...referenceProfile(gross), ...overrides }, rules);

const irpf = (gross: number, region: string) =>
  allLines(compute(gross, { region })).find((line) => line.id === "ES.IRPF.LIABILITY_ESTIMATE")!
    .amount.cents;

describe("the Spanish result", () => {
  it("uses the employer-supplied AEAT payroll withholding rate for take-home pay", () => {
    const base = referenceProfile(45_000);
    const result = spanishAdapter.calculate(
      { ...base, countryOptions: { ...base.countryOptions, aeatWithholdingRate: 21.05 } },
      rules,
    );
    const withholding = result.employee.taxes.find((line) => line.id === "ES.IRPF.RETENCION");
    expect(withholding?.amount.cents).toBe(-947_250);
  });
  it("reconciles at every fixture", () => {
    for (const gross of [...ES_FIXTURES, ...ES_BOUNDARIES]) {
      expect(reconciles(compute(gross))).toBe(true);
    }
  });

  it("cites a rule on every line", () => {
    const result = compute(45_000);
    for (const line of [
      ...result.employee.socialSecurity,
      ...result.employee.taxes,
      ...result.employer.contributions,
      ...result.employer.insurance,
    ]) {
      expect(line.ruleIds.length).toBeGreaterThan(0);
    }
  });

  it("puts the burden on the employer: over 30% on top against 6,5% withheld", () => {
    const result = compute(45_000);
    expect(result.rates.effectiveSocialRate).toBeLessThan(0.07);
    expect(result.employer.costOverGross).toBeGreaterThan(1.3);
  });

  it("accrues no severance — indemnización is contingent, not accrued", () => {
    expect(compute(45_000).employer.severanceAccrual).toHaveLength(0);
  });
});

describe("the mínimo personal is relieved at the lowest rate, not the marginal one", () => {
  it("costs the taxpayer less than a base deduction of the same €5.550 would", () => {
    const result = compute(45_000);
    const state = allLines(result).find(
      (line) => line.id === "ES.IRPF.ESCALA.ESTATAL",
    )!;

    // Modelled as a deduction from the base, €5.550 at this salary would be
    // relieved at 18,5% state ≈ €1.027. Spain relieves it at 9,5% ≈ €527. The
    // difference is what a naive model would over-credit by.
    expect(state.formula).toContain("mínimo personal");
    const liability = allLines(result).find((line) => line.id === "ES.IRPF.LIABILITY_ESTIMATE")!;
    const deductionModel = irpf(45_000 - 5_550, "MADRID");
    expect(liability.amount.cents).toBeLessThan(deductionModel);
  });
});

describe("half the tax is the community's", () => {
  it("models all 15 common-regime communities and none of the foral ones", () => {
    expect(COMMUNITIES).toHaveLength(15);
    expect(COMMUNITIES.map((c) => c.key)).not.toContain("NAVARRA");
    expect(COMMUNITIES.map((c) => c.key)).not.toContain("PAIS_VASCO");
  });

  it("spreads €905 a year at €50.000 between the cheapest community and the dearest", () => {
    const byCommunity = COMMUNITIES.map((community) => irpf(50_000, community.key));
    const cheapest = Math.max(...byCommunity); // amounts are negative: least withheld
    const dearest = Math.min(...byCommunity);

    expect(cheapest).toBe(irpf(50_000, "MADRID"));
    expect(dearest).toBe(irpf(50_000, "EXTREMADURA"));
    expect(cheapest - dearest).toBeGreaterThan(80_000);
  });

  it("computes a result for every modelled community, and refuses the rest", () => {
    for (const community of COMMUNITIES) {
      expect(reconciles(compute(45_000, { region: community.key }))).toBe(true);
    }
    expect(spanishAdapter.validate({ ...referenceProfile(45_000), region: "NAVARRA" }).ok).toBe(false);
  });

  it("names the foral regime rather than calling it an unknown region", () => {
    const check = spanishAdapter.validate({ ...referenceProfile(45_000), region: "PAIS_VASCO" });
    expect(check.issues[0]?.message).toContain("foral");
  });
});

describe("the contribution ceiling and what takes over above it", () => {
  it("stops ordinary contributions at the maximum base of €61.214,40", () => {
    const at = compute(70_000);
    const above = compute(120_000);
    const comunes = (r: typeof at) =>
      r.employee.socialSecurity.find((l) => l.id === "ES.SS.EMPLOYEE.CONTINGENCIAS_COMUNES")!.amount
        .cents;
    expect(comunes(above)).toBe(comunes(at));
  });

  it("charges the solidarity contribution only above the ceiling", () => {
    const has = (gross: number) =>
      compute(gross).employee.socialSecurity.some((l) => l.id === "ES.SS.EMPLOYEE.SOLIDARIDAD");
    expect(has(61_214)).toBe(false);
    expect(has(70_000)).toBe(true);
  });

  it("lifts a salary below the minimum base up to it, rather than charging less", () => {
    const belowMinimum = compute(12_000); // grupo 5 minimum is 1.424,40 × 12 = 17.092,80
    const contributions = belowMinimum.employee.socialSecurity.reduce((t, l) => t - l.amount.cents, 0);
    expect(contributions).toBeGreaterThan(Math.round(12_000_00 * 0.065));
  });
});

describe("art. 20 — the reduction that tapers to nothing at €19.747,50", () => {
  it("is flat below €14.852 and gone above €19.747,50", () => {
    const reduction = (gross: number) =>
      allLines(compute(gross)).find((l) => l.id === "ES.IRPF.REDUCCION.TRABAJO")?.amount.cents ?? 0;

    expect(reduction(14_000)).toBe(730_200);
    expect(reduction(30_000)).toBe(0);
  });

  it("creates a steeper annual-liability change inside the taper", () => {
    const inside = Math.abs(irpf(19_000, "MADRID") - irpf(18_000, "MADRID"));
    const outside = Math.abs(irpf(31_000, "MADRID") - irpf(30_000, "MADRID"));
    expect(inside).toBeGreaterThan(outside);
  });
});

describe("the permanent/temporary gap", () => {
  it("costs the employer 1,2 points more on a fixed-term contract", () => {
    const permanent = compute(45_000).employer.totalCost.cents;
    const fixedTerm = compute(45_000, { contractType: "fixed_term" }).employer.totalCost.cents;
    expect(fixedTerm - permanent).toBeGreaterThan(45_000_00 * 0.011);
  });
});
