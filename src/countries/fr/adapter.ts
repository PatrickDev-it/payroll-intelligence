/**
 * France.
 *
 * `experimental` overall, and for three named reasons rather than a general
 * hedge: the AT/MP rate is notified per establishment, the versement mobilité
 * is set commune by commune, and the RGDU parameters come from a décret whose
 * consolidated text could not be re-read directly (Legifrance refused
 * automated access), so they are carried from the Urssaf restatement.
 *
 * Everything else — the PASS, the Agirc-Arrco tranches, CSG/CRDS and their
 * 98,25% assiette, the barème, the décote, the quotient familial — is
 * `supported` from Urssaf and the CGI.
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
import { calculateFrance } from "./calculate/index.ts";
import { frenchInputs } from "./inputs.ts";
import { SUPPORTED_TAX_YEARS } from "./rules/index.ts";

const REGIONS = new Set(["france", "alsace_moselle"]);

export const frenchAdapter: CountryPayrollAdapter = {
  country: "FR",

  confidence: "experimental",

  supportedTaxYears: SUPPORTED_TAX_YEARS,

  requiredInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
    return frenchInputs(profile);
  },

  validate(profile: EmployeeProfile): ValidationResult {
    const issues: ValidationIssue[] = [
      ...validateProfileBoundary(profile, this.country, this.requiredInputs(profile)),
    ];
    if (!SUPPORTED_TAX_YEARS.includes(profile.taxYear)) {
      issues.push({
        field: "taxYear",
        severity: "error",
        message: `Aucun jeu de règles françaises pour ${profile.taxYear}. Disponibles : ${SUPPORTED_TAX_YEARS.join(", ")}`,
      });
    }
    if (profile.region !== undefined && !REGIONS.has(profile.region)) {
      issues.push({
        field: "region",
        severity: "error",
        message: `Régime local inconnu : "${profile.region}". Seuls le régime général et l'Alsace-Moselle sont modélisés.`,
      });
    }
    if (profile.payPeriods !== 12) {
      issues.push({
        field: "payPeriods",
        severity: "error",
        message: "La paie française se fait sur 12 mois ; un 13e mois est un élément de salaire, pas une mensualité de plus",
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
    return calculateFrance(profile, rules);
  },

  explain(result: PayrollCalculation, lineId: string): Explanation | undefined {
    return explainLine(result, allLines(result), lineId);
  },
};
