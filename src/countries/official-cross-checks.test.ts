/** Golden values transcribed from official 2026 calculators/publications. */

import { describe, expect, it } from "vitest";
import { allLines } from "@engine/model/calculation.ts";
import { germanAdapter } from "./de/adapter.ts";
import { referenceProfile as germanProfile } from "./de/fixtures.ts";
import { loadGermanRules } from "./de/rules/index.ts";
import { spanishAdapter } from "./es/adapter.ts";
import { referenceProfile as spanishProfile } from "./es/fixtures.ts";
import { loadSpanishRules } from "./es/rules/index.ts";
import { frenchAdapter } from "./fr/adapter.ts";
import { referenceProfile as frenchProfile } from "./fr/fixtures.ts";
import { loadFrenchRules } from "./fr/rules/index.ts";
import { italianAdapter } from "./it/adapter.ts";
import { referenceProfile as italianProfile } from "./it/fixtures.ts";
import { loadItalianRules } from "./it/rules/index.ts";

describe("official 2026 cross-checks", () => {
  it("matches the BMF PAP annual Lohnsteuer table for classes I and III", () => {
    const rules = loadGermanRules(2026)!;
    const cases = [
      { taxClass: "I", gross: 15_000, tax: 0 },
      { taxClass: "I", gross: 30_000, tax: 2_248 },
      { taxClass: "I", gross: 45_000, tax: 5_570 },
      { taxClass: "I", gross: 60_000, tax: 9_389 },
      { taxClass: "I", gross: 80_000, tax: 15_694 },
      { taxClass: "I", gross: 100_000, tax: 23_248 },
      { taxClass: "III", gross: 30_000, tax: 0 },
      { taxClass: "III", gross: 45_000, tax: 1_850 },
      { taxClass: "III", gross: 60_000, tax: 4_822 },
      { taxClass: "III", gross: 80_000, tax: 9_496 },
      { taxClass: "III", gross: 100_000, tax: 15_012 },
    ] as const;

    for (const fixture of cases) {
      const base = germanProfile(fixture.gross);
      const result = germanAdapter.calculate(
        {
          ...base,
          countryOptions: { ...base.countryOptions, steuerklasse: fixture.taxClass },
        },
        rules,
      );
      const tax = allLines(result).find((line) => line.id === "DE.LOHNSTEUER.TARIF")!;
      expect(Math.abs(tax.amount.cents), `${fixture.taxClass} at ${fixture.gross}`).toBe(
        fixture.tax * 100,
      );
    }
  });

  it("reproduces the AEAT withholding amounts when given the official rates", () => {
    const rules = loadSpanishRules(2026)!;
    const cases = [
      { gross: 15_000, rate: 0, withheld: 0 },
      { gross: 25_000, rate: 14.09, withheld: 3_522.5 },
      { gross: 45_000, rate: 21.05, withheld: 9_472.5 },
      { gross: 70_000, rate: 26.64, withheld: 18_648 },
      { gross: 120_000, rate: 34.24, withheld: 41_088 },
    ];

    for (const fixture of cases) {
      const base = spanishProfile(fixture.gross);
      const result = spanishAdapter.calculate(
        {
          ...base,
          countryOptions: { ...base.countryOptions, aeatWithholdingRate: fixture.rate },
        },
        rules,
      );
      const tax = result.employee.taxes.find((line) => line.id === "ES.IRPF.RETENCION")!;
      expect(Math.abs(tax.amount.cents)).toBe(Math.round(fixture.withheld * 100));
    }
  });

  it("matches Urssaf Mon-entreprise RGDU at EUR 45,000 and low Fnal", () => {
    const base = frenchProfile(45_000);
    const result = frenchAdapter.calculate(
      { ...base, companySize: 20 },
      loadFrenchRules(2026)!,
    );
    const rgdu = result.employer.otherCosts.find(
      (line) => line.id === "FR.PAT.REDUCTION_GENERALE",
    )!;
    expect(-rgdu.amount.cents).toBe(219_150);
  });

  it("keeps capped and uncapped Italian IVS paths distinct above EUR 122,295", () => {
    const rules = loadItalianRules(2026)!;
    const base = italianProfile(150_000);
    const capped = italianAdapter.calculate(base, rules);
    const uncapped = italianAdapter.calculate(
      {
        ...base,
        countryOptions: { ...base.countryOptions, pensionCeilingStatus: "not_subject" },
      },
      rules,
    );
    const contributions = (result: typeof capped) =>
      result.employee.socialSecurity.reduce((sum, line) => sum - line.amount.cents, 0);
    expect(contributions(capped)).toBe(1_189_962);
    expect(contributions(uncapped)).toBe(1_472_276);
  });
});

describe("declared employer-rate overrides", () => {
  it("uses the exact Italian INAIL percentage and rounds money once", () => {
    const base = italianProfile(45_000);
    const result = italianAdapter.calculate(
      {
        ...base,
        countryOptions: { ...base.countryOptions, inailRatePercent: 1.2345 },
      },
      loadItalianRules(2026)!,
    );
    const line = result.employer.insurance.find(
      (candidate) => candidate.id === "IT.INAIL.PREMIUM.DECLARED",
    )!;
    expect(line.amount.cents).toBe(55_553);
    expect(line.confidence).toBe("supported");
  });

  it("uses the exact Spanish AT/EP percentage on the contribution base", () => {
    const base = spanishProfile(45_000);
    const result = spanishAdapter.calculate(
      {
        ...base,
        countryOptions: { ...base.countryOptions, atepRatePercent: 2.345 },
      },
      loadSpanishRules(2026)!,
    );
    const line = result.employer.insurance.find(
      (candidate) => candidate.id === "ES.SS.EMPLOYER.ATEP.DECLARED",
    )!;
    expect(line.amount.cents).toBe(105_525);
    expect(line.confidence).toBe("supported");
  });

  it("uses exact French AT/MP and mobility rates independently", () => {
    const base = frenchProfile(45_000);
    const result = frenchAdapter.calculate(
      {
        ...base,
        countryOptions: {
          ...base.countryOptions,
          atmpRatePercent: 1.25,
          versementMobiliteRatePercent: 2.1,
        },
      },
      loadFrenchRules(2026)!,
    );
    const atmp = result.employer.insurance.find(
      (candidate) => candidate.id === "FR.PAT.ATMP.DECLARED",
    )!;
    const mobility = result.employer.otherCosts.find(
      (candidate) => candidate.id === "FR.PAT.VERSEMENT_MOBILITE.DECLARED",
    )!;
    expect(atmp.amount.cents).toBe(56_250);
    expect(mobility.amount.cents).toBe(94_500);
  });

  it("splits an exact German Zusatzbeitrag and applies exact company levies", () => {
    const base = germanProfile(45_000);
    const result = germanAdapter.calculate(
      {
        ...base,
        countryOptions: {
          ...base.countryOptions,
          zusatzbeitragRatePercent: 3.2,
          unfallRatePercent: 1.1,
          u2RatePercent: 0.5,
        },
      },
      loadGermanRules(2026)!,
    );
    const employeeZusatz = result.employee.socialSecurity.find(
      (candidate) => candidate.id === "DE.KV.ZUSATZBEITRAG.DECLARED",
    )!;
    const employerZusatz = result.employer.contributions.find(
      (candidate) => candidate.id === "DE.KV.ZUSATZBEITRAG.DECLARED",
    )!;
    const unfall = result.employer.insurance.find(
      (candidate) => candidate.id === "DE.UNFALLVERSICHERUNG.DECLARED",
    )!;
    const u2 = result.employer.otherCosts.find(
      (candidate) => candidate.id === "DE.UMLAGE.U2.DECLARED",
    )!;
    expect(employeeZusatz.amount.cents).toBe(-72_000);
    expect(employerZusatz.amount.cents).toBe(72_000);
    expect(unfall.amount.cents).toBe(49_500);
    expect(u2.amount.cents).toBe(22_500);
  });
});
