/**
 * Profile -> page state, shared between the server's first paint and the
 * client's real-time recompute.
 *
 * One function, two callers: `page.tsx` (server, from the URL) and
 * `Calculator.tsx` (client, on every field change). If this logic changed
 * tomorrow, there is exactly one place to change it — the point of extracting
 * it rather than letting the server and the client drift into two
 * implementations of "what does this profile produce".
 */

import { isSupported, resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import type { CountryPayrollAdapter } from "@engine/adapter/contract.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile, ValidationResult } from "@engine/model/employee-profile.ts";
import { moneyFromDecimal, type Money } from "@engine/money/money.ts";
import { registerAllCountries } from "@countries/index.ts";
import { countryEntry, type CountryEntry } from "@countries/catalog.ts";

// Module-level, so it runs once per JS realm — once in the server bundle,
// once in the browser bundle. Both need their own populated registry; they
// are separate module instances, not a shared process.
registerAllCountries();

/** Within this distance of an exemption threshold, the cliff is worth naming. */
const CLIFF_PROXIMITY_CENTS = 150_000;

export type PageState = {
  readonly entry: CountryEntry | undefined;
  readonly available: boolean;
  readonly adapter: CountryPayrollAdapter | undefined;
  readonly validation: ValidationResult | undefined;
  readonly result: PayrollCalculation | undefined;
  readonly threshold: Money | undefined;
  /** The label of the rule whose threshold is near, so the notice can name it. */
  readonly thresholdLabel: string | undefined;
  readonly nearCliff: boolean;
};

export function computePageState(profile: EmployeeProfile): PageState {
  const entry = countryEntry(profile.country);
  const available = isSupported(profile.country);
  const adapter = available ? resolveAdapter(profile.country) : undefined;
  const rules = available ? resolveRuleSet(profile.country, profile.taxYear) : undefined;
  const validation = adapter?.validate(profile);
  const result =
    adapter && rules && validation?.ok ? adapter.calculate(profile, rules) : undefined;

  // A `threshold_exemption` rule is a cliff in law — below the threshold the tax
  // is zero, above it the rate hits the WHOLE base — so whoever is standing next
  // to one should be told. Which rule that is comes from the result itself, not
  // from a country-specific lookup: any country that legislates a cliff gets the
  // warning for free, and the threshold shown is the one actually applied.
  const cliff = result ? nearestCliff(rules, result) : undefined;

  return {
    entry,
    available,
    adapter,
    validation,
    result,
    threshold: cliff?.threshold,
    thresholdLabel: cliff?.label,
    nearCliff: cliff !== undefined,
  };
}

function nearestCliff(
  rules: ReturnType<typeof resolveRuleSet> | undefined,
  result: PayrollCalculation,
): { readonly threshold: Money; readonly label: string } | undefined {
  if (!rules) return undefined;

  for (const ref of result.meta.rulesApplied) {
    const rule = rules.rules[ref.id];
    if (rule?.config.kind !== "threshold_exemption") continue;

    const threshold = moneyFromDecimal(rule.config.threshold, result.currency);
    if (threshold.cents <= 0) continue;
    if (Math.abs(result.employee.taxableIncome.cents - threshold.cents) >= CLIFF_PROXIMITY_CENTS) {
      continue;
    }
    return { threshold, label: rule.label };
  }
  return undefined;
}
