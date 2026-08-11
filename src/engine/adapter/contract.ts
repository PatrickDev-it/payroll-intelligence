/**
 * The contract every country implements. Four methods, and the first one is the
 * reason the UI can be country-aware without knowing any country:
 * `requiredInputs()` lets the form ask for CCNL in Italy and Steuerklasse in
 * Germany without a single conditional in the UI.
 */

import type { PayrollCalculation } from "../model/calculation.ts";
import type { ConfidenceTier } from "../model/confidence.ts";
import type {
  EUCountry,
  EmployeeProfile,
  InputDescriptor,
  ValidationResult,
} from "../model/employee-profile.ts";
import type { RuleSet } from "../model/rule.ts";

export type Explanation = {
  readonly lineId: string;
  readonly label: string;
  readonly derivation: string;
  readonly rules: readonly {
    readonly id: string;
    readonly label: string;
    readonly document: string;
    readonly url?: string;
    readonly confidence: ConfidenceTier;
  }[];
};

export interface CountryPayrollAdapter {
  readonly country: EUCountry;

  /** The floor across this adapter's rules. Displayed, never softened. */
  readonly confidence: ConfidenceTier;

  /** Tax years with a rule set. Anything else is a MissingRuleSetError. */
  readonly supportedTaxYears: readonly number[];

  /**
   * Drives the dynamic form. Ask only what this country actually needs.
   *
   * Takes the profile so far because real forms cascade: in Italy the level
   * options depend on the CCNL chosen and the instalment default comes from it.
   * Without this the component would have to know what a CCNL is.
   */
  requiredInputs(profile?: Partial<EmployeeProfile>): readonly InputDescriptor[];

  /** Runs before calculate(). May refuse an impossible profile outright. */
  validate(profile: EmployeeProfile): ValidationResult;

  /** Pure and total: same profile plus same rules, same result, every time. */
  calculate(profile: EmployeeProfile, rules: RuleSet): PayrollCalculation;

  /** The derivation of one line, for the Explain drawer. */
  explain(result: PayrollCalculation, lineId: string): Explanation | undefined;
}
