import { afterEach, describe, expect, it } from "vitest";
import { clearRegistry, resolveAdapter, resolveRuleSet } from "@engine/adapter/registry.ts";
import { InvalidProfileError } from "@engine/errors.ts";
import { applyPrimitive } from "@engine/primitives/apply.ts";
import { money } from "@engine/money/money.ts";
import { lowestConfidence } from "@engine/model/confidence.ts";
import { italianAdapter } from "./adapter.ts";
import { referenceProfile } from "./fixtures.ts";
import { LOCATIONS } from "./geography.ts";
import { registerItaly } from "./index.ts";
import { loadItalianRules } from "./rules/index.ts";

afterEach(() => clearRegistry());

describe("rule set", () => {
  it("loads and validates the 2026 Italian rules at import time", () => {
    const rules = loadItalianRules(2026);
    expect(rules).toBeDefined();
    expect(rules?.version).toBe("2026.5");
    expect(Object.keys(rules?.rules ?? {})).toContain("IT.IRPEF.BRACKETS");
  });

  it("stamps country and tax year onto every rule so the file cannot disagree with itself", () => {
    const rule = loadItalianRules(2026)?.rules["IT.IRPEF.BRACKETS"];
    expect(rule?.country).toBe("IT");
    expect(rule?.taxYear).toBe(2026);
  });

  it("has no rule set for 2025 and does not invent one", () => {
    expect(loadItalianRules(2025)).toBeUndefined();
    registerItaly();
    expect(() => resolveRuleSet("IT", 2025)).toThrow(/Refusing rather than reusing/);
  });

  it("carries provenance on every rule", () => {
    const rules = loadItalianRules(2026);
    for (const rule of Object.values(rules?.rules ?? {})) {
      expect(rule.source.document.length).toBeGreaterThan(0);
      expect(rule.verification.status).toBeDefined();
    }
  });
});

describe("rules driving the primitives", () => {
  const rules = loadItalianRules(2026);

  it("computes IRPEF lorda straight from the rule file", () => {
    const config = rules?.rules["IT.IRPEF.BRACKETS"]?.config;
    expect(config).toBeDefined();
    const taxable = money(40_864, "EUR"); // 40,864.50 less the 50 cents, kept whole here
    const result = applyPrimitive(config!, { base: taxable });
    expect(result.amount.cents).toBe(1_068_512); // 6,440.00 + 4,245.12
  });

  it("computes the TFR accrual through the formula registry, net of the guarantee fund", () => {
    // 45,000 / 13.5 = 3,333.33, less 0.50% (225.00) = 3,108.33
    const config = rules?.rules["IT.TFR.ACCRUAL"]?.config;
    const result = applyPrimitive(config!, { base: money(45_000, "EUR") });
    expect(result.amount.cents).toBe(310_833);
  });

  it("refuses an INAIL risk class it does not know", () => {
    const config = rules?.rules["IT.INAIL.PREMIUM"]?.config;
    expect(() => applyPrimitive(config!, { base: money(45_000, "EUR"), key: "deep_sea_diving" }))
      .toThrow(/Refusing rather than substituting/);
  });

  it("reports the Italian result as experimental because INAIL is", () => {
    const tiers = Object.values(rules?.rules ?? {}).map((r) => r.verification.status);
    expect(tiers).toContain("supported");
    expect(tiers).not.toContain("verified");
    expect(tiers).toContain("experimental");
    expect(lowestConfidence(tiers)).toBe("experimental");
    expect(italianAdapter.confidence).toBe("experimental");
  });
});

describe("requiredInputs", () => {
  it("asks for the Italian discriminants and nothing foreign to them", () => {
    const fields = italianAdapter.requiredInputs().map((i) => i.field);
    expect(fields).toContain("region");
    expect(fields).toContain("location");
    expect(fields).toContain("collectiveAgreement");
    expect(fields).toContain("countryOptions.inailRiskClass");
    expect(fields).not.toContain("taxClass"); // German
    expect(fields).not.toContain("quotientParts"); // French
  });

  it("keeps legacy geography inputs internal and exposes one compound control", () => {
    const inputs = italianAdapter.requiredInputs();
    expect(inputs.find((input) => input.field === "region")?.hidden).toBe(true);
    expect(inputs.find((input) => input.field === "municipality")?.hidden).toBe(true);
    expect(inputs.find((input) => input.field === "location")?.hidden).not.toBe(true);
  });

  it("gives every input a label so the form needs no country knowledge", () => {
    for (const input of italianAdapter.requiredInputs()) {
      expect(input.label.length).toBeGreaterThan(0);
    }
  });
});

describe("validate", () => {
  it("accepts the reference profile", () => {
    expect(italianAdapter.validate(referenceProfile(45_000)).ok).toBe(true);
  });

  it("refuses a tax year with no rule set", () => {
    const result = italianAdapter.validate({ ...referenceProfile(45_000), taxYear: 2024 });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.field).toBe("taxYear");
  });

  it("accepts every modelled location", () => {
    for (const location of LOCATIONS) {
      const result = italianAdapter.validate({
        ...referenceProfile(45_000),
        region: location.regionKey,
        municipality: location.municipalityKey,
      });
      expect(result.ok, location.key).toBe(true);
    }
  });

  it("refuses a municipality paired with the wrong region", () => {
    const result = italianAdapter.validate({
      ...referenceProfile(45_000),
      region: "LOMBARDIA",
      municipality: "ROMA",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message).join(" ")).toMatch(
      /Roma appartiene a Lazio, non a Lombardia/,
    );
  });

  it("refuses a place it has no rule for, rather than approximating it", () => {
    const region = italianAdapter.validate({ ...referenceProfile(45_000), region: "PADANIA" });
    expect(region.ok).toBe(false);
    expect(region.issues.map((i) => i.message).join()).toMatch(/Regione sconosciuta/);

    const comune = italianAdapter.validate({ ...referenceProfile(45_000), municipality: "VIGATA" });
    expect(comune.ok).toBe(false);
    expect(comune.issues.map((i) => i.message).join()).toMatch(/Comune non modellato/);
  });

  it("warns below the CCNL minimum without refusing — part-time is legitimate", () => {
    const result = italianAdapter.validate(referenceProfile(18_000));
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });
});

describe("calculate through the registry", () => {
  it("resolves the adapter and its rules, then computes the reference case", () => {
    registerItaly();
    const result = resolveAdapter("IT").calculate(referenceProfile(45_000), resolveRuleSet("IT", 2026));
    expect(result.employee.netAnnual.cents).toBe(3_003_441);
    expect(result.employer.totalCost.cents).toBe(6_183_333);
  });

  it("refuses an invalid profile rather than computing something for it", () => {
    expect(() =>
      italianAdapter.calculate(
        { ...referenceProfile(45_000), region: "Campania" },
        loadItalianRules(2026)!,
      ),
    ).toThrow(InvalidProfileError);
  });

  it("stamps the engine and rule-set versions on every result", () => {
    const result = italianAdapter.calculate(referenceProfile(45_000), loadItalianRules(2026)!);
    expect(result.meta.rulesetVersion).toBe("2026.5");
    expect(result.meta.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.meta.rulesApplied.length).toBeGreaterThan(5);
  });

  // Golden values, invariants and boundaries: ./calculate/calculate.test.ts
});
