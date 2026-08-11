/**
 * The golden suite. Every expected value comes from
 * docs/countries/IT/worked-example.md, derived by hand from the statutes, so a
 * change to a rule that moves a number shows up here as a reviewable diff.
 *
 * Equal to the cent, not close.
 */

import { describe, expect, it } from "vitest";
import { allLines } from "@engine/model/calculation.ts";

import { italianAdapter } from "../adapter.ts";
import { IT_FIXTURES, referenceProfile } from "../fixtures.ts";
import { loadItalianRules } from "../rules/index.ts";

const RULES = loadItalianRules(2026)!;

const runAt = (grossEuros: number) =>
  italianAdapter.calculate(referenceProfile(grossEuros), RULES);

describe("golden fixtures — to the cent", () => {
  it("does not apply the post-1995 contribution ceiling to an uncapped worker", () => {
    const capped = referenceProfile(150_000);
    const uncapped = {
      ...capped,
      countryOptions: { ...capped.countryOptions, pensionCeilingStatus: "not_subject" },
    };

    const cappedResult = italianAdapter.calculate(capped, RULES);
    const uncappedResult = italianAdapter.calculate(uncapped, RULES);

    expect(uncappedResult.employee.socialSecurity[0]?.id).toBe("IT.INPS.EMPLOYEE.IVS.UNCAPPED");
    expect(uncappedResult.employee.netAnnual.cents).toBeLessThan(cappedResult.employee.netAnnual.cents);
    expect(uncappedResult.employer.totalCost.cents).toBeGreaterThan(cappedResult.employer.totalCost.cents);
  });
  for (const fixture of IT_FIXTURES) {
    describe(`RAL EUR ${fixture.grossEuros.toLocaleString("en-US")}`, () => {
      const result = runAt(fixture.grossEuros);

      it("withholds the right social security", () => {
        const total = result.employee.socialSecurity.reduce((t, l) => t - l.amount.cents, 0);
        expect(total).toBe(fixture.contributions);
      });

      it("derives the right taxable income", () => {
        expect(result.employee.taxableIncome.cents).toBe(fixture.taxableIncome);
      });

      it("computes IRPEF net of credits at cent precision", () => {
        const irpef = result.employee.taxes.find((l) => l.id === "IT.IRPEF");
        expect(-(irpef?.amount.cents ?? 0)).toBe(fixture.irpefNet);
        expect(irpef?.children?.map((line) => line.id)).not.toContain("IT.IRPEF.ROUNDING");
      });

      it("computes both local surtaxes", () => {
        const surtaxes = result.employee.taxes
          .filter((l) => l.id.startsWith("IT.ADDIZIONALE"))
          .reduce((t, l) => t - l.amount.cents, 0);
        expect(surtaxes).toBe(fixture.surtaxes);
      });

      it("adds the cash supplements outside the tax", () => {
        const supplements = result.employee.credits.reduce((t, l) => t + l.amount.cents, 0);
        expect(supplements).toBe(fixture.supplements);
      });

      it("reaches the right annual net", () => {
        expect(result.employee.netAnnual.cents).toBe(fixture.netAnnual);
      });

      it("splits it across the pay periods", () => {
        expect(result.employee.netPerPayPeriod.cents).toBe(fixture.netPerPayPeriod);
      });

      it("reaches the right employer cost", () => {
        expect(result.employer.totalCost.cents).toBe(fixture.employerCost);
      });

      it("reports the right tax wedge", () => {
        expect(result.rates.taxWedge).toBeCloseTo(fixture.taxWedge, 4);
      });
    });
  }
});

describe("invariants", () => {
  const grosses = [15_000, 20_000, 30_000, 45_000, 60_000, 100_000, 200_000];

  it("reconciles: gross + every signed line === net", () => {
    for (const gross of grosses) {
      const r = runAt(gross);
      const total =
        r.employee.gross.cents +
        [...r.employee.socialSecurity, ...r.employee.taxes, ...r.employee.credits].reduce(
          (t, l) => t + l.amount.cents,
          0,
        );
      expect(total, `at EUR ${gross}`).toBe(r.employee.netAnnual.cents);
    }
  });

  it("every child line sums to its parent", () => {
    for (const gross of grosses) {
      for (const line of runAt(gross).employee.taxes) {
        if (!line.children) continue;
        const sumOfChildren = line.children.reduce((t, c) => t + c.amount.cents, 0);
        expect(sumOfChildren, `${line.id} at EUR ${gross}`).toBe(line.amount.cents);
      }
    }
  });

  it("employer cost is never below gross", () => {
    for (const gross of grosses) {
      const r = runAt(gross);
      expect(r.employer.totalCost.cents).toBeGreaterThanOrEqual(r.employee.gross.cents);
    }
  });

  /**
   * NOT "net <= gross". The trattamento integrativo and the somma integrativa
   * are cash transfers paid THROUGH payroll, not reductions of tax, so a low
   * earner legitimately takes home more than their gross. The real invariant is
   * that the net cannot exceed gross plus those supplements.
   */
  it("net is positive and never exceeds gross plus the cash supplements", () => {
    for (const gross of [...grosses, 9_361, 12_000]) {
      const r = runAt(gross);
      const supplements = r.employee.credits.reduce((t, l) => t + l.amount.cents, 0);
      expect(r.employee.netAnnual.cents, `at EUR ${gross}`).toBeGreaterThan(0);
      expect(r.employee.netAnnual.cents, `at EUR ${gross}`).toBeLessThanOrEqual(
        r.employee.gross.cents + supplements,
      );
    }
  });

  it("lets the net exceed the gross at low incomes, because the law does", () => {
    // EUR 9,361 gross: EUR 1,200 trattamento integrativo (capienza just passes)
    // plus EUR 450.54 somma integrativa, against EUR 964.84 of withholdings.
    const r = runAt(9_361);
    expect(r.employee.netAnnual.cents).toBeGreaterThan(r.employee.gross.cents);
    expect(r.employee.credits.map((l) => l.id)).toContain("IT.PAYROLL.TRATTAMENTO_INTEGRATIVO");
    expect(r.employee.credits.map((l) => l.id)).toContain("IT.PAYROLL.SOMMA_INTEGRATIVA");
  });

  it("every line, at every depth, cites at least one rule", () => {
    for (const line of allLines(runAt(45_000))) {
      expect(line.ruleIds.length, line.id).toBeGreaterThan(0);
    }
  });

  it("reports experimental, because the INAIL rate is", () => {
    expect(runAt(45_000).meta.confidence).toBe("experimental");
  });
});
