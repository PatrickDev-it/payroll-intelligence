/**
 * Cross-country property probes over salaries selected independently of the
 * golden fixtures.  The deterministic generator is intentional: a failure is
 * reproducible with the printed country and gross, while still exercising
 * awkward cents and values that no hand-picked happy path would choose.
 */

import { describe, expect, it } from "vitest";
import type { CountryPayrollAdapter } from "@engine/adapter/contract.ts";
import { allLines, type PayrollCalculation } from "@engine/model/calculation.ts";
import type { EmployeeProfile } from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { fromCents } from "@engine/money/money.ts";
import { reconciles } from "@engine/pipeline/assemble.ts";
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

type Subject = {
  readonly code: "IT" | "DE" | "ES" | "FR";
  readonly adapter: CountryPayrollAdapter;
  readonly profile: (gross: number) => EmployeeProfile;
  readonly rules: RuleSet;
  readonly boundaryCents: readonly number[];
};

const SUBJECTS: readonly Subject[] = [
  {
    code: "IT",
    adapter: italianAdapter,
    profile: italianProfile,
    rules: loadItalianRules(2026)!,
    boundaryCents: [5_622_400, 12_229_500],
  },
  {
    code: "DE",
    adapter: germanAdapter,
    profile: germanProfile,
    rules: loadGermanRules(2026)!,
    boundaryCents: [6_975_000, 7_740_000, 10_140_000],
  },
  {
    code: "ES",
    adapter: spanishAdapter,
    profile: spanishProfile,
    rules: loadSpanishRules(2026)!,
    boundaryCents: [6_121_440, 6_733_584, 9_182_160],
  },
  {
    code: "FR",
    adapter: frenchAdapter,
    profile: frenchProfile,
    rules: loadFrenchRules(2026)!,
    boundaryCents: [2_187_640, 4_806_000, 6_562_920, 19_224_000, 38_448_000],
  },
];

describe.each(SUBJECTS)("$code adapter — adversarial properties", (subject) => {
  const results = adversarialGrosses(subject).map((gross) => ({
    gross,
    result: calculateAtCents(subject, gross),
  }));

  it("is deterministic for every awkward-cent profile", () => {
    for (const { gross, result } of results) {
      expect(calculateAtCents(subject, gross), `gross cents ${gross}`).toEqual(result);
    }
  });

  it("reconciles every employee and employer ledger exactly", () => {
    for (const { gross, result } of results) {
      expect(reconciles(result), `employee at gross cents ${gross}`).toBe(true);

      const employerLines = [
        ...result.employer.contributions,
        ...result.employer.insurance,
        ...result.employer.severanceAccrual,
        ...result.employer.otherCosts,
      ];
      const employerTotal = employerLines.reduce(
        (total, line) => total + line.amount.cents,
        result.employer.gross.cents,
      );
      expect(employerTotal, `employer at gross cents ${gross}`).toBe(result.employer.totalCost.cents);
    }
  });

  it("emits only integer money, finite rates and resolvable rule ids", () => {
    for (const { gross, result } of results) {
      const cited = new Set(result.meta.rulesApplied.map((rule) => rule.id));
      const monies = [
        result.employee.gross,
        result.employee.taxableIncome,
        result.employee.netAnnual,
        result.employee.netPerPayPeriod,
        result.employee.netMonthlyEquivalent,
        result.employer.totalCost,
        ...allLines(result).flatMap((line) => (line.basis ? [line.amount, line.basis] : [line.amount])),
      ];

      for (const amount of monies) {
        expect(Number.isSafeInteger(amount.cents), `money at gross cents ${gross}`).toBe(true);
        expect(amount.currency).toBe("EUR");
      }
      for (const rate of Object.values(result.rates)) {
        expect(Number.isFinite(rate), `rate at gross cents ${gross}`).toBe(true);
      }
      for (const line of allLines(result)) {
        expect(line.ruleIds.length, line.id).toBeGreaterThan(0);
        for (const ruleId of line.ruleIds) expect(cited.has(ruleId), `${line.id} -> ${ruleId}`).toBe(true);
      }
    }
  });

  it("keeps pay-period rounding within half a cent per division", () => {
    for (const { gross, result } of results) {
      const reconstructed = result.employee.netPerPayPeriod.cents * result.input.payPeriods;
      const error = Math.abs(reconstructed - result.employee.netAnnual.cents);
      expect(error, `gross cents ${gross}`).toBeLessThanOrEqual(Math.floor(result.input.payPeriods / 2));
    }
  });
});

function calculateAtCents(subject: Subject, grossCents: number): PayrollCalculation {
  const profile = {
    ...subject.profile(Math.max(1, Math.floor(grossCents / 100))),
    grossAnnual: fromCents(grossCents, "EUR"),
  };
  return subject.adapter.calculate(profile, subject.rules);
}

function adversarialGrosses(subject: Subject): number[] {
  const points = new Set<number>([100, 101, 999, 10_001, 99_999_999, 100_000_000]);
  for (const boundary of subject.boundaryCents) {
    for (const offset of [-101, -100, -1, 0, 1, 100, 101]) {
      const candidate = boundary + offset;
      if (candidate >= 100 && candidate <= 100_000_000) points.add(candidate);
    }
  }

  let state = countrySeed(subject.code);
  for (let index = 0; index < 64; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    points.add(100 + (state % 99_999_901));
  }
  return [...points].sort((a, b) => a - b);
}

function countrySeed(code: Subject["code"]): number {
  return [...code].reduce((seed, character) => Math.imul(seed, 31) + character.charCodeAt(0), 17) >>> 0;
}
