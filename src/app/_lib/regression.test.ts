import { describe, expect, it } from "vitest";
import { registerAllCountries } from "@countries/index.ts";
import { resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import { formValuesOf, profileFromParams } from "./profile.ts";
import { message, type Locale } from "./i18n.ts";

/**
 * The redesign's safety net.
 *
 * These ten profiles pin the current versioned country contracts end-to-end.
 * Deliberate RFC changes update both the explicit URL inputs and these values;
 * later form, URL or formatting refactors must not move them by a cent.
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
    netAnnual: 1_416_511,
    netPerPayPeriod: 101_179,
    netMonthlyEquivalent: 118_043,
    taxableIncome: 1_358_100,
    employerCost: 2_066_661,
    taxWedgePpm: 314_590,
    marginalPpm: 265_980,
    rules: 18,
  },
  {
    params: { country: "IT", gross: "45000" },
    netAnnual: 2_996_647,
    netPerPayPeriod: 214_046,
    netMonthlyEquivalent: 249_721,
    taxableIncome: 4_074_300,
    employerCost: 6_171_183,
    taxWedgePpm: 514_413,
    marginalPpm: 494_810,
    rules: 16,
  },
  {
    params: { country: "IT", gross: "45000", region: "LAZIO", comune: "ROMA" },
    netAnnual: 2_962_606,
    netPerPayPeriod: 211_615,
    netMonthlyEquivalent: 246_884,
    taxableIncome: 4_074_300,
    employerCost: 6_171_183,
    taxWedgePpm: 519_929,
    marginalPpm: 510_290,
    rules: 16,
  },
  {
    params: { country: "IT", gross: "150000", pensionCeilingStatus: "subject" },
    netAnnual: 8_289_938,
    netPerPayPeriod: 592_138,
    netMonthlyEquivalent: 690_828,
    taxableIncome: 13_769_538,
    employerCost: 19_877_355,
    taxWedgePpm: 582_946,
    marginalPpm: 456_770,
    rules: 17,
  },
  {
    params: { country: "DE", gross: "45000", size: "31" },
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
    params: { country: "DE", gross: "60000", steuerklasse: "III", churchMember: "yes", region: "BY", size: "31" },
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
    params: { country: "FR", gross: "45000", pasRatePercent: "8.2" },
    netAnnual: 3_259_576,
    netPerPayPeriod: 271_631,
    netMonthlyEquivalent: 271_631,
    taxableIncome: 3_321_364,
    employerCost: 6_204_420,
    taxWedgePpm: 474_636,
    marginalPpm: 275_660,
    rules: 27,
  },
  {
    params: { country: "FR", gross: "30000", foyer: "couple", children: "2", pasRatePercent: "8.2" },
    netAnnual: 2_173_050,
    netPerPayPeriod: 181_088,
    netMonthlyEquivalent: 181_088,
    taxableIncome: 2_214_243,
    employerCost: 3_762_780,
    taxWedgePpm: 422_488,
    marginalPpm: 275_650,
    rules: 27,
  },
];

describe("versioned URL-to-result contracts", () => {
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
      expect(result.rates.marginalRate).not.toBeNull();
      if (result.rates.marginalRate === null) {
        throw new Error(`${name} unexpectedly has no marginal rate`);
      }
      expect(Math.round(result.rates.marginalRate * 1e6)).toBe(fixture.marginalPpm);
      expect(result.rates.marginalRatePolicy).toBe(
        profile.country === "DE" || profile.country === "ES" || profile.country === "FR"
          ? "hold_external_inputs"
          : "recompute",
      );
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

describe("exact declared percentages", () => {
  it("preserves the URL decimal spelling until the country adapter validates it", () => {
    const profile = profileFromParams({
      country: "ES",
      gross: "45000",
      aeatWithholdingRate: "21.050000",
    });

    expect(profile.countryOptions?.["aeatWithholdingRate"]).toBe("21.050000");
    expect(formValuesOf(profile).aeatWithholdingRate).toBe("21.050000");
  });

  it.each(["1.2345600", "1e0"])("rejects non-canonical employer rate %s before calculation", (rate) => {
    const profile = profileFromParams({
      country: "IT",
      gross: "45000",
      inailRatePercent: rate,
    });

    expect(resolveAdapter("IT").validate(profile).ok).toBe(false);
  });
});

describe("period-average copy", () => {
  it.each([
    ["it", /media/i],
    ["en", /average/i],
    ["de", /durchschnitt/i],
    ["fr", /moyenne/i],
    ["es", /promedio/i],
  ] as const)("labels %s output as a projection average", (locale, expected) => {
    expect(message(locale as Locale, "netPerPeriod", { periods: 12 })).toMatch(expected);
    expect(message(locale as Locale, "resultAnnouncement", { period: "x", annual: "y" })).toMatch(
      expected,
    );
  });
});
