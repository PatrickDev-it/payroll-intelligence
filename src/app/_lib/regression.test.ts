import { describe, expect, it } from "vitest";
import { registerAllCountries } from "@countries/index.ts";
import { resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import { formValuesOf, profileFromParams } from "./profile.ts";

/**
 * The redesign's safety net.
 *
 * A user-interface patch must not move a single cent. These ten profiles were
 * computed BEFORE the interface work started and pinned here; if a refactor of
 * the form, the URL reader or the formatting layer changes what the engine
 * produces, one of these fails and says which country and which figure.
 *
 * They go through `profileFromParams` on purpose rather than building the
 * profile by hand: the URL reader is part of the path from an input to a
 * number, and it is exactly the layer this patch rewrote.
 *
 * Values are integer cents; rates are parts per million so a drift of 0.0001%
 * is still a failure rather than a rounding excuse.
 */

registerAllCountries();

type Expected = {
  readonly params: Record<string, string>;
  readonly netAnnual: number;
  readonly netPerPayPeriod: number;
  readonly netMonthlyEquivalent: number;
  readonly taxableIncome: number;
  readonly employerCost: number;
  readonly taxWedgePpm: number;
  readonly marginalPpm: number;
  readonly rules: number;
};

const FIXTURES: readonly Expected[] = [
  {
    params: { country: "IT", gross: "15000" },
    netAnnual: 1_419_790,
    netPerPayPeriod: 101_414,
    netMonthlyEquivalent: 118_316,
    taxableIncome: 1_362_150,
    employerCost: 2_070_711,
    taxWedgePpm: 314_347,
    marginalPpm: 263_940,
    rules: 11,
  },
  {
    params: { country: "IT", gross: "45000" },
    netAnnual: 3_003_441,
    netPerPayPeriod: 214_532,
    netMonthlyEquivalent: 250_287,
    taxableIncome: 4_086_450,
    employerCost: 6_183_333,
    taxWedgePpm: 514_268,
    marginalPpm: 493_780,
    rules: 9,
  },
  {
    params: { country: "IT", gross: "45000", region: "LAZIO", comune: "ROMA" },
    netAnnual: 2_969_193,
    netPerPayPeriod: 212_085,
    netMonthlyEquivalent: 247_433,
    taxableIncome: 4_086_450,
    employerCost: 6_183_333,
    taxWedgePpm: 519_807,
    marginalPpm: 509_310,
    rules: 9,
  },
  {
    params: { country: "IT", gross: "150000", pensionCeilingStatus: "subject" },
    netAnnual: 8_312_014,
    netPerPayPeriod: 593_715,
    netMonthlyEquivalent: 692_668,
    taxableIncome: 13_810_038,
    employerCost: 19_752_456,
    taxWedgePpm: 579_191,
    marginalPpm: 455_300,
    rules: 10,
  },
  {
    params: { country: "DE", gross: "45000" },
    netAnnual: 2_964_250,
    netPerPayPeriod: 247_021,
    netMonthlyEquivalent: 247_021,
    taxableIncome: 3_466_650,
    employerCost: 5_500_800,
    taxWedgePpm: 461_124,
    marginalPpm: 456_500,
    rules: 16,
  },
  {
    params: { country: "DE", gross: "60000", steuerklasse: "III", churchMember: "yes", region: "BY" },
    netAnnual: 4_174_224,
    netPerPayPeriod: 347_852,
    netMonthlyEquivalent: 347_852,
    taxableIncome: 4_664_400,
    employerCost: 7_334_400,
    taxWedgePpm: 430_870,
    marginalPpm: 442_140,
    rules: 17,
  },
  {
    params: { country: "ES", gross: "45000", aeatWithholdingRate: "21.05" },
    netAnnual: 3_260_250,
    netPerPayPeriod: 232_875,
    netMonthlyEquivalent: 271_688,
    taxableIncome: 4_007_500,
    employerCost: 5_946_750,
    taxWedgePpm: 451_759,
    marginalPpm: 275_500,
    rules: 15,
  },
  {
    params: { country: "ES", gross: "50000", region: "CATALUNA", aeatWithholdingRate: "21.05" },
    netAnnual: 3_622_500,
    netPerPayPeriod: 258_750,
    netMonthlyEquivalent: 301_875,
    taxableIncome: 4_475_000,
    employerCost: 6_607_500,
    taxWedgePpm: 451_759,
    marginalPpm: 275_500,
    rules: 15,
  },
  {
    params: { country: "FR", gross: "45000" },
    netAnnual: 3_255_381,
    netPerPayPeriod: 271_282,
    netMonthlyEquivalent: 271_282,
    taxableIncome: 3_321_364,
    employerCost: 6_204_420,
    taxWedgePpm: 475_313,
    marginalPpm: 429_840,
    rules: 26,
  },
  {
    params: { country: "FR", gross: "30000", foyer: "couple", children: "2" },
    netAnnual: 2_374_792,
    netPerPayPeriod: 197_899,
    netMonthlyEquivalent: 197_899,
    taxableIncome: 2_214_243,
    employerCost: 3_762_780,
    taxWedgePpm: 368_873,
    marginalPpm: 208_400,
    rules: 26,
  },
];

describe("the interface must not move a cent", () => {
  for (const fixture of FIXTURES) {
    const name = `${fixture.params["country"]} ${fixture.params["gross"]}${
      Object.keys(fixture.params).length > 2 ? " (+ options)" : ""
    }`;

    it(name, () => {
      const profile = profileFromParams(fixture.params);
      const result = resolveAdapter(profile.country).calculate(
        profile,
        resolveRuleSet(profile.country, profile.taxYear),
      );

      expect(result.employee.netAnnual.cents).toBe(fixture.netAnnual);
      expect(result.employee.netPerPayPeriod.cents).toBe(fixture.netPerPayPeriod);
      expect(result.employee.netMonthlyEquivalent.cents).toBe(fixture.netMonthlyEquivalent);
      expect(result.employee.taxableIncome.cents).toBe(fixture.taxableIncome);
      expect(result.employer.totalCost.cents).toBe(fixture.employerCost);
      expect(Math.round(result.rates.taxWedge * 1e6)).toBe(fixture.taxWedgePpm);
      expect(Math.round(result.rates.marginalRate * 1e6)).toBe(fixture.marginalPpm);
      expect(result.meta.rulesApplied.length).toBe(fixture.rules);
    });
  }
});

describe("Italian compound locality", () => {
  it("updates region and municipality from one URL value", () => {
    const profile = profileFromParams({ country: "IT", gross: "45000", location: "LAZIO:ROMA" });
    expect(profile.region).toBe("LAZIO");
    expect(profile.municipality).toBe("ROMA");
    expect(formValuesOf(profile)).toMatchObject({ location: "LAZIO:ROMA" });
    expect(formValuesOf(profile)).not.toHaveProperty("region");
    expect(formValuesOf(profile)).not.toHaveProperty("comune");
  });

  it("reads old region/comune links and canonicalizes them to one locality", () => {
    const profile = profileFromParams({
      country: "IT",
      gross: "45000",
      region: "LAZIO",
      comune: "ROMA",
    });
    expect(formValuesOf(profile)).toMatchObject({ location: "LAZIO:ROMA" });
  });
});
