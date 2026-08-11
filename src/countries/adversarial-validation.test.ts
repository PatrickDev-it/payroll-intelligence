/**
 * Hostile boundary tests for the four executable country adapters.
 *
 * These profiles cannot be produced by the form, but they can reach an adapter
 * through the public TypeScript/API boundary.  A payroll engine must fail
 * closed there: silently replacing a forged option with a plausible default is
 * worse than an explicit refusal because the resulting number still looks
 * authoritative.
 */

import { describe, expect, it } from "vitest";
import type { CountryPayrollAdapter } from "@engine/adapter/contract.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import { money } from "@engine/money/money.ts";
import { germanAdapter } from "./de/adapter.ts";
import { referenceProfile as germanProfile } from "./de/fixtures.ts";
import { spanishAdapter } from "./es/adapter.ts";
import { referenceProfile as spanishProfile } from "./es/fixtures.ts";
import { frenchAdapter } from "./fr/adapter.ts";
import { referenceProfile as frenchProfile } from "./fr/fixtures.ts";
import { italianAdapter } from "./it/adapter.ts";
import { referenceProfile as italianProfile } from "./it/fixtures.ts";

type Subject = {
  readonly code: "IT" | "DE" | "ES" | "FR";
  readonly adapter: CountryPayrollAdapter;
  readonly profile: EmployeeProfile;
  readonly forgedOption: { readonly key: string; readonly value: string };
};

const SUBJECTS: readonly Subject[] = [
  {
    code: "IT",
    adapter: italianAdapter,
    profile: italianProfile(45_000),
    forgedOption: { key: "inailRiskClass", value: "invented-risk" },
  },
  {
    code: "DE",
    adapter: germanAdapter,
    profile: germanProfile(45_000),
    forgedOption: { key: "steuerklasse", value: "VI" },
  },
  {
    code: "ES",
    adapter: spanishAdapter,
    profile: spanishProfile(45_000),
    forgedOption: { key: "cnaeRiskClass", value: "invented-risk" },
  },
  {
    code: "FR",
    adapter: frenchAdapter,
    profile: frenchProfile(45_000),
    forgedOption: { key: "foyer", value: "invented-household" },
  },
];

describe.each(SUBJECTS)("$code adapter — hostile profiles", ({ adapter, code, profile, forgedOption }) => {
  it("refuses a profile for a different country instead of applying the wrong law", () => {
    const wrongCountry = code === "IT" ? "DE" : "IT";
    expect(adapter.validate({ ...profile, country: wrongCountry }).ok).toBe(false);
  });

  it("refuses a non-euro amount instead of interpreting foreign units as euros", () => {
    const forged = {
      ...profile,
      grossAnnual: { ...profile.grossAnnual, currency: "USD" },
    } as unknown as EmployeeProfile;
    expect(adapter.validate(forged).ok).toBe(false);
  });

  it("refuses employment types whose payroll rules are not modelled", () => {
    expect(adapter.validate({ ...profile, employmentType: "apprentice" }).ok).toBe(false);
    expect(adapter.validate({ ...profile, employmentType: "director" }).ok).toBe(false);
  });

  it("refuses impossible working-time percentages", () => {
    expect(adapter.validate({ ...profile, workingTimePercent: 0 }).ok).toBe(false);
    expect(adapter.validate({ ...profile, workingTimePercent: 101 }).ok).toBe(false);
  });

  it("refuses a forged select option instead of falling back to a default", () => {
    const forged = {
      ...profile,
      countryOptions: { ...profile.countryOptions, [forgedOption.key]: forgedOption.value },
    };
    const validation = adapter.validate(forged);
    expect(validation.ok).toBe(false);
    expect(validation.issues.some((issue) => issue.field === `countryOptions.${forgedOption.key}`)).toBe(true);
  });

  it("refuses unknown country options instead of silently ignoring a typo", () => {
    const forged = {
      ...profile,
      countryOptions: { ...profile.countryOptions, misspelledLegalOption: "yes" },
    };
    const validation = adapter.validate(forged);
    expect(validation.ok).toBe(false);
    expect(validation.issues.some((issue) => issue.field === "countryOptions.misspelledLegalOption")).toBe(true);
  });

  it("enforces the declared gross ceiling even when the form is bypassed", () => {
    expect(adapter.validate({ ...profile, grossAnnual: money(1_000_001, "EUR") }).ok).toBe(false);
  });

  it("refuses non-integral cents at the runtime boundary", () => {
    const forged = {
      ...profile,
      grossAnnual: { ...profile.grossAnnual, cents: 4_500_000.5 },
    };
    expect(adapter.validate(forged).ok).toBe(false);
  });
});
