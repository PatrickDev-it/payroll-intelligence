/**
 * Germany.
 *
 * The confidence floor is `experimental`, and the reason is named: the health
 * fund's Zusatzbeitrag, the accident-insurance risk class and the U2 levy are
 * all set per employer or per fund, so no honest single value exists. Every
 * statutory line — § 32a, the four contributions, Soli, Kirchensteuer — is
 * `supported`: read from the primary text, not yet cross-checked against the
 * BMF calculator, which needs a registered access code this build does not have.
 */

import type { CountryPayrollAdapter, Explanation } from "@engine/adapter/contract.ts";
import { validateProfileBoundary } from "@engine/adapter/validate-profile.ts";
import { InvalidProfileError } from "@engine/errors.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { allLines } from "@engine/model/calculation.ts";
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
import { childrenOf, steuerklasseOf } from "./profile.ts";
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

    // Warnings, not errors: the profile still computes, but the reader should
    // know which part of the result is not what their payslip will say.
    if (steuerklasseOf(profile) === "II" && childrenOf(profile) === 0) {
      issues.push({
        field: "countryOptions.children",
        severity: "warning",
        message:
          "Steuerklasse II setzt mindestens ein Kind voraus (§ 24b EStG). Der Entlastungsbetrag wird hier trotzdem gewährt.",
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
