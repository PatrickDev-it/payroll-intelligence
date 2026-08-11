/**
 * Boundaries, cliffs and marginal rates — where Italian payroll actually breaks.
 *
 * Split from calculate.test.ts (golden values and invariants) because these ask
 * a different question: not "is the number right at a normal salary" but "does
 * the engine behave correctly at the points where the law changes shape".
 */

import { describe, expect, it } from "vitest";
import { format, money, subtract } from "@engine/money/money.ts";
import { italianAdapter } from "../adapter.ts";
import { IT_BOUNDARIES, grossForTaxable, referenceProfile } from "../fixtures.ts";
import { loadItalianRules } from "../rules/index.ts";

const RULES = loadItalianRules(2026)!;
const runAt = (grossEuros: number) => italianAdapter.calculate(referenceProfile(grossEuros), RULES);

describe("monotonicity", () => {
  const MILAN_CLIFF_GROSS = grossForTaxable(23_000);

  /**
   * A higher gross must never yield a lower net — except where the statute is
   * genuinely discontinuous. The exception is located, not tolerated: any
   * violation must bracket the Milan surtax cliff, and a violation anywhere
   * else fails the test.
   */
  it("holds across the range, with the only violation bracketing the Milan cliff", () => {
    const STEP = 250;
    const violations: { from: number; to: number }[] = [];
    let previousNet = -Infinity;
    let previousGross = 0;

    for (let gross = 10_000; gross <= 70_000; gross += STEP) {
      const net = runAt(gross).employee.netAnnual.cents;
      if (net < previousNet) violations.push({ from: previousGross, to: gross });
      previousNet = net;
      previousGross = gross;
    }

    expect(violations.length, JSON.stringify(violations)).toBe(1);
    const [only] = violations;
    expect(only!.from).toBeLessThan(MILAN_CLIFF_GROSS);
    expect(only!.to).toBeGreaterThanOrEqual(MILAN_CLIFF_GROSS);
  });

  it("puts the Milan cliff exactly where the law puts it", () => {
    const below = runAt(MILAN_CLIFF_GROSS - 1);
    const above = runAt(MILAN_CLIFF_GROSS);

    expect(below.employee.taxableIncome.cents).toBeLessThanOrEqual(2_300_000);
    expect(above.employee.taxableIncome.cents).toBeGreaterThan(2_300_000);

    const municipal = (r: typeof below) =>
      r.employee.taxes.find((l) => l.id.includes("COMUNALE"))?.amount.cents ?? NaN;
    expect(municipal(below)).toBe(0);
    expect(municipal(above)).toBeLessThan(-18_000); // roughly -184.00

    // One euro more gross, and the employee takes home about EUR 183 less.
    const drop = below.employee.netAnnual.cents - above.employee.netAnnual.cents;
    expect(drop).toBeGreaterThan(17_000);
    expect(drop).toBeLessThan(19_000);
  });
});

describe("boundaries — every documented threshold at +/- one euro of gross", () => {
  for (const boundary of IT_BOUNDARIES) {
    const at = boundary.basis === "gross" ? boundary.atEuros : grossForTaxable(boundary.atEuros);
    const label = `${boundary.basis ?? "taxable"} EUR ${boundary.atEuros.toLocaleString("en-US")} (${boundary.why})`;

    it(`stays finite and positive across ${label}`, () => {
      for (const r of [runAt(at - 1), runAt(at + 1)]) {
        const supplements = r.employee.credits.reduce((t, l) => t + l.amount.cents, 0);
        expect(Number.isFinite(r.employee.netAnnual.cents)).toBe(true);
        expect(r.employee.netAnnual.cents).toBeGreaterThan(0);
        expect(r.employee.netAnnual.cents).toBeLessThanOrEqual(
          r.employee.gross.cents + supplements,
        );
      }
    });

    if (boundary.cliff === undefined) {
      it(`moves smoothly across ${label}`, () => {
        const delta = runAt(at + 1).employee.netAnnual.cents - runAt(at - 1).employee.netAnnual.cents;
        expect(Math.abs(delta), boundary.why).toBeLessThan(25_000); // < EUR 250 for EUR 2
      });
    } else {
      it(`is a documented ${boundary.cliff} at ${label}`, () => {
        const delta = runAt(at + 1).employee.netAnnual.cents - runAt(at - 1).employee.netAnnual.cents;
        if (boundary.cliff === "drop") {
          expect(delta).toBeLessThan(-17_000); // Milan: about -EUR 183
        } else {
          // The capienza test flips: EUR 1,200 trattamento integrativo switches
          // on, net of the somma integrativa dropping from 7.1% to 5.3%.
          expect(delta).toBeGreaterThan(50_000);
        }
      });
    }
  }
});

describe("the marginal rate the headline hides", () => {
  it("is far above the nominal bracket rate at EUR 45,000", () => {
    const r = runAt(45_000);
    // 33% nominal; ~49% actual once contributions, the credit taper and both
    // surtaxes are counted. This gap is the reason the breakdown exists.
    expect(r.rates.effectiveTaxRate).toBeGreaterThan(0.23);
    expect(r.rates.effectiveTaxRate).toBeLessThan(0.26);
    expect(r.rates.marginalRate).toBeGreaterThan(0.45);
    expect(r.rates.marginalRate).toBeLessThan(0.52);
  });

  it("falls above the contributory ceiling, because contributions stop", () => {
    const below = runAt(110_000).rates.marginalRate;
    const above = runAt(130_000).rates.marginalRate;
    expect(above).toBeLessThan(below);
  });
});

describe("explain", () => {
  it("returns a derivation and its sources for any line", () => {
    const r = runAt(45_000);
    const explanation = italianAdapter.explain(r, "IT.ADDIZIONALE.COMUNALE.MILANO");
    expect(explanation).toBeDefined();
    // Derivations are symbolic: the threshold shows as a comparison, not a word.
    expect(explanation?.derivation).toBe("40.864,50 > 23.000,00 \u2192 40.864,50 \u00d7 0,8%");
    expect(explanation?.rules[0]?.id).toBe("IT.ADDIZIONALE.COMUNALE.MILANO");
    expect(explanation?.rules[0]?.document).toContain("addizionale comunale");
    expect(explanation?.rules[0]?.url).toContain("comune.milano.it");
  });

  it("returns undefined for a line that is not in the result", () => {
    expect(italianAdapter.explain(runAt(45_000), "FR.CSG")).toBeUndefined();
  });
});

describe("presentation", () => {
  it("formats the reference net the way an Italian payslip reads", () => {
    const r = runAt(45_000);
    expect(format(r.employee.netAnnual)).toContain("30.034,41");
    expect(subtract(r.employee.gross, r.employee.netAnnual).cents).toBe(1_496_559);
    expect(money(45_000, "EUR").cents - r.employee.netAnnual.cents).toBe(1_496_559);
  });
});
