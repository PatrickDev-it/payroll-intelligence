import { registerAllCountries } from "@countries/index.ts";
import { resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import { profileFromParams } from "../src/app/_lib/profile.ts";

registerAllCountries();

const GROSSES = [15_000, 30_000, 45_000, 60_000, 100_000, 150_000] as const;
const COUNTRIES = ["IT", "DE", "ES", "FR"] as const;

const matrix = COUNTRIES.flatMap((country) =>
  GROSSES.map((gross) => {
    const profile = profileFromParams({
      country,
      gross: String(gross),
      ...(country === "IT" && gross > 122_295 ? { pensionCeilingStatus: "subject" } : {}),
      ...(country === "DE" ? { size: "31" } : {}),
      ...(country === "ES" ? { aeatWithholdingRate: "21.05" } : {}),
      ...(country === "FR" ? { pasRatePercent: "8.2" } : {}),
    });
    const result = resolveAdapter(country).calculate(profile, resolveRuleSet(country, profile.taxYear));
    return {
      country,
      gross,
      netAnnualCents: result.employee.netAnnual.cents,
      employerCostCents: result.employer.totalCost.cents,
      taxableIncomeCents: result.employee.taxableIncome.cents,
      taxWedgePpm: Math.round(result.rates.taxWedge * 1_000_000),
      marginalRatePpm:
        result.rates.marginalRate === null
          ? null
          : Math.round(result.rates.marginalRate * 1_000_000),
      engineVersion: result.meta.engineVersion,
      rulesetVersion: result.meta.rulesetVersion,
      confidence: result.meta.confidence,
      ruleCount: result.meta.rulesApplied.length,
    };
  }),
);

process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
