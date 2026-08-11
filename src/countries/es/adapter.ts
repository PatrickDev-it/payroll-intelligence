/**
 * Spain.
 *
 * `experimental` overall for one reason, and it is on the employer side: the
 * AT/EP premium is set by the company's CNAE activity and spans 1,5% to 6,5%.
 * Every employee-side line — the state scale, the 15 autonomic scales, art. 20,
 * the contribution rates — is `supported`, read from the BOE and from the
 * Ministerio de Hacienda's own register of regional measures.
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
import { calculateSpain } from "./calculate/index.ts";
import { COMMUNITIES, isKnownCommunity } from "./geography.ts";
import { spanishInputs } from "./inputs.ts";
import { SUPPORTED_TAX_YEARS } from "./rules/index.ts";

/** The foral territories, which levy their own IRPF rather than a regional half. */
const FORAL = new Set(["NAVARRA", "PAIS_VASCO", "CEUTA", "MELILLA"]);

export const spanishAdapter: CountryPayrollAdapter = {
  country: "ES",

  confidence: "experimental",

  supportedTaxYears: SUPPORTED_TAX_YEARS,

  requiredInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
    return spanishInputs(profile);
  },

  validate(profile: EmployeeProfile): ValidationResult {
    const issues: ValidationIssue[] = [
      ...validateProfileBoundary(profile, this.country, this.requiredInputs(profile)),
    ];
    if (!SUPPORTED_TAX_YEARS.includes(profile.taxYear)) {
      issues.push({
        field: "taxYear",
        severity: "error",
        message: `No hay reglas españolas para ${profile.taxYear}. Disponibles: ${SUPPORTED_TAX_YEARS.join(", ")}`,
      });
    }
    if (profile.region !== undefined && !isKnownCommunity(profile.region)) {
      const genericRegionIssue = issues.findIndex((issue) => issue.field === "region");
      if (genericRegionIssue >= 0) issues.splice(genericRegionIssue, 1);
      issues.unshift({
        field: "region",
        severity: "error",
        message: FORAL.has(profile.region)
          ? `${profile.region} tiene régimen foral o especial: su IRPF no es la escala autonómica del régimen común y no se calcula aquí.`
          : `Comunidad no modelada: "${profile.region}". Modeladas: ${COMMUNITIES.length} comunidades de régimen común.`,
      });
    }
    if (![12, 14].includes(profile.payPeriods)) {
      issues.push({
        field: "payPeriods",
        severity: "error",
        message: "La nómina española se paga en 12 o 14 pagas",
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
    return calculateSpain(profile, rules);
  },

  explain(result: PayrollCalculation, lineId: string): Explanation | undefined {
    return explainLine(result, allLines(result), lineId);
  },
};
