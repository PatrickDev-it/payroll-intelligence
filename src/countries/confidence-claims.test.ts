/**
 * VERIFIED is an evidence claim, not a synonym for "read from a statute".
 * The project methodology requires an independent calculator cross-check and
 * boundary coverage.  Keep that promise executable so a future source update
 * cannot accidentally promote a plausible, untested number.
 */

import { describe, expect, it } from "vitest";
import type { RuleSet } from "@engine/model/rule.ts";
import { loadGermanRules } from "./de/rules/index.ts";
import { loadSpanishRules } from "./es/rules/index.ts";
import { loadFrenchRules } from "./fr/rules/index.ts";
import { loadItalianRules } from "./it/rules/index.ts";

const RULESETS: readonly RuleSet[] = [
  loadItalianRules(2026)!,
  loadGermanRules(2026)!,
  loadSpanishRules(2026)!,
  loadFrenchRules(2026)!,
];

describe("confidence claims", () => {
  it("never says verified without an explicit independent calculator cross-check", () => {
    const unsupportedClaims = RULESETS.flatMap((rules) =>
      Object.values(rules.rules)
        .filter((rule) => rule.verification.status === "verified")
        .filter((rule) => {
          const method = rule.verification.method ?? "";
          const checks = rule.verification.crossCheckedAgainst ?? [];
          return !/independent_calculator|official_calculator/.test(method) || checks.length === 0;
        })
        .map((rule) => `${rules.country}:${rule.id}`),
    );

    expect(unsupportedClaims).toEqual([]);
  });
});
