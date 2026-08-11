/**
 * What a CCNL does, and — just as important — what it does not.
 *
 * The agreement changes the instalment count, the validation floor and one
 * employer-cost line. It must NOT change a single euro of IRPEF, INPS or the
 * surtaxes: those are statute, identical under every agreement. Half of these
 * tests exist to hold that boundary.
 */

import { describe, expect, it } from "vitest";
import { italianAdapter } from "./adapter.ts";
import { CCNL_CATALOG, EXCLUDED_CCNL, ccnlByCode } from "./ccnl.ts";
import { referenceProfile } from "./fixtures.ts";
import { loadItalianRules } from "./rules/index.ts";

const RULES = loadItalianRules(2026)!;

const withCcnl = (code: string, gross = 45_000, level?: string) => {
  const ccnl = ccnlByCode(code)!;
  const { jobLevel: _previousLevel, ...baseProfile } = referenceProfile(gross);
  const selectedLevel = level ?? ccnl.levels.at(-1)?.code;
  return italianAdapter.calculate(
    {
      ...baseProfile,
      collectiveAgreement: code,
      payPeriods: ccnl.instalments,
      ...(selectedLevel === undefined ? {} : { jobLevel: selectedLevel }),
    },
    RULES,
  );
};

describe("coverage", () => {
  it("offers the agreements whose employer fund could be sourced", () => {
    expect(CCNL_CATALOG.map((c) => c.code)).toEqual([
      "CCNL_TERZIARIO_CONFCOMMERCIO",
      "CCNL_METALMECCANICI_INDUSTRIA",
      "CCNL_STUDI_PROFESSIONALI",
      "NESSUNO",
    ]);
  });

  it("records why the excluded ones are excluded, rather than omitting them", () => {
    expect(EXCLUDED_CCNL.length).toBeGreaterThan(0);
    const edilizia = EXCLUDED_CCNL.find((e) => e.name.includes("Edilizia"));
    // Not "no data": Cassa Edile absorbs items already counted, so adding it as
    // a percentage would double-count TFR and holiday pay.
    expect(edilizia?.reason).toMatch(/assorbe/);
    expect(edilizia?.reason).toMatch(/doppio/);
  });

  it("has a fund entry in the rules for every offered agreement", () => {
    const config = RULES.rules["IT.CCNL.FONDO_SANITARIO"]!.config;
    expect(config.kind).toBe("lookup_table");
    if (config.kind !== "lookup_table") throw new Error("unreachable");
    for (const ccnl of CCNL_CATALOG) {
      expect(Object.keys(config.entries), ccnl.code).toContain(ccnl.fundKey);
    }
  });
});

describe("what the CCNL changes", () => {
  it("sets the instalment count, so the monthly figure moves", () => {
    const terziario = withCcnl("CCNL_TERZIARIO_CONFCOMMERCIO"); // 14
    const metalmeccanici = withCcnl("CCNL_METALMECCANICI_INDUSTRIA"); // 13

    expect(terziario.input.payPeriods).toBe(14);
    expect(metalmeccanici.input.payPeriods).toBe(13);
    expect(metalmeccanici.employee.netPerPayPeriod.cents).toBeGreaterThan(
      terziario.employee.netPerPayPeriod.cents,
    );
  });

  it("changes the employer's supplementary healthcare line", () => {
    const fund = (code: string) =>
      withCcnl(code).employer.otherCosts.reduce((t, l) => t + l.amount.cents, 0);

    expect(fund("CCNL_TERZIARIO_CONFCOMMERCIO")).toBe(14_400); // Fondo Est, 12/month
    expect(fund("CCNL_METALMECCANICI_INDUSTRIA")).toBe(15_600); // Metasalute BASE, 13/month
    expect(fund("CCNL_STUDI_PROFESSIONALI")).toBe(32_400); // Cadiprof+Ebipro, 27/month
    expect(fund("NESSUNO")).toBe(0);
  });

  it("moves the employer's total cost by exactly that difference", () => {
    const terziario = withCcnl("CCNL_TERZIARIO_CONFCOMMERCIO").employer.totalCost.cents;
    const studi = withCcnl("CCNL_STUDI_PROFESSIONALI").employer.totalCost.cents;
    expect(studi - terziario).toBe(32_400 - 14_400);
  });
});

describe("what the CCNL must NOT change", () => {
  const codes = CCNL_CATALOG.map((c) => c.code);

  it("leaves the annual net identical — the agreement is not tax law", () => {
    const nets = codes.map((c) => withCcnl(c).employee.netAnnual.cents);
    expect(new Set(nets).size, `nets differ: ${nets.join(", ")}`).toBe(1);
  });

  it("leaves contributions, IRPEF and both surtaxes identical", () => {
    for (const code of codes) {
      const r = withCcnl(code);
      expect(r.employee.taxableIncome.cents, code).toBe(4_086_450);
      const irpef = r.employee.taxes.find((t) => t.id === "IT.IRPEF");
      expect(irpef?.amount.cents, code).toBe(-989_200);
    }
  });
});

describe("the contractual minimum", () => {
  it("warns below the minimum of the level actually chosen", () => {
    // Terziario level III: EUR 1,453.94 x 14 = EUR 20,355.16.
    const result = italianAdapter.validate({
      ...referenceProfile(18_000),
      collectiveAgreement: "CCNL_TERZIARIO_CONFCOMMERCIO",
      jobLevel: "III",
    });
    expect(result.ok).toBe(true); // a warning, never a refusal
    // The message is read by a person, so the amount is formatted the way every
    // other amount in the product is: grouped thousands, comma decimal.
    expect(result.issues.map((i) => i.message).join()).toMatch(/20\.355,16/);
  });

  it("uses each CCNL's own instalment count in the floor", () => {
    // Metalmeccanici D1: EUR 1,784.94 x 13 = EUR 23,204.22.
    const result = italianAdapter.validate({
      ...referenceProfile(20_000),
      collectiveAgreement: "CCNL_METALMECCANICI_INDUSTRIA",
      payPeriods: 13,
      jobLevel: "D1",
    });
    expect(result.issues.map((i) => i.message).join()).toMatch(/23\.204,22/);
  });

  it("stays silent where the pay table is not loaded, rather than inventing a floor", () => {
    // C3 has no minimum in the catalogue: no warning, and no invented number.
    const result = italianAdapter.validate({
      ...referenceProfile(12_000),
      collectiveAgreement: "CCNL_METALMECCANICI_INDUSTRIA",
      jobLevel: "C3",
    });
    expect(result.issues.filter((i) => i.field === "grossAnnual")).toEqual([]);
  });
});

describe("the form cascades", () => {
  it("offers the levels of the CCNL chosen, and only those", () => {
    const levelsFor = (code: string) =>
      italianAdapter
        .requiredInputs({ collectiveAgreement: code })
        .find((i) => i.field === "jobLevel")
        ?.options?.map((o) => o.value);

    expect(levelsFor("CCNL_TERZIARIO_CONFCOMMERCIO")).toContain("III");
    expect(levelsFor("CCNL_TERZIARIO_CONFCOMMERCIO")).not.toContain("D1");
    expect(levelsFor("CCNL_METALMECCANICI_INDUSTRIA")).toContain("D1");
    expect(levelsFor("CCNL_METALMECCANICI_INDUSTRIA")).not.toContain("III");
  });

  it("defaults the instalments to what the agreement prescribes", () => {
    const periodsFor = (code: string) =>
      italianAdapter
        .requiredInputs({ collectiveAgreement: code })
        .find((i) => i.field === "payPeriods")?.defaultValue;

    expect(periodsFor("CCNL_TERZIARIO_CONFCOMMERCIO")).toBe(14);
    expect(periodsFor("CCNL_METALMECCANICI_INDUSTRIA")).toBe(13);
    expect(periodsFor("CCNL_STUDI_PROFESSIONALI")).toBe(14);
  });

  it("falls back to the default agreement rather than throwing on an unknown one", () => {
    expect(() => italianAdapter.requiredInputs({ collectiveAgreement: "CCNL_INVENTATO" })).not.toThrow();
  });
});
