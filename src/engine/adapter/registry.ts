/**
 * Adapter and rule-set resolution — the engine's fail-closed boundary.
 *
 * Every refusal here is a refusal to guess. An unregistered country throws
 * rather than falling back to a neighbour; a missing tax year throws rather
 * than reusing last year's brackets. Both fallbacks would return a number that
 * looks exactly as authoritative as a correct one.
 */

import { MissingRuleSetError, UnsupportedCountryError } from "../errors.ts";
import type { EUCountry } from "../model/employee-profile.ts";
import type { RuleSet } from "../model/rule.ts";
import type { CountryPayrollAdapter } from "./contract.ts";

export type RuleSetLoader = (taxYear: number) => RuleSet | undefined;

type Registration = {
  readonly adapter: CountryPayrollAdapter;
  readonly loadRules: RuleSetLoader;
};

const ADAPTERS = new Map<EUCountry, Registration>();

export function registerAdapter(adapter: CountryPayrollAdapter, loadRules: RuleSetLoader): void {
  ADAPTERS.set(adapter.country, { adapter, loadRules });
}

export function supportedCountries(): readonly EUCountry[] {
  return [...ADAPTERS.keys()].sort();
}

export function isSupported(country: EUCountry): boolean {
  return ADAPTERS.has(country);
}

export function resolveAdapter(country: EUCountry): CountryPayrollAdapter {
  const registration = ADAPTERS.get(country);
  if (!registration) throw new UnsupportedCountryError(country, supportedCountries());
  return registration.adapter;
}

export function resolveRuleSet(country: EUCountry, taxYear: number): RuleSet {
  const registration = ADAPTERS.get(country);
  if (!registration) throw new UnsupportedCountryError(country, supportedCountries());

  const rules = registration.loadRules(taxYear);
  if (!rules) {
    throw new MissingRuleSetError(country, taxYear, registration.adapter.supportedTaxYears);
  }
  return rules;
}

/** Test seam. Never called on a production path. */
export function clearRegistry(): void {
  ADAPTERS.clear();
}
