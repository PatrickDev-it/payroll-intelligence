import { describe, expect, it } from "vitest";
import { money } from "@engine/money/money.ts";
import { reconciles } from "@engine/pipeline/assemble.ts";
import { applyPrimitive } from "@engine/primitives/apply.ts";
import { ruleOf } from "@engine/pipeline/helpers.ts";
import { germanAdapter } from "../adapter.ts";
import { DE_BOUNDARIES, DE_FIXTURES, DE_TARIFF_BOUNDARIES, referenceProfile } from "../fixtures.ts";
import { loadGermanRules } from "../rules/index.ts";
import "../formulas.ts";

const rules = loadGermanRules(2026)!;
const compute = (gross: number, options: Record<string, string | number | boolean> = {}) => {
  const base = referenceProfile(gross);
  return germanAdapter.calculate(
    { ...base, countryOptions: { ...base.countryOptions, ...options } },
    rules,
  );
};

/** § 32a applied directly to a zu versteuerndes Einkommen, in cents. */
function tariff(zvEEuros: number): number {
  return applyPrimitive(ruleOf(rules, "DE.LOHNSTEUER.TARIF").config, {
    base: money(zvEEuros, "EUR"),
  }).amount.cents;
}

describe("§ 32a EStG 2026 — the tariff is a polynomial, not a bracket table", () => {
  it("charges nothing up to the Grundfreibetrag and one cent-free euro above it", () => {
    expect(tariff(12_348)).toBe(0);
    expect(tariff(12_349)).toBe(0); // 914,51 · 0,0001² + 1 400 · 0,0001 = 0,14 → abgerundet 0
  });

  it("meets itself exactly at the zone 2/3 boundary — the statute's own consistency check", () => {
    // Zone 2 at x = 17 799 is (914,51 · 0,5451 + 1 400) · 0,5451 = 1 034,87 —
    // exactly the constant zone 3 starts from at z = 0. The two polynomials are
    // written to join there, so this is the assertion that catches a mistyped
    // coefficient: 1 034,87 rounded down to a full euro is 1 034.
    expect(tariff(17_799)).toBe(103_400);
    // One euro further, zone 3 has advanced by its linear term only: 0,2397.
    expect(tariff(17_800)).toBe(103_500);
  });

  it("meets itself at the zone 3/4 boundary", () => {
    // 0,42 · 69 879 − 11 135,63 = 18 213,55
    expect(tariff(69_879)).toBe(1_821_300);
    // zone 3 at x = 69 878 must land within a euro of it, from the other side
    expect(Math.abs(tariff(69_878) - 1_821_300)).toBeLessThanOrEqual(100);
  });

  it("meets itself at the Reichensteuer boundary", () => {
    // 0,45 · 277 826 − 19 470,38 = 105_551,32 ; 0,42 · 277 825 − 11 135,63 = 105_551,87
    expect(Math.abs(tariff(277_826) - tariff(277_825))).toBeLessThanOrEqual(100);
  });

  it("is monotonic and continuous across every zone edge — no step, no cliff", () => {
    for (const x of DE_TARIFF_BOUNDARIES) {
      const step = tariff(x + 1) - tariff(x);
      expect(step).toBeGreaterThanOrEqual(0);
      // One more euro of income can never cost more than one euro of tax: the
      // marginal rate is below 100% everywhere, including where the polynomial
      // changes. A mistyped constant shows up here as a jump of hundreds.
      expect(step).toBeLessThanOrEqual(100);
    }
  });

  it("rounds down to a full euro, as § 32a Abs. 1 Satz 2 requires", () => {
    for (const x of [20_000, 45_000, 70_000, 300_000]) {
      expect(tariff(x) % 100).toBe(0);
    }
  });
});

describe("the German result", () => {
  it("reconciles at every fixture: gross plus every signed line equals the net", () => {
    for (const gross of DE_FIXTURES) {
      expect(reconciles(compute(gross))).toBe(true);
    }
  });

  it("never returns a net above the gross — Germany pays no cash supplement in payroll", () => {
    for (const gross of [...DE_FIXTURES, ...DE_BOUNDARIES]) {
      const result = compute(gross);
      expect(result.employee.netAnnual.cents).toBeLessThan(result.employee.gross.cents);
    }
  });

  it("cites a rule on every line", () => {
    const result = compute(45_000);
    for (const line of [
      ...result.employee.socialSecurity,
      ...result.employee.taxes,
      ...result.employer.contributions,
      ...result.employer.insurance,
      ...result.employer.otherCosts,
    ]) {
      expect(line.ruleIds.length).toBeGreaterThan(0);
    }
  });

  it("accrues no severance — Germany has no TFR", () => {
    expect(compute(45_000).employer.severanceAccrual).toHaveLength(0);
  });

  it("taxes a notional base: the Vorsorgepauschale is not the contributions actually paid", () => {
    const result = compute(45_000);
    const contributions = result.employee.socialSecurity.reduce((t, l) => t - l.amount.cents, 0);
    const pauschbetraege = 1_266_00; // § 9a 1.230 + § 10c 36

    // If Germany worked like Italy the base would be gross − contributions −
    // Pauschbeträge. It does not: health enters the Vorsorgepauschale at the
    // REDUCED 7,0% rather than the 7,3% actually withheld, and the whole
    // unemployment part is squeezed out by the €1.900 cap. The base is
    // therefore ~€720 HIGHER than the Italian-shaped calculation would give,
    // which is roughly €200 of extra tax at this salary.
    const italianShaped = result.employee.gross.cents - contributions - pauschbetraege;
    expect(result.employee.taxableIncome.cents).toBeGreaterThan(italianShaped);
    expect(result.employee.taxableIncome.cents - italianShaped).toBeGreaterThan(50_000);
  });
});

describe("the contribution ceilings", () => {
  it("stops health and care at 69.750 while pension keeps running", () => {
    const at = compute(69_750);
    const above = compute(101_400);
    const health = (r: typeof at) =>
      r.employee.socialSecurity.find((l) => l.id === "DE.KV.EMPLOYEE.BASE")!.amount.cents;
    const pension = (r: typeof at) =>
      r.employee.socialSecurity.find((l) => l.id === "DE.RV.EMPLOYEE")!.amount.cents;

    expect(health(above)).toBe(health(at));
    expect(pension(above)).toBeLessThan(pension(at));
  });

  it("freezes every contribution above the pension ceiling, making the top marginal rate fall", () => {
    const below = compute(100_000);
    const above = compute(120_000);
    expect(above.rates.effectiveSocialRate).toBeLessThan(below.rates.effectiveSocialRate);
  });
});

describe("the discriminants Germany actually has", () => {
  it("Steuerklasse III is worth thousands to a single earner", () => {
    const single = compute(60_000, { steuerklasse: "I" });
    const splitting = compute(60_000, { steuerklasse: "III" });
    expect(splitting.employee.netAnnual.cents - single.employee.netAnnual.cents).toBeGreaterThan(
      300_000,
    );
  });

  it("charges the childless care surcharge only from 23", () => {
    const base = referenceProfile(45_000);
    const young = germanAdapter.calculate({ ...base, age: 22 }, rules);
    const older = germanAdapter.calculate({ ...base, age: 23 }, rules);
    expect(older.employee.netAnnual.cents).toBeLessThan(young.employee.netAnnual.cents);
  });

  it("reduces the care rate from the second child, not the first", () => {
    const one = compute(45_000, { hasParentStatus: true, qualifyingChildrenUnder25: 1 });
    const two = compute(45_000, { hasParentStatus: true, qualifyingChildrenUnder25: 2 });
    const three = compute(45_000, { hasParentStatus: true, qualifyingChildrenUnder25: 3 });
    expect(two.employee.netAnnual.cents).toBeGreaterThan(one.employee.netAnnual.cents);
    expect(three.employee.netAnnual.cents).toBeGreaterThan(two.employee.netAnnual.cents);
  });

  it("moves one point of the care contribution to the employee in Sachsen", () => {
    const berlin = compute(45_000);
    const base = referenceProfile(45_000);
    const saxony = germanAdapter.calculate({ ...base, region: "SN" }, rules);
    expect(saxony.employee.netAnnual.cents).toBeLessThan(berlin.employee.netAnnual.cents);
    expect(saxony.employer.totalCost.cents).toBeLessThan(berlin.employer.totalCost.cents);
  });

  it("charges church tax only to a member, and 8% in Bayern against 9% in Berlin", () => {
    const base = referenceProfile(45_000);
    const none = germanAdapter.calculate(base, rules);
    const berlin = germanAdapter.calculate(
      { ...base, countryOptions: { ...base.countryOptions, churchMember: "yes" } },
      rules,
    );
    const bayern = germanAdapter.calculate(
      { ...base, region: "BY", countryOptions: { ...base.countryOptions, churchMember: "yes" } },
      rules,
    );

    expect(none.employee.taxes.some((l) => l.id === "DE.KIRCHENSTEUER")).toBe(false);
    expect(berlin.employee.netAnnual.cents).toBeLessThan(none.employee.netAnnual.cents);
    expect(bayern.employee.netAnnual.cents).toBeGreaterThan(berlin.employee.netAnnual.cents);
  });

  it("charges no Solidaritätszuschlag at the reference salary and does charge it high up", () => {
    expect(compute(45_000).employee.taxes.some((l) => l.id === "DE.SOLIDARITAETSZUSCHLAG")).toBe(
      false,
    );
    expect(compute(150_000).employee.taxes.some((l) => l.id === "DE.SOLIDARITAETSZUSCHLAG")).toBe(
      true,
    );
  });
});

describe("validation", () => {
  it("refuses a non-monthly pay schedule", () => {
    const check = germanAdapter.validate({ ...referenceProfile(45_000), payPeriods: 14 });
    expect(check.ok).toBe(false);
  });

  it("refuses an unknown Bundesland rather than guessing one", () => {
    const check = germanAdapter.validate({ ...referenceProfile(45_000), region: "XX" });
    expect(check.ok).toBe(false);
  });

  it("warns, without refusing, above the private-insurance threshold", () => {
    const check = germanAdapter.validate(referenceProfile(90_000));
    expect(check.ok).toBe(true);
    expect(check.issues.some((issue) => issue.severity === "warning")).toBe(true);
  });
});
