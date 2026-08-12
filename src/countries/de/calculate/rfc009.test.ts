import { describe, expect, it } from "vitest";
import { fromCents } from "@engine/money/money.ts";
import { germanAdapter } from "../adapter.ts";
import { levyBase } from "../base.ts";
import {
  BMF_PAP_REQUIRED_INPUTS,
  DE_BMF_PAP_FIXTURES,
  profileFromPapFixture,
} from "../pap-fixtures.ts";
import { referenceProfile } from "../fixtures.ts";
import { germanInputs } from "../inputs.ts";
import { careInsuranceKey } from "../profile.ts";
import { loadGermanRules } from "../rules/index.ts";

const rules = loadGermanRules(2026)!;

function calculate(
  gross: number,
  overrides: Readonly<Record<string, string | number | boolean>> = {},
) {
  const base = referenceProfile(gross);
  return germanAdapter.calculate(
    { ...base, countryOptions: { ...base.countryOptions, ...overrides } },
    rules,
  );
}

function employerLine(result: ReturnType<typeof calculate>, id: string) {
  return result.employer.otherCosts.find((line) => line.id === id);
}

describe("RFC 009 — pension-insurable levy base", () => {
  it("resolves the pension ceiling at minus one cent, exact and plus one cent", () => {
    const profile = referenceProfile(101_400);
    const bases = [10_139_999, 10_140_000, 10_140_001].map((cents) =>
      levyBase({ ...profile, grossAnnual: fromCents(cents, "EUR") }, rules).cents,
    );

    expect(bases).toEqual([10_139_999, 10_140_000, 10_140_000]);
  });

  it("caps U2 at the pension ceiling instead of charging it on raw gross", () => {
    const at = calculate(101_400, { u2RatePercent: "0.44" });
    const above = calculate(150_000, { u2RatePercent: "0.44" });

    expect(employerLine(at, "DE.UMLAGE.U2.DECLARED")?.amount.cents).toBe(44_616);
    expect(employerLine(above, "DE.UMLAGE.U2.DECLARED")?.amount.cents).toBe(44_616);
    expect(employerLine(above, "DE.UMLAGE.U2.DECLARED")?.basis?.cents).toBe(10_140_000);
  });

  it("splits a six-decimal Zusatzbeitrag exactly without a Number round-trip", () => {
    const result = calculate(69_750, { zusatzbeitragRatePercent: "2.900001" });
    const employee = result.employee.socialSecurity.find(
      (line) => line.id === "DE.KV.ZUSATZBEITRAG.DECLARED",
    );
    const employer = result.employer.contributions.find(
      (line) => line.id === "DE.KV.ZUSATZBEITRAG.DECLARED",
    );

    expect(employee?.amount.cents).toBe(-101_138);
    expect(employer?.amount.cents).toBe(101_138);
    expect(employee?.formula).toContain("2.900001% ÷ 2");
  });

  it("charges declared U1 only when the AAG headcount proves eligibility", () => {
    const qualifyingBase = referenceProfile(45_000);
    const qualifying = germanAdapter.calculate(
      {
        ...qualifyingBase,
        companySize: 30,
        countryOptions: { ...qualifyingBase.countryOptions, u1RatePercent: "2.50" },
      },
      rules,
    );
    const nonQualifyingBase = referenceProfile(45_000);
    const nonQualifying = germanAdapter.calculate(
      { ...nonQualifyingBase, companySize: 31 },
      rules,
    );

    expect(employerLine(qualifying, "DE.UMLAGE.U1.DECLARED")?.amount.cents).toBe(112_500);
    expect(employerLine(nonQualifying, "DE.UMLAGE.U1.DECLARED")).toBeUndefined();
  });

  it("refuses a qualifying employer without its exact Krankenkasse U1 rate", () => {
    const profile = { ...referenceProfile(45_000), companySize: 30 };
    const validation = germanAdapter.validate(profile);

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContainEqual(
      expect.objectContaining({ field: "countryOptions.u1RatePercent", severity: "error" }),
    );
  });

  it("crossing 30/31 changes only the U1 line and total employer cost", () => {
    const base = referenceProfile(45_000);
    const small = germanAdapter.calculate(
      {
        ...base,
        companySize: 30,
        countryOptions: { ...base.countryOptions, u1RatePercent: "2.50" },
      },
      rules,
    );
    const large = germanAdapter.calculate({ ...base, companySize: 31 }, rules);

    const smallWithoutU1 = small.employer.otherCosts.filter(
      (line) => line.id !== "DE.UMLAGE.U1.DECLARED",
    );
    expect(smallWithoutU1).toEqual(large.employer.otherCosts);
    expect(small.employer.contributions).toEqual(large.employer.contributions);
    expect(small.employer.insurance).toEqual(large.employer.insurance);
    expect(small.employer.totalCost.cents - large.employer.totalCost.cents).toBe(112_500);
    expect(small.meta.notes).toContain("U1 dichiarata: 2.50% (conteggio AAG 30).");
    expect(small.meta.rulesetVersion).toBe("2026.3");
  });
});

describe("RFC 009 — parenthood and qualifying children are independent", () => {
  const profile = referenceProfile(45_000);

  it("a parent with no child under 25 avoids the childless surcharge but gets no reduction", () => {
    expect(
      careInsuranceKey({
        ...profile,
        countryOptions: {
          ...profile.countryOptions,
          hasParentStatus: true,
          qualifyingChildrenUnder25: 0,
        },
      }),
    ).toBe("children1");
  });

  it("models the two legal facts as one atomic compact choice", () => {
    const descriptor = germanInputs(profile).find(
      (input) => input.field === "countryOptions.familyStatus",
    );
    const parentWithoutYoungChild = descriptor?.options?.find(
      (option) => option.value === "parent_0",
    );

    expect(parentWithoutYoungChild?.assigns).toEqual({
      "countryOptions.hasParentStatus": true,
      "countryOptions.qualifyingChildrenUnder25": 0,
    });
  });

  it("distinguishes age 22/23 and zero through five-plus qualifying children", () => {
    const careKey = (age: number, parent: boolean, children: number, region = "BE") =>
      careInsuranceKey({
        ...profile,
        age,
        region,
        countryOptions: {
          ...profile.countryOptions,
          hasParentStatus: parent,
          qualifyingChildrenUnder25: children,
        },
      });

    expect(careKey(22, false, 0)).toBe("children1");
    expect(careKey(23, false, 0)).toBe("childless");
    expect(careKey(30, true, 0)).toBe("children1");
    expect(careKey(30, true, 1)).toBe("children1");
    expect(careKey(30, true, 2)).toBe("children2");
    expect(careKey(30, true, 3)).toBe("children3");
    expect(careKey(30, true, 4)).toBe("children4");
    expect(careKey(30, true, 5)).toBe("children5plus");
    expect(careKey(30, true, 8)).toBe("children5plus");
    expect(careKey(30, true, 2, "SN")).toBe("saxony_children2");
  });

  it("refuses Steuerklasse II when the represented facts prove no parenthood", () => {
    const base = referenceProfile(45_000);
    const validation = germanAdapter.validate({
      ...base,
      countryOptions: {
        ...base.countryOptions,
        steuerklasse: "II",
        hasParentStatus: false,
        qualifyingChildrenUnder25: 0,
      },
    });

    expect(validation.ok).toBe(false);
    expect(validation.issues).toContainEqual(
      expect.objectContaining({ field: "countryOptions.familyStatus", severity: "error" }),
    );
  });

  it("refuses malformed declared percentages at adapter validation", () => {
    for (const value of ["1e-7", "0.1234567", true] as const) {
      const base = referenceProfile(45_000);
      const validation = germanAdapter.validate({
        ...base,
        countryOptions: { ...base.countryOptions, u2RatePercent: value },
      });
      expect(validation.ok).toBe(false);
      expect(validation.issues).toContainEqual(
        expect.objectContaining({ field: "countryOptions.u2RatePercent", severity: "error" }),
      );
    }
  });
});

describe("RFC 009 — BMF PAP evidence contract", () => {
  it("stores a complete PAP vector and reproduces each official LSTLZZ output", () => {
    for (const fixture of DE_BMF_PAP_FIXTURES) {
      expect(Object.keys(fixture.inputs).sort()).toEqual([...BMF_PAP_REQUIRED_INPUTS].sort());
      const result = germanAdapter.calculate(profileFromPapFixture(fixture), rules);
      const wageTax = result.employee.taxes.find((line) => line.id === "DE.LOHNSTEUER.TARIF");

      expect(wageTax?.amount.cents).toBe(-fixture.officialOutputs.LSTLZZ);
      expect(wageTax?.taxRole).toBe("payroll_withholding");
      expect(Math.abs((wageTax?.amount.cents ?? 0) + fixture.officialOutputs.LSTLZZ)).toBeLessThanOrEqual(
        fixture.allowedToleranceCents,
      );
    }
  });

  it("cannot classify a partial PAP vector as evidence", () => {
    const fixture = DE_BMF_PAP_FIXTURES[0]!;
    const partial = { ...fixture.inputs } as Record<string, string | number>;
    delete partial.KVZ;

    expect(() => profileFromPapFixture({ ...fixture, inputs: partial })).toThrow(/KVZ/);
  });

  it("refuses PAP branches the employee profile cannot represent", () => {
    const fixture = DE_BMF_PAP_FIXTURES[0]!;
    for (const [name, value] of [
      ["F", "0.875"],
      ["AJAHR", 2020],
      ["PKV", 1],
    ] as const) {
      expect(() =>
        profileFromPapFixture({
          ...fixture,
          inputs: { ...fixture.inputs, [name]: value },
        }),
      ).toThrow(new RegExp(name));
    }
  });

  it("marks every top-level German tax as payroll withholding", () => {
    for (const result of [calculate(60_000), calculate(150_000, { churchMember: "yes" })]) {
      expect(result.employee.taxes.length).toBeGreaterThan(0);
      for (const line of result.employee.taxes) {
        expect(line.taxRole).toBe("payroll_withholding");
      }
    }
  });
});
