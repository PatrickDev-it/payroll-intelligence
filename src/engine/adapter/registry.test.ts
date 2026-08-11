import { afterEach, describe, expect, it } from "vitest";
import { MissingRuleSetError, UnsupportedCountryError } from "../errors.ts";
import {
  clearRegistry,
  isSupported,
  registerAdapter,
  resolveAdapter,
  resolveRuleSet,
  supportedCountries,
} from "./registry.ts";
import type { CountryPayrollAdapter } from "./contract.ts";
import type { RuleSet } from "../model/rule.ts";

const RULES_2026: RuleSet = { country: "IT", taxYear: 2026, version: "test", rules: {} };

const stubAdapter = {
  country: "IT",
  confidence: "verified",
  supportedTaxYears: [2026],
  requiredInputs: () => [],
  validate: () => ({ ok: true, issues: [] }),
  calculate: () => {
    throw new Error("not used in this test");
  },
  explain: () => undefined,
} satisfies CountryPayrollAdapter;

afterEach(() => clearRegistry());

describe("registry", () => {
  it("resolves a registered adapter", () => {
    registerAdapter(stubAdapter, (year) => (year === 2026 ? RULES_2026 : undefined));
    expect(resolveAdapter("IT")).toBe(stubAdapter);
    expect(isSupported("IT")).toBe(true);
    expect(supportedCountries()).toEqual(["IT"]);
  });

  it("refuses an unregistered country instead of falling back to a neighbour", () => {
    registerAdapter(stubAdapter, () => RULES_2026);
    expect(() => resolveAdapter("DE")).toThrow(UnsupportedCountryError);
    expect(isSupported("DE")).toBe(false);
  });

  it("reports only registered adapters, without a hidden roadmap fallback", () => {
    expect(() => resolveAdapter("FR")).toThrow(/Implemented: \(none\)/);
  });

  it("refuses a missing tax year instead of reusing last year's brackets", () => {
    registerAdapter(stubAdapter, (year) => (year === 2026 ? RULES_2026 : undefined));
    expect(() => resolveRuleSet("IT", 2025)).toThrow(MissingRuleSetError);
    expect(() => resolveRuleSet("IT", 2025)).toThrow(/Refusing rather than reusing/);
  });

  it("returns the rule set for a year it has", () => {
    registerAdapter(stubAdapter, (year) => (year === 2026 ? RULES_2026 : undefined));
    expect(resolveRuleSet("IT", 2026)).toBe(RULES_2026);
  });
});
