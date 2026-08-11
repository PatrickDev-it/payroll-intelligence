/**
 * Geography: 21 regions and every modelled comune, driven by the same rule set
 * the engine uses.
 *
 * The point of these tests is not that the arithmetic works — that is covered
 * elsewhere — but that the *discriminant* is real: choosing a different region
 * must actually move the number, by the amount the documentation claims.
 */

import { describe, expect, it } from "vitest";
import { italianAdapter } from "./adapter.ts";
import { referenceProfile } from "./fixtures.ts";
import {
  LOCATIONS,
  MUNICIPALITIES,
  REGIONS,
  municipalityRuleId,
  regionKeyForMunicipality,
  regionRuleId,
} from "./geography.ts";
import { loadItalianRules } from "./rules/index.ts";

const RULES = loadItalianRules(2026)!;
const at = (gross: number, region: string, municipality = "NESSUNA") =>
  italianAdapter.calculate(
    { ...referenceProfile(gross), region, municipality },
    RULES,
  );

describe("coverage", () => {
  it("models all 20 regions plus the autonomous provinces", () => {
    // 19 regions with ordinary statute + Sicilia/Sardegna/Friuli/Valle d'Aosta,
    // with Trentino-Alto Adige split into its two autonomous provinces.
    expect(REGIONS.length).toBe(21);
    for (const key of ["LOMBARDIA", "LAZIO", "CAMPANIA", "SICILIA", "TRENTO", "BOLZANO"]) {
      expect(REGIONS.map((r) => r.key)).toContain(key);
    }
  });

  it("derives the options from the rules, so neither can exist without the other", () => {
    for (const place of [...REGIONS, ...MUNICIPALITIES]) {
      expect(RULES.rules[place.ruleId], place.ruleId).toBeDefined();
    }
  });

  it("carries a source and a tier on every place", () => {
    for (const place of [...REGIONS, ...MUNICIPALITIES]) {
      const rule = RULES.rules[place.ruleId]!;
      expect(rule.source.document.length).toBeGreaterThan(0);
      expect(["verified", "supported", "experimental"]).toContain(rule.verification.status);
    }
  });

  it("offers every modelled city only with its real region", () => {
    expect(LOCATIONS).toHaveLength(29);
    expect(LOCATIONS).toContainEqual({
      key: "LAZIO:ROMA",
      label: "Lazio · Roma",
      regionKey: "LAZIO",
      municipalityKey: "ROMA",
    });
    for (const location of LOCATIONS) {
      expect(RULES.rules[regionRuleId(location.regionKey)]).toBeDefined();
      expect(RULES.rules[municipalityRuleId(location.municipalityKey)]).toBeDefined();
      if (location.municipalityKey !== "NESSUNA") {
        expect(regionKeyForMunicipality(location.municipalityKey)).toBe(location.regionKey);
      }
    }
  });
});

describe("every region computes", () => {
  for (const region of REGIONS) {
    it(`${region.label} produces a plausible net`, () => {
      const r = at(45_000, region.key);
      expect(r.employee.netAnnual.cents).toBeGreaterThan(2_500_000);
      expect(r.employee.netAnnual.cents).toBeLessThan(3_200_000);
      // Contributions and IRPEF do not depend on the region; only the surtax does.
      expect(r.employee.taxableIncome.cents).toBe(4_086_450);
    });
  }
});

describe("the region is a real discriminant", () => {
  it("spreads the net by EUR 553.33 on the reference salary", () => {
    const nets = REGIONS.map((r) => ({
      label: r.label,
      net: at(45_000, r.key).employee.netAnnual.cents,
    }));
    const best = Math.max(...nets.map((n) => n.net));
    const worst = Math.min(...nets.map((n) => n.net));

    // Eight regions tie at the 1.23% statutory minimum, so the cheapest is a
    // GROUP, not a single region — asserting one name here would be a test that
    // depends on how ties happen to sort.
    const cheapest = nets.filter((n) => n.net === best).map((n) => n.label);
    expect(cheapest).toContain("Basilicata");
    expect(cheapest).toContain("Veneto");
    expect(cheapest.length).toBe(8);

    // Campania is the only region at the top: 1.73 / 2.96 / 3.20 / 3.33% per slice.
    expect(nets.filter((n) => n.net === worst).map((n) => n.label)).toEqual(["Campania"]);

    // Documented in docs/countries/IT/discriminants.md, computed from the rules.
    expect(best - worst).toBe(55_333);
  });

  it("puts Lombardia below the most expensive regions and above the flat ones", () => {
    const lombardia = at(45_000, "LOMBARDIA").employee.netAnnual.cents;
    const campania = at(45_000, "CAMPANIA").employee.netAnnual.cents;
    const veneto = at(45_000, "VENETO").employee.netAnnual.cents;

    expect(campania).toBeLessThan(lombardia); // 3.20% band vs 1.72%
    expect(veneto).toBeGreaterThan(lombardia); // flat 1.23%
  });

  it("applies a flat region to the whole base, not per slice", () => {
    // Veneto is 1.23% flat: 40,864.50 x 1.23% = 502.63
    const line = at(45_000, "VENETO").employee.taxes.find((t) => t.id.includes("REGIONALE"));
    expect(line?.amount.cents).toBe(-50_263);
  });

  it("applies a banded region to the whole base once the band is crossed", () => {
    // Friuli: 1.23% on the whole base above 15,000 (not 0.70% on the first slice).
    const line = at(45_000, "FRIULI_VENEZIA_GIULIA").employee.taxes.find((t) =>
      t.id.includes("REGIONALE"),
    );
    expect(line?.amount.cents).toBe(-50_263);
  });
});

describe("the municipality is a real discriminant", () => {
  it("charges nothing where the comune levies no surtax", () => {
    const line = at(45_000, "LOMBARDIA", "NESSUNA").employee.taxes.find((t) =>
      t.id.includes("COMUNALE"),
    );
    expect(line?.amount.cents).toBe(0);
  });

  it("costs more in Roma than in Milano, and least in Firenze", () => {
    const municipal = (region: string, comune: string) =>
      at(45_000, region, comune).employee.taxes.find((tax) => tax.id.includes("COMUNALE"))!
        .amount.cents;
    const milano = municipal("LOMBARDIA", "MILANO");
    const roma = municipal("LAZIO", "ROMA");
    const firenze = municipal("TOSCANA", "FIRENZE");

    expect(roma).toBeLessThan(milano); // deductions: 0.9% vs 0.8%
    expect(firenze).toBeGreaterThan(milano); // deduction: 0.2%
  });

  it("keeps each comune's own exemption threshold", () => {
    // Roma exempts to 14,000, Milano to 23,000. At a taxable income between the
    // two, Roma charges and Milano does not.
    const gross = 20_000; // taxable 18,162
    const roma = at(gross, "LAZIO", "ROMA").employee.taxes.find((t) => t.id.includes("COMUNALE"));
    const milano = at(gross, "LOMBARDIA", "MILANO").employee.taxes.find((t) =>
      t.id.includes("COMUNALE"),
    );
    expect(roma?.amount.cents).toBeLessThan(0);
    expect(milano?.amount.cents).toBe(0);
  });
});

describe("confidence follows the data, not the country", () => {
  it("labels a comune whose threshold is unverified as experimental", () => {
    const torino = RULES.rules["IT.ADDIZIONALE.COMUNALE.TORINO"]!;
    expect(torino.verification.status).toBe("experimental");
    expect(torino.verification.method).toMatch(/soglia di esenzione da verificare/);
  });

  it("keeps Lombardia and the other sourced regions supported pending an independent cross-check", () => {
    expect(RULES.rules["IT.ADDIZIONALE.REGIONALE.LOMBARDIA"]!.verification.status).toBe("supported");
    expect(RULES.rules["IT.ADDIZIONALE.REGIONALE.CAMPANIA"]!.verification.status).toBe("supported");
  });
});
