/**
 * Italy — the reference adapter.
 *
 * `requiredInputs()` and `validate()` are real: they are the contract the UI and
 * the API depend on, and they are what makes the form country-aware without the
 * UI knowing anything about Italy.
 *
 * `calculate()` is scaffolding and says so, loudly. The pipeline it will
 * implement is specified step by step in docs/countries/IT/README.md, and the
 * values it must produce are in ./fixtures.ts. Returning a plausible number from
 * here before that work is done would be the exact failure this product cannot
 * survive, so it throws instead.
 */

import type { CountryPayrollAdapter, Explanation } from "@engine/adapter/contract.ts";
import { validateProfileBoundary } from "@engine/adapter/validate-profile.ts";
import { InvalidProfileError } from "@engine/errors.ts";
import type { PayrollCalculation } from "@engine/model/calculation.ts";
import { allLines } from "@engine/model/calculation.ts";
import { explainLine } from "@engine/pipeline/explain.ts";
import { calculateItaly } from "./calculate/index.ts";
import type {
  EmployeeProfile,
  InputDescriptor,
  ValidationIssue,
  ValidationResult,
} from "@engine/model/employee-profile.ts";
import type { RuleSet } from "@engine/model/rule.ts";
import { compare, moneyFromDecimal } from "@engine/money/money.ts";
import { italianInputs } from "./inputs.ts";
import { ccnlByCode, levelOf } from "./ccnl.ts";
import {
  MUNICIPALITIES,
  REGIONS,
  isKnownMunicipality,
  isKnownRegion,
  regionKeyForMunicipality,
  regionLabel,
  municipalityLabel,
} from "./geography.ts";
import { SUPPORTED_TAX_YEARS } from "./rules/index.ts";
import { loadItalianRules } from "./rules/index.ts";
import { pensionCeilingStatusOf } from "./profile.ts";
import "./formulas.ts";

/** Messages are read by a person, so amounts in them are formatted like every other. */
const EUR = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  useGrouping: true,
});

export const italianAdapter: CountryPayrollAdapter = {
  country: "IT",

  /**
   * The floor across the Italian rule set. IT.INAIL.PREMIUM is experimental —
   * the real rate is per-PAT and spans 0.4 to 130 per mille — and one
   * experimental rule demotes the whole result. Employee-side lines are
   * supported until the independent official-calculator cross-check is done.
   */
  confidence: "experimental",

  supportedTaxYears: SUPPORTED_TAX_YEARS,

  requiredInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[] {
    return italianInputs(profile);
  },

  validate(profile: EmployeeProfile): ValidationResult {
    const issues: ValidationIssue[] = [
      ...validateProfileBoundary(profile, this.country, this.requiredInputs(profile)),
    ];
    if (!SUPPORTED_TAX_YEARS.includes(profile.taxYear)) {
      issues.push({
        field: "taxYear",
        severity: "error",
        message: `Nessun set di regole italiane per il ${profile.taxYear}. Disponibili: ${SUPPORTED_TAX_YEARS.join(", ")}`,
      });
    }
    if (profile.region !== undefined && !isKnownRegion(profile.region)) {
      issues.push({
        field: "region",
        severity: "error",
        message: `Regione sconosciuta: "${profile.region}". Modellate: ${REGIONS.length} fra regioni e province autonome.`,
      });
    }
    if (profile.municipality !== undefined && !isKnownMunicipality(profile.municipality)) {
      issues.push({
        field: "municipality",
        severity: "error",
        message: `Comune non modellato: "${profile.municipality}". Sono modellati ${MUNICIPALITIES.length} comuni; per gli altri, il registro del Dipartimento delle Finanze non è ancora caricato.`,
      });
    }
    const expectedRegion = profile.municipality
      ? regionKeyForMunicipality(profile.municipality)
      : undefined;
    if (
      expectedRegion &&
      profile.region &&
      isKnownRegion(profile.region) &&
      profile.region !== expectedRegion
    ) {
      issues.push({
        field: "location",
        severity: "error",
        message: `${municipalityLabel(profile.municipality!)} appartiene a ${regionLabel(expectedRegion)}, non a ${regionLabel(profile.region)}.`,
      });
    }
    if (![12, 13, 14].includes(profile.payPeriods)) {
      issues.push({
        field: "payPeriods",
        severity: "error",
        message: "Il payroll italiano usa 12, 13 o 14 mensilità",
      });
    }
    if (
      profile.grossAnnual.cents > CONTRIBUTION_CEILING_CENTS &&
      pensionCeilingStatusOf(profile) === "unknown"
    ) {
      issues.push({
        field: "countryOptions.pensionCeilingStatus",
        severity: "error",
        message:
          "Sopra il massimale INPS 2026 devi confermare se il lavoratore è soggetto al limite della L. 335/1995: non può essere dedotto dalla RAL.",
      });
    }

    // A warning, not an error: the contractual minimum is a floor for a
    // full-time employee at that level, and part-time legitimately sits below it.
    // Skipped where the CCNL's pay table is not loaded — an absent minimum must
    // not become a silent pass OR an invented number.
    const ccnl = ccnlByCode(profile.collectiveAgreement);
    const level = ccnl ? levelOf(ccnl, profile.jobLevel) : undefined;
    if (ccnl && level?.monthlyMinimum && profile.workingTimePercent === 100) {
      const annualMinimum = moneyFromDecimal(level.monthlyMinimum, profile.grossAnnual.currency);
      const floor = { ...annualMinimum, cents: annualMinimum.cents * ccnl.instalments };
      if (compare(profile.grossAnnual, floor) < 0) {
        issues.push({
          field: "grossAnnual",
          severity: "warning",
          message:
            `Sotto il minimo ${ccnl.name}, livello ${level.label}: ` +
            `${EUR.format(Number(level.monthlyMinimum))} × ${ccnl.instalments} mensilità = ` +
            `${EUR.format(floor.cents / 100)} per un anno a tempo pieno`,
        });
      }
    }

    return { ok: issues.every((i) => i.severity !== "error"), issues };
  },

  calculate(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation {
    const check = this.validate(profile);
    if (!check.ok) {
      throw new InvalidProfileError(
        check.issues
          .filter((i) => i.severity === "error")
          .map((i) => ({ field: i.field, message: i.message })),
      );
    }
    return calculateItaly(profile, rules);
  },

  explain(result: PayrollCalculation, lineId: string): Explanation | undefined {
    return explainLine(result, allLines(result), lineId);
  },
};

const CONTRIBUTION_CEILING_CENTS = contributionCeilingCents();

function contributionCeilingCents(): number {
  const config = loadItalianRules(2026)?.rules["IT.INPS.EMPLOYEE.IVS"]?.config;
  if (config?.kind !== "capped_rate") return Number.NEGATIVE_INFINITY;
  return Number(config.ceiling) * 100;
}
