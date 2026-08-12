/**
 * Germany.
 *
 * The confidence floor is `experimental`, and the reason is named: the health
 * fund's Zusatzbeitrag, the accident-insurance risk class and the U1/U2 levies are
 * all set per employer or per fund, so no honest single value exists. Every
 * statutory line is at least `supported`; the stable annual wage-tax path for
 * classes I–IV also has complete, immutable BMF PAP interface fixtures. The
 * country floor remains experimental whenever scenario employer rates apply.
 */

import type { CountryPayrollAdapter, Explanation } from "@engine/adapter/contract.ts";
import { validateProfileBoundary } from "@engine/adapter/validate-profile.ts";
import { InvalidProfileError } from "@engine/errors.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { allLines } from "@engine/model/calculation.ts";
import { parseDeclaredPercentage } from "@engine/money/money.ts";
import type {
  EmployeeProfile,
  InputDescriptor,
  ValidationIssue,
  ValidationResult,
} from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { explainLine } from "@engine/pipeline/explain.ts";
import { calculateGermany } from "./calculate/index.ts";
import { LAENDER, isKnownLand } from "./geography.ts";
import { germanInputs } from "./inputs.ts";
import { hasParentStatus } from "./profile.ts";
import { SUPPORTED_TAX_YEARS, loadGermanRules } from "./rules/index.ts";
import "./formulas.ts";

export const germanAdapter: CountryPayrollAdapter = {
  country: "DE",

  confidence: "experimental",

  supportedTaxYears: SUPPORTED_TAX_YEARS,

  requiredInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
    return germanInputs(profile);
  },

  validate(profile: EmployeeProfile): ValidationResult {
    const issues: ValidationIssue[] = [
      ...validateProfileBoundary(profile, this.country, this.requiredInputs(profile)),
    ];
    if (!SUPPORTED_TAX_YEARS.includes(profile.taxYear)) {
      issues.push({
        field: "taxYear",
        severity: "error",
        message: `Kein deutsches Regelwerk für ${profile.taxYear}. Verfügbar: ${SUPPORTED_TAX_YEARS.join(", ")}`,
      });
    }
    if (profile.region !== undefined && !isKnownLand(profile.region)) {
      issues.push({
        field: "region",
        severity: "error",
        message: `Unbekanntes Bundesland: "${profile.region}". Abgebildet sind ${LAENDER.length} Länder.`,
      });
    }
    if (profile.payPeriods !== 12) {
      issues.push({
        field: "payPeriods",
        severity: "error",
        message: "Die deutsche Lohnabrechnung läuft über 12 Monatsgehälter",
      });
    }
    validateDeclaredRates(profile, issues);

    if (profile.countryOptions?.["steuerklasse"] === "II" && !hasParentStatus(profile)) {
      issues.push({
        field: "countryOptions.familyStatus",
        severity: "error",
        message:
          "Steuerklasse II setzt die Eigenschaft als alleinerziehender Elternteil voraus (§ 24b EStG). Die widersprüchlichen Angaben werden nicht berechnet.",
      });
    }
    if (aboveInsuranceThreshold(profile)) {
      issues.push({
        field: "grossAnnual",
        severity: "warning",
        message:
          "Oberhalb der Jahresarbeitsentgeltgrenze von 77.400 € ist der Wechsel in die private Krankenversicherung möglich. Gerechnet wird hier immer gesetzlich.",
      });
    }

    return { ok: issues.every((issue) => issue.severity !== "error"), issues };
  },

  calculate(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
    const check = this.validate(profile);
    if (!check.ok) {
      throw new InvalidProfileError(
        check.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => ({ field: issue.field, message: issue.message })),
      );
    }
    return calculateGermany(profile, rules);
  },

  explain(result: PayrollCalculation, lineId: string): Explanation | undefined {
    return explainLine(result, allLines(result), lineId);
  },
};

/**
 * The private-insurance opt-out threshold, read from the rule set rather than
 * written here: it is a legal parameter that moves every year, and `validate()`
 * does not receive the rules, so it is resolved once at module load.
 */
const JAHRESARBEITSENTGELTGRENZE = insuranceThreshold();

function insuranceThreshold(): number {
  const config = loadGermanRules(2026)?.rules["DE.KV.VERSICHERUNGSPFLICHTGRENZE"]?.config;
  if (config?.kind !== "formula") return Number.POSITIVE_INFINITY;
  const value = config.params["jahresarbeitsentgeltgrenze"];
  return value === undefined ? Number.POSITIVE_INFINITY : Number(value) * 100;
}

function aboveInsuranceThreshold(profile: EmployeeProfile): boolean {
  return profile.grossAnnual.cents > JAHRESARBEITSENTGELTGRENZE;
}

function validateDeclaredRates(profile: EmployeeProfile, issues: ValidationIssue[]): void {
  for (const key of [
    "zusatzbeitragRatePercent",
    "unfallRatePercent",
    "u1RatePercent",
    "u2RatePercent",
  ] as const) {
    const value = profile.countryOptions?.[key];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string" && typeof value !== "number") {
      issues.push({
        field: `countryOptions.${key}`,
        severity: "error",
        message: `${key} muss als gewöhnliche Dezimalzahl angegeben werden`,
      });
      continue;
    }
    try {
      parseDeclaredPercentage(value);
    } catch {
      issues.push({
        field: `countryOptions.${key}`,
        severity: "error",
        message: `${key} muss eine Dezimal-Prozentangabe mit höchstens sechs Nachkommastellen sein`,
      });
    }
  }
}
