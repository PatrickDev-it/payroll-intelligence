import { describe, expect, it } from "vitest";
import { InvalidProfileError } from "@engine/errors.ts";
import { fromCents, money } from "@engine/money/money.ts";

import { italianAdapter } from "../adapter.ts";
import { referenceProfile } from "../fixtures.ts";
import { loadItalianRules } from "../rules/index.ts";
import { integrativeTreatment } from "./supplements.ts";

const RULES = loadItalianRules(2026)!;

function run(
  grossEuros: number,
  overrides: Partial<ReturnType<typeof referenceProfile>> = {},
) {
  const base = referenceProfile(grossEuros);
  return italianAdapter.calculate(
    {
      ...base,
      ...overrides,
      countryOptions: {
        ...base.countryOptions,
        ...(overrides.countryOptions ?? {}),
      },
    },
    RULES,
  );
}

function lineAmount(
  result: ReturnType<typeof run>,
  side: "employee" | "employer",
  id: string,
): number {
  const lines =
    side === "employee" ? result.employee.socialSecurity : result.employer.contributions;
  return Math.abs(lines.find((line) => line.id === id)?.amount.cents ?? 0);
}

describe("RFC 008 — Italian social contributions", () => {
  it("splits FIS at the previous-semester average of five employees", () => {
    const small = run(45_000, {
      companySize: 5,
      countryOptions: {
        fisReducedRateEligible: "not_eligible",
        tfrDestination: "unknown",
      },
    });
    const large = run(45_000, {
      companySize: 6,
      countryOptions: { tfrDestination: "unknown" },
    });

    expect(lineAmount(small, "employee", "IT.FIS.EMPLOYEE.SMALL.STANDARD")).toBe(7_650);
    expect(lineAmount(small, "employer", "IT.FIS.EMPLOYER.SMALL.STANDARD")).toBe(14_850);
    expect(lineAmount(large, "employee", "IT.FIS.EMPLOYEE.LARGE")).toBe(12_150);
    expect(lineAmount(large, "employer", "IT.FIS.EMPLOYER.LARGE")).toBe(23_850);
  });

  it("uses the reduced FIS rate only after an explicit 24-month eligibility fact", () => {
    const reduced = run(45_000, {
      companySize: 5,
      countryOptions: {
        fisReducedRateEligible: "eligible",
        tfrDestination: "unknown",
      },
    });

    expect(lineAmount(reduced, "employee", "IT.FIS.EMPLOYEE.SMALL.REDUCED")).toBe(4_500);
    expect(lineAmount(reduced, "employer", "IT.FIS.EMPLOYER.SMALL.REDUCED")).toBe(9_000);
  });

  it("refuses a small-employer calculation when reduced-rate eligibility is unknown", () => {
    expect(() =>
      run(45_000, {
        companySize: 5,
        countryOptions: { tfrDestination: "unknown" },
      }),
    ).toThrow(InvalidProfileError);
  });

  it("adds NASpI 1.40% plus 0.50 points for every declared renewal", () => {
    const result = run(45_000, {
      contractType: "fixed_term",
      countryOptions: {
        naspiApplicability: "ordinary",
        naspiRenewalCount: 2,
        tfrDestination: "unknown",
      },
    });

    expect(lineAmount(result, "employer", "IT.NASPI.ADDITIONAL.FIXED_TERM")).toBe(63_000);
    expect(lineAmount(result, "employer", "IT.NASPI.ADDITIONAL.RENEWALS")).toBe(45_000);
  });

  it("does not invent NASpI for a fixed-term relationship declared exempt", () => {
    const result = run(45_000, {
      contractType: "fixed_term",
      countryOptions: {
        naspiApplicability: "exempt",
        naspiRenewalCount: 0,
        tfrDestination: "unknown",
      },
    });

    expect(result.employer.contributions.map((line) => line.id)).not.toContain(
      "IT.NASPI.ADDITIONAL.FIXED_TERM",
    );
  });

  it("caps only IVS above the pension ceiling", () => {
    const at150 = run(150_000);
    const at160 = run(160_000);

    expect(lineAmount(at160, "employer", "IT.INPS.EMPLOYER.IVS")).toBe(
      lineAmount(at150, "employer", "IT.INPS.EMPLOYER.IVS"),
    );
    expect(lineAmount(at160, "employer", "IT.INPS.EMPLOYER.CUAF")).toBeGreaterThan(
      lineAmount(at150, "employer", "IT.INPS.EMPLOYER.CUAF"),
    );
    expect(lineAmount(at160, "employer", "IT.FIS.EMPLOYER.LARGE")).toBeGreaterThan(
      lineAmount(at150, "employer", "IT.FIS.EMPLOYER.LARGE"),
    );
  });
});

describe("RFC 008 — Italian tax and TFR semantics", () => {
  it("does not withhold addizionali when IRPEF is not due", () => {
    const result = run(9_200, {
      countryOptions: {
        ...referenceProfile(9_200).countryOptions,
        tfrDestination: "unknown",
      },
    });
    const local = result.employee.taxes.filter((line) => line.id.startsWith("IT.ADDIZIONALE"));

    expect(local.map((line) => line.amount.cents)).toEqual([0, 0]);
  });

  it("compares capienza with the employment credit reduced by EUR 75", () => {
    const result = run(9_200, {
      countryOptions: {
        ...referenceProfile(9_200).countryOptions,
        tfrDestination: "unknown",
      },
    });

    expect(result.employee.credits.map((line) => line.id)).toContain(
      "IT.PAYROLL.TRATTAMENTO_INTEGRATIVO",
    );
  });

  it("uses a strict capienza comparison at the exact cent", () => {
    const totalIncome = money(8_000, "EUR");
    const employmentCredit = money(1_955, "EUR");
    const treatmentAt = (grossTaxCents: number) =>
      integrativeTreatment(
        RULES,
        totalIncome,
        fromCents(grossTaxCents, "EUR"),
        employmentCredit,
        employmentCredit,
      );

    expect(treatmentAt(187_999)).toBeUndefined();
    expect(treatmentAt(188_000)).toBeUndefined();
    expect(treatmentAt(188_001)?.amount.cents).toBe(120_000);
  });

  it("keeps net IRPEF at cent precision instead of citing art. 11(4) as euro rounding", () => {
    const result = run(45_000, {
      countryOptions: {
        ...referenceProfile(45_000).countryOptions,
        tfrDestination: "unknown",
      },
    });
    const irpef = result.employee.taxes.find((line) => line.id === "IT.IRPEF")!;

    expect(irpef.children?.map((line) => line.id)).not.toContain("IT.IRPEF.ROUNDING");
    expect(Math.abs(irpef.amount.cents) % 100).not.toBe(0);
  });

  it("names the 0.50% TFR deduction separately from the 0.20% guarantee fund", () => {
    const result = run(45_000, {
      countryOptions: {
        ...referenceProfile(45_000).countryOptions,
        tfrDestination: "treasury",
      },
    });
    const tfr = result.employer.severanceAccrual[0]!;

    expect(tfr.formula).toContain("quota TFR ex art. 3 L. 297/1982");
    expect(result.employer.contributions.map((line) => line.id)).toContain(
      "IT.INPS.EMPLOYER.FONDO_GARANZIA_TFR",
    );
    expect(result.meta.notes.join(" ")).toContain("Fondo Tesoreria");
  });

  it("keeps TFR destination cash-flow-only", () => {
    const destinations = ["unknown", "company", "treasury", "pension_fund"] as const;
    const results = destinations.map((tfrDestination) =>
      run(45_000, {
        countryOptions: {
          ...referenceProfile(45_000).countryOptions,
          tfrDestination,
        },
      }),
    );

    expect(new Set(results.map((result) => result.employer.totalCost.cents)).size).toBe(1);
    expect(new Set(results.map((result) => result.meta.notes.at(-1))).size).toBe(4);
  });
});
