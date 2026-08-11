import { describe, expect, it } from "vitest";
import type { InputDescriptor } from "@engine/model/employee-profile.ts";
import { germanInputs } from "./de/inputs.ts";
import { spanishInputs } from "./es/inputs.ts";
import { frenchInputs } from "./fr/inputs.ts";
import { italianInputs } from "./it/inputs.ts";

const ITALIAN_SURFACE = italianInputs({
  collectiveAgreement: "CCNL_TERZIARIO_CONFCOMMERCIO",
  jobLevel: "VII",
});

const SURFACES: Readonly<Record<string, readonly InputDescriptor[]>> = {
  Italia: ITALIAN_SURFACE,
  Germania: germanInputs(),
  Spagna: spanishInputs(),
  Francia: frenchInputs(),
};

describe("select copy", () => {
  it("keeps explanations and rates out of every option label", () => {
    for (const [country, inputs] of Object.entries(SURFACES)) {
      for (const input of inputs) {
        for (const option of input.options ?? []) {
          expect(option.label, `${country} · ${input.label}`).not.toMatch(/[()%‰~]/);
          if (input.field !== "jobLevel") {
            expect(option.label, `${country} · ${input.label}`).not.toMatch(/\bmin\b/i);
          }
        }
      }
    }
  });

  it("keeps the Italian high-frequency choices terse", () => {
    const byField = new Map(ITALIAN_SURFACE.map((input) => [input.field, input]));
    const labels = (field: string) => byField.get(field)?.options?.map((option) => option.label);

    expect(byField.get("companySize")?.label).toBe("N. dipendenti");
    expect(byField.get("countryOptions.inailRatePercent")?.label).toBe("INAIL");
    expect(labels("payPeriods")).toEqual(["12", "13", "14"]);
    expect(labels("contractType")).toEqual(["Indeterminato", "Determinato"]);
    expect(labels("countryOptions.inailRiskClass")).toEqual([
      "Ufficio",
      "Commercio",
      "Industria",
      "Edilizia",
    ]);
    expect(labels("collectiveAgreement")).toContain("Terziario / Commercio");
    expect(labels("collectiveAgreement")).toContain("Nessuno");
    expect(labels("region")).toContain("P.A. di Bolzano");
    expect(labels("region")).toContain("P.A. di Trento");
    expect(labels("jobLevel")).toContain("7º · min 873 €");
  });

  it("moves the selected Italian level minimum into its info copy", () => {
    const level = ITALIAN_SURFACE.find((input) => input.field === "jobLevel");

    expect(level?.options?.find((option) => option.value === "VII")?.label).toBe("7º · min 873 €");
    expect(level?.help).toContain("873,22");
  });

  it("declares each country in jurisdiction-to-contract-to-company task order", () => {
    const fields = (inputs: readonly InputDescriptor[]) => inputs.map(({ field }) => field);

    expect(fields(ITALIAN_SURFACE)).toEqual([
      "grossAnnual",
      "region",
      "municipality",
      "location",
      "countryOptions.pensionCeilingStatus",
      "collectiveAgreement",
      "payPeriods",
      "companySize",
      "jobLevel",
      "contractType",
      "countryOptions.tfrDestination",
      "countryOptions.inailRiskClass",
      "countryOptions.inailRatePercent",
    ]);
    expect(fields(SURFACES.Germania!)).toEqual([
      "grossAnnual",
      "region",
      "countryOptions.steuerklasse",
      "countryOptions.churchMember",
      "countryOptions.children",
      "age",
      "countryOptions.zusatzbeitrag",
      "countryOptions.zusatzbeitragRatePercent",
      "countryOptions.unfallRiskClass",
      "countryOptions.unfallRatePercent",
      "countryOptions.u2RatePercent",
    ]);
    expect(fields(SURFACES.Spagna!)).toEqual([
      "grossAnnual",
      "region",
      "contractType",
      "countryOptions.aeatWithholdingRate",
      "payPeriods",
      "jobLevel",
      "countryOptions.cnaeRiskClass",
      "countryOptions.atepRatePercent",
    ]);
    expect(fields(SURFACES.Francia!)).toEqual([
      "grossAnnual",
      "region",
      "countryOptions.statut",
      "countryOptions.foyer",
      "countryOptions.versementMobilite",
      "countryOptions.versementMobiliteRatePercent",
      "countryOptions.children",
      "companySize",
      "countryOptions.atmpRiskClass",
      "countryOptions.atmpRatePercent",
    ]);
  });
});
